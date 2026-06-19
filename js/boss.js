import { TILE_SIZE, TEAR_DAMAGE } from "./constants.js";
import { BloodTear } from "./bloodTear.js";
import { circleHitsRoom } from "./roomSpace.js";
import { hasLineOfSight } from "./enemies.js";
import {
  applyPlayerPushToCircle,
  moveCircle,
  resolveCircleCollisions,
} from "./pushablePhysics.js";

export const BOSS_NAME = "The Wailer";
export const BOSS_HP = 380;
export const BOSS_RADIUS = 46;
export const BOSS_CONTACT_DAMAGE = 1;

const BOSS_SPEED = 108;
const SHOOT_COOLDOWN = 1.45;
const LUNGE_COOLDOWN = 3.8;

function smartMoveToward(entity, tx, ty, speed, dt, room) {
  let dx = tx - entity.x;
  let dy = ty - entity.y;
  const dist = Math.hypot(dx, dy) || 1;
  dx /= dist;
  dy /= dist;

  const probes = [0, 0.45, -0.45, 0.95, -0.95, 1.45, -1.45, Math.PI];
  for (const offset of probes) {
    const angle = Math.atan2(dy, dx) + offset;
    const step = speed * dt;
    const mx = Math.cos(angle) * step;
    const my = Math.sin(angle) * step;
    const nx = entity.x + mx;
    const ny = entity.y + my;
    if (!circleHitsRoom(nx, ny, entity.radius, room)) {
      entity.x = nx;
      entity.y = ny;
      entity.vx = mx / dt * 0.35;
      entity.vy = my / dt * 0.35;
      return true;
    }
  }
  entity.vx *= 0.8;
  entity.vy *= 0.8;
  return false;
}

/** Per-boss room layout, spawn point, and trapdoor placement. */
export const BOSS_DEFINITIONS = {
  wailer: {
    key: "wailer",
    name: BOSS_NAME,
    presetId: "wailer_chamber",
    hp: BOSS_HP,
    radius: BOSS_RADIUS,
    roomLayout: {
      rocks: [[4, 2], [8, 2], [4, 4], [8, 4]],
      poops: [[3, 3], [9, 3]],
      redCampfires: [[0, 2], [12, 2], [2, 0], [10, 0]],
      skipPerimeter: true,
    },
    spawn: { tx: 6.5, ty: 3.8 },
    trapdoor: { tx: 6, ty: 2 },
    floorBloodCount: 36,
  },
};

export const ACTIVE_BOSS_KEY = "wailer";

export function getActiveBossDefinition() {
  return BOSS_DEFINITIONS[ACTIVE_BOSS_KEY];
}

export function getBossRoomLayouts() {
  const layouts = {};
  for (const def of Object.values(BOSS_DEFINITIONS)) {
    layouts[def.presetId] = def.roomLayout;
  }
  return layouts;
}

export function getBossPresetIds() {
  return Object.values(BOSS_DEFINITIONS).map((def) => def.presetId);
}

export function getBossSpawnPosition(def = getActiveBossDefinition()) {
  return {
    x: def.spawn.tx * TILE_SIZE,
    y: def.spawn.ty * TILE_SIZE,
  };
}

export function getBossTrapdoorTile(def = getActiveBossDefinition()) {
  return def.trapdoor;
}

export function createBoss(x, y) {
  return new Boss(x, y);
}

export class Boss {
  constructor(x, y) {
    const def = getActiveBossDefinition();
    this.name = def.name;
    this.x = x;
    this.y = y;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.alive = true;
    this.radius = def.radius;
    this.shootTimer = 1.2;
    this.lungeTimer = 3;
    this.lungeVx = 0;
    this.lungeVy = 0;
    this.lungeTime = 0;
    this.hitFlash = 0;
    this.phase = 0;
    this.vx = 0;
    this.vy = 0;
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
      else this.lungeVx *= -0.35;
      if (!circleHitsRoom(this.x, ny, this.radius, room)) this.y = ny;
      else this.lungeVy *= -0.35;
    } else {
      const dist = Math.hypot(chest.x - this.x, chest.y - this.y) || 1;
      if (dist > this.radius + 24) {
        smartMoveToward(this, chest.x, chest.y, BOSS_SPEED, dt, room);
      }

      this.lungeTimer -= dt;
      if (this.lungeTimer <= 0 && dist > 70) {
        this.lungeTimer = LUNGE_COOLDOWN + Math.random() * 0.8;
        const dx = (chest.x - this.x) / dist;
        const dy = (chest.y - this.y) / dist;
        this.lungeVx = dx * 320;
        this.lungeVy = dy * 320;
        this.lungeTime = 0.42;
      }
    }

    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = SHOOT_COOLDOWN + Math.random() * 0.5;
      if (hasLineOfSight(room, this.x, this.y, chest.x, chest.y)) {
        for (let i = -2; i <= 2; i++) {
          const angle = Math.atan2(chest.y - this.y, chest.x - this.x) + i * 0.18;
          bloodTears.push(
            new BloodTear(
              this.x,
              this.y - 6,
              Math.cos(angle),
              Math.sin(angle),
              TILE_SIZE * (7 + Math.random() * 3.5)
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
    const pulse = Math.sin(Date.now() * 0.005) * 4;
    const sway = Math.sin(Date.now() * 0.003) * 2;

    ctx.save();
    if (this.hitFlash > 0) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(sx, sy, this.radius + 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const aura = ctx.createRadialGradient(sx, sy, 8, sx, sy, this.radius + 24);
    aura.addColorStop(0, "rgba(120, 20, 30, 0.25)");
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(sx, sy, this.radius + 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + this.radius * 0.58, this.radius * 0.9, this.radius * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2a1018";
    ctx.beginPath();
    ctx.moveTo(sx - this.radius * 0.75, sy + this.radius * 0.5);
    ctx.quadraticCurveTo(sx + sway, sy - this.radius * 0.2 + pulse, sx + this.radius * 0.75, sy + this.radius * 0.5);
    ctx.lineTo(sx + this.radius * 0.55, sy + this.radius * 0.85);
    ctx.quadraticCurveTo(sx, sy + this.radius * 0.65, sx - this.radius * 0.55, sy + this.radius * 0.85);
    ctx.closePath();
    ctx.fill();

    const bodyGrad = ctx.createRadialGradient(sx - 10, sy - 20, 10, sx, sy, this.radius);
    bodyGrad.addColorStop(0, "#9a3840");
    bodyGrad.addColorStop(0.5, "#6a2028");
    bodyGrad.addColorStop(1, "#3a1018");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(sx + sway * 0.5, sy + pulse, this.radius * 0.88, this.radius * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a0808";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#120608";
    ctx.beginPath();
    ctx.arc(sx - 18 + sway, sy - 12 + pulse, 11, 0, Math.PI * 2);
    ctx.arc(sx + 18 + sway, sy - 12 + pulse, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff3030";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(sx - 18 + sway, sy - 12 + pulse, 5, 0, Math.PI * 2);
    ctx.arc(sx + 18 + sway, sy - 12 + pulse, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#280808";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx + sway, sy + 10 + pulse, 22, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = "rgba(180, 40, 40, 0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const angle = Math.PI * 0.55 + i * 0.18;
      ctx.beginPath();
      ctx.moveTo(sx + sway, sy + 14);
      ctx.lineTo(sx + sway + Math.cos(angle) * 28, sy + 14 + Math.sin(angle) * 16);
      ctx.stroke();
    }

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
