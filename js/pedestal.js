import { drawItemSprite } from "./items.js";

export const PEDESTAL_HIT_RADIUS = 20;
export const PEDESTAL_BASE_RADIUS = 24;

export class Pedestal {
  constructor(x, y, itemId) {
    this.x = x;
    this.y = y;
    this.itemId = itemId;
    this.hitRadius = PEDESTAL_HIT_RADIUS;
    this.active = true;
    this.itemTaken = false;
    this.bobPhase = Math.random() * Math.PI * 2;
  }

  /** @returns {string|null} item id when collected */
  update(dt, player) {
    if (!this.active) return null;
    this.bobPhase += dt * 2.4;

    if (this.itemTaken) return null;

    const chest = player.chestPosition?.() ?? { x: player.x, y: player.y };
    const dist = Math.hypot(chest.x - this.x, chest.y - this.y);
    if (dist < (player.bodyRadius ?? player.radius) + this.hitRadius) {
      this.itemTaken = true;
      return this.itemId;
    }

    return null;
  }

  draw(ctx, layout) {
    if (!this.active) return;

    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y;
    const bob = Math.sin(this.bobPhase) * 4;

    ctx.save();

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 10, PEDESTAL_BASE_RADIUS + 4, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createLinearGradient(sx, sy - 18, sx, sy + 14);
    grad.addColorStop(0, "#8a8078");
    grad.addColorStop(0.5, "#6a6058");
    grad.addColorStop(1, "#4a4038");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#3a3028";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(sx, sy + 2, PEDESTAL_BASE_RADIUS, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#5a5048";
    ctx.beginPath();
    ctx.ellipse(sx, sy - 6, PEDESTAL_BASE_RADIUS * 0.72, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a3028";
    ctx.stroke();

    if (!this.itemTaken) {
      drawItemSprite(ctx, sx, sy - 34, 36, this.itemId, bob);
    }

    ctx.restore();
  }
}
