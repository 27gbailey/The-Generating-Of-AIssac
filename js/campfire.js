import {
  CAMPFIRE_HITS_TO_EXTINGUISH,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import { spawnBloodTearFromCampfire } from "./bloodTear.js";
import { drawTileShadow } from "./objectDraw.js";
import { circleIntersectsObjectHitbox } from "./objectHitbox.js";

export function isCampfireCode(code) {
  return code === TILE.CAMPFIRE || code === TILE.RED_CAMPFIRE;
}

export function isRedCampfireCode(code) {
  return code === TILE.RED_CAMPFIRE;
}

export function initCampfireStates(grid, existing = null) {
  const states = existing ? { ...existing } : {};
  for (let y = 0; y < ROOM_HEIGHT; y++) {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      const code = grid[y][x];
      if (!isCampfireCode(code)) continue;
      const key = `${x},${y}`;
      if (!states[key]) {
        const isRed = code === TILE.RED_CAMPFIRE;
        states[key] = {
          hits: 0,
          extinguished: false,
          isRed,
          shootTimer: isRed ? 1.2 + ((x * 17 + y * 31) % 100) / 50 : 0,
          flicker: 0,
        };
      }
    }
  }
  return states;
}

export function isCampfireTile(room, tx, ty) {
  return isCampfireCode(room.grid[ty]?.[tx]);
}

export function isRedCampfireTile(room, tx, ty) {
  return room.grid[ty]?.[tx] === TILE.RED_CAMPFIRE;
}

export function campfireState(room, tx, ty) {
  return room.campfireStates?.[`${tx},${ty}`] ?? { hits: 0, extinguished: false, isRed: false };
}

export function isCampfireBurning(room, tx, ty) {
  if (!isCampfireTile(room, tx, ty)) return false;
  const state = campfireState(room, tx, ty);
  return !state.extinguished;
}

export function campfireIntensity(room, tx, ty) {
  const state = campfireState(room, tx, ty);
  if (state.extinguished) return 0;
  return 1 - state.hits / CAMPFIRE_HITS_TO_EXTINGUISH;
}

export function findCampfireHit(cx, cy, radius, room) {
  const minTx = Math.max(0, Math.floor((cx - radius) / TILE_SIZE));
  const maxTx = Math.min(ROOM_WIDTH - 1, Math.floor((cx + radius) / TILE_SIZE));
  const minTy = Math.max(0, Math.floor((cy - radius) / TILE_SIZE));
  const maxTy = Math.min(ROOM_HEIGHT - 1, Math.floor((cy + radius) / TILE_SIZE));

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isCampfireBurning(room, tx, ty)) continue;
      if (circleIntersectsObjectHitbox(cx, cy, radius, tx, ty)) {
        return { tx, ty, key: `${tx},${ty}`, isRed: isRedCampfireTile(room, tx, ty) };
      }
    }
  }
  return null;
}

export function damageCampfire(room, key) {
  const state = room.campfireStates?.[key];
  if (!state || state.extinguished) return false;
  state.hits += 1;
  if (state.hits >= CAMPFIRE_HITS_TO_EXTINGUISH) {
    state.extinguished = true;
  }
  return true;
}

export function extinguishCampfireInstant(room, tx, ty) {
  const key = `${tx},${ty}`;
  const state = room.campfireStates?.[key];
  if (!state || state.extinguished) return false;
  state.hits = CAMPFIRE_HITS_TO_EXTINGUISH;
  state.extinguished = true;
  return true;
}

export function extinguishCampfireInExplosion(room, tx, ty) {
  if (!isCampfireTile(room, tx, ty)) return false;
  return extinguishCampfireInstant(room, tx, ty);
}

export function campfireFireCenter(tx, ty) {
  return {
    x: tx * TILE_SIZE + TILE_SIZE / 2,
    y: ty * TILE_SIZE + TILE_SIZE / 2 - 4,
  };
}

export function checkCampfireBurn(player, room) {
  const r = player.bodyRadius ?? player.radius;
  const minTx = Math.max(0, Math.floor((player.x - r) / TILE_SIZE));
  const maxTx = Math.min(ROOM_WIDTH - 1, Math.floor((player.x + r) / TILE_SIZE));
  const minTy = Math.max(0, Math.floor((player.y - r) / TILE_SIZE));
  const maxTy = Math.min(ROOM_HEIGHT - 1, Math.floor((player.y + r) / TILE_SIZE));

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isCampfireBurning(room, tx, ty)) continue;
      const center = campfireFireCenter(tx, ty);
      const fireR = 12 * campfireIntensity(room, tx, ty);
      if (Math.hypot(player.x - center.x, player.y - center.y) < fireR + r * 0.5) {
        return true;
      }
    }
  }
  return false;
}

