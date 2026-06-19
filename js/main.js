import { DOOR_WALLS } from "./constants.js";
import { getRoomCatalogEntry } from "./rooms.js";
import { drawRoom, roomPixelSize, tickRoomAmbience } from "./render.js";
import { getRoomScreenLayout, getSpawnPosition } from "./roomSpace.js";
import { createInputState, bindInput, clearInputFrame } from "./input.js";
import { AIsaac } from "./player.js";
import { TearBurst, PoopSplatter, BombExplosion, BloodTearBurst, BossDeathBurst, SmokePuff } from "./effects.js";
import { tryPlaceBomb } from "./bomb.js";
import { BOMB_PLACE_COOLDOWN, EXPLOSION_RADIUS_X, EXPLOSION_RADIUS_Y, BLOOD_TEAR_DAMAGE } from "./constants.js";
import { resolveExplosionChain } from "./explosion.js";
import {
  generateDungeon,
  getCurrentRoomData,
  checkDoorTransition,
  entryPosition,
  isBossDoor,
  isItemDoor,
  revealSecretEntrance,
} from "./dungeon.js";
import { drawMinimap } from "./minimap.js";
import { initStatsHud, updateRoomHud, updateStatsHud } from "./hud.js";
import { collectPushableEntities, moveCircle, resolveCircleCollisions } from "./pushablePhysics.js";
import { checkCampfireBurn, checkCampfireBurnEnemies, updateRedCampfires } from "./campfire.js";
import { CAMPFIRE_DAMAGE, EXPLOSION_DAMAGE } from "./constants.js";
import { sfx } from "./audio.js";
import {
  checkEnemyContact,
  damageEnemiesInExplosion,
  applyEnemyPushPhysics,
  ENEMY_CONTACT_DAMAGE,
} from "./enemies.js";
import {
  lockDoorsForEnemies,
  refreshDoorLockState,
  syncRoomDoorLock,
  tryBreakDoorsFromExplosion,
  explosionHitsSecretWall,
} from "./doorLock.js";
import { tryRoomClearReward } from "./pickupSpawner.js";
import {
  checkBossContact,
  damageBossInExplosion,
  BOSS_CONTACT_DAMAGE,
} from "./boss.js";
import { spawnTrapdoor } from "./trapdoor.js";
import { initBossHud, showBossHud, hideBossHud, updateBossHud } from "./bossHud.js";
import {
  createBossIntroCinematic,
  createFloorDescentCinematic,
  updateCinematic,
  drawBossIntro,
  drawFloorDescent,
} from "./cinematic.js";
import { addBloodSmearToRoom } from "./floorSmears.js";

function syncRoomEntities(cell) {
  game.chest = cell?.chest ?? null;
  game.pickups = cell?.pickups ?? [];
  game.bombs = cell?.bombs ?? [];
  game.bloodTears = cell?.bloodTears ?? [];
  game.enemies = cell?.enemies ?? [];
  game.boss = cell?.boss ?? null;
  game.trapdoor = cell?.trapdoor ?? null;
  if (cell?.floorSmears && game.room) {
    game.room.floorSmears = cell.floorSmears;
  }
  syncRoomDoorLock(game.room, cell);
}

function persistRoomEntities(cell) {
  if (!cell) return;
  cell.bloodTears = game.bloodTears;
  cell.enemies = game.enemies;
  cell.boss = game.boss;
  cell.trapdoor = game.trapdoor;
}

