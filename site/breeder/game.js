/* ═══════════════════════════════════════════════════════════════
   HORSE BREEDER — Game Logic (Phase 1: Genetics + Stable)
   ═══════════════════════════════════════════════════════════════ */
(() => {
'use strict';

const STORAGE_KEY = 'tnkr_horse_breeder';
const $ = id => document.getElementById(id);

/* ── Utility ─────────────────────────────────── */
function uid() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randRange(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }

function weightedPick(weights) {
  // weights = { key: probability, ... }
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function darkenColor(hex, factor) {
  // factor 0=black, 1=original
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * factor);
  const dg = Math.round(g * factor);
  const db = Math.round(b * factor);
  return '#' + [dr, dg, db].map(c => c.toString(16).padStart(2, '0')).join('');
}

function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b; // perceived brightness 0-1
}

function portraitBg(hex) {
  const lum = luminance(hex);
  // Dark horses get a light bg, light horses get a dark bg — high contrast
  if (lum < 0.15) return '#3a3a4a';
  if (lum < 0.3)  return '#2e2e3e';
  if (lum < 0.5)  return '#1a1a28';
  return '#0a0a14';
}

/* ── Genetics Engine ─────────────────────────── */

// Generate a random allele pair for a locus given breed allele pool
function randomAllelePair(locusKey, breedKey) {
  const pool = BREEDS[breedKey].allelePools[locusKey];
  return [weightedPick(pool), weightedPick(pool)];
}

// Mendelian inheritance: pick one allele from each parent
function inheritAllelePair(parentA, parentB, locusKey) {
  const a = parentA.genotype[locusKey][Math.random() < 0.5 ? 0 : 1];
  const b = parentB.genotype[locusKey][Math.random() < 0.5 ? 0 : 1];
  return [a, b];
}

// Check if genotype has at least one dominant allele
function hasDom(pair, dom) { return pair[0] === dom || pair[1] === dom; }
function isHomoRecessive(pair, rec) { return pair[0] === rec && pair[1] === rec; }
function countAllele(pair, allele) { return (pair[0] === allele ? 1 : 0) + (pair[1] === allele ? 1 : 0); }

// Resolve coat color phenotype from genotype
function resolveCoatColor(genotype, age) {
  const ext = genotype.extension;
  const agt = genotype.agouti;
  const crm = genotype.cream;
  const dun = genotype.dun;
  const gry = genotype.grey;
  const tob = genotype.tobiano;
  const ovr = genotype.overo;
  const rn  = genotype.roan;

  // Grey overrides everything visually (progressive with age)
  const isGrey = hasDom(gry, 'G');

  // Base color: Extension + Agouti
  let baseColor;
  if (isHomoRecessive(ext, 'e')) {
    baseColor = 'chestnut';
  } else if (hasDom(agt, 'A')) {
    baseColor = 'bay';
  } else {
    baseColor = 'black';
  }

  // Apply cream dilution
  const creamCount = countAllele(crm, 'Cr');
  if (creamCount === 2) {
    // Double dilute
    if (baseColor === 'chestnut') baseColor = 'cremello';
    else if (baseColor === 'bay') baseColor = 'perlino';
    else baseColor = 'smokyCream';
  } else if (creamCount === 1) {
    // Single dilute
    if (baseColor === 'chestnut') baseColor = 'palomino';
    else if (baseColor === 'bay') baseColor = 'buckskin';
    else baseColor = 'smokyBlack';
  }

  // Apply dun dilution
  const isDun = hasDom(dun, 'D');
  if (isDun && !baseColor.includes('crem') && !baseColor.includes('perl') && !baseColor.includes('smokyC')) {
    if (baseColor === 'bay' || baseColor === 'buckskin') baseColor = 'bayDun';
    else if (baseColor === 'black' || baseColor === 'smokyBlack') baseColor = 'grullo';
    else if (baseColor === 'chestnut' || baseColor === 'palomino') baseColor = 'redDun';
  }

  // Roan
  const isRoan = hasDom(rn, 'Rn');
  if (isRoan && !isGrey) {
    if (baseColor === 'bay' || baseColor === 'buckskin' || baseColor === 'bayDun') baseColor = 'bayRoan';
    else if (baseColor === 'black' || baseColor === 'smokyBlack' || baseColor === 'grullo') baseColor = 'blueRoan';
    else if (baseColor === 'chestnut' || baseColor === 'palomino' || baseColor === 'redDun') baseColor = 'redRoan';
  }

  // Grey override for display
  const displayColor = (isGrey && age > 2) ? 'grey' : baseColor;

  // Patterns
  const hasTobiano = hasDom(tob, 'T');
  const hasOvero = tob[0] !== tob[1] ? false : hasDom(ovr, 'O') && !isHomoRecessive(ovr, 'O'); // Oo = overo
  const isLethalWhite = countAllele(ovr, 'O') === 2; // OO

  const colorDef = COAT_COLORS[displayColor] || COAT_COLORS.bay;

  return {
    colorKey: displayColor,
    colorName: colorDef.name,
    bodyHex: colorDef.body,
    pointsHex: colorDef.points,
    maneHex: colorDef.mane,
    hasPoints: colorDef.points !== colorDef.body,
    isGrey,
    greyingAge: isGrey,
    hasTobiano,
    hasOvero: hasOvero && !isLethalWhite,
    hasRoan: isRoan && !isGrey,
    hasDun: isDun,
    isLethalWhite,
    fullName: buildColorName(displayColor, hasTobiano, hasOvero && !isLethalWhite, isRoan && !isGrey, isDun, isGrey),
  };
}

function buildColorName(base, tobiano, overo, roan, dun, grey) {
  const colorDef = COAT_COLORS[base] || COAT_COLORS.bay;
  let name = colorDef.name;
  if (grey) name = 'Grey';
  if (tobiano) name += ' Tobiano';
  if (overo) name += ' Overo';
  // roan and dun already in the base color name
  return name;
}

// Generate full genotype for a new wild horse
function generateGenotype(breedKey) {
  const geno = {};
  for (const locus of Object.keys(COAT_LOCI)) {
    geno[locus] = randomAllelePair(locus, breedKey);
  }
  return geno;
}

// Generate stat values for a wild horse
function generateStats(breedKey) {
  const breed = BREEDS[breedKey];
  const stats = {};
  for (const [key, range] of Object.entries(breed.stats)) {
    stats[key] = randRange(range[0], range[1]);
  }
  return stats;
}

function generateTalents(breedKey) {
  const breed = BREEDS[breedKey];
  const talents = {};
  for (const [key, range] of Object.entries(breed.talents)) {
    talents[key] = randRange(range[0], range[1]);
  }
  return talents;
}

function generateName() {
  return pick(NAME_PREFIXES) + pick(NAME_SUFFIXES);
}

function generateFaceMarking() {
  const r = Math.random();
  if (r < 0.3) return 'none';
  if (r < 0.5) return 'star';
  if (r < 0.65) return 'stripe';
  if (r < 0.8) return 'blaze';
  if (r < 0.9) return 'snip';
  return 'bald';
}

/* ── Create Horse ────────────────────────────── */
function createWildHorse(breedKey) {
  const genotype = generateGenotype(breedKey);
  const stats = generateStats(breedKey);
  const talents = generateTalents(breedKey);
  const age = randRange(2, 6);
  const coat = resolveCoatColor(genotype, age);

  // Lethal white check (OO overo is fatal)
  if (coat.isLethalWhite) {
    // Re-roll overo to avoid lethal
    genotype.overo = ['O', 'o'];
  }

  const finalCoat = coat.isLethalWhite ? resolveCoatColor(genotype, age) : coat;

  return {
    id: uid(),
    name: generateName(),
    breed: breedKey,
    breedLabel: BREEDS[breedKey].name,
    generation: 0,
    parentA: null,
    parentB: null,
    genotype,
    coat: finalCoat,
    faceMarking: generateFaceMarking(),
    stats,
    talents,
    age,
    happiness: 70 + randRange(0, 20),
    breedCooldown: 0,
    competeCooldown: 0,
    lastTrainedStat: null,
    trainStreak: 0,
    sex: Math.random() < 0.5 ? 'mare' : 'stallion',
  };
}

/* ── SVG Horse Renderer ──────────────────────── */
function blendColor(hex, targetHex, amount) {
  // Blend hex toward targetHex by amount (0=original, 1=target)
  const r1 = parseInt(hex.slice(1,3),16), g1 = parseInt(hex.slice(3,5),16), b1 = parseInt(hex.slice(5,7),16);
  const r2 = parseInt(targetHex.slice(1,3),16), g2 = parseInt(targetHex.slice(3,5),16), b2 = parseInt(targetHex.slice(5,7),16);
  const r = Math.round(r1 + (r2-r1)*amount), g = Math.round(g1 + (g2-g1)*amount), b = Math.round(b1 + (b2-b1)*amount);
  return '#' + [r,g,b].map(c => clamp(c,0,255).toString(16).padStart(2,'0')).join('');
}

function renderHorseSVG(horse) {
  const template = $('horseSvgTemplate');
  const svg = template.content.cloneNode(true).querySelector('svg');

  const coat = horse.coat;
  const body = coat.bodyHex;
  const mane = coat.maneHex;

  // Shading palette derived from the body color
  const bodyLight = blendColor(body, '#ffffff', 0.15);   // highlight
  const bodyMid   = body;                                  // main body
  const bodyShade = darkenColor(body, 0.82);               // shadow/underside
  const legColor  = coat.hasPoints ? coat.pointsHex : darkenColor(body, 0.75);
  const hoofColor = darkenColor(legColor, 0.5);

  // Body — main body fills
  svg.querySelectorAll('.horse-body').forEach(el => {
    el.setAttribute('fill', bodyMid);
  });

  // Body highlight — the large main body path gets a subtle lighter shade
  const bodyHighlight = svg.querySelector('.horse-body-highlight');
  if (bodyHighlight) bodyHighlight.setAttribute('fill', bodyLight);

  // Belly/shadow areas
  svg.querySelectorAll('.horse-body-shade').forEach(el => {
    el.setAttribute('fill', bodyShade);
  });

  // Mane & tail
  svg.querySelectorAll('.horse-mane').forEach(el => {
    el.setAttribute('fill', mane);
  });
  svg.querySelectorAll('.horse-tail').forEach(el => {
    el.setAttribute('fill', mane);
  });

  // Legs — points color for bays, darkened body for others
  svg.querySelectorAll('.horse-leg').forEach(el => {
    el.setAttribute('fill', legColor);
  });

  // Hooves
  svg.querySelectorAll('.horse-hoof').forEach(el => {
    el.setAttribute('fill', hoofColor);
  });

  // Nostril/mouth — always dark relative to face
  svg.querySelectorAll('.horse-nostril').forEach(el => {
    el.setAttribute('fill', darkenColor(body, 0.3));
  });

  // Tobiano patches
  if (coat.hasTobiano) {
    const tob = svg.querySelector('.horse-tobiano');
    if (tob) tob.setAttribute('opacity', '0.9');
  }

  // Roan overlay
  if (coat.hasRoan) {
    const roan = svg.querySelector('.horse-roan');
    if (roan) roan.setAttribute('opacity', '0.6');
  }

  // Face marking
  if (horse.faceMarking !== 'none') {
    const fm = svg.querySelector('.horse-face-marking');
    if (fm) fm.setAttribute('opacity', '1');
  }

  return svg.outerHTML;
}

/* ── Game State ───────────────────────────────── */
let state;

function defaultState() {
  return {
    day: 1,
    money: 500,
    reputation: 0,
    energy: 3,
    maxEnergy: 3,
    stable: [],
    stableCapacity: 4,
    nursery: [],
    nurseryCapacity: 1,
    buyers: [],
    maxBuyers: 3,
    bestiary: {},
    upgrades: {
      catchGear: 0,
      stableSize: 0,
      nurserySize: 0,
      trainingRing: 0,
      autoFeeder: 0,
      vetOnCall: 0,
      breedLicense: 0,
      coatGuide: 0,
      lineageTracker: 0,
      energyBoost: 0,
    },
    flags: {
      tutorialDone: false,
      firstBreed: false,
      firstSale: false,
    },
    eventLog: 'Your uncle left you a ranch, a questionable breeding license, and a horse named "Regret."',
    activeEvents: [], // { effect, daysLeft }
  };
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = JSON.parse(raw);
      // Re-resolve coat colors (they contain computed display data)
      state.stable.forEach(h => {
        h.coat = resolveCoatColor(h.genotype, h.age);
      });
      return true;
    }
  } catch {}
  return false;
}

