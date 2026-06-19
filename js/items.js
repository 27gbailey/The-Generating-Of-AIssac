import { TEAR_DAMAGE } from "./constants.js";
import { TEAR_MAX_RANGE } from "./tear.js";

export const TREASURE_ROOM_POOL = [
  "sad_onion",
  "inner_eye",
  "spoon_bender",
  "crickets_head",
  "my_reflection",
  "number_one",
  "blood_of_martyr",
];

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
};

export function getItem(id) {
  return ITEMS[id] ?? null;
}

export function rollTreasureItem(rand = Math.random) {
  const pool = TREASURE_ROOM_POOL;
  return pool[Math.floor(rand() * pool.length)];
}

const BASE_SHOOT_RATE = 0.32;

/** Aggregate passive item effects into tear / shoot modifiers. */
export function computeTearModifiers(itemIds = []) {
  let flatDamage = 0;
  let damageMult = 1;
  let tearBonus = 0;
  let tearRateMult = 1;
  let rangeMult = 1;
  let multishot = 1;
  let spread = 0.14;
  let homing = false;
  let boomerang = false;

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
      default:
        break;
    }
  }

  const shootRate = BASE_SHOOT_RATE / ((1 + tearBonus) * tearRateMult);
  const damage = (TEAR_DAMAGE + flatDamage) * damageMult;
  const maxRange = TEAR_MAX_RANGE * rangeMult;

  return {
    shootRate,
    damage,
    maxRange,
    multishot,
    spread,
    homing,
    boomerang,
  };
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
    default:
      ctx.fillStyle = "#888";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
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
