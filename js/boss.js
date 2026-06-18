import { TILE_SIZE, TEAR_DAMAGE } from "./constants.js";
import { BloodTear } from "./bloodTear.js";
import { circleHitsRoom } from "./roomSpace.js";
import { hasLineOfSight } from "./enemies.js";

export const BOSS_NAME = "The Wailer";
export const BOSS_HP = 220;
export const BOSS_RADIUS = 44;
export const BOSS_CONTACT_DAMAGE = 1;

const BOSS_SPEED = 68;
const SHOOT_COOLDOWN = 2.2;
const LUNGE_COOLDOWN = 5.5;

export function createBoss(x, y) {
  return new Boss(x, y);
}

export class Boss {
  constructor(x, y) {
    this.name = BOSS_NAME;
    this.x = x;
    this.y = y;
    this.hp = BOSS_HP;
    this.maxHp = BOSS_HP;
    this.alive = true;
    this.radius = BOSS_RADIUS;
    this.shootTimer = 1.2;
    this.lungeTimer = 3;
    this.lungeVx = 0;
    this.lungeVy = 0;
    this.lungeTime = 0;
    this.hitFlash = 0;
    this.phase = 0;
  }

  takeDamage(amount) {
    if (!this.alive) return false;
    this.hp -= amount;
    this.hitFlash = 0.14;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
    return true;
  }

  update(dt, room, player) {
    if (!this.alive) return { bloodTears: [] };
    if (this.hitFlash > 0) this.hitFlash -= dt;

    const bloodTears = [];
    const chest = player.chestPosition?.() ?? { x: player.x, y: player.y };

    if (this.lungeTime > 0) {
      this.lungeTime -= dt;
      const nx = this.x + this.lungeVx * dt;
      const ny = this.y + this.lungeVy * dt;
      if (!circleHitsRoom(nx, this.y, this.radius, room)) this.x = nx;
      if (!circleHitsRoom(this.x, ny, this.radius, room)) this.y = ny;
    } else {
      let dx = chest.x - this.x;
      let dy = chest.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > this.radius + 30) {
        dx /= dist;
        dy /= dist;
        const step = BOSS_SPEED * dt;
        const nx = this.x + dx * step;
        const ny = this.y + dy * step;
        if (!circleHitsRoom(nx, this.y, this.radius, room)) this.x = nx;
        if (!circleHitsRoom(this.x, ny, this.radius, room)) this.y = ny;
      }

      this.lungeTimer -= dt;
      if (this.lungeTimer <= 0 && dist > 80) {
        this.lungeTimer = LUNGE_COOLDOWN + Math.random();
        this.lungeVx = (dx / dist) * 280;
        this.lungeVy = (dy / dist) * 280;
        this.lungeTime = 0.35;
      }
    }

    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = SHOOT_COOLDOWN + Math.random() * 0.8;
      if (hasLineOfSight(room, this.x, this.y, chest.x, chest.y)) {
        for (let i = -1; i <= 1; i++) {
          const angle = Math.atan2(chest.y - this.y, chest.x - this.x) + i * 0.22;
          bloodTears.push(
            new BloodTear(
              this.x,
              this.y,
              Math.cos(angle),
              Math.sin(angle),
              TILE_SIZE * (6 + Math.random() * 3)
            )
          );
        }
      }
    }

    return { bloodTears };
  }

  draw(ctx, layout) {
    if (!this.alive) return;
    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y;

    ctx.save();
    if (this.hitFlash > 0) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(sx, sy, this.radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + this.radius * 0.55, this.radius * 0.85, this.radius * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    const pulse = Math.sin(Date.now() * 0.004) * 3;
    ctx.fillStyle = "#6a2830";
    ctx.strokeStyle = "#2a1010";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(sx, sy + pulse, this.radius, this.radius * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const grad = ctx.createRadialGradient(sx - 12, sy - 16, 8, sx, sy, this.radius);
    grad.addColorStop(0, "#a84850");
    grad.addColorStop(0.55, "#7a3038");
    grad.addColorStop(1, "#4a1820");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(sx, sy + pulse - 4, this.radius * 0.92, this.radius * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a0808";
    ctx.beginPath();
    ctx.arc(sx - 16, sy - 10 + pulse, 9, 0, Math.PI * 2);
    ctx.arc(sx + 16, sy - 10 + pulse, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#cc2020";
    ctx.beginPath();
    ctx.arc(sx - 16, sy - 10 + pulse, 4, 0, Math.PI * 2);
    ctx.arc(sx + 16, sy - 10 + pulse, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#3a1010";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy + 8 + pulse, 18, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  drawIntroSilhouette(ctx, x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#4a1820";
    ctx.strokeStyle = "#1a0808";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 52, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#cc2020";
    ctx.beginPath();
    ctx.arc(-18, -8, 5, 0, Math.PI * 2);
    ctx.arc(18, -8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function checkBossContact(player, boss) {
  if (!boss?.alive) return false;
  const chest = player.chestPosition?.() ?? { x: player.x, y: player.y };
  const pr = player.bodyRadius ?? player.radius;
  return Math.hypot(chest.x - boss.x, chest.y - boss.y) < pr + boss.radius;
}

export function findBossHit(cx, cy, radius, boss) {
  if (!boss?.alive) return false;
  return Math.hypot(cx - boss.x, cy - boss.y) < radius + boss.radius;
}

export function damageBossInExplosion(boss, cx, cy, radiusX, radiusY, damage) {
  if (!boss?.alive) return false;
  const dx = (boss.x - cx) / radiusX;
  const dy = (boss.y - cy) / radiusY;
  if (dx * dx + dy * dy <= 1) {
    boss.takeDamage(damage);
    return true;
  }
  return false;
}
