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

export class BloodTearBurst {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.life = 0.4;
    this.maxLife = 0.4;
    this.particles = [];

    for (let i = 0; i < 9; i++) {
      const angle = (Math.PI * 2 * i) / 9 + Math.random() * 0.5;
      const speed = 60 + Math.random() * 90;
      this.particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2.5 + Math.random() * 3.5,
      });
    }
  }

  update(dt) {
    this.life -= dt;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.9;
      p.vy *= 0.9;
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
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = "#aa2020";
      ctx.beginPath();
      ctx.arc(baseX + p.x, baseY + p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#cc3030";
    ctx.beginPath();
    ctx.arc(baseX, baseY, 5 * alpha + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  get dead() {
    return this.life <= 0;
  }
}

export class BombExplosion {
  constructor(x, y, radiusX, radiusY) {
    this.x = x;
    this.y = y;
    this.radiusX = radiusX;
    this.radiusY = radiusY;
    this.life = 0.42;
    this.maxLife = 0.42;
    this.particles = [];

    for (let i = 0; i < 22; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15;
      const speed = 110 + Math.random() * 190;
      this.particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 10,
      });
    }
  }

  update(dt) {
    this.life -= dt;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 220 * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.size *= 0.96;
    }
  }

  draw(ctx, layout) {
    if (this.life <= 0) return;

    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y;
    const t = 1 - this.life / this.maxLife;
    const alpha = (1 - t) * 0.8;
    const rx = this.radiusX * (0.4 + t * 1.05);
    const ry = this.radiusY * (0.3 + t * 0.95);

    ctx.save();

    const grad = ctx.createRadialGradient(sx, sy + ry * 0.15, 0, sx, sy, rx);
    grad.addColorStop(0, `rgba(255, 230, 140, ${alpha * 0.9})`);
    grad.addColorStop(0.35, `rgba(255, 130, 45, ${alpha * 0.55})`);
    grad.addColorStop(0.7, `rgba(180, 50, 15, ${alpha * 0.2})`);
    grad.addColorStop(1, "rgba(60, 20, 5, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      ctx.fillStyle = `rgba(255, ${160 + Math.floor(Math.random() * 60)}, 60, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.ellipse(sx + p.x, sy + p.y, p.size, p.size * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  get dead() {
    return this.life <= 0;
  }
}

export class BossDeathBurst {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.life = 1.1;
    this.maxLife = 1.1;
    this.particles = [];

    for (let i = 0; i < 48; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 280;
      this.particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 8,
        kind: Math.random() < 0.55 ? "blood" : "chunk",
      });
    }
  }

  update(dt) {
    this.life -= dt;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.radius *= 0.985;
    }
  }

  draw(ctx, layout) {
    if (this.life <= 0) return;

    const baseX = layout.floorX + this.x;
    const baseY = layout.floorY + this.y;
    const alpha = Math.min(1, this.life / this.maxLife);

    ctx.save();
    const flash = ctx.createRadialGradient(baseX, baseY, 0, baseX, baseY, 120 * (1 - alpha) + 40);
    flash.addColorStop(0, `rgba(255, 120, 80, ${alpha * 0.5})`);
    flash.addColorStop(0.4, `rgba(180, 30, 20, ${alpha * 0.25})`);
    flash.addColorStop(1, "rgba(60, 10, 5, 0)");
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(baseX, baseY, 130, 0, Math.PI * 2);
    ctx.fill();

    for (const p of this.particles) {
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = p.kind === "blood" ? "#aa1818" : "#6a2020";
      ctx.beginPath();
      ctx.arc(baseX + p.x, baseY + p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#cc2020";
    ctx.beginPath();
    ctx.arc(baseX, baseY, 18 * alpha + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  get dead() {
    return this.life <= 0;
  }
}
