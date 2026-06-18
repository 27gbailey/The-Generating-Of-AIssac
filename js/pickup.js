import {
  PICKUP_BOMB_RADIUS,
  PICKUP_COLLECT_EXTRA,
  PICKUP_FULL_HEART_RADIUS,
  PICKUP_HALF_HEART_RADIUS,
  PICKUP_KEY_RADIUS,
  PICKUP_PENNY_RADIUS,
  TILE_SIZE,
} from "./constants.js";
import {
  applyHeartPickup,
  applySoulHeartPickup,
  canCollectHeart,
  canCollectSoulHeart,
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
  soul_heart: PICKUP_FULL_HEART_RADIUS,
};

export function pickupKey(type, tx, ty) {
  return `${type},${tx},${ty}`;
}

export function tileToPickupPos(tx, ty) {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

export function applyPickupToStats(type, stats) {
  if (!stats) return false;
  if (type === "soul_heart") return applySoulHeartPickup(stats);
  if (type === "half_heart" || type === "full_heart") {
    return applyHeartPickup(stats, type);
  }
  if (type === "penny") stats.pennies += 1;
  else if (type === "key") stats.keys += 1;
  else if (type === "bomb") stats.bombs += 1;
  else return false;
  return true;
}

function drawHeartShape(ctx, sx, sy, size, fill, half = false) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(sx, sy + size * 0.35);
  ctx.bezierCurveTo(sx - size, sy - size * 0.2, sx - size * 0.55, sy - size * 0.75, sx, sy - size * 0.15);
  ctx.bezierCurveTo(sx + size * 0.55, sy - size * 0.75, sx + size, sy - size * 0.2, sx, sy + size * 0.35);
  ctx.fill();
  if (half) {
    ctx.fillStyle = "#0a0806";
    ctx.fillRect(sx, sy - size, size, size * 2.2);
  }
}

export class Pickup {
  constructor(type, x, y, vx = 0, vy = 0, tilePos = null) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = TYPE_RADIUS[type] ?? 12;
    this.dead = false;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.tilePos = tilePos;
  }

  get collectionKey() {
    if (this.tilePos?.floorKey) return this.tilePos.floorKey;
    if (this.tilePos) return pickupKey(this.type, this.tilePos.tx, this.tilePos.ty);
    return null;
  }

  isHeart() {
    return this.type === "half_heart" || this.type === "full_heart" || this.type === "soul_heart";
  }

  collectionRadius(player) {
    return this.radius + player.radius + PICKUP_COLLECT_EXTRA;
  }

  update(dt, room, player, entities) {
    if (this.dead) return null;

    const collectedKey = this.tryCollect(player);
    if (collectedKey !== null) return collectedKey;

    applyPlayerPushToCircle(player, this, 0.35, 0.18);
    resolveCircleCollisions(this, entities, 0.5);
    moveCircle(this, dt, room, entities, Math.exp(-6 * dt));
    this.bobPhase += dt * 5;
    return null;
  }

  tryCollect(player) {
    const dist = Math.hypot(this.x - player.x, this.y - player.y);
    if (dist >= this.collectionRadius(player)) return null;

    if (this.isHeart()) {
      if (this.type === "soul_heart") {
        if (!canCollectSoulHeart(player.stats)) return null;
        applySoulHeartPickup(player.stats);
      } else if (!canCollectHeart(player.stats, this.type)) {
        return null;
      } else {
        applyHeartPickup(player.stats, this.type);
      }
    } else {
      applyPickupToStats(this.type, player.stats);
    }

    this.dead = true;
    return this.collectionKey ?? `spawn,${this.type},${Math.round(this.x)},${Math.round(this.y)}`;
  }

  draw(ctx, layout) {
    if (this.dead) return;
    const sx = layout.floorX + this.x;
    const sy = layout.floorY + this.y + Math.sin(this.bobPhase) * 2;
    const r = this.radius;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + r * 0.55, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.type === "penny") {
      const grad = ctx.createRadialGradient(sx - 2, sy - 2, 1, sx, sy, r);
      grad.addColorStop(0, "#ffe066");
      grad.addColorStop(0.6, "#d4a017");
      grad.addColorStop(1, "#8a6010");
      ctx.fillStyle = grad;
      ctx.strokeStyle = "#5a4010";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#3a2808";
      ctx.font = "bold 14px system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("1¢", sx, sy + 0.5);
    } else if (this.type === "key") {
      ctx.fillStyle = "#f0d860";
      ctx.strokeStyle = "#8a7020";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx - r * 0.35, sy - r * 0.05, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#c8a830";
      ctx.fillRect(sx - r * 0.05, sy - r * 0.12, r * 1.1, r * 0.22);
      ctx.fillRect(sx + r * 0.45, sy - r * 0.05, r * 0.18, r * 0.55);
      ctx.fillRect(sx + r * 0.65, sy + r * 0.15, r * 0.18, r * 0.35);
      ctx.fillStyle = "#3a2808";
      ctx.font = "bold 9px system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("KEY", sx, sy + r * 0.75);
    } else if (this.type === "bomb") {
      ctx.fillStyle = "#2a2218";
      ctx.beginPath();
      ctx.arc(sx, sy + r * 0.1, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1a1008";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy - r * 0.5);
      ctx.lineTo(sx + 3, sy - r * 1.1);
      ctx.stroke();
      ctx.fillStyle = "#ff6622";
      ctx.beginPath();
      ctx.arc(sx + 3, sy - r * 1.15, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ddd";
      ctx.font = "bold 9px system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BOMB", sx, sy + r * 0.85);
    } else if (this.type === "half_heart") {
      drawHeartShape(ctx, sx, sy, r, "#e84040", true);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("+½", sx, sy + r * 0.95);
    } else if (this.type === "full_heart") {
      drawHeartShape(ctx, sx, sy, r * 1.05, "#ff5050", false);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(sx - r * 0.25, sy - r * 0.2, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("+2", sx, sy + r * 0.95);
    } else if (this.type === "soul_heart") {
      drawHeartShape(ctx, sx, sy, r * 1.05, "#4a9fd8", false);
      ctx.fillStyle = "rgba(200, 240, 255, 0.45)";
      ctx.beginPath();
      ctx.arc(sx - r * 0.25, sy - r * 0.2, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#dff6ff";
      ctx.font = "bold 8px system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SOUL", sx, sy + r * 0.95);
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
  if (rand() < 0.05) loot.push({ type: "soul_heart" });
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
