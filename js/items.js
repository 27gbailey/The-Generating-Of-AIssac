import { TEAR_DAMAGE } from "./constants.js";
import { TEAR_MAX_RANGE } from "./tear.js";
import { addHeartContainer, heal } from "./stats.js";

export const TREASURE_ROOM_POOL = [
  "sad_onion",
  "inner_eye",
  "spoon_bender",
  "crickets_head",
  "my_reflection",
  "number_one",
  "blood_of_martyr",
  "brother_bobby",
  "halo_of_flies",
  "magic_mushroom",
  "the_virus",
  "roid_rage",
  "heart3",
];

export const SECRET_ROOM_POOL = ["skatole", "one_up"];

export const BOSS_ROOM_POOL = ["heart3"];

/** @type {Record<string, { id: string, name: string, flavorText: string, pool: string }>} */
export const ITEMS = {
  sad_onion: {
    id: "sad_onion",
    name: "The Sad Onion",
    flavorText: "Tears Up",
    pool: "treasure",
  },
  inner_eye: {
    id: "inner_eye",
    name: "The Inner Eye",
    flavorText: "Triple Shot",
    pool: "treasure",
  },
  spoon_bender: {
    id: "spoon_bender",
    name: "Spoon Bender",
    flavorText: "Homing Shots",
    pool: "treasure",
  },
  crickets_head: {
    id: "crickets_head",
    name: "Cricket's Head",
    flavorText: "DMG Up",
    pool: "treasure",
  },
  my_reflection: {
    id: "my_reflection",
    name: "My Reflection",
    flavorText: "Boomerang Shots",
    pool: "treasure",
  },
  number_one: {
    id: "number_one",
    name: "Number One",
    flavorText: "Tears Up",
    pool: "treasure",
  },
  blood_of_martyr: {
    id: "blood_of_martyr",
    name: "Blood of the Martyr",
    flavorText: "DMG Up",
    pool: "treasure",
  },
  brother_bobby: {
    id: "brother_bobby",
    name: "Brother Bobby",
    flavorText: "Friends 'till the end",
    pool: "treasure",
  },
  skatole: {
    id: "skatole",
    name: "Skatole",
    flavorText: "Fly Love",
    pool: "secret",
  },
  halo_of_flies: {
    id: "halo_of_flies",
    name: "Halo of Flies",
    flavorText: "Orbiting flies",
    pool: "treasure",
  },
  one_up: {
    id: "one_up",
    name: "1UP!",
    flavorText: "Extra life",
    pool: "secret",
  },
  magic_mushroom: {
    id: "magic_mushroom",
    name: "Magic Mushroom",
    flavorText: "All stats up",
    pool: "treasure",
  },
  the_virus: {
    id: "the_virus",
    name: "The Virus",
    flavorText: "Poison touch",
    pool: "treasure",
  },
  roid_rage: {
    id: "roid_rage",
    name: "Roid Rage",
    flavorText: "Speed + range up",
    pool: "treasure",
  },
  heart3: {
    id: "heart3",
    name: "Breakfast",
    flavorText: "HP Up",
    pool: "treasure",
  },
};

export function getItem(id) {
  return ITEMS[id] ?? null;
}

export function rollTreasureItem(rand = Math.random) {
  const pool = TREASURE_ROOM_POOL;
  return pool[Math.floor(rand() * pool.length)];
}

export function rollSecretItem(rand = Math.random) {
  const pool = SECRET_ROOM_POOL;
  return pool[Math.floor(rand() * pool.length)];
}

export function rollBossItem(rand = Math.random) {
  const pool = BOSS_ROOM_POOL;
  return pool[Math.floor(rand() * pool.length)];
}

export function playerHasSkatole(player) {
  return player?.items?.includes("skatole") ?? false;
}

const BASE_SHOOT_RATE = 0.32;

