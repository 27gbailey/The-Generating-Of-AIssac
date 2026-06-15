import {
  BOMB_FUSE,
  BOMB_MAX_PER_ROOM,
  BOMB_RADIUS,
} from "./constants.js";
import { circleHitsRoom, circleHitsRoomExcluding } from "./roomSpace.js";
import { resolveCircleCollisions } from "./pushablePhysics.js";

export class Bomb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = BOMB_RADIUS;
    this.fuse = BOMB_FUSE;
    this.alive = true;
  }

  update(dt, room, player, otherBombs, pushables = []) {
    if (!this.alive) return null;

    this.fuse -= dt;
    if (this.fuse <= 0) {
      this.alive = false;
      return { x: this.x, y: this.y };
    }

    this.applyPlayerPush(player);
    this.resolveBombCollisions(otherBombs);
    resolveCircleCollisions(this, pushables, 0.5);

    const friction = Math.exp(-4.5 * dt);
    this.vx *= friction;
    this.vy *= friction;

    this.moveWithCollision(dt, room, otherBombs, pushables);
    return null;
  }

  applyPlayerPush(player) {
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const dist = Math.hypot(dx, dy);
    const minDist = this.radius + player.radius;
    if (dist >= minDist || dist === 0) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    this.x += nx * overlap * 0.55;
    this.y += ny * overlap * 0.55;

    const playerSpeed = Math.hypot(player.vx, player.vy);
    if (playerSpeed > 25) {
      this.vx += nx * playerSpeed * 0.38;
      this.vy += ny * playerSpeed * 0.38;
    }
  }

  resolveBombCollisions(otherBombs) {
    for (const other of otherBombs) {
      if (other === this || !other.alive) continue;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.hypot(dx, dy);
      const minDist = this.radius + other.radius;
      if (dist >= minDist || dist === 0) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      this.x += nx * overlap * 0.5;
      this.y += ny * overlap * 0.5;
      other.x -= nx * overlap * 0.5;
      other.y -= ny * overlap * 0.5;

      const avgVx = (this.vx + other.vx) * 0.15;
      const avgVy = (this.vy + other.vy) * 0.15;
      this.vx += nx * avgVx;
      this.vy += ny * avgVy;
      other.vx -= nx * avgVx;
      other.vy -= ny * avgVy;
    }
  }

  moveWithCollision(dt, room, otherBombs, pushables = []) {
    const steps = 2;
    const stepDt = dt / steps;

    for (let i = 0; i < steps; i++) {
      const nextX = this.x + this.vx * stepDt;
      if (!this.hitsSolid(nextX, this.y, room, otherBombs, pushables)) {
        this.x = nextX;
      } else {
        this.vx *= -0.25;
      }

      const nextY = this.y + this.vy * stepDt;
      if (!this.hitsSolid(this.x, nextY, room, otherBombs, pushables)) {
        this.y = nextY;
      } else {
        this.vy *= -0.25;
      }
    }
  }

  hitsSolid(x, y, room, otherBombs, pushables = []) {
    if (circleHitsRoom(x, y, this.radius, room)) return true;
    for (const other of otherBombs) {
      if (other === this || !other.alive) continue;
      if (Math.hypot(x - other.x, y - other.y) < this.radius + other.radius - 2) {
        return true;
      }
    }
    for (const entity of pushables) {
      if (entity === this || entity.dead || entity.alive === false) continue;
      if (Math.hypot(x - entity.x, y - entity.y) < this.radius + entity.radius - 2) {
        return true;
      }
    }
    return false;
  }

  draw(ctx, layout) {
    if (!this.alive) return;

    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y;
    const pulse = 1 + Math.sin((BOMB_FUSE - this.fuse) * 14) * 0.04;
    const r = this.radius * pulse;
    const fuseT = Math.max(0, this.fuse / BOMB_FUSE);

    ctx.save();
    ctx.fillStyle = "#2a2218";
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fuseT < 0.35 ? "#c44" : "#555";
    ctx.beginPath();
    ctx.arc(sx, sy - r * 0.55, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = fuseT < 0.35 ? "#f88" : "#888";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 0.2);
    ctx.lineTo(sx + 3, sy - r * 0.85);
    ctx.stroke();

    if (fuseT < 0.35) {
      ctx.fillStyle = `rgba(255, 80, 40, ${0.35 + Math.sin(this.fuse * 24) * 0.2})`;
      ctx.beginPath();
      ctx.arc(sx + 3, sy - r * 0.9, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function bombPlacementCandidates(player) {
  const points = [{ x: player.x, y: player.y }];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    for (const dist of [5, 10, 16]) {
      points.push({
        x: player.x + Math.cos(angle) * dist,
        y: player.y + Math.sin(angle) * dist,
      });
    }
  }
  return points;
}

function canPlaceBombAt(x, y, room, bombs, player) {
  const checkR = BOMB_RADIUS - 2;
  if (
    circleHitsRoom(x, y, checkR, room) &&
    circleHitsRoomExcluding(x, y, checkR, room, player.x, player.y, player.radius + 1)
  ) {
    return false;
  }

  for (const bomb of bombs) {
    if (!bomb.alive) continue;
    if (Math.hypot(x - bomb.x, y - bomb.y) < BOMB_RADIUS * 1.75) return false;
  }

  return true;
}

export function tryPlaceBomb(player, room, bombs) {
  const live = bombs.filter((b) => b.alive);
  if (live.length >= BOMB_MAX_PER_ROOM) return null;
  if (!player.stats || player.stats.bombs <= 0) return null;

  for (const point of bombPlacementCandidates(player)) {
    if (canPlaceBombAt(point.x, point.y, room, live, player)) {
      player.stats.bombs -= 1;
      return new Bomb(point.x, point.y);
    }
  }

  return null;
}
