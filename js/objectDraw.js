import { TILE_SIZE } from "./constants.js";

export function drawTileShadow(ctx, px, py, scale = 1) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.beginPath();
  ctx.ellipse(
    px + TILE_SIZE / 2,
    py + TILE_SIZE * 0.9,
    TILE_SIZE * 0.3 * scale,
    TILE_SIZE * 0.11 * scale,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

/** Lumpy boulder — cracked granite chunk with flat facets. */
export function drawRock3D(ctx, px, py) {
  const cx = px + TILE_SIZE / 2;
  const base = py + TILE_SIZE - 6;

  drawTileShadow(ctx, px, py, 1);

  ctx.save();

  ctx.fillStyle = "#3e3e42";
  ctx.beginPath();
  ctx.moveTo(cx - 22, base - 2);
  ctx.lineTo(cx - 26, base + 3);
  ctx.lineTo(cx - 8, base + 4);
  ctx.lineTo(cx - 6, base - 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#56565c";
  ctx.beginPath();
  ctx.moveTo(cx + 20, base - 4);
  ctx.lineTo(cx + 28, base + 2);
  ctx.lineTo(cx + 6, base + 5);
  ctx.lineTo(cx + 8, base - 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#767680";
  ctx.beginPath();
  ctx.moveTo(cx - 20, py + 16);
  ctx.lineTo(cx + 18, py + 12);
  ctx.lineTo(cx + 22, py + 28);
  ctx.lineTo(cx - 4, py + 32);
  ctx.lineTo(cx - 24, py + 26);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#9494a0";
  ctx.beginPath();
  ctx.moveTo(cx - 10, py + 14);
  ctx.lineTo(cx + 12, py + 12);
  ctx.lineTo(cx + 6, py + 22);
  ctx.lineTo(cx - 8, py + 24);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(20,20,24,0.55)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - 14, py + 20);
  ctx.lineTo(cx + 4, py + 28);
  ctx.moveTo(cx + 2, py + 16);
  ctx.lineTo(cx + 16, py + 24);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(cx - 8, py + 15);
  ctx.lineTo(cx + 8, py + 14);
  ctx.stroke();

  ctx.restore();
}

/** Barrel with wooden staves and metal bands. */
export function drawBarrel3D(ctx, px, py, stage = 0, destroyed = false) {
  const cx = px + TILE_SIZE / 2;
  const top = py + 12;
  const base = py + TILE_SIZE - 6;
  const hw = 24 - stage;
  const bulge = stage * 2;

  drawTileShadow(ctx, px, py, 0.85);

  if (destroyed) {
    ctx.fillStyle = "rgba(40, 25, 12, 0.35)";
    ctx.fillRect(cx - hw, base - 8, hw * 2, 10);
    return;
  }

  ctx.save();

  ctx.fillStyle = "#3a2510";
  ctx.beginPath();
  ctx.moveTo(cx - hw - 2, top + 14 + bulge);
  ctx.lineTo(cx - hw - 4, base);
  ctx.lineTo(cx + hw + 4, base);
  ctx.lineTo(cx + hw + 2, top + 14 + bulge);
  ctx.closePath();
  ctx.fill();

  const staveColors = ["#5a3818", "#6a4020", "#523015", "#684428"];
  for (let i = 0; i < 4; i++) {
    const ox = -hw + 4 + i * (hw * 0.5);
    ctx.fillStyle = staveColors[i];
    ctx.fillRect(cx + ox, top + 10 + bulge * 0.5, hw * 0.42, base - top - 8);
  }

  ctx.fillStyle = stage >= 2 ? "#7a5030" : "#6a4828";
  ctx.beginPath();
  ctx.ellipse(cx, top + 8 + bulge * 0.3, hw + 2, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = "#8a6040";
  ctx.lineWidth = 3;
  for (const by of [top + 18 + bulge, top + 32 + bulge]) {
    ctx.beginPath();
    ctx.moveTo(cx - hw, by);
    ctx.lineTo(cx + hw, by);
    ctx.stroke();
  }

  ctx.fillStyle = stage >= 2 ? "#c02818" : "#8a1a12";
  ctx.fillRect(cx - 8 - stage, top + 2, 16 + stage * 2, 5);

  if (stage >= 1) {
    ctx.strokeStyle = "rgba(20,10,5,0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - hw * 0.5, top + 20);
    ctx.lineTo(cx - hw * 0.2, base - 4);
    ctx.moveTo(cx + hw * 0.4, top + 16);
    ctx.lineTo(cx + hw * 0.55, base - 6);
    ctx.stroke();
  }

  if (stage >= 2) {
    ctx.fillStyle = "rgba(255,120,40,0.5)";
    ctx.beginPath();
    ctx.arc(cx + hw * 0.25, top + 22, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Classic stacked poop — spiral coils with flies on damage. */
export function drawPoop3D(ctx, px, py, stage = 0, destroyed = false) {
  const cx = px + TILE_SIZE / 2;
  const base = py + TILE_SIZE - 7;
  const shrink = stage * 1.5;

  drawTileShadow(ctx, px, py, 0.85);

  if (destroyed) {
    ctx.fillStyle = "rgba(70, 50, 30, 0.3)";
    ctx.beginPath();
    ctx.ellipse(cx, base - 1, 18 - shrink, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.save();

  const coils = [
    { y: base - 4, rx: 22 - shrink, ry: 7, color: "#3a2818" },
    { y: base - 12 - shrink * 0.4, rx: 18 - shrink * 0.7, ry: 6, color: "#4a3520" },
    { y: base - 20 - shrink * 0.6, rx: 13 - shrink * 0.5, ry: 5, color: stage >= 1 ? "#5c4022" : "#523818" },
  ];

  if (stage < 3) {
    coils.push({
      y: base - 27 - shrink * 0.8,
      rx: 8 - shrink * 0.3,
      ry: 4,
      color: stage >= 2 ? "#6a4828" : "#5a4020",
    });
  }

  for (const coil of coils) {
    ctx.fillStyle = coil.color;
    ctx.beginPath();
    ctx.ellipse(cx, coil.y, coil.rx, coil.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(20,12,6,0.45)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.arc(cx - coil.rx * 0.35, coil.y - 1, coil.rx * 0.25, 0.3, Math.PI * 0.85);
    ctx.stroke();
  }

  ctx.strokeStyle = "#2a1a10";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 14, base - 10);
  ctx.quadraticCurveTo(cx - 6, base - 18, cx + 2, base - 14);
  ctx.quadraticCurveTo(cx + 10, base - 10, cx + 12, base - 4);
  ctx.stroke();

  if (stage >= 1) {
    ctx.fillStyle = "rgba(25,15,8,0.5)";
    ctx.beginPath();
    ctx.moveTo(cx - 10, base - 16);
    ctx.lineTo(cx - 6, base - 8);
    ctx.lineTo(cx - 12, base - 6);
    ctx.closePath();
    ctx.fill();
  }

  if (stage >= 2) {
    ctx.fillStyle = "#1a1008";
    for (const [ox, oy] of [[-14, base - 22], [10, base - 18], [16, base - 10]]) {
      ctx.beginPath();
      ctx.ellipse(cx + ox, oy, 2, 1.2, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(180,180,180,0.25)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(cx + ox + 3, oy - 3, 3, 1.5, 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}
