import {
  BARREL_HITS_TO_DESTROY,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import { circleIntersectsObjectHitbox } from "./objectHitbox.js";
import { drawBarrel3D } from "./objectDraw.js";

export { objectHitbox as barrelHitbox } from "./objectHitbox.js";

export function initBarrelStates(grid, existing = null) {
  const states = existing ? { ...existing } : {};
  for (let y = 0; y < ROOM_HEIGHT; y++) {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      if (grid[y][x] !== TILE.BARREL) continue;
      const key = `${x},${y}`;
      if (!states[key]) {
        states[key] = { hits: 0, destroyed: false };
      }
    }
  }
  return states;
}

export function isBarrelSolid(room, tx, ty) {
  if (room.grid[ty][tx] !== TILE.BARREL) return false;
  const state = room.barrelStates?.[`${tx},${ty}`];
  return !state?.destroyed;
}

export function findBarrelHit(cx, cy, radius, room) {
  const minTx = Math.max(0, Math.floor((cx - radius) / TILE_SIZE));
  const maxTx = Math.min(ROOM_WIDTH - 1, Math.floor((cx + radius) / TILE_SIZE));
  const minTy = Math.max(0, Math.floor((cy - radius) / TILE_SIZE));
  const maxTy = Math.min(ROOM_HEIGHT - 1, Math.floor((cy + radius) / TILE_SIZE));

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isBarrelSolid(room, tx, ty)) continue;
      if (circleIntersectsObjectHitbox(cx, cy, radius, tx, ty)) {
        return { tx, ty, key: `${tx},${ty}` };
      }
    }
  }
  return null;
}

export function damageBarrel(room, key) {
  const state = room.barrelStates?.[key];
  if (!state || state.destroyed) return false;

  state.hits += 1;
  if (state.hits >= BARREL_HITS_TO_DESTROY) {
    state.destroyed = true;
    return "explode";
  }
  return "hit";
}

export function destroyBarrelInstant(room, tx, ty) {
  const key = `${tx},${ty}`;
  const state = room.barrelStates?.[key];
  if (!state || state.destroyed) return false;
  state.hits = BARREL_HITS_TO_DESTROY;
  state.destroyed = true;
  return true;
}

export function barrelDamageStage(hits, destroyed) {
  if (destroyed) return 3;
  if (hits >= BARREL_HITS_TO_DESTROY - 1) return 2;
  if (hits >= 1) return 1;
  return 0;
}

export function drawBarrel(ctx, px, py, hits, destroyed) {
  const stage = barrelDamageStage(hits, destroyed);
  drawBarrel3D(ctx, px, py, stage, destroyed);
}

export function barrelExplosionCenter(tx, ty) {
  return {
    x: tx * TILE_SIZE + TILE_SIZE / 2,
    y: ty * TILE_SIZE + TILE_SIZE / 2,
  };
}
