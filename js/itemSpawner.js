import { findCenterPickupSpot } from "./pickupSpawner.js";
import { rollTreasureItem, rollSecretItem, rollBossItem } from "./items.js";
import { Pedestal } from "./pedestal.js";

export const SECRET_PEDESTAL_PRESETS = ["secret_shrine", "secret_vault", "secret_hoard"];

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

export function spawnSecretRoomPedestals(dungeon, rand = Math.random) {
  for (const cell of Object.values(dungeon.rooms)) {
    if (!cell.isSecret) continue;
    if (!SECRET_PEDESTAL_PRESETS.includes(cell.presetId)) continue;
    if (cell.pedestal?.active) continue;

    const spot = findCenterPickupSpot(cell.room);
    if (!spot) continue;

    cell.pedestal = new Pedestal(spot.x, spot.y, rollSecretItem(rand));
  }
}

export function spawnBossRoomPedestal(cell, room, rand = Math.random) {
  if (cell.pedestal?.active) return cell.pedestal;

  const spot = findCenterPickupSpot(room);
  if (!spot) return null;

  const pedestal = new Pedestal(spot.x, spot.y, rollBossItem(rand));
  cell.pedestal = pedestal;
  return pedestal;
}
