export {
  BOSS_PRESET,
  ROOM_PRESET_POOL,
  ROOM_PRESETS,
  buildRoomFromPreset,
  getBlockedWalls,
  getPresetGroup,
  getRoomCatalogEntry,
  listAllPresetIds,
  isPuzzlePreset,
  presetHasLayoutPickups,
  pickPresetForCell,
  wallsConflictWithNeighbors,
} from "./roomPresets.js";

export const DEFAULT_PRESET = "empty";