function initGame() {
  if (!loadState()) {
    state = defaultState();
    // Seed with 2 starter horses
    const starter1 = createWildHorse('quarterHorse');
    starter1.name = 'Regret';
    starter1.age = 4;
    starter1.happiness = 65;

    const starter2 = createWildHorse('thoroughbred');
    starter2.age = 3;
    starter2.happiness = 75;

    state.stable.push(starter1, starter2);
    saveState();
  }
  renderAll();
}

/* ── Day Management ──────────────────────────── */
function endDay() {
  state.day++;
  state.energy = state.maxEnergy + (state.upgrades.energyBoost * 1);

  // Age horses (every 30 game-days = 1 year)
  state.stable.forEach(h => {
    // Simple: age in years, increment by fraction
    // For game purposes, age stays in years and we don't increment every day
  });

  // Happiness decay
  if (!state.upgrades.autoFeeder) {
    state.stable.forEach(h => {
      h.happiness = clamp(h.happiness - 2, 0, 100);
    });
  }

  // Breed cooldowns
  state.stable.forEach(h => {
    if (h.breedCooldown > 0) h.breedCooldown--;
    if (h.competeCooldown > 0) h.competeCooldown--;
    h.trainStreak = 0; // reset daily
  });

  // Nursery progress
  for (let i = state.nursery.length - 1; i >= 0; i--) {
    state.nursery[i].daysLeft--;
    if (state.nursery[i].daysLeft <= 0) {
      // Birth! Generate foal
      const entry = state.nursery[i];
      const foal = breedHorse(entry.parentAId, entry.parentBId);
      if (foal && state.stable.length < state.stableCapacity + (state.upgrades.stableSize * 4)) {
        state.stable.push(foal);
        state.eventLog = foal.name + ' was born! A ' + foal.coat.fullName + ' ' + foal.breedLabel + '.';
      }
      state.nursery.splice(i, 1);
    }
  }

  // Active events tick down
  state.activeEvents = state.activeEvents.filter(e => {
    e.daysLeft--;
    return e.daysLeft > 0;
  });

  // Random event (10% chance)
  if (Math.random() < 0.10) {
    triggerRandomEvent();
  }

  saveState();
  renderAll();
}

