export class TearBurst {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.life = 0.45;
    this.maxLife = 0.45;
    this.particles = [];

    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 4,
      });
    }
  }

  update(dt) {
    this.life -= dt;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.radius *= 0.96;
    }
  }

  draw(ctx, layout) {
    if (this.life <= 0) return;

    const baseX = layout.floorX + this.x;
    const baseY = layout.floorY + this.y;
    const alpha = this.life / this.maxLife;

    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = "#b8e8ff";
      ctx.shadowColor = "#8ecff5";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(baseX + p.x, baseY + p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#e8f8ff";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(baseX, baseY, 6 * alpha + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  get dead() {
    return this.life <= 0;
  }
}

export class PoopSplatter {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.life = 0.35;
    this.maxLife = 0.35;
    this.particles = [];

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const speed = 40 + Math.random() * 70;
      this.particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
      });
    }
  }

  update(dt) {
    this.life -= dt;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.88;
      p.vy *= 0.88;
      p.radius *= 0.94;
    }
  }

  draw(ctx, layout) {
    if (this.life <= 0) return;

    const baseX = layout.floorX + this.x;
    const baseY = layout.floorY + this.y;
    const alpha = this.life / this.maxLife;

    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillStyle = "#5c4022";
      ctx.beginPath();
      ctx.arc(baseX + p.x, baseY + p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  get dead() {
    return this.life <= 0;
  }
}

export class BombExplosion {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.life = 0.35;
    this.maxLife = 0.35;
  }

  update(dt) {
    this.life -= dt;
  }

  draw(ctx, layout) {
    if (this.life <= 0) return;

    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y;
    const t = 1 - this.life / this.maxLife;
    const r = this.radius * (0.4 + t * 0.85);
    const alpha = (1 - t) * 0.75;

    ctx.save();
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    grad.addColorStop(0, `rgba(255, 220, 120, ${alpha})`);
    grad.addColorStop(0.45, `rgba(255, 120, 40, ${alpha * 0.65})`);
    grad.addColorStop(1, "rgba(80, 30, 10, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  get dead() {
    return this.life <= 0;
  }
}
