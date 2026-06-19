import {
  DIRECTIONS,
  DOOR_WALLS,
  FLOOR_GRID_SIZE,
  ITEM_ROOM_PRESET,
  SECRET_PRESET_POOL,
} from "./constants.js";
import {
  BOSS_PRESET,
  buildRoomFromPreset,
  getBlockedWalls,
  pickPresetForCell,
} from "./rooms.js";
import {
  bothSidesBlockSharedWall,
  presetSupportsDoors,
} from "./roomValidation.js";
import { getPlayAreaSize } from "./roomSpace.js";
import { isInDoorGap } from "./doors.js";
import { isDoorPassable } from "./doorLock.js";
import { initPoopStates } from "./poop.js";
import { initDestroyedRocks } from "./destructibles.js";
import { initBarrelStates } from "./barrel.js";
import { initCampfireStates } from "./campfire.js";
import { spawnChestsInDungeon, spawnSecretRoomChests } from "./chestSpawner.js";
import { spawnItemRoomPedestals, spawnSecretRoomPedestals } from "./itemSpawner.js";
import { createPickupsFromLayout } from "./pickup.js";
import { spawnEnemiesInDungeon } from "./enemySpawner.js";
import { createBrokenDoors, syncRoomDoorLock } from "./doorLock.js";
import { initDestroyedPots } from "./pot.js";
import { createBoss, getActiveBossDefinition, getBossSpawnPosition } from "./boss.js";
import { generateBossFloorSmears } from "./floorSmears.js";
import { initKeeperStates } from "./keeper.js";

function mulberry32(seed) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rand) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function neighborCount(cells, gx, gy) {
  let count = 0;
  for (const wall of DOOR_WALLS) {
    const { dx, dy } = DIRECTIONS[wall];
    if (cells[`${gx + dx},${gy + dy}`]) count++;
  }
  return count;
}

function expandableDirections(cells, gx, gy, rand) {
  const options = [];
  for (const wall of shuffle(DOOR_WALLS, rand)) {
    const { dx, dy } = DIRECTIONS[wall];
    const nx = gx + dx;
    const ny = gy + dy;
    if (nx < 0 || ny < 0 || nx >= FLOOR_GRID_SIZE || ny >= FLOOR_GRID_SIZE) continue;
    if (cells[`${nx},${ny}`]) continue;
    options.push({ wall, nx, ny });
  }
  return options;
}

function existingNeighborCount(cells, nx, ny) {
  let count = 0;
  for (const wall of DOOR_WALLS) {
    const { dx, dy } = DIRECTIONS[wall];
    if (cells[`${nx + dx},${ny + dy}`]) count++;
  }
  return count;
}

/** True when placing a room at (nx, ny) touches exactly one existing room. */
function isLeafPlacement(cells, nx, ny) {
  return existingNeighborCount(cells, nx, ny) === 1;
}

function pickBranchExpansion(cells, rand) {
  const leaves = [];
  const forks = [];

  for (const cell of Object.values(cells)) {
    if (cell.isItemRoom || cell.isSecret || cell.isBoss) continue;

    const degree = neighborCount(cells, cell.gx, cell.gy);
    const options = expandableDirections(cells, cell.gx, cell.gy, rand).filter((pick) =>
      isLeafPlacement(cells, pick.nx, pick.ny)
    );
    if (!options.length) continue;

    const entry = { cell, options };
    if (degree <= 1) leaves.push(entry);
    else if (degree === 2) forks.push(entry);
  }

  const pool =
    leaves.length > 0 && (forks.length === 0 || rand() < 0.82)
      ? leaves
      : [...leaves, ...forks];
  if (!pool.length) return null;

  const chosen = pool[Math.floor(rand() * pool.length)];
  const pick = chosen.options[Math.floor(rand() * chosen.options.length)];
  return { parent: chosen.cell, ...pick };
}


function intendedNeighbors(cells, gx, gy) {
  const neighbors = {};
  for (const wall of DOOR_WALLS) {
    const { dx, dy } = DIRECTIONS[wall];
    neighbors[wall] = Boolean(cells[`${gx + dx},${gy + dy}`]);
  }
  return neighbors;
}