function triggerRandomEvent() {
  const totalWeight = RANDOM_EVENTS.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * totalWeight;
  let chosen = RANDOM_EVENTS[0];
  for (const evt of RANDOM_EVENTS) {
    r -= evt.weight;
    if (r <= 0) { chosen = evt; break; }
  }

  state.eventLog = chosen.text.replace('{biome}', 'Open Plains');
  if (chosen.duration > 0) {
    state.activeEvents.push({ effect: chosen.effect, daysLeft: chosen.duration });
  }

  // Immediate effects
  if (chosen.effect === 'inspection' && !state.upgrades.breedLicense && state.nursery.length > 0) {
    const fine = 100;
    state.money = Math.max(0, state.money - fine);
    state.eventLog += ' You were fined $' + fine + ' for unlicensed breeding!';
  }
}

/* ── Breeding ────────────────────────────────── */
function breedHorse(parentAId, parentBId) {
  const parentA = state.stable.find(h => h.id === parentAId);
  const parentB = state.stable.find(h => h.id === parentBId);
  if (!parentA || !parentB) return null;

  // Inherit genotype
  const genotype = {};
  for (const locus of Object.keys(COAT_LOCI)) {
    genotype[locus] = inheritAllelePair(parentA, parentB, locus);

    // Mutation check (2% per allele)
    for (let i = 0; i < 2; i++) {
      if (Math.random() < 0.02) {
        const alleles = COAT_LOCI[locus].alleles;
        genotype[locus][i] = pick(alleles);
      }
    }
  }

  // Lethal white check
  if (countAllele(genotype.overo, 'O') === 2) {
    // Sadly lethal — but in-game we just re-roll to Oo
    genotype.overo = ['O', 'o'];
    state.eventLog = 'A foal was lost to Lethal White Syndrome (OO). A tragic but educational moment.';
  }

  const coat = resolveCoatColor(genotype, 0);

  // Inherit stats (blend of parents + variance)
  const stats = {};
  const talents = {};
  for (const key of Object.keys(STAT_DEFS)) {
    // Talent: average of parents + random variance
    const tA = parentA.talents[key];
    const tB = parentB.talents[key];
    talents[key] = clamp(Math.round((tA + tB) / 2 + randRange(-8, 8)), 20, 100);

    // Starting stats: low (foal), based on talent
    stats[key] = clamp(Math.round(talents[key] * 0.3 + randRange(-5, 5)), 5, 50);
  }

  // Determine breed label
  let breedLabel, breedKey;
  if (parentA.breed === parentB.breed) {
    breedKey = parentA.breed;
    breedLabel = BREEDS[breedKey].name;
  } else {
    // Crossbreed
    breedKey = parentA.breed; // primary breed for stat lookups
    breedLabel = BREEDS[parentA.breed].name + '-' + BREEDS[parentB.breed].name + ' Cross';
  }

  return {
    id: uid(),
    name: generateName(),
    breed: breedKey,
    breedLabel,
    generation: Math.max(parentA.generation, parentB.generation) + 1,
    parentA: parentA.id,
    parentB: parentB.id,
    genotype,
    coat,
    faceMarking: generateFaceMarking(),
    stats,
    talents,
    age: 0,
    happiness: 85,
    breedCooldown: 0,
    competeCooldown: 0,
    lastTrainedStat: null,
    trainStreak: 0,
    sex: Math.random() < 0.5 ? 'mare' : 'stallion',
  };
}

