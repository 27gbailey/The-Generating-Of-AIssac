import { getRoomCatalogEntry } from "./rooms.js";
import { drawRoom, roomPixelSize, tickRoomAmbience } from "./render.js";
import { getRoomScreenLayout, getSpawnPosition } from "./roomSpace.js";
import { createInputState, bindInput, clearInputFrame } from "./input.js";
import { AIsaac } from "./player.js";
import { TearBurst, PoopSplatter, BombExplosion } from "./effects.js";
import { applyExplosion, tryPlaceBomb } from "./bomb.js";
import { BOMB_PLACE_COOLDOWN } from "./constants.js";
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

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
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

function currentCell() {
  return getCurrentRoomData(game.dungeon, game.gx, game.gy);
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
    bombs: start.bombs,
    player: new AIsaac(spawn.x, spawn.y),
    tears: [],
    bursts: [],
    bombCooldown: 0,
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
  const cell = currentCell();
  const entry = getRoomCatalogEntry(cell?.presetId);
  roomNameEl.textContent = `${entry.name} (${game.gx}, ${game.gy})`;
  roomIdEl.textContent = game.room.roomId;
}

function roomDrawOptions(gx, gy) {
  const cell = getCurrentRoomData(game.dungeon, gx, gy);
  return {
    cellKey: `${gx},${gy}`,
    dungeonSeed: game.dungeon.seed,
    isBoss: cell?.isBoss ?? false,
  };
}

function tryPlaceBombFromInput() {
  if (game.bombCooldown > 0 || !input.justPressed.has("e")) return;

  const bomb = tryPlaceBomb(game.player, game.room, game.bombs);
  if (bomb) {
    game.bombs.push(bomb);
    game.bombCooldown = BOMB_PLACE_COOLDOWN;
  }
}

function updateBombs(dt) {
  const liveBombs = game.bombs.filter((b) => b.alive);

  for (const bomb of liveBombs) {
    const blast = bomb.update(dt, game.room, game.player, liveBombs);
    if (blast) {
      applyExplosion(game.room, blast.x, blast.y, blast.radius);
      game.bursts.push(new BombExplosion(blast.x, blast.y, blast.radius));
    }
  }

  game.bombs = game.bombs.filter((b) => b.alive);
}

function beginRoomTransition(transition) {
  const entry = entryPosition(transition.entry);
  game.roomTransition = {
    ...transition,
    progress: 0,
    duration: 0.42,
    fromRoom: game.room,
    fromGx: game.gx,
    fromGy: game.gy,
    fromBombs: game.bombs,
    exitX: game.player.x,
    exitY: game.player.y,
    entryX: entry.x,
    entryY: entry.y,
    pendingFinish: false,
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
  const cell = getCurrentRoomData(game.dungeon, game.gx, game.gy);
  game.bombs = cell?.bombs ?? [];
  game.player.x = transition.entryX;
  game.player.y = transition.entryY;
  game.dungeon.visited.add(`${game.gx},${game.gy}`);
  game.roomTransition = null;
  updateHud();
}

function update(dt) {
  if (!game) return;

  if (game.roomTransition) {
    game.roomTransition.progress = Math.min(
      1,
      game.roomTransition.progress + dt / game.roomTransition.duration
    );
    tickRoomAmbience(
      `${game.roomTransition.fromGx},${game.roomTransition.fromGy}`,
      dt,
      game.dungeon.seed
    );
    tickRoomAmbience(
      `${game.roomTransition.gx},${game.roomTransition.gy}`,
      dt,
      game.dungeon.seed
    );
    if (game.roomTransition.progress >= 1) {
      game.roomTransition.pendingFinish = true;
    }
    clearInputFrame(input);
    return;
  }

  if (game.bombCooldown > 0) game.bombCooldown -= dt;

  tickRoomAmbience(`${game.gx},${game.gy}`, dt, game.dungeon.seed);

  tryPlaceBombFromInput();

  const tear = game.player.update(dt, input.keys, game.room);
  if (tear) game.tears.push(tear);

  updateBombs(dt);

  const transition = checkDoorTransition(
    game.player,
    game.room,
    game.gx,
    game.gy,
    game.dungeon
  );
  if (transition) {
    beginRoomTransition(transition);
    clearInputFrame(input);
    return;
  }

  for (const t of game.tears) {
    const burstPos = t.update(dt, game.room);
    if (burstPos) {
      if (burstPos.poop) {
        game.bursts.push(new PoopSplatter(burstPos.x, burstPos.y));
      } else {
        game.bursts.push(new TearBurst(burstPos.x, burstPos.y));
      }
    }
  }

  game.tears = game.tears.filter((t) => t.state !== "dead");

  for (const burst of game.bursts) {
    burst.update(dt);
  }
  game.bursts = game.bursts.filter((b) => !b.dead);

  clearInputFrame(input);
}

function drawWorldContents(layout, bombs = game.bombs, screenOverride = null) {
  for (const bomb of bombs) {
    bomb.draw(ctx, layout);
  }

  for (const tear of game.tears) {
    tear.draw(ctx, layout);
  }

  for (const burst of game.bursts) {
    burst.draw(ctx, layout);
  }

  game.player.draw(ctx, layout, screenOverride);
}

function drawTransition() {
  const tr = game.roomTransition;
  const t = easeInOutCubic(tr.progress);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const { width, height } = roomPixelSize();
  const dx = tr.gx - tr.fromGx;
  const dy = tr.gy - tr.fromGy;

  const fromOffsetX = cx - dx * width * t;
  const fromOffsetY = cy - dy * height * t;
  const toOffsetX = cx + dx * width * (1 - t);
  const toOffsetY = cy + dy * height * (1 - t);

  drawRoom(ctx, tr.fromRoom, fromOffsetX, fromOffsetY, roomDrawOptions(tr.fromGx, tr.fromGy));
  drawRoom(ctx, tr.room, toOffsetX, toOffsetY, roomDrawOptions(tr.gx, tr.gy));

  const fromLayout = getRoomScreenLayout(fromOffsetX, fromOffsetY);
  const toLayout = getRoomScreenLayout(toOffsetX, toOffsetY);
  const destCell = getCurrentRoomData(game.dungeon, tr.gx, tr.gy);

  const fromScreenX = fromLayout.floorX + tr.exitX;
  const fromScreenY = fromLayout.floorY + tr.exitY;
  const toScreenX = toLayout.floorX + tr.entryX;
  const toScreenY = toLayout.floorY + tr.entryY;

  drawWorldContents(
    toLayout,
    destCell?.bombs ?? [],
    {
      x: fromScreenX + (toScreenX - fromScreenX) * t,
      y: fromScreenY + (toScreenY - fromScreenY) * t,
    }
  );
}

function draw() {
  ctx.fillStyle = "#0a0806";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!game) return;

  if (game.roomTransition) {
    drawTransition();
  } else {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    drawRoom(ctx, game.room, cx, cy, roomDrawOptions(game.gx, game.gy));
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

  if (game?.roomTransition?.pendingFinish) {
    finishRoomTransition();
  }

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
