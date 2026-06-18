import { DOOR_WALLS, DOOR_BREAK_RADIUS_SCALE, ROOM_HEIGHT, ROOM_WIDTH, TILE_SIZE } from "./constants.js";
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

  const rx = radiusX * DOOR_BREAK_RADIUS_SCALE;
  const ry = radiusY * DOOR_BREAK_RADIUS_SCALE;
  let brokeAny = false;

  for (const wall of DOOR_WALLS) {
    if (!room.doors[wall]) continue;
    if (room.doorLock.broken[wall]) continue;
    if (!canBreakDoor(wall)) continue;
    if (!explosionHitsDoor(wall, cx, cy, rx, ry)) continue;

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

  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const gx = centerX - half + DOOR_SPAN * t;
    switch (wall) {
      case "north":
        for (const y of [0, 8, 16, 24, 32, 40, 48]) samples.push([gx, y]);
        break;
      case "south":
        for (const y of [height, height - 8, height - 16, height - 24, height - 32, height - 40, height - 48]) {
          samples.push([gx, y]);
        }
        break;
      case "west":
        for (const x of [0, 8, 16, 24, 32, 40, 48]) {
          samples.push([x, centerY - half + DOOR_SPAN * t]);
        }
        break;
      case "east":
        for (const x of [width, width - 8, width - 16, width - 24, width - 32, width - 40, width - 48]) {
          samples.push([x, centerY - half + DOOR_SPAN * t]);
        }
        break;
      default:
        break;
    }
  }
  return samples;
}

function doorAnchor(wall) {
  const { width, height } = getPlayAreaSize();
  const centerX = width / 2;
  const centerY = height / 2;
  switch (wall) {
    case "north":
      return { x: centerX, y: 0 };
    case "south":
      return { x: centerX, y: height };
    case "west":
      return { x: 0, y: centerY };
    case "east":
      return { x: width, y: centerY };
    default:
      return { x: centerX, y: centerY };
  }
}

export function explosionHitsDoor(wall, cx, cy, radiusX, radiusY) {
  const anchor = doorAnchor(wall);
  if (pointInExplosion(anchor.x, anchor.y, cx, cy, radiusX, radiusY)) return true;
  return doorGapSamples(wall).some(([px, py]) => pointInExplosion(px, py, cx, cy, radiusX, radiusY));
}

export function refreshDoorLockState(cell, room) {
  if (!cell || !room) return { justCleared: false };

  const wasLocked = cell.doorsLocked;
  const hadEnemies = (cell.enemies?.length ?? 0) > 0;
  const aliveEnemies = cell.enemies?.some((e) => e.alive) ?? false;
  const aliveBoss = cell.boss?.alive ?? false;

  cell.doorsLocked = aliveEnemies || aliveBoss;
  syncRoomDoorLock(room, cell);

  const justCleared =
    wasLocked && hadEnemies && !aliveEnemies && !cell.clearRewardDropped;

  return { justCleared };
}

export function lockDoorsForEnemies(cell, room) {
  const hasEnemies = cell?.enemies?.some((e) => e.alive);
  const hasBoss = cell?.boss?.alive;
  if (!hasEnemies && !hasBoss) return;
  cell.doorsLocked = true;
  if (!cell.brokenDoors) cell.brokenDoors = createBrokenDoors();
  syncRoomDoorLock(room, cell);
}

export function countAliveEnemies(enemies = []) {
  return enemies.filter((e) => e.alive).length;
}
