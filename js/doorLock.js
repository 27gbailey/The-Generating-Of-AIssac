import { DOOR_WALLS, ROOM_HEIGHT, ROOM_WIDTH, TILE_SIZE } from "./constants.js";
import { DOOR_SPAN } from "./doors.js";
import { pointInExplosion } from "./explosion.js";

function getPlayAreaSize() {
  return {
    width: ROOM_WIDTH * TILE_SIZE,
    height: ROOM_HEIGHT * TILE_SIZE,
  };
}

export function createBrokenDoors() {
  return { north: false, east: false, south: false, west: false };
}

export function syncRoomDoorLock(room, cell) {
  if (!room) return;
  room.doorLock = {
    locked: cell?.doorsLocked ?? false,
    broken: cell?.brokenDoors ?? createBrokenDoors(),
  };
}

export function isDoorPassable(room, wall) {
  if (!room?.doors?.[wall]) return false;
  if (room.doorLock?.broken?.[wall]) return true;
  if (room.doorLock?.locked) return false;
  return true;
}

export function isDoorBlocked(room, wall) {
  if (!room?.doors?.[wall]) return true;
  return !isDoorPassable(room, wall);
}

export function tryBreakDoorsFromExplosion(cell, room, cx, cy, radiusX, radiusY, canBreakDoor) {
  if (!cell || !room?.doorLock?.locked) return false;

  let brokeAny = false;
  for (const wall of DOOR_WALLS) {
    if (!room.doors[wall]) continue;
    if (room.doorLock.broken[wall]) continue;
    if (!canBreakDoor(wall)) continue;
    if (!explosionHitsDoor(wall, cx, cy, radiusX, radiusY)) continue;

    cell.brokenDoors[wall] = true;
    room.doorLock.broken[wall] = true;
    brokeAny = true;
  }

  if (brokeAny) {
    refreshDoorLockState(cell, room);
  }
  return brokeAny;
}

function doorGapSamples(wall) {
  const { width, height } = getPlayAreaSize();
  const centerX = width / 2;
  const centerY = height / 2;
  const half = DOOR_SPAN / 2;
  const samples = [];

  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    switch (wall) {
      case "north":
        samples.push([centerX - half + DOOR_SPAN * t, 6]);
        break;
      case "south":
        samples.push([centerX - half + DOOR_SPAN * t, height - 6]);
        break;
      case "west":
        samples.push([6, centerY - half + DOOR_SPAN * t]);
        break;
      case "east":
        samples.push([width - 6, centerY - half + DOOR_SPAN * t]);
        break;
      default:
        break;
    }
  }
  return samples;
}

export function explosionHitsDoor(wall, cx, cy, radiusX, radiusY) {
  return doorGapSamples(wall).some(([px, py]) => pointInExplosion(px, py, cx, cy, radiusX, radiusY));
}

export function refreshDoorLockState(cell, room) {
  if (!cell || !room) return { justCleared: false };

  const wasLocked = cell.doorsLocked;
  const hadEnemies = (cell.enemies?.length ?? 0) > 0;
  const aliveEnemies = cell.enemies?.some((e) => e.alive) ?? false;

  cell.doorsLocked = aliveEnemies;
  syncRoomDoorLock(room, cell);

  const justCleared =
    wasLocked && hadEnemies && !aliveEnemies && !cell.clearRewardDropped;

  return { justCleared };
}

export function lockDoorsForEnemies(cell, room) {
  if (!cell?.enemies?.some((e) => e.alive)) return;
  cell.doorsLocked = true;
  if (!cell.brokenDoors) cell.brokenDoors = createBrokenDoors();
  syncRoomDoorLock(room, cell);
}

export function countAliveEnemies(enemies = []) {
  return enemies.filter((e) => e.alive).length;
}
