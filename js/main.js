import { getRoomCatalogEntry } from "./rooms.js";
import { drawRoom } from "./render.js";
import { getRoomScreenLayout, getSpawnPosition } from "./roomSpace.js";
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

const dungeon = generateDungeon();
const start = getCurrentRoomData(dungeon, dungeon.start.gx, dungeon.start.gy);
const spawn = getSpawnPosition(start.room);

const game = {
  dungeon,
  gx: dungeon.start.gx,
  gy: dungeon.start.gy,
  room: start.room,
  player: new AIsaac(spawn.x, spawn.y),
  tears: [],
  bursts: [],
  transitionCooldown: 0,
};

let lastTime = performance.now();

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function updateHud() {
  const entry = getRoomCatalogEntry();
  roomNameEl.textContent = `${entry.name} (${game.gx}, ${game.gy})`;
  roomIdEl.textContent = game.room.roomId;
}

function changeRoom(transition) {
  game.gx = transition.gx;
  game.gy = transition.gy;
  game.room = transition.room;
  game.tears = [];
  game.bursts = [];
  game.transitionCooldown = 0.25;

  const pos = entryPosition(transition.entry);
  game.player.x = pos.x;
  game.player.y = pos.y;
  game.player.vx = 0;
  game.player.vy = 0;

  dungeon.visited.add(`${game.gx},${game.gy}`);
  updateHud();
}

function update(dt) {
  if (game.transitionCooldown > 0) {
    game.transitionCooldown -= dt;
  } else {
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
      changeRoom(transition);
    }
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
  drawMinimap(ctx, canvas, game.dungeon, game.gx, game.gy);
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
