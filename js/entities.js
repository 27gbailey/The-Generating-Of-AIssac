import { circleHitsSolid } from "./terrain.js";

const CARDINALS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export class Bullet {
  constructor(x, y, vx, vy, fromPlayer) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.fromPlayer = fromPlayer;
    this.radius = 4;
    this.dead = false;
    this.life = 2.5;
  }

  update(dt, map) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (circleHitsSolid(map, this.x, this.y, this.radius)) {
      this.dead = true;
    }
  }

  draw(ctx, camera) {
    ctx.fillStyle = this.fromPlayer ? "#ffeb3b" : "#ef5350";
    ctx.shadowColor = this.fromPlayer ? "#ffeb3b" : "#ef5350";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.speed = 180;
    this.health = 100;
    this.maxHealth = 100;
    this.shootCooldown = 0;
    this.shootRate = 0.18;
    this.invuln = 0;
  }

  update(dt, input, map) {
    let dx = 0;
    let dy = 0;
    if (input.keys.has("w") || input.keys.has("arrowup")) dy -= 1;
    if (input.keys.has("s") || input.keys.has("arrowdown")) dy += 1;
    if (input.keys.has("a") || input.keys.has("arrowleft")) dx -= 1;
    if (input.keys.has("d") || input.keys.has("arrowright")) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const len = Math.SQRT2;
      dx /= len;
      dy /= len;
    }

    const nx = this.x + dx * this.speed * dt;
    const ny = this.y + dy * this.speed * dt;

    if (!circleHitsSolid(map, nx, this.y, this.radius)) this.x = nx;
    if (!circleHitsSolid(map, this.x, ny, this.radius)) this.y = ny;

    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.invuln > 0) this.invuln -= dt;
  }

  tryShoot(input, camera) {
    if (this.shootCooldown > 0) return null;
    if (!input.shootHeld) return null;

    const mx = input.mouse.x + camera.x;
    const my = input.mouse.y + camera.y;
    const dx = mx - this.x;
    const dy = my - this.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return null;

    this.shootCooldown = this.shootRate;
    const speed = 420;
    return new Bullet(
      this.x + (dx / len) * (this.radius + 4),
      this.y + (dy / len) * (this.radius + 4),
      (dx / len) * speed,
      (dy / len) * speed,
      true
    );
  }

  takeDamage(amount) {
    if (this.invuln > 0) return;
    this.health -= amount;
    this.invuln = 0.6;
  }

  draw(ctx, camera) {
    const px = this.x - camera.x;
    const py = this.y - camera.y;

    if (this.invuln > 0 && Math.floor(this.invuln * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    ctx.fillStyle = "#1565c0";
    ctx.beginPath();
    ctx.arc(px, py, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#42a5f5";
    ctx.beginPath();
    ctx.arc(px, py - 2, this.radius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#0d47a1";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.globalAlpha = 1;
  }
}

export class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.speed = 55;
    this.health = 30;
    this.dead = false;
    this.shootTimer = 1.5 + Math.random() * 2;
    this.shootRate = 2.2 + Math.random() * 1.5;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderTimer = 0;
  }

  update(dt, map, player) {
    if (this.dead) return;

    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 1 + Math.random() * 2;
      this.wanderAngle = Math.atan2(player.y - this.y, player.x - this.x) + (Math.random() - 0.5);
    }

    const dx = Math.cos(this.wanderAngle);
    const dy = Math.sin(this.wanderAngle);
    const nx = this.x + dx * this.speed * dt;
    const ny = this.y + dy * this.speed * dt;

    if (!circleHitsSolid(map, nx, this.y, this.radius)) this.x = nx;
    if (!circleHitsSolid(map, this.x, ny, this.radius)) this.y = ny;

    this.shootTimer -= dt;
  }

  tryShoot() {
    if (this.dead || this.shootTimer > 0) return [];

    this.shootTimer = this.shootRate;
    const bullets = [];
    const speed = 200;

    for (const dir of CARDINALS) {
      bullets.push(
        new Bullet(
          this.x + dir.x * (this.radius + 6),
          this.y + dir.y * (this.radius + 6),
          dir.x * speed,
          dir.y * speed,
          false
        )
      );
    }

    return bullets;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) this.dead = true;
  }

  draw(ctx, camera) {
    if (this.dead) return;
    const px = this.x - camera.x;
    const py = this.y - camera.y;

    ctx.fillStyle = "#6a1b9a";
    ctx.beginPath();
    ctx.arc(px, py, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ab47bc";
    ctx.beginPath();
    ctx.moveTo(px, py - this.radius);
    ctx.lineTo(px + this.radius * 0.7, py + this.radius * 0.5);
    ctx.lineTo(px - this.radius * 0.7, py + this.radius * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#4a148c";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export function spawnEnemies(map, count, playerX, playerY) {
  const enemies = [];
  let attempts = 0;

  while (enemies.length < count && attempts < count * 40) {
    attempts++;
    const tx = 2 + Math.floor(Math.random() * (map.width - 4));
    const ty = 2 + Math.floor(Math.random() * (map.height - 4));
    if (map.solid[ty * map.width + tx]) continue;

    const x = tx * map.tileSize + map.tileSize / 2;
    const y = ty * map.tileSize + map.tileSize / 2;
    const dist = Math.hypot(x - playerX, y - playerY);
    if (dist < 200 || dist > 900) continue;

    enemies.push(new Enemy(x, y));
  }

  return enemies;
}
