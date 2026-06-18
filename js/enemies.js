import {
  DIP_HP,
  ENEMY_CONTACT_DAMAGE,
  GAPER_HP,
  HORF_HP,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import { BloodTear } from "./bloodTear.js";
import { circleHitsRoom } from "./roomSpace.js";
import { isRockSolid } from "./destructibles.js";
import { isPoopSolid } from "./poop.js";
import { isBarrelSolid } from "./barrel.js";

const HORF_SHOOT_COOLDOWN = 1.8;
const HORF_SHOOT_RANGE = TILE_SIZE * 6.5;
const GAPER_SPEED = 95;
const DIP_BURST_SPEED = 180;
const DIP_BURST_TIME = 0.22;
const DIP_PAUSE_TIME = 0.85;

function isSolidForLineOfSight(room, tx, ty) {
  const code = room.grid[ty]?.[tx];
  if (code === TILE.WALL) return true;
  if (code === TILE.ROCK && isRockSolid(room, tx, ty)) return true;
  if (code === TILE.POOP && isPoopSolid(room, tx, ty)) return true;
  if (code === TILE.BARREL && isBarrelSolid(room, tx, ty)) return true;
  return false;
}

export function hasLineOfSight(room, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 8) return true;

  const steps = Math.ceil(dist / (TILE_SIZE * 0.35));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const sx = x0 + dx * t;
    const sy = y0 + dy * t;
    const tx = Math.floor(sx / TILE_SIZE);
    const ty = Math.floor(sy / TILE_SIZE);
    if (tx < 0 || ty < 0 || tx >= ROOM_WIDTH || ty >= ROOM_HEIGHT) continue;
    if (isSolidForLineOfSight(room, tx, ty)) return false;
  }
  return true;
}

function tryMove(entity, nextX, nextY, room) {
  const r = entity.radius;
  if (!circleHitsRoom(nextX, nextY, r, room)) {
    entity.x = nextX;
    entity.y = nextY;
    return true;
  }
  if (!circleHitsRoom(nextX, entity.y, r, room)) {
    entity.x = nextX;
    return true;
  }
  if (!circleHitsRoom(entity.x, nextY, r, room)) {
    entity.y = nextY;
    return true;
  }
  return false;
}

