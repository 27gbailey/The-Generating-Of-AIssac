import {
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import { createEnemy } from "./enemies.js";
import { circleHitsRoom, getSpawnPosition } from "./roomSpace.js";

const ENEMY_TYPES = ["horf", "gaper", "dip"];
const ENEMY_WEIGHTS = [0.35, 0.4, 0.25];
const SPAWN_RADIUS = 14;
const MIN_SPAWN_SEPARATION = TILE_SIZE * 1.05;

/** Share of non-start, non-boss rooms that spawn at least one enemy. */
const ROOM_ENEMY_CHANCE = 0.88;

function pickEnemyType(rand) {
  const roll = rand();
  let cumulative = 0;
  for (let i = 0; i < ENEMY_TYPES.length; i++) {
    cumulative += ENEMY_WEIGHTS[i];
    if (roll < cumulative) return ENEMY_TYPES[i];
  }
  return ENEMY_TYPES[ENEMY_TYPES.length - 1];
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

function listSpawnableTiles(room) {
  const spots = [];
  for (let ty = 0; ty < ROOM_HEIGHT; ty++) {
    for (let tx = 0; tx < ROOM_WIDTH; tx++) {
      if (!isOpenFloor(room.grid[ty][tx])) continue;
      const x = tx * TILE_SIZE + TILE_SIZE / 2;
      const y = ty * TILE_SIZE + TILE_SIZE / 2;
      if (circleHitsRoom(x, y, SPAWN_RADIUS, room)) continue;
      spots.push({ x, y, tx, ty });
    }
  }
  return spots;
}

/** 1–6 enemies from open space, clutter, and a little randomness. */
export function enemyCountForLayout(room, rand) {
  const spawnable = listSpawnableTiles(room);
  if (spawnable.length === 0) return 0;

  const maxBySpace = Math.min(6, Math.max(1, Math.floor(spawnable.length / 7)));
  const obstacles = countLayoutObstacles(room);
  const clutter = obstacles / (ROOM_WIDTH * ROOM_HEIGHT);

  let target = maxBySpace;
  if (clutter >= 0.34) target = Math.min(target, 2);
  else if (clutter >= 0.24) target = Math.min(target, 4);
  else if (clutter <= 0.08) target = Math.max(target, 4);

  if (rand() < 0.28) target += rand() < 0.5 ? -1 : 1;

  return Math.max(1, Math.min(6, target, spawnable.length));
}

function pickSpawnPoint(spawnable, used, rand) {
  if (!spawnable.length) return null;

  const shuffled = [...spawnable].sort(() => rand() - 0.5);
  for (const spot of shuffled) {
    if (!used.some((p) => Math.hypot(p.x - spot.x, p.y - spot.y) < MIN_SPAWN_SEPARATION)) {
      return spot;
    }
  }

  return shuffled[0];
}

function findSpawnPoint(room, spawnable, used, rand) {
  const spot = pickSpawnPoint(spawnable, used, rand);
  if (spot) return spot;

  for (let attempt = 0; attempt < 40; attempt++) {
    const x = TILE_SIZE * (2 + Math.floor(rand() * 9)) + TILE_SIZE / 2;
    const y = TILE_SIZE * (1 + Math.floor(rand() * 5)) + TILE_SIZE / 2;
    if (!circleHitsRoom(x, y, SPAWN_RADIUS, room)) {
      return { x, y };
    }
  }
  return getSpawnPosition(room);
}

export function spawnEnemiesForCell(cell, room, rand) {
  if (cell.isStart || cell.isBoss || cell.isItemRoom || cell.isSecret) return [];
  if (rand() > ROOM_ENEMY_CHANCE) return [];

  const spawnable = listSpawnableTiles(room);
  const count = enemyCountForLayout(room, rand);
  if (count === 0) return [];

  const enemies = [];
  const used = [];

  for (let i = 0; i < count; i++) {
    const type = pickEnemyType(rand);
    const pos = findSpawnPoint(room, spawnable, used, rand);
    used.push(pos);
    enemies.push(createEnemy(type, pos.x, pos.y));
  }

  return enemies;
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
