import {
  DIRECTIONS,
  DOOR_WALLS,
  FLOOR_GRID_SIZE,
} from "./constants.js";
import {
  BOSS_PRESET,
  buildRoomFromPreset,
  getBlockedWalls,
  pickPresetForCell,
} from "./rooms.js";
import { getPlayAreaSize } from "./roomSpace.js";
import { isInDoorGap } from "./doors.js";
import { isDoorPassable } from "./doorLock.js";
import { initPoopStates } from "./poop.js";
import { initDestroyedRocks } from "./destructibles.js";
import { initBarrelStates } from "./barrel.js";
import { initCampfireStates } from "./campfire.js";
import { spawnChestsInDungeon } from "./chestSpawner.js";
import { createPickupsFromLayout } from "./pickup.js";
import { spawnEnemiesInDungeon } from "./enemySpawner.js";
import { createBrokenDoors, syncRoomDoorLock } from "./doorLock.js";
import { initDestroyedPots } from "./pot.js";
import { applyRoomObjectVariants } from "./roomVariants.js";

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
    return count >= 1 && count < 4 && expandableDirections(cells, cell.gx, cell.gy, rand).length > 0;
  });

  if (deadEnds.length > 0 && rand() < 0.72) {
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
    if (!cells[`${cell.gx + dx},${cell.gy + dy}`]) continue;
    if (blocked[wall]) continue;

    const neighbor = cells[`${cell.gx + dx},${cell.gy + dy}`];
    const neighborBlocked = getBlockedWalls(presetGrid(neighbor.presetId ?? "empty"));
    if (neighborBlocked[opposite]) continue;

    doors[wall] = true;
  }

  return doors;
}

function ensureMinimumConnectivity(cells, rand) {
  for (const cell of Object.values(cells)) {
    const intended = intendedNeighbors(cells, cell.gx, cell.gy);
    const needed = requiredOpenWalls(intended);
    if (needed.length === 0) continue;

    let doors = computeDoors(cell, cells, cell.presetId);
    if (DOOR_WALLS.some((wall) => doors[wall])) continue;

    if (cell.isStart || cell.isBoss) continue;

    cell.presetId = pickPresetForCell(rand, needed);
    doors = computeDoors(cell, cells, cell.presetId);

    if (!DOOR_WALLS.some((wall) => doors[wall])) {
      cell.presetId = "empty";
    }
  }
}

export function generateDungeon(seed = Date.now()) {
  const rand = mulberry32(seed);
  const cells = {};
  const startX = Math.floor(FLOOR_GRID_SIZE / 2);
  const startY = Math.floor(FLOOR_GRID_SIZE / 2);
  cells[`${startX},${startY}`] = { gx: startX, gy: startY, isStart: true };

  const targetRooms = 8 + Math.floor(rand() * 8);

  let attempts = 0;
  while (Object.keys(cells).length < targetRooms && attempts < 500) {
    attempts++;
    const cell = pickExpansionCell(cells, rand);
    const options = expandableDirections(cells, cell.gx, cell.gy, rand);
    if (options.length === 0) continue;
    const pick = options[0];
    cells[`${pick.nx},${pick.ny}`] = { gx: pick.nx, gy: pick.ny, isStart: false };
  }

  const bossCell = pickBossCell(cells, startX, startY);
  const bossKey = `${bossCell.gx},${bossCell.gy}`;

  const startKey = `${startX},${startY}`;

  for (const cell of Object.values(cells)) {
    const key = `${cell.gx},${cell.gy}`;
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
    if (!cell.poopStates) {
      cell.poopStates = initPoopStates(built.grid);
    }
    if (!cell.destroyedRocks) {
      cell.destroyedRocks = initDestroyedRocks(built.grid);
    }
    if (!cell.destroyedPots) {
      cell.destroyedPots = initDestroyedPots(built.grid);
    }
    if (!cell.barrelStates) {
      cell.barrelStates = initBarrelStates(built.grid);
    }
    if (!cell.campfireStates) {
      cell.campfireStates = initCampfireStates(built.grid);
    }
    if (!cell.bombs) {
      cell.bombs = [];
    }
    if (!cell.bloodTears) {
      cell.bloodTears = [];
    }
    initCellPickups(cell, built);
    built.poopStates = cell.poopStates;
    built.destroyedRocks = cell.destroyedRocks;
    built.destroyedPots = cell.destroyedPots;
    built.barrelStates = cell.barrelStates;
    built.campfireStates = cell.campfireStates;
    rooms[`${cell.gx},${cell.gy}`] = {
      ...cell,
      doors,
      poopStates: cell.poopStates,
      destroyedRocks: cell.destroyedRocks,
      destroyedPots: cell.destroyedPots,
      barrelStates: cell.barrelStates,
      campfireStates: cell.campfireStates,
      bombs: cell.bombs,
      bloodTears: cell.bloodTears,
      pickups: cell.pickups,
      collectedPickups: cell.collectedPickups,
      chest: cell.chest ?? null,
      room: built,
      doorsLocked: cell.doorsLocked ?? false,
      brokenDoors: cell.brokenDoors ?? createBrokenDoors(),
      hadCombatEnemies: cell.hadCombatEnemies ?? false,
      clearRewardDropped: cell.clearRewardDropped ?? false,
    };
  }

  const dungeon = {
    seed,
    rooms,
    start: { gx: startX, gy: startY },
    boss: { gx: bossCell.gx, gy: bossCell.gy },
    visited: new Set([`${startX},${startY}`]),
  };

  spawnChestsInDungeon(dungeon, rand);
  spawnEnemiesInDungeon(dungeon, rand);

  for (const cell of Object.values(dungeon.rooms)) {
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

export function checkDoorTransition(player, room, gx, gy, dungeon) {
  const { width, height } = getPlayAreaSize();
  const chest = player.chestPosition?.() ?? { x: player.x, y: player.y };
  const r = player.bodyRadius ?? player.radius;
  const rDoor = r * 0.85;
  const cy = chest.y;

  const checks = [
    { wall: "north", test: cy - rDoor <= 0, nx: gx, ny: gy - 1, entry: "south" },
    { wall: "south", test: cy + rDoor >= height, nx: gx, ny: gy + 1, entry: "north" },
    { wall: "west", test: chest.x - rDoor <= 0, nx: gx - 1, ny: gy, entry: "east" },
    { wall: "east", test: chest.x + rDoor >= width, nx: gx + 1, ny: gy, entry: "west" },
  ];

  for (const check of checks) {
    if (!room.doors[check.wall] || !check.test) continue;
    if (!isDoorPassable(room, check.wall)) continue;
    if (!isInDoorGap(check.wall, chest.x, cy, width, height)) continue;

    const next = getCurrentRoomData(dungeon, check.nx, check.ny);
    if (!next) continue;

    return {
      gx: check.nx,
      gy: check.ny,
      entry: check.entry,
      room: next.room,
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
