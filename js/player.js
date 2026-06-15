import { circleHitsRoom } from "./roomSpace.js";
import { getBodyVector, getHeadVector } from "./input.js";
import { spawnTear } from "./tear.js";

const DEFAULT_BODY = { x: 0, y: 1 };
const DEFAULT_HEAD = { x: 0, y: -1 };

export class AIsaac {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.speed = 195;
    this.bodyDir = { ...DEFAULT_BODY };
    this.headDir = { ...DEFAULT_HEAD };
    this.shootCooldown = 0;
    this.shootRate = 0.32;
  }

  update(dt, keys, room) {
    const bodyVector = getBodyVector(keys);
    if (bodyVector) {
      this.bodyDir = bodyVector;
      const nextX = this.x + bodyVector.x * this.speed * dt;
      const nextY = this.y + bodyVector.y * this.speed * dt;

      if (!circleHitsRoom(nextX, this.y, this.radius, room)) this.x = nextX;
      if (!circleHitsRoom(this.x, nextY, this.radius, room)) this.y = nextY;
    }

    const headVector = getHeadVector(keys);
    if (headVector) {
      this.headDir = headVector;
    }

    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    return headVector ? this.tryShoot() : null;
  }

  tryShoot() {
    if (this.shootCooldown > 0) return null;
    this.shootCooldown = this.shootRate;
    return spawnTear(this, this.headDir);
  }

  draw(ctx, layout) {
    const screenX = layout.floorX + this.x;
    const screenY = layout.floorY + this.y;
    const bodyAngle = Math.atan2(this.bodyDir.y, this.bodyDir.x) + Math.PI / 2;
    const headAngle = Math.atan2(this.headDir.y, this.headDir.x);

    ctx.save();
    ctx.translate(screenX, screenY);

    ctx.rotate(bodyAngle);
    ctx.fillStyle = "#d4a574";
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8b6914";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.rotate(-bodyAngle);
    ctx.fillStyle = "#f5deb3";
    ctx.beginPath();
    ctx.arc(
      Math.cos(headAngle) * 4,
      Math.sin(headAngle) * 4,
      9,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#222";
    const eyeOffset = 3.5;
    const eyeX = Math.cos(headAngle) * 7;
    const eyeY = Math.sin(headAngle) * 7;
    const sideX = Math.cos(headAngle + Math.PI / 2) * eyeOffset;
    const sideY = Math.sin(headAngle + Math.PI / 2) * eyeOffset;
    ctx.beginPath();
    ctx.arc(eyeX + sideX, eyeY + sideY, 2, 0, Math.PI * 2);
    ctx.arc(eyeX - sideX, eyeY - sideY, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
