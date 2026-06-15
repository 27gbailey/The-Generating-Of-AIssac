import { generateForest, drawTerrain, MAP_W, MAP_H } from "./terrain.js";
import { Player, spawnEnemies } from "./entities.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("start-btn");
const healthEl = document.getElementById("health");
const scoreEl = document.getElementById("score");
const enemiesEl = document.getElementById("enemies");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");

const input = {
  keys: new Set(),
  mouse: { x: 0, y: 0 },
  shootHeld: false,
};

let game = null;
let running = false;
let lastTime = 0;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (game) {
    game.camera.w = canvas.width;
    game.camera.h = canvas.height;
  }
}

window.addEventListener("resize", resize);
resize();

window.addEventListener("keydown", (e) => {
  input.keys.add(e.key.toLowerCase());
  if (e.key === " ") {
    e.preventDefault();
    input.shootHeld = true;
  }
});

window.addEventListener("keyup", (e) => {
  input.keys.delete(e.key.toLowerCase());
  if (e.key === " ") input.shootHeld = false;
});

canvas.addEventListener("mousemove", (e) => {
  input.mouse.x = e.clientX;
  input.mouse.y = e.clientY;
});

canvas.addEventListener("mousedown", () => {
  input.shootHeld = true;
});

window.addEventListener("mouseup", () => {
  input.shootHeld = false;
});

function initGame() {
  const map = generateForest();
  const player = new Player(
    (MAP_W * map.tileSize) / 2,
    (MAP_H * map.tileSize) / 2
  );

  return {
    map,
    player,
    enemies: spawnEnemies(map, 12, player.x, player.y),
    bullets: [],
    camera: { x: 0, y: 0, w: canvas.width, h: canvas.height },
    score: 0,
    state: "playing",
  };
}

function updateCamera(camera, player, map) {
  const worldW = map.width * map.tileSize;
  const worldH = map.height * map.tileSize;

  camera.x = player.x - camera.w / 2;
  camera.y = player.y - camera.h / 2;
  camera.x = Math.max(0, Math.min(camera.x, worldW - camera.w));
  camera.y = Math.max(0, Math.min(camera.y, worldH - camera.h));
}

function checkCollisions(game) {
  const { player, enemies, bullets } = game;

  for (const bullet of bullets) {
    if (bullet.dead) continue;

    if (bullet.fromPlayer) {
      for (const enemy of enemies) {
        if (enemy.dead) continue;
        const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
        if (dist < bullet.radius + enemy.radius) {
          enemy.takeDamage(15);
          bullet.dead = true;
          if (enemy.dead) game.score += 100;
          break;
        }
      }
    } else {
      const dist = Math.hypot(bullet.x - player.x, bullet.y - player.y);
      if (dist < bullet.radius + player.radius) {
        player.takeDamage(10);
        bullet.dead = true;
      }
    }
  }
}

function update(dt) {
  if (!game || game.state !== "playing") return;

  const { player, enemies, bullets, map } = game;

  player.update(dt, input, map);

  const shot = player.tryShoot(input, game.camera);
  if (shot) bullets.push(shot);

  for (const enemy of enemies) {
    enemy.update(dt, map, player);
    bullets.push(...enemy.tryShoot());
  }

  for (const bullet of bullets) {
    bullet.update(dt, map);
  }

  game.bullets = bullets.filter((b) => !b.dead);
  checkCollisions(game);
  updateCamera(game.camera, player, map);

  healthEl.textContent = `HP: ${Math.max(0, Math.ceil(player.health))}`;
  scoreEl.textContent = `Score: ${game.score}`;
  enemiesEl.textContent = `Enemies: ${enemies.filter((e) => !e.dead).length}`;

  if (player.health <= 0) {
    game.state = "lost";
    showOverlay("You fell in the dungeon", `Score: ${game.score}`, "Try Again");
  } else if (enemies.every((e) => e.dead)) {
    game.state = "won";
    showOverlay("Dungeon cleared!", `Final score: ${game.score}`, "Play Again");
  }
}

function draw() {
  ctx.fillStyle = "#1a2e1a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!game) return;

  drawTerrain(ctx, game.map, game.camera);

  for (const enemy of game.enemies) {
    enemy.draw(ctx, game.camera);
  }

  for (const bullet of game.bullets) {
    bullet.draw(ctx, game.camera);
  }

  game.player.draw(ctx, game.camera);

  const px = game.player.x - game.camera.x;
  const py = game.player.y - game.camera.y;
  const mx = input.mouse.x;
  const my = input.mouse.y;
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(mx, my);
  ctx.stroke();
}

function showOverlay(title, text, btnLabel) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startBtn.textContent = btnLabel;
  overlay.classList.remove("hidden");
  running = false;
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (running) update(dt);
  draw();
  requestAnimationFrame(loop);
}

startBtn.addEventListener("click", () => {
  game = initGame();
  running = true;
  lastTime = performance.now();
  overlay.classList.add("hidden");
});

requestAnimationFrame(loop);
