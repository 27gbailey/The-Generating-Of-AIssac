import { ROOM_HEIGHT, ROOM_WIDTH, TILE_SIZE } from "./constants.js";

export function createBloodSmear(x, y, rand = Math.random) {
  return {
    x,
    y,
    rot: rand() * Math.PI * 2,
    scale: 0.65 + rand() * 1.1,
    stretch: 0.55 + rand() * 0.95,
    variant: Math.floor(rand() * 4),
    alpha: 0.5 + rand() * 0.4,
  };
}

export function generateBossFloorSmears(rand = Math.random, count = 34) {
  const smears = [];
  const margin = TILE_SIZE * 0.65;
  const w = ROOM_WIDTH * TILE_SIZE;
  const h = ROOM_HEIGHT * TILE_SIZE;

  for (let i = 0; i < count; i++) {
    smears.push(
      createBloodSmear(
        margin + rand() * (w - margin * 2),
        margin + rand() * (h - margin * 2),
        rand
      )
    );
  }
  return smears;
}

function drawSmearBlob(ctx, variant, w, h) {
  ctx.beginPath();
  if (variant === 0) {
    ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
  } else if (variant === 1) {
    ctx.moveTo(-w, 0);
    ctx.quadraticCurveTo(0, -h * 1.2, w, 0);
    ctx.quadraticCurveTo(0, h * 0.7, -w, 0);
  } else if (variant === 2) {
    ctx.arc(-w * 0.2, 0, w * 0.85, 0, Math.PI * 2);
    ctx.arc(w * 0.35, h * 0.15, w * 0.55, 0, Math.PI * 2);
  } else {
    ctx.moveTo(-w * 0.9, -h * 0.2);
    ctx.lineTo(w * 0.8, h * 0.1);
    ctx.lineTo(w * 0.4, h * 0.55);
    ctx.lineTo(-w * 0.5, h * 0.35);
    ctx.closePath();
  }
  ctx.fill();
}

export function drawFloorSmears(ctx, layout, smears = []) {
  if (!smears.length) return;

  for (const smear of smears) {
    const sx = layout.floorX + smear.x;
    const sy = layout.floorY + smear.y;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(smear.rot);
    ctx.globalAlpha = smear.alpha;

    const w = 14 * smear.scale;
    const h = w * smear.stretch;

    ctx.fillStyle = "#4a1010";
    drawSmearBlob(ctx, smear.variant, w * 1.15, h * 1.1);

    ctx.fillStyle = "#6a1818";
    drawSmearBlob(ctx, smear.variant, w, h);

    ctx.fillStyle = "rgba(120, 25, 25, 0.45)";
    ctx.beginPath();
    ctx.ellipse(w * 0.15, -h * 0.1, w * 0.35, h * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export function addBloodSmearToRoom(room, cell, x, y, rand = Math.random) {
  const smear = createBloodSmear(x, y, rand);
  if (!cell.floorSmears) cell.floorSmears = [];
  if (!room.floorSmears) room.floorSmears = cell.floorSmears;
  cell.floorSmears.push(smear);
  room.floorSmears.push(smear);
  return smear;
}
