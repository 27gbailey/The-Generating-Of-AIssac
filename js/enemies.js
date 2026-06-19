import {
  ATTACK_FLY_HP,
  POOTER_FLY_HP,
  DIP_HP,
  ENEMY_CONTACT_DAMAGE,
  FLY_HP,
  GAPER_HP,
  HORF_HP,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import { BloodTear } from "./bloodTear.js";
import { circleHitsRoom } from "./roomSpace.js";
import { resolveCircleCollisions, moveCircle } from "./pushablePhysics.js";
import { isBlueRockSolid, isPotSolid, isRockSolid } from "./destructibles.js";
import { isPoopSolid } from "./poop.js";
import { isBarrelSolid } from "./barrel.js";

const HORF_SHOOT_COOLDOWN = 1.8;
const HORF_SHOOT_RANGE = TILE_SIZE * 9;
const GAPER_SPEED = 95;
const DIP_BURST_SPEED = 180;
const DIP_BURST_TIME = 0.22;
const DIP_PAUSE_TIME = 0.85;
const FLY_WANDER_SPEED = 38;
const ATTACK_FLY_SPEED = 78;
const POOTER_FLY_WANDER_SPEED = 34;
const POOTER_FLY_CHASE_SPEED = 48;
const POOTER_FLY_CHASE_RANGE = TILE_SIZE * 4.5;
const POOTER_FLY_SHOOT_RANGE = TILE_SIZE * 8.5;
const POOTER_FLY_SHOOT_COOLDOWN = 2.1;

function isSolidForLineOfSight(room, tx, ty) {
  const code = room.grid[ty]?.[tx];
  if (code === TILE.WALL) return true;
  if (code === TILE.ROCK && isRockSolid(room, tx, ty)) return true;
  if (code === TILE.BLUE_ROCK && isBlueRockSolid(room, tx, ty)) return true;
  if (code === TILE.POT && isPotSolid(room, tx, ty)) return true;
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
  const opts = entity.flying ? { flying: true } : {};
  if (!circleHitsRoom(nextX, nextY, r, room, opts)) {
    entity.x = nextX;
    entity.y = nextY;
    return true;
  }
  if (!circleHitsRoom(nextX, entity.y, r, room, opts)) {
    entity.x = nextX;
    return true;
  }
  if (!circleHitsRoom(entity.x, nextY, r, room, opts)) {
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
    this.vx = 0;
    this.vy = 0;
    this.flying = false;
    this.harmless = false;
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
        const maxRange = TILE_SIZE * (5.5 + Math.random() * 3);
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
      const nx = this.x + dx * step;
      const ny = this.y + dy * step;
      if (tryMove(this, nx, ny, room)) {
        this.vx = dx * GAPER_SPEED * 0.5;
        this.vy = dy * GAPER_SPEED * 0.5;
      }
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
    this.hitRadius = 13;
    this.hitHeightStretch = 1.35;
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
      if (tryMove(this, this.x + this.vx * step, this.y + this.vy * step, room)) {
        this.vx *= 0.92;
        this.vy *= 0.92;
      }
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

function drawFlyWings(ctx, sx, sy, phase, tint = "rgba(220, 220, 230, 0.55)") {
  const flap = Math.sin(phase * 14) * 5;
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.ellipse(sx - 9, sy - 1 - flap, 6, 10, -0.45, 0, Math.PI * 2);
  ctx.ellipse(sx + 9, sy - 1 - flap, 6, 10, 0.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawFlyBall(ctx, sx, sy, phase, { fill, stroke, radius = 8, wingTint, eyes = null }) {
  drawFlyWings(ctx, sx, sy, phase, wingTint);

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.beginPath();
  ctx.arc(sx - radius * 0.28, sy - radius * 0.32, radius * 0.32, 0, Math.PI * 2);
  ctx.fill();

  if (eyes) {
    ctx.fillStyle = eyes;
    ctx.beginPath();
    ctx.arc(sx - 3, sy - 1, 2.2, 0, Math.PI * 2);
    ctx.arc(sx + 3, sy - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Fly extends Enemy {
  constructor(x, y) {
    super("fly", x, y, FLY_HP);
    this.flying = true;
    this.harmless = true;
    this.radius = 9;
    this.hitRadius = 14;
    this.hitHeightStretch = 1.45;
    this.wanderTimer = Math.random() * 2;
    this.wanderDirX = 0;
    this.wanderDirY = 0;
    this.wingPhase = Math.random() * Math.PI * 2;
  }

  pickWanderDirection() {
    const angle = Math.random() * Math.PI * 2;
    this.wanderDirX = Math.cos(angle);
    this.wanderDirY = Math.sin(angle);
    this.wanderTimer = 1.1 + Math.random() * 2.2;
  }

  update(dt, room, player) {
    if (!this.alive) return { bloodTears: [] };
    if (this.hitFlash > 0) this.hitFlash -= dt;
    this.wingPhase += dt;

    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) this.pickWanderDirection();

    const step = FLY_WANDER_SPEED * dt;
    tryMove(this, this.x + this.wanderDirX * step, this.y + this.wanderDirY * step, room);

    return { bloodTears: [] };
  }

  draw(ctx, layout) {
    if (!this.alive) return;
    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y - 2;

    ctx.save();
    drawFlyBall(ctx, sx, sy, this.wingPhase, {
      fill: "#1a1a1a",
      stroke: "#050505",
      radius: 8,
      wingTint: "rgba(200, 200, 210, 0.5)",
    });
    ctx.restore();
    super.draw(ctx, layout);
  }
}

export class AttackFly extends Enemy {
  constructor(x, y) {
    super("attack_fly", x, y, ATTACK_FLY_HP);
    this.flying = true;
    this.radius = 10;
    this.hitRadius = 14;
    this.hitHeightStretch = 1.45;
    this.wingPhase = Math.random() * Math.PI * 2;
  }

  update(dt, room, player) {
    if (!this.alive) return { bloodTears: [] };
    if (this.hitFlash > 0) this.hitFlash -= dt;
    this.wingPhase += dt;

    const chest = player.chestPosition?.() ?? { x: player.x, y: player.y };
    let dx = chest.x - this.x;
    let dy = chest.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 4) {
      dx /= dist;
      dy /= dist;
      const step = ATTACK_FLY_SPEED * dt;
      tryMove(this, this.x + dx * step, this.y + dy * step, room);
      this.vx = dx * ATTACK_FLY_SPEED * 0.4;
      this.vy = dy * ATTACK_FLY_SPEED * 0.4;
    }

    return { bloodTears: [] };
  }

  draw(ctx, layout) {
    if (!this.alive) return;
    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y - 2;

    ctx.save();
    drawFlyBall(ctx, sx, sy, this.wingPhase, {
      fill: "#c02828",
      stroke: "#701010",
      radius: 9,
      wingTint: "rgba(255, 170, 160, 0.52)",
    });
    ctx.restore();
    super.draw(ctx, layout);
  }
}

export class PooterFly extends Enemy {
  constructor(x, y) {
    super("pooter_fly", x, y, POOTER_FLY_HP);
    this.flying = true;
    this.radius = 10;
    this.hitRadius = 14;
    this.hitHeightStretch = 1.45;
    this.wingPhase = Math.random() * Math.PI * 2;
    this.wanderTimer = Math.random() * 2;
    this.wanderDirX = 0;
    this.wanderDirY = 0;
    this.shootTimer = 0.8 + Math.random();
  }

  pickWanderDirection() {
    const angle = Math.random() * Math.PI * 2;
    this.wanderDirX = Math.cos(angle);
    this.wanderDirY = Math.sin(angle);
    this.wanderTimer = 1.3 + Math.random() * 2;
  }

  update(dt, room, player) {
    if (!this.alive) return { bloodTears: [] };
    if (this.hitFlash > 0) this.hitFlash -= dt;
    this.wingPhase += dt;

    const bloodTears = [];
    const chest = player.chestPosition?.() ?? { x: player.x, y: player.y };
    const dist = Math.hypot(chest.x - this.x, chest.y - this.y);
    const canSee = hasLineOfSight(room, this.x, this.y, chest.x, chest.y);

    if (dist <= POOTER_FLY_CHASE_RANGE) {
      let dx = chest.x - this.x;
      let dy = chest.y - this.y;
      if (dist > 4) {
        dx /= dist;
        dy /= dist;
        const step = POOTER_FLY_CHASE_SPEED * dt;
        tryMove(this, this.x + dx * step, this.y + dy * step, room);
      }
    } else {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) this.pickWanderDirection();
      const step = POOTER_FLY_WANDER_SPEED * dt;
      tryMove(this, this.x + this.wanderDirX * step, this.y + this.wanderDirY * step, room);
    }

    this.shootTimer -= dt;
    if (this.shootTimer <= 0 && canSee && dist <= POOTER_FLY_SHOOT_RANGE) {
      const dx = chest.x - this.x;
      const dy = chest.y - this.y;
      const maxRange = TILE_SIZE * (4.5 + Math.random() * 2.5);
      bloodTears.push(new BloodTear(this.x, this.y - 3, dx, dy, maxRange));
      this.shootTimer = POOTER_FLY_SHOOT_COOLDOWN + Math.random() * 0.7;
    } else if (this.shootTimer <= 0) {
      this.shootTimer = 0.4;
    }

    return { bloodTears };
  }

  draw(ctx, layout) {
    if (!this.alive) return;
    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y - 2;

    ctx.save();
    drawFlyBall(ctx, sx, sy, this.wingPhase, {
      fill: "#7a5230",
      stroke: "#4a3018",
      radius: 9,
      wingTint: "rgba(230, 210, 180, 0.5)",
      eyes: "#f5f5f5",
    });
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
    case "fly":
      return new Fly(x, y);
    case "attack_fly":
      return new AttackFly(x, y);
    case "pooter_fly":
      return new PooterFly(x, y);
    case "corn_fly":
      return new PooterFly(x, y);
    default:
      return new Gaper(x, y);
  }
}

export function hasAliveEnemies(enemies = []) {
  return enemies.some((e) => e.alive);
}

export function checkEnemyContact(player, enemies) {
  const chest = player.chestPosition?.() ?? { x: player.x, y: player.y };
  const pr = player.bodyRadius ?? player.radius;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    if (enemy.harmless) continue;
    if (Math.hypot(chest.x - enemy.x, chest.y - enemy.y) < pr + enemy.radius) {
      return enemy;
    }
  }
  return null;
}

export function damageEnemiesInExplosion(enemies, cx, cy, radiusX, radiusY, damage) {
  const kills = [];
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dx = (enemy.x - cx) / radiusX;
    const dy = (enemy.y - cy) / radiusY;
    if (dx * dx + dy * dy <= 1) {
      const wasAlive = enemy.alive;
      enemy.takeDamage(damage);
      if (wasAlive && !enemy.alive) {
        kills.push({ x: enemy.x, y: enemy.y });
      }
    }
  }
  return kills;
}

export function findEnemyHit(cx, cy, radius, enemies) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const hitRadius = enemy.hitRadius ?? enemy.radius;
    const hitY = enemy.y + (enemy.hitYOffset ?? 0);
    const stretch = enemy.hitHeightStretch ?? 1;
    const dx = cx - enemy.x;
    const dy = (cy - hitY) / stretch;
    if (Math.hypot(dx, dy) < radius + hitRadius) {
      return enemy;
    }
  }
  return null;
}

export function applyEnemyPushPhysics(enemies, room, pushables, dt) {
  const live = enemies.filter((e) => e.alive);
  const all = [...live, ...pushables];
  for (const enemy of live) {
    resolveCircleCollisions(enemy, all, 0.5);
    moveCircle(enemy, dt, room, all, Math.exp(-9 * dt));
  }
}

export { ENEMY_CONTACT_DAMAGE };
