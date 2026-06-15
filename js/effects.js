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