function requiredOpenWalls(intended) {
  return DOOR_WALLS.filter((wall) => intended[wall]);
}

function bfsDistance(cells, sx, sy, tx, ty) {
  const queue = [{ gx: sx, gy: sy, dist: 0 }];
  const visited = new Set([`${sx},${sy}`]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.gx === tx && current.gy === ty) return current.dist;

    for (const wall of DOOR_WALLS) {
      const { dx, dy } = DIRECTIONS[wall];
      const key = `${current.gx + dx},${current.gy + dy}`;
      if (!cells[key] || visited.has(key)) continue;
      visited.add(key);
      queue.push({ gx: current.gx + dx, gy: current.gy + dy, dist: current.dist + 1 });
    }
  }
  return 0;
}

function entranceWallOnBoss(boss, neighbor) {
  if (neighbor.gx > boss.gx) return "west";
  if (neighbor.gx < boss.gx) return "east";
  if (neighbor.gy > boss.gy) return "north";
  return "south";
}

function bossSupportsEntrance(boss, neighbor) {
  const wall = entranceWallOnBoss(boss, neighbor);
  const blocked = getBlockedWalls(presetGrid(BOSS_PRESET));
  return !blocked[wall];
}

function pickBossCell(cells, startX, startY) {
  const deadEnds = Object.values(cells).filter((cell) => {
    if (cell.isStart) return false;
    if (neighborCount(cells, cell.gx, cell.gy) !== 1) return false;
    const neighborKey = bossNeighborKeys(cells, `${cell.gx},${cell.gy}`)[0];
    const neighbor = cells[neighborKey];
    return neighbor && bossSupportsEntrance(cell, neighbor);
  });

  if (deadEnds.length > 0) {
    deadEnds.sort(
      (a, b) =>
        bfsDistance(cells, startX, startY, b.gx, b.gy) -
        bfsDistance(cells, startX, startY, a.gx, a.gy)
    );
    return deadEnds[0];
  }

  const fallback = Object.values(cells).filter((cell) => {
    if (cell.isStart) return false;
    if (neighborCount(cells, cell.gx, cell.gy) !== 1) return false;
    return true;
  });
  if (fallback.length > 0) {
    fallback.sort(
      (a, b) =>
        bfsDistance(cells, startX, startY, b.gx, b.gy) -
        bfsDistance(cells, startX, startY, a.gx, a.gy)
    );
    return fallback[0];
  }

  let farthest = null;
  let bestDist = -1;
  for (const cell of Object.values(cells)) {
    if (cell.isStart) continue;
    const dist = bfsDistance(cells, startX, startY, cell.gx, cell.gy);
    if (dist > bestDist) {
      bestDist = dist;
      farthest = cell;
    }
  }
  return farthest ?? { gx: startX, gy: startY };
}

function bossNeighborKeys(cells, bossKey) {
  const boss = cells[bossKey];
  if (!boss) return [];
  return DOOR_WALLS.map((wall) => {
    const { dx, dy } = DIRECTIONS[wall];
    const key = `${boss.gx + dx},${boss.gy + dy}`;
    return cells[key] ? key : null;
  }).filter(Boolean);
}

/** Boss rooms must have exactly one connecting neighbor (single entrance). */
function enforceBossSingleEntrance(cells, bossKey, startKey) {
  const neighbors = bossNeighborKeys(cells, bossKey);
  if (neighbors.length <= 1) return;

  neighbors.sort((a, b) => {
    const ca = cells[a];
    const cb = cells[b];
    return (
      bfsDistance(cells, cells[startKey].gx, cells[startKey].gy, ca.gx, ca.gy) -
      bfsDistance(cells, cells[startKey].gx, cells[startKey].gy, cb.gx, cb.gy)
    );
  });

  for (let i = 1; i < neighbors.length; i++) {
    const key = neighbors[i];
    const cell = cells[key];
    if (!cell || cell.isStart || cell.isItemRoom || cell.isSecret || cell.isBoss) continue;
    if (neighborCount(cells, cell.gx, cell.gy) === 1) {
      delete cells[key];
    }
  }
}

function presetGrid(presetId) {
  return buildRoomFromPreset(presetId, {
    north: false,
    east: false,
    south: false,
    west: false,
  }).grid;
}

