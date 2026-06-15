import { circleHitsRoom } from "./roomSpace.js";
import { getBodyVector, getHeadVector } from "./input.js";
import { spawnTear } from "./tear.js";
import { createPlayerStats } from "./stats.js";
import { damage } from "./stats.js";
import { INVINCIBILITY_DURATION, BODY_RADIUS, HEAD_RADIUS } from "./constants.js";

const DEFAULT_BODY = { x: 0, y: 1 };
const DEFAULT_HEAD = { x: 0, y: -1 };

export { BODY_RADIUS, HEAD_RADIUS };

export class AIsaac {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.bodyRadius = BODY_RADIUS;
    this.radius = BODY_RADIUS;
    this.maxSpeed = 255;
    this.acceleration = 1150;
    this.friction = 9;
    this.bodyDir = { ...DEFAULT_BODY };
    this.headDir = { ...DEFAULT_HEAD };
    this.facing = 1;
    this.walkPhase = 0;
    this.isWalking = false;
    this.shootCooldown = 0;
    this.shootRate = 0.32;
    this.stats = createPlayerStats();
    this.invincibleTime = 0;
    this.deathState = null;
  }

  get isDying() {
    return this.deathState !== null;
  }

  get isDead() {
    return this.deathState?.phase === "done";
  }

  headPosition() {
    const hx = this.headDir.x * 3;
    const hy = -14 + this.headDir.y * 2;
    return { x: this.x + hx * this.facing, y: this.y + hy };
  }

  update(dt, keys, room) {
    if (this.deathState) {
      this.updateDeath(dt);
      return null;
    }

    if (this.invincibleTime > 0) this.invincibleTime -= dt;
    const bodyVector = getBodyVector(keys);

    if (bodyVector) {
      this.bodyDir = bodyVector;
      this.vx += bodyVector.x * this.acceleration * dt;
      this.vy += bodyVector.y * this.acceleration * dt;
      if (Math.abs(bodyVector.x) > 0.05) {
        this.facing = bodyVector.x >= 0 ? 1 : -1;
      }
      this.isWalking = true;
      this.walkPhase += dt * 12;
    } else {
      const damp = Math.exp(-this.friction * dt);
      this.vx *= damp;
      this.vy *= damp;
      if (Math.hypot(this.vx, this.vy) < 8) {
        this.vx = 0;
        this.vy = 0;
        this.isWalking = false;
      }
    }

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }

    this.moveWithCollision(dt, room);

    const headVector = getHeadVector(keys);
    if (headVector) {
      this.headDir = headVector;
    }

    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    return headVector ? this.tryShoot() : null;
  }

  moveWithCollision(dt, room) {
    const steps = 3;
    const stepDt = dt / steps;
    const r = this.bodyRadius;

    for (let i = 0; i < steps; i++) {
      const nextX = this.x + this.vx * stepDt;
      const nextY = this.y + this.vy * stepDt;

      if (!circleHitsRoom(nextX, this.y, r, room)) {
        this.x = nextX;
      } else {
        this.vx = 0;
      }

      if (!circleHitsRoom(this.x, nextY, r, room)) {
        this.y = nextY;
      } else {
        this.vy = 0;
      }
    }
  }

  canTakeDamage() {
    return this.invincibleTime <= 0 && !this.isDying;
  }

  takeDamage(amount) {
    if (!this.canTakeDamage()) return false;
    damage(this.stats, amount);
    this.invincibleTime = INVINCIBILITY_DURATION;
    return true;
  }

  startDeath() {
    if (this.deathState) return;
    this.deathState = { time: 0, duration: 1.55, phase: "falling" };
    this.vx = 0;
    this.vy = 0;
    this.isWalking = false;
  }

  updateDeath(dt) {
    if (!this.deathState) return;
    this.deathState.time += dt;
    if (this.deathState.time >= this.deathState.duration) {
      this.deathState.phase = "done";
    }
  }

  resetAt(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.stats = createPlayerStats();
    this.invincibleTime = 0;
    this.deathState = null;
    this.bodyDir = { ...DEFAULT_BODY };
    this.headDir = { ...DEFAULT_HEAD };
    this.facing = 1;
    this.shootCooldown = 0;
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.isDying) return null;
    this.shootCooldown = this.shootRate;
    const head = this.headPosition();
    return spawnTear(this, this.headDir, head);
  }

  draw(ctx, layout, screenOverride = null) {
    const screenX = screenOverride ? screenOverride.x : layout.floorX + this.x;
    const screenY = screenOverride ? screenOverride.y : layout.floorY + this.y;

    if (this.deathState) {
      this.drawDeath(ctx, screenX, screenY);
      return;
    }

    const bob = this.isWalking ? Math.sin(this.walkPhase) * 1.5 : 0;
    const legSwing = this.isWalking ? Math.sin(this.walkPhase) * 6 : 0;
    const scale = 1.2;

    ctx.save();
    ctx.translate(screenX, screenY + bob);
    ctx.scale(this.facing * scale, scale);

    if (this.invincibleTime > 0 && Math.floor(this.invincibleTime * 14) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    this.drawLeg(ctx, -4, 8 + legSwing);
    this.drawLeg(ctx, 4, 8 - legSwing);
    this.drawBody(ctx);
    this.drawHead(ctx);

    ctx.restore();
  }

  drawDeath(ctx, screenX, screenY) {
    const t = this.deathState.time;
    const dur = this.deathState.duration;
    const p = Math.min(1, t / dur);
    const fall = Math.min(1, p / 0.55);
    const slump = Math.max(0, Math.min(1, (p - 0.35) / 0.35));
    const scale = 1.2;

    ctx.save();
    ctx.translate(screenX, screenY + slump * 18 + fall * 6);
    ctx.rotate(fall * Math.PI * 0.48 * this.facing);
    ctx.scale(this.facing * scale, scale);

    ctx.globalAlpha = 1 - Math.max(0, (p - 0.85) / 0.15) * 0.25;

    this.drawLeg(ctx, -4, 8, true);
    this.drawLeg(ctx, 4, 8, true);
    this.drawBody(ctx);
    this.drawHead(ctx, true);

    if (p > 0.45) {
      ctx.strokeStyle = "#3a2020";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -18);
      ctx.lineTo(4, -10);
      ctx.moveTo(4, -18);
      ctx.lineTo(-4, -10);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawLeg(ctx, x, y, flat = false) {
    ctx.fillStyle = "#c9956a";
    ctx.strokeStyle = "#8b6914";
    ctx.lineWidth = 1.5;
    const h = flat ? 9 : 10;
    ctx.fillRect(x - 3, y, 6, h);
    ctx.strokeRect(x - 3, y, 6, h);
  }

  drawBody(ctx) {
    ctx.fillStyle = "#87b8d8";
    ctx.strokeStyle = "#4a7898";
    ctx.lineWidth = 1.8;
    ctx.fillRect(-9, 0, 18, 14);
    ctx.strokeRect(-9, 0, 18, 14);

    ctx.fillStyle = "#e8c49a";
    ctx.fillRect(-5, 14, 10, 4);
    ctx.strokeStyle = "#9a7348";
    ctx.strokeRect(-5, 14, 10, 4);
  }

  drawHead(ctx, dead = false) {
    const hx = this.headDir.x * 2;
    const hy = -12 + this.headDir.y * 1.5;

    ctx.fillStyle = "#2a1810";
    ctx.beginPath();
    ctx.ellipse(hx, hy - 10, 10, 6, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    if (this.headDir.y === 1 && !dead) {
      this.drawHeadBack(ctx, hx, hy);
      return;
    }

    ctx.fillStyle = "#f0d8b0";
    ctx.strokeStyle = "#9a7348";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(hx, hy, HEAD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (!dead) this.drawFace(ctx, hx, hy);
  }

  drawHeadBack(ctx, hx, hy) {
    ctx.fillStyle = "#2a1810";
    ctx.beginPath();
    ctx.ellipse(hx, hy - 8, 10, 7, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0d8b0";
    ctx.beginPath();
    ctx.arc(hx, hy, HEAD_RADIUS, Math.PI * 0.15, Math.PI * 0.85);
    ctx.lineTo(hx, hy + 4);
    ctx.closePath();
    ctx.fill();
  }

  drawFace(ctx, hx, hy) {
    if (this.headDir.y === -1) {
      this.drawFaceFront(ctx, hx, hy);
      return;
    }
    const side = this.headDir.x > 0 ? 1 : -1;
    this.drawFaceSide(ctx, hx, hy, side);
  }

  drawFaceFront(ctx, hx, hy) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(hx - 4, hy - 1, 3.5, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(hx + 4, hy - 1, 3.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(hx - 4, hy, 1.8, 0, Math.PI * 2);
    ctx.arc(hx + 4, hy, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#6a5050";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hx - 3, hy + 5);
    ctx.quadraticCurveTo(hx, hy + 3, hx + 3, hy + 5);
    ctx.stroke();
  }

  drawFaceSide(ctx, hx, hy, side) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(hx + side * 4, hy - 1, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(hx + side * 4, hy, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}
