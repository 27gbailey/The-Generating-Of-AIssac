import { circleHitsRoom } from "./roomSpace.js";
import { getBodyVector, getHeadVector } from "./input.js";
import { spawnTear } from "./tear.js";
import { createPlayerStats } from "./stats.js";

import { damage } from "./stats.js";
import { INVINCIBILITY_DURATION } from "./constants.js";

const DEFAULT_BODY = { x: 0, y: 1 };
const DEFAULT_HEAD = { x: 0, y: -1 };

export class AIsaac {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 20;
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
  }

  update(dt, keys, room) {
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

    for (let i = 0; i < steps; i++) {
      const nextX = this.x + this.vx * stepDt;
      const nextY = this.y + this.vy * stepDt;

      if (!circleHitsRoom(nextX, this.y, this.radius, room)) {
        this.x = nextX;
      } else {
        this.vx = 0;
      }

      if (!circleHitsRoom(this.x, nextY, this.radius, room)) {
        this.y = nextY;
      } else {
        this.vy = 0;
      }
    }
  }

  canTakeDamage() {
    return this.invincibleTime <= 0;
  }

  takeDamage(amount) {
    if (!this.canTakeDamage()) return false;
    damage(this.stats, amount);
    this.invincibleTime = INVINCIBILITY_DURATION;
    return true;
  }

  tryShoot() {
    if (this.shootCooldown > 0) return null;
    this.shootCooldown = this.shootRate;
    return spawnTear(this, this.headDir);
  }

  draw(ctx, layout, screenOverride = null) {
    const screenX = screenOverride ? screenOverride.x : layout.floorX + this.x;
    const screenY = screenOverride ? screenOverride.y : layout.floorY + this.y;
    const bob = this.isWalking ? Math.sin(this.walkPhase) * 2 : 0;
    const legSwing = this.isWalking ? Math.sin(this.walkPhase) * 7 : 0;
    const scale = 1.35;

    ctx.save();
    ctx.translate(screenX, screenY + bob);
    ctx.scale(this.facing * scale, scale);

    if (this.invincibleTime > 0 && Math.floor(this.invincibleTime * 14) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    this.drawLeg(ctx, -5, 10 + legSwing);
    this.drawLeg(ctx, 5, 10 - legSwing);
    this.drawBody(ctx);
    this.drawHead(ctx);

    ctx.restore();
  }

  drawLeg(ctx, x, y) {
    ctx.fillStyle = "#c9956a";
    ctx.strokeStyle = "#8b6914";
    ctx.lineWidth = 1.5;
    ctx.fillRect(x - 3.5, y, 7, 11);
    ctx.strokeRect(x - 3.5, y, 7, 11);
  }

  drawBody(ctx) {
    ctx.fillStyle = "#e8c49a";
    ctx.strokeStyle = "#9a7348";
    ctx.lineWidth = 2;
    ctx.fillRect(-10, 2, 20, 16);
    ctx.strokeRect(-10, 2, 20, 16);
  }

  drawHead(ctx) {
    const hx = this.headOffsetX();
    const hy = -8 + this.headOffsetY();

    if (this.headDir.y === 1) {
      this.drawHeadBack(ctx, hx, hy);
      return;
    }

    ctx.fillStyle = "#f5deb3";
    ctx.strokeStyle = "#8b6914";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, hy, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    this.drawFace(ctx, hx, hy);
  }

  drawHeadBack(ctx, hx, hy) {
    ctx.fillStyle = "#6b4a2e";
    ctx.strokeStyle = "#4a3018";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, hy, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#4a3018";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hx - 8, hy - 4);
    ctx.quadraticCurveTo(hx, hy - 10, hx + 8, hy - 4);
    ctx.stroke();
  }

  headOffsetX() {
    if (this.headDir.x !== 0) return this.headDir.x * 3;
    return 0;
  }

  headOffsetY() {
    if (this.headDir.y !== 0) return this.headDir.y * 2;
    return 0;
  }

  drawFace(ctx, hx, hy) {
    if (this.headDir.y === -1) {
      this.drawSadFaceFront(ctx, hx, hy);
      return;
    }

    const side = this.headDir.x > 0 ? 1 : -1;
    this.drawSadFaceSide(ctx, hx, hy, side);
  }

  drawSadFaceFront(ctx, hx, hy) {
    ctx.strokeStyle = "#3a2a22";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(hx - 8, hy - 5);
    ctx.lineTo(hx - 4, hy - 3);
    ctx.moveTo(hx + 8, hy - 5);
    ctx.lineTo(hx + 4, hy - 3);
    ctx.stroke();

    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(hx - 5, hy - 1, 2.2, 0, Math.PI * 2);
    ctx.arc(hx + 5, hy - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#5a4040";
    ctx.beginPath();
    ctx.moveTo(hx - 4, hy + 6);
    ctx.quadraticCurveTo(hx, hy + 3, hx + 4, hy + 6);
    ctx.stroke();
  }

  drawSadFaceSide(ctx, hx, hy, side) {
    ctx.strokeStyle = "#3a2a22";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(hx + side * 2, hy - 6);
    ctx.lineTo(hx + side * 6, hy - 4);
    ctx.stroke();

    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(hx + side * 5, hy - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#5a4040";
    ctx.beginPath();
    ctx.moveTo(hx + side * 2, hy + 5);
    ctx.quadraticCurveTo(hx + side * 5, hy + 2, hx + side * 8, hy + 5);
    ctx.stroke();
  }
}
