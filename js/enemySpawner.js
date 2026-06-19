import {
  DOOR_WALLS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import { createEnemy } from "./enemies.js";
import {
  buildEnemyRoster,
  ENEMY_THEMES,
  isFlyingEnemyType,
  pickEnemyCount,
  pickRoomEnemyTypes,
} from "./enemyThemes.js";
import { getPresetGroup, ROOM_PRESETS } from "./roomPresets.js";
import { circleHitsRoom, getSpawnPosition } from "./roomSpace.js";
import {
  isSpawnReachableFromDoors,
  softBarrierAllowsEnemyAccess,
} from "./roomValidation.js";

const SPAWN_RADIUS = 14;
const FLY_SPAWN_RADIUS = 9;
const MIN_SPAWN_SEPARATION = TILE_SIZE * 1.05;

/** Share of non-start, non-boss rooms that spawn at least one enemy. */
const ROOM_ENEMY_CHANCE = 0.88;

function tileToPixel(tx, ty) {
  return {
    x: tx * TILE_SIZE + TILE_SIZE / 2,
    y: ty * TILE_SIZE + TILE_SIZE / 2,
  };
}

function isOpenFloor(code) {
  return code === TILE.FLOOR || code === TILE.BLOOD;
}

function countLayoutObstacles(room) {
  let count = 0;
  for (let ty = 0; ty < ROOM_HEIGHT; ty++) {
    for (let tx = 0; tx < ROOM_WIDTH; tx++) {
      const code = room.grid[ty][tx];
      if (
        code === TILE.ROCK ||
        code === TILE.BLUE_ROCK ||
        code === TILE.POT ||
        code === TILE.POOP ||
        code === TILE.BARREL ||
        code === TILE.CAMPFIRE ||
        code === TILE.RED_CAMPFIRE
      ) {
        count++;
      }
    }
  }
  return count;
}

function isGroundSpawnTile(room, openDoorWalls, tx, ty) {
  if (!isOpenFloor(room.grid[ty][tx])) return false;
  return (
    isSpawnReachableFromDoors(room.grid, openDoorWalls, tx, ty) ||
    softBarrierAllowsEnemyAccess(room.grid, openDoorWalls, tx, ty)
  );
}

function isFlySpawnTile(room, tx, ty) {
  if (!isOpenFloor(room.grid[ty][tx])) return false;
  const { x, y } = tileToPixel(tx, ty);
  return !circleHitsRoom(x, y, FLY_SPAWN_RADIUS, room, { flying: true });
}

function isSealedFlyPocket(room, openDoorWalls, tx, ty) {
  if (!isFlySpawnTile(room, tx, ty)) return false;
  if (isSpawnReachableFromDoors(room.grid, openDoorWalls, tx, ty)) return false;
  if (softBarrierAllowsEnemyAccess(room.grid, openDoorWalls, tx, ty)) return false;
  return true;
}

function listGroundSpawnTiles(room, openDoorWalls) {
  const spots = [];
  for (let ty = 0; ty < ROOM_HEIGHT; ty++) {
    for (let tx = 0; tx < ROOM_WIDTH; tx++) {
      if (!isGroundSpawnTile(room, openDoorWalls, tx, ty)) continue;
      const { x, y } = tileToPixel(tx, ty);
      if (circleHitsRoom(x, y, SPAWN_RADIUS, room)) continue;
      spots.push({ x, y, tx, ty, sealed: false });
    }
  }
  return spots;
}

function listFlySpawnTiles(room, openDoorWalls, { preferSealed = false } = {}) {
  const open = [];
  const sealed = [];
  for (let ty = 0; ty < ROOM_HEIGHT; ty++) {
    for (let tx = 0; tx < ROOM_WIDTH; tx++) {
      if (!isFlySpawnTile(room, tx, ty)) continue;
      const spot = { ...tileToPixel(tx, ty), tx, ty };
      if (isSealedFlyPocket(room, openDoorWalls, tx, ty)) {
        sealed.push({ ...spot, sealed: true });
      } else {
        open.push({ ...spot, sealed: false });
      }
    }
  }
  if (preferSealed && sealed.length) return sealed.concat(open);
  return open.concat(sealed);
}

function pickSpawnPoint(pool, used, rand) {
  if (!pool.length) return null;
  const shuffled = [...pool].sort(() => rand() - 0.5);
  for (const spot of shuffled) {
    if (!used.some((p) => Math.hypot(p.x - spot.x, p.y - spot.y) < MIN_SPAWN_SEPARATION)) {
      return spot;
    }
  }
  return shuffled[0];
}

function spawnFromPreset(presetEnemySpawns, room, openDoorWalls) {
  const enemies = [];
  for (const { type, x, y } of presetEnemySpawns) {
    if (x < 0 || y < 0 || x >= ROOM_WIDTH || y >= ROOM_HEIGHT) continue;

    if (isFlyingEnemyType(type)) {
      if (!isFlySpawnTile(room, x, y)) continue;
    } else if (!isGroundSpawnTile(room, openDoorWalls, x, y)) {
      continue;
    }

    const { x: px, y: py } = tileToPixel(x, y);
    const radius = isFlyingEnemyType(type) ? FLY_SPAWN_RADIUS : SPAWN_RADIUS;
    const opts = isFlyingEnemyType(type) ? { flying: true } : {};
    if (circleHitsRoom(px, py, radius, room, opts)) continue;

    enemies.push(createEnemy(type, px, py));
  }
  return enemies;
}

function spawnFromTheme(cell, room, rand, openDoorWalls) {
  const group = getPresetGroup(cell.presetId ?? "empty");
  const theme = ENEMY_THEMES[group] ?? ENEMY_THEMES.minimal;
  const types = pickRoomEnemyTypes(theme, rand);
  const count = pickEnemyCount(theme, rand);
  const roster = buildEnemyRoster(types, count, rand);

  const groundPool = listGroundSpawnTiles(room, openDoorWalls);
  const flyPool = listFlySpawnTiles(room, openDoorWalls, {
    preferSealed: theme.preferSealedForFlying === true,
  });

  const enemies = [];
  const used = [];

  for (const type of roster) {
    const pool = isFlyingEnemyType(type) ? flyPool : groundPool;
    const spot = pickSpawnPoint(pool, used, rand);
    if (!spot) continue;
    used.push(spot);
    enemies.push(createEnemy(type, spot.x, spot.y));
  }

  return enemies;
}

/** 1–6 enemies from open space, clutter, and a little randomness. */
export function enemyCountForLayout(room, rand, openDoorWalls = DOOR_WALLS) {
  const spawnable = listGroundSpawnTiles(room, openDoorWalls);
  const flySpots = listFlySpawnTiles(room, openDoorWalls);
  if (spawnable.length === 0 && flySpots.length === 0) return 0;

  const maxBySpace = Math.min(
    6,
    Math.max(1, Math.floor((spawnable.length + flySpots.length) / 7))
  );
  const obstacles = countLayoutObstacles(room);
  const clutter = obstacles / (ROOM_WIDTH * ROOM_HEIGHT);

  let target = maxBySpace;
  if (clutter >= 0.34) target = Math.min(target, 2);
  else if (clutter >= 0.24) target = Math.min(target, 4);
  else if (clutter <= 0.08) target = Math.max(target, 4);

  if (rand() < 0.28) target += rand() < 0.5 ? -1 : 1;

  return Math.max(1, Math.min(6, target, spawnable.length + flySpots.length));
}

export function spawnEnemiesForCell(cell, room, rand) {
  if (cell.isStart || cell.isBoss || cell.isItemRoom || cell.isSecret) return [];
  if (rand() > ROOM_ENEMY_CHANCE) return [];

  const openDoorWalls = DOOR_WALLS.filter((wall) => cell.doors?.[wall]);
  const doorWalls = openDoorWalls.length ? openDoorWalls : DOOR_WALLS;

  const preset = ROOM_PRESETS[cell.presetId ?? "empty"];
  const presetSpawns = room.presetEnemySpawns ?? preset?.presetEnemySpawns ?? [];

  if (presetSpawns.length > 0) {
    const enemies = spawnFromPreset(presetSpawns, room, doorWalls);
    if (enemies.length > 0) return enemies;
  }

  const themed = spawnFromTheme(cell, room, rand, doorWalls);
  if (themed.length > 0) return themed;

  const spawnable = listGroundSpawnTiles(room, doorWalls);
  if (spawnable.length === 0) return [];

  const pos = pickSpawnPoint(spawnable, [], rand) ?? getSpawnPosition(room);
  return [createEnemy("dip", pos.x, pos.y)];
}

export function spawnEnemiesInDungeon(dungeon, rand) {
  for (const cell of Object.values(dungeon.rooms)) {
    if (cell.enemies != null) continue;

    cell.enemies = spawnEnemiesForCell(cell, cell.room, rand);
    cell.doorsLocked = false;
    cell.brokenDoors = { north: false, east: false, south: false, west: false };
    cell.hadCombatEnemies = cell.enemies.length > 0;
    cell.clearRewardDropped = false;
  }
}
