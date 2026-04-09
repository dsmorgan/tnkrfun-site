// Tinker Impact — game logic
// State, save/load, gacha, combat, and UI rendering.

const STORAGE_KEY = 'tnkr_tinker_impact';
const STATE_VERSION = 1;

// ───────────────────────────────────────────────
// State
// ───────────────────────────────────────────────

let state = defaultState();

function defaultState() {
  // Starter pack: one of each core role so the player can battle immediately.
  const starters = ['c_knight_1', 'c_mage_1', 'c_healer_1'];
  const owned = {};
  starters.forEach(id => { owned[id] = { level: 3, shards: 0 }; });
  return {
    version: STATE_VERSION,
    gold: 300,                          // enough for 3 single pulls to start
    owned,
    team: [...starters, null],          // 4-slot team (slot 4 enabled after Ch2)
    campaign: { chapter: 1, stage: 1 }, // next stage to attempt
    cleared: {},                        // stageId -> true
    tower: { unlocked: false, floor: 1, best: 0 },
    gacha: { pullsSinceRare: 0, totalPulls: 0 },
    log: 'A wandering scribe hands you a summoning charter and three coppers. Best of luck.',
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('save failed', e);
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  let loaded;
  try { loaded = JSON.parse(raw); } catch (e) { console.error('load parse failed', e); return; }
  if (!loaded || typeof loaded !== 'object') return;

  const def = defaultState();
  state = { ...def, ...loaded };
  state.owned = loaded.owned || {};
  // Team is now 4 slots; pad older 3-slot saves.
  if (Array.isArray(loaded.team)) {
    state.team = loaded.team.slice(0, 4);
    while (state.team.length < 4) state.team.push(null);
  } else {
    state.team = [null, null, null, null];
  }
  state.campaign = loaded.campaign && typeof loaded.campaign === 'object' ? { ...def.campaign, ...loaded.campaign } : def.campaign;
  state.cleared = loaded.cleared || {};
  state.tower = loaded.tower && typeof loaded.tower === 'object' ? { ...def.tower, ...loaded.tower } : def.tower;
  state.gacha = loaded.gacha && typeof loaded.gacha === 'object' ? { ...def.gacha, ...loaded.gacha } : def.gacha;

  state.team = state.team.map(id => (id && state.owned[id]) ? id : null);
  // Clamp owned levels to new per-rarity caps (applied going forward).
  for (const id of Object.keys(state.owned)) {
    const hero = heroById(id);
    if (!hero) continue;
    const cap = RARITY[hero.rarity].maxLevel;
    const start = RARITY[hero.rarity].startLevel;
    if (state.owned[id].level > cap) state.owned[id].level = cap;
    if (state.owned[id].level < start) state.owned[id].level = start;
  }
}

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function heroById(id) { return HEROES.find(h => h.id === id) || null; }

// Team size: starts at 3, unlocks to 4 after clearing stage 2-5.
function teamSlotCount() {
  return state.cleared && state.cleared['2-5'] ? 4 : 3;
}

// Class passives — applied once at battle start to the allied units.
//   Knight : all allies get +10% max HP (teamwide aura)
//   Mage   : mages deal +25% AoE damage (atk +25% applied to the mage unit only)
//   Rogue  : first-strike — rogues act at t=0 (before everyone)
//   Healer : passive regen +3 HP per ally per action (applied post-action via flag)
function applyClassPassives(allies) {
  const hasKnight = allies.some(u => u.class === 'knight' && u.hp > 0);
  const hasHealer = allies.some(u => u.class === 'healer' && u.hp > 0);
  if (hasKnight) {
    allies.forEach(u => {
      const bonus = Math.round(u.maxHp * 0.10);
      u.maxHp += bonus; u.hp += bonus;
    });
  }
  allies.forEach(u => {
    if (u.class === 'mage')  u.atk = Math.round(u.atk * 1.25);
    if (u.class === 'rogue') u.nextAct = 0; // first strike
  });
  if (hasHealer) allies.forEach(u => { u.regen = 3; });
}

// New stat formula (simplified): no per-rarity multiplier.
// Rarity determines the hero's starting and max level; the per-level
// multiplier is a flat LEVEL_MULT (0.15) across all tiers.
function heroStats(source, level = 1) {
  const klass = CLASSES[source.class];
  const lvlMult = 1 + (level - 1) * LEVEL_MULT;
  return {
    hp:  Math.round(klass.baseHp  * lvlMult),
    atk: Math.round(klass.baseAtk * lvlMult),
    spd: klass.baseSpd,
  };
}

// Class-specific effective action stats derived from ATK.
// Returned fields: primary label, raw, effective (after class multiplier).
function effectiveActionStat(klass, atk) {
  switch (klass) {
    case 'knight': return { label: 'ATK',  raw: atk, mult: 0.9,  eff: Math.max(1, Math.round(atk * 0.9)) };
    case 'rogue':  return { label: 'ATK',  raw: atk, mult: 1.3,  eff: Math.max(1, Math.round(atk * 1.3)) };
    case 'mage':   return { label: 'AoE',  raw: atk, mult: 0.75, eff: Math.max(1, Math.round(atk * 0.75)) };
    case 'healer': return { label: 'HEAL', raw: atk, mult: 3.0,  eff: Math.max(1, Math.round(atk * 3.0)) };
    default:       return { label: 'ATK',  raw: atk, mult: 1.0,  eff: atk };
  }
}

function ownedCount() { return Object.keys(state.owned).length; }

function setLog(msg) {
  state.log = msg;
  const el = document.getElementById('eventLog');
  if (el) el.textContent = msg;
}

function updateHeader() {
  document.getElementById('goldDisplay').textContent = state.gold;
  document.getElementById('pullsDisplay').textContent = Math.floor(state.gold / PULL_COST);
  document.getElementById('heroesDisplay').textContent = `${ownedCount()}/${HEROES.length}`;
  const towerBtn = document.getElementById('towerTabBtn');
  if (towerBtn) towerBtn.disabled = !state.tower.unlocked;
}

// Build a CSS-mask icon div for a hero or enemy.
//   slug:  game-icons.net author/name (must exist in ICON_DATA)
//   tint:  CSS class — 'tint-basic' | 'tint-common' | 'tint-rare' | 'tint-epic' | 'tint-A'..'tint-G'
//   size:  pixel size (default 64)
function iconHTML(slug, tint, size) {
  const s = size || 64;
  const url = (typeof ICON_DATA !== 'undefined' && ICON_DATA[slug]) ? ICON_DATA[slug] : '';
  const style = `width:${s}px;height:${s}px;-webkit-mask-image:url('${url}');mask-image:url('${url}');-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center`;
  return `<div class="ti-icon ${tint}" style="${style}"></div>`;
}

function heroPortrait(hero, size) {
  const slug = HERO_ICONS[hero.id];
  const tint = `tint-${hero.rarity}`;
  return `<div class="hero-portrait class-${hero.class}" style="width:${size||64}px;height:${size||64}px;background:transparent">${iconHTML(slug, tint, (size||64) - 8)}</div>`;
}

function heroCardHTML(hero, owned, opts) {
  opts = opts || {};
  const lockedClass = owned ? '' : ' locked';
  const selectedClass = opts.selected ? ' selected' : '';
  const stars = '★'.repeat(RARITY[hero.rarity].stars);
  const cap = RARITY[hero.rarity].maxLevel;
  const level = owned ? owned.level : RARITY[hero.rarity].startLevel;
  const atMax = owned && owned.level >= cap;
  const lvl = owned
    ? `<div class="hero-level">Lv ${owned.level}${atMax ? ' <span class="hero-max">max</span>' : ''}</div>`
    : '';
  const shards = owned ? `<div class="hero-shards">${owned.shards} shards</div>` : '';
  // Stats block: shows HP, primary action (ATK/AoE/HEAL with multiplier), SPD
  const s = heroStats(hero, level);
  const act = effectiveActionStat(hero.class, s.atk);
  const multSpan = act.mult !== 1 ? `<span class="stat-mult">×${act.mult} = ${act.eff}</span>` : '<span></span>';
  const statsBlock = `
    <div class="hero-stats">
      <div class="stat-row"><span class="stat-k">HP</span><span class="stat-v">${s.hp}</span><span></span></div>
      <div class="stat-row"><span class="stat-k">${act.label}</span><span class="stat-v">${act.raw}</span>${multSpan}</div>
      <div class="stat-row"><span class="stat-k">SPD</span><span class="stat-v">${s.spd}</span><span></span></div>
    </div>`;
  return `
    <div class="hero-card rarity-${hero.rarity}${lockedClass}${selectedClass}" data-hero-id="${hero.id}">
      ${heroPortrait(hero)}
      <div class="hero-name">${hero.name}</div>
      <div class="hero-class">${hero.class}</div>
      <div class="hero-stars rarity-${hero.rarity}">${stars}</div>
      ${lvl}
      ${statsBlock}
      ${shards}
    </div>
  `;
}

function setHTML(el, html) { el.innerHTML = html; }

// ───────────────────────────────────────────────
// Gacha
// ───────────────────────────────────────────────

function rollRarity(forceRarePlus) {
  if (forceRarePlus) {
    const r = Math.random() * 30;
    return r < 25 ? 'rare' : 'epic';
  }
  const r = Math.random() * 100;
  if (r < RARITY.epic.weight) return 'epic';
  if (r < RARITY.epic.weight + RARITY.rare.weight) return 'rare';
  return 'common';
}

function rollHero(rarity) {
  const pool = HEROES.filter(h => h.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

function singlePull(forceRarePlus) {
  const rarity = rollRarity(forceRarePlus);
  const hero = rollHero(rarity);
  if (rarity === 'common') state.gacha.pullsSinceRare++;
  else state.gacha.pullsSinceRare = 0;
  state.gacha.totalPulls++;

  if (!state.owned[hero.id]) {
    const startLevel = RARITY[hero.rarity].startLevel;
    state.owned[hero.id] = { level: startLevel, shards: 0 };
    return { hero, isNew: true };
  } else {
    state.owned[hero.id].shards++;
    return { hero, isNew: false };
  }
}

function doPull(count) {
  const cost = count === 10 ? PULL_COST_10 : PULL_COST;
  if (state.gold < cost) return null;
  state.gold -= cost;

  const results = [];
  let gotRarePlusInBundle = false;

  for (let i = 0; i < count; i++) {
    const isLast = (i === count - 1);
    let force = state.gacha.pullsSinceRare >= PITY_SOFT_THRESHOLD;
    if (count === 10 && isLast && !gotRarePlusInBundle) force = true;
    const result = singlePull(force);
    if (result.hero.rarity !== 'common') gotRarePlusInBundle = true;
    results.push(result);
  }
  saveState();
  return results;
}

// ───────────────────────────────────────────────
// Combat
// ───────────────────────────────────────────────

let battle = null;

function makeUnit(source, level, side, slot) {
  const stats = heroStats(source, level);
  return {
    name: source.name,
    class: source.class,
    rarity: source.rarity,
    level,
    side,
    slot,
    iconSlug: source.iconSlug || null,
    iconTint: source.iconTint || null,
    maxHp: stats.hp,
    hp: stats.hp,
    atk: stats.atk,
    spd: stats.spd,
    nextAct: 0,
  };
}

// Roll a variant for an enemy stage entry. Returns a "source" object compatible
// with makeUnit (has class, rarity, name, iconSlug, iconTint).
//
// Variant odds: I = 90%, II = 9%, III = 1% (per ENEMY_VARIANT_ROLL).
// II adds +1 level and bumps the type tier; III adds +2 levels and bumps two.
function rollEnemyVariant(stageEntry) {
  const kind = ENEMY_KINDS[stageEntry.kind];
  if (!kind) {
    // Fallback for unknown kind: treat as common rogue
    return { name: stageEntry.kind, class: 'rogue', rarity: 'common', iconSlug: null, iconTint: 'tint-A', _level: stageEntry.level };
  }
  // Roll variant tier
  const totalW = ENEMY_VARIANT_ROLL.reduce((a, v) => a + v.weight, 0);
  let r = Math.random() * totalW;
  let variantTier = 0;
  for (const v of ENEMY_VARIANT_ROLL) {
    r -= v.weight;
    if (r <= 0) { variantTier = v.tier; break; }
  }
  const levelBonus = variantTier; // 0 / 1 / 2
  const level = stageEntry.level + levelBonus;
  // Pick type letter from the kind's escalation list (clamped)
  const typeIdx = Math.min(variantTier, kind.types.length - 1);
  const typeLetter = kind.types[typeIdx];
  // Pick icon: alt for variant if specified
  const icon = (kind.altIcons && kind.altIcons[variantTier]) || kind.icon;
  // Pick name: alt for variant if specified
  const name = (kind.altNames && kind.altNames[variantTier]) || kind.name;
  // For stat purposes, treat enemies as 'common' rarity but apply variant via level.
  return {
    name,
    class: kind.class,
    rarity: 'common',
    iconSlug: icon,
    iconTint: `tint-${typeLetter}`,
    _level: level,
  };
}

function startBattle(kind, payload) {
  // Active slots: 3 until Ch2 cleared (2-5), then 4.
  const slotCount = teamSlotCount();
  const activeTeam = state.team.slice(0, slotCount);
  const allyHeroes = activeTeam.map(id => id ? heroById(id) : null);
  if (!allyHeroes.every(Boolean)) {
    setLog(`Fill all ${slotCount} team slots before battling.`);
    return;
  }
  const allies = allyHeroes.map((h, i) => makeUnit(h, state.owned[h.id].level, 'ally', i));
  applyClassPassives(allies);
  let enemies;
  if (kind === 'stage') {
    enemies = payload.enemies.map((e, i) => {
      const variant = rollEnemyVariant(e);
      return makeUnit(variant, variant._level, 'enemy', i);
    });
  } else if (kind === 'tower') {
    enemies = generateTowerEnemies(payload.floor).map((e, i) => makeUnit(e, e.level, 'enemy', i));
  }

  battle = { kind, payload, allies, enemies, time: 0, over: false, victory: false };
  [...allies, ...enemies].forEach(u => { u.nextAct = 100 / u.spd; });

  document.getElementById('battleOverlay').classList.add('active');
  renderBattle();
  scheduleNextTick();
}

function endBattle() {
  battle = null;
  document.getElementById('battleOverlay').classList.remove('active');
  renderActiveTab();
  updateHeader();
}

function nextActor() {
  let pick = null;
  const all = [...battle.allies, ...battle.enemies];
  for (const u of all) {
    if (u.hp <= 0) continue;
    if (!pick || u.nextAct < pick.nextAct) pick = u;
  }
  return pick;
}

function liveUnits(side) {
  return (side === 'ally' ? battle.allies : battle.enemies).filter(u => u.hp > 0);
}

function pickTarget(actor) {
  const enemySide = actor.side === 'ally' ? 'enemy' : 'ally';
  const live = liveUnits(enemySide);
  if (live.length === 0) return null;
  // Knights taunt: enemies prefer knight allies if any are alive.
  if (actor.side === 'enemy') {
    const tanks = live.filter(u => u.class === 'knight');
    if (tanks.length > 0) return tanks[Math.floor(Math.random() * tanks.length)];
  }
  if (actor.class === 'rogue') {
    return [...live].sort((a, b) => a.hp - b.hp)[0];
  }
  return live[Math.floor(Math.random() * live.length)];
}

// performAction returns an ActionResult describing what should happen,
// without mutating HP. The orchestrator applies HP changes after the windup
// so the visuals and numbers are in sync.
// ActionResult: { kind, impacts: [{ target, dmg?, heal?, fx, fxVariant? }], label }
function performAction(actor) {
  const impacts = [];
  if (actor.class === 'healer') {
    const allies = liveUnits(actor.side);
    const wounded = allies.filter(u => u.hp < u.maxHp);
    if (wounded.length > 0) {
      const target = wounded.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      const amount = Math.round(actor.atk * 3);
      impacts.push({ target, heal: amount, fx: 'healer' });
      return { kind: 'heal', impacts, label: `${actor.name} heals ${target.name} for ${amount}` };
    }
    // Fall through if nobody wounded (no-op this turn)
    return { kind: 'noop', impacts: [], label: `${actor.name} stands ready` };
  }
  if (actor.class === 'mage') {
    const enemies = liveUnits(actor.side === 'ally' ? 'enemy' : 'ally');
    let fxVariant = 'arcane';
    if (/frost|ice|frozen/i.test(actor.name))       fxVariant = 'ice';
    else if (/pyro|fire|flame/i.test(actor.name))   fxVariant = 'fire';
    enemies.forEach(t => {
      const dmg = Math.max(1, Math.round(actor.atk * 0.75));
      impacts.push({ target: t, dmg, fx: 'mage', fxVariant });
    });
    return { kind: 'aoe', impacts, label: `${actor.name} casts on ${enemies.length} enemies` };
  }
  const target = pickTarget(actor);
  if (!target) return { kind: 'noop', impacts: [], label: '' };
  let dmg = actor.atk;
  if (actor.class === 'rogue')  dmg = Math.round(dmg * 1.3);
  if (actor.class === 'knight') dmg = Math.round(dmg * 0.9);
  dmg = Math.max(1, dmg);
  impacts.push({ target, dmg, fx: actor.class });
  return { kind: 'attack', impacts, label: `${actor.name} strikes ${target.name} for ${dmg}` };
}

function checkBattleEnd() {
  const alliesAlive = liveUnits('ally').length > 0;
  const enemiesAlive = liveUnits('enemy').length > 0;
  if (!alliesAlive || !enemiesAlive) {
    battle.over = true;
    battle.victory = alliesAlive;
    onBattleEnd();
    return true;
  }
  return false;
}

// ── Battle pacing constants ──
const TICK_GAP        = 900;  // full time budget per action turn
const WINDUP_MS       = 250;  // lunge anticipation before damage applies
const IMPACT_HOLD_MS  = 450;  // let flinch/FX play before next action

function scheduleNextTick() {
  if (!battle || battle.over) return;
  setTimeout(runBattleTick, TICK_GAP);
}

function runBattleTick() {
  if (!battle || battle.over) return;
  const actor = nextActor();
  if (!actor) return;

  battle.time = actor.nextAct;
  actor.nextAct += 100 / actor.spd;

  renderBattle(actor); // rebuild arena so previous turn's classes clear
  const result = performAction(actor);

  // Log the intended action
  if (result.label) logAction(result.label);

  // Windup: lunge the actor toward the target side BEFORE damage lands.
  setTimeout(() => {
    if (!battle) return;
    lungeActor(actor);
  }, 0);

  // Apply impact after the windup beat
  setTimeout(() => {
    if (!battle) return;
    applyImpacts(actor, result);
    // Healer passive: after each ally action, tick regen on the actor itself.
    if (actor.side === 'ally' && actor.regen && actor.hp > 0 && actor.hp < actor.maxHp) {
      actor.hp = Math.min(actor.maxHp, actor.hp + actor.regen);
      flashUnit(actor, `+${actor.regen}`, 'heal');
    }
  }, WINDUP_MS);

  // After the impact plays out, check for battle end or schedule next actor.
  setTimeout(() => {
    if (!battle) return;
    renderBattle(actor);
    if (checkBattleEnd()) return;
    scheduleNextTick();
  }, WINDUP_MS + IMPACT_HOLD_MS);
}

// Apply damage/heal, spawn FX, flinch/heal-glow targets, screen-shake for big hits.
function applyImpacts(actor, result) {
  if (!result || !result.impacts || result.impacts.length === 0) return;
  let killCount = 0;
  result.impacts.forEach(impact => {
    const { target, dmg, heal, fx, fxVariant } = impact;
    // Spawn the FX on the target (or on self for healer->target)
    spawnAttackFX(target, fx, fxVariant);
    if (dmg != null) {
      target.hp = Math.max(0, target.hp - dmg);
      flashUnit(target, `-${dmg}`, 'dmg');
      flinchUnit(target);
      if (target.hp <= 0) {
        killCount++;
        markUnitDying(target);
      }
    } else if (heal != null) {
      target.hp = Math.min(target.maxHp, target.hp + heal);
      flashUnit(target, `+${heal}`, 'heal');
      healGlowUnit(target);
    }
  });
  // Screen shake triggers
  const arena = document.getElementById('battleArena');
  if (!arena) return;
  if (killCount > 0) triggerShake(arena, 'heavy');
  else if (result.kind === 'aoe' && result.impacts.length >= 3) triggerShake(arena, 'light');
  else if (actor.rarity === 'epic') triggerShake(arena, 'light');
}

function triggerShake(arena, kind) {
  const cls = kind === 'heavy' ? 'shake-heavy' : 'shake-light';
  arena.classList.remove(cls);
  void arena.offsetWidth; // restart animation
  arena.classList.add(cls);
  setTimeout(() => arena.classList.remove(cls), 450);
}

function lungeActor(actor) {
  const el = unitEl(actor);
  if (!el) return;
  // Allies are on the bottom row, lunge up. Enemies on top, lunge down.
  el.classList.add(actor.side === 'ally' ? 'lunge-up' : 'lunge-down');
  setTimeout(() => el.classList.remove('lunge-up', 'lunge-down'), 240);
}

function flinchUnit(unit) {
  const el = unitEl(unit);
  if (!el) return;
  el.classList.remove('flinch');
  void el.offsetWidth;
  el.classList.add('flinch');
  setTimeout(() => el.classList.remove('flinch'), 340);
}

function healGlowUnit(unit) {
  const el = unitEl(unit);
  if (!el) return;
  el.classList.remove('heal-glow');
  void el.offsetWidth;
  el.classList.add('heal-glow');
  setTimeout(() => el.classList.remove('heal-glow'), 620);
}

function markUnitDying(unit) {
  const el = unitEl(unit);
  if (!el) return;
  el.classList.add('dying');
}

function unitEl(u) {
  return document.querySelector(`[data-uid="${u.side}-${u.slot}"]`);
}

// Spawn a class-specific FX div on the target's unit card.
function spawnAttackFX(target, fxClass, variant) {
  const el = unitEl(target);
  if (!el) return;
  let layer = el.querySelector('.fx-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'fx-layer';
    el.appendChild(layer);
  }
  const mk = (cls) => {
    const d = document.createElement('div');
    d.className = 'fx ' + cls;
    layer.appendChild(d);
    setTimeout(() => d.remove(), 1000);
    return d;
  };
  if (fxClass === 'knight') {
    mk('fx-shield-ring');
  } else if (fxClass === 'mage') {
    mk('fx-mage-wave ' + (variant || 'arcane'));
  } else if (fxClass === 'rogue') {
    mk('fx-smoke');
    mk('fx-slash');
  } else if (fxClass === 'healer') {
    // Spawn 5 sparkles at random x positions
    for (let i = 0; i < 5; i++) {
      const s = mk('fx-sparkle');
      s.style.left = (30 + Math.random() * 40) + '%';
      s.style.bottom = (10 + Math.random() * 20) + 'px';
      s.style.animationDelay = (i * 60) + 'ms';
    }
  }
}

function onBattleEnd() {
  let reward = 0;
  if (battle.victory) {
    if (battle.kind === 'stage') {
      const stage = battle.payload;
      const [c, s] = stage.id.split('-').map(Number);
      reward = 50 * c * s;
      if (!state.cleared[stage.id]) {
        state.cleared[stage.id] = true;
        const nextS = s + 1;
        if (nextS <= 5) {
          state.campaign = { chapter: c, stage: nextS };
        } else if (c < 3) {
          state.campaign = { chapter: c + 1, stage: 1 };
        }
        if (stage.id === '3-5') state.tower.unlocked = true;
      }
    } else if (battle.kind === 'tower') {
      const floor = battle.payload.floor;
      reward = 50 + 20 * floor;
      if (floor >= state.tower.floor) state.tower.floor = floor + 1;
      if (floor > state.tower.best) state.tower.best = floor;
    }
    state.gold += reward;
    setLog(`Victory! +${reward} gold.`);
  } else {
    setLog('Defeat. Strengthen your team and try again.');
  }
  saveState();
  showBattleEndscreen(battle.victory, reward);
}

// Full-screen victory/defeat sequence with tinted overlay, banner, reward, continue btn.
function showBattleEndscreen(victory, reward) {
  const arena = document.getElementById('battleArena');
  if (!arena) return;
  const screen = document.createElement('div');
  screen.className = 'battle-endscreen ' + (victory ? 'victory' : 'defeat');

  const banner = document.createElement('div');
  banner.className = 'battle-banner ' + (victory ? 'victory' : 'defeat');
  banner.textContent = victory ? 'VICTORY' : 'DEFEAT';
  screen.appendChild(banner);

  if (victory && reward > 0) {
    const rewardEl = document.createElement('div');
    rewardEl.className = 'battle-reward';
    rewardEl.textContent = '+' + reward + ' gold';
    screen.appendChild(rewardEl);
  }

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary battle-end-continue';
  btn.textContent = 'Continue';
  btn.onclick = endBattle;
  screen.appendChild(btn);

  arena.appendChild(screen);
}

// ───────────────────────────────────────────────
// Tower
// ───────────────────────────────────────────────

function generateTowerEnemies(floor) {
  // Pick random enemy kinds from the registry, scale level by floor.
  const kinds = Object.keys(ENEMY_KINDS).filter(k => !ENEMY_KINDS[k].isBoss);
  const level = Math.max(1, Math.ceil(floor * 1.2));
  const count = floor >= 10 ? 5 : (floor >= 5 ? 4 : 3);
  const out = [];
  for (let i = 0; i < count; i++) {
    const k = kinds[Math.floor(Math.random() * kinds.length)];
    const variant = rollEnemyVariant({ kind: k, level });
    variant.level = variant._level;
    out.push(variant);
  }
  return out;
}

// ───────────────────────────────────────────────
// Battle render
// ───────────────────────────────────────────────

function renderBattle(activeUnit) {
  if (!battle) return;
  const arena = document.getElementById('battleArena');
  const title = battle.kind === 'stage' ? battle.payload.name : `Tower — Floor ${battle.payload.floor}`;
  // Preserve any existing log message across re-renders
  const prevLog = (document.getElementById('battleLog') || {}).textContent || '';
  setHTML(arena, `
    <div style="text-align:center;font-family:'Courier New',monospace;font-size:.85rem;color:var(--text-muted)">${title}</div>
    <div class="turn-order" id="turnOrder"></div>
    <div class="battle-side" id="enemySide">${battle.enemies.map(u => unitHTML(u, activeUnit)).join('')}</div>
    <div class="battle-divider">— vs —</div>
    <div class="battle-side" id="allySide">${battle.allies.map(u => unitHTML(u, activeUnit)).join('')}</div>
    <div class="battle-log" id="battleLog">${prevLog}</div>
  `);
  renderTurnOrder(activeUnit);
}

// Render the next ~5 upcoming actors as small round pips.
function renderTurnOrder(activeUnit) {
  const el = document.getElementById('turnOrder');
  if (!el) return;
  const alive = [...battle.allies, ...battle.enemies].filter(u => u.hp > 0);
  if (alive.length === 0) return;
  // Simulate upcoming turns without mutating state.
  const sim = alive.map(u => ({ u, nextAct: u.nextAct }));
  const upcoming = [];
  for (let i = 0; i < 6 && sim.length > 0; i++) {
    sim.sort((a, b) => a.nextAct - b.nextAct);
    const pick = sim[0];
    upcoming.push(pick.u);
    pick.nextAct += 100 / pick.u.spd;
  }
  while (el.firstChild) el.removeChild(el.firstChild);
  const label = document.createElement('div');
  label.className = 'turn-order-label';
  label.textContent = 'Next';
  el.appendChild(label);
  upcoming.forEach((u, idx) => {
    const pip = document.createElement('div');
    pip.className = 'turn-pip ' + u.side + (idx === 0 && activeUnit === u ? ' current' : '');
    // Inline an icon
    const hero = u.side === 'ally' ? HEROES.find(h => h.name === u.name) : null;
    const slug = hero ? HERO_ICONS[hero.id] : (u.iconSlug || '');
    const tint = hero ? `tint-${hero.rarity}` : (u.iconTint || 'tint-A');
    pip.innerHTML = iconHTML(slug, tint, 18);
    el.appendChild(pip);
  });
}

function logAction(msg) {
  const el = document.getElementById('battleLog');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('fresh');
  void el.offsetWidth;
  el.classList.add('fresh');
}

function unitHTML(u, activeUnit) {
  const pct = Math.max(0, Math.round((u.hp / u.maxHp) * 100));
  const dead = u.hp <= 0 ? ' dead' : '';
  const active = (activeUnit && u === activeUnit) ? ' active' : '';
  const critical = pct > 0 && pct < 25 ? ' critical' : '';
  const lowClass = pct < 30 ? ' low' : '';
  // For allies, look up hero icon by id; for enemies use the rolled iconSlug/iconTint.
  let portraitHTML;
  if (u.side === 'ally') {
    const hero = HEROES.find(h => h.name === u.name);
    if (hero) portraitHTML = iconHTML(HERO_ICONS[hero.id], `tint-${hero.rarity}`, 40);
    else portraitHTML = iconHTML('', 'tint-basic', 40);
  } else {
    portraitHTML = iconHTML(u.iconSlug || '', u.iconTint || 'tint-A', 40);
  }
  return `
    <div class="battle-unit${dead}${active}" data-uid="${u.side}-${u.slot}">
      <div class="portrait">${portraitHTML}</div>
      <div class="name">${u.name}</div>
      <div class="hp-bar"><div class="hp-fill${lowClass}${critical}" style="width:${pct}%"></div></div>
      <div class="hp-text">${u.hp}/${u.maxHp}</div>
    </div>
  `;
}

function flashUnit(unit, text, kind) {
  const el = document.querySelector(`[data-uid="${unit.side}-${unit.slot}"]`);
  if (!el) return;
  const span = document.createElement('span');
  span.className = `float-num ${kind}`;
  span.textContent = text;
  el.appendChild(span);
  setTimeout(() => span.remove(), 1000);
}

// ───────────────────────────────────────────────
// Tab rendering
// ───────────────────────────────────────────────

function renderTeam() {
  const c = document.getElementById('tab-team');
  const slotCount = teamSlotCount();
  // Always render 4 slots; the 4th is locked with a hint if not yet unlocked.
  const slotsHTML = [0,1,2,3].map(i => {
    if (i >= slotCount) {
      return `<div class="team-slot locked"><div class="team-slot-empty">🔒 Clear 2-5 to unlock</div></div>`;
    }
    const id = state.team[i];
    if (!id) {
      return `<div class="team-slot" data-slot="${i}"><div class="team-slot-empty">+ Slot ${i + 1}</div></div>`;
    }
    const hero = heroById(id);
    const owned = state.owned[id];
    return `
      <div class="team-slot filled" data-slot="${i}">
        ${heroPortrait(hero)}
        <div class="hero-name">${hero.name}</div>
        <div class="hero-class">${hero.class}</div>
        <div class="hero-level">Lv ${owned.level}</div>
        <button class="btn btn-muted" data-clear-slot="${i}" style="font-size:.65rem;padding:3px 8px;margin-top:4px">Remove</button>
      </div>
    `;
  }).join('');
  // Group owned heroes by class; within each class sort by level desc, then HP desc.
  const classOrder = [
    { key: 'knight', label: 'Knights', color: 'var(--class-knight)' },
    { key: 'mage',   label: 'Mages',   color: 'var(--class-mage)'   },
    { key: 'rogue',  label: 'Rogues',  color: 'var(--class-rogue)'  },
    { key: 'healer', label: 'Healers', color: 'var(--class-healer)' },
  ];
  const owned = HEROES.filter(h => state.owned[h.id]);
  const sortWithin = arr => arr.sort((a, b) => {
    const la = state.owned[a.id].level, lb = state.owned[b.id].level;
    if (la !== lb) return lb - la;
    return heroStats(b, lb).hp - heroStats(a, la).hp;
  });
  const pickerHTML = owned.length
    ? classOrder.map(c => {
        const group = sortWithin(owned.filter(h => h.class === c.key));
        if (!group.length) return '';
        return `
          <div class="class-section" style="border-left:3px solid ${c.color}">
            <div class="class-section-header" style="color:${c.color}">${c.label} <span class="class-count">${group.length}</span></div>
            <div class="hero-grid">${group.map(h => heroCardHTML(h, state.owned[h.id])).join('')}</div>
          </div>
        `;
      }).join('')
    : '<p style="color:var(--text-muted);font-size:.8rem">No heroes yet. Visit the Summon tab.</p>';

  const passivesBlurb = `
    <div class="passives-box">
      <div class="passives-title">Class Passives (active if at least one in party)</div>
      <div class="passives-grid">
        <div><span style="color:var(--class-knight)">Knight</span> — party +10% max HP</div>
        <div><span style="color:var(--class-mage)">Mage</span> — +25% AoE damage</div>
        <div><span style="color:var(--class-rogue)">Rogue</span> — first-strike (acts before enemies)</div>
        <div><span style="color:var(--class-healer)">Healer</span> — party regen +3 HP per action</div>
      </div>
    </div>`;
  setHTML(c, `
    <h2>Your Team</h2>
    <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:12px">Pick ${slotCount} heroes for battle. Tap a slot, then tap a hero from your collection below.</p>
    <div class="team-slots slots-${slotCount}">${slotsHTML}</div>
    ${passivesBlurb}
    <h3 style="margin-top:20px">Collection</h3>
    <div class="hero-grid" id="teamPicker">${pickerHTML}</div>
  `);

  let pickingSlot = null;
  c.querySelectorAll('.team-slot').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.matches('[data-clear-slot]')) return;
      pickingSlot = parseInt(el.dataset.slot, 10);
      c.querySelectorAll('.team-slot').forEach(s => s.style.outline = '');
      el.style.outline = '2px solid var(--accent)';
    });
  });
  c.querySelectorAll('[data-clear-slot]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const i = parseInt(btn.dataset.clearSlot, 10);
      state.team[i] = null;
      saveState(); renderTeam();
    });
  });
  c.querySelectorAll('#teamPicker .hero-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.heroId;
      if (pickingSlot == null) {
        const empty = state.team.indexOf(null);
        if (empty === -1) { setLog('Pick a slot first to swap a hero.'); return; }
        pickingSlot = empty;
      }
      if (state.team.includes(id)) {
        const otherIdx = state.team.indexOf(id);
        state.team[otherIdx] = null;
      }
      state.team[pickingSlot] = id;
      pickingSlot = null;
      saveState(); renderTeam();
    });
  });
}

