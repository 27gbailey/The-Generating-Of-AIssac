import {
  MAX_HEART_CONTAINERS,
  START_BOMBS,
  START_HEART_CONTAINERS,
} from "./constants.js";

export function createPlayerStats() {
  const heartContainers = START_HEART_CONTAINERS;
  return {
    heartContainers,
    health: heartContainers * 2,
    pennies: 0,
    keys: 0,
    bombs: START_BOMBS,
  };
}

export function maxHealth(stats) {
  return stats.heartContainers * 2;
}

export function clampHealth(stats) {
  const cap = maxHealth(stats);
  stats.health = Math.max(0, Math.min(cap, stats.health));
}

export function heartSlotState(stats, slotIndex) {
  if (slotIndex >= MAX_HEART_CONTAINERS) return "inactive";
  if (slotIndex >= stats.heartContainers) return "unowned";

  const slotHealth = stats.health - slotIndex * 2;
  if (slotHealth >= 2) return "full";
  if (slotHealth >= 1) return "half";
  return "empty";
}

export function addHeartContainer(stats, count = 1) {
  stats.heartContainers = Math.min(MAX_HEART_CONTAINERS, stats.heartContainers + count);
  clampHealth(stats);
}

export function heal(stats, amount = 1) {
  stats.health = Math.min(maxHealth(stats), stats.health + amount);
}

export function damage(stats, amount = 1) {
  stats.health = Math.max(0, stats.health - amount);
}

export function healthMissing(stats) {
  return maxHealth(stats) - stats.health;
}

/** Hearts cannot be collected at full health; they stay pushable on the floor. */
export function canCollectHeart(stats, type) {
  if (type !== "half_heart" && type !== "full_heart") return false;
  return healthMissing(stats) > 0;
}

/**
 * Half-heart restores 1 HP. Full heart always fills to max HP when collected
 * (e.g. missing 1 HP still consumes the whole full heart).
 */
export function applyHeartPickup(stats, type) {
  if (!canCollectHeart(stats, type)) return false;

  if (type === "half_heart") {
    heal(stats, 1);
  } else if (type === "full_heart") {
    stats.health = maxHealth(stats);
  }
  return true;
}
