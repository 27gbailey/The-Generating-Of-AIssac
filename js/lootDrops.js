import { TILE, TILE_SIZE } from "./constants.js";
import { tileCenter } from "./explosion.js";
import { Pickup } from "./pickup.js";

export function rollPotLoot(rand = Math.random) {
  const roll = rand();
  if (roll < 0.12) return [{ type: "penny" }];
  if (roll < 0.16) return [{ type: "bomb" }];
  if (roll < 0.19) return [{ type: "key" }];
  return [];
}

export function rollBlueRockLoot(rand = Math.random) {
  const roll = rand();
  const count = rand() < 0.45 ? 2 : 1;
  if (roll < 0.62) {
    return Array.from({ length: count }, () => ({ type: "soul_heart" }));
  }
  return Array.from({ length: count }, () => ({ type: "bomb" }));
}

export function spawnLootAtTile(loot, tx, ty, spread = 10, rand = Math.random) {
  const center = tileCenter(tx, ty);
  return loot.map((entry, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, loot.length) + (rand() - 0.5) * 0.7;
    const dist = spread + rand() * 8;
    return new Pickup(
      entry.type,
      center.x + Math.cos(angle) * dist,
      center.y + Math.sin(angle) * dist,
      Math.cos(angle) * 40,
      Math.sin(angle) * 40
    );
  });
}

export function rollClearRoomLoot(rand = Math.random) {
  const roll = rand();
  if (roll < 0.55) return "penny";
  if (roll < 0.72) return "half_heart";
  if (roll < 0.84) return "bomb";
  if (roll < 0.94) return "key";
  if (roll < 0.97) return "soul_heart";
  return "penny";
}

export function isDestructibleLootTile(code) {
  return code === TILE.POT || code === TILE.BLUE_ROCK;
}
