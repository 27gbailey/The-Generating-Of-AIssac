import { TILE_SIZE } from "./constants.js";
import { barrelExplosionCenter, damageBarrel, findBarrelHit } from "./barrel.js";
import { damageCampfire, findCampfireHit } from "./campfire.js";
import { circleHitsRoom, findPoopHit } from "./roomSpace.js";
import { damagePoop } from "./poop.js";

export const TEAR_MAX_RANGE = TILE_SIZE * 5;
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
  }

  update(dt, room) {
    if (this.state === "dead") return null;

    const nextX = this.x + this.vx * dt;
    const nextY = this.y + this.vy * dt;

    const barrelHit = findBarrelHit(nextX, nextY, this.radius, room);
    if (barrelHit) {
      const result = damageBarrel(room, barrelHit.key);
      this.state = "dead";
      if (result === "explode") {
        const center = barrelExplosionCenter(barrelHit.tx, barrelHit.ty);
        return { x: this.x, y: this.y, barrelExplosion: center };
      }
      return { x: this.x, y: this.y, barrel: true };
    }

    const poopHit = findPoopHit(nextX, nextY, this.radius, room);
    if (poopHit) {
      damagePoop(room, poopHit.key);
      this.state = "dead";
      return { x: this.x, y: this.y, poop: true };
    }

    const campfireHit = findCampfireHit(nextX, nextY, this.radius, room);
    if (campfireHit) {
      const state = room.campfireStates?.[campfireHit.key];
      const wasExtinguished = state?.extinguished;
      damageCampfire(room, campfireHit.key);
      this.state = "dead";
      const extinguished = !wasExtinguished && state?.extinguished;
      return { x: this.x, y: this.y, campfire: true, extinguished };
    }

    if (circleHitsRoom(nextX, nextY, this.radius, room)) {
      this.state = "dead";
      return { x: this.x, y: this.y, wall: true };
    }

    this.x = nextX;
    this.y = nextY;
    this.distance += TEAR_SPEED * dt;

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
  const offset = player.radius + TEAR_RADIUS + 6;
  return new Tear(
    player.x + headDir.x * offset,
    player.y + headDir.y * offset,
    headDir.x,
    headDir.y
  );
}
