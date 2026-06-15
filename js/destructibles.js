import {
  POOP_HITS_TO_DESTROY,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
} from "./constants.js";

export function initDestroyedRocks(grid, existing = null) {
  if (existing) return existing;
  return new Set();
}

export function isRockSolid(room, tx, ty) {
  if (room.grid[ty][tx] !== TILE.ROCK) return false;
  return !room.destroyedRocks?.has(`${tx},${ty}`);
}

export function destroyRock(room, tx, ty) {
  if (room.grid[ty][tx] !== TILE.ROCK) return;
  if (!room.destroyedRocks) room.destroyedRocks = new Set();
  room.destroyedRocks.add(`${tx},${ty}`);
}

export function destroyPoopInstant(room, tx, ty) {
  const key = `${tx},${ty}`;
  const state = room.poopStates?.[key];
  if (!state || state.destroyed) return;
  state.hits = POOP_HITS_TO_DESTROY;
  state.destroyed = true;
}