function initCellPickups(cell, built) {
  if (!cell.collectedPickups) cell.collectedPickups = new Set();
  cell.pickups = createPickupsFromLayout(built.presetPickups ?? [], cell.collectedPickups);
}

function computeDoors(cell, cells, presetId) {
  const blocked = getBlockedWalls(presetGrid(presetId));
  const doors = { north: false, east: false, south: false, west: false };

  for (const wall of DOOR_WALLS) {
    const { dx, dy, opposite } = DIRECTIONS[wall];
    const neighborKey = `${cell.gx + dx},${cell.gy + dy}`;
    const neighbor = cells[neighborKey];
    if (!neighbor) continue;
    if (blocked[wall]) continue;

    if (cell.isSecret && !cell.secretRevealed) continue;
    if (neighbor.isSecret && !neighbor.secretRevealed) continue;
    if (cell.secretLink && !cell.secretRevealed && cell.secretLink.wall === wall) continue;

    const neighborBlocked = getBlockedWalls(presetGrid(neighbor.presetId ?? "empty"));
    if (neighborBlocked[opposite]) continue;

    doors[wall] = true;
  }

  return doors;
}

function ensureMinimumConnectivity(cells, rand) {
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;

    for (const cell of Object.values(cells)) {
      if (cell.isSecret || cell.isItemRoom) continue;

      const intended = intendedNeighbors(cells, cell.gx, cell.gy);
      const needed = requiredOpenWalls(intended);

      if (
        needed.length > 0 &&
        !cell.isStart &&
        !cell.isBoss &&
        !presetSupportsDoors(
          () => ({ grid: presetGrid(cell.presetId ?? "empty") }),
          needed
        )
      ) {
        cell.presetId = pickPresetForCell(rand, needed);
        changed = true;
      }

      for (const wall of DOOR_WALLS) {
        const { dx, dy } = DIRECTIONS[wall];
        const neighbor = cells[`${cell.gx + dx},${cell.gy + dy}`];
        if (!neighbor || neighbor.isSecret || neighbor.isItemRoom) continue;

        if (
          bothSidesBlockSharedWall(
            presetGrid(cell.presetId ?? "empty"),
            presetGrid(neighbor.presetId ?? "empty"),
            wall
          )
        ) {
          const neighborNeeded = requiredOpenWalls(
            intendedNeighbors(cells, neighbor.gx, neighbor.gy)
          );
          if (!neighbor.isBoss) {
            neighbor.presetId = pickPresetForCell(rand, neighborNeeded);
          } else if (!cell.isBoss && !cell.isStart) {
            cell.presetId = pickPresetForCell(rand, requiredOpenWalls(intended));
          }
          changed = true;
        }
      }
    }

    for (const cell of Object.values(cells)) {
      if (cell.isSecret || cell.isItemRoom) continue;
      const intended = intendedNeighbors(cells, cell.gx, cell.gy);
      const needed = requiredOpenWalls(intended);
      if (needed.length === 0) continue;

      const doors = computeDoors(cell, cells, cell.presetId);
      if (DOOR_WALLS.some((wall) => doors[wall])) continue;
      if (cell.isStart || cell.isBoss) continue;

      cell.presetId = pickPresetForCell(rand, needed);
      changed = true;

      const retryDoors = computeDoors(cell, cells, cell.presetId);
      if (!DOOR_WALLS.some((wall) => retryDoors[wall])) {
        cell.presetId = "empty";
      }
    }

    if (!changed) break;
  }
}

function branchCandidates(cells, excludeKeys, rand) {
  return shuffle(
    Object.values(cells).filter((cell) => {
      const key = `${cell.gx},${cell.gy}`;
      if (excludeKeys.has(key)) return false;
      if (cell.isStart || cell.isBoss || cell.isItemRoom || cell.isSecret) return false;
      return expandableDirections(cells, cell.gx, cell.gy, rand).length > 0;
    }),
    rand
  );
}

function isAdjacentToBoss(cells, nx, ny, bossKey) {
  const boss = cells[bossKey];
  if (!boss) return false;
  return Math.abs(nx - boss.gx) + Math.abs(ny - boss.gy) === 1;
}