function renderSummon() {
  const c = document.getElementById('tab-summon');
  setHTML(c, `
    <h2>Summon Heroes</h2>
    <div class="summon-panel">
      <p style="font-size:.85rem">Spend gold to summon heroes. Duplicates become shards (${SHARDS_PER_LEVEL} = +1 level).</p>
      <div class="summon-rates">
        Common 70% &nbsp;·&nbsp; Rare 25% &nbsp;·&nbsp; Epic 5%<br>
        Soft pity: guaranteed Rare+ within ${PITY_SOFT_THRESHOLD + 1} pulls (current streak: ${state.gacha.pullsSinceRare})
      </div>
      <div class="summon-buttons">
        <button class="btn btn-gold" id="pull1Btn" ${state.gold < PULL_COST ? 'disabled' : ''}>×1 Summon (${PULL_COST}g)</button>
        <button class="btn btn-gold" id="pull10Btn" ${state.gold < PULL_COST_10 ? 'disabled' : ''}>×10 Summon (${PULL_COST_10}g)</button>
      </div>
    </div>
    <div id="summonResults"></div>
  `);
  document.getElementById('pull1Btn').onclick = () => handlePull(1);
  document.getElementById('pull10Btn').onclick = () => handlePull(10);
}

function handlePull(count) {
  const results = doPull(count);
  if (!results) { setLog('Not enough gold.'); return; }
  setLog(`Summoned ${count} hero${count > 1 ? 'es' : ''}.`);
  updateHeader();
  startPullReveal(results);
}

