import {
  OBJECT_HITBOX_INSET,
  OBJECT_HITBOX_RADIUS,
  OBJECT_VISUAL_RADIUS,
  TILE_SIZE,
} from "./constants.js";

export function objectHitbox(tx, ty) {
  const inset = OBJECT_HITBOX_INSET;
  return {
    left: tx * TILE_SIZE + inset,
    top: ty * TILE_SIZE + inset,
    width: TILE_SIZE - inset * 2,
    height: TILE_SIZE - inset * 2,
    radius: OBJECT_HITBOX_RADIUS,
  };
}

export function objectVisualBounds(px, py) {
  const inset = OBJECT_HITBOX_INSET;
  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2;
  const rx = (TILE_SIZE - inset * 2) / 2 - 1;
  const ry = (TILE_SIZE - inset * 2) / 2 - 1;
  return { cx, cy, rx, ry, inset };
}

export function traceObjectVisual(ctx, px, py) {
  const { cx, cy, rx, ry } = objectVisualBounds(px, py);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  return { cx, cy, rx, ry, x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 };
}

const ROCK_WOBBLE = [0.05, 0.02, -0.03, -0.06, -0.04, 0.02, 0.06, 0.04, 0.05];

export function traceRockVisual(ctx, px, py) {
  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2;
  const baseR = TILE_SIZE / 2 - OBJECT_HITBOX_INSET + 1;

  ctx.beginPath();
  for (let i = 0; i <= ROCK_WOBBLE.length; i++) {
    const angle = (i / ROCK_WOBBLE.length) * Math.PI * 2 - Math.PI / 2;
    const wobble = 1 + (ROCK_WOBBLE[i % ROCK_WOBBLE.length] ?? 0);
    const x = cx + Math.cos(angle) * baseR * wobble;
    const y = cy + Math.sin(angle) * baseR * wobble * 0.92;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  return { cx, cy, rx: baseR, ry: baseR * 0.92 };
}

export function circleIntersectsObjectHitbox(cx, cy, radius, tx, ty) {
  const rect = objectHitbox(tx, ty);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const halfW = rect.width / 2 - rect.radius;
  const halfH = rect.height / 2 - rect.radius;
  const localX = Math.abs(cx - centerX) - halfW;
  const localY = Math.abs(cy - centerY) - halfH;
  const outside = Math.hypot(Math.max(localX, 0), Math.max(localY, 0));
  return outside - rect.radius <= radius;
}

/** @deprecated use traceObjectVisual for drawing */
export function traceObjectRect(ctx, px, py) {
  const inset = OBJECT_HITBOX_INSET;
  const w = TILE_SIZE - inset * 2;
  const h = TILE_SIZE - inset * 2;
  const x = px + inset;
  const y = py + inset;
  const r = OBJECT_VISUAL_RADIUS;

  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  return { x, y, w, h, r };
}