export class Enemy {
  constructor(type, x, y, hp) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.maxHp = hp;
    this.alive = true;
    this.radius = 14;
    this.hitFlash = 0;
  }

  takeDamage(amount) {
    if (!this.alive) return false;
    this.hp -= amount;
    this.hitFlash = 0.12;
    if (this.hp <= 0) {
      this.alive = false;
    }
    return true;
  }

  update(dt, room, player) {
    if (!this.alive) return { bloodTears: [] };
    if (this.hitFlash > 0) this.hitFlash -= dt;
    return { bloodTears: [] };
  }

  draw(ctx, layout) {
    if (!this.alive) return;
    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y;
    if (this.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(sx, sy, this.radius + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export class Horf extends Enemy {
  constructor(x, y) {
    super("horf", x, y, HORF_HP);
    this.radius = 16;
    this.shootTimer = 0.6 + Math.random();
  }

  update(dt, room, player) {
    if (!this.alive) return { bloodTears: [] };
    if (this.hitFlash > 0) this.hitFlash -= dt;

    const bloodTears = [];
    const chest = player.chestPosition?.() ?? { x: player.x, y: player.y };

    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      const dist = Math.hypot(chest.x - this.x, chest.y - this.y);
      if (dist <= HORF_SHOOT_RANGE && hasLineOfSight(room, this.x, this.y, chest.x, chest.y)) {
        const dx = chest.x - this.x;
        const dy = chest.y - this.y;
        const maxRange = TILE_SIZE * (3.5 + Math.random() * 2);
        bloodTears.push(new BloodTear(this.x, this.y - 4, dx, dy, maxRange));
        this.shootTimer = HORF_SHOOT_COOLDOWN + Math.random() * 0.8;
      } else {
        this.shootTimer = 0.35;
      }
    }

    return { bloodTears };
  }

  draw(ctx, layout) {
    if (!this.alive) return;
    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y;

    ctx.save();
    ctx.fillStyle = "#6a5a52";
    ctx.strokeStyle = "#3a3028";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, sy + 10, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#c4a898";
    ctx.beginPath();
    ctx.arc(sx, sy - 2, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1a1010";
    ctx.beginPath();
    ctx.arc(sx - 6, sy - 4, 3, 0, Math.PI * 2);
    ctx.arc(sx + 6, sy - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#4a2020";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 5, sy + 4);
    ctx.lineTo(sx + 5, sy + 4);
    ctx.stroke();

    super.draw(ctx, layout);
    ctx.restore();
  }
}

export class Gaper extends Enemy {
  constructor(x, y) {
    super("gaper", x, y, GAPER_HP);
    this.radius = 13;
    this.facing = 1;
    this.walkPhase = 0;
  }

  update(dt, room, player) {
    if (!this.alive) return { bloodTears: [] };
    if (this.hitFlash > 0) this.hitFlash -= dt;

    const chest = player.chestPosition?.() ?? { x: player.x, y: player.y };
    let dx = chest.x - this.x;
    let dy = chest.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 4) {
      dx /= dist;
      dy /= dist;
      if (Math.abs(dx) > 0.05) this.facing = dx >= 0 ? 1 : -1;
      const step = GAPER_SPEED * dt;
      tryMove(this, this.x + dx * step, this.y + dy * step, room);
      this.walkPhase += dt * 10;
    }

    return { bloodTears: [] };
  }

  draw(ctx, layout) {
    if (!this.alive) return;
    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y;
    const bob = Math.sin(this.walkPhase) * 2;

    ctx.save();
    ctx.translate(sx, sy + bob);
    ctx.scale(this.facing, 1);

    ctx.fillStyle = "#8b7355";
    ctx.strokeStyle = "#4a3828";
    ctx.lineWidth = 2;
    ctx.fillRect(-8, 4, 16, 14);
    ctx.strokeRect(-8, 4, 16, 14);

    ctx.fillStyle = "#b89878";
    ctx.beginPath();
    ctx.arc(0, -6, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(-5, -8, 2.5, 0, Math.PI * 2);
    ctx.arc(5, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#3a2820";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.stroke();

    ctx.restore();
    super.draw(ctx, layout);
  }
}

export class Dip extends Enemy {
  constructor(x, y) {
    super("dip", x, y, DIP_HP);
    this.radius = 9;
    this.phase = "pause";
    this.phaseTimer = Math.random() * DIP_PAUSE_TIME;
    this.vx = 0;
    this.vy = 0;
  }

  pickBurstDirection() {
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle);
    this.vy = Math.sin(angle);
  }

  update(dt, room, player) {
    if (!this.alive) return { bloodTears: [] };
    if (this.hitFlash > 0) this.hitFlash -= dt;

    this.phaseTimer -= dt;
    if (this.phase === "pause") {
      if (this.phaseTimer <= 0) {
        this.phase = "burst";
        this.phaseTimer = DIP_BURST_TIME;
        this.pickBurstDirection();
      }
    } else if (this.phaseTimer <= 0) {
      this.phase = "pause";
      this.phaseTimer = DIP_PAUSE_TIME + Math.random() * 0.5;
    } else {
      const step = DIP_BURST_SPEED * dt;
      tryMove(this, this.x + this.vx * step, this.y + this.vy * step, room);
    }

    return { bloodTears: [] };
  }

  draw(ctx, layout) {
    if (!this.alive) return;
    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y;

    ctx.save();
    ctx.fillStyle = "#6b4a28";
    ctx.strokeStyle = "#3a2818";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 11, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#5a3a18";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 2, 8, 5, 0, 0, Math.PI);
    ctx.fill();

    ctx.fillStyle = "#1a1010";
    ctx.beginPath();
    ctx.arc(sx - 3, sy - 2, 1.8, 0, Math.PI * 2);
    ctx.arc(sx + 3, sy - 2, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#2a1810";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy + 1, 4, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.restore();
    super.draw(ctx, layout);
  }
}

export function createEnemy(type, x, y) {
  switch (type) {
    case "horf":
      return new Horf(x, y);
    case "gaper":
      return new Gaper(x, y);
    case "dip":
      return new Dip(x, y);
    default:
      return new Gaper(x, y);
  }
}

export function checkEnemyContact(player, enemies) {
  const chest = player.chestPosition?.() ?? { x: player.x, y: player.y };
  const pr = player.bodyRadius ?? player.radius;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    if (Math.hypot(chest.x - enemy.x, chest.y - enemy.y) < pr + enemy.radius) {
      return enemy;
    }
  }
  return null;
}

export function damageEnemiesInExplosion(enemies, cx, cy, radiusX, radiusY, damage) {
  let hitAny = false;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dx = (enemy.x - cx) / radiusX;
    const dy = (enemy.y - cy) / radiusY;
    if (dx * dx + dy * dy <= 1) {
      enemy.takeDamage(damage);
      hitAny = true;
    }
  }
  return hitAny;
}

export function findEnemyHit(cx, cy, radius, enemies) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    if (Math.hypot(cx - enemy.x, cy - enemy.y) < radius + enemy.radius) {
      return enemy;
    }
  }
  return null;
}

export { ENEMY_CONTACT_DAMAGE };
