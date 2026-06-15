import {
  EXPLOSION_KNOCKBACK,
  EXPLOSION_RADIUS_X,
  EXPLOSION_RADIUS_Y,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import { destroyBarrelInstant, findBarrelsInExplosion, isBarrelSolid } from "./barrel.js";
import { destroyPoopInstant, destroyRock, isRockSolid } from "./destructibles.js";
import { isPoopSolid } from "./poop.js";

export function pointInExplosion(px, py, cx, cy, radiusX = EXPLOSION_RADIUS_X, radiusY = EXPLOSION_RADIUS_Y) {
  const dx = (px - cx) / radiusX;
  const dy = (py - cy) / radiusY;
  return dx * dx + dy * dy <= 1;
}

export function tileCenter(tx, ty) {
  return {
    x: tx * TILE_SIZE + TILE_SIZE / 2,
    y: ty * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function destroyObjectsInExplosion(room, cx, cy, radiusX = EXPLOSION_RADIUS_X, radiusY = EXPLOSION_RADIUS_Y) {
  const minTx = Math.max(0, Math.floor((cx - radiusX) / TILE_SIZE));
  const maxTx = Math.min(ROOM_WIDTH - 1, Math.floor((cx + radiusX) / TILE_SIZE));
  const minTy = Math.max(0, Math.floor((cy - radiusY) / TILE_SIZE));
  const maxTy = Math.min(ROOM_HEIGHT - 1, Math.floor((cy + radiusY) / TILE_SIZE));

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const center = tileCenter(tx, ty);
      if (!pointInExplosion(center.x, center.y, cx, cy, radiusX, radiusY)) continue;

      const code = room.grid[ty][tx];
      if (code === TILE.ROCK && isRockSolid(room, tx, ty)) {
        destroyRock(room, tx, ty);
      } else if (code === TILE.POOP && isPoopSolid(room, tx, ty)) {
        destroyPoopInstant(room, tx, ty);
      } else if (code === TILE.BARREL && isBarrelSolid(room, tx, ty)) {
        destroyBarrelInstant(room, tx, ty);
      }
    }
  }
}

export function collectChainDetonations(room, cx, cy, bombs, radiusX = EXPLOSION_RADIUS_X, radiusY = EXPLOSION_RADIUS_Y) {
  const chain = [];

  for (const barrel of findBarrelsInExplosion(room, cx, cy, radiusX, radiusY)) {
    destroyBarrelInstant(room, barrel.tx, barrel.ty);
    chain.push({ x: barrel.x, y: barrel.y });
  }

  for (const bomb of bombs) {
    if (!bomb.alive) continue;
    if (pointInExplosion(bomb.x, bomb.y, cx, cy, radiusX, radiusY)) {
      bomb.alive = false;
      chain.push({ x: bomb.x, y: bomb.y });
    }
  }

  return chain;
}

export function applyExplosionKnockback(player, cx, cy, radiusX = EXPLOSION_RADIUS_X, radiusY = EXPLOSION_RADIUS_Y) {
  if (!pointInExplosion(player.x, player.y, cx, cy, radiusX, radiusY)) return;

  let dx = player.x - cx;
  let dy = player.y - cy;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
    dx = player.bodyDir?.x || 0;
    dy = player.bodyDir?.y || -1;
    if (dx === 0 && dy === 0) dy = -1;
  }

  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  const falloff = 1 - Math.min(1, dist / Math.max(radiusX, radiusY));
  const force = EXPLOSION_KNOCKBACK * (0.55 + falloff * 0.45);

  player.vx += nx * force * 0.85;
  player.vy += ny * force * 0.55 - force * 0.42;
}

export function resolveExplosionChain(room, originX, originY, bombs, player, onBurst) {
  const queue = [{ x: originX, y: originY }];
  const seen = new Set();

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    const key = `${Math.round(x * 10)},${Math.round(y * 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const chains = collectChainDetonations(room, x, y, bombs);
    destroyObjectsInExplosion(room, x, y);
    applyExplosionKnockback(player, x, y);
    onBurst(x, y);

    for (const next of chains) {
      queue.push(next);
    }
  }
}
