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
    soulHealth: 0,
    pennies: 0,
    keys: 0,
    bombs: START_BOMBS,
  };
}

export function maxRedHalfHearts(stats) {
  return stats.heartContainers * 2;
}

/** @deprecated use maxRedHalfHearts */
export function maxHealth(stats) {
  return maxRedHalfHearts(stats);
}

export function maxTotalHalfHearts() {
  return MAX_HEART_CONTAINERS * 2;
}

export function totalHalfHearts(stats) {
  return stats.health + stats.soulHealth;
}

export function clampHealth(stats) {
  stats.health = Math.max(0, Math.min(maxRedHalfHearts(stats), stats.health));
  const cap = maxTotalHalfHearts();
  stats.soulHealth = Math.max(0, Math.min(cap - stats.health, stats.soulHealth));
}

export function heartSlotState(stats, slotIndex) {
  if (slotIndex >= MAX_HEART_CONTAINERS) return "inactive";

  if (slotIndex < stats.heartContainers) {
    const slotHealth = stats.health - slotIndex * 2;
    if (slotHealth >= 2) return "full";
    if (slotHealth >= 1) return "half";
    return "empty";
  }

  const soulSlot = slotIndex - stats.heartContainers;
  const soulInSlot = stats.soulHealth - soulSlot * 2;
  if (soulInSlot >= 2) return "soul_full";
  if (soulInSlot >= 1) return "soul_half";

  return "unowned";
}

export function addHeartContainer(stats, count = 1) {
  stats.heartContainers = Math.min(MAX_HEART_CONTAINERS, stats.heartContainers + count);
  clampHealth(stats);
}

export function heal(stats, amount = 1) {
  stats.health = Math.min(maxRedHalfHearts(stats), stats.health + amount);
}

export function addSoulHalfHearts(stats, amount = 2) {
  const cap = maxTotalHalfHearts();
  const room = cap - totalHalfHearts(stats);
  if (room <= 0) return false;
  stats.soulHealth += Math.min(amount, room);
  return true;
}

export function damage(stats, amount = 1) {
  let remaining = amount;
  if (stats.soulHealth > 0) {
    const fromSoul = Math.min(stats.soulHealth, remaining);
    stats.soulHealth -= fromSoul;
    remaining -= fromSoul;
  }
  stats.health = Math.max(0, stats.health - remaining);
}

export function healthMissing(stats) {
  return maxRedHalfHearts(stats) - stats.health;
}

export function soulRoomRemaining(stats) {
  return maxTotalHalfHearts() - totalHalfHearts(stats);
}

export function canCollectHeart(stats, type) {
  if (type !== "half_heart" && type !== "full_heart") return false;
  return healthMissing(stats) > 0;
}

export function canCollectSoulHeart(stats) {
  return soulRoomRemaining(stats) >= 2;
}

export function applyHeartPickup(stats, type) {
  if (!canCollectHeart(stats, type)) return false;

  if (type === "half_heart") {
    heal(stats, 1);
  } else if (type === "full_heart") {
    stats.health = maxRedHalfHearts(stats);
  }
  return true;
}

export function applySoulHeartPickup(stats) {
  return addSoulHalfHearts(stats, 2);
}
