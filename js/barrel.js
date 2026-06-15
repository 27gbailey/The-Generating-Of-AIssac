import {
  BARREL_HITS_TO_DESTROY,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import {
  circleIntersectsObjectHitbox,
  traceObjectVisual,
} from "./objectHitbox.js";

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
  if (destroyed) {
    ctx.fillStyle = "rgba(40, 25, 12, 0.28)";
    traceObjectVisual(ctx, px, py);
    ctx.fill();
    return;
  }

  const stage = barrelDamageStage(hits, destroyed);
  const bulge = stage * 0.8;
  const { cx, cy, rx, ry } = traceObjectVisual(ctx, px + bulge, py + bulge);

  ctx.save();

  traceObjectVisual(ctx, px, py);
  ctx.fillStyle = "#2a1808";
  ctx.fill();

  const bodyGrad = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry);
  bodyGrad.addColorStop(0, stage >= 2 ? "#7a5030" : stage >= 1 ? "#6a4020" : "#5a3818");
  bodyGrad.addColorStop(0.5, "#4a3015");
  bodyGrad.addColorStop(1, "#3a2510");
  ctx.fillStyle = bodyGrad;
  traceObjectVisual(ctx, px + bulge, py + bulge);
  ctx.fill();

  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 2;
  traceObjectVisual(ctx, px + bulge, py + bulge);
  ctx.stroke();

  ctx.strokeStyle = "#8a6040";
  ctx.lineWidth = 2.5;
  for (const bandY of [cy - ry * 0.35, cy + ry * 0.2]) {
    ctx.beginPath();
    ctx.ellipse(cx, bandY, rx * 0.82, ry * 0.12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = stage >= 2 ? "#c02818" : "#8a1a12";
  ctx.beginPath();
  ctx.ellipse(cx, cy - ry * 0.72, rx * 0.28, ry * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  if (stage >= 1) {
    ctx.strokeStyle = "rgba(20, 10, 5, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.45, cy - ry * 0.1);
    ctx.lineTo(cx - rx * 0.15, cy + ry * 0.35);
    ctx.moveTo(cx + rx * 0.35, cy - ry * 0.25);
    ctx.lineTo(cx + rx * 0.5, cy + ry * 0.2);
    ctx.stroke();
  }

  if (stage >= 2) {
    ctx.fillStyle = "rgba(255, 120, 40, 0.45)";
    ctx.beginPath();
    ctx.arc(cx + rx * 0.2, cy - ry * 0.08, rx * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function barrelExplosionCenter(tx, ty) {
  return {
    x: tx * TILE_SIZE + TILE_SIZE / 2,
    y: ty * TILE_SIZE + TILE_SIZE / 2,
  };
}