/* ── UI Rendering ────────────────────────────── */

function renderAll() {
  renderHeader();
  renderStable();
  renderFooter();
  // Other tabs rendered on switch
}

function renderHeader() {
  $('dayDisplay').textContent = state.day;
  $('moneyDisplay').textContent = state.money;
  $('repDisplay').textContent = state.reputation;
  $('repFill').style.width = Math.min(100, state.reputation / 6) + '%'; // 600 = 100%
  $('energyDisplay').textContent = state.energy + '/' + (state.maxEnergy + state.upgrades.energyBoost);
}

function renderFooter() {
  $('eventLog').textContent = state.eventLog;
}

// ── Stable Tab ──

function renderStable() {
  const container = $('tab-stable');
  const cap = state.stableCapacity + state.upgrades.stableSize * 4;

  if (state.stable.length === 0) {
    container.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Your stable is empty. Go explore to catch some horses!';
    container.appendChild(empty);
    return;
  }

  // Build header
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px';
  const title = document.createElement('h2');
  title.textContent = 'Your Horses (' + state.stable.length + '/' + cap + ')';
  hdr.appendChild(title);

  container.textContent = '';
  container.appendChild(hdr);

  const grid = document.createElement('div');
  grid.className = 'card-grid';

  state.stable.forEach(horse => {
    grid.appendChild(createHorseCard(horse));
  });

  container.appendChild(grid);
}

