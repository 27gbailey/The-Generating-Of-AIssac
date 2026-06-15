import { ROOM_HEIGHT, ROOM_WIDTH, TILE_SIZE } from "./constants.js";

function hash(x, y, seed) {
  return ((x * 374761393) ^ (y * 668265263) ^ seed) >>> 0;
}

export function createRoomAmbience(gx, gy, dungeonSeed) {
  const seed = hash(gx, gy, dungeonSeed);
  const dust = [];
  const lights = [];

  for (let i = 0; i < 18; i++) {
    const h = hash(i, seed, 91);
    dust.push({
      x: (h % 1000) / 1000,
      y: ((h >> 10) % 1000) / 1000,
      size: 1 + (h % 3),
      drift: ((h >> 4) % 100) / 100,
      speed: 8 + (h % 12),
    });
  }

  for (let i = 0; i < 5; i++) {
    const h = hash(i + 40, seed, 77);
    lights.push({
      x: 0.15 + ((h % 700) / 1000) * 0.7,
      y: 0.08 + ((h >> 8) % 500) / 1000,
      w: 0.12 + (h % 80) / 400,
      h: 0.18 + ((h >> 5) % 90) / 300,
      alpha: 0.05 + (h % 30) / 400,
    });
  }

  return { dust, lights, time: 0, seed };
}

export function updateRoomAmbience(ambience, dt) {
  ambience.time += dt;
  for (const speck of ambience.dust) {
    speck.y -= speck.speed * dt * 0.004;
    speck.x += Math.sin(ambience.time * 0.7 + speck.drift * 10) * dt * 0.01;
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

  for (const light of ambience.lights) {
    const lx = floorX + light.x * floorW;
    const ly = floorY + light.y * floorH;
    const lw = light.w * floorW;
    const lh = light.h * floorH;
    const grad = ctx.createRadialGradient(
      lx + lw / 2,
      ly,
      0,
      lx + lw / 2,
      ly + lh,
      Math.max(lw, lh)
    );
    grad.addColorStop(0, `rgba(255, 236, 180, ${light.alpha + 0.04})`);
    grad.addColorStop(1, "rgba(255, 236, 180, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(lx, ly, lw, lh);
  }

  for (const speck of ambience.dust) {
    const alpha = 0.08 + (speck.size / 5) * 0.08;
    ctx.fillStyle = `rgba(220, 210, 190, ${alpha})`;
    ctx.fillRect(
      floorX + speck.x * floorW,
      floorY + speck.y * floorH,
      speck.size,
      speck.size
    );
  }

  ctx.restore();
}