/** Aggregate passive item effects into tear / shoot modifiers. */
export function computeTearModifiers(itemIds = []) {
  let flatDamage = 0;
  let damageMult = 1;
  let tearBonus = 0;
  let tearRateMult = 1;
  let rangeMult = 1;
  let speedMult = 1;
  let bodyScale = 1;
  let multishot = 1;
  let spread = 0.14;
  let homing = false;
  let boomerang = false;
  let poisonTouch = false;
  let skatole = false;
  let brotherBobby = false;
  let haloOfFlies = false;
  let tearHeightBonus = 0;

  for (const id of itemIds) {
    switch (id) {
      case "sad_onion":
        tearBonus += 0.7;
        break;
      case "inner_eye":
        multishot = Math.max(multishot, 3);
        tearRateMult *= 0.38;
        break;
      case "spoon_bender":
        homing = true;
        break;
      case "crickets_head":
        flatDamage += 0.5;
        damageMult *= 1.5;
        break;
      case "my_reflection":
        boomerang = true;
        rangeMult *= 2.4;
        break;
      case "number_one":
        tearBonus += 1.6;
        rangeMult *= 0.45;
        break;
      case "blood_of_martyr":
        flatDamage += 1;
        break;
      case "magic_mushroom":
        flatDamage += 0.3;
        damageMult *= 1.5;
        tearBonus += 0.35;
        rangeMult *= 1.25;
        speedMult *= 1.12;
        bodyScale *= 1.12;
        tearHeightBonus += 1;
        break;
      case "roid_rage":
        speedMult *= 1.18;
        rangeMult *= 1.28;
        break;
      case "the_virus":
        speedMult *= 1.06;
        poisonTouch = true;
        break;
      case "skatole":
        skatole = true;
        break;
      case "brother_bobby":
        brotherBobby = true;
        break;
      case "halo_of_flies":
        haloOfFlies = true;
        break;
      case "one_up":
        break;
      default:
        break;
    }
  }

  const shootRate = BASE_SHOOT_RATE / ((1 + tearBonus) * tearRateMult);
  const damage = (TEAR_DAMAGE + flatDamage) * damageMult;
  const maxRange = TEAR_MAX_RANGE * rangeMult;
  const tearSizeMult = damage / TEAR_DAMAGE;

  return {
    shootRate,
    damage,
    maxRange,
    multishot,
    spread,
    homing,
    boomerang,
    speedMult,
    bodyScale,
    tearSizeMult,
    poisonTouch,
    skatole,
    brotherBobby,
    haloOfFlies,
    tearHeightBonus,
  };
}

export function applyItemPickupEffects(player, itemId) {
  if (itemId === "magic_mushroom" || itemId === "heart3") {
    addHeartContainer(player.stats);
    if (itemId === "heart3") heal(player.stats, 2);
  }
  if (itemId === "one_up") {
    player.stats.extraLives += 1;
  }
}

