import {
  POOP_HITS_TO_DESTROY,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import {
  circleIntersectsObjectHitbox,
  traceObjectVisual,
} from "./objectHitbox.js";

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
  if (destroyed) {
    ctx.fillStyle = "rgba(90, 70, 45, 0.22)";
    traceObjectVisual(ctx, px, py);
    ctx.fill();
    return;
  }

  const stage = poopDamageStage(hits, destroyed);
  const shrink = stage * 0.8;
  const { cx, cy, rx, ry } = traceObjectVisual(ctx, px + shrink, py + shrink);

  ctx.save();

  traceObjectVisual(ctx, px, py);
  ctx.fillStyle = "#3a2818";
  ctx.fill();

  const bodyGrad = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry);
  bodyGrad.addColorStop(0, stage >= 2 ? "#7a5530" : "#6a4828");
  bodyGrad.addColorStop(0.55, stage >= 1 ? "#5c4022" : "#4a3520");
  bodyGrad.addColorStop(1, "#3a2818");
  ctx.fillStyle = bodyGrad;
  traceObjectVisual(ctx, px + shrink, py + shrink);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.28, cy - ry * 0.3, rx * 0.2, ry * 0.14, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(35, 22, 10, 0.35)";
  ctx.beginPath();
  ctx.ellipse(cx + rx * 0.18, cy + ry * 0.22, rx * 0.28, ry * 0.18, 0.2, 0, Math.PI * 2);
  ctx.fill();

  if (stage >= 1) {
    ctx.strokeStyle = "rgba(25, 15, 8, 0.65)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.42, cy - ry * 0.05);
    ctx.lineTo(cx + rx * 0.12, cy + ry * 0.22);
    ctx.moveTo(cx + rx * 0.28, cy - ry * 0.28);
    ctx.lineTo(cx + rx * 0.48, cy + ry * 0.12);
    ctx.stroke();
  }

  if (stage >= 2) {
    ctx.fillStyle = "#4a3520";
    for (const [ox, oy, r] of [
      [-rx * 0.42, ry * 0.35, rx * 0.14],
      [rx * 0.32, ry * 0.42, rx * 0.11],
      [0, ry * 0.48, rx * 0.1],
    ]) {
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (stage >= 3) {
    ctx.fillStyle = "rgba(90, 70, 45, 0.5)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.38, rx * 0.55, ry * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(20, 12, 6, 0.45)";
  ctx.lineWidth = 1.5;
  traceObjectVisual(ctx, px + shrink, py + shrink);
  ctx.stroke();

  ctx.restore();
}
