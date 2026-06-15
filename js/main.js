import { getRoomCatalogEntry } from "./rooms.js";
import { drawRoom, roomPixelSize } from "./render.js";
import { getRoomScreenLayout, getSpawnPosition, getPlayAreaSize } from "./roomSpace.js";
import { createInputState, bindInput } from "./input.js";
import { AIsaac } from "./player.js";
import { TearBurst } from "./effects.js";
import {
  generateDungeon,
  getCurrentRoomData,
  checkDoorTransition,
  entryPosition,
} from "./dungeon.js";
import { drawMinimap } from "./minimap.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const roomNameEl = document.getElementById("room-name");
const roomIdEl = document.getElementById("room-id");

const input = createInputState();
bindInput(input);

let game = null;
let lastTime = performance.now();

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function showError(message) {
  ctx.fillStyle = "#0a0806";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e8dcc8";
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText("Failed to start game:", 24, 40);
  ctx.font = "13px monospace";
  ctx.fillText(String(message), 24, 68, canvas.width - 48);
}

function boot() {
  const dungeon = generateDungeon();
  const start = getCurrentRoomData(dungeon, dungeon.start.gx, dungeon.start.gy);
  if (!start?.room) {
    throw new Error("Dungeon start room is missing.");
  }

  const spawn = getSpawnPosition(start.room);

  game = {
    dungeon,
    gx: dungeon.start.gx,
    gy: dungeon.start.gy,
    room: start.room,
    player: new AIsaac(spawn.x, spawn.y),
    tears: [],
    bursts: [],
    roomTransition: null,
  };

  updateHud();
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function updateHud() {
  if (!game) return;
  const cell = getCurrentRoomData(game.dungeon, game.gx, game.gy);
  const entry = getRoomCatalogEntry(cell?.presetId);
  roomNameEl.textContent = `${entry.name} (${game.gx}, ${game.gy})`;
  roomIdEl.textContent = game.room.roomId;
}

function beginRoomTransition(transition) {
  game.roomTransition = {
    ...transition,
    progress: 0,
    duration: 0.36,
    fromRoom: game.room,
    fromGx: game.gx,
    fromGy: game.gy,
  };
  game.tears = [];
  game.bursts = [];
  game.player.vx = 0;
  game.player.vy = 0;
}

function finishRoomTransition() {
  const transition = game.roomTransition;
  game.gx = transition.gx;
  game.gy = transition.gy;
  game.room = transition.room;
  const pos = entryPosition(transition.entry);
  game.player.x = pos.x;
  game.player.y = pos.y;
  game.dungeon.visited.add(`${game.gx},${game.gy}`);
  game.roomTransition = null;
  updateHud();
}

function update(dt) {
  if (!game) return;

  if (game.roomTransition) {
    game.roomTransition.progress += dt / game.roomTransition.duration;
    if (game.roomTransition.progress >= 1) {
      finishRoomTransition();
    }
    return;
  }

  const tear = game.player.update(dt, input.keys, game.room);
  if (tear) game.tears.push(tear);

  const transition = checkDoorTransition(
    game.player,
    game.room,
    game.gx,
    game.gy,
    game.dungeon
  );
  if (transition) {
    beginRoomTransition(transition);
    return;
  }

  for (const t of game.tears) {
    const burstPos = t.update(dt, game.room);
    if (burstPos) game.bursts.push(new TearBurst(burstPos.x, burstPos.y));
  }

  game.tears = game.tears.filter((t) => t.state !== "dead");

  for (const burst of game.bursts) {
    burst.update(dt);
  }
  game.bursts = game.bursts.filter((b) => !b.dead);
}

function drawWorldContents(layout, centerPlayer = false) {
  for (const tear of game.tears) {
    tear.draw(ctx, layout);
  }

  for (const burst of game.bursts) {
    burst.draw(ctx, layout);
  }

  if (centerPlayer) {
    const { width, height } = getPlayAreaSize();
    const savedX = game.player.x;
    const savedY = game.player.y;
    game.player.x = width / 2;
    game.player.y = height / 2;
    game.player.draw(ctx, layout);
    game.player.x = savedX;
    game.player.y = savedY;
    return;
  }

  game.player.draw(ctx, layout);
}

function draw() {
  ctx.fillStyle = "#0a0806";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!game) return;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const { width, height } = roomPixelSize();

  if (game.roomTransition) {
    const t = easeOutCubic(Math.min(game.roomTransition.progress, 1));
    const dx = game.roomTransition.gx - game.roomTransition.fromGx;
    const dy = game.roomTransition.gy - game.roomTransition.fromGy;

    drawRoom(
      ctx,
      game.roomTransition.fromRoom,
      cx - dx * width * t,
      cy - dy * height * t
    );
    drawRoom(
      ctx,
      game.roomTransition.room,
      cx + dx * width * (1 - t),
      cy + dy * height * (1 - t)
    );

    const layout = getRoomScreenLayout(cx, cy);
    drawWorldContents(layout, true);
  } else {
    drawRoom(ctx, game.room, cx, cy);
    const layout = getRoomScreenLayout(cx, cy);
    drawWorldContents(layout);
  }

  const mapGx = game.roomTransition ? game.roomTransition.gx : game.gx;
  const mapGy = game.roomTransition ? game.roomTransition.gy : game.gy;
  drawMinimap(ctx, canvas, game.dungeon, mapGx, mapGy);
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);

try {
  resize();
  boot();
  requestAnimationFrame(loop);
} catch (error) {
  console.error(error);
  resize();
  showError(error.message);
}
