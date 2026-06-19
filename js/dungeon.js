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

function pickExpansionCell(cells, rand) {
  const occupied = Object.values(cells);
  const deadEnds = occupied.filter((cell) => neighborCount(cells, cell.gx, cell.gy) === 1);
  const branchPoints = occupied.filter((cell) => {
    const count = neighborCount(cells, cell.gx, cell.gy);
    return count >= 2 && count < 4 && expandableDirections(cells, cell.gx, cell.gy, rand).length > 0;
  });

  if (branchPoints.length > 0 && (deadEnds.length === 0 || rand() < 0.62)) {
    branchPoints.sort(
      (a, b) => neighborCount(cells, b.gx, b.gy) - neighborCount(cells, a.gx, a.gy)
    );
    const top = branchPoints.slice(0, Math.min(4, branchPoints.length));
    return top[Math.floor(rand() * top.length)];
  }
  if (deadEnds.length > 0 && rand() < 0.34) {
    return deadEnds[Math.floor(rand() * deadEnds.length)];
  }
  if (branchPoints.length > 0) {
    return branchPoints[Math.floor(rand() * branchPoints.length)];
  }
  return occupied[Math.floor(rand() * occupied.length)];
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

function pickBossCell(cells, startX, startY) {
  const queue = [{ gx: startX, gy: startY, dist: 0 }];
  const visited = new Set([`${startX},${startY}`]);
  let farthest = { gx: startX, gy: startY, dist: 0 };

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.dist > farthest.dist) farthest = current;

    for (const wall of DOOR_WALLS) {
      const { dx, dy } = DIRECTIONS[wall];
      const key = `${current.gx + dx},${current.gy + dy}`;
      if (!cells[key] || visited.has(key)) continue;
      visited.add(key);
      queue.push({ gx: current.gx + dx, gy: current.gy + dy, dist: current.dist + 1 });
    }
  }

  const deadEnds = Object.values(cells).filter(
    (cell) => neighborCount(cells, cell.gx, cell.gy) === 1
  );
  const farDeadEnds = deadEnds.filter((cell) => {
    const dist = bfsDistance(cells, startX, startY, cell.gx, cell.gy);
    return dist >= Math.max(2, farthest.dist - 1);
  });

  if (farDeadEnds.length > 0) {
    return farDeadEnds[Math.floor(farDeadEnds.length / 2)];
  }
  return farthest;
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
        if (!neighbor || neighbor.isSecret || neighbor.isItemRoom || neighbor.isBoss) continue;

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
          neighbor.presetId = pickPresetForCell(rand, neighborNeeded);
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

function placeItemRoom(cells, rand, excludeKeys) {
  const candidates = branchCandidates(cells, excludeKeys, rand).filter(
    (c) => neighborCount(cells, c.gx, c.gy) >= 1
  );

  for (const parent of candidates) {
    const options = expandableDirections(cells, parent.gx, parent.gy, rand);
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

function placeSecretRoom(cells, rand, excludeKeys) {
  const candidates = branchCandidates(cells, excludeKeys, rand);

  for (const parent of candidates) {
    const options = expandableDirections(cells, parent.gx, parent.gy, rand);
    for (const pick of options) {
      let surrounded = 0;
      for (const wall of DOOR_WALLS) {
        const { dx, dy } = DIRECTIONS[wall];
        const nx = pick.nx + dx;
        const ny = pick.ny + dy;
        if (nx < 0 || ny < 0 || nx >= FLOOR_GRID_SIZE || ny >= FLOOR_GRID_SIZE) {
          surrounded++;
          continue;
        }
        const otherKey = `${nx},${ny}`;
        if (otherKey === `${parent.gx},${parent.gy}`) continue;
        if (cells[otherKey]) surrounded++;
      }
      if (surrounded < 3) continue;

      const key = `${pick.nx},${pick.ny}`;
      const presetId = SECRET_PRESET_POOL[Math.floor(rand() * SECRET_PRESET_POOL.length)];
      cells[key] = {
        gx: pick.nx,
        gy: pick.ny,
        isStart: false,
        isSecret: true,
        secretRevealed: false,
        presetId,
      };
      parent.secretLink = { gx: pick.nx, gy: pick.ny, wall: pick.wall };
      return key;
    }
  }
  return null;
}

export function generateDungeon(seed = Date.now(), floorNumber = 1) {
  const rand = mulberry32(seed);
  const cells = {};
  const startX = Math.floor(FLOOR_GRID_SIZE / 2);
  const startY = Math.floor(FLOOR_GRID_SIZE / 2);
  cells[`${startX},${startY}`] = { gx: startX, gy: startY, isStart: true };

  const targetRooms = 10 + Math.floor(rand() * 7);

  let attempts = 0;
  while (Object.keys(cells).length < targetRooms && attempts < 600) {
    attempts++;
    const cell = pickExpansionCell(cells, rand);
    const options = expandableDirections(cells, cell.gx, cell.gy, rand);
    if (options.length === 0) continue;
    const pick = options[Math.floor(rand() * Math.min(2, options.length))];
    cells[`${pick.nx},${pick.ny}`] = { gx: pick.nx, gy: pick.ny, isStart: false };
  }

  const bossCell = pickBossCell(cells, startX, startY);
  const bossKey = `${bossCell.gx},${bossCell.gy}`;
  const startKey = `${startX},${startY}`;
  const reserved = new Set([startKey, bossKey]);

  const itemKey = placeItemRoom(cells, rand, reserved);
  if (itemKey) reserved.add(itemKey);
  placeSecretRoom(cells, rand, reserved);

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
    itemRoom: itemKey ? { gx: cells[itemKey].gx, gy: cells[itemKey].gy } : null,
    visited: new Set([`${startX},${startY}`]),
  };

  spawnChestsInDungeon(dungeon, rand);
  spawnSecretRoomChests(dungeon, rand);
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
    if (!isDoorPassable(room, check.wall, cell, floorNumber)) continue;
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
