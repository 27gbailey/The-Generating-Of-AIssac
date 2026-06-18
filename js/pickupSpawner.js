import {
  BODY_RADIUS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
  TILE_SIZE,
} from "./constants.js";
import { Pickup } from "./pickup.js";
import { circleHitsRoom } from "./roomSpace.js";

export const CLEAR_ROOM_DROP_CHANCE = 0.18;

const CLEAR_LOOT_TYPES = ["penny", "penny", "penny", "penny", "half_heart", "bomb", "key"];

const CENTER_TX = Math.floor(ROOM_WIDTH / 2);
const CENTER_TY = Math.floor(ROOM_HEIGHT / 2);

function isOpenFloorTile(room, tx, ty) {
  const code = room.grid[ty]?.[tx];
  return code === TILE.FLOOR || code === TILE.BLOOD;
}

/** Closest walkable tile to room center (center first, then by distance). */
export function findCenterPickupSpot(room) {
  const candidates = [];

  for (let ty = 0; ty < ROOM_HEIGHT; ty++) {
    for (let tx = 0; tx < ROOM_WIDTH; tx++) {
      if (!isOpenFloorTile(room, tx, ty)) continue;
      const x = tx * TILE_SIZE + TILE_SIZE / 2;
      const y = ty * TILE_SIZE + TILE_SIZE / 2;
      if (circleHitsRoom(x, y, BODY_RADIUS + 4, room)) continue;
      const dist = Math.hypot(tx - CENTER_TX, ty - CENTER_TY);
      candidates.push({ tx, ty, x, y, dist });
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates[0];
}

export function tryRoomClearReward(cell, room, rand = Math.random) {
  if (!cell || cell.clearRewardDropped || !cell.hadCombatEnemies) return null;
  if (rand() > CLEAR_ROOM_DROP_CHANCE) {
    cell.clearRewardDropped = true;
    return null;
  }

  const spot = findCenterPickupSpot(room);
  if (!spot) {
    cell.clearRewardDropped = true;
    return null;
  }

  const type = CLEAR_LOOT_TYPES[Math.floor(rand() * CLEAR_LOOT_TYPES.length)];
  const key = `${type},clear,${cell.gx},${cell.gy},${spot.tx},${spot.ty}`;
  if (cell.collectedPickups?.has(key)) {
    cell.clearRewardDropped = true;
    return null;
  }

  cell.clearRewardDropped = true;
  return new Pickup(type, spot.x, spot.y, 0, 0, {
    tx: spot.tx,
    ty: spot.ty,
    floorKey: key,
  });
}
