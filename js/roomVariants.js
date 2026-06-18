import {
  BLUE_ROCK_REPLACE_CHANCE,
  POT_REPLACE_CHANCE,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  TILE,
} from "./constants.js";

export function applyRoomObjectVariants(room, rand) {
  for (let ty = 0; ty < ROOM_HEIGHT; ty++) {
    for (let tx = 0; tx < ROOM_WIDTH; tx++) {
      if (room.grid[ty][tx] !== TILE.ROCK) continue;
      const roll = rand();
      if (roll < BLUE_ROCK_REPLACE_CHANCE) {
        room.grid[ty][tx] = TILE.BLUE_ROCK;
      } else if (roll < BLUE_ROCK_REPLACE_CHANCE + POT_REPLACE_CHANCE) {
        room.grid[ty][tx] = TILE.POT;
      }
    }
  }
}
