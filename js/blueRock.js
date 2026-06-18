import { ROOM_HEIGHT, ROOM_WIDTH, TILE } from "./constants.js";
import { isRockSolid } from "./destructibles.js";

export function isBlueRockCode(code) {
  return code === TILE.BLUE_ROCK;
}

export function isBlueRockSolid(room, tx, ty) {
  if (room.grid[ty]?.[tx] !== TILE.BLUE_ROCK) return false;
  return !room.destroyedRocks?.has(`${tx},${ty}`);
}

export function destroyBlueRock(room, tx, ty) {
  if (room.grid[ty]?.[tx] !== TILE.BLUE_ROCK) return false;
  if (!room.destroyedRocks) room.destroyedRocks = new Set();
  room.destroyedRocks.add(`${tx},${ty}`);
  return true;
}

export function isAnyRockSolid(room, tx, ty) {
  return isRockSolid(room, tx, ty) || isBlueRockSolid(room, tx, ty);
}