function placeItemRoom(cells, rand, excludeKeys, bossKey) {
  const candidates = branchCandidates(cells, excludeKeys, rand).filter(
    (c) => neighborCount(cells, c.gx, c.gy) >= 1
  );

  for (const parent of candidates) {
    const options = expandableDirections(cells, parent.gx, parent.gy, rand).filter(
      (pick) =>
        isLeafPlacement(cells, pick.nx, pick.ny) &&
        !isAdjacentToBoss(cells, pick.nx, pick.ny, bossKey)
    );
    if (!options.length) continue;
    const pick = options[Math.floor(rand() * options.length)];
    const key = `${pick.nx},${pick.ny}`;
    cells[key] = {
      gx: pick.nx,
      gy: pick.ny,
      isStart: false,
      isItemRoom: true,
      presetId: ITEM_ROOM_PRESET,
    };
    parent.itemDoorWall = pick.wall;
    parent.goldenDoorWall = pick.wall;
    parent.goldenDoorOpened = false;
    return key;
  }
  return null;
}

function forcePlaceItemRoom(cells, rand, excludeKeys, bossKey, startKey) {
  let key = placeItemRoom(cells, rand, excludeKeys, bossKey);
  if (key) return key;

  const tryParents = shuffle(Object.values(cells), rand);
  for (const parent of tryParents) {
    const parentKey = `${parent.gx},${parent.gy}`;
    if (excludeKeys.has(parentKey) || parent.isBoss || parent.isSecret) continue;
    for (const pick of expandableDirections(cells, parent.gx, parent.gy, rand)) {
      if (excludeKeys.has(`${pick.nx},${pick.ny}`)) continue;
      if (!isLeafPlacement(cells, pick.nx, pick.ny)) continue;
      if (isAdjacentToBoss(cells, pick.nx, pick.ny, bossKey)) continue;
      const newKey = `${pick.nx},${pick.ny}`;
      cells[newKey] = {
        gx: pick.nx,
        gy: pick.ny,
        isStart: false,
        isItemRoom: true,
        presetId: ITEM_ROOM_PRESET,
      };
      parent.itemDoorWall = pick.wall;
      parent.goldenDoorWall = pick.wall;
      parent.goldenDoorOpened = false;
      return newKey;
    }
  }

  return null;
}

function wallFromTo(fx, fy, tx, ty) {
  if (tx > fx) return "east";
  if (tx < fx) return "west";
  if (ty > fy) return "south";
  if (ty < fy) return "north";
  return null;
}

function isValidSecretNeighbor(cell, key, excludeKeys) {
  if (!cell || cell.isBoss || cell.isItemRoom || cell.isSecret) return false;
  if (excludeKeys.has(key)) return false;
  return true;
}

/** Sides with no adjacent room (empty grid or out of bounds). */
function countOpenSides(cells, gx, gy) {
  let open = 0;
  for (const wall of DOOR_WALLS) {
    const { dx, dy } = DIRECTIONS[wall];
    const nx = gx + dx;
    const ny = gy + dy;
    if (nx < 0 || ny < 0 || nx >= FLOOR_GRID_SIZE || ny >= FLOOR_GRID_SIZE) {
      open++;
      continue;
    }
    if (!cells[`${nx},${ny}`]) open++;
  }
  return open;
}

/**
 * Empty pocket bordered by three normal rooms; the fourth side stays empty.
 * Each neighbor gets a secretLink so any of the three walls can be bombed open.
 */
function findSecretPocketSites(cells, excludeKeys, bossKey) {
  const sites = [];

  for (let gy = 0; gy < FLOOR_GRID_SIZE; gy++) {
    for (let gx = 0; gx < FLOOR_GRID_SIZE; gx++) {
      const key = `${gx},${gy}`;
      if (cells[key] || excludeKeys.has(key)) continue;
      if (isAdjacentToBoss(cells, gx, gy, bossKey)) continue;
      if (existingNeighborCount(cells, gx, gy) !== 3) continue;
      if (countOpenSides(cells, gx, gy) !== 1) continue;

      const parents = [];
      for (const wall of DOOR_WALLS) {
        const { dx, dy } = DIRECTIONS[wall];
        const nk = `${gx + dx},${gy + dy}`;
        const neighbor = cells[nk];
        if (!isValidSecretNeighbor(neighbor, nk, excludeKeys)) continue;
        parents.push({ parent: neighbor, wall });
      }
      if (parents.length !== 3) continue;
      sites.push({ gx, gy, parents });
    }
  }

  return sites;
}

