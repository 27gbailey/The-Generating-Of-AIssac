import {
  POOP_HITBOX_INSET,
  POOP_HITBOX_RADIUS,
  POOP_HITS_TO_DESTROY,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";

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

export function poopHitbox(tx, ty) {
  const inset = POOP_HITBOX_INSET;
  return {
    left: tx * TILE_SIZE + inset,
    top: ty * TILE_SIZE + inset,
    width: TILE_SIZE - inset * 2,
    height: TILE_SIZE - inset * 2,
    radius: POOP_HITBOX_RADIUS,
  };
}

function circleIntersectsRoundedRect(cx, cy, radius, rect) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const halfW = rect.width / 2 - rect.radius;
  const halfH = rect.height / 2 - rect.radius;
  const localX = Math.abs(cx - centerX) - halfW;
  const localY = Math.abs(cy - centerY) - halfH;
  const outside = Math.hypot(Math.max(localX, 0), Math.max(localY, 0));
  return outside - rect.radius <= radius;
}

export function findPoopHit(cx, cy, radius, room) {
  const minTx = Math.max(0, Math.floor((cx - radius) / TILE_SIZE));
  const maxTx = Math.min(ROOM_WIDTH - 1, Math.floor((cx + radius) / TILE_SIZE));
  const minTy = Math.max(0, Math.floor((cy - radius) / TILE_SIZE));
  const maxTy = Math.min(ROOM_HEIGHT - 1, Math.floor((cy + radius) / TILE_SIZE));

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isPoopSolid(room, tx, ty)) continue;
      if (circleIntersectsRoundedRect(cx, cy, radius, poopHitbox(tx, ty))) {
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
    ctx.fillStyle = "rgba(90, 70, 45, 0.18)";
    ctx.beginPath();
    ctx.ellipse(px + TILE_SIZE * 0.5, py + TILE_SIZE * 0.55, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const stage = poopDamageStage(hits, destroyed);
  const cx = px + TILE_SIZE * 0.5;
  const cy = py + TILE_SIZE * 0.56;
  const shrink = stage * 2;
  const baseW = 34 - shrink;
  const baseH = 24 - shrink * 0.65;

  ctx.save();

  ctx.fillStyle = "#4a3520";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, baseW * 0.55, baseH * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = stage >= 2 ? "#6b4a28" : "#5c4022";
  ctx.beginPath();
  ctx.ellipse(cx, cy, baseW * 0.5, baseH * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = stage >= 1 ? "#7a5530" : "#6a4828";
  ctx.beginPath();
  ctx.ellipse(cx - 4, cy - 3, baseW * 0.28, baseH * 0.32, -0.3, 0, Math.PI * 2);
  ctx.fill();

  if (stage === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.ellipse(cx - 6, cy - 5, 5, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (stage >= 1) {
    ctx.strokeStyle = "rgba(35, 22, 10, 0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 2);
    ctx.lineTo(cx + 2, cy + 4);
    ctx.moveTo(cx + 6, cy - 4);
    ctx.lineTo(cx + 10, cy + 2);
    ctx.stroke();
  }

  if (stage >= 2) {
    ctx.fillStyle = "#5c4022";
    for (const [ox, oy, r] of [
      [-10, 6, 4],
      [8, 8, 3.5],
      [0, 10, 3],
    ]) {
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (stage >= 3) {
    ctx.fillStyle = "rgba(90, 70, 45, 0.45)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, baseW * 0.65, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a3520";
    ctx.beginPath();
    ctx.arc(cx - 6, cy + 4, 2.5, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy + 6, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
