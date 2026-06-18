import { TILE_SIZE } from "./constants.js";
import { createEnemy } from "./enemies.js";
import { circleHitsRoom } from "./roomSpace.js";
import { getSpawnPosition } from "./roomSpace.js";

const ENEMY_TYPES = ["horf", "gaper", "dip"];
const ENEMY_WEIGHTS = [0.35, 0.4, 0.25];

function pickEnemyType(rand) {
  const roll = rand();
  let cumulative = 0;
  for (let i = 0; i < ENEMY_TYPES.length; i++) {
    cumulative += ENEMY_WEIGHTS[i];
    if (roll < cumulative) return ENEMY_TYPES[i];
  }
  return ENEMY_TYPES[ENEMY_TYPES.length - 1];
}

function findSpawnPoint(room, rand, radius = 14) {
  const { width, height } = { width: 13 * TILE_SIZE, height: 7 * TILE_SIZE };
  for (let attempt = 0; attempt < 40; attempt++) {
    const x = TILE_SIZE * (2 + Math.floor(rand() * 9)) + TILE_SIZE / 2;
    const y = TILE_SIZE * (1 + Math.floor(rand() * 5)) + TILE_SIZE / 2;
    if (!circleHitsRoom(x, y, radius, room)) {
      return { x, y };
    }
  }
  return getSpawnPosition(room);
}

export function spawnEnemiesForCell(cell, room, rand) {
  if (cell.isStart || cell.isBoss) return [];
  if (rand() > 0.55) return [];

  const count = 1 + Math.floor(rand() * 3);
  const enemies = [];
  const used = [];

  for (let i = 0; i < count; i++) {
    const type = pickEnemyType(rand);
    let pos = findSpawnPoint(room, rand);
    let attempts = 0;
    while (
      attempts < 20 &&
      used.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < TILE_SIZE * 1.2)
    ) {
      pos = findSpawnPoint(room, rand);
      attempts++;
    }
    used.push(pos);
    enemies.push(createEnemy(type, pos.x, pos.y));
  }

  return enemies;
}

export function spawnEnemiesInDungeon(dungeon, rand) {
  for (const cell of Object.values(dungeon.rooms)) {
    if (!cell.enemies) {
      cell.enemies = spawnEnemiesForCell(cell, cell.room, rand);
      cell.doorsLocked = false;
      cell.brokenDoors = { north: false, east: false, south: false, west: false };
      cell.hadCombatEnemies = cell.enemies.length > 0;
      cell.clearRewardDropped = false;
    }
  }
}