function createHorseCard(horse) {
  const card = document.createElement('div');
  card.className = 'horse-card';
  card.style.borderLeftColor = horse.coat.bodyHex;
  card.dataset.horseId = horse.id;

  // Portrait
  const portrait = document.createElement('div');
  portrait.className = 'horse-portrait';
  portrait.style.background = portraitBg(horse.coat.bodyHex);
  portrait.insertAdjacentHTML('beforeend', renderHorseSVG(horse));

  // Info
  const info = document.createElement('div');
  info.className = 'horse-info';

  const nameRow = document.createElement('div');
  nameRow.className = 'horse-name';
  nameRow.textContent = horse.name;
  info.appendChild(nameRow);

  const breedRow = document.createElement('div');
  breedRow.className = 'horse-breed';
  breedRow.textContent = horse.breedLabel + ' \u2022 ' + horse.sex + ' \u2022 Gen ' + horse.generation;
  info.appendChild(breedRow);

  const coatRow = document.createElement('div');
  coatRow.className = 'horse-coat';
  coatRow.textContent = horse.coat.fullName;
  info.appendChild(coatRow);

  const ageRow = document.createElement('div');
  ageRow.className = 'horse-age';
  ageRow.textContent = 'Age: ' + horse.age + 'yr' + (horse.breedCooldown > 0 ? ' \u2022 Breed CD: ' + horse.breedCooldown + 'd' : '');
  info.appendChild(ageRow);

  // Stat bars
  const bars = document.createElement('div');
  bars.className = 'stat-bars';
  for (const [key, def] of Object.entries(STAT_DEFS)) {
    const row = document.createElement('div');
    row.className = 'stat-row';

    const label = document.createElement('span');
    label.className = 'stat-label';
    label.textContent = def.name;

    const track = document.createElement('div');
    track.className = 'stat-track';
    const fill = document.createElement('div');
    fill.className = 'stat-fill';
    fill.style.width = horse.stats[key] + '%';
    fill.style.background = 'rgb(' + STAT_COLORS[key] + ')';
    track.appendChild(fill);

    const val = document.createElement('span');
    val.className = 'stat-val';
    val.textContent = horse.stats[key];

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(val);
    bars.appendChild(row);
  }
  info.appendChild(bars);

  // Happiness
  const happy = document.createElement('div');
  happy.className = 'happiness';
  const happyIcon = horse.happiness > 70 ? '\u2764' : horse.happiness > 40 ? '\uD83D\uDE10' : '\uD83D\uDE1E';
  const moodPool = horse.happiness > 70 ? MOOD_TEXTS.high
    : horse.happiness > 40 ? MOOD_TEXTS.medium
    : horse.happiness > 0 ? MOOD_TEXTS.low
    : MOOD_TEXTS.zero;
  // Use horse id hash to get consistent mood text
  const moodIdx = horse.id.charCodeAt(0) % moodPool.length;
  happy.textContent = happyIcon + ' ' + horse.happiness + '% \u2022 ' + horse.name + ' ' + moodPool[moodIdx];
  info.appendChild(happy);

  card.appendChild(portrait);
  card.appendChild(info);

  // Click to expand
  card.addEventListener('click', () => toggleHorseDetail(card, horse));

  return card;
}

