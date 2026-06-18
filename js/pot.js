import { ROOM_HEIGHT, ROOM_WIDTH, TILE, TILE_SIZE } from "./constants.js";
import { circleIntersectsObjectHitbox } from "./objectHitbox.js";

export function isPotCode(code) {
  return code === TILE.POT;
}

export function isPotSolid(room, tx, ty) {
  if (room.grid[ty]?.[tx] !== TILE.POT) return false;
  return !room.destroyedPots?.has(`${tx},${ty}`);
}

export function initDestroyedPots(grid, existing = null) {
  if (existing) return existing;
  return new Set();
}

export function findPotHit(cx, cy, radius, room) {
  const minTx = Math.max(0, Math.floor((cx - radius) / TILE_SIZE));
  const maxTx = Math.min(ROOM_WIDTH - 1, Math.floor((cx + radius) / TILE_SIZE));
  const minTy = Math.max(0, Math.floor((cy - radius) / TILE_SIZE));
  const maxTy = Math.min(ROOM_HEIGHT - 1, Math.floor((cy + radius) / TILE_SIZE));

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isPotSolid(room, tx, ty)) continue;
      if (circleIntersectsObjectHitbox(cx, cy, radius, tx, ty)) {
        return { tx, ty, key: `${tx},${ty}` };
      }
    }
  }
  return null;
}

export function destroyPot(room, tx, ty) {
  if (!isPotSolid(room, tx, ty)) return false;
  if (!room.destroyedPots) room.destroyedPots = new Set();
  room.destroyedPots.add(`${tx},${ty}`);
  return true;
}
