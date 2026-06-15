import {
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import { Pickup } from "./pickup.js";
import { circleHitsRoom } from "./roomSpace.js";
import { BODY_RADIUS } from "./constants.js";

const LOOT_TYPES = ["penny", "penny", "half_heart", "bomb", "key"];

function findFloorPickupSpot(room, rand, avoidCenter = true) {
  const candidates = [];
  for (let ty = 1; ty < ROOM_HEIGHT - 1; ty++) {
    for (let tx = 1; tx < ROOM_WIDTH - 1; tx++) {
      const code = room.grid[ty][tx];
      if (code !== TILE.FLOOR && code !== TILE.BLOOD) continue;
      if (avoidCenter && tx >= 4 && tx <= 8 && ty >= 2 && ty <= 4) continue;
      const x = tx * TILE_SIZE + TILE_SIZE / 2;
      const y = ty * TILE_SIZE + TILE_SIZE / 2;
      if (circleHitsRoom(x, y, BODY_RADIUS + 4, room)) continue;
      const edgeScore = Math.min(tx, ty, ROOM_WIDTH - 1 - tx, ROOM_HEIGHT - 1 - ty);
      candidates.push({ x, y, tx, ty, score: edgeScore + rand() * 2 });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  const pick = candidates[Math.floor(rand() * Math.min(5, candidates.length))];
  return pick;
}

export function spawnFloorPickupsInDungeon(dungeon, rand) {
  const cells = Object.values(dungeon.rooms).filter((c) => !c.isStart && !c.isBoss);

  for (const cell of cells) {
    if (rand() > 0.42) continue;
    if (cell.pickups.length > 0) continue;

    const count = rand() < 0.35 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const spot = findFloorPickupSpot(cell.room, rand);
      if (!spot) continue;
      const type = LOOT_TYPES[Math.floor(rand() * LOOT_TYPES.length)];
      const key = `${type},floor,${cell.gx},${cell.gy},${spot.tx},${spot.ty}`;
      if (cell.collectedPickups?.has(key)) continue;
      cell.pickups.push(
        new Pickup(type, spot.x, spot.y, 0, 0, { tx: spot.tx, ty: spot.ty, floorKey: key })
      );
    }
  }
}