// ───────────────────────────────────────────────
// Pull reveal (slot-machine style)
// ───────────────────────────────────────────────

// Timing per rarity (ms)
const REVEAL_TIMING = {
  common: { roll: 700,  hold: 300 },
  rare:   { roll: 900,  hold: 800 },
  epic:   { roll: 1400, hold: 1600 },
};

let pullRevealTimers = [];
let pullRevealSkipped = false;

function startPullReveal(results) {
  pullRevealTimers.forEach(clearTimeout);
  pullRevealTimers = [];
  pullRevealSkipped = false;

  const overlay = document.getElementById('pullOverlay');
  const grid = document.getElementById('pullGrid');
  grid.className = 'pull-grid count-' + (results.length === 10 ? 10 : 1);
  while (grid.firstChild) grid.removeChild(grid.firstChild);
  overlay.classList.add('active');

  // Build empty slots up front
  results.forEach((_, i) => {
    const slot = document.createElement('div');
    slot.className = 'pull-slot';
    slot.dataset.idx = i;
    grid.appendChild(slot);
  });

  // Skip button wired every pull
  document.getElementById('pullSkipBtn').onclick = () => skipPullReveal(results);

  // Sequential reveals — each card rolls, snaps, then next starts.
  // Commons have short roll; Rare/Epic have longer roll + flash.
  let startDelay = 200;
  results.forEach((r, i) => {
    const rarity = r.hero.rarity;
    const tmg = REVEAL_TIMING[rarity];
    pullRevealTimers.push(setTimeout(() => {
      if (pullRevealSkipped) return;
      rollSlot(i, r, tmg);
    }, startDelay));
    startDelay += tmg.roll + tmg.hold;
  });
  // Show close button after the last card settles
  schedulePullCloseAfter(startDelay);
}