function linkSecretEntrances(site, secretGx, secretGy) {
  for (const entry of site.parents) {
    entry.parent.secretLink = { gx: secretGx, gy: secretGy, wall: entry.wall };
  }
}

function addSecretAtSite(cells, rand, site) {
  const key = `${site.gx},${site.gy}`;
  const presetId = SECRET_PRESET_POOL[Math.floor(rand() * SECRET_PRESET_POOL.length)];
  cells[key] = {
    gx: site.gx,
    gy: site.gy,
    isStart: false,
    isSecret: true,
    secretRevealed: false,
    presetId,
  };
  linkSecretEntrances(site, site.gx, site.gy);
  return key;
}

/** Carve a pocket: add one room on an open side so three sides have rooms and one stays empty. */
function tryCarveSecretPocket(cells, rand, excludeKeys, bossKey) {
  const candidates = [];

  for (let gy = 0; gy < FLOOR_GRID_SIZE; gy++) {
    for (let gx = 0; gx < FLOOR_GRID_SIZE; gx++) {
      const key = `${gx},${gy}`;
      if (cells[key] || excludeKeys.has(key)) continue;
      if (isAdjacentToBoss(cells, gx, gy, bossKey)) continue;
      if (existingNeighborCount(cells, gx, gy) !== 2) continue;
      if (countOpenSides(cells, gx, gy) !== 2) continue;

      const neighborEntries = [];
      const openWalls = [];
      for (const wall of DOOR_WALLS) {
        const { dx, dy } = DIRECTIONS[wall];
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= FLOOR_GRID_SIZE || ny >= FLOOR_GRID_SIZE) continue;
        const nk = `${nx},${ny}`;
        const neighbor = cells[nk];
        if (neighbor) {
          if (!isValidSecretNeighbor(neighbor, nk, excludeKeys)) continue;
          neighborEntries.push({ parent: neighbor, wall });
        } else if (!excludeKeys.has(nk) && !isAdjacentToBoss(cells, nx, ny, bossKey)) {
          openWalls.push({ wall, nx, ny });
        }
      }

      if (neighborEntries.length !== 2 || openWalls.length < 1) continue;
      candidates.push({ gx, gy, neighborEntries, openWalls });
    }
  }

  if (!candidates.length) return null;

  const site = candidates[Math.floor(rand() * candidates.length)];
  const filler = site.openWalls[0];
  cells[`${filler.nx},${filler.ny}`] = { gx: filler.nx, gy: filler.ny, isStart: false };

  const fillerWall = wallFromTo(filler.nx, filler.ny, site.gx, site.gy);
  const parents = [...site.neighborEntries, { parent: cells[`${filler.nx},${filler.ny}`], wall: fillerWall }];

  const presetId = SECRET_PRESET_POOL[Math.floor(rand() * SECRET_PRESET_POOL.length)];
  cells[`${site.gx},${site.gy}`] = {
    gx: site.gx,
    gy: site.gy,
    isStart: false,
    isSecret: true,
    secretRevealed: false,
    presetId,
  };
  linkSecretEntrances({ parents }, site.gx, site.gy);
  return `${site.gx},${site.gy}`;
}

function placeSecretRoom(cells, rand, excludeKeys, bossKey) {
  const sites = shuffle(findSecretPocketSites(cells, excludeKeys, bossKey), rand);
  for (const site of sites) {
    return addSecretAtSite(cells, rand, site);
  }
  return null;
}

function forcePlaceSecretRoom(cells, rand, excludeKeys, bossKey) {
  const key = placeSecretRoom(cells, rand, excludeKeys, bossKey);
  if (key) return key;
  return tryCarveSecretPocket(cells, rand, excludeKeys, bossKey);
}