function toggleHorseDetail(card, horse) {
  const existing = card.querySelector('.horse-detail');
  if (existing) {
    existing.remove();
    card.classList.remove('expanded');
    return;
  }

  card.classList.add('expanded');
  const detail = document.createElement('div');
  detail.className = 'horse-detail';

  // Lineage
  if (horse.parentA || horse.parentB) {
    const lin = document.createElement('div');
    lin.className = 'lineage';
    const pA = horse.parentA ? state.stable.find(h => h.id === horse.parentA) : null;
    const pB = horse.parentB ? state.stable.find(h => h.id === horse.parentB) : null;
    lin.textContent = 'Parents: ' + (pA ? pA.name : 'Unknown') + ' x ' + (pB ? pB.name : 'Unknown');
    detail.appendChild(lin);
  } else {
    const lin = document.createElement('div');
    lin.className = 'lineage';
    lin.textContent = 'Wild-caught';
    detail.appendChild(lin);
  }

  // Genotype (if player has coat guide upgrade)
  if (state.upgrades.coatGuide) {
    const geno = document.createElement('div');
    geno.className = 'genotype';
    let text = '';
    for (const [locus, pair] of Object.entries(horse.genotype)) {
      text += COAT_LOCI[locus].name.split(' ')[0] + ': ' + pair.join('/') + '  ';
    }
    geno.textContent = text;
    detail.appendChild(geno);
  }

  // Actions
  const actions = document.createElement('div');
  actions.className = 'actions';

  const renameBtn = document.createElement('button');
  renameBtn.className = 'btn btn-muted';
  renameBtn.textContent = 'Rename';
  renameBtn.addEventListener('click', e => {
    e.stopPropagation();
    const newName = prompt('Enter new name for ' + horse.name + ':', horse.name);
    if (newName && newName.trim()) {
      horse.name = newName.trim();
      saveState();
      renderStable();
    }
  });

  const releaseBtn = document.createElement('button');
  releaseBtn.className = 'btn btn-danger';
  releaseBtn.textContent = 'Release';
  releaseBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (confirm('Release ' + horse.name + ' into the wild? This cannot be undone.')) {
      state.stable = state.stable.filter(h => h.id !== horse.id);
      saveState();
      renderStable();
    }
  });

  actions.appendChild(renameBtn);
  actions.appendChild(releaseBtn);
  detail.appendChild(actions);

  card.appendChild(detail);
}