export function drawItemSprite(ctx, x, y, size, itemId, bob = 0) {
  const s = size / 2;
  const by = y + bob;

  ctx.save();
  ctx.translate(x, by);

  switch (itemId) {
    case "sad_onion":
      drawSadOnion(ctx, s);
      break;
    case "inner_eye":
      drawInnerEye(ctx, s);
      break;
    case "spoon_bender":
      drawSpoonBender(ctx, s);
      break;
    case "crickets_head":
      drawCricketHead(ctx, s);
      break;
    case "my_reflection":
      drawMyReflection(ctx, s);
      break;
    case "number_one":
      drawNumberOne(ctx, s);
      break;
    case "blood_of_martyr":
      drawBloodOfMartyr(ctx, s);
      break;
    case "brother_bobby":
      drawBrotherBobby(ctx, s);
      break;
    case "skatole":
      drawSkatole(ctx, s);
      break;
    case "halo_of_flies":
      drawHaloOfFlies(ctx, s);
      break;
    case "one_up":
      drawOneUp(ctx, s);
      break;
    case "magic_mushroom":
      drawMagicMushroom(ctx, s);
      break;
    case "the_virus":
      drawTheVirus(ctx, s);
      break;
    case "roid_rage":
      drawRoidRage(ctx, s);
      break;
    case "heart3":
      drawHeart3(ctx, s);
      break;
    default:
      ctx.fillStyle = "#888";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawBrotherBobby(ctx, s) {
  ctx.fillStyle = "#4a78c8";
  ctx.strokeStyle = "#2a4888";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, s * 0.15, s * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f5deb3";
  ctx.beginPath();
  ctx.arc(0, -s * 0.35, s * 0.52, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8b6914";
  ctx.stroke();

  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(-s * 0.18, -s * 0.38, s * 0.08, 0, Math.PI * 2);
  ctx.arc(s * 0.18, -s * 0.38, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawSkatole(ctx, s) {
  ctx.fillStyle = "#5a4028";
  ctx.strokeStyle = "#3a2818";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.1, s * 0.75, s * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#4a3820";
  ctx.beginPath();
  ctx.ellipse(-s * 0.25, s * 0.05, s * 0.22, s * 0.18, 0.3, 0, Math.PI * 2);
  ctx.ellipse(s * 0.2, s * 0.12, s * 0.18, s * 0.14, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1a1a1a";
  for (let i = 0; i < 3; i++) {
    const a = -0.8 + i * 0.8;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * s * 0.55, -s * 0.35 + Math.sin(a) * s * 0.15, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHaloOfFlies(ctx, s) {
  const orbit = s * 0.55;
  for (let i = 0; i < 2; i++) {
    const a = i * Math.PI;
    const fx = Math.cos(a) * orbit;
    const fy = Math.sin(a) * orbit * 0.7;
    ctx.fillStyle = "rgba(200, 200, 210, 0.45)";
    ctx.beginPath();
    ctx.ellipse(fx - 5, fy, 5, 3, -0.4, 0, Math.PI * 2);
    ctx.ellipse(fx + 5, fy, 5, 3, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(fx, fy, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawOneUp(ctx, s) {
  ctx.fillStyle = "#3a9838";
  ctx.strokeStyle = "#1a5818";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.15, s * 0.55, s * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#2a7828";
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.05, s * 0.72, s * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-s * 0.22, -s * 0.12, s * 0.12, 0, Math.PI * 2);
  ctx.arc(s * 0.22, -s * 0.12, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawMagicMushroom(ctx, s) {
  ctx.fillStyle = "#c83030";
  ctx.strokeStyle = "#801818";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.05, s * 0.78, s * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f0ece8";
  ctx.beginPath();
  ctx.arc(-s * 0.22, -s * 0.18, s * 0.1, 0, Math.PI * 2);
  ctx.arc(s * 0.18, -s * 0.28, s * 0.08, 0, Math.PI * 2);
  ctx.arc(s * 0.05, s * 0.02, s * 0.09, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e8c49a";
  ctx.fillRect(-s * 0.18, s * 0.18, s * 0.36, s * 0.35);
}

function drawTheVirus(ctx, s) {
  ctx.fillStyle = "#4a9838";
  ctx.strokeStyle = "#2a5820";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#2a6828";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * s * 0.45, Math.sin(a) * s * 0.45);
    ctx.lineTo(Math.cos(a) * s * 0.82, Math.sin(a) * s * 0.82);
    ctx.stroke();
  }

  ctx.fillStyle = "#1a4018";
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

function drawRoidRage(ctx, s) {
  ctx.fillStyle = "#ddd";
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  ctx.fillRect(-s * 0.12, -s * 0.55, s * 0.24, s * 1.1);
  ctx.strokeRect(-s * 0.12, -s * 0.55, s * 0.24, s * 1.1);

  ctx.fillStyle = "#c02828";
  ctx.fillRect(-s * 0.08, -s * 0.48, s * 0.16, s * 0.55);

  ctx.strokeStyle = "#666";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s * 0.12, -s * 0.35);
  ctx.lineTo(s * 0.42, -s * 0.55);
  ctx.stroke();
}

function drawHeart3(ctx, s) {
  ctx.fillStyle = "#e84040";
  ctx.strokeStyle = "#901818";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s, -s * 0.2, -s * 0.55, -s * 0.75, 0, -s * 0.15);
  ctx.bezierCurveTo(s * 0.55, -s * 0.75, s, -s * 0.2, 0, s * 0.35);
  ctx.fill();
  ctx.stroke();
}

function drawSadOnion(ctx, s) {
  ctx.fillStyle = "#4a7ec8";
  ctx.strokeStyle = "#2a4e88";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.05, s * 0.72, s * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#6a9ee8";
  ctx.lineWidth = 1.5;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * s * 0.18, -s * 0.75);
    ctx.lineTo(i * s * 0.22, -s * 1.05);
    ctx.stroke();
  }

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-s * 0.22, -s * 0.08, s * 0.14, s * 0.18, 0, 0, Math.PI * 2);
  ctx.ellipse(s * 0.22, -s * 0.08, s * 0.14, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1a1a2a";
  ctx.beginPath();
  ctx.arc(-s * 0.22, -s * 0.06, s * 0.07, 0, Math.PI * 2);
  ctx.arc(s * 0.22, -s * 0.06, s * 0.07, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#3a5080";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, s * 0.22, s * 0.18, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.fillStyle = "#8ecff5";
  ctx.beginPath();
  ctx.ellipse(-s * 0.28, s * 0.12, s * 0.06, s * 0.14, 0.3, 0, Math.PI * 2);
  ctx.ellipse(s * 0.28, s * 0.12, s * 0.06, s * 0.14, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawInnerEye(ctx, s) {
  ctx.fillStyle = "#f0ece8";
  ctx.strokeStyle = "#8a3030";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.88, s * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#c03030";
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1a1010";
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(180, 40, 40, 0.7)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * s * 0.45, Math.sin(a) * s * 0.38);
    ctx.lineTo(Math.cos(a) * s * 0.78, Math.sin(a) * s * 0.65);
    ctx.stroke();
  }
}

function drawSpoonBender(ctx, s) {
  ctx.strokeStyle = "#c8c8d0";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-s * 0.55, s * 0.55);
  ctx.quadraticCurveTo(-s * 0.1, s * 0.1, s * 0.35, -s * 0.45);
  ctx.stroke();

  ctx.fillStyle = "#e0e0e8";
  ctx.beginPath();
  ctx.ellipse(s * 0.42, -s * 0.52, s * 0.28, s * 0.38, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9898a8";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawCricketHead(ctx, s) {
  ctx.fillStyle = "#7a7a78";
  ctx.strokeStyle = "#4a4a48";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.78, s * 0.68, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f0e8d8";
  ctx.beginPath();
  ctx.moveTo(-s * 0.55, -s * 0.15);
  ctx.lineTo(-s * 0.85, -s * 0.55);
  ctx.lineTo(-s * 0.35, -s * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(-s * 0.22, -s * 0.08, s * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3a2020";
  ctx.beginPath();
  ctx.ellipse(s * 0.18, -s * 0.05, s * 0.14, s * 0.1, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#5a5050";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-s * 0.15, s * 0.18);
  ctx.lineTo(s * 0.2, s * 0.22);
  ctx.stroke();
}

function drawMyReflection(ctx, s) {
  ctx.fillStyle = "#8a6848";
  ctx.strokeStyle = "#5a4028";
  ctx.lineWidth = 2;
  ctx.fillRect(-s * 0.55, -s * 0.72, s * 1.1, s * 1.44);
  ctx.strokeRect(-s * 0.55, -s * 0.72, s * 1.1, s * 1.44);

  ctx.fillStyle = "#c8dce8";
  ctx.fillRect(-s * 0.42, -s * 0.58, s * 0.84, s * 1.16);
  ctx.strokeStyle = "#88a8b8";
  ctx.strokeRect(-s * 0.42, -s * 0.58, s * 0.84, s * 1.16);

  ctx.fillStyle = "#f5deb3";
  ctx.beginPath();
  ctx.arc(0, -s * 0.05, s * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(-s * 0.08, -s * 0.08, s * 0.04, 0, Math.PI * 2);
  ctx.arc(s * 0.08, -s * 0.08, s * 0.04, 0, Math.PI * 2);
  ctx.fill();
}

function drawNumberOne(ctx, s) {
  ctx.fillStyle = "#d4a820";
  ctx.strokeStyle = "#8a6010";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.85);
  ctx.lineTo(s * 0.65, -s * 0.55);
  ctx.lineTo(s * 0.45, s * 0.75);
  ctx.lineTo(-s * 0.45, s * 0.75);
  ctx.lineTo(-s * 0.65, -s * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff8e0";
  ctx.font = `bold ${Math.round(s * 1.1)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("1", 0, s * 0.05);
}

function drawBloodOfMartyr(ctx, s) {
  ctx.strokeStyle = "#6a5038";
  ctx.lineWidth = s * 0.22;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.75);
  ctx.lineTo(0, s * 0.55);
  ctx.moveTo(-s * 0.45, -s * 0.2);
  ctx.lineTo(s * 0.45, -s * 0.2);
  ctx.stroke();

  ctx.fillStyle = "rgba(160, 25, 25, 0.85)";
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.55);
  ctx.lineTo(s * 0.12, -s * 0.35);
  ctx.lineTo(0, -s * 0.15);
  ctx.lineTo(-s * 0.12, -s * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(120, 15, 15, 0.7)";
  ctx.beginPath();
  ctx.ellipse(0, s * 0.35, s * 0.08, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}