function ensureBossEntrance(cells, bossKey, rand) {
  const neighbors = bossNeighborKeys(cells, bossKey);
  if (neighbors.length !== 1) return;
  const boss = cells[bossKey];
  const neighbor = cells[neighbors[0]];
  const entranceWall = entranceWallOnBoss(boss, neighbor);
  const blocked = getBlockedWalls(presetGrid(boss.presetId ?? BOSS_PRESET));
  if (!blocked[entranceWall]) return;

  const neighborNeeded = requiredOpenWalls(intendedNeighbors(cells, neighbor.gx, neighbor.gy));
  if (!neighbor.isStart) {
    neighbor.presetId = pickPresetForCell(rand, neighborNeeded);
  }
}

function validateFloorGraph(cells, startKey, bossKey, itemKey, secretKey) {
  if (!cells[startKey] || !cells[bossKey] || !itemKey || !secretKey) return false;
  if (!cells[itemKey]?.isItemRoom || !cells[secretKey]?.isSecret) return false;
  if (bossNeighborKeys(cells, bossKey).length !== 1) return false;

  const boss = cells[bossKey];
  const bossNeighbors = bossNeighborKeys(cells, bossKey);
  const neighbor = cells[bossNeighbors[0]];
  if (!neighbor || !bossSupportsEntrance(boss, neighbor)) return false;

  const itemCell = cells[itemKey];
  const secretCell = cells[secretKey];
  if (neighborCount(cells, itemCell.gx, itemCell.gy) !== 1) return false;
  if (neighborCount(cells, secretCell.gx, secretCell.gy) !== 3) return false;
  if (countOpenSides(cells, secretCell.gx, secretCell.gy) !== 1) return false;

  return true;
}

function buildCellGraph(rand, startX, startY) {
  const cells = {};
  cells[`${startX},${startY}`] = { gx: startX, gy: startY, isStart: true };

  const targetRooms = 10 + Math.floor(rand() * 7);

  let attempts = 0;
  while (Object.keys(cells).length < targetRooms && attempts < 600) {
    attempts++;
    const expansion = pickBranchExpansion(cells, rand);
    if (!expansion) break;
    cells[`${expansion.nx},${expansion.ny}`] = {
      gx: expansion.nx,
      gy: expansion.ny,
      isStart: false,
    };
  }

  let bossCell = pickBossCell(cells, startX, startY);
  let bossKey = `${bossCell.gx},${bossCell.gy}`;
  const startKey = `${startX},${startY}`;

  enforceBossSingleEntrance(cells, bossKey, startKey);
  bossCell = cells[bossKey] ?? bossCell;
  bossKey = `${bossCell.gx},${bossCell.gy}`;

  const reserved = new Set([startKey, bossKey]);

  const itemKey = forcePlaceItemRoom(cells, rand, reserved, bossKey, startKey);
  if (!itemKey) return null;
  reserved.add(itemKey);

  const secretKey = forcePlaceSecretRoom(cells, rand, reserved, bossKey);
  if (!secretKey) return null;

  for (const cell of Object.values(cells)) {
    const key = `${cell.gx},${cell.gy}`;

    if (cell.isItemRoom || cell.isSecret) continue;

    const required = requiredOpenWalls(intendedNeighbors(cells, cell.gx, cell.gy));

    if (key === startKey) {
      cell.presetId = "empty";
      cell.isBoss = false;
    } else if (key === bossKey) {
      cell.presetId = BOSS_PRESET;
      cell.isBoss = true;
    } else {
      cell.presetId = pickPresetForCell(rand, required);
      cell.isBoss = false;
    }
  }

  ensureMinimumConnectivity(cells, rand);
  ensureBossEntrance(cells, bossKey, rand);
  ensureMinimumConnectivity(cells, rand);

  if (!validateFloorGraph(cells, startKey, bossKey, itemKey, secretKey)) return null;

  return { cells, startKey, bossKey, itemKey, secretKey, bossCell };
}

