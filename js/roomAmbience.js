import { ROOM_HEIGHT, ROOM_WIDTH, TILE_SIZE } from "./constants.js";

function hash(x, y, seed) {
  return ((x * 374761393) ^ (y * 668265263) ^ seed) >>> 0;
}

export function createRoomAmbience(gx, gy, dungeonSeed) {
  const seed = hash(gx, gy, dungeonSeed);
  const dust = [];
  const lights = [];
  const rays = [];

  for (let i = 0; i < 12; i++) {
    const h = hash(i, seed, 91);
    const angle = ((h % 628) / 100);
    dust.push({
      x: (h % 1000) / 1000,
      y: ((h >> 10) % 1000) / 1000,
      size: 0.8 + (h % 2) * 0.4,
      vx: Math.cos(angle) * (4 + (h % 6)),
      vy: Math.sin(angle) * (4 + (h % 6)),
      wander: ((h >> 4) % 100) / 100,
      twinkle: ((h >> 6) % 100) / 100,
    });
  }

  for (let i = 0; i < 5; i++) {
    const h = hash(i + 40, seed, 77);
    lights.push({
      x: 0.1 + ((h % 800) / 1000) * 0.8,
      y: 0.05 + ((h >> 8) % 600) / 1000,
      w: 0.14 + (h % 90) / 350,
      h: 0.2 + ((h >> 5) % 100) / 280,
      alpha: 0.08 + (h % 30) / 300,
      pulse: ((h >> 3) % 100) / 100,
    });
  }

  for (let i = 0; i < 3; i++) {
    const h = hash(i + 60, seed, 53);
    rays.push({
      x: 0.15 + ((h % 700) / 1000) * 0.7,
      angle: -0.35 + ((h >> 6) % 100) / 200,
      width: 0.06 + (h % 40) / 400,
      length: 0.55 + ((h >> 4) % 100) / 200,
      alpha: 0.06 + (h % 25) / 350,
      pulse: ((h >> 2) % 100) / 100,
    });
  }

  return { dust, lights, rays, time: 0, seed };
}

export function updateRoomAmbience(ambience, dt) {
  ambience.time += dt;
  for (const speck of ambience.dust) {
    speck.x += speck.vx * dt * 0.012;
    speck.y += speck.vy * dt * 0.012;
    speck.vx += Math.sin(ambience.time * 0.4 + speck.wander * 8) * dt * 1.8;
    speck.vy += Math.cos(ambience.time * 0.35 + speck.wander * 10) * dt * 1.8;

    const speed = Math.hypot(speck.vx, speck.vy);
    if (speed > 10) {
      speck.vx = (speck.vx / speed) * 10;
      speck.vy = (speck.vy / speed) * 10;
    }

    if (speck.x < 0.02) speck.x = 0.98;
    if (speck.x > 0.98) speck.x = 0.02;
    if (speck.y < 0.02) speck.y = 0.98;
    if (speck.y > 0.98) speck.y = 0.02;
  }
}

function drawLightRay(ctx, ray, ambience, floorX, floorY, floorW, floorH) {
  const pulse = 0.8 + Math.sin(ambience.time * 0.45 + ray.pulse * Math.PI * 2) * 0.2;
  const originX = floorX + ray.x * floorW;
  const originY = floorY - 8;
  const len = ray.length * floorH * pulse;
  const halfW = ray.width * floorW * 0.5;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.rotate(ray.angle);

  const grad = ctx.createLinearGradient(0, 0, 0, len);
  grad.addColorStop(0, `rgba(255, 248, 210, ${ray.alpha * pulse + 0.04})`);
  grad.addColorStop(0.35, `rgba(255, 230, 160, ${ray.alpha * pulse * 0.6})`);
  grad.addColorStop(1, "rgba(255, 220, 140, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-halfW, 0);
  ctx.lineTo(halfW, 0);
  ctx.lineTo(halfW * 0.35, len);
  ctx.lineTo(-halfW * 0.35, len);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawRoomAmbience(ctx, ambience, floorX, floorY, floorW, floorH) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(floorX, floorY, floorW, floorH);
  ctx.clip();

  const vignette = ctx.createRadialGradient(
    floorX + floorW / 2,
    floorY + floorH / 2,
    floorW * 0.15,
    floorX + floorW / 2,
    floorY + floorH / 2,
    floorW * 0.72
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.65, "rgba(0, 0, 0, 0.06)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.22)");
  ctx.fillStyle = vignette;
  ctx.fillRect(floorX, floorY, floorW, floorH);

  ctx.globalCompositeOperation = "screen";

  for (const ray of ambience.rays) {
    drawLightRay(ctx, ray, ambience, floorX, floorY, floorW, floorH);
  }

  for (const light of ambience.lights) {
    const pulse = 0.85 + Math.sin(ambience.time * 0.6 + light.pulse * Math.PI * 2) * 0.15;
    const lx = floorX + light.x * floorW;
    const ly = floorY + light.y * floorH;
    const lw = light.w * floorW;
    const lh = light.h * floorH;
    const alpha = light.alpha * pulse;
    const grad = ctx.createRadialGradient(
      lx + lw / 2,
      ly + lh * 0.35,
      0,
      lx + lw / 2,
      ly + lh * 0.65,
      Math.max(lw, lh) * 0.85
    );
    grad.addColorStop(0, `rgba(255, 244, 200, ${alpha + 0.06})`);
    grad.addColorStop(0.55, `rgba(255, 230, 160, ${alpha * 0.5})`);
    grad.addColorStop(1, "rgba(255, 220, 140, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(lx - lw * 0.15, ly - lh * 0.1, lw * 1.3, lh * 1.2);
  }

  ctx.globalCompositeOperation = "source-over";

  for (const speck of ambience.dust) {
    const twinkle = 0.75 + Math.sin(ambience.time * 1.4 + speck.twinkle * 12) * 0.25;
    const alpha = 0.05 * twinkle;
    const px = floorX + speck.x * floorW;
    const py = floorY + speck.y * floorH;
    ctx.fillStyle = `rgba(230, 220, 200, ${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, speck.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
