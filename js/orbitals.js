import { ENEMY_CONTACT_DAMAGE } from "./constants.js";

const ORBIT_RADIUS = 40;
const ORBIT_SPEED = 5.2;
const FLY_RADIUS = 9;

export class OrbitalFlies {
  constructor(count = 2) {
    this.count = count;
    this.angle = Math.random() * Math.PI * 2;
    this.wingPhase = 0;
  }

  positions(player) {
    const cx = player.x;
    const cy = player.y + 8;
    const spots = [];
    for (let i = 0; i < this.count; i++) {
      const a = this.angle + (Math.PI * 2 * i) / this.count;
      spots.push({
        x: cx + Math.cos(a) * ORBIT_RADIUS,
        y: cy + Math.sin(a) * ORBIT_RADIUS * 0.85,
      });
    }
    return spots;
  }

  update(dt, player, enemies, bloodTears) {
    this.angle += dt * ORBIT_SPEED;
    this.wingPhase += dt * 12;

    const spots = this.positions(player);

    for (const bt of bloodTears) {
      if (bt.state === "dead") continue;
      for (const spot of spots) {
        if (Math.hypot(bt.x - spot.x, bt.y - spot.y) < bt.radius + FLY_RADIUS) {
          bt.state = "dead";
          break;
        }
      }
    }

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.harmless) continue;
      for (const spot of spots) {
        const er = enemy.hitRadius ?? enemy.radius;
        if (Math.hypot(enemy.x - spot.x, enemy.y - spot.y) < er + FLY_RADIUS) {
          enemy.takeDamage(ENEMY_CONTACT_DAMAGE);
        }
      }
    }
  }

  draw(ctx, layout, player) {
    for (const spot of this.positions(player)) {
      const sx = layout.floorX + spot.x;
      const sy = layout.floorY + spot.y;
      const wing = Math.sin(this.wingPhase) * 5;

      ctx.save();
      ctx.fillStyle = "rgba(220, 220, 230, 0.45)";
      ctx.beginPath();
      ctx.ellipse(sx - 8, sy + wing * 0.2, 7, 4, -0.4, 0, Math.PI * 2);
      ctx.ellipse(sx + 8, sy - wing * 0.2, 7, 4, 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1a1a1a";
      ctx.strokeStyle = "#050505";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, FLY_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(sx - 3, sy - 1, 2, 0, Math.PI * 2);
      ctx.arc(sx + 3, sy - 1, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export function countHaloFlies(items = []) {
  return items.filter((id) => id === "halo_of_flies").length * 2;
}

export function createOrbitalFlies(items = []) {
  const count = countHaloFlies(items);
  if (count <= 0) return null;
  return new OrbitalFlies(count);
}
