import {
  CHEST_RADIUS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import { Chest } from "./chest.js";
import { circleHitsRoom } from "./roomSpace.js";

const CHEST_ROOM_PRESETS = new Set([
  "split_chamber", "barrier_blast", "chain_hall", "double_lock", "barrel_chamber",
  "poop_north_seal", "toxic_airlock", "barrel_fuse_h", "barrel_fuse_v", "poop_gate",
  "west_cache", "east_vault", "north_loot", "south_stash", "campfire_puzzle",
  "single_center", "twin_rocks", "corner_rocks", "poop_corners", "edge_rocks",
]);

function findChestPosition(room, rand) {
  const candidates = [];
  for (let ty = 1; ty < ROOM_HEIGHT - 1; ty++) {
    for (let tx = 1; tx < ROOM_WIDTH - 1; tx++) {
      const code = room.grid[ty][tx];
      if (code !== TILE.FLOOR && code !== TILE.BLOOD) continue;
      const x = tx * TILE_SIZE + TILE_SIZE / 2;
      const y = ty * TILE_SIZE + TILE_SIZE / 2;
      if (circleHitsRoom(x, y, CHEST_RADIUS, room)) continue;
      let score = Math.min(tx, ty, ROOM_WIDTH - 1 - tx, ROOM_HEIGHT - 1 - ty);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const c = room.grid[ty + dy]?.[tx + dx];
          if (c === TILE.ROCK || c === TILE.POOP || c === TILE.BARREL) score += 1;
        }
      }
      candidates.push({ x, y, score });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[Math.floor(rand() * Math.min(4, candidates.length))];
}

export function spawnChestsInDungeon(dungeon, rand) {
  const cells = Object.values(dungeon.rooms).filter((c) => !c.isStart && !c.isBoss);
  const eligible = cells.filter((c) => CHEST_ROOM_PRESETS.has(c.presetId));
  const chosen = new Set();

  const shuffled = [...eligible].sort(() => rand() - 0.5);
  for (const cell of shuffled) {
    if (chosen.size >= 3) break;
    const pos = findChestPosition(cell.room, rand);
    if (!pos) continue;
    cell.chest = new Chest(pos.x, pos.y, rand);
    chosen.add(`${cell.gx},${cell.gy}`);
  }

  if (chosen.size === 0) {
    for (const cell of cells.sort(() => rand() - 0.5)) {
      const pos = findChestPosition(cell.room, rand);
      if (!pos) continue;
      cell.chest = new Chest(pos.x, pos.y, rand);
      break;
    }
  }
}
