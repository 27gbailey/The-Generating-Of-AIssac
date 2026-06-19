import {
  CHEST_RADIUS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import { createGoldenChest, Chest } from "./chest.js";
import { circleHitsRoom } from "./roomSpace.js";
import { isPuzzlePreset, presetHasLayoutPickups } from "./roomPresets.js";

function findChestPosition(room, rand) {
  const candidates = [];
  for (let ty = 1; ty < ROOM_HEIGHT - 1; ty++) {
    for (let tx = 1; tx < ROOM_WIDTH - 1; tx++) {
      const code = room.grid[ty][tx];
      if (code !== TILE.FLOOR && code !== TILE.BLOOD) continue;
      const x = tx * TILE_SIZE + TILE_SIZE / 2;
      const y = ty * TILE_SIZE + TILE_SIZE / 2;
      if (circleHitsRoom(x, y, CHEST_RADIUS, room)) continue;

      let score = 0;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const c = room.grid[ty + dy]?.[tx + dx];
          if (c === TILE.ROCK || c === TILE.POOP || c === TILE.BARREL) score += 2;
          if (c === TILE.CAMPFIRE || c === TILE.RED_CAMPFIRE) score += 1;
        }
      }
      if (score === 0) continue;

      const centerDist = Math.hypot(tx - 6, ty - 3);
      score += centerDist * 0.35 + rand() * 1.5;
      candidates.push({ x, y, score });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[Math.floor(rand() * Math.min(3, candidates.length))];
}

export function spawnChestsInDungeon(dungeon, rand) {
  const cells = Object.values(dungeon.rooms).filter(
    (c) => !c.isStart && !c.isBoss && !c.isItemRoom && !c.isSecret
  );
  const eligible = cells.filter(
    (c) =>
      isPuzzlePreset(c.presetId) &&
      !presetHasLayoutPickups(c.presetId) &&
      !c.chest
  );

  const shuffled = [...eligible].sort(() => rand() - 0.5);
  let placed = 0;

  for (const cell of shuffled) {
    if (placed >= 4) break;
    if (rand() > 0.55) continue;

    const pos = findChestPosition(cell.room, rand);
    if (!pos) continue;
    const golden = rand() < 0.1;
    cell.chest = golden ? createGoldenChest(pos.x, pos.y, rand) : new Chest(pos.x, pos.y, rand);
    placed++;
  }
}

export function spawnSecretRoomChests(dungeon, rand) {
  for (const cell of Object.values(dungeon.rooms)) {
    if (!cell.isSecret || cell.chest) continue;
    const pos = findChestPosition(cell.room, rand);
    if (!pos) continue;
    const golden = rand() < 0.38;
    cell.chest = golden ? createGoldenChest(pos.x, pos.y, rand) : new Chest(pos.x, pos.y, rand);
  }
}
