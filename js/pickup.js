import {
  PICKUP_BOMB_RADIUS,
  PICKUP_FULL_HEART_RADIUS,
  PICKUP_HALF_HEART_RADIUS,
  PICKUP_KEY_RADIUS,
  PICKUP_PENNY_RADIUS,
  TILE_SIZE,
} from "./constants.js";
import {
  applyHeartPickup,
  canCollectHeart,
} from "./stats.js";
import {
  applyPlayerPushToCircle,
  moveCircle,
  resolveCircleCollisions,
} from "./pushablePhysics.js";

const TYPE_RADIUS = {
  penny: PICKUP_PENNY_RADIUS,
  key: PICKUP_KEY_RADIUS,
  bomb: PICKUP_BOMB_RADIUS,
  half_heart: PICKUP_HALF_HEART_RADIUS,
  full_heart: PICKUP_FULL_HEART_RADIUS,
};

export function pickupKey(type, tx, ty) {
  return `${type},${tx},${ty}`;
}

export function tileToPickupPos(tx, ty) {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

export function applyPickupToStats(type, stats) {
  if (!stats) return false;
  if (type === "half_heart" || type === "full_heart") {
    return applyHeartPickup(stats, type);
  }
  if (type === "penny") stats.pennies += 1;
  else if (type === "key") stats.keys += 1;
  else if (type === "bomb") stats.bombs += 1;
  else return false;
  return true;
}

export class Pickup {
  constructor(type, x, y, vx = 0, vy = 0, tilePos = null) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = TYPE_RADIUS[type] ?? 10;
    this.dead = false;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.tilePos = tilePos;
  }

  get collectionKey() {
    return this.tilePos ? pickupKey(this.type, this.tilePos.tx, this.tilePos.ty) : null;
  }

  isHeart() {
    return this.type === "half_heart" || this.type === "full_heart";
  }

  update(dt, room, player, entities) {
    if (this.dead) return null;

    const collectedKey = this.tryCollect(player);
    if (collectedKey !== null) return collectedKey;

    applyPlayerPushToCircle(player, this, 0.5, 0.28);
    resolveCircleCollisions(this, entities, 0.5);
    moveCircle(this, dt, room, entities, Math.exp(-6 * dt));
    this.bobPhase += dt * 5;
    return null;
  }

  /** Returns collection key if collected, null if not collected (including pushable hearts at full HP). */
  tryCollect(player) {
    const dist = Math.hypot(this.x - player.x, this.y - player.y);
    if (dist >= this.radius + player.radius - 5) return null;

    if (this.isHeart()) {
      if (!canCollectHeart(player.stats, this.type)) return null;
      applyHeartPickup(player.stats, this.type);
    } else {
      applyPickupToStats(this.type, player.stats);
    }

    this.dead = true;
    return this.collectionKey ?? `spawn,${this.type},${Math.round(this.x)},${Math.round(this.y)}`;
  }

  draw(ctx, layout) {
    if (this.dead) return;
    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y + Math.sin(this.bobPhase) * 1.5;
    ctx.save();

    if (this.type === "penny") {
      ctx.fillStyle = "#c8a020";
      ctx.strokeStyle = "#6a5010";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#5a4010";
      ctx.font = "bold 11px system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("¢", sx, sy + 0.5);
    } else if (this.type === "key") {
      ctx.fillStyle = "#d8c878";
      ctx.beginPath();
      ctx.arc(sx - 2, sy - 1, this.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8a7840";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx + 1, sy);
      ctx.lineTo(sx + this.radius + 2, sy);
      ctx.stroke();
    } else if (this.type === "bomb") {
      ctx.fillStyle = "#3a3028";
      ctx.beginPath();
      ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f84";
      ctx.beginPath();
      ctx.arc(sx + 2, sy - this.radius - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === "half_heart") {
      ctx.fillStyle = "#d63b3b";
      ctx.beginPath();
      ctx.moveTo(sx, sy + this.radius * 0.35);
      ctx.bezierCurveTo(sx - this.radius, sy - this.radius * 0.2, sx - this.radius * 0.55, sy - this.radius * 0.75, sx, sy - this.radius * 0.15);
      ctx.bezierCurveTo(sx + this.radius * 0.55, sy - this.radius * 0.75, sx + this.radius, sy - this.radius * 0.2, sx, sy + this.radius * 0.35);
      ctx.fill();
      ctx.fillStyle = "#0a0806";
      ctx.fillRect(sx, sy - this.radius, this.radius, this.radius * 2.2);
    } else if (this.type === "full_heart") {
      ctx.fillStyle = "#e84848";
      ctx.beginPath();
      ctx.moveTo(sx, sy + this.radius * 0.45);
      ctx.bezierCurveTo(sx - this.radius * 1.1, sy - this.radius * 0.15, sx - this.radius * 0.65, sy - this.radius * 0.95, sx, sy - this.radius * 0.2);
      ctx.bezierCurveTo(sx + this.radius * 0.65, sy - this.radius * 0.95, sx + this.radius * 1.1, sy - this.radius * 0.15, sx, sy + this.radius * 0.45);
      ctx.fill();
    }

    ctx.restore();
  }
}

export function spillPickups(loot, cx, cy, rand) {
  return loot.map((entry, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, loot.length) + (rand() - 0.5) * 0.8;
    const speed = 70 + rand() * 90;
    const spread = 8 + index * 6;
    return new Pickup(
      entry.type,
      cx + Math.cos(angle) * spread,
      cy + Math.sin(angle) * spread,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
  });
}

export function rollChestLoot(rand) {
  if (rand() < 0.1) return [];
  const loot = [];
  const pennyCount = rand() < 0.68 ? 1 + Math.floor(rand() * 3) : 0;
  if (pennyCount) for (let i = 0; i < pennyCount; i++) loot.push({ type: "penny" });
  if (rand() < 0.32) loot.push({ type: "key" });
  if (rand() < 0.32) loot.push({ type: "bomb" });
  if (rand() < 0.28) loot.push({ type: "half_heart" });
  if (rand() < 0.07) loot.push({ type: "full_heart" });
  if (loot.length === 0) loot.push({ type: rand() < 0.4 ? "half_heart" : "penny" });
  return loot;
}

export function createPickupsFromLayout(layoutPickups, collectedSet) {
  const pickups = [];
  for (const entry of layoutPickups) {
    const key = pickupKey(entry.type, entry.x, entry.y);
    if (collectedSet?.has(key)) continue;
    const pos = tileToPickupPos(entry.x, entry.y);
    pickups.push(new Pickup(entry.type, pos.x, pos.y, 0, 0, { tx: entry.x, ty: entry.y }));
  }
  return pickups;
}
