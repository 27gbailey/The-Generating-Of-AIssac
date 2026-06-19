import { TILE, TILE_SIZE } from "./constants.js";
import { destroyRock, destroyPoopInstant } from "./destructibles.js";
import { destroyPot } from "./pot.js";
import { destroyBarrelInstant } from "./barrel.js";
import { extinguishCampfireInstant } from "./campfire.js";
import { getActiveBossDefinition, getBossTrapdoorTile } from "./boss.js";

export class Trapdoor {
  constructor(x, y, player = null) {
    this.x = x;
    this.y = y;
    this.radius = 22;
    this.active = true;
    this.openProgress = 0;
    this.playerWasOn = false;
    this.spawnedUnderPlayer = player ? this.isPlayerOver(player) : false;
    this.state = this.spawnedUnderPlayer ? "closed" : "opening";
  }

  isPlayerOver(player) {
    return (
      Math.hypot(player.x - this.x, player.y - this.y) <
      this.radius + (player.bodyRadius ?? 11)
    );
  }

  get isOpen() {
    return this.state === "open";
  }

  update(dt, player) {
    if (!this.active) return false;

    const over = this.isPlayerOver(player);

    if (this.state === "closed") {
      if (over) this.playerWasOn = true;
      if (this.playerWasOn && !over) {
        this.state = "opening";
      }
      return false;
    }

    if (this.state === "opening") {
      this.openProgress = Math.min(1, this.openProgress + dt * 2.4);
      if (this.openProgress >= 1) this.state = "open";
      return false;
    }

    return over;
  }

  draw(ctx, layout) {
    if (!this.active) return;

    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y;
    const openAmt = this.state === "closed" ? 0 : this.state === "open" ? 1 : this.openProgress;
    const size = 26;

    ctx.save();

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(sx - size - 2, sy - size - 2, size * 2 + 4, size * 2 + 4);

    ctx.strokeStyle = "#3a3028";
    ctx.lineWidth = 3;
    ctx.strokeRect(sx - size, sy - size, size * 2, size * 2);

    ctx.strokeStyle = "#5a4a38";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - size + 4, sy - size + 4, size * 2 - 8, size * 2 - 8);

    if (openAmt > 0.05) {
      ctx.fillStyle = "#080604";
      ctx.fillRect(sx - size + 6, sy - size + 6, size * 2 - 12, size * 2 - 12);

      ctx.strokeStyle = "#1a1410";
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const lx = sx - size + 10 + i * 10;
        ctx.beginPath();
        ctx.moveTo(lx, sy + size - 8);
        ctx.lineTo(lx + 3, sy - size + 14);
        ctx.stroke();
      }
    }

    const hatchAngle = -openAmt * 1.35;
    ctx.save();
    ctx.translate(sx - size + 6, sy - size + 6);
    ctx.rotate(hatchAngle);

    ctx.fillStyle = "#6a5038";
    ctx.fillRect(0, 0, size * 2 - 12, size * 2 - 12);

    ctx.strokeStyle = "#3a2818";
    ctx.lineWidth = 1.5;
    for (let row = 0; row < 3; row++) {
      const py = 4 + row * ((size * 2 - 20) / 2);
      ctx.beginPath();
      ctx.moveTo(4, py);
      ctx.lineTo(size * 2 - 16, py);
      ctx.stroke();
    }
    for (let col = 0; col < 3; col++) {
      const px = 4 + col * ((size * 2 - 20) / 2);
      ctx.beginPath();
      ctx.moveTo(px, 4);
      ctx.lineTo(px, size * 2 - 16);
      ctx.stroke();
    }

    ctx.fillStyle = "#2a2018";
    ctx.beginPath();
    ctx.arc(size - 6, size - 6, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.strokeStyle = "#7a6858";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - size + 1, sy - size + 1, size * 2 - 2, size * 2 - 2);

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

export function spawnTrapdoor(room, player, bossDef = getActiveBossDefinition()) {
  const { tx, ty } = getBossTrapdoorTile(bossDef);
  clearTileForTrapdoor(room, tx, ty);
  return new Trapdoor(
    tx * TILE_SIZE + TILE_SIZE / 2,
    ty * TILE_SIZE + TILE_SIZE / 2,
    player
  );
}
