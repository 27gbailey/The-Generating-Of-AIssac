import { CHEST_RADIUS } from "./constants.js";
import { rollChestLoot, spillPickups } from "./pickup.js";
import {
  applyPlayerPushToCircle,
  moveCircle,
  resolveCircleCollisions,
} from "./pushablePhysics.js";

export class Chest {
  constructor(x, y, rand) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = CHEST_RADIUS;
    this.opened = false;
    this.loot = rollChestLoot(rand);
    this._rand = rand;
  }

  update(dt, room, player, entities) {
    if (!this.opened && this.tryOpen(player)) {
      this.opened = true;
      return spillPickups(this.loot, this.x, this.y, this._rand);
    }
    applyPlayerPushToCircle(player, this, 0.45, 0.1);
    resolveCircleCollisions(this, entities, 0.65);
    moveCircle(this, dt, room, entities, Math.exp(-12 * dt));
    return [];
  }

  tryOpen(player) {
    return Math.hypot(this.x - player.x, this.y - player.y) < this.radius + player.radius - 2;
  }

  draw(ctx, layout) {
    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y;
    const w = this.radius * 1.55;
    const h = this.radius * 1.25;
    ctx.save();
    ctx.fillStyle = this.opened ? "#6a4828" : "#5a3818";
    ctx.strokeStyle = "#2a1808";
    ctx.lineWidth = 2;
    ctx.fillRect(sx - w / 2, sy - h * 0.15, w, h * 0.85);
    ctx.strokeRect(sx - w / 2, sy - h * 0.15, w, h * 0.85);
    if (!this.opened) {
      ctx.fillStyle = "#c8a030";
      ctx.beginPath();
      ctx.arc(sx, sy + h * 0.08, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(10,8,6,0.55)";
      ctx.fillRect(sx - w / 2 + 5, sy - h * 0.05, w - 10, h * 0.55);
    }
    ctx.restore();
  }
}
