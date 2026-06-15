import {
  POOP_HITS_TO_DESTROY,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import {
  circleIntersectsObjectHitbox,
  traceObjectRect,
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
    traceObjectRect(ctx, px, py);
    ctx.fill();
    return;
  }

  const stage = poopDamageStage(hits, destroyed);
  const shrink = stage * 1.5;

  ctx.save();

  traceObjectRect(ctx, px, py);
  ctx.fillStyle = "#3a2818";
  ctx.fill();

  ctx.save();
  traceObjectRect(ctx, px + shrink * 0.5, py + shrink * 0.5);
  ctx.clip();

  const { x, y, w, h } = traceObjectRect(ctx, px, py);
  const cx = x + w / 2;
  const cy = y + h / 2;

  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h);
  bodyGrad.addColorStop(0, stage >= 2 ? "#7a5530" : "#6a4828");
  bodyGrad.addColorStop(0.55, stage >= 1 ? "#5c4022" : "#4a3520");
  bodyGrad.addColorStop(1, "#3a2818");
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.18, cy - h * 0.22, w * 0.14, h * 0.1, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(35, 22, 10, 0.35)";
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.12, cy + h * 0.18, w * 0.22, h * 0.14, 0.2, 0, Math.PI * 2);
  ctx.fill();

  if (stage >= 1) {
    ctx.strokeStyle = "rgba(25, 15, 8, 0.65)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.28, cy - h * 0.05);
    ctx.lineTo(cx + w * 0.08, cy + h * 0.12);
    ctx.moveTo(cx + w * 0.18, cy - h * 0.18);
    ctx.lineTo(cx + w * 0.32, cy + h * 0.08);
    ctx.stroke();
  }

  if (stage >= 2) {
    ctx.fillStyle = "#4a3520";
    for (const [ox, oy, r] of [
      [-w * 0.28, h * 0.22, w * 0.1],
      [w * 0.22, h * 0.28, w * 0.08],
      [0, h * 0.32, w * 0.07],
    ]) {
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (stage >= 3) {
    ctx.fillStyle = "rgba(90, 70, 45, 0.5)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.28, w * 0.42, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  ctx.strokeStyle = "rgba(20, 12, 6, 0.55)";
  ctx.lineWidth = 1.5;
  traceObjectRect(ctx, px, py);
  ctx.stroke();

  ctx.restore();
}
