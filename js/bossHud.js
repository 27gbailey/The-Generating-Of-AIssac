let barEl = null;
let fillEl = null;
let nameEl = null;

export function initBossHud() {
  barEl = document.getElementById("boss-bar");
  fillEl = document.getElementById("boss-bar-fill");
  nameEl = document.getElementById("boss-bar-name");
  hideBossHud();
}

export function showBossHud(boss) {
  if (!barEl || !boss) return;
  barEl.classList.add("visible");
  if (nameEl) nameEl.textContent = boss.name;
  updateBossHud(boss);
}

export function hideBossHud() {
  if (barEl) barEl.classList.remove("visible");
}

export function updateBossHud(boss) {
  if (!fillEl || !boss) return;
  const pct = boss.maxHp > 0 ? Math.max(0, boss.hp / boss.maxHp) : 0;
  fillEl.style.width = `${pct * 100}%`;
}
