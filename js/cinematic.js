import { BOSS_NAME } from "./boss.js";
import { TILE_SIZE } from "./constants.js";

export function createBossIntroCinematic() {
  return {
    type: "boss_intro",
    progress: 0,
    duration: 3.6,
    textProgress: 0,
    stingPlayed: false,
  };
}

export function createFloorDescentCinematic() {
  return {
    type: "floor_descent",
    progress: 0,
    duration: 2.0,
    jumpPhase: 0,
  };
}

export function updateCinematic(cinematic, dt) {
  cinematic.progress = Math.min(1, cinematic.progress + dt / cinematic.duration);
  if (cinematic.type === "boss_intro") {
    const revealStart = 0.25;
    if (cinematic.progress > revealStart) {
      cinematic.textProgress = Math.min(
        1,
        (cinematic.progress - revealStart) / (0.55 - revealStart)
      );
    }
  }
  if (cinematic.type === "floor_descent") {
    cinematic.jumpPhase = Math.min(1, cinematic.progress * 1.4);
  }
  return cinematic.progress >= 1;
}

export function drawBossIntro(ctx, canvas, cinematic, player) {
  const w = canvas.width;
  const h = canvas.height;
  const fadeIn = Math.min(1, cinematic.progress / 0.2);
  const fadeOut = cinematic.progress > 0.88 ? 1 - (cinematic.progress - 0.88) / 0.12 : 1;

  ctx.save();
  ctx.globalAlpha = fadeIn * fadeOut;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  const floorY = h * 0.72;
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(0, floorY, w, h - floorY);
  ctx.strokeStyle = "#2a2018";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(w, floorY);
  ctx.stroke();

  const isaacX = w * 0.32;
  const bossX = w * 0.68;
  const charY = floorY - 20;

  drawIntroIsaac(ctx, isaacX, charY);
  drawIntroBoss(ctx, bossX, charY);

  const fullText = `Isaac VS ${BOSS_NAME}`;
  const chars = Math.floor(cinematic.textProgress * fullText.length);
  const shown = fullText.slice(0, chars);

  ctx.textAlign = "center";
  ctx.font = "bold 42px Georgia, serif";
  ctx.fillStyle = "#000";
  ctx.fillText(shown, w / 2 + 2, h * 0.22 + 2);
  ctx.fillStyle = cinematic.textProgress >= 1 ? "#c03030" : "#e8dcc8";
  ctx.fillText(shown, w / 2, h * 0.22);

  if (cinematic.textProgress > 0 && cinematic.textProgress < 1) {
    ctx.fillStyle = "#cc2020";
    ctx.fillRect(w / 2 + ctx.measureText(shown).width / 2 + 4, h * 0.22 - 28, 3, 36);
  }

  ctx.restore();
}

function drawIntroIsaac(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#e8c49a";
  ctx.fillRect(-12, 8, 24, 18);
  ctx.beginPath();
  ctx.arc(0, -4, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(-5, -6, 2, 0, Math.PI * 2);
  ctx.arc(5, -6, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawIntroBoss(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#6a2830";
  ctx.beginPath();
  ctx.ellipse(0, 0, 48, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#cc2020";
  ctx.beginPath();
  ctx.arc(-16, -10, 5, 0, Math.PI * 2);
  ctx.arc(16, -10, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawFloorDescent(ctx, canvas, cinematic, layout, player) {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const jump = cinematic.jumpPhase;

  ctx.fillStyle = "#0a0806";
  ctx.fillRect(0, 0, w, h);

  if (layout) {
    const offsetY = jump * h * 0.6;
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.globalAlpha = 1 - jump * 0.85;
  }

  const screenX = layout ? layout.floorX + player.x : cx;
  const screenY = layout ? layout.floorY + player.y - jump * 120 : h * 0.5;

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.fillStyle = "#e8c49a";
  ctx.fillRect(-12, 8, 24, 18);
  ctx.beginPath();
  ctx.arc(0, -4, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (layout) ctx.restore();

  ctx.fillStyle = `rgba(0,0,0,${jump * 0.9})`;
  ctx.fillRect(0, 0, w, h);
}
