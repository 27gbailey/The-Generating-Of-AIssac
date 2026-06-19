import { CHEST_RADIUS } from "./constants.js";
import { rollChestLoot, rollGoldenChestLoot, spillPickups } from "./pickup.js";
import {
  applyPlayerPushToCircle,
  moveCircle,
  resolveCircleCollisions,
} from "./pushablePhysics.js";

export class Chest {
  constructor(x, y, rand, { golden = false } = {}) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = CHEST_RADIUS;
    this.opened = false;
    this.isGolden = golden;
    this.requiresKey = golden;
    this.loot = golden ? rollGoldenChestLoot(rand) : rollChestLoot(rand);
    this._rand = rand;
  }

  update(dt, room, player, entities) {
    if (!this.opened && this.tryOpen(player)) {
      if (this.requiresKey && player.stats.keys <= 0) return [];
      if (this.requiresKey) player.stats.keys -= 1;
      this.opened = true;
      return spillPickups(this.loot, this.x, this.y, this._rand);
    }
    applyPlayerPushToCircle(player, this, 0.4, 0.08);
    resolveCircleCollisions(this, entities, 0.65);
    moveCircle(this, dt, room, entities, Math.exp(-12 * dt));
    return [];
  }

  tryOpen(player) {
    return Math.hypot(this.x - player.x, this.y - player.y) < this.radius + player.radius + 4;
  }

  draw(ctx, layout) {
    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y;
    const w = this.radius * 1.65;
    const h = this.radius * 1.35;

    ctx.save();

    ctx.fillStyle = "rgba(20, 12, 8, 0.35)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + h * 0.45, w * 0.55, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.isGolden) {
      ctx.fillStyle = this.opened ? "#8a7020" : "#a88828";
      ctx.strokeStyle = "#5a4810";
    } else {
      ctx.fillStyle = this.opened ? "#6a4828" : "#5a3818";
      ctx.strokeStyle = "#2a1808";
    }
    ctx.lineWidth = 2.5;
    ctx.fillRect(sx - w / 2, sy - h * 0.12, w, h * 0.88);
    ctx.strokeRect(sx - w / 2, sy - h * 0.12, w, h * 0.88);

    if (this.opened) {
      ctx.fillStyle = this.isGolden ? "#6a5818" : "#4a3015";
      ctx.fillRect(sx - w / 2 + 4, sy - h * 0.55, w - 8, h * 0.45);
      ctx.fillStyle = "rgba(10, 8, 6, 0.6)";
      ctx.fillRect(sx - w / 2 + 6, sy - h * 0.02, w - 12, h * 0.58);
    } else {
      ctx.fillStyle = this.isGolden ? "#c8a830" : "#7a5530";
      ctx.fillRect(sx - w / 2 + 4, sy - h * 0.48, w - 8, h * 0.38);
      ctx.fillStyle = this.isGolden ? "#ffe878" : "#c8a030";
      ctx.beginPath();
      ctx.arc(sx, sy + h * 0.1, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = this.isGolden ? "#8a7010" : "#6a5010";
      ctx.stroke();
    }

    ctx.strokeStyle = this.isGolden ? "#c8a848" : "#8a6040";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - w / 2 + 6, sy + h * 0.22);
    ctx.lineTo(sx + w / 2 - 6, sy + h * 0.22);
    ctx.stroke();

    ctx.fillStyle = "#e8dcc8";
    ctx.font = "bold 10px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.opened ? "OPEN" : this.isGolden ? "GOLD" : "CHEST", sx, sy - h * 0.62);

    ctx.restore();
  }
}

export function createGoldenChest(x, y, rand) {
  return new Chest(x, y, rand, { golden: true });
}
