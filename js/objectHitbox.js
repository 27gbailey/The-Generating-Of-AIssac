import { OBJECT_HITBOX_INSET, OBJECT_HITBOX_RADIUS, TILE_SIZE } from "./constants.js";

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

export function traceObjectRect(ctx, px, py) {
  const inset = OBJECT_HITBOX_INSET;
  const w = TILE_SIZE - inset * 2;
  const h = TILE_SIZE - inset * 2;
  const x = px + inset;
  const y = py + inset;
  const r = OBJECT_HITBOX_RADIUS;

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
