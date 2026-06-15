import {
  CHEST_RADIUS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import { Chest } from "./chest.js";
import { circleHitsRoom } from "./roomSpace.js";

const PUZZLE_PRESETS = new Set([
  "split_chamber", "barrier_blast", "chain_hall", "double_lock", "barrel_chamber",
  "poop_north_seal", "toxic_airlock", "barrel_fuse_h", "barrel_fuse_v", "poop_gate",
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
      let score = tx;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const c = room.grid[ty + dy]?.[tx + dx];
          if (c === TILE.ROCK || c === TILE.POOP || c === TILE.BARREL) score += 2;
        }
      }
      candidates.push({ x, y, score });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[Math.floor(rand() * Math.min(3, candidates.length))];
}

export function spawnChestsInDungeon(dungeon, rand) {
  const cells = Object.values(dungeon.rooms).filter((c) => !c.isStart && !c.isBoss);
  const puzzle = cells.filter((c) => PUZZLE_PRESETS.has(c.presetId));
  const chosen = new Set();

  for (const cell of puzzle.sort(() => rand() - 0.5)) {
    if (chosen.size >= 2) break;
    const pos = findChestPosition(cell.room, rand);
    if (!pos) continue;
    cell.chest = new Chest(pos.x, pos.y, rand);
    chosen.add(`${cell.gx},${cell.gy}`);
  }

  if (chosen.size === 0 && puzzle[0]) {
    const pos = findChestPosition(puzzle[0].room, rand);
    if (pos) puzzle[0].chest = new Chest(pos.x, pos.y, rand);
  }
}