// Start the rolling animation on a slot, then snap to the actual result.
function rollSlot(idx, result, tmg) {
  const slot = document.querySelector(`.pull-slot[data-idx="${idx}"]`);
  if (!slot) return;

  // Rolling phase: cycle random hero silhouettes (all in gray tint)
  slot.classList.add('rolling');
  let rollStep = 0;
  const rollInterval = setInterval(() => {
    if (pullRevealSkipped) { clearInterval(rollInterval); return; }
    const rnd = HEROES[Math.floor(Math.random() * HEROES.length)];
    while (slot.firstChild) slot.removeChild(slot.firstChild);
    const portrait = document.createElement('div');
    portrait.innerHTML = iconHTML(HERO_ICONS[rnd.id], 'tint-basic', 56);
    slot.appendChild(portrait);
    rollStep++;
  }, 70);

  // After roll duration, stop and reveal
  pullRevealTimers.push(setTimeout(() => {
    clearInterval(rollInterval);
    if (pullRevealSkipped) return;
    revealSlot(idx, result);
  }, tmg.roll));
}

function revealSlot(idx, result) {
  const slot = document.querySelector(`.pull-slot[data-idx="${idx}"]`);
  if (!slot) return;
  const hero = result.hero;
  slot.classList.remove('rolling');
  slot.classList.add('revealed');
  if (hero.rarity === 'rare') slot.classList.add('reveal-rare');
  if (hero.rarity === 'epic') {
    slot.classList.add('reveal-epic');
    spawnEpicScreenFlash();
  }

  // Clear and render the actual hero card
  while (slot.firstChild) slot.removeChild(slot.firstChild);
  if (result.isNew) {
    const ribbon = document.createElement('div');
    ribbon.className = 'pull-new-ribbon';
    ribbon.textContent = 'NEW';
    slot.appendChild(ribbon);
  }
  const portrait = document.createElement('div');
  portrait.innerHTML = iconHTML(HERO_ICONS[hero.id], `tint-${hero.rarity}`, 64);
  slot.appendChild(portrait);

  const name = document.createElement('div');
  name.className = 'hero-name';
  name.textContent = hero.name;
  slot.appendChild(name);

  const cls = document.createElement('div');
  cls.className = 'hero-class';
  cls.textContent = hero.class;
  slot.appendChild(cls);

  const stars = document.createElement('div');
  stars.className = 'hero-stars rarity-' + hero.rarity;
  stars.textContent = '★'.repeat(RARITY[hero.rarity].stars);
  slot.appendChild(stars);

  if (!result.isNew) {
    const shard = document.createElement('div');
    shard.className = 'pull-shard-note';
    shard.textContent = '+1 shard';
    slot.appendChild(shard);
  }
}

