import { TILE_SIZE, BODY_RADIUS } from "./constants.js";
import { circleHitsRoom } from "./roomSpace.js";

export const BLOOD_TEAR_SPEED = 155;
export const BLOOD_TEAR_RADIUS = 8;

export class BloodTear {
  constructor(x, y, dirX, dirY, maxRange) {
    this.x = x;
    this.y = y;
    const len = Math.hypot(dirX, dirY) || 1;
    this.vx = (dirX / len) * BLOOD_TEAR_SPEED;
    this.vy = (dirY / len) * BLOOD_TEAR_SPEED;
    this.radius = BLOOD_TEAR_RADIUS;
    this.distance = 0;
    this.maxRange = maxRange;
    this.state = "flying";
  }

  update(dt, room, player) {
    if (this.state === "dead") return null;

    const nextX = this.x + this.vx * dt;
    const nextY = this.y + this.vy * dt;

    const chest = player?.chestPosition?.() ?? { x: player?.x ?? 0, y: player?.y ?? 0 };
    if (
      player &&
      !player.isDying &&
      Math.hypot(nextX - chest.x, nextY - chest.y) < this.radius + (player.bodyRadius ?? BODY_RADIUS)
    ) {
      this.state = "dead";
      return { x: this.x, y: this.y, hitPlayer: true };
    }

    if (circleHitsRoom(nextX, nextY, this.radius, room)) {
      this.state = "dead";
      return { x: this.x, y: this.y, wall: true };
    }

    this.x = nextX;
    this.y = nextY;
    this.distance += BLOOD_TEAR_SPEED * dt;

    if (this.distance >= this.maxRange) {
      this.state = "dead";
      return { x: this.x, y: this.y, fizzle: true };
    }

    return null;
  }

  draw(ctx, layout) {
    if (this.state === "dead") return;

    const screenX = layout.floorX + this.x;
    const screenY = layout.floorY + this.y;

    ctx.save();
    ctx.fillStyle = "#8a1010";
    ctx.shadowColor = "#cc2020";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 80, 80, 0.55)";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(screenX - 1.5, screenY - 1.5, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function spawnBloodTearFromCampfire(cx, cy, player, rand) {
  const target = player.chestPosition?.() ?? player;
  let dx = target.x - cx;
  let dy = target.y - cy;
  if (Math.hypot(dx, dy) < 8) {
    const angle = rand() * Math.PI * 2;
    dx = Math.cos(angle);
    dy = Math.sin(angle);
  }
  dx += (rand() - 0.5) * 0.55;
  dy += (rand() - 0.5) * 0.55;
  const maxRange = TILE_SIZE * (5 + rand() * 3.5);
  return new BloodTear(cx, cy - 8, dx, dy, maxRange);
}
