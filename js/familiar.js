import { CHEST_OFFSET_Y } from "./constants.js";
import { Tear } from "./tear.js";

const FOLLOW_DISTANCE = 30;
const SHOOT_RATE = 0.38;
const BOBBY_DAMAGE_MULT = 0.55;
const BOBBY_RADIUS_MULT = 0.72;

export class BrotherBobby {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.shootCooldown = 0;
    this.bobPhase = Math.random() * Math.PI * 2;
  }

  syncPosition(player) {
    const backX = -(player.bodyDir?.x ?? 0);
    const backY = -(player.bodyDir?.y ?? 1);
    const len = Math.hypot(backX, backY) || 1;
    this.x = player.x + (backX / len) * FOLLOW_DISTANCE;
    this.y = player.y + (backY / len) * FOLLOW_DISTANCE;
  }

  update(dt, player) {
    this.syncPosition(player);
    this.bobPhase += dt * 3.2;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
  }

  tryShoot(player, headDir) {
    if (this.shootCooldown > 0) return null;
    if (!headDir || (headDir.x === 0 && headDir.y === 0)) return null;

    const mods = player.getTearModifiers?.() ?? {};
    this.shootCooldown = SHOOT_RATE;
    this.syncPosition(player);

    const offset = 10;
    const x = this.x + headDir.x * offset;
    const y = this.y + CHEST_OFFSET_Y - 10 + headDir.y * offset;
    const damage = (mods.damage ?? 3.5) * BOBBY_DAMAGE_MULT;
    const radius = 7 * BOBBY_RADIUS_MULT * (mods.tearSizeMult ?? 1);

    return new Tear(x, y, headDir.x, headDir.y, {
      damage,
      maxRange: mods.maxRange,
      homing: false,
      boomerang: false,
      radius,
      color: "#6eb8f0",
      shadowColor: "#4a90c8",
    });
  }

  draw(ctx, layout) {
    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y + Math.sin(this.bobPhase) * 2;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 10, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4a78c8";
    ctx.strokeStyle = "#2a4888";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f5deb3";
    ctx.beginPath();
    ctx.arc(sx, sy - 4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8b6914";
    ctx.stroke();

    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(sx - 3, sy - 5, 1.8, 0, Math.PI * 2);
    ctx.arc(sx + 3, sy - 5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3a58a0";
    ctx.fillRect(sx - 7, sy + 2, 14, 8);
    ctx.restore();
  }
}

export function createBrotherBobby() {
  return new BrotherBobby();
}

export function playerHasBrotherBobby(player) {
  return player?.items?.includes("brother_bobby") ?? false;
}
