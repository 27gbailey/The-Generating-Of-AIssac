import {
  POOP_HITS_TO_DESTROY,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import { circleIntersectsObjectHitbox } from "./objectHitbox.js";
import { drawPoop3D } from "./objectDraw.js";

export { objectHitbox as poopHitbox } from "./objectHitbox.js";

export function initPoopStates(grid, existing = null) {
  const states = existing ? { ...existing } : {};
  for (let y = 0; y < ROOM_HEIGHT; y++) {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      if (grid[y][x] !== TILE.POOP) continue;
      const key = `${x},${y}`;
      if (!states[key]) {
        states[key] = { hits: 0, destroyed: false };
      }
    }
  }
  return states;
}

export function isPoopSolid(room, tx, ty) {
  if (room.grid[ty][tx] !== TILE.POOP) return false;
  const state = room.poopStates?.[`${tx},${ty}`];
  return !state?.destroyed;
}

export function findPoopHit(cx, cy, radius, room) {
  const minTx = Math.max(0, Math.floor((cx - radius) / TILE_SIZE));
  const maxTx = Math.min(ROOM_WIDTH - 1, Math.floor((cx + radius) / TILE_SIZE));
  const minTy = Math.max(0, Math.floor((cy - radius) / TILE_SIZE));
  const maxTy = Math.min(ROOM_HEIGHT - 1, Math.floor((cy + radius) / TILE_SIZE));

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isPoopSolid(room, tx, ty)) continue;
      if (circleIntersectsObjectHitbox(cx, cy, radius, tx, ty)) {
        return { tx, ty, key: `${tx},${ty}` };
      }
    }
  }
  return null;
}

export function damagePoop(room, key) {
  const state = room.poopStates?.[key];
  if (!state || state.destroyed) return false;

  state.hits += 1;
  if (state.hits >= POOP_HITS_TO_DESTROY) {
    state.destroyed = true;
  }
  return true;
}

export function poopDamageStage(hits, destroyed) {
  if (destroyed) return 4;
  if (hits >= POOP_HITS_TO_DESTROY - 1) return 3;
  if (hits >= 2) return 2;
  if (hits >= 1) return 1;
  return 0;
}

export function drawPoop(ctx, px, py, hits, destroyed) {
  const stage = poopDamageStage(hits, destroyed);
  drawPoop3D(ctx, px, py, stage, destroyed);
}
