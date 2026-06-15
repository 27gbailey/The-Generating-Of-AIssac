const KEY_MAP = {
  w: "w",
  a: "a",
  s: "s",
  d: "d",
  e: "e",
  arrowup: "arrowup",
  arrowdown: "arrowdown",
  arrowleft: "arrowleft",
  arrowright: "arrowright",
};

const ARROW_PRIORITY = ["arrowup", "arrowdown", "arrowleft", "arrowright"];

const CARDINALS = {
  arrowup: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
};

export function createInputState() {
  return {
    keys: new Set(),
    justPressed: new Set(),
  };
}

export function bindInput(input) {
  window.addEventListener("keydown", (e) => {
    const key = KEY_MAP[e.key.toLowerCase()];
    if (!key) return;
    e.preventDefault();
    if (!input.keys.has(key)) {
      input.justPressed.add(key);
    }
    input.keys.add(key);
  });

  window.addEventListener("keyup", (e) => {
    const key = KEY_MAP[e.key.toLowerCase()];
    if (!key) return;
    input.keys.delete(key);
  });
}

export function clearInputFrame(input) {
  input.justPressed.clear();
}

export function getBodyVector(keys) {
  let x = 0;
  let y = 0;
  if (keys.has("w")) y -= 1;
  if (keys.has("s")) y += 1;
  if (keys.has("a")) x -= 1;
  if (keys.has("d")) x += 1;

  if (x === 0 && y === 0) return null;

  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}

export function getHeadVector(keys) {
  for (const key of ARROW_PRIORITY) {
    if (keys.has(key)) return { ...CARDINALS[key] };
  }
  return null;
}
