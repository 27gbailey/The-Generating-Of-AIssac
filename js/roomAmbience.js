import { ROOM_HEIGHT, ROOM_WIDTH, TILE_SIZE } from "./constants.js";

function hash(x, y, seed) {
  return ((x * 374761393) ^ (y * 668265263) ^ seed) >>> 0;
}

export function createRoomAmbience(gx, gy, dungeonSeed) {
  const seed = hash(gx, gy, dungeonSeed);
  const dust = [];
  const lights = [];

  for (let i = 0; i < 28; i++) {
    const h = hash(i, seed, 91);
    dust.push({
      x: (h % 1000) / 1000,
      y: ((h >> 10) % 1000) / 1000,
      size: 1.5 + (h % 4),
      drift: ((h >> 4) % 100) / 100,
      speed: 14 + (h % 18),
      twinkle: ((h >> 6) % 100) / 100,
    });
  }

  for (let i = 0; i < 7; i++) {
    const h = hash(i + 40, seed, 77);
    lights.push({
      x: 0.1 + ((h % 800) / 1000) * 0.8,
      y: 0.05 + ((h >> 8) % 600) / 1000,
      w: 0.14 + (h % 90) / 350,
      h: 0.2 + ((h >> 5) % 100) / 280,
      alpha: 0.1 + (h % 40) / 250,
      pulse: ((h >> 3) % 100) / 100,
    });
  }

  return { dust, lights, time: 0, seed };
}

export function updateRoomAmbience(ambience, dt) {
  ambience.time += dt;
  for (const speck of ambience.dust) {
    speck.y -= speck.speed * dt * 0.012;
    speck.x += Math.sin(ambience.time * 0.9 + speck.drift * 10) * dt * 0.025;
    if (speck.y < -0.05) speck.y = 1.05;
    if (speck.x < -0.05) speck.x = 1.05;
    if (speck.x > 1.05) speck.x = -0.05;
  }
}

export function drawRoomAmbience(ctx, ambience, floorX, floorY, floorW, floorH) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(floorX, floorY, floorW, floorH);
  ctx.clip();

  ctx.globalCompositeOperation = "screen";

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
    grad.addColorStop(0, `rgba(255, 244, 200, ${alpha + 0.08})`);
    grad.addColorStop(0.55, `rgba(255, 230, 160, ${alpha * 0.55})`);
    grad.addColorStop(1, "rgba(255, 220, 140, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(lx - lw * 0.15, ly - lh * 0.1, lw * 1.3, lh * 1.2);
  }

  ctx.globalCompositeOperation = "source-over";

  for (const speck of ambience.dust) {
    const twinkle = 0.7 + Math.sin(ambience.time * 2.2 + speck.twinkle * 12) * 0.3;
    const alpha = (0.18 + (speck.size / 6) * 0.12) * twinkle;
    const px = floorX + speck.x * floorW;
    const py = floorY + speck.y * floorH;
    ctx.fillStyle = `rgba(255, 248, 230, ${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, speck.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
