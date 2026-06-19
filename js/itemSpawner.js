import { findCenterPickupSpot } from "./pickupSpawner.js";
import { rollTreasureItem } from "./items.js";
import { Pedestal } from "./pedestal.js";

export function spawnItemRoomPedestals(dungeon, rand = Math.random) {
  for (const cell of Object.values(dungeon.rooms)) {
    if (!cell.isItemRoom) continue;
    if (cell.pedestal?.active) continue;

    const spot = findCenterPickupSpot(cell.room);
    if (!spot) continue;

    const itemId = rollTreasureItem(rand);
    cell.pedestal = new Pedestal(spot.x, spot.y, itemId);
  }
}
