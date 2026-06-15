import { TILE_SIZE } from "./constants.js";
import { circleHitsRoom } from "./roomSpace.js";

export const TEAR_MAX_RANGE = TILE_SIZE * 3.5;
export const TEAR_SPEED = 340;
export const TEAR_RADIUS = 7;

export class Tear {
  constructor(x, y, dirX, dirY) {
    this.x = x;
    this.y = y;
    this.vx = dirX * TEAR_SPEED;
    this.vy = dirY * TEAR_SPEED;
    this.radius = TEAR_RADIUS;
    this.distance = 0;
    this.maxRange = TEAR_MAX_RANGE;
    this.state = "flying";
    this.fallTimer = 0;
  }

  update(dt, room) {
    if (this.state === "dead") return;

    if (this.state === "fallen") {
      this.fallTimer -= dt;
      if (this.fallTimer <= 0) this.state = "dead";
      return;
    }

    const nextX = this.x + this.vx * dt;
    const nextY = this.y + this.vy * dt;

    if (circleHitsRoom(nextX, nextY, this.radius, room)) {
      this.state = "dead";
      return;
    }

    this.x = nextX;
    this.y = nextY;
    this.distance += TEAR_SPEED * dt;

    if (this.distance >= this.maxRange) {
      this.vx = 0;
      this.vy = 0;
      this.state = "fallen";
      this.fallTimer = 0.35;
    }
  }

  draw(ctx, layout) {
    if (this.state === "dead") return;

    const screenX = layout.floorX + this.x;
    const screenY = layout.floorY + this.y;
    const alpha = this.state === "fallen" ? Math.max(0, this.fallTimer / 0.35) : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#8ecff5";
    ctx.shadowColor = "#8ecff5";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function spawnTear(player, headDir) {
  const offset = player.radius + TEAR_RADIUS + 4;
  return new Tear(
    player.x + headDir.x * offset,
    player.y + headDir.y * offset,
    headDir.x,
    headDir.y
  );
}
