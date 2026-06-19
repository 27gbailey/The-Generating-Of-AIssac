import { ROOM_HEIGHT, ROOM_WIDTH, TILE, TILE_SIZE } from "./constants.js";
import { Pickup } from "./pickup.js";

export function initKeeperStates(grid, existing = null) {
  const states = existing ? { ...existing } : {};
  for (let y = 0; y < ROOM_HEIGHT; y++) {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      if (grid[y][x] !== TILE.KEEPER) continue;
      const key = `${x},${y}`;
      if (!states[key]) states[key] = { destroyed: false };
    }
  }
  return states;
}

export function isKeeperTile(room, tx, ty) {
  return room.grid[ty]?.[tx] === TILE.KEEPER;
}

export function isKeeperSolid(room, tx, ty) {
  if (!isKeeperTile(room, tx, ty)) return false;
  const state = room.keeperStates?.[`${tx},${ty}`];
  return !state?.destroyed;
}

export function destroyKeeper(room, tx, ty) {
  if (!isKeeperSolid(room, tx, ty)) return false;
  const key = `${tx},${ty}`;
  if (!room.keeperStates) room.keeperStates = {};
  room.keeperStates[key] = { destroyed: true };
  return true;
}

export function rollKeeperLoot(rand = Math.random) {
  if (rand() > 0.58) return [];
  const count = 1 + Math.floor(rand() * 3);
  return Array.from({ length: count }, () => ({ type: "penny" }));
}

export function spawnKeeperLoot(loot, tx, ty, rand = Math.random) {
  const cx = tx * TILE_SIZE + TILE_SIZE / 2;
  const cy = ty * TILE_SIZE + TILE_SIZE / 2;
  return loot.map((entry, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, loot.length) + (rand() - 0.5) * 0.6;
    const dist = 8 + rand() * 10;
    return new Pickup(
      entry.type,
      cx + Math.cos(angle) * dist,
      cy + Math.sin(angle) * dist,
      Math.cos(angle) * 35,
      Math.sin(angle) * 35
    );
  });
}

export function drawKeeper(ctx, px, py, destroyed = false) {
  if (destroyed) return;

  const sx = px + 32;
  const sy = py + 38;

  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 14, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5a5a58";
  ctx.strokeStyle = "#2a2a28";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(sx, sy + 8, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#6a6a68";
  ctx.beginPath();
  ctx.arc(sx, sy - 4, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#4a4a48";
  ctx.beginPath();
  ctx.arc(sx, sy - 2, 9, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();

  ctx.fillStyle = "#3a3a38";
  ctx.fillRect(sx - 14, sy + 2, 28, 10);

  ctx.fillStyle = "#555553";
  ctx.fillRect(sx - 10, sy + 10, 8, 6);
  ctx.fillRect(sx + 2, sy + 10, 8, 6);

  ctx.restore();
}