export function generateDungeon(seed = Date.now(), floorNumber = 1) {
  let graph = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const rand = mulberry32(seed + attempt * 7919);
    graph = buildCellGraph(rand, Math.floor(FLOOR_GRID_SIZE / 2), Math.floor(FLOOR_GRID_SIZE / 2));
    if (graph) break;
  }

  if (!graph) {
    throw new Error("Failed to generate a valid dungeon layout.");
  }

  const { cells, startKey, bossKey, itemKey, secretKey, bossCell } = graph;
  const startX = cells[startKey].gx;
  const startY = cells[startKey].gy;
  const rand = mulberry32(seed);

  const rooms = {};
  for (const cell of Object.values(cells)) {
    const doors = computeDoors(cell, cells, cell.presetId);
    const built = buildRoomFromPreset(cell.presetId, doors, rand);
    if (!cell.poopStates) cell.poopStates = initPoopStates(built.grid);
    if (!cell.destroyedRocks) cell.destroyedRocks = initDestroyedRocks(built.grid);
    if (!cell.destroyedPots) cell.destroyedPots = initDestroyedPots(built.grid);
    if (!cell.barrelStates) cell.barrelStates = initBarrelStates(built.grid);
    if (!cell.campfireStates) cell.campfireStates = initCampfireStates(built.grid);
    if (!cell.keeperStates) cell.keeperStates = initKeeperStates(built.grid);
    if (!cell.bombs) cell.bombs = [];
    if (!cell.bloodTears) cell.bloodTears = [];
    if (!cell.brokenDoors) cell.brokenDoors = createBrokenDoors();
    if (!cell.floorSmears) cell.floorSmears = [];

    initCellPickups(cell, built);
    built.poopStates = cell.poopStates;
    built.destroyedRocks = cell.destroyedRocks;
    built.destroyedPots = cell.destroyedPots;
    built.barrelStates = cell.barrelStates;
    built.campfireStates = cell.campfireStates;
    built.keeperStates = cell.keeperStates;
    built.floorSmears = cell.floorSmears;
    built.goldenDoorWall = cell.goldenDoorWall ?? null;
    built.goldenDoorOpened = cell.goldenDoorOpened ?? false;

    rooms[`${cell.gx},${cell.gy}`] = {
      ...cell,
      doors,
      poopStates: cell.poopStates,
      destroyedRocks: cell.destroyedRocks,
      destroyedPots: cell.destroyedPots,
      barrelStates: cell.barrelStates,
      campfireStates: cell.campfireStates,
      keeperStates: cell.keeperStates,
      bombs: cell.bombs,
      bloodTears: cell.bloodTears,
      pickups: cell.pickups,
      collectedPickups: cell.collectedPickups,
      chest: cell.chest ?? null,
      room: built,
      doorsLocked: cell.doorsLocked ?? false,
      brokenDoors: cell.brokenDoors,
      hadCombatEnemies: cell.hadCombatEnemies ?? false,
      clearRewardDropped: cell.clearRewardDropped ?? false,
      floorSmears: cell.floorSmears,
      floorNumber,
    };
  }

  const dungeon = {
    seed,
    floorNumber,
    rooms,
    start: { gx: startX, gy: startY },
    boss: { gx: bossCell.gx, gy: bossCell.gy },
    itemRoom: { gx: cells[itemKey].gx, gy: cells[itemKey].gy },
    secretRoom: { gx: cells[secretKey].gx, gy: cells[secretKey].gy },
    visited: new Set([`${startX},${startY}`]),
  };

  spawnChestsInDungeon(dungeon, rand);
  spawnSecretRoomChests(dungeon, rand);
  spawnItemRoomPedestals(dungeon, rand);
  spawnSecretRoomPedestals(dungeon, rand);
  spawnEnemiesInDungeon(dungeon, rand);

  for (const cell of Object.values(dungeon.rooms)) {
    if (cell.isBoss) {
      cell.enemies = [];
      const bossDef = getActiveBossDefinition();
      if (!cell.boss) {
        const spawn = getBossSpawnPosition(bossDef);
        cell.boss = createBoss(spawn.x, spawn.y);
      }
      if (!cell.floorSmears?.length) {
        cell.floorSmears = generateBossFloorSmears(rand, bossDef.floorBloodCount);
        cell.room.floorSmears = cell.floorSmears;
      }
      cell.bossIntroSeen = cell.bossIntroSeen ?? false;
      cell.bossDefeated = cell.bossDefeated ?? false;
    } else if (!cell.floorSmears?.length) {
      cell.floorSmears = [];
      cell.room.floorSmears = cell.floorSmears;
    }
    syncRoomDoorLock(cell.room, cell);
  }

  return dungeon;
}

