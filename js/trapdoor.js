import { TILE, TILE_SIZE } from "./constants.js";
import { destroyRock, destroyPoopInstant } from "./destructibles.js";
import { destroyPot } from "./pot.js";
import { destroyBarrelInstant } from "./barrel.js";
import { extinguishCampfireInstant } from "./campfire.js";

export const TRAPDOOR_TX = 6;
export const TRAPDOOR_TY = 2;

export class Trapdoor {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 28;
    this.open = false;
    this.openProgress = 0;
    this.active = true;
  }

  update(dt, player) {
    if (!this.active) return false;
    if (!this.open) {
      this.openProgress = Math.min(1, this.openProgress + dt * 1.8);
      if (this.openProgress >= 1) this.open = true;
    }
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    return this.open && dist < this.radius + (player.bodyRadius ?? 11);
  }

  draw(ctx, layout) {
    if (!this.active) return;
    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y;
    const p = this.openProgress;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 4, 34 * p + 8, 22 * p + 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#2a2018";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(sx, sy + 2, 30 * p + 6, 18 * p + 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#4a3828";
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + 0.2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(angle) * 24 * p, sy + Math.sin(angle) * 14 * p);
      ctx.stroke();
    }

    if (this.open) {
      ctx.fillStyle = "rgba(20, 12, 8, 0.85)";
      ctx.beginPath();
      ctx.ellipse(sx, sy + 6, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function clearTileForTrapdoor(room, tx, ty) {
  const code = room.grid[ty]?.[tx];
  if (code === TILE.ROCK || code === TILE.BLUE_ROCK) destroyRock(room, tx, ty);
  if (code === TILE.POT) destroyPot(room, tx, ty);
  if (code === TILE.POOP) destroyPoopInstant(room, tx, ty);
  if (code === TILE.BARREL) destroyBarrelInstant(room, tx, ty);
  if (code === TILE.CAMPFIRE || code === TILE.RED_CAMPFIRE) {
    extinguishCampfireInstant(room, tx, ty);
  }
}

export function spawnTrapdoor(room) {
  clearTileForTrapdoor(room, TRAPDOOR_TX, TRAPDOOR_TY);
  return new Trapdoor(
    TRAPDOOR_TX * TILE_SIZE + TILE_SIZE / 2,
    TRAPDOOR_TY * TILE_SIZE + TILE_SIZE / 2
  );
}