function spawnEpicScreenFlash() {
  const flash = document.createElement('div');
  flash.className = 'epic-screen-flash';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 900);
}

// Skip: instantly reveal all remaining slots, stop timers, show close button.
function skipPullReveal(results) {
  pullRevealSkipped = true;
  pullRevealTimers.forEach(clearTimeout);
  pullRevealTimers = [];
  results.forEach((r, i) => {
    const slot = document.querySelector(`.pull-slot[data-idx="${i}"]`);
    if (!slot || slot.classList.contains('revealed')) return;
    revealSlot(i, r);
  });
  showPullCloseButton();
}

function showPullCloseButton() {
  const header = document.querySelector('.pull-header');
  if (header.querySelector('.pull-close')) return;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'pull-skip pull-close';
  closeBtn.textContent = 'Close';
  closeBtn.onclick = () => {
    document.getElementById('pullOverlay').classList.remove('active');
    closeBtn.remove();
    renderSummon();
  };
  header.appendChild(closeBtn);
}

// When the last card reveals, auto-show the close button.
function schedulePullCloseAfter(totalMs) {
  pullRevealTimers.push(setTimeout(() => {
    if (!pullRevealSkipped) showPullCloseButton();
  }, totalMs + 400));
}

function renderCampaign() {
  const c = document.getElementById('tab-campaign');
  const chaptersHTML = CAMPAIGN.map(ch => {
    const unlocked = ch.id <= state.campaign.chapter;
    const stagesHTML = ch.stages.map(st => {
      const cleared = !!state.cleared[st.id];
      const stageNum = parseInt(st.id.split('-')[1], 10);
      const isCurrent = state.campaign.chapter === ch.id && state.campaign.stage === stageNum;
      const accessible = unlocked && (cleared || stageNum <= state.campaign.stage);
      return `<button class="stage-btn ${cleared ? 'cleared' : ''} ${isCurrent && !cleared ? 'current' : ''}"
        ${accessible ? '' : 'disabled'} data-stage="${st.id}">
        ${st.id}${cleared ? ' ✓' : ''}<br><span style="font-size:.65rem">${st.name}</span>
      </button>`;
    }).join('');
    return `
      <div class="chapter" style="${unlocked ? '' : 'opacity:.4'}">
        <div class="chapter-name">Chapter ${ch.id}: ${ch.name}</div>
        <div class="stage-list">${stagesHTML}</div>
      </div>
    `;
  }).join('');
  setHTML(c, `<h2>Campaign</h2>${chaptersHTML}`);
  c.querySelectorAll('[data-stage]').forEach(btn => {
    btn.addEventListener('click', () => {
      const stageId = btn.dataset.stage;
      const ch = CAMPAIGN.find(ch => ch.stages.some(s => s.id === stageId));
      const stage = ch.stages.find(s => s.id === stageId);
      startBattle('stage', stage);
    });
  });
}

