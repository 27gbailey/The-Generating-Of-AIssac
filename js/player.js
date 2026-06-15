import { circleHitsRoom } from "./roomSpace.js";
import { getBodyVector, getHeadVector } from "./input.js";
import { spawnTear } from "./tear.js";

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
  }

  update(dt, keys, room) {
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

  tryShoot() {
    if (this.shootCooldown > 0) return null;
    this.shootCooldown = this.shootRate;
    return spawnTear(this, this.headDir);
  }

  draw(ctx, layout) {
    const screenX = layout.floorX + this.x;
    const screenY = layout.floorY + this.y;
    const bob = this.isWalking ? Math.sin(this.walkPhase) * 2 : 0;
    const legSwing = this.isWalking ? Math.sin(this.walkPhase) * 7 : 0;
    const scale = 1.35;

    ctx.save();
    ctx.translate(screenX, screenY + bob);
    ctx.scale(this.facing * scale, scale);

    this.drawLeg(ctx, -5, 10 + legSwing);
    this.drawLeg(ctx, 5, 10 - legSwing);
    this.drawBody(ctx);
    this.drawHead(ctx);

    ctx.restore();
  }

  drawLeg(ctx, x, y) {
    ctx.fillStyle = "#4a3828";
    ctx.strokeStyle = "#2a2018";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - 3.5, y, 7, 11, 3);
    ctx.fill();
    ctx.stroke();
  }

  drawBody(ctx) {
    ctx.fillStyle = "#7fa8cc";
    ctx.strokeStyle = "#4a6888";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-11, 0, 22, 18, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#6a94b8";
    ctx.beginPath();
    ctx.roundRect(-8, 4, 16, 10, 4);
    ctx.fill();
  }

  drawHead(ctx) {
    const hx = this.headOffsetX();
    const hy = -10 + this.headOffsetY();

    ctx.fillStyle = "#f5deb3";
    ctx.strokeStyle = "#8b6914";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, hy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    this.drawFace(ctx, hx, hy);
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
    ctx.fillStyle = "#222";

    if (this.headDir.y === -1) {
      ctx.beginPath();
      ctx.arc(hx - 4, hy - 1, 2.5, 0, Math.PI * 2);
      ctx.arc(hx + 4, hy - 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c77";
      ctx.beginPath();
      ctx.arc(hx, hy + 4, 2.5, 0, Math.PI);
      ctx.fill();
      return;
    }

    if (this.headDir.y === 1) {
      ctx.fillStyle = "#5a3a1a";
      ctx.beginPath();
      ctx.arc(hx, hy + 2, 7, 0, Math.PI);
      ctx.fill();
      return;
    }

    const eyeX = this.headDir.x > 0 ? 3 : -3;
    ctx.beginPath();
    ctx.arc(hx + eyeX, hy - 1, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hx + eyeX + 1, hy + 3, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