function updateChestsAndPickups(dt) {
  const cell = currentCell();
  const pushables = collectPushableEntities({
    chest: game.chest,
    pickups: game.pickups,
    bombs: game.bombs,
    enemies: game.enemies,
  });

  if (game.chest) {
    const wasClosed = !game.chest.opened;
    const spilled = game.chest.update(dt, game.room, game.player, pushables);
    if (wasClosed && game.chest.opened) {
      sfx.chestOpen();
      if (game.chest.requiresKey) updateStatsHud(game.player.stats);
    }
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

function checkPlayerDeath() {
  const total = game.player.stats.health + game.player.stats.soulHealth;
  if (total <= 0 && !game.player.isDying) {
    game.player.startDeath();
    sfx.death();
    game.tears = [];
    game.bombs = [];
  }
}

function regenerateFloor() {
  const dungeon = generateDungeon(Date.now(), 1);
  const start = getCurrentRoomData(dungeon, dungeon.start.gx, dungeon.start.gy);
  const spawn = getSpawnPosition(start.room);

  game.dungeon = dungeon;
  game.floorNumber = 1;
  game.gx = dungeon.start.gx;
  game.gy = dungeon.start.gy;
  game.room = start.room;
  game.bombs = start.bombs ?? [];
  game.tears = [];
  game.bursts = [];
  game.bloodTears = [];
  game.bombCooldown = 0;
  game.roomTransition = null;
  game.cinematic = null;
  game.boss = null;
  game.trapdoor = null;
  syncRoomEntities(start);
  syncRoomDoorLock(start.room, start);
  game.player.resetAt(spawn.x, spawn.y);
  hideBossHud();
  sfx.floorReset();
  updateHud();
}

function completeFloorDescent() {
  const stats = game.player.stats;
  const floorNumber = (game.floorNumber ?? 1) + 1;
  const dungeon = generateDungeon(Date.now() + floorNumber * 99991, floorNumber);
  const start = getCurrentRoomData(dungeon, dungeon.start.gx, dungeon.start.gy);
  const spawn = getSpawnPosition(start.room);

  game.dungeon = dungeon;
  game.floorNumber = floorNumber;
  game.gx = dungeon.start.gx;
  game.gy = dungeon.start.gy;
  game.room = start.room;
  game.bombs = start.bombs ?? [];
  game.tears = [];
  game.bursts = [];
  game.bloodTears = [];
  game.enemies = start.enemies ?? [];
  game.bombCooldown = 0;
  game.roomTransition = null;
  game.cinematic = null;
  game.boss = null;
  game.trapdoor = null;
  syncRoomEntities(start);
  syncRoomDoorLock(start.room, start);
  game.player.resetAt(spawn.x, spawn.y);
  game.player.stats = stats;
  hideBossHud();
  updateHud();
}

function boot() {
  const dungeon = generateDungeon(Date.now(), 1);
  const start = getCurrentRoomData(dungeon, dungeon.start.gx, dungeon.start.gy);
  if (!start?.room) {
    throw new Error("Dungeon start room is missing.");
  }

  const spawn = getSpawnPosition(start.room);

  game = {
    dungeon,
    floorNumber: 1,
    gx: dungeon.start.gx,
    gy: dungeon.start.gy,
    room: start.room,
    bombs: start.bombs,
    chest: start.chest ?? null,
    pickups: start.pickups ?? [],
    player: new AIsaac(spawn.x, spawn.y),
    tears: [],
    bursts: [],
    bloodTears: [],
    enemies: start.enemies ?? [],
    boss: start.boss ?? null,
    trapdoor: start.trapdoor ?? null,
    cinematic: null,
    bombCooldown: 0,
    roomTransition: null,
    worldTime: 0,
  };

  syncRoomDoorLock(start.room, start);
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
  const bossDoorWalls = {};
  for (const wall of DOOR_WALLS) {
    bossDoorWalls[wall] = isBossDoor(game.dungeon, gx, gy, wall);
  }
  return {
    cellKey: `${gx},${gy}`,
    dungeonSeed: game.dungeon.seed,
    isBoss: cell?.isBoss ?? false,
    isItemRoom: cell?.isItemRoom ?? false,
    floorNumber: game.dungeon.floorNumber ?? game.floorNumber ?? 1,
    time: game.worldTime,
    bossDoorWalls,
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

function spawnSmokePuff(x, y) {
  game.bursts.push(new SmokePuff(x, y));
}

function spawnEnemyBloodSmear(x, y) {
  addBloodSmearToRoom(game.room, currentCell(), x, y);
}

function triggerExplosion(x, y) {
  const cell = currentCell();
  const healthBefore = game.player.stats.health + game.player.stats.soulHealth;

  const { pickups, smokePoints } = resolveExplosionChain(
    game.room,
    x,
    y,
    game.bombs,
    game.player,
    (bx, by) => {
      if (
        tryBreakDoorsFromExplosion(
          cell,
          game.room,
          bx,
          by,
          EXPLOSION_RADIUS_X,
          EXPLOSION_RADIUS_Y,
          (wall) => !isBossDoor(game.dungeon, game.gx, game.gy, wall) && !isItemDoor(game.dungeon, game.gx, game.gy, wall)
        )
      ) {
        sfx.doorBreak();
      }
      if (explosionHitsSecretWall(cell, bx, by, EXPLOSION_RADIUS_X, EXPLOSION_RADIUS_Y)) {
        if (revealSecretEntrance(game.dungeon, cell, cell.secretLink.wall)) {
          sfx.doorBreak();
        }
      }
      game.bursts.push(new BombExplosion(bx, by, EXPLOSION_RADIUS_X, EXPLOSION_RADIUS_Y));
      sfx.explosion();
      const kills = damageEnemiesInExplosion(
        game.enemies,
        bx,
        by,
        EXPLOSION_RADIUS_X,
        EXPLOSION_RADIUS_Y,
        EXPLOSION_DAMAGE
      );
      for (const kill of kills) spawnEnemyBloodSmear(kill.x, kill.y);
      if (game.boss?.alive) {
        damageBossInExplosion(
          game.boss,
          bx,
          by,
          EXPLOSION_RADIUS_X,
          EXPLOSION_RADIUS_Y,
          EXPLOSION_DAMAGE
        );
        if (!game.boss.alive) onBossDeath(cell, game.boss);
        else updateBossHud(game.boss);
      }
    }
  );

  if (pickups.length) game.pickups.push(...pickups);
  for (const point of smokePoints) spawnSmokePuff(point.x, point.y);
  if (cell) handleRoomClear(cell);

  const healthAfter = game.player.stats.health + game.player.stats.soulHealth;
  if (healthAfter < healthBefore) {
    sfx.hurt();
    checkPlayerDeath();
  }
  updateStatsHud(game.player.stats);
}

function updateBombs(dt) {
  const liveBombs = game.bombs.filter((b) => b.alive);
  const pushables = collectPushableEntities({
    chest: game.chest,
    pickups: game.pickups,
    bombs: [],
    enemies: game.enemies,
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
  persistRoomEntities(currentCell());
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
  game.bloodTears = [];
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

  if (cell?.isBoss && cell.boss?.alive && !cell.bossIntroSeen) {
    cell.bossIntroSeen = true;
    game.cinematic = createBossIntroCinematic();
    lockDoorsForEnemies(cell, game.room);
    return;
  }

  lockDoorsForEnemies(cell, game.room);
  if (cell?.doorsLocked) sfx.doorLock();
  if (cell?.isBoss && cell.boss?.alive) showBossHud(cell.boss);
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

  if (game.cinematic) {
    game.worldTime += dt;
    if (
      game.cinematic.type === "boss_intro" &&
      !game.cinematic.stingPlayed &&
      game.cinematic.progress > 0.22
    ) {
      game.cinematic.stingPlayed = true;
      sfx.bossSting();
    }
    const done = updateCinematic(game.cinematic, dt);
    for (const burst of game.bursts) burst.update(dt);
    game.bursts = game.bursts.filter((b) => !b.dead);
    if (done) {
      if (game.cinematic.type === "boss_intro") {
        showBossHud(game.boss);
      } else if (game.cinematic.type === "floor_descent") {
        completeFloorDescent();
      }
      game.cinematic = null;
    }
    clearInputFrame(input);
    return;
  }

  if (game.player.isDying) {
    game.worldTime += dt;
    game.player.updateDeath(dt);
    if (game.player.isDead) {
      regenerateFloor();
    }
    for (const burst of game.bursts) burst.update(dt);
    game.bursts = game.bursts.filter((b) => !b.dead);
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
      checkPlayerDeath();
    }
  }

  updateEnemies(dt);
  checkCampfireBurnEnemies(game.enemies, game.room, dt);
  handleRoomClear(currentCell());
  updateBoss(dt);
  applyBossPushPhysics(game.boss, dt);
  updateTrapdoor(dt);

  const newBloodTears = updateRedCampfires(game.room, dt, game.player, Math.random);
  if (newBloodTears.length) {
    game.bloodTears.push(...newBloodTears);
    sfx.bloodTearShoot();
  }

  for (const bt of game.bloodTears) {
    const hit = bt.update(dt, game.room, game.player);
    if (hit) {
      game.bursts.push(new BloodTearBurst(hit.x, hit.y));
      if (hit.hitPlayer) {
        if (game.player.takeDamage(BLOOD_TEAR_DAMAGE)) {
          sfx.hurt();
          updateStatsHud(game.player.stats);
          checkPlayerDeath();
        }
      } else {
        sfx.tearHit();
      }
    }
  }
  game.bloodTears = game.bloodTears.filter((bt) => bt.state !== "dead");
  persistRoomEntities(currentCell());

  updateBombs(dt);
  updateChestsAndPickups(dt);

  const transition = checkDoorTransition(
    game.player,
    game.room,
    game.gx,
    game.gy,
    game.dungeon
  );
  if (transition && !game.player.isDying) {
    if (transition.usedKey) updateStatsHud(game.player.stats);
    sfx.door();
    beginRoomTransition(transition);
    clearInputFrame(input);
    return;
  }

  for (const t of game.tears) {
    const burstPos = t.update(dt, game.room, game.enemies, game.boss);
    if (burstPos) {
      if (burstPos.enemy) {
        game.bursts.push(new TearBurst(burstPos.x, burstPos.y));
        if (burstPos.killed) {
          sfx.enemyDeath();
          spawnEnemyBloodSmear(burstPos.x, burstPos.y);
        } else sfx.enemyHit();
        handleRoomClear(currentCell());
      } else if (burstPos.boss) {
        game.bursts.push(new TearBurst(burstPos.x, burstPos.y));
        if (!burstPos.killed) sfx.enemyHit();
        if (game.boss && !game.boss.alive) onBossDeath(currentCell(), game.boss);
        else updateBossHud(game.boss);
      } else if (burstPos.barrelExplosion) {
        triggerExplosion(burstPos.barrelExplosion.x, burstPos.barrelExplosion.y);
        game.bursts.push(new TearBurst(burstPos.x, burstPos.y));
      } else if (burstPos.poop) {
        game.bursts.push(new PoopSplatter(burstPos.x, burstPos.y));
        sfx.tearPoop();
      } else if (burstPos.campfire) {
        game.bursts.push(new TearBurst(burstPos.x, burstPos.y));
        if (burstPos.extinguished) {
          sfx.extinguish();
          spawnSmokePuff(burstPos.x, burstPos.y);
        } else sfx.tearCampfire();
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

function handleRoomClear(cell) {
  if (!cell) return;
  const { justCleared } = refreshDoorLockState(cell, game.room);
  if (!justCleared) return;

  const reward = tryRoomClearReward(cell, game.room);
  if (reward) {
    game.pickups.push(reward);
    sfx.roomClearDrop();
  }
}

function onBossDeath(cell, boss) {
  if (!cell || cell.bossDefeated) return;
  cell.bossDefeated = true;
  game.bursts.push(new BombExplosion(boss.x, boss.y, EXPLOSION_RADIUS_X * 1.35, EXPLOSION_RADIUS_Y * 1.35));
  game.bursts.push(new BossDeathBurst(boss.x, boss.y));
  sfx.bossDeath();
  refreshDoorLockState(cell, game.room);
  hideBossHud();
  game.trapdoor = spawnTrapdoor(game.room, game.player);
  cell.trapdoor = game.trapdoor;
  spawnSmokePuff(game.trapdoor.x, game.trapdoor.y);
  persistRoomEntities(cell);
}

function startFloorDescent() {
  if (game.cinematic) return;
  if (game.trapdoor) game.trapdoor.active = false;
  game.cinematic = createFloorDescentCinematic();
  game.tears = [];
  game.bombs = [];
  sfx.floorDescent();
}

function updateBoss(dt) {
  const cell = currentCell();
  const boss = game.boss;
  if (!boss?.alive) return;

  const result = boss.update(dt, game.room, game.player);
  if (result.bloodTears?.length) {
    game.bloodTears.push(...result.bloodTears);
    sfx.bloodTearShoot();
  }

  if (checkBossContact(game.player, boss)) {
    if (game.player.takeDamage(BOSS_CONTACT_DAMAGE)) {
      sfx.hurt();
      updateStatsHud(game.player.stats);
      checkPlayerDeath();
    }
  }

  updateBossHud(boss);

  if (!boss.alive) onBossDeath(cell, boss);
  else persistRoomEntities(cell);
}

function applyBossPushPhysics(boss, dt) {
  if (!boss?.alive) return;
  const pushables = collectPushableEntities({
    chest: game.chest,
    pickups: game.pickups,
    bombs: game.bombs,
    enemies: game.enemies,
  });
  const others = pushables.filter((e) => e !== boss);
  resolveCircleCollisions(boss, others, 0.45);
  moveCircle(boss, dt, game.room, others, Math.exp(-9 * dt));
}

function updateTrapdoor(dt) {
  const trapdoor = game.trapdoor;
  if (!trapdoor?.active) return;
  if (trapdoor.update(dt, game.player)) {
    startFloorDescent();
  }
}

function updateEnemies(dt) {
  const cell = currentCell();
  let statsChanged = false;

  for (const enemy of game.enemies) {
    const result = enemy.update(dt, game.room, game.player);
    if (result.bloodTears?.length) {
      game.bloodTears.push(...result.bloodTears);
      sfx.bloodTearShoot();
    }
  }

  const contact = checkEnemyContact(game.player, game.enemies);
  if (contact && game.player.takeDamage(ENEMY_CONTACT_DAMAGE)) {
    sfx.hurt();
    statsChanged = true;
    checkPlayerDeath();
  }

  handleRoomClear(cell);
  if (statsChanged) updateStatsHud(game.player.stats);
  persistRoomEntities(cell);

  const pushables = collectPushableEntities({
    chest: game.chest,
    pickups: game.pickups,
    bombs: game.bombs,
    enemies: game.enemies,
  });
  applyEnemyPushPhysics(game.enemies, game.room, pushables, dt);
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

  for (const bt of game.bloodTears) {
    bt.draw(ctx, layout);
  }

  for (const burst of game.bursts) {
    burst.draw(ctx, layout);
  }

  for (const enemy of game.enemies) {
    enemy.draw(ctx, layout);
  }

  if (game.boss) game.boss.draw(ctx, layout);

  if (game.trapdoor) game.trapdoor.draw(ctx, layout);

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
  } else if (game.cinematic?.type === "floor_descent") {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    drawRoom(ctx, game.room, cx, cy, roomDrawOptions(game.gx, game.gy));
    const layout = getRoomScreenLayout(cx, cy);
    drawFloorDescent(ctx, canvas, game.cinematic, layout, game.player);
  } else {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    drawRoom(ctx, game.room, cx, cy, roomDrawOptions(game.gx, game.gy));
    const layout = getRoomScreenLayout(cx, cy);
    drawWorldContents(layout);
  }

  if (game.cinematic?.type === "boss_intro") {
    drawBossIntro(ctx, canvas, game.cinematic, game.player);
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
  initBossHud();
  boot();
  requestAnimationFrame(loop);
} catch (error) {
  console.error(error);
  resize();
  showError(error.message);
}
