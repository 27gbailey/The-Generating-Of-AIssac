const TILE = 32;
const MAP_W = 80;
const MAP_H = 60;

const TILE_GRASS = 0;
const TILE_DIRT = 1;
const TILE_TREE = 2;
const TILE_BUSH = 3;
const TILE_WATER = 4;

function hash(x, y, seed) {
  let h = seed + x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) >>> 0;
}

function noise2D(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const a = hash(ix, iy, seed) / 4294967295;
  const b = hash(ix + 1, iy, seed) / 4294967295;
  const c = hash(ix, iy + 1, seed) / 4294967295;
  const d = hash(ix + 1, iy + 1, seed) / 4294967295;

  const top = a + (b - a) * sx;
  const bot = c + (d - c) * sx;
  return top + (bot - top) * sy;
}

export function generateForest(seed = Date.now()) {
  const tiles = new Uint8Array(MAP_W * MAP_H);
  const solid = new Uint8Array(MAP_W * MAP_H);

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      const moisture = noise2D(x * 0.08, y * 0.08, seed);
      const density = noise2D(x * 0.12 + 100, y * 0.12 + 100, seed + 1);
      const detail = noise2D(x * 0.25, y * 0.25, seed + 2);

      if (moisture < 0.28) {
        tiles[i] = TILE_WATER;
        solid[i] = 1;
      } else if (density > 0.62) {
        tiles[i] = TILE_TREE;
        solid[i] = 1;
      } else if (density > 0.48 && detail > 0.5) {
        tiles[i] = TILE_BUSH;
        solid[i] = 1;
      } else if (detail > 0.72) {
        tiles[i] = TILE_DIRT;
      } else {
        tiles[i] = TILE_GRASS;
      }
    }
  }

  const cx = Math.floor(MAP_W / 2);
  const cy = Math.floor(MAP_H / 2);
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
        const i = y * MAP_W + x;
        tiles[i] = TILE_GRASS;
        solid[i] = 0;
      }
    }
  }

  return { tiles, solid, seed, width: MAP_W, height: MAP_H, tileSize: TILE };
}

export function isSolid(map, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return true;
  return map.solid[ty * map.width + tx] === 1;
}

export function worldToTile(map, wx, wy) {
  return {
    tx: Math.floor(wx / map.tileSize),
    ty: Math.floor(wy / map.tileSize),
  };
}

export function circleHitsSolid(map, cx, cy, radius) {
  const { tx: tMinX, ty: tMinY } = worldToTile(map, cx - radius, cy - radius);
  const { tx: tMaxX, ty: tMaxY } = worldToTile(map, cx + radius, cy + radius);

  for (let ty = tMinY; ty <= tMaxY; ty++) {
    for (let tx = tMinX; tx <= tMaxX; tx++) {
      if (!isSolid(map, tx, ty)) continue;
      const tileCx = tx * map.tileSize + map.tileSize / 2;
      const tileCy = ty * map.tileSize + map.tileSize / 2;
      const dx = cx - tileCx;
      const dy = cy - tileCy;
      const half = map.tileSize / 2 + radius;
      if (Math.abs(dx) < half && Math.abs(dy) < half) return true;
    }
  }
  return false;
}

const COLORS = {
  [TILE_GRASS]: ["#2d5a27", "#3a6b32", "#4a7c3f"],
  [TILE_DIRT]: ["#5c4033", "#6b4c3b"],
  [TILE_TREE]: ["#1b3d1a", "#2e5c2a"],
  [TILE_BUSH]: ["#3d6b35", "#4d7a42"],
  [TILE_WATER]: ["#1a4a6b", "#256990", "#2d7aab"],
};

export function drawTerrain(ctx, map, camera) {
  const ts = map.tileSize;
  const startX = Math.max(0, Math.floor(camera.x / ts));
  const startY = Math.max(0, Math.floor(camera.y / ts));
  const endX = Math.min(map.width, startX + Math.ceil(camera.w / ts) + 2);
  const endY = Math.min(map.height, startY + Math.ceil(camera.h / ts) + 2);

  for (let ty = startY; ty < endY; ty++) {
    for (let tx = startX; tx < endX; tx++) {
      const tile = map.tiles[ty * map.width + tx];
      const px = tx * ts - camera.x;
      const py = ty * ts - camera.y;
      const palette = COLORS[tile];
      const variant = hash(tx, ty, map.seed) % palette.length;

      ctx.fillStyle = palette[variant];
      ctx.fillRect(px, py, ts + 1, ts + 1);

      if (tile === TILE_TREE) {
        ctx.fillStyle = "#0d260d";
        ctx.fillRect(px + 10, py + 14, 12, 18);
        ctx.fillStyle = "#1a5c1a";
        ctx.beginPath();
        ctx.arc(px + 16, py + 10, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#267326";
        ctx.beginPath();
        ctx.arc(px + 12, py + 8, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === TILE_BUSH) {
        ctx.fillStyle = "#2d5a27";
        ctx.beginPath();
        ctx.arc(px + 10, py + 20, 8, 0, Math.PI * 2);
        ctx.arc(px + 22, py + 20, 8, 0, Math.PI * 2);
        ctx.arc(px + 16, py + 14, 9, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === TILE_WATER) {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(px + 4, py + 8, 12, 2);
        ctx.fillRect(px + 16, py + 20, 10, 2);
      }
    }
  }
}

export { TILE, MAP_W, MAP_H };
