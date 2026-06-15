import { circleHitsRoom } from "./roomSpace.js";

export function separateCircles(a, b, ratioA = 0.5) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.radius + b.radius;
  if (dist >= minDist || dist === 0) return false;
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  a.x += nx * overlap * ratioA;
  a.y += ny * overlap * ratioA;
  b.x -= nx * overlap * (1 - ratioA);
  b.y -= ny * overlap * (1 - ratioA);
  return true;
}

export function transferCirclePush(source, target) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dist = Math.hypot(dx, dy);
  if (dist >= source.radius + target.radius || dist === 0) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const speed = Math.hypot(source.vx ?? 0, source.vy ?? 0);
  if (speed > 10) {
    target.vx = (target.vx ?? 0) + nx * speed * 0.22;
    target.vy = (target.vy ?? 0) + ny * speed * 0.22;
  }
}

export function applyPlayerPushToCircle(player, circle, overlapScale = 0.5, speedScale = 0.28) {
  const dx = circle.x - player.x;
  const dy = circle.y - player.y;
  const dist = Math.hypot(dx, dy);
  const minDist = circle.radius + player.radius;
  if (dist >= minDist || dist === 0) return false;
  const nx = dx / dist;
  const ny = dy / dist;
  circle.x += nx * (minDist - dist) * overlapScale;
  circle.y += ny * (minDist - dist) * overlapScale;
  const playerSpeed = Math.hypot(player.vx, player.vy);
  if (playerSpeed > 20) {
    circle.vx = (circle.vx ?? 0) + nx * playerSpeed * speedScale;
    circle.vy = (circle.vy ?? 0) + ny * playerSpeed * speedScale;
  }
  return true;
}

export function resolveCircleCollisions(entity, others, ratio = 0.5) {
  for (const other of others) {
    if (other === entity || other.dead || other.alive === false) continue;
    if (!separateCircles(entity, other, ratio)) continue;
    transferCirclePush(entity, other);
    transferCirclePush(other, entity);
  }
}

function hitsEntities(x, y, radius, entities, skip) {
  for (const entity of entities) {
    if (entity === skip || entity.dead || entity.alive === false) continue;
    if (Math.hypot(x - entity.x, y - entity.y) < radius + entity.radius - 2) return true;
  }
  return false;
}

export function moveCircle(entity, dt, room, entities, friction) {
  const stepDt = dt / 2;
  for (let i = 0; i < 2; i++) {
    const nx = entity.x + entity.vx * stepDt;
    if (!circleHitsRoom(nx, entity.y, entity.radius, room) && !hitsEntities(nx, entity.y, entity.radius, entities, entity)) {
      entity.x = nx;
    } else {
      entity.vx *= -0.2;
    }
    const ny = entity.y + entity.vy * stepDt;
    if (!circleHitsRoom(entity.x, ny, entity.radius, room) && !hitsEntities(entity.x, ny, entity.radius, entities, entity)) {
      entity.y = ny;
    } else {
      entity.vy *= -0.2;
    }
  }
  entity.vx *= friction;
  entity.vy *= friction;
}

export function collectPushableEntities({ chest, pickups, bombs }) {
  const list = [];
  if (chest) list.push(chest);
  for (const pickup of pickups ?? []) if (!pickup.dead) list.push(pickup);
  for (const bomb of bombs ?? []) if (bomb.alive) list.push(bomb);
  return list;
}