function renderTower() {
  const c = document.getElementById('tab-tower');
  if (!state.tower.unlocked) {
    setHTML(c, `<h2>Endless Tower</h2><p style="color:var(--text-muted)">Locked. Clear stage 3-5 to unlock.</p>`);
    return;
  }
  setHTML(c, `
    <h2>Endless Tower</h2>
    <div class="tower-panel">
      <p style="font-size:.85rem;color:var(--text-muted)">Each floor scales in difficulty. How high can you climb?</p>
      <div class="tower-floor">Floor ${state.tower.floor}</div>
      <p style="font-size:.75rem;color:var(--text-muted)">Best: Floor ${state.tower.best}</p>
      <button class="btn btn-gold" id="towerFightBtn" style="margin-top:10px">Fight Floor ${state.tower.floor}</button>
    </div>
  `);
  document.getElementById('towerFightBtn').onclick = () => startBattle('tower', { floor: state.tower.floor });
}

function renderCollection() {
  const c = document.getElementById('tab-collection');
  // Group all heroes (owned + locked) by class; owned first within class, sorted by level/HP.
  const classOrder = [
    { key: 'knight', label: 'Knights', color: 'var(--class-knight)' },
    { key: 'mage',   label: 'Mages',   color: 'var(--class-mage)'   },
    { key: 'rogue',  label: 'Rogues',  color: 'var(--class-rogue)'  },
    { key: 'healer', label: 'Healers', color: 'var(--class-healer)' },
  ];
  const sortHeroes = arr => arr.sort((a, b) => {
    const oa = !!state.owned[a.id], ob = !!state.owned[b.id];
    if (oa !== ob) return oa ? -1 : 1;
    if (!oa) return 0;
    const la = state.owned[a.id].level, lb = state.owned[b.id].level;
    if (la !== lb) return lb - la;
    return heroStats(b, lb).hp - heroStats(a, la).hp;
  });
  const sectionsHTML = classOrder.map(cl => {
    const group = sortHeroes(HEROES.filter(h => h.class === cl.key));
    if (!group.length) return '';
    const ownedInGroup = group.filter(h => state.owned[h.id]).length;
    return `
      <div class="class-section" style="border-left:3px solid ${cl.color}">
        <div class="class-section-header" style="color:${cl.color}">${cl.label} <span class="class-count">${ownedInGroup}/${group.length}</span></div>
        <div class="hero-grid">${group.map(h => heroCardHTML(h, state.owned[h.id])).join('')}</div>
      </div>
    `;
  }).join('');
  setHTML(c, `
    <h2>Collection (${ownedCount()}/${HEROES.length})</h2>
    <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:12px">Tap a hero you own to spend ${SHARDS_PER_LEVEL} shards on a level-up.</p>
    ${sectionsHTML}
  `);
  c.querySelectorAll('.hero-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.heroId;
      const owned = state.owned[id];
      if (!owned) return;
      const cap = RARITY[heroById(id).rarity].maxLevel;
      if (owned.level >= cap) { setLog('Max level reached.'); return; }
      if (owned.shards < SHARDS_PER_LEVEL) { setLog(`Need ${SHARDS_PER_LEVEL} shards (have ${owned.shards}).`); return; }
      owned.shards -= SHARDS_PER_LEVEL;
      owned.level++;
      const h = heroById(id);
      setLog(`${h.name} reached Lv ${owned.level}!`);
      saveState();
      renderCollection();
      updateHeader();
    });
  });
}

// ───────────────────────────────────────────────
// Tab switching
// ───────────────────────────────────────────────

let activeTab = 'team';

function switchTab(name) {
  activeTab = name;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.toggle('active', t.id === `tab-${name}`));
  renderActiveTab();
}

function renderActiveTab() {
  switch (activeTab) {
    case 'team':       renderTeam(); break;
    case 'summon':     renderSummon(); break;
    case 'campaign':   renderCampaign(); break;
    case 'tower':      renderTower(); break;
    case 'collection': renderCollection(); break;
  }
}

// ───────────────────────────────────────────────
// Init
// ───────────────────────────────────────────────

function init() {
  loadState();
  document.getElementById('tabNav').addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn || btn.disabled) return;
    switchTab(btn.dataset.tab);
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Reset all progress? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      updateHeader();
      renderActiveTab();
      setLog('Progress reset.');
    }
  });
  setLog(state.log);
  updateHeader();
  renderActiveTab();
}

document.addEventListener('DOMContentLoaded', init);
