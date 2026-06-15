import {
  BARREL_HITBOX_INSET,
  BARREL_HITBOX_RADIUS,
  BARREL_HITS_TO_DESTROY,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";

function pointInExplosion(px, py, cx, cy, radiusX, radiusY) {
  const dx = (px - cx) / radiusX;
  const dy = (py - cy) / radiusY;
  return dx * dx + dy * dy <= 1;
}

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

export function barrelHitbox(tx, ty) {
  const inset = BARREL_HITBOX_INSET;
  return {
    left: tx * TILE_SIZE + inset,
    top: ty * TILE_SIZE + inset,
    width: TILE_SIZE - inset * 2,
    height: TILE_SIZE - inset * 2,
    radius: BARREL_HITBOX_RADIUS,
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

export function findBarrelHit(cx, cy, radius, room) {
  const minTx = Math.max(0, Math.floor((cx - radius) / TILE_SIZE));
  const maxTx = Math.min(ROOM_WIDTH - 1, Math.floor((cx + radius) / TILE_SIZE));
  const minTy = Math.max(0, Math.floor((cy - radius) / TILE_SIZE));
  const maxTy = Math.min(ROOM_HEIGHT - 1, Math.floor((cy + radius) / TILE_SIZE));

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isBarrelSolid(room, tx, ty)) continue;
      if (circleIntersectsRoundedRect(cx, cy, radius, barrelHitbox(tx, ty))) {
        return { tx, ty, key: `${tx},${ty}` };
      }
    }
  }
  return null;
}

export function findBarrelsInExplosion(room, cx, cy, radiusX, radiusY) {
  const hits = [];
  const minTx = Math.max(0, Math.floor((cx - radiusX) / TILE_SIZE));
  const maxTx = Math.min(ROOM_WIDTH - 1, Math.floor((cx + radiusX) / TILE_SIZE));
  const minTy = Math.max(0, Math.floor((cy - radiusY) / TILE_SIZE));
  const maxTy = Math.min(ROOM_HEIGHT - 1, Math.floor((cy + radiusY) / TILE_SIZE));

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isBarrelSolid(room, tx, ty)) continue;
      const centerX = tx * TILE_SIZE + TILE_SIZE / 2;
      const centerY = ty * TILE_SIZE + TILE_SIZE / 2;
      if (pointInExplosion(centerX, centerY, cx, cy, radiusX, radiusY)) {
        hits.push({ tx, ty, x: centerX, y: centerY, key: `${tx},${ty}` });
      }
    }
  }
  return hits;
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
    ctx.fillStyle = "rgba(40, 25, 12, 0.25)";
    ctx.fillRect(px + 8, py + 14, TILE_SIZE - 16, 12);
    return;
  }

  const stage = barrelDamageStage(hits, destroyed);
  const cx = px + TILE_SIZE * 0.5;
  const cy = py + TILE_SIZE * 0.56;
  const bulge = stage * 3;
  const w = 28 + bulge;
  const h = 22 + stage;

  ctx.save();

  ctx.fillStyle = "#3a2510";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, w * 0.52, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = stage >= 2 ? "#6a4020" : stage >= 1 ? "#5a3818" : "#4a3015";
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.5, h * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.5, h * 0.46, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#7a5030";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(px + 10 - bulge * 0.2, cy - 2);
  ctx.lineTo(px + TILE_SIZE - 10 + bulge * 0.2, cy - 2);
  ctx.moveTo(px + 10 - bulge * 0.15, cy + 5);
  ctx.lineTo(px + TILE_SIZE - 10 + bulge * 0.15, cy + 5);
  ctx.stroke();

  ctx.fillStyle = "#8a1a12";
  ctx.fillRect(cx - 5 - stage, cy - h * 0.55, 10 + stage * 2, 5);

  if (stage >= 1) {
    ctx.strokeStyle = "rgba(20, 10, 5, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.3, cy - 4);
    ctx.lineTo(cx - w * 0.1, cy + 6);
    ctx.moveTo(cx + w * 0.25, cy - 6);
    ctx.lineTo(cx + w * 0.35, cy + 4);
    ctx.stroke();
  }

  if (stage >= 2) {
    ctx.fillStyle = "rgba(255, 120, 40, 0.35)";
    ctx.beginPath();
    ctx.arc(cx + w * 0.15, cy - 2, 4, 0, Math.PI * 2);
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
