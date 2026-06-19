import { FLOOR_GRID_SIZE } from "./constants.js";
import { listRoomCells } from "./dungeon.js";

const MAP_PADDING = 12;
const MAP_CELL = 10;

/** Show secret rooms on the minimap even when unvisited (testing). */
const REVEAL_SECRET_ROOMS = true;

export function drawMinimap(ctx, canvas, dungeon, currentGx, currentGy) {
  const mapWidth = FLOOR_GRID_SIZE * MAP_CELL;
  const mapHeight = FLOOR_GRID_SIZE * MAP_CELL;
  const x = canvas.width - mapWidth - MAP_PADDING;
  const y = MAP_PADDING;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.fillRect(x - 8, y - 8, mapWidth + 16, mapHeight + 16);
  ctx.strokeRect(x - 8, y - 8, mapWidth + 16, mapHeight + 16);

  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText("Map", x, y - 14);

  for (const cell of listRoomCells(dungeon)) {
    const key = `${cell.gx},${cell.gy}`;
    const visited = dungeon.visited.has(key);
    const isCurrent = cell.gx === currentGx && cell.gy === currentGy;
    const isSecret = Boolean(cell.isSecret);

    if (!visited && !isSecret) continue;

    let fill = "rgba(90, 75, 60, 0.85)";
    if (cell.isBoss) fill = visited ? "rgba(120, 30, 30, 0.95)" : "rgba(90, 20, 20, 0.7)";
    if (cell.isItemRoom) fill = visited ? "rgba(180, 150, 40, 0.95)" : "rgba(130, 100, 25, 0.75)";
    if (isSecret && REVEAL_SECRET_ROOMS) {
      fill = visited ? "rgba(110, 70, 170, 0.95)" : "rgba(150, 90, 220, 1)";
    } else if (isSecret) {
      fill = visited ? "rgba(70, 55, 90, 0.9)" : "rgba(50, 35, 75, 0.65)";
    }
    if (cell.isStart) fill = "rgba(120, 90, 70, 0.9)";
    if (isCurrent) fill = "rgba(180, 140, 90, 1)";

    const px = x + cell.gx * MAP_CELL + 1;
    const py = y + cell.gy * MAP_CELL + 1;
    const size = MAP_CELL - 2;

    ctx.fillStyle = fill;
    ctx.fillRect(px, py, size, size);

    if (isSecret && REVEAL_SECRET_ROOMS) {
      ctx.strokeStyle = visited ? "rgba(200, 160, 255, 0.9)" : "rgba(230, 200, 255, 1)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
    }
  }

  ctx.restore();
}