export function getCurrentRoomData(dungeon, gx, gy) {
  return dungeon.rooms[`${gx},${gy}`] ?? null;
}

export function isBossDoor(dungeon, gx, gy, wall) {
  const { dx, dy } = DIRECTIONS[wall];
  const neighbor = getCurrentRoomData(dungeon, gx + dx, gy + dy);
  return Boolean(neighbor?.isBoss);
}

export function isItemDoor(dungeon, gx, gy, wall) {
  const { dx, dy } = DIRECTIONS[wall];
  const neighbor = getCurrentRoomData(dungeon, gx + dx, gy + dy);
  return Boolean(neighbor?.isItemRoom);
}

export function isGoldenDoor(cell, wall) {
  return cell?.goldenDoorWall === wall;
}

export function checkDoorTransition(player, room, gx, gy, dungeon) {
  const { width, height } = getPlayAreaSize();
  const chest = player.chestPosition?.() ?? { x: player.x, y: player.y };
  const r = player.bodyRadius ?? player.radius;
  const rDoor = r * 0.85;
  const cy = chest.y;
  const cell = getCurrentRoomData(dungeon, gx, gy);
  const floorNumber = dungeon.floorNumber ?? 1;

  const checks = [
    { wall: "north", test: cy - rDoor <= 0, nx: gx, ny: gy - 1, entry: "south" },
    { wall: "south", test: cy + rDoor >= height, nx: gx, ny: gy + 1, entry: "north" },
    { wall: "west", test: chest.x - rDoor <= 0, nx: gx - 1, ny: gy, entry: "east" },
    { wall: "east", test: chest.x + rDoor >= width, nx: gx + 1, ny: gy, entry: "west" },
  ];

  for (const check of checks) {
    if (!room.doors[check.wall] || !check.test) continue;
    if (!isDoorPassable(room, check.wall, cell, floorNumber, player.stats.keys)) continue;
    if (!isInDoorGap(check.wall, chest.x, cy, width, height)) continue;

    const next = getCurrentRoomData(dungeon, check.nx, check.ny);
    if (!next) continue;

    let usedKey = false;
    if (isGoldenDoor(cell, check.wall) && floorNumber >= 2 && !cell.goldenDoorOpened) {
      if (player.stats.keys <= 0) continue;
      player.stats.keys -= 1;
      cell.goldenDoorOpened = true;
      room.goldenDoorOpened = true;
      usedKey = true;
    }

    return {
      gx: check.nx,
      gy: check.ny,
      entry: check.entry,
      room: next.room,
      usedKey,
    };
  }

  return null;
}

export function entryPosition(entryWall) {
  const { width, height } = getPlayAreaSize();
  const centerX = width / 2;
  const centerY = height / 2;
  const inset = 36;

  switch (entryWall) {
    case "north":
      return { x: centerX, y: inset };
    case "south":
      return { x: centerX, y: height - inset };
    case "west":
      return { x: inset, y: centerY };
    case "east":
      return { x: width - inset, y: centerY };
    default:
      return { x: centerX, y: centerY };
  }
}

export function listRoomCells(dungeon) {
  return Object.values(dungeon.rooms);
}

export function revealSecretEntrance(dungeon, parentCell, wall) {
  if (!parentCell?.secretLink || parentCell.secretRevealed) return false;
  const secret = getCurrentRoomData(dungeon, parentCell.secretLink.gx, parentCell.secretLink.gy);
  if (!secret) return false;

  parentCell.secretRevealed = true;
  parentCell.brokenDoors[wall] = true;
  parentCell.doors[wall] = true;
  parentCell.room.doors[wall] = true;
  parentCell.room.doorLock.broken[wall] = true;

  const opposite = DIRECTIONS[wall].opposite;
  secret.secretRevealed = true;
  secret.doors[opposite] = true;
  secret.room.doors[opposite] = true;
  secret.brokenDoors[opposite] = true;
  secret.room.doorLock.broken[opposite] = true;

  syncRoomDoorLock(parentCell.room, parentCell);
  syncRoomDoorLock(secret.room, secret);
  return true;
}