/* ── Tab Navigation ──────────────────────────── */
const tabNav = $('tabNav');
tabNav.addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  const tabId = btn.dataset.tab;

  // Switch active button
  tabNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Switch active content
  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  const tabEl = $('tab-' + tabId);
  if (tabEl) tabEl.classList.add('active');

  // Render tab content
  switch (tabId) {
    case 'stable':  renderStable(); break;
    case 'breed':   renderBreedTab(); break;
    case 'train':   renderTrainTab(); break;
    case 'explore': renderExploreTab(); break;
    case 'market':  renderMarketTab(); break;
    case 'upgrades':renderUpgradesTab(); break;
  }
});

/* ── Placeholder Tab Renders (Phase 2+) ──────── */
function renderBreedTab() {
  const c = $('tab-breed');
  c.textContent = '';
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.textContent = 'Breeding coming in Phase 3. For now, enjoy your starter horses!';
  c.appendChild(el);
}

function renderTrainTab() {
  const c = $('tab-train');
  c.textContent = '';
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.textContent = 'Training coming in Phase 4. Patience, young rancher.';
  c.appendChild(el);
}

function renderExploreTab() {
  const c = $('tab-explore');
  c.textContent = '';
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.textContent = 'Exploration coming in Phase 2. The plains await...';
  c.appendChild(el);
}

function renderMarketTab() {
  const c = $('tab-market');
  c.textContent = '';
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.textContent = 'Market coming in Phase 5. Build your herd first!';
  c.appendChild(el);
}

function renderUpgradesTab() {
  const c = $('tab-upgrades');
  c.textContent = '';
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.textContent = 'Upgrades coming in Phase 6. Save your money...';
  c.appendChild(el);
}

/* ── Event Wiring ────────────────────────────── */
$('endDayBtn').addEventListener('click', endDay);

/* ── Modal ───────────────────────────────────── */
function showModal(content) {
  const overlay = $('modalOverlay');
  const modal = $('modalContent');
  modal.textContent = '';
  if (typeof content === 'string') {
    modal.insertAdjacentHTML('beforeend', content);
  } else {
    modal.appendChild(content);
  }
  overlay.classList.add('active');
}

function hideModal() {
  $('modalOverlay').classList.remove('active');
}

$('modalOverlay').addEventListener('click', e => {
  if (e.target === $('modalOverlay')) hideModal();
});

/* ── New Game / Reset ────────────────────────── */
// Accessible via console: resetGame()
window.resetGame = function() {
  if (confirm('Start a new game? All progress will be lost.')) {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    const starter1 = createWildHorse('quarterHorse');
    starter1.name = 'Regret';
    starter1.age = 4;
    starter1.happiness = 65;
    const starter2 = createWildHorse('thoroughbred');
    starter2.age = 3;
    starter2.happiness = 75;
    state.stable.push(starter1, starter2);
    saveState();
    renderAll();
  }
};

/* ── Init ────────────────────────────────────── */
initGame();

})();
