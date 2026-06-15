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

/** Angular rock with top + side faces (isometric-ish). */
export function drawRock3D(ctx, px, py) {
  const cx = px + TILE_SIZE / 2;
  const top = py + 11;
  const base = py + TILE_SIZE - 7;
  const hw = 26;
  const dip = 6;

  drawTileShadow(ctx, px, py, 0.95);

  ctx.save();

  ctx.fillStyle = "#484848";
  ctx.beginPath();
  ctx.moveTo(cx - 4, top + dip);
  ctx.lineTo(cx - hw, base - 2);
  ctx.lineTo(cx - hw + 8, base + 4);
  ctx.lineTo(cx - 2, top + dip + 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#626262";
  ctx.beginPath();
  ctx.moveTo(cx + 4, top + dip);
  ctx.lineTo(cx + hw, base - 2);
  ctx.lineTo(cx + hw - 8, base + 4);
  ctx.lineTo(cx + 2, top + dip + 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#8a8a8a";
  ctx.beginPath();
  ctx.moveTo(cx - hw + 6, top);
  ctx.lineTo(cx + hw - 6, top);
  ctx.lineTo(cx + hw - 14, top + dip + 2);
  ctx.lineTo(cx + 10, top + dip + 8);
  ctx.lineTo(cx - 10, top + dip + 8);
  ctx.lineTo(cx - hw + 14, top + dip + 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - hw + 10, top + 2);
  ctx.lineTo(cx + 4, top + dip + 4);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.moveTo(cx - 6, top + dip + 6);
  ctx.lineTo(cx + 8, top + dip + 6);
  ctx.lineTo(cx + 4, top + dip + 12);
  ctx.lineTo(cx - 4, top + dip + 12);
  ctx.closePath();
  ctx.fill();

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

/** Lumpy poop mound with facet shading. */
export function drawPoop3D(ctx, px, py, stage = 0, destroyed = false) {
  const cx = px + TILE_SIZE / 2;
  const shrink = stage * 1.2;
  const top = py + 14 + shrink;
  const base = py + TILE_SIZE - 8;
  const hw = 24 - shrink;

  drawTileShadow(ctx, px, py, 0.8);

  if (destroyed) {
    ctx.fillStyle = "rgba(90, 70, 45, 0.25)";
    ctx.beginPath();
    ctx.ellipse(cx, base - 2, hw * 0.7, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.save();

  ctx.fillStyle = "#3a2818";
  ctx.beginPath();
  ctx.moveTo(cx - 4, top + 10);
  ctx.lineTo(cx - hw, base - 2);
  ctx.lineTo(cx - hw + 10, base + 2);
  ctx.lineTo(cx - 2, top + 16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = stage >= 2 ? "#6a4828" : "#5c4022";
  ctx.beginPath();
  ctx.moveTo(cx + 4, top + 10);
  ctx.lineTo(cx + hw, base - 2);
  ctx.lineTo(cx + hw - 10, base + 2);
  ctx.lineTo(cx + 2, top + 16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = stage >= 1 ? "#7a5530" : "#6a4828";
  ctx.beginPath();
  ctx.moveTo(cx - hw + 8, top);
  ctx.quadraticCurveTo(cx, top - 8, cx + hw - 8, top);
  ctx.lineTo(cx + hw - 14, top + 12);
  ctx.quadraticCurveTo(cx, top + 20, cx - hw + 14, top + 12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(cx - hw * 0.35, top + 4);
  ctx.lineTo(cx - hw * 0.1, top + 10);
  ctx.lineTo(cx - hw * 0.25, top + 14);
  ctx.closePath();
  ctx.fill();

  if (stage >= 1) {
    ctx.strokeStyle = "rgba(25,15,8,0.6)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cx - hw * 0.3, top + 8);
    ctx.lineTo(cx + hw * 0.1, top + 14);
    ctx.stroke();
  }

  if (stage >= 2) {
    ctx.fillStyle = "#4a3520";
    ctx.beginPath();
    ctx.arc(cx - hw * 0.35, base - 4, 4, 0, Math.PI * 2);
    ctx.arc(cx + hw * 0.2, base - 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
