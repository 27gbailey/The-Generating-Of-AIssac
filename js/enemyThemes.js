/** Room preset group → allowed enemy types (1–3 picked per room). */
export const ENEMY_THEMES = {
  minimal: {
    types: ["fly", "dip"],
    maxTypes: 2,
    counts: [1, 2, 3],
  },
  sparse: {
    types: ["fly", "dip"],
    maxTypes: 2,
    counts: [1, 2, 3],
  },
  rocks: {
    types: ["horf", "gaper"],
    maxTypes: 2,
    counts: [2, 3, 4],
  },
  poops: {
    types: ["dip", "attack_fly"],
    maxTypes: 2,
    counts: [2, 3, 4],
  },
  barrels: {
    types: ["gaper", "pooter_fly"],
    maxTypes: 2,
    counts: [2, 3, 4],
  },
  campfires: {
    types: ["attack_fly", "pooter_fly"],
    maxTypes: 2,
    counts: [2, 3, 4],
  },
  red_campfires: {
    types: ["attack_fly", "pooter_fly", "fly"],
    maxTypes: 2,
    counts: [2, 3, 4, 5],
  },
  dense: {
    types: ["gaper", "horf", "dip"],
    maxTypes: 3,
    counts: [3, 4, 5],
  },
  chambers: {
    types: ["fly", "attack_fly", "pooter_fly"],
    maxTypes: 3,
    counts: [2, 3, 4],
    preferSealedForFlying: true,
  },
  loot: {
    types: ["fly", "dip"],
    maxTypes: 2,
    counts: [1, 2],
  },
  puzzle: {
    types: ["horf", "pooter_fly"],
    maxTypes: 2,
    counts: [1, 2, 3],
  },
};

export const FLYING_ENEMY_TYPES = new Set(["fly", "attack_fly", "pooter_fly", "corn_fly"]);

export function isFlyingEnemyType(type) {
  return FLYING_ENEMY_TYPES.has(type);
}

function shuffle(list, rand) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickRoomEnemyTypes(theme, rand) {
  const pool = shuffle(theme.types, rand);
  const typeCount = 1 + Math.floor(rand() * Math.min(theme.maxTypes, pool.length));
  return pool.slice(0, typeCount);
}

export function pickEnemyCount(theme, rand) {
  const options = theme.counts ?? [2, 3, 4];
  return options[Math.floor(rand() * options.length)];
}

/** Distribute `count` spawns across the chosen types. */
export function buildEnemyRoster(types, count, rand) {
  if (!types.length || count <= 0) return [];

  const roster = [];
  for (let i = 0; i < count; i++) {
    roster.push(types[Math.floor(rand() * types.length)]);
  }
  return roster;
}