export function updateRedCampfires(room, dt, player, rand) {
  const spawned = [];
  if (!room.campfireStates) return spawned;

  for (let ty = 0; ty < ROOM_HEIGHT; ty++) {
    for (let tx = 0; tx < ROOM_WIDTH; tx++) {
      if (!isRedCampfireTile(room, tx, ty)) continue;
      const key = `${tx},${ty}`;
      const state = room.campfireStates[key];
      if (!state || state.extinguished) continue;

      if (state.flicker > 0) state.flicker -= dt;

      state.shootTimer -= dt;
      if (state.shootTimer > 0) continue;

      state.shootTimer = 2.8 + rand() * 2.8;
      state.flicker = 0.22;
      const center = campfireFireCenter(tx, ty);
      spawned.push(spawnBloodTearFromCampfire(center.x, center.y, player, rand));
    }
  }

  return spawned;
}

function drawFirewood(ctx, cx, cy) {
  ctx.strokeStyle = "#3a2510";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (const [x1, y1, x2, y2] of [
    [-14, 6, 14, -2],
    [-12, -2, 12, 8],
    [-8, 10, 8, -6],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx + x1, cy + y1);
    ctx.lineTo(cx + x2, cy + y2);
    ctx.stroke();
  }
  ctx.fillStyle = "#4a3018";
  ctx.fillRect(cx - 16, cy + 8, 32, 6);
}

function drawFlame(ctx, cx, cy, intensity, time, red, flickerFlash = 0) {
  const flicker = 0.85 + Math.sin(time * 14) * 0.08 + Math.sin(time * 23) * 0.05;
  const flashBoost = flickerFlash > 0 ? 1.15 + Math.sin(time * 40) * 0.12 : 0;
  const scale = intensity * flicker * (1 + flashBoost * 0.25);
  const fh = 22 * scale;
  const fw = 14 * scale;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const grad = ctx.createRadialGradient(cx, cy - fh * 0.35, 0, cx, cy - fh * 0.2, fw * 1.4);
  if (red) {
    grad.addColorStop(0, `rgba(255, 180, 180, ${0.9 * intensity})`);
    grad.addColorStop(0.4, `rgba(220, 40, 40, ${0.65 * intensity})`);
    grad.addColorStop(1, "rgba(120, 10, 10, 0)");
  } else {
    grad.addColorStop(0, `rgba(255, 240, 160, ${0.85 * intensity})`);
    grad.addColorStop(0.4, `rgba(255, 140, 40, ${0.55 * intensity})`);
    grad.addColorStop(1, "rgba(180, 40, 10, 0)");
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx, cy - fh);
  ctx.quadraticCurveTo(cx - fw, cy - fh * 0.2, cx - fw * 0.6, cy + 4);
  ctx.quadraticCurveTo(cx, cy + 8, cx + fw * 0.6, cy + 4);
  ctx.quadraticCurveTo(cx + fw, cy - fh * 0.2, cx, cy - fh);
  ctx.fill();

  const coreColor = red ? `rgba(255, 100, 100, ${0.45 * intensity})` : `rgba(255, 200, 80, ${0.35 * intensity})`;
  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.arc(cx, cy - fh * 0.45, fw * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  const glowColor = red ? `rgba(200, 30, 30, ${0.14 * intensity})` : `rgba(255, 120, 30, ${0.12 * intensity})`;
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, fw * 1.6, fh * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCampfire(ctx, px, py, hits, extinguished, time = 0, options = {}) {
  const { isRed = false, flicker = 0 } = options;
  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2 + 6;

  drawTileShadow(ctx, px, py, 0.7);
  drawFirewood(ctx, cx, cy + 4);

  if (extinguished) {
    ctx.fillStyle = "rgba(60, 50, 40, 0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const intensity = 1 - hits / CAMPFIRE_HITS_TO_EXTINGUISH;
  drawFlame(ctx, cx, cy, intensity, time, isRed, flicker);
}
