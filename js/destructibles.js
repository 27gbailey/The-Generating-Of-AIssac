import {
  POOP_HITS_TO_DESTROY,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
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

export function destroyObjectsInRadius(room, x, y, radius) {
  const minTx = Math.max(0, Math.floor((x - radius) / TILE_SIZE));
  const maxTx = Math.min(ROOM_WIDTH - 1, Math.floor((x + radius) / TILE_SIZE));
  const minTy = Math.max(0, Math.floor((y - radius) / TILE_SIZE));
  const maxTy = Math.min(ROOM_HEIGHT - 1, Math.floor((y + radius) / TILE_SIZE));

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const cx = tx * TILE_SIZE + TILE_SIZE / 2;
      const cy = ty * TILE_SIZE + TILE_SIZE / 2;
      if (Math.hypot(cx - x, cy - y) > radius + TILE_SIZE * 0.35) continue;

      const code = room.grid[ty][tx];
      if (code === TILE.ROCK && isRockSolid(room, tx, ty)) {
        destroyRock(room, tx, ty);
      } else if (code === TILE.POOP) {
        destroyPoopInstant(room, tx, ty);
      }
    }
  }
}
