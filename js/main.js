import { decodeRoomId } from "./roomId.js";
import { STARTER_ROOM_ID, getRoomCatalogEntry } from "./rooms.js";
import { drawRoom } from "./render.js";
import { getRoomScreenLayout, getSpawnPosition } from "./roomSpace.js";
import { createInputState, bindInput } from "./input.js";
import { AIsaac } from "./player.js";
import { TearBurst } from "./effects.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const roomNameEl = document.getElementById("room-name");
const roomIdEl = document.getElementById("room-id");

const input = createInputState();
bindInput(input);

const room = decodeRoomId(STARTER_ROOM_ID);
const spawn = getSpawnPosition(room);

const game = {
  room,
  player: new AIsaac(spawn.x, spawn.y),
  tears: [],
  bursts: [],
};

let lastTime = performance.now();

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function updateHud() {
  const entry = getRoomCatalogEntry(game.room.roomId);
  roomNameEl.textContent = entry?.name ?? "Unknown Room";
  roomIdEl.textContent = game.room.roomId;
}

function update(dt) {
  const tear = game.player.update(dt, input.keys, game.room);
  if (tear) game.tears.push(tear);

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

function draw() {
  ctx.fillStyle = "#0a0806";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const layout = getRoomScreenLayout(canvas.width / 2, canvas.height / 2);
  drawRoom(ctx, game.room, canvas.width / 2, canvas.height / 2);

  for (const tear of game.tears) {
    tear.draw(ctx, layout);
  }

  for (const burst of game.bursts) {
    burst.draw(ctx, layout);
  }

  game.player.draw(ctx, layout);
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);

resize();
updateHud();
requestAnimationFrame(loop);
