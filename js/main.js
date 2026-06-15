import { getRoomCatalogEntry } from "./rooms.js";
import { drawRoom, roomPixelSize, tickRoomAmbience } from "./render.js";
import { getRoomScreenLayout, getSpawnPosition } from "./roomSpace.js";
import { createInputState, bindInput, clearInputFrame } from "./input.js";
import { AIsaac } from "./player.js";
import { TearBurst, PoopSplatter, BombExplosion } from "./effects.js";
import { tryPlaceBomb } from "./bomb.js";
import { BOMB_PLACE_COOLDOWN, EXPLOSION_RADIUS_X, EXPLOSION_RADIUS_Y } from "./constants.js";
import { resolveExplosionChain } from "./explosion.js";
import {
  generateDungeon,
  getCurrentRoomData,
  checkDoorTransition,
  entryPosition,
} from "./dungeon.js";
import { drawMinimap } from "./minimap.js";
import { initStatsHud, updateRoomHud, updateStatsHud } from "./hud.js";
import { collectPushableEntities } from "./pushablePhysics.js";
import { checkCampfireBurn } from "./campfire.js";
import { CAMPFIRE_DAMAGE } from "./constants.js";
import { sfx } from "./audio.js";

function syncRoomEntities(cell) {
  game.chest = cell?.chest ?? null;
  game.pickups = cell?.pickups ?? [];
  game.bombs = cell?.bombs ?? [];
}

function updateChestsAndPickups(dt) {
  const cell = currentCell();
  const pushables = collectPushableEntities({
    chest: game.chest,
    pickups: game.pickups,
    bombs: game.bombs,
  });

  if (game.chest) {
    const wasClosed = !game.chest.opened;
    const spilled = game.chest.update(dt, game.room, game.player, pushables);
    if (wasClosed && game.chest.opened) sfx.chestOpen();
    if (spilled.length) game.pickups.push(...spilled);
  }

  let statsChanged = false;
  for (const pickup of game.pickups) {
    const key = pickup.update(dt, game.room, game.player, pushables);
    if (key !== null) {
      if (cell?.collectedPickups) cell.collectedPickups.add(key);
      statsChanged = true;
      sfx.pickup();
    }
  }

  game.pickups = game.pickups.filter((p) => !p.dead);
  if (statsChanged) updateStatsHud(game.player.stats);
}

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

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
    chest: start.chest ?? null,
    pickups: start.pickups ?? [],
    player: new AIsaac(spawn.x, spawn.y),
    tears: [],
    bursts: [],
    bombCooldown: 0,
    roomTransition: null,
    worldTime: 0,
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
  updateRoomHud({
    roomName: entry.name,
    roomId: game.room.roomId,
    gx: game.gx,
    gy: game.gy,
  });
  updateStatsHud(game.player.stats);
}

function roomDrawOptions(gx, gy) {
  const cell = getCurrentRoomData(game.dungeon, gx, gy);
  return {
    cellKey: `${gx},${gy}`,
    dungeonSeed: game.dungeon.seed,
    isBoss: cell?.isBoss ?? false,
    time: game.worldTime,
  };
}

function tryPlaceBombFromInput() {
  if (game.bombCooldown > 0 || !input.justPressed.has("e")) return;

  const bomb = tryPlaceBomb(game.player, game.room, game.bombs);
  if (bomb) {
    game.bombs.push(bomb);
    game.bombCooldown = BOMB_PLACE_COOLDOWN;
    sfx.bombPlace();
    updateStatsHud(game.player.stats);
  }
}

function triggerExplosion(x, y) {
  const healthBefore = game.player.stats.health;
  resolveExplosionChain(game.room, x, y, game.bombs, game.player, (bx, by) => {
    game.bursts.push(new BombExplosion(bx, by, EXPLOSION_RADIUS_X, EXPLOSION_RADIUS_Y));
    sfx.explosion();
  });
  if (game.player.stats.health < healthBefore) sfx.hurt();
  updateStatsHud(game.player.stats);
}

function updateBombs(dt) {
  const liveBombs = game.bombs.filter((b) => b.alive);
  const pushables = collectPushableEntities({
    chest: game.chest,
    pickups: game.pickups,
    bombs: [],
  });

  for (const bomb of liveBombs) {
    const blast = bomb.update(dt, game.room, game.player, liveBombs, pushables);
    if (blast) {
      triggerExplosion(blast.x, blast.y);
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
  syncRoomEntities(cell);
  game.player.x = transition.entryX;
  game.player.y = transition.entryY;
  game.dungeon.visited.add(`${game.gx},${game.gy}`);
  game.roomTransition = null;
  updateHud();
}

function update(dt) {
  if (!game) return;

  if (game.roomTransition) {
    game.worldTime += dt;
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

  game.worldTime += dt;
  tickRoomAmbience(`${game.gx},${game.gy}`, dt, game.dungeon.seed);

  tryPlaceBombFromInput();

  const tear = game.player.update(dt, input.keys, game.room);
  if (tear) {
    game.tears.push(tear);
    sfx.shoot();
  }

  if (checkCampfireBurn(game.player, game.room)) {
    if (game.player.takeDamage(CAMPFIRE_DAMAGE)) {
      sfx.fireBurn();
      updateStatsHud(game.player.stats);
    }
  }

  updateBombs(dt);
  updateChestsAndPickups(dt);

  const transition = checkDoorTransition(
    game.player,
    game.room,
    game.gx,
    game.gy,
    game.dungeon
  );
  if (transition) {
    sfx.door();
    beginRoomTransition(transition);
    clearInputFrame(input);
    return;
  }

  for (const t of game.tears) {
    const burstPos = t.update(dt, game.room);
    if (burstPos) {
      if (burstPos.barrelExplosion) {
        triggerExplosion(burstPos.barrelExplosion.x, burstPos.barrelExplosion.y);
        game.bursts.push(new TearBurst(burstPos.x, burstPos.y));
      } else if (burstPos.poop) {
        game.bursts.push(new PoopSplatter(burstPos.x, burstPos.y));
        sfx.tearPoop();
      } else if (burstPos.campfire) {
        game.bursts.push(new TearBurst(burstPos.x, burstPos.y));
        if (burstPos.extinguished) sfx.extinguish();
        else sfx.tearCampfire();
      } else if (burstPos.barrel) {
        game.bursts.push(new TearBurst(burstPos.x, burstPos.y));
        sfx.tearBarrel();
      } else if (burstPos.wall) {
        game.bursts.push(new TearBurst(burstPos.x, burstPos.y));
        sfx.tearHit();
      } else if (burstPos.fizzle) {
        sfx.tearHit();
      } else {
        game.bursts.push(new TearBurst(burstPos.x, burstPos.y));
        sfx.tearHit();
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
  if (game.chest) game.chest.draw(ctx, layout);

  for (const pickup of game.pickups) {
    pickup.draw(ctx, layout);
  }

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
  initStatsHud();
  boot();
  requestAnimationFrame(loop);
} catch (error) {
  console.error(error);
  resize();
  showError(error.message);
}
