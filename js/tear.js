import { TILE_SIZE } from "./constants.js";
import { barrelExplosionCenter, damageBarrel, findBarrelHit } from "./barrel.js";
import { damageCampfire, findCampfireHit } from "./campfire.js";
import { circleHitsRoom, findPoopHit } from "./roomSpace.js";
import { damagePoop } from "./poop.js";
import { findEnemyHit } from "./enemies.js";
import { findBossHit } from "./boss.js";

export const TEAR_MAX_RANGE = TILE_SIZE * 5;
export const TEAR_SPEED = 340;
export const TEAR_RADIUS = 7;

const HOMING_TURN_RATE = 5.5;
const HOMING_RANGE = TILE_SIZE * 8;

function findNearestTarget(x, y, enemies, boss) {
  let best = null;
  let bestDist = HOMING_RANGE;

  if (boss?.alive) {
    const d = Math.hypot(boss.x - x, boss.y - y);
    if (d < bestDist) {
      best = { x: boss.x, y: boss.y };
      bestDist = d;
    }
  }

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const d = Math.hypot(enemy.x - x, enemy.y - y);
    if (d < bestDist) {
      best = { x: enemy.x, y: enemy.y };
      bestDist = d;
    }
  }

  return best;
}

function steerToward(vx, vy, tx, ty, x, y, dt, speed) {
  const dx = tx - x;
  const dy = ty - y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return { vx, vy };

  const desiredVx = (dx / dist) * speed;
  const desiredVy = (dy / dist) * speed;
  const blend = Math.min(1, HOMING_TURN_RATE * dt);
  let nvx = vx + (desiredVx - vx) * blend;
  let nvy = vy + (desiredVy - vy) * blend;
  const sp = Math.hypot(nvx, nvy) || 1;
  return { vx: (nvx / sp) * speed, vy: (nvy / sp) * speed };
}

export class Tear {
  constructor(x, y, dirX, dirY, options = {}) {
    this.x = x;
    this.y = y;
    const speed = options.speed ?? TEAR_SPEED;
    this.vx = dirX * speed;
    this.vy = dirY * speed;
    this.speed = speed;
    this.radius = TEAR_RADIUS;
    this.distance = 0;
    this.maxRange = options.maxRange ?? TEAR_MAX_RANGE;
    this.damage = options.damage ?? 3.5;
    this.homing = options.homing ?? false;
    this.boomerang = options.boomerang ?? false;
    this.returning = false;
    this.player = options.player ?? null;
    this.state = "flying";
    this.trail = [];
  }

  update(dt, room, enemies = [], boss = null, player = null) {
    if (this.state === "dead") return null;

    const owner = player ?? this.player;

    if (this.homing && !this.returning) {
      const target = findNearestTarget(this.x, this.y, enemies, boss);
      if (target) {
        const steered = steerToward(
          this.vx,
          this.vy,
          target.x,
          target.y,
          this.x,
          this.y,
          dt,
          this.speed
        );
        this.vx = steered.vx;
        this.vy = steered.vy;
      }
    }

    if (this.boomerang) {
      if (!this.returning && this.distance >= this.maxRange) {
        this.returning = true;
      }
      if (this.returning && owner) {
        const aimX = owner.x;
        const aimY = owner.y - 6;
        const steered = steerToward(
          this.vx,
          this.vy,
          aimX,
          aimY,
          this.x,
          this.y,
          dt,
          this.speed
        );
        this.vx = steered.vx;
        this.vy = steered.vy;

        const dist = Math.hypot(this.x - aimX, this.y - aimY);
        if (dist < (owner.bodyRadius ?? 11) + this.radius + 4) {
          this.state = "dead";
          return { x: this.x, y: this.y, fizzle: true };
        }
      }
    }

    const nextX = this.x + this.vx * dt;
    const nextY = this.y + this.vy * dt;

    if (this.homing) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 6) this.trail.shift();
    }

    const bossHit = boss?.alive && findBossHit(nextX, nextY, this.radius, boss);
    if (bossHit) {
      boss.takeDamage(this.damage);
      this.state = "dead";
      return { x: this.x, y: this.y, boss: true, killed: !boss.alive };
    }

    const enemyHit = findEnemyHit(nextX, nextY, this.radius, enemies);
    if (enemyHit) {
      enemyHit.takeDamage(this.damage);
      this.state = "dead";
      return { x: this.x, y: this.y, enemy: true, killed: !enemyHit.alive };
    }

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
      return { x: this.x, y: this.y, campfire: true, extinguished, isRed: campfireHit.isRed };
    }

    if (circleHitsRoom(nextX, nextY, this.radius, room)) {
      this.state = "dead";
      return { x: this.x, y: this.y, wall: true };
    }

    this.x = nextX;
    this.y = nextY;
    this.distance += this.speed * dt;

    if (!this.boomerang && this.distance >= this.maxRange) {
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

    if (this.homing && this.trail.length > 1) {
      ctx.strokeStyle = "rgba(120, 200, 245, 0.35)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < this.trail.length; i++) {
        const p = this.trail[i];
        const px = layout.floorX + p.x;
        const py = layout.floorY + p.y;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.lineTo(screenX, screenY);
      ctx.stroke();
    }

    ctx.fillStyle = this.boomerang && this.returning ? "#a8e0ff" : "#8ecff5";
    ctx.shadowColor = "#8ecff5";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function spawnTears(player, headDir, headPos = null) {
  const head = headPos ?? player.headPosition?.() ?? { x: player.x, y: player.y - 14 };
  const mods = player.getTearModifiers?.() ?? {};
  const offset = TEAR_RADIUS + 8;
  const baseX = head.x + headDir.x * offset;
  const baseY = head.y + headDir.y * offset;

  const options = {
    damage: mods.damage,
    maxRange: mods.maxRange,
    homing: mods.homing,
    boomerang: mods.boomerang,
    player,
  };

  const count = mods.multishot ?? 1;
  if (count <= 1) {
    return [
      new Tear(baseX, baseY, headDir.x, headDir.y, options),
    ];
  }

  const spread = mods.spread ?? 0.14;
  const tears = [];
  const mid = (count - 1) / 2;

  for (let i = 0; i < count; i++) {
    const angle = Math.atan2(headDir.y, headDir.x) + (i - mid) * spread;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    tears.push(new Tear(baseX, baseY, dx, dy, options));
  }

  return tears;
}

/** @deprecated use spawnTears */
export function spawnTear(player, headDir, headPos = null) {
  return spawnTears(player, headDir, headPos)[0];
}
