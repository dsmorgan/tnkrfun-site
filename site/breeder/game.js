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
  checkOverCapacity();
}

/* ── Day Management ──────────────────────────── */
function endDay() {
  const daySummary = [];
  state.day++;
  state.energy = state.maxEnergy + (state.upgrades.energyBoost * 1);

  daySummary.push('Energy restored to ' + state.energy + '.');

  // Age horses (every 30 game-days = 1 year)
  state.stable.forEach(h => {
    // Simple: age in years, increment by fraction
    // For game purposes, age stays in years and we don't increment every day
  });

  // Happiness decay
  if (!state.upgrades.autoFeeder) {
    let unhappy = 0;
    state.stable.forEach(h => {
      h.happiness = clamp(h.happiness - 2, 0, 100);
      if (h.happiness <= 20) unhappy++;
    });
    if (unhappy > 0) daySummary.push(unhappy + ' horse' + (unhappy > 1 ? 's are' : ' is') + ' unhappy!');
  }

  // Breed cooldowns
  state.stable.forEach(h => {
    if (h.breedCooldown > 0) h.breedCooldown--;
    if (h.competeCooldown > 0) h.competeCooldown--;
    h.trainStreak = 0; // reset daily
  });

  // Nursery progress — foals always born, never lost
  const newFoals = [];
  for (let i = state.nursery.length - 1; i >= 0; i--) {
    state.nursery[i].daysLeft--;
    if (state.nursery[i].daysLeft <= 0) {
      const entry = state.nursery[i];
      const foal = breedHorse(entry.parentAId, entry.parentBId);
      if (foal) {
        state.stable.push(foal);
        newFoals.push(foal);
      }
      state.nursery.splice(i, 1);
    }
  }
  newFoals.forEach(f => {
    daySummary.push('\uD83C\uDF89 ' + f.name + ' was born! A ' + f.coat.fullName + ' ' + f.breedLabel + '.');
  });

  // Nursery in progress
  state.nursery.forEach(n => {
    if (n.daysLeft > 0) {
      const pA = state.stable.find(h => h.id === n.parentAId);
      const pB = state.stable.find(h => h.id === n.parentBId);
      daySummary.push('Foal from ' + (pA ? pA.name : '?') + ' \u00D7 ' + (pB ? pB.name : '?') + ': ' + n.daysLeft + ' day' + (n.daysLeft !== 1 ? 's' : '') + ' left.');
    }
  });

  // Rotate buyers: expire old ones, add new
  state.buyers = state.buyers.filter(b => {
    b.daysLeft--;
    return b.daysLeft > 0;
  });
  const maxBuyers = state.maxBuyers + (hasActiveEvent('buyerRush') ? 2 : 0);
  while (state.buyers.length < maxBuyers) {
    state.buyers.push(generateBuyer());
  }

  // Active events tick down
  state.activeEvents = state.activeEvents.filter(e => {
    e.daysLeft--;
    return e.daysLeft > 0;
  });

  // Random event (10% chance)
  if (Math.random() < 0.10) {
    triggerRandomEvent();
    daySummary.push(state.eventLog);
  }

  // Set event log to last notable thing
  if (newFoals.length > 0) {
    state.eventLog = newFoals.map(f => f.name + ' was born!').join(' ');
  } else if (daySummary.length <= 1) {
    state.eventLog = 'A quiet day on the ranch.';
    daySummary.push('A quiet day on the ranch.');
  }

  saveState();
  renderAll();

  // Show day summary modal
  showDaySummary(daySummary, newFoals);

  // Check if stable is over capacity — force player to release (after modal dismissed)
}

function showDaySummary(summary, newFoals) {
  const modal = document.createElement('div');

  const title = document.createElement('h2');
  title.style.cssText = 'color:var(--accent);margin-bottom:4px';
  title.textContent = 'Day ' + state.day;
  modal.appendChild(title);

  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:.75rem;color:var(--text-muted);margin-bottom:12px;font-family:"Courier New",monospace';
  sub.textContent = '$' + state.money + ' \u2022 Rep ' + state.reputation + ' \u2022 Stable ' + state.stable.length + '/' + getStableCap();
  modal.appendChild(sub);

  // Events list
  summary.forEach(text => {
    const line = document.createElement('div');
    line.style.cssText = 'font-size:.85rem;margin-bottom:6px;padding-left:8px;border-left:2px solid var(--border)';
    // Highlight foal births
    if (text.includes('born')) {
      line.style.borderLeftColor = 'var(--gold)';
      line.style.color = 'var(--gold)';
    }
    line.textContent = text;
    modal.appendChild(line);
  });

  // Show new foal portraits if any
  if (newFoals && newFoals.length > 0) {
    const foalSection = document.createElement('div');
    foalSection.style.cssText = 'display:flex;gap:10px;margin-top:12px;flex-wrap:wrap';
    newFoals.forEach(foal => {
      const card = document.createElement('div');
      card.style.cssText = 'display:flex;align-items:center;gap:8px;background:var(--bg-card);border-radius:var(--radius);padding:8px 10px;border-left:3px solid var(--gold)';

      const portrait = document.createElement('div');
      portrait.className = 'horse-portrait';
      portrait.style.cssText = 'width:48px;height:48px;background:' + portraitBg(foal.coat.bodyHex);
      portrait.insertAdjacentHTML('beforeend', renderHorseSVG(foal));
      card.appendChild(portrait);

      const info = document.createElement('div');
      const nameLine = document.createElement('div');
      nameLine.style.cssText = 'font-size:.8rem;font-weight:600';
      nameLine.textContent = foal.name;
      info.appendChild(nameLine);
      const detailLine = document.createElement('div');
      detailLine.style.cssText = 'font-size:.7rem;color:var(--text-muted)';
      detailLine.textContent = foal.coat.fullName + ' ' + foal.breedLabel;
      info.appendChild(detailLine);
      card.appendChild(info);

      foalSection.appendChild(card);
    });
    modal.appendChild(foalSection);
  }

  // Continue button
  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.style.marginTop = '16px';
  btn.textContent = 'CONTINUE';
  btn.addEventListener('click', () => {
    hideModal();
    // Re-render the currently active tab
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) activeTab.click();
    // Check over-capacity after dismissing summary
    checkOverCapacity();
  });
  modal.appendChild(btn);

  showModal(modal);
}

function isPregnantMare(horse) {
  if (horse.sex !== 'mare') return false;
  // Check if this mare is a parent in any active nursery entry
  // Convention: parentB is always the mare (we'll enforce this in startBreeding)
  // But to be safe, check both slots
  return state.nursery.some(n => n.parentAId === horse.id || n.parentBId === horse.id);
}

function checkOverCapacity() {
  const cap = getStableCap();
  if (state.stable.length <= cap) return;

  const excess = state.stable.length - cap;
  showForceRelease(excess);
}

function showForceRelease(excess) {
  const modal = document.createElement('div');

  const title = document.createElement('h2');
  title.style.color = 'var(--red)';
  title.textContent = 'Stable Over Capacity!';
  modal.appendChild(title);

  const desc = document.createElement('p');
  desc.style.cssText = 'font-size:.85rem;color:var(--text-muted);margin:8px 0 12px';
  desc.textContent = 'Your stable has ' + state.stable.length + ' horses but only ' + getStableCap() + ' slots. You must release ' + excess + ' horse' + (excess > 1 ? 's' : '') + ' to continue. New foals cannot be turned away!';
  modal.appendChild(desc);

  const counter = document.createElement('div');
  counter.style.cssText = 'font-family:"Courier New",monospace;font-size:.9rem;color:var(--gold);margin-bottom:12px';
  counter.textContent = 'Need to release: ' + excess + ' more';
  counter.id = 'releaseCounter';
  modal.appendChild(counter);

  state.stable.forEach(horse => {
    const card = document.createElement('div');
    card.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px;margin-bottom:6px;background:var(--bg-card);border-radius:var(--radius);border-left:3px solid ' + horse.coat.bodyHex;

    const portrait = document.createElement('div');
    portrait.className = 'horse-portrait';
    portrait.style.cssText = 'width:48px;height:48px;background:' + portraitBg(horse.coat.bodyHex) + ';flex-shrink:0';
    portrait.insertAdjacentHTML('beforeend', renderHorseSVG(horse));
    card.appendChild(portrait);

    const info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0';
    const nameLine = document.createElement('div');
    nameLine.style.cssText = 'font-size:.8rem;font-weight:600';
    nameLine.textContent = horse.name;
    info.appendChild(nameLine);
    const detailLine = document.createElement('div');
    detailLine.style.cssText = 'font-size:.7rem;color:var(--text-muted)';
    detailLine.textContent = horse.coat.fullName + ' ' + horse.breedLabel + ' \u2022 ' + horse.sex + ' \u2022 Age ' + horse.age;
    info.appendChild(detailLine);
    card.appendChild(info);

    const pregnant = isPregnantMare(horse);
    const releaseBtn = document.createElement('button');
    releaseBtn.className = pregnant ? 'btn btn-muted' : 'btn btn-danger';
    releaseBtn.style.cssText = 'font-size:.7rem;padding:4px 10px;flex-shrink:0';
    releaseBtn.textContent = pregnant ? 'Pregnant' : 'Release';
    releaseBtn.disabled = pregnant;
    if (pregnant) releaseBtn.title = 'Cannot release a pregnant mare';
    releaseBtn.addEventListener('click', () => {
      if (pregnant) return;
      state.stable = state.stable.filter(h => h.id !== horse.id);
      saveState();
      renderAll();

      const remaining = state.stable.length - getStableCap();
      if (remaining <= 0) {
        hideModal();
        state.eventLog = 'Stable is back to capacity.';
        renderAll();
      } else {
        // Re-render the modal with updated count
        hideModal();
        showForceRelease(remaining);
      }
    });
    card.appendChild(releaseBtn);

    modal.appendChild(card);
  });

  // Show modal — not dismissable by clicking outside
  const overlay = $('modalOverlay');
  const modalEl = $('modalContent');
  modalEl.textContent = '';
  modalEl.appendChild(modal);
  overlay.classList.add('active');
  // Temporarily disable backdrop click
  overlay.dataset.locked = 'true';
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
  const isPreg = isPregnantMare(horse);
  let ageText = 'Age: ' + horse.age + 'yr';
  if (isPreg) {
    ageText += ' \u2022 \uD83E\uDD30 Pregnant';
  } else if (horse.breedCooldown > 0) {
    ageText += ' \u2022 Breed CD: ' + horse.breedCooldown + 'd';
  }
  ageRow.textContent = ageText;
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

  const pregnant = isPregnantMare(horse);
  const releaseBtn = document.createElement('button');
  releaseBtn.className = pregnant ? 'btn btn-muted' : 'btn btn-danger';
  releaseBtn.textContent = pregnant ? 'Pregnant' : 'Release';
  releaseBtn.disabled = pregnant;
  if (pregnant) releaseBtn.title = 'Cannot release a pregnant mare';
  releaseBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (pregnant) return;
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

/* ── Breed Tab ────────────────────────────────── */
let breedSlotA = null; // horse id
let breedSlotB = null;

function getNurseryCap() {
  return state.nurseryCapacity + state.upgrades.nurserySize;
}

function canBreed(horse) {
  return horse.breedCooldown <= 0 && horse.age >= 2;
}

function predictBreeding(parentA, parentB) {
  // Simulate possible coat colors from parent genotypes
  const possibleColors = {};
  const SIMS = 50;
  for (let i = 0; i < SIMS; i++) {
    const geno = {};
    for (const locus of Object.keys(COAT_LOCI)) {
      geno[locus] = [
        parentA.genotype[locus][Math.random() < 0.5 ? 0 : 1],
        parentB.genotype[locus][Math.random() < 0.5 ? 0 : 1],
      ];
    }
    const coat = resolveCoatColor(geno, 2);
    possibleColors[coat.fullName] = (possibleColors[coat.fullName] || 0) + 1;
  }

  // Sort by frequency
  const sorted = Object.entries(possibleColors).sort((a, b) => b[1] - a[1]);
  const predictions = sorted.map(([name, count]) => ({
    name,
    pct: Math.round((count / SIMS) * 100),
  }));

  // Stat talent prediction
  const statPredictions = {};
  for (const key of Object.keys(STAT_DEFS)) {
    const avg = Math.round((parentA.talents[key] + parentB.talents[key]) / 2);
    statPredictions[key] = { min: clamp(avg - 8, 20, 100), max: clamp(avg + 8, 20, 100), avg };
  }

  // Breed label
  let breedLabel;
  if (parentA.breed === parentB.breed) {
    breedLabel = BREEDS[parentA.breed].name;
  } else {
    breedLabel = BREEDS[parentA.breed].name + '-' + BREEDS[parentB.breed].name + ' Cross';
  }

  return { colors: predictions, stats: statPredictions, breedLabel };
}

function renderBreedTab() {
  const c = $('tab-breed');
  c.textContent = '';

  const hdr = document.createElement('h2');
  hdr.textContent = 'Breeding';
  c.appendChild(hdr);

  // License warning
  if (!state.upgrades.breedLicense) {
    const warn = document.createElement('div');
    warn.style.cssText = 'background:rgba(255,68,68,.08);border:1px solid rgba(255,68,68,.3);border-radius:var(--radius);padding:8px 12px;margin-bottom:12px;font-size:.8rem;color:var(--red)';
    warn.textContent = 'You don\'t have a breeding license! Breeding risks fines from inspectors. Buy one in Upgrades.';
    c.appendChild(warn);
  }

  // Parent slots
  const slots = document.createElement('div');
  slots.className = 'breed-slots';

  slots.appendChild(createBreedSlot('A', breedSlotA));

  const conn = document.createElement('div');
  conn.className = 'breed-connector';
  conn.textContent = '\u00D7'; // multiplication sign
  slots.appendChild(conn);

  slots.appendChild(createBreedSlot('B', breedSlotB));

  c.appendChild(slots);

  // Prediction panel (if both parents selected)
  const parentA = breedSlotA ? state.stable.find(h => h.id === breedSlotA) : null;
  const parentB = breedSlotB ? state.stable.find(h => h.id === breedSlotB) : null;

  if (parentA && parentB && parentA.sex === parentB.sex) {
    const warn = document.createElement('div');
    warn.style.cssText = 'background:rgba(255,68,68,.08);border:1px solid rgba(255,68,68,.3);border-radius:var(--radius);padding:10px 12px;font-size:.85rem;color:var(--red);margin-bottom:12px';
    warn.textContent = 'Breeding requires one mare and one stallion. Select a ' + (parentA.sex === 'mare' ? 'stallion' : 'mare') + ' for the other slot.';
    c.appendChild(warn);
  }

  if (parentA && parentB && parentA.sex !== parentB.sex) {
    const pred = predictBreeding(parentA, parentB);
    const panel = document.createElement('div');
    panel.className = 'prediction-panel';

    const predTitle = document.createElement('h3');
    predTitle.style.color = 'var(--gold)';
    predTitle.textContent = 'Foal Prediction: ' + pred.breedLabel;
    panel.appendChild(predTitle);

    // Color predictions
    const colorSection = document.createElement('div');
    colorSection.style.cssText = 'margin:8px 0;font-size:.8rem';
    const colorLabel = document.createElement('div');
    colorLabel.style.cssText = 'color:var(--text-muted);margin-bottom:4px;font-size:.7rem';
    colorLabel.textContent = 'POSSIBLE COAT COLORS:';
    colorSection.appendChild(colorLabel);

    pred.colors.forEach(({ name, pct }) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:2px';
      const bar = document.createElement('div');
      bar.style.cssText = 'width:' + Math.max(pct, 4) + '%;height:6px;background:var(--gold);border-radius:3px;min-width:4px;max-width:120px';
      const label = document.createElement('span');
      label.style.cssText = 'font-family:"Courier New",monospace;font-size:.75rem';
      label.textContent = name + ' (' + pct + '%)';
      row.appendChild(bar);
      row.appendChild(label);
      colorSection.appendChild(row);
    });
    panel.appendChild(colorSection);

    // Stat talent predictions
    const statSection = document.createElement('div');
    statSection.style.cssText = 'margin:8px 0';
    const statLabel = document.createElement('div');
    statLabel.style.cssText = 'color:var(--text-muted);margin-bottom:4px;font-size:.7rem';
    statLabel.textContent = 'TALENT POTENTIAL (foal ceiling):';
    statSection.appendChild(statLabel);

    for (const [key, p] of Object.entries(pred.stats)) {
      const row = document.createElement('div');
      row.className = 'stat-row';

      const lbl = document.createElement('span');
      lbl.className = 'stat-label';
      lbl.textContent = STAT_DEFS[key].name;

      const track = document.createElement('div');
      track.className = 'stat-track';
      // Show range as a bar from min to max
      const fill = document.createElement('div');
      fill.style.cssText = 'height:100%;border-radius:3px;background:rgb(' + STAT_COLORS[key] + ');margin-left:' + p.min + '%;width:' + (p.max - p.min) + '%';
      track.appendChild(fill);

      const val = document.createElement('span');
      val.className = 'stat-val';
      val.textContent = p.min + '-' + p.max;
      val.style.width = '40px';

      row.appendChild(lbl);
      row.appendChild(track);
      row.appendChild(val);
      statSection.appendChild(row);
    }
    panel.appendChild(statSection);

    // Breed button
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:12px';

    const breedBtn = document.createElement('button');
    breedBtn.className = 'btn btn-gold';
    breedBtn.textContent = 'BEGIN BREEDING (1 Energy, ~5 days)';

    const nurseryFull = state.nursery.length >= getNurseryCap();
    const stableFull = state.stable.length >= getStableCap();
    const noEnergy = state.energy < 1;

    breedBtn.disabled = nurseryFull || stableFull || noEnergy;
    breedBtn.addEventListener('click', () => {
      startBreeding(parentA, parentB);
    });
    btnRow.appendChild(breedBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-muted';
    clearBtn.textContent = 'CLEAR';
    clearBtn.addEventListener('click', () => {
      breedSlotA = null;
      breedSlotB = null;
      renderBreedTab();
    });
    btnRow.appendChild(clearBtn);

    panel.appendChild(btnRow);

    if (nurseryFull) {
      const w = document.createElement('div');
      w.style.cssText = 'font-size:.75rem;color:var(--red);margin-top:6px';
      w.textContent = 'Nursery full (' + state.nursery.length + '/' + getNurseryCap() + '). Wait for a foal to be born or upgrade.';
      panel.appendChild(w);
    }
    if (stableFull) {
      const w = document.createElement('div');
      w.style.cssText = 'font-size:.75rem;color:var(--red);margin-top:6px';
      w.textContent = 'Stable full! Release a horse or upgrade before breeding.';
      panel.appendChild(w);
    }
    if (noEnergy) {
      const w = document.createElement('div');
      w.style.cssText = 'font-size:.75rem;color:var(--red);margin-top:6px';
      w.textContent = 'Not enough energy. End the day to restore.';
      panel.appendChild(w);
    }

    c.appendChild(panel);
  }

  // Active nursery
  if (state.nursery.length > 0) {
    const nurseryTitle = document.createElement('h3');
    nurseryTitle.style.cssText = 'margin-top:16px;margin-bottom:8px;color:var(--accent)';
    nurseryTitle.textContent = 'Nursery (' + state.nursery.length + '/' + getNurseryCap() + ')';
    c.appendChild(nurseryTitle);

    const grid = document.createElement('div');
    grid.className = 'nursery-grid';

    state.nursery.forEach(entry => {
      const pA = state.stable.find(h => h.id === entry.parentAId);
      const pB = state.stable.find(h => h.id === entry.parentBId);
      const card = document.createElement('div');
      card.className = 'nursery-card';

      const names = document.createElement('div');
      names.style.cssText = 'font-size:.85rem;font-weight:600';
      names.textContent = (pA ? pA.name : '?') + ' \u00D7 ' + (pB ? pB.name : '?');
      card.appendChild(names);

      const info = document.createElement('div');
      info.style.cssText = 'font-size:.75rem;color:var(--text-muted);margin-top:4px';
      info.textContent = entry.daysLeft + ' day' + (entry.daysLeft !== 1 ? 's' : '') + ' remaining';
      card.appendChild(info);

      const bar = document.createElement('div');
      bar.className = 'progress-bar';
      const fill = document.createElement('div');
      fill.className = 'progress-fill';
      const totalDays = 5;
      fill.style.width = Math.round(((totalDays - entry.daysLeft) / totalDays) * 100) + '%';
      bar.appendChild(fill);
      card.appendChild(bar);

      grid.appendChild(card);
    });

    c.appendChild(grid);
  }
}

function createBreedSlot(label, horseId) {
  const slot = document.createElement('div');
  slot.className = 'breed-slot';

  if (horseId) {
    const horse = state.stable.find(h => h.id === horseId);
    if (horse) {
      slot.classList.add('filled');

      const portrait = document.createElement('div');
      portrait.className = 'horse-portrait';
      portrait.style.cssText = 'width:64px;height:64px;background:' + portraitBg(horse.coat.bodyHex);
      portrait.querySelector || portrait.insertAdjacentHTML('beforeend', renderHorseSVG(horse));
      slot.appendChild(portrait);

      const name = document.createElement('div');
      name.style.cssText = 'font-size:.8rem;font-weight:600;margin-top:4px';
      name.textContent = horse.name;
      slot.appendChild(name);

      const info = document.createElement('div');
      info.style.cssText = 'font-size:.7rem;color:var(--text-muted)';
      info.textContent = horse.coat.fullName + ' ' + horse.breedLabel + ' \u2022 ' + horse.sex;
      slot.appendChild(info);

      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:4px;margin-top:6px';

      const changeBtn = document.createElement('button');
      changeBtn.className = 'btn btn-muted';
      changeBtn.style.cssText = 'font-size:.7rem;padding:3px 8px';
      changeBtn.textContent = 'Change';
      changeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openHorsePicker(label);
      });
      btnRow.appendChild(changeBtn);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-danger';
      removeBtn.style.cssText = 'font-size:.7rem;padding:3px 8px';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (label === 'A') breedSlotA = null;
        else breedSlotB = null;
        renderBreedTab();
      });
      btnRow.appendChild(removeBtn);

      slot.appendChild(btnRow);
      return slot;
    }
  }

  // Empty slot
  const placeholder = document.createElement('div');
  placeholder.style.cssText = 'color:var(--text-muted);font-size:.85rem';
  placeholder.textContent = 'Select Parent ' + label;
  slot.appendChild(placeholder);

  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:.7rem;color:var(--text-muted);margin-top:4px';
  hint.textContent = 'Click to choose';
  slot.appendChild(hint);

  slot.addEventListener('click', () => {
    openHorsePicker(label);
  });

  return slot;
}

function openHorsePicker(slotLabel) {
  const modal = document.createElement('div');

  const title = document.createElement('h2');
  title.textContent = 'Select Parent ' + slotLabel;
  modal.appendChild(title);

  const otherSlotId = slotLabel === 'A' ? breedSlotB : breedSlotA;

  // Filter eligible horses
  const eligible = state.stable.filter(h => {
    if (h.id === otherSlotId) return false; // can't breed with self
    if (!canBreed(h)) return false;
    return true;
  });

  if (eligible.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No eligible horses. Horses must be at least 2 years old and not on breeding cooldown.';
    modal.appendChild(empty);
  }

  eligible.forEach(horse => {
    const card = document.createElement('div');
    card.className = 'horse-card';
    card.style.cssText = 'border-left-color:' + horse.coat.bodyHex + ';cursor:pointer;margin-bottom:8px';

    const portrait = document.createElement('div');
    portrait.className = 'horse-portrait';
    portrait.style.cssText = 'width:56px;height:56px;background:' + portraitBg(horse.coat.bodyHex);
    portrait.insertAdjacentHTML('beforeend', renderHorseSVG(horse));

    const info = document.createElement('div');
    info.className = 'horse-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'horse-name';
    nameEl.textContent = horse.name;
    info.appendChild(nameEl);

    const details = document.createElement('div');
    details.style.cssText = 'font-size:.75rem;color:var(--text-muted)';
    details.textContent = horse.coat.fullName + ' ' + horse.breedLabel + ' \u2022 ' + horse.sex + ' \u2022 Age ' + horse.age;
    info.appendChild(details);

    card.appendChild(portrait);
    card.appendChild(info);

    card.addEventListener('click', () => {
      if (slotLabel === 'A') breedSlotA = horse.id;
      else breedSlotB = horse.id;
      hideModal();
      renderBreedTab();
    });

    modal.appendChild(card);
  });

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-muted';
  closeBtn.style.marginTop = '12px';
  closeBtn.textContent = 'Cancel';
  closeBtn.addEventListener('click', hideModal);
  modal.appendChild(closeBtn);

  showModal(modal);
}

function startBreeding(parentA, parentB) {
  if (state.energy < 1) return;
  if (state.nursery.length >= getNurseryCap()) return;
  if (state.stable.length >= getStableCap()) return;

  state.energy--;

  // Add to nursery
  state.nursery.push({
    parentAId: parentA.id,
    parentBId: parentB.id,
    daysLeft: 5,
  });

  // Set cooldowns
  parentA.breedCooldown = 5;
  parentB.breedCooldown = 5;

  state.eventLog = parentA.name + ' and ' + parentB.name + ' are now breeding! Foal expected in 5 days.';

  // Clear slots
  breedSlotA = null;
  breedSlotB = null;

  saveState();
  renderHeader();
  renderBreedTab();
}

/* ── Train Tab ────────────────────────────────── */
let selectedTrainHorse = null;
let lastTrainResult = null;

const TRAIN_TYPES = [
  { stat: 'speed',     name: 'Sprint Drills',     desc: 'Short bursts of maximum speed' },
  { stat: 'stamina',   name: 'Long Rides',        desc: 'Endurance over distance' },
  { stat: 'agility',   name: 'Obstacle Courses',  desc: 'Weaving, jumping, quick turns' },
  { stat: 'strength',  name: 'Weight Training',   desc: 'Pulling and carrying exercises' },
  { stat: 'obedience', name: 'Groundwork',        desc: 'Commands, patience, trust' },
];

const TRAIN_QUOTES = {
  great: [
    '{name} crushed it! Impressive gains.',
    '{name} trained like a champion today.',
    'Exceptional session. {name} is a natural.',
  ],
  good: [
    '{name} had a solid training session.',
    'Decent progress for {name} today.',
    '{name} is improving steadily.',
  ],
  poor: [
    '{name} wasn\'t feeling it today. Minimal progress.',
    '{name} spent most of the session staring at clouds.',
    'Training was... attempted. {name} had other priorities.',
  ],
  capped: [
    '{name} has reached their natural limit for {stat}. Further training won\'t help.',
    '{name}\'s {stat} talent is maxed out. Consider focusing elsewhere.',
  ],
  unhappy: [
    '{name} refused to cooperate. Improve happiness first.',
    '{name} is too unhappy to train effectively.',
  ],
};

function getTrainBonus() {
  // 0 = basic ring, 1 = barn (+1), 2 = pro (+2 and talent hints)
  return state.upgrades.trainingRing || 0;
}

function renderTrainTab() {
  const c = $('tab-train');
  c.textContent = '';

  const hdr = document.createElement('h2');
  hdr.textContent = 'Training';
  c.appendChild(hdr);

  const sub = document.createElement('p');
  sub.style.cssText = 'font-size:.8rem;color:var(--text-muted);margin-bottom:12px';
  sub.textContent = 'Train your horses to improve their stats. Costs 1 energy per session.';
  c.appendChild(sub);

  const layout = document.createElement('div');
  layout.className = 'train-layout';

  // Left: horse selector
  const selectPanel = document.createElement('div');
  selectPanel.className = 'train-select';

  const selectTitle = document.createElement('h3');
  selectTitle.style.cssText = 'margin-bottom:8px';
  selectTitle.textContent = 'Select Horse';
  selectPanel.appendChild(selectTitle);

  if (state.stable.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No horses to train.';
    selectPanel.appendChild(empty);
  } else {
    state.stable.forEach(horse => {
      const card = document.createElement('div');
      card.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;margin-bottom:4px;background:var(--bg-card);border-radius:var(--radius);cursor:pointer;border-left:3px solid ' + horse.coat.bodyHex + ';transition:background .15s';
      if (selectedTrainHorse === horse.id) {
        card.style.background = 'var(--bg-hover)';
        card.style.borderLeftColor = 'var(--accent)';
      }

      const portrait = document.createElement('div');
      portrait.className = 'horse-portrait';
      portrait.style.cssText = 'width:36px;height:36px;background:' + portraitBg(horse.coat.bodyHex) + ';flex-shrink:0';
      portrait.insertAdjacentHTML('beforeend', renderHorseSVG(horse));
      card.appendChild(portrait);

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0';
      const nameLine = document.createElement('div');
      nameLine.style.cssText = 'font-size:.8rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      nameLine.textContent = horse.name;
      info.appendChild(nameLine);
      const detailLine = document.createElement('div');
      detailLine.style.cssText = 'font-size:.65rem;color:var(--text-muted)';
      detailLine.textContent = horse.breedLabel + ' \u2022 ' + horse.sex;
      info.appendChild(detailLine);
      card.appendChild(info);

      card.addEventListener('click', () => {
        selectedTrainHorse = horse.id;
        lastTrainResult = null;
        renderTrainTab();
      });
      selectPanel.appendChild(card);
    });
  }
  layout.appendChild(selectPanel);

  // Right: training panel
  const trainPanel = document.createElement('div');
  trainPanel.className = 'train-panel';

  const horse = selectedTrainHorse ? state.stable.find(h => h.id === selectedTrainHorse) : null;

  if (!horse) {
    const hint = document.createElement('div');
    hint.className = 'empty-state';
    hint.textContent = 'Select a horse to begin training.';
    trainPanel.appendChild(hint);
  } else {
    // Horse name + portrait
    const horseHeader = document.createElement('div');
    horseHeader.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px';

    const portrait = document.createElement('div');
    portrait.className = 'horse-portrait';
    portrait.style.cssText = 'width:56px;height:56px;background:' + portraitBg(horse.coat.bodyHex);
    portrait.insertAdjacentHTML('beforeend', renderHorseSVG(horse));
    horseHeader.appendChild(portrait);

    const headerInfo = document.createElement('div');
    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-weight:600;font-size:.95rem';
    nameEl.textContent = horse.name;
    headerInfo.appendChild(nameEl);
    const coatEl = document.createElement('div');
    coatEl.style.cssText = 'font-size:.75rem;color:var(--gold)';
    coatEl.textContent = horse.coat.fullName + ' ' + horse.breedLabel;
    headerInfo.appendChild(coatEl);
    horseHeader.appendChild(headerInfo);
    trainPanel.appendChild(horseHeader);

    // Stat bars with talent caps
    const showTalent = state.upgrades.trainingRing >= 2;
    const statSection = document.createElement('div');
    statSection.className = 'stat-bars';
    statSection.style.marginBottom = '12px';

    for (const [key, def] of Object.entries(STAT_DEFS)) {
      const row = document.createElement('div');
      row.className = 'stat-row';

      const label = document.createElement('span');
      label.className = 'stat-label';
      label.textContent = def.name;

      const track = document.createElement('div');
      track.className = 'stat-track';
      track.style.position = 'relative';

      const fill = document.createElement('div');
      fill.className = 'stat-fill';
      fill.style.width = horse.stats[key] + '%';
      fill.style.background = 'rgb(' + STAT_COLORS[key] + ')';
      track.appendChild(fill);

      // Talent cap marker (if upgrade unlocked)
      if (showTalent) {
        const cap = document.createElement('div');
        cap.style.cssText = 'position:absolute;top:0;bottom:0;width:2px;background:rgba(255,255,255,.4);left:' + horse.talents[key] + '%';
        cap.title = 'Talent cap: ' + horse.talents[key];
        track.appendChild(cap);
      }

      const val = document.createElement('span');
      val.className = 'stat-val';
      val.textContent = horse.stats[key] + (showTalent ? '/' + horse.talents[key] : '');
      val.style.width = showTalent ? '40px' : '20px';

      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(val);
      statSection.appendChild(row);
    }
    trainPanel.appendChild(statSection);

    // Training options
    const optTitle = document.createElement('div');
    optTitle.style.cssText = 'font-size:.7rem;color:var(--text-muted);margin-bottom:6px';
    optTitle.textContent = 'CHOOSE TRAINING:';
    trainPanel.appendChild(optTitle);

    const opts = document.createElement('div');
    opts.className = 'train-options';

    TRAIN_TYPES.forEach(tt => {
      const opt = document.createElement('div');
      opt.className = 'train-option';

      const left = document.createElement('div');
      const ttName = document.createElement('div');
      ttName.style.cssText = 'font-size:.85rem;font-weight:600';
      ttName.textContent = tt.name;
      left.appendChild(ttName);
      const ttDesc = document.createElement('div');
      ttDesc.style.cssText = 'font-size:.7rem;color:var(--text-muted)';
      ttDesc.textContent = tt.desc + ' \u2192 ' + STAT_DEFS[tt.stat].label;
      left.appendChild(ttDesc);
      opt.appendChild(left);

      const pill = document.createElement('span');
      pill.className = 'pill pill-' + tt.stat;
      pill.textContent = STAT_DEFS[tt.stat].name + ' ' + horse.stats[tt.stat];
      opt.appendChild(pill);

      const disabled = state.energy < 1;
      if (disabled) opt.style.opacity = '0.4';

      opt.addEventListener('click', () => {
        if (disabled) return;
        doTraining(horse, tt.stat);
      });

      opts.appendChild(opt);
    });
    trainPanel.appendChild(opts);

    if (state.energy < 1) {
      const warn = document.createElement('div');
      warn.style.cssText = 'font-size:.75rem;color:var(--red);margin-top:8px';
      warn.textContent = 'Not enough energy. End the day to restore.';
      trainPanel.appendChild(warn);
    }

    // Last training result
    if (lastTrainResult) {
      const result = document.createElement('div');
      result.className = 'train-result';
      result.textContent = lastTrainResult;
      trainPanel.appendChild(result);
    }

    // Competition section
    renderCompetitions(trainPanel, horse);
  }

  layout.appendChild(trainPanel);
  c.appendChild(layout);
}

function doTraining(horse, statKey) {
  if (state.energy < 1) return;
  state.energy--;

  const talent = horse.talents[statKey];
  const current = horse.stats[statKey];

  // Check if at cap
  if (current >= talent) {
    const quote = pick(TRAIN_QUOTES.capped).replace('{name}', horse.name).replace('{stat}', STAT_DEFS[statKey].label);
    lastTrainResult = quote;
    state.eventLog = quote;
    saveState();
    renderHeader();
    renderTrainTab();
    return;
  }

  // Check happiness
  if (horse.happiness < 15) {
    const quote = pick(TRAIN_QUOTES.unhappy).replace('{name}', horse.name);
    lastTrainResult = quote;
    state.eventLog = quote;
    saveState();
    renderHeader();
    renderTrainTab();
    return;
  }

  // Calculate gain
  const facilityBonus = getTrainBonus();
  const headroom = talent - current;
  const diminishing = Math.max(0.3, headroom / talent); // less gain near cap
  const happinessMulti = horse.happiness > 60 ? 1.0 : horse.happiness > 30 ? 0.7 : 0.4;
  const youngBonus = horse.age < 3 ? 1.3 : 1.0;
  const weatherBonus = hasActiveEvent('goodWeather') ? 1.3 : 1.0;

  let baseGain = randRange(1, 3) + facilityBonus;
  let gain = Math.max(1, Math.round(baseGain * diminishing * happinessMulti * youngBonus * weatherBonus));
  gain = Math.min(gain, headroom); // don't exceed talent

  horse.stats[statKey] = current + gain;

  // Happiness cost for overtraining same stat
  if (horse.lastTrainedStat === statKey) {
    horse.trainStreak++;
    if (horse.trainStreak >= 3) {
      horse.happiness = clamp(horse.happiness - 5, 0, 100);
    }
  } else {
    horse.trainStreak = 1;
  }
  horse.lastTrainedStat = statKey;

  // Result message
  let quality;
  if (gain >= 3) quality = 'great';
  else if (gain >= 2) quality = 'good';
  else quality = 'poor';

  const quote = pick(TRAIN_QUOTES[quality]).replace('{name}', horse.name);
  lastTrainResult = quote + ' (+' + gain + ' ' + STAT_DEFS[statKey].label + ', now ' + horse.stats[statKey] + ')';
  state.eventLog = lastTrainResult;

  saveState();
  renderHeader();
  renderTrainTab();
}

/* ── Competitions ─────────────────────────────── */
function renderCompetitions(container, horse) {
  const section = document.createElement('div');
  section.style.cssText = 'margin-top:16px;padding-top:12px;border-top:1px solid var(--border)';

  const title = document.createElement('h3');
  title.style.cssText = 'margin-bottom:8px';
  title.textContent = 'Compete';
  section.appendChild(title);

  if (horse.competeCooldown > 0) {
    const cd = document.createElement('div');
    cd.style.cssText = 'font-size:.8rem;color:var(--text-muted)';
    cd.textContent = horse.name + ' already competed today. Available tomorrow.';
    section.appendChild(cd);
    container.appendChild(section);
    return;
  }

  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:.75rem;color:var(--text-muted);margin-bottom:8px';
  sub.textContent = 'Enter an event (1 energy). Win money and reputation!';
  section.appendChild(sub);

  for (const [key, evt] of Object.entries(EVENTS)) {
    if (state.reputation < evt.repRequired) continue;

    const card = document.createElement('div');
    card.className = 'train-option';

    const left = document.createElement('div');
    const eName = document.createElement('div');
    eName.style.cssText = 'font-size:.85rem;font-weight:600';
    eName.textContent = evt.name;
    left.appendChild(eName);

    const eDesc = document.createElement('div');
    eDesc.style.cssText = 'font-size:.7rem;color:var(--text-muted)';
    if (evt.primary && evt.secondary) {
      eDesc.textContent = STAT_DEFS[evt.primary].label + ' + ' + STAT_DEFS[evt.secondary].label + ' \u2022 Prize: $' + evt.prize[0] + '-' + evt.prize[1];
    } else {
      eDesc.textContent = 'All stats \u2022 Prize: $' + evt.prize[0] + '-' + evt.prize[1];
    }
    left.appendChild(eDesc);
    card.appendChild(left);

    // Show horse's relevant score
    const score = computeEventScore(horse, evt);
    const pill = document.createElement('span');
    pill.style.cssText = 'font-family:"Courier New",monospace;font-size:.75rem;color:var(--gold)';
    pill.textContent = 'Power: ' + score;
    card.appendChild(pill);

    const disabled = state.energy < 1;
    if (disabled) card.style.opacity = '0.4';

    card.addEventListener('click', () => {
      if (disabled) return;
      doCompetition(horse, key, evt);
    });

    section.appendChild(card);
  }

  if (state.energy < 1) {
    const warn = document.createElement('div');
    warn.style.cssText = 'font-size:.75rem;color:var(--red);margin-top:6px';
    warn.textContent = 'Not enough energy.';
    section.appendChild(warn);
  }

  container.appendChild(section);
}

function computeEventScore(horse, evt) {
  if (!evt.primary) {
    // Grand Prix: average all stats
    const total = Object.values(horse.stats).reduce((s, v) => s + v, 0);
    return Math.round(total / Object.keys(STAT_DEFS).length);
  }
  return Math.round(horse.stats[evt.primary] * 0.7 + horse.stats[evt.secondary] * 0.3);
}

function doCompetition(horse, eventKey, evt) {
  if (state.energy < 1) return;
  state.energy--;
  horse.competeCooldown = 1;

  const score = computeEventScore(horse, evt);
  // Add randomness (±15%)
  const finalScore = Math.round(score * (0.85 + Math.random() * 0.3));

  // AI competitors scale with reputation
  const repTier = Math.floor(state.reputation / 150) + 1;
  const numCompetitors = 4;
  const aiScores = [];
  for (let i = 0; i < numCompetitors; i++) {
    const base = 25 + repTier * 12 + randRange(-10, 15);
    aiScores.push(Math.round(base * (0.85 + Math.random() * 0.3)));
  }
  aiScores.sort((a, b) => b - a);

  // Determine placement
  let placement = 1;
  for (const ai of aiScores) {
    if (ai > finalScore) placement++;
  }

  // Prize calculation
  let prizeMoney = 0;
  let repGain = 0;
  const prizeRange = evt.prize[1] - evt.prize[0];

  if (placement === 1) {
    prizeMoney = evt.prize[1];
    repGain = evt.repGain * 2;
  } else if (placement === 2) {
    prizeMoney = Math.round(evt.prize[0] + prizeRange * 0.5);
    repGain = evt.repGain;
  } else if (placement === 3) {
    prizeMoney = evt.prize[0];
    repGain = Math.round(evt.repGain * 0.5);
  }
  // 4th and 5th get nothing

  state.money += prizeMoney;
  state.reputation += repGain;

  // Happiness boost for competing
  horse.happiness = clamp(horse.happiness + 3, 0, 100);

  // Build result
  const ordinal = ['1st', '2nd', '3rd', '4th', '5th'][placement - 1];
  const allScores = [...aiScores, finalScore].sort((a, b) => b - a);

  // Show result modal
  const modal = document.createElement('div');

  const title = document.createElement('h2');
  title.style.color = placement <= 3 ? 'var(--gold)' : 'var(--text-muted)';
  title.textContent = evt.name + ' Results';
  modal.appendChild(title);

  const placementEl = document.createElement('div');
  placementEl.style.cssText = 'font-size:1.2rem;font-weight:700;margin:8px 0;font-family:"Courier New",monospace';
  placementEl.style.color = placement === 1 ? 'var(--gold)' : placement <= 3 ? 'var(--accent)' : 'var(--text-muted)';
  placementEl.textContent = horse.name + ' placed ' + ordinal + '!';
  modal.appendChild(placementEl);

  // Scoreboard
  const board = document.createElement('div');
  board.style.cssText = 'font-family:"Courier New",monospace;font-size:.8rem;margin:10px 0';
  const competitors = ['Rival Horse A', 'Rival Horse B', 'Rival Horse C', 'Rival Horse D'];
  let aiIdx = 0;
  allScores.forEach((s, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'padding:3px 0;display:flex;justify-content:space-between';
    const isPlayer = s === finalScore && !row.dataset.playerShown;
    if (isPlayer) {
      row.style.color = 'var(--gold)';
      row.style.fontWeight = '600';
      row.dataset.playerShown = 'true';
    }
    const nameSpan = document.createElement('span');
    nameSpan.textContent = (i + 1) + '. ' + (s === finalScore && !board.dataset.playerShown ? horse.name : competitors[aiIdx++] || 'Rival');
    if (s === finalScore && !board.dataset.playerShown) board.dataset.playerShown = 'true';
    const scoreSpan = document.createElement('span');
    scoreSpan.textContent = s + ' pts';
    row.appendChild(nameSpan);
    row.appendChild(scoreSpan);
    board.appendChild(row);
  });
  modal.appendChild(board);

  // Prize
  if (prizeMoney > 0 || repGain > 0) {
    const prize = document.createElement('div');
    prize.style.cssText = 'font-size:.85rem;color:var(--accent);margin-top:8px';
    let prizeText = '';
    if (prizeMoney > 0) prizeText += '+$' + prizeMoney;
    if (repGain > 0) prizeText += (prizeText ? ' \u2022 ' : '') + '+' + repGain + ' Rep';
    prize.textContent = prizeText;
    modal.appendChild(prize);
  } else {
    const noPrize = document.createElement('div');
    noPrize.style.cssText = 'font-size:.85rem;color:var(--text-muted);margin-top:8px';
    noPrize.textContent = 'No prize for ' + ordinal + ' place. Better luck next time.';
    modal.appendChild(noPrize);
  }

  // Flavor
  const flavor = document.createElement('div');
  flavor.style.cssText = 'font-size:.8rem;font-style:italic;color:var(--text-muted);margin-top:10px';
  if (placement === 1) flavor.textContent = 'The crowd goes wild! ' + horse.name + ' is a champion!';
  else if (placement === 2) flavor.textContent = 'A strong showing. ' + horse.name + ' was close to the top.';
  else if (placement === 3) flavor.textContent = horse.name + ' squeezed onto the podium. Not bad.';
  else flavor.textContent = horse.name + ' gave it their all. The crowd went mild.';
  modal.appendChild(flavor);

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.style.marginTop = '12px';
  btn.textContent = 'OK';
  btn.addEventListener('click', () => {
    hideModal();
    state.eventLog = horse.name + ' placed ' + ordinal + ' in ' + evt.name + (prizeMoney > 0 ? ' (+$' + prizeMoney + ')' : '') + '.';
    saveState();
    renderHeader();
    renderTrainTab();
  });
  modal.appendChild(btn);

  showModal(modal);
}

/* ── Explore Tab ──────────────────────────────── */
let selectedBiome = null;
let encounterState = null; // null | { horse, biomeKey } | 'nothing'

function getStableCap() {
  return state.stableCapacity + state.upgrades.stableSize * 4;
}

function getCatchBonus() {
  return CATCH_GEAR[state.upgrades.catchGear] ? CATCH_GEAR[state.upgrades.catchGear].bonus : 0;
}

function hasActiveEvent(effect) {
  return state.activeEvents.some(e => e.effect === effect);
}

function renderExploreTab() {
  const c = $('tab-explore');
  c.textContent = '';

  // Header
  const hdr = document.createElement('h2');
  hdr.textContent = 'Explore the Wilds';
  c.appendChild(hdr);

  const sub = document.createElement('p');
  sub.style.cssText = 'font-size:.8rem;color:var(--text-muted);margin-bottom:12px';
  sub.textContent = 'Venture out to find and catch wild horses. Costs 1 energy per expedition.';
  c.appendChild(sub);

  // Storm check
  if (hasActiveEvent('storm')) {
    const storm = document.createElement('div');
    storm.className = 'encounter-panel';
    storm.style.cssText = 'color:var(--red);margin-bottom:12px';
    storm.textContent = 'A storm is raging! Exploration is blocked today.';
    c.appendChild(storm);
    return;
  }

  // Biome cards
  const biomeRow = document.createElement('div');
  biomeRow.className = 'biome-cards';

  for (const [key, biome] of Object.entries(BIOMES)) {
    const card = document.createElement('div');
    card.className = 'biome-card';
    const locked = state.reputation < biome.repRequired;
    if (locked) card.classList.add('locked');
    if (selectedBiome === key && !locked) card.classList.add('selected');

    const name = document.createElement('div');
    name.className = 'biome-name';
    name.textContent = biome.name;
    card.appendChild(name);

    const desc = document.createElement('div');
    desc.className = 'biome-desc';
    desc.textContent = locked ? 'Requires ' + biome.repRequired + ' reputation' : biome.description;
    card.appendChild(desc);

    // Show breeds available
    if (!locked) {
      const breeds = document.createElement('div');
      breeds.style.cssText = 'font-size:.7rem;color:var(--gold);margin-top:6px;font-family:"Courier New",monospace';
      breeds.textContent = biome.breeds.map(b => BREEDS[b].name).join(', ');
      card.appendChild(breeds);

      // Catch rate info
      const rate = document.createElement('div');
      rate.style.cssText = 'font-size:.65rem;color:var(--text-muted);margin-top:3px';
      const baseRate = Math.round((biome.catchDifficulty + getCatchBonus()) * 100);
      rate.textContent = 'Catch rate: ~' + Math.min(95, baseRate) + '% | Rare chance: ' + Math.round(biome.rareChance * 100) + '%';
      card.appendChild(rate);
    }

    if (!locked) {
      card.addEventListener('click', () => {
        selectedBiome = key;
        encounterState = null;
        renderExploreTab();
      });
    }

    biomeRow.appendChild(card);
  }
  c.appendChild(biomeRow);

  // Action area
  if (selectedBiome) {
    const panel = document.createElement('div');
    panel.className = 'encounter-panel';

    if (encounterState === null) {
      // Ready to explore
      const info = document.createElement('p');
      info.style.cssText = 'margin-bottom:12px;font-size:.9rem';
      info.textContent = 'Ready to explore ' + BIOMES[selectedBiome].name + '.';
      panel.appendChild(info);

      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'EXPLORE (1 Energy)';
      btn.disabled = state.energy < 1 || state.stable.length >= getStableCap();

      if (state.energy < 1) {
        const warn = document.createElement('p');
        warn.style.cssText = 'font-size:.75rem;color:var(--red);margin-top:8px';
        warn.textContent = 'Not enough energy. End the day to restore.';
        panel.appendChild(warn);
      }
      if (state.stable.length >= getStableCap()) {
        const warn = document.createElement('p');
        warn.style.cssText = 'font-size:.75rem;color:var(--red);margin-top:8px';
        warn.textContent = 'Stable is full! Release a horse or upgrade.';
        panel.appendChild(warn);
      }

      btn.addEventListener('click', () => {
        doExplore(selectedBiome);
      });
      panel.appendChild(btn);

    } else if (encounterState === 'nothing') {
      // Found nothing
      const msg = document.createElement('p');
      msg.style.cssText = 'font-size:.9rem;color:var(--text-muted)';
      msg.textContent = 'You searched the area but found no wild horses today. The plains are quiet.';
      panel.appendChild(msg);

      const again = document.createElement('button');
      again.className = 'btn btn-muted';
      again.textContent = 'TRY AGAIN';
      again.disabled = state.energy < 1;
      again.style.marginTop = '12px';
      again.addEventListener('click', () => {
        encounterState = null;
        renderExploreTab();
      });
      panel.appendChild(again);

    } else if (encounterState && encounterState.horse) {
      // Found a horse!
      renderEncounter(panel, encounterState);
    }

    c.appendChild(panel);
  }

  // Equipment info
  const gear = document.createElement('div');
  gear.style.cssText = 'margin-top:16px;font-size:.75rem;color:var(--text-muted);font-family:"Courier New",monospace';
  gear.textContent = 'Equipment: ' + CATCH_GEAR[state.upgrades.catchGear].name +
    ' | Stable: ' + state.stable.length + '/' + getStableCap();
  c.appendChild(gear);
}

function doExplore(biomeKey) {
  if (state.energy < 1 || state.stable.length >= getStableCap()) return;

  state.energy--;

  const biome = BIOMES[biomeKey];

  // 75% chance to encounter a horse, 25% nothing
  if (Math.random() < 0.25) {
    encounterState = 'nothing';
    state.eventLog = 'You searched ' + biome.name + ' but found nothing.';
  } else {
    // Pick a breed from this biome
    const breedKey = pick(biome.breeds);
    const horse = createWildHorse(breedKey);

    // Rare variant?
    const rareChance = biome.rareChance + (hasActiveEvent('rareBoost') ? 0.15 : 0);
    if (Math.random() < rareChance) {
      // Give this horse an unusual allele combo — force a dilution or pattern
      const rareTrait = pick(['cream', 'dun', 'tobiano', 'roan', 'grey']);
      const alleles = COAT_LOCI[rareTrait].alleles;
      // Force at least one dominant/special allele
      horse.genotype[rareTrait] = [alleles[0], Math.random() < 0.4 ? alleles[0] : alleles[1]];
      horse.coat = resolveCoatColor(horse.genotype, horse.age);
      state.eventLog = 'A rare ' + horse.coat.fullName + ' ' + BREEDS[breedKey].name + ' spotted!';
    } else {
      state.eventLog = 'A wild ' + horse.coat.fullName + ' ' + BREEDS[breedKey].name + ' found!';
    }

    encounterState = { horse, biomeKey };
  }

  renderHeader();
  renderExploreTab();
}

function renderEncounter(panel, encounter) {
  const horse = encounter.horse;
  const biome = BIOMES[encounter.biomeKey];

  // Horse preview
  const title = document.createElement('h3');
  title.style.cssText = 'color:var(--gold);margin-bottom:8px';
  title.textContent = 'Wild ' + horse.coat.fullName + ' ' + horse.breedLabel + ' spotted!';
  panel.appendChild(title);

  const previewRow = document.createElement('div');
  previewRow.style.cssText = 'display:flex;gap:16px;align-items:center;margin-bottom:12px';

  const portrait = document.createElement('div');
  portrait.className = 'horse-portrait';
  portrait.style.cssText = 'width:100px;height:100px;background:' + portraitBg(horse.coat.bodyHex);
  portrait.insertAdjacentHTML('beforeend', renderHorseSVG(horse));
  previewRow.appendChild(portrait);

  const details = document.createElement('div');
  details.style.cssText = 'font-size:.8rem';

  const breedLine = document.createElement('div');
  breedLine.style.cssText = 'color:var(--text-muted);margin-bottom:4px';
  breedLine.textContent = horse.breedLabel + ' \u2022 ' + horse.sex + ' \u2022 Age ' + horse.age + 'yr';
  details.appendChild(breedLine);

  // Show top stats as pills
  const statPills = document.createElement('div');
  statPills.className = 'pills';
  statPills.style.marginBottom = '6px';
  const sortedStats = Object.entries(horse.stats).sort((a, b) => b[1] - a[1]);
  sortedStats.slice(0, 3).forEach(([key, val]) => {
    const pill = document.createElement('span');
    pill.className = 'pill pill-' + key;
    pill.textContent = STAT_DEFS[key].name + ' ' + val;
    statPills.appendChild(pill);
  });
  details.appendChild(statPills);

  previewRow.appendChild(details);
  panel.appendChild(previewRow);

  // Catch attempt
  const catchRate = Math.min(0.95, biome.catchDifficulty + getCatchBonus() - (hasActiveEvent('gearDown') ? 0.15 : 0));
  const rateText = document.createElement('div');
  rateText.style.cssText = 'font-size:.8rem;color:var(--text-muted);margin-bottom:10px;font-family:"Courier New",monospace';
  rateText.textContent = 'Catch probability: ' + Math.round(catchRate * 100) + '%';
  panel.appendChild(rateText);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px';

  const catchBtn = document.createElement('button');
  catchBtn.className = 'btn btn-primary';
  catchBtn.textContent = 'ATTEMPT CATCH';
  catchBtn.addEventListener('click', () => {
    attemptCatch(horse, catchRate);
  });
  btnRow.appendChild(catchBtn);

  const skipBtn = document.createElement('button');
  skipBtn.className = 'btn btn-muted';
  skipBtn.textContent = 'LET IT GO';
  skipBtn.addEventListener('click', () => {
    encounterState = null;
    state.eventLog = 'You let the ' + horse.coat.fullName + ' ' + horse.breedLabel + ' go free.';
    renderExploreTab();
  });
  btnRow.appendChild(skipBtn);

  panel.appendChild(btnRow);
}

function attemptCatch(horse, catchRate) {
  if (state.stable.length >= getStableCap()) return;

  const success = Math.random() < catchRate;

  if (success) {
    state.stable.push(horse);
    // Track in bestiary
    state.bestiary[horse.breed] = (state.bestiary[horse.breed] || 0) + 1;
    state.eventLog = 'Caught ' + horse.name + '! A ' + horse.coat.fullName + ' ' + horse.breedLabel + ' joins your stable.';
    encounterState = null;
    saveState();
    renderHeader();
    showCatchResult(true, horse);
  } else {
    state.eventLog = 'The ' + horse.coat.fullName + ' ' + horse.breedLabel + ' escaped!';
    encounterState = null;
    saveState();
    showCatchResult(false, horse);
  }
}

function showCatchResult(success, horse) {
  const c = $('tab-explore');
  // Keep biome cards, replace encounter panel
  const oldPanel = c.querySelector('.encounter-panel');
  if (oldPanel) oldPanel.remove();

  const panel = document.createElement('div');
  panel.className = 'encounter-panel';

  const msg = document.createElement('p');
  msg.style.cssText = 'font-size:1rem;margin-bottom:12px';
  if (success) {
    msg.style.color = 'var(--accent)';
    msg.textContent = 'Success! ' + horse.name + ' has been added to your stable!';
  } else {
    msg.style.color = 'var(--red)';
    msg.textContent = 'The horse bolted! ' + horse.coat.fullName + ' ' + horse.breedLabel + ' escaped into the wild.';
  }
  panel.appendChild(msg);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px';

  if (state.energy > 0 && state.stable.length < getStableCap()) {
    const again = document.createElement('button');
    again.className = 'btn btn-primary';
    again.textContent = 'EXPLORE AGAIN';
    again.addEventListener('click', () => {
      encounterState = null;
      renderExploreTab();
    });
    btnRow.appendChild(again);
  }

  const back = document.createElement('button');
  back.className = 'btn btn-muted';
  back.textContent = 'BACK TO STABLE';
  back.addEventListener('click', () => {
    encounterState = null;
    selectedBiome = null;
    // Switch to stable tab
    document.querySelector('[data-tab="stable"]').click();
  });
  btnRow.appendChild(back);

  panel.appendChild(btnRow);
  c.appendChild(panel);
}

/* ── Market Tab ───────────────────────────────── */
let selectedBuyer = null;

// Coat color names for buyer requests
const REQUESTABLE_COLORS = ['Bay', 'Black', 'Chestnut', 'Palomino', 'Buckskin', 'Grey', 'Cremello', 'Perlino', 'Bay Dun', 'Grullo', 'Red Dun'];
const REQUESTABLE_STATS = ['speed', 'stamina', 'agility', 'strength', 'obedience'];

function getBuyerTier() {
  if (state.reputation >= 600) return 4;
  if (state.reputation >= 300) return 3;
  if (state.reputation >= 100) return 2;
  return 1;
}

function generateBuyer() {
  const tier = getBuyerTier();
  const isCelebrity = hasActiveEvent('celebrity') && Math.random() < 0.5;
  const numRequirements = Math.min(1 + Math.floor(tier * 0.7), 3) + (isCelebrity ? 1 : 0);

  const requirements = [];
  const usedTypes = new Set();

  for (let i = 0; i < numRequirements; i++) {
    // Pick a requirement type we haven't used yet
    const types = ['color', 'stat', 'breed'].filter(t => !usedTypes.has(t));
    if (types.length === 0) break;
    const type = pick(types);
    usedTypes.add(type);

    if (type === 'color') {
      requirements.push({ type: 'color', value: pick(REQUESTABLE_COLORS) });
    } else if (type === 'stat') {
      const stat = pick(REQUESTABLE_STATS);
      const threshold = 30 + tier * 10 + randRange(0, 15);
      requirements.push({ type: 'stat', stat, threshold });
    } else if (type === 'breed') {
      const breedKey = pick(Object.keys(BREEDS));
      requirements.push({ type: 'breed', value: breedKey, label: BREEDS[breedKey].name });
    }
  }

  const basePrice = 50 + tier * 40 + numRequirements * 30 + randRange(0, 30);

  return {
    id: uid(),
    name: pick(BUYER_NAMES),
    quote: pick(BUYER_QUOTES),
    requirements,
    basePrice: isCelebrity ? basePrice * 3 : basePrice,
    daysLeft: 2 + tier + randRange(0, 2),
    isCelebrity,
    tier,
  };
}

function matchBuyer(horse, buyer) {
  let matched = 0;
  const total = buyer.requirements.length;
  const details = [];

  buyer.requirements.forEach(req => {
    let met = false;
    if (req.type === 'color') {
      met = horse.coat.fullName.includes(req.value) || horse.coat.colorName === req.value;
      details.push({ label: req.value, met });
    } else if (req.type === 'stat') {
      met = horse.stats[req.stat] >= req.threshold;
      details.push({ label: STAT_DEFS[req.stat].label + ' \u2265' + req.threshold, met });
    } else if (req.type === 'breed') {
      met = horse.breed === req.value || horse.breedLabel.includes(req.label);
      details.push({ label: req.label, met });
    }
    if (met) matched++;
  });

  if (matched === 0) return null; // can't sell if no matches at all

  const multiplier = matched === total ? 1.5 : matched / total;
  const price = Math.round(buyer.basePrice * multiplier);

  return { matched, total, price, details };
}

function renderMarketTab() {
  const c = $('tab-market');
  c.textContent = '';

  const hdr = document.createElement('h2');
  hdr.textContent = 'Market';
  c.appendChild(hdr);

  // Seed initial buyers if empty (first visit)
  if (state.buyers.length === 0) {
    const maxBuyers = state.maxBuyers + (hasActiveEvent('buyerRush') ? 2 : 0);
    while (state.buyers.length < maxBuyers) {
      state.buyers.push(generateBuyer());
    }
    saveState();
  }

  const sub = document.createElement('p');
  sub.style.cssText = 'font-size:.8rem;color:var(--text-muted);margin-bottom:12px';
  sub.textContent = 'Buyers are looking for horses with specific traits. Match their requirements to sell at the best price.';
  c.appendChild(sub);

  // Buyer cards
  const buyerTitle = document.createElement('h3');
  buyerTitle.style.cssText = 'margin-bottom:8px';
  buyerTitle.textContent = 'Buyers (' + state.buyers.length + ')';
  c.appendChild(buyerTitle);

  const buyerGrid = document.createElement('div');
  buyerGrid.className = 'buyer-cards';

  state.buyers.forEach(buyer => {
    const card = document.createElement('div');
    card.className = 'buyer-card';
    if (selectedBuyer === buyer.id) card.classList.add('selected');
    if (buyer.isCelebrity) card.style.borderLeftColor = 'var(--accent)';

    const nameRow = document.createElement('div');
    nameRow.className = 'buyer-name';
    nameRow.textContent = (buyer.isCelebrity ? '\u2B50 ' : '') + buyer.name;
    card.appendChild(nameRow);

    // Requirements as pills
    const reqRow = document.createElement('div');
    reqRow.className = 'pills';
    reqRow.style.margin = '6px 0';
    buyer.requirements.forEach(req => {
      const pill = document.createElement('span');
      pill.style.cssText = 'display:inline-block;padding:2px 7px;border-radius:10px;font-size:.65rem;font-family:"Courier New",monospace;background:rgba(255,211,92,.1);color:var(--gold);border:1px solid rgba(255,211,92,.25)';
      if (req.type === 'color') pill.textContent = req.value;
      else if (req.type === 'stat') pill.textContent = STAT_DEFS[req.stat].label + ' \u2265' + req.threshold;
      else if (req.type === 'breed') pill.textContent = req.label;
      reqRow.appendChild(pill);
    });
    card.appendChild(reqRow);

    const priceRow = document.createElement('div');
    priceRow.className = 'buyer-price';
    priceRow.textContent = 'Pays up to $' + buyer.basePrice + (buyer.requirements.length > 1 ? ' (full match)' : '');
    card.appendChild(priceRow);

    const timer = document.createElement('div');
    timer.className = 'buyer-timer';
    timer.textContent = buyer.daysLeft + ' day' + (buyer.daysLeft !== 1 ? 's' : '') + ' remaining';
    card.appendChild(timer);

    card.addEventListener('click', () => {
      selectedBuyer = selectedBuyer === buyer.id ? null : buyer.id;
      renderMarketTab();
    });

    buyerGrid.appendChild(card);
  });
  c.appendChild(buyerGrid);

  // Matching horses (if a buyer is selected)
  if (selectedBuyer) {
    const buyer = state.buyers.find(b => b.id === selectedBuyer);
    if (buyer) {
      renderMatchingHorses(c, buyer);
    }
  }
}

function renderMatchingHorses(container, buyer) {
  const section = document.createElement('div');
  section.style.cssText = 'margin-top:16px';

  const title = document.createElement('h3');
  title.style.cssText = 'margin-bottom:8px';
  title.textContent = 'Your Matching Horses for ' + buyer.name;
  section.appendChild(title);

  // Score all horses against this buyer
  const matches = [];
  state.stable.forEach(horse => {
    const match = matchBuyer(horse, buyer);
    if (match) matches.push({ horse, match });
  });

  // Sort by match quality (most matched first, then by price)
  matches.sort((a, b) => b.match.matched - a.match.matched || b.match.price - a.match.price);

  if (matches.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:.85rem;color:var(--text-muted);padding:12px';
    empty.textContent = 'None of your horses match this buyer\'s requirements.';
    section.appendChild(empty);
  } else {
    matches.forEach(({ horse, match }) => {
      const card = document.createElement('div');
      card.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px;margin-bottom:6px;background:var(--bg-card);border-radius:var(--radius);border-left:3px solid ' + (match.matched === match.total ? 'var(--gold)' : 'var(--border)');

      const portrait = document.createElement('div');
      portrait.className = 'horse-portrait';
      portrait.style.cssText = 'width:48px;height:48px;background:' + portraitBg(horse.coat.bodyHex) + ';flex-shrink:0';
      portrait.insertAdjacentHTML('beforeend', renderHorseSVG(horse));
      card.appendChild(portrait);

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0';

      const nameLine = document.createElement('div');
      nameLine.style.cssText = 'font-size:.85rem;font-weight:600';
      nameLine.textContent = horse.name;
      info.appendChild(nameLine);

      const detailLine = document.createElement('div');
      detailLine.style.cssText = 'font-size:.7rem;color:var(--text-muted)';
      detailLine.textContent = horse.coat.fullName + ' ' + horse.breedLabel + ' \u2022 ' + horse.sex;
      info.appendChild(detailLine);

      // Match details
      const matchRow = document.createElement('div');
      matchRow.style.cssText = 'display:flex;gap:4px;margin-top:4px;flex-wrap:wrap';
      match.details.forEach(d => {
        const pill = document.createElement('span');
        pill.style.cssText = 'font-size:.6rem;padding:1px 5px;border-radius:8px;font-family:"Courier New",monospace;' +
          (d.met ? 'background:rgba(57,255,20,.1);color:var(--accent);border:1px solid rgba(57,255,20,.25)' :
                   'background:rgba(255,68,68,.08);color:var(--red);border:1px solid rgba(255,68,68,.2);text-decoration:line-through');
        pill.textContent = d.label;
        matchRow.appendChild(pill);
      });
      info.appendChild(matchRow);

      card.appendChild(info);

      // Match score + price
      const rightCol = document.createElement('div');
      rightCol.style.cssText = 'text-align:right;flex-shrink:0';

      const matchIndicator = document.createElement('div');
      matchIndicator.className = 'match-indicator';
      matchIndicator.textContent = match.matched + '/' + match.total;
      if (match.matched === match.total) matchIndicator.style.cssText += ';background:rgba(255,211,92,.15);color:var(--gold);border:1px solid rgba(255,211,92,.3)';
      rightCol.appendChild(matchIndicator);

      const price = document.createElement('div');
      price.style.cssText = 'font-family:"Courier New",monospace;font-size:.9rem;color:var(--gold);margin-top:4px';
      price.textContent = '$' + match.price;
      rightCol.appendChild(price);

      const sellBtn = document.createElement('button');
      sellBtn.className = 'btn btn-gold';
      sellBtn.style.cssText = 'margin-top:6px;font-size:.7rem;padding:3px 10px';
      sellBtn.textContent = 'SELL';

      // Don't allow selling pregnant mares
      if (isPregnantMare(horse)) {
        sellBtn.disabled = true;
        sellBtn.className = 'btn btn-muted';
        sellBtn.textContent = 'Pregnant';
      }

      sellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isPregnantMare(horse)) return;
        doSale(horse, buyer, match);
      });
      rightCol.appendChild(sellBtn);

      card.appendChild(rightCol);
      section.appendChild(card);
    });
  }

  container.appendChild(section);
}

function doSale(horse, buyer, match) {
  // Confirm
  const perfect = match.matched === match.total;
  const msg = 'Sell ' + horse.name + ' to ' + buyer.name + ' for $' + match.price + (perfect ? ' (PERFECT match!)' : '') + '? This cannot be undone.';
  if (!confirm(msg)) return;

  // Execute sale
  state.money += match.price;
  state.reputation += perfect ? 15 : 5;
  state.stable = state.stable.filter(h => h.id !== horse.id);

  // Remove buyer (they got what they wanted)
  state.buyers = state.buyers.filter(b => b.id !== buyer.id);
  selectedBuyer = null;

  // Track first sale
  if (!state.flags.firstSale) {
    state.flags.firstSale = true;
  }

  state.eventLog = 'Sold ' + horse.name + ' to ' + buyer.name + ' for $' + match.price + '!' + (perfect ? ' Perfect match bonus!' : '');

  // Show sale modal
  const modal = document.createElement('div');

  const title = document.createElement('h2');
  title.style.color = 'var(--gold)';
  title.textContent = perfect ? 'PERFECT SALE!' : 'Horse Sold!';
  modal.appendChild(title);

  const detail = document.createElement('p');
  detail.style.cssText = 'font-size:.9rem;margin:8px 0';
  detail.textContent = horse.name + ' goes to ' + buyer.name + '.';
  modal.appendChild(detail);

  const priceEl = document.createElement('div');
  priceEl.style.cssText = 'font-size:1.3rem;font-weight:700;color:var(--gold);font-family:"Courier New",monospace;margin:10px 0';
  priceEl.textContent = '+$' + match.price;
  modal.appendChild(priceEl);

  const repEl = document.createElement('div');
  repEl.style.cssText = 'font-size:.85rem;color:var(--accent)';
  repEl.textContent = '+' + (perfect ? 15 : 5) + ' Reputation';
  modal.appendChild(repEl);

  // Buyer quote
  const quoteText = buyer.quote
    .replace('{color}', horse.coat.colorName || horse.coat.fullName)
    .replace('{breed}', horse.breedLabel)
    .replace('{stat}', match.details.length > 0 ? match.details[0].label : 'something special');
  const quote = document.createElement('div');
  quote.style.cssText = 'font-size:.8rem;font-style:italic;color:var(--text-muted);margin-top:12px;padding:8px;background:var(--bg-card);border-radius:var(--radius)';
  quote.textContent = '"' + quoteText + '" — ' + buyer.name;
  modal.appendChild(quote);

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.style.marginTop = '14px';
  btn.textContent = 'CONTINUE';
  btn.addEventListener('click', () => {
    hideModal();
    saveState();
    renderHeader();
    renderMarketTab();
  });
  modal.appendChild(btn);

  showModal(modal);
}

/* ── Upgrades Tab ─────────────────────────────── */
const UPGRADE_CATEGORIES = {
  equipment:  { label: 'Equipment',  icon: '\uD83D\uDEE0' },
  facility:   { label: 'Facility',   icon: '\uD83C\uDFDA' },
  knowledge:  { label: 'Knowledge',  icon: '\uD83D\uDCDA' },
  care:       { label: 'Care',       icon: '\u2764' },
};

function renderUpgradesTab() {
  const c = $('tab-upgrades');
  c.textContent = '';

  const hdr = document.createElement('h2');
  hdr.textContent = 'Upgrades';
  c.appendChild(hdr);

  const sub = document.createElement('p');
  sub.style.cssText = 'font-size:.8rem;color:var(--text-muted);margin-bottom:16px';
  sub.textContent = 'Invest in your ranch to unlock new abilities and improve efficiency.';
  c.appendChild(sub);

  // Money display
  const moneyBar = document.createElement('div');
  moneyBar.style.cssText = 'font-family:"Courier New",monospace;font-size:.9rem;color:var(--gold);margin-bottom:16px';
  moneyBar.textContent = 'Available: $' + state.money;
  c.appendChild(moneyBar);

  const columns = document.createElement('div');
  columns.className = 'upgrade-columns';

  // Group upgrades by category
  const groups = {};
  for (const [key, upg] of Object.entries(UPGRADES)) {
    const cat = upg.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({ key, ...upg });
  }

  for (const [catKey, catDef] of Object.entries(UPGRADE_CATEGORIES)) {
    const items = groups[catKey];
    if (!items) continue;

    const group = document.createElement('div');
    group.className = 'upgrade-group';

    const groupTitle = document.createElement('h3');
    groupTitle.textContent = catDef.icon + ' ' + catDef.label;
    group.appendChild(groupTitle);

    items.forEach(upg => {
      const currentLevel = state.upgrades[upg.key] || 0;
      const maxed = currentLevel >= upg.maxLevel;
      const nextCost = maxed ? null : upg.costs[currentLevel];
      const canAfford = nextCost !== null && state.money >= nextCost;

      const item = document.createElement('div');
      item.className = 'upgrade-item';
      if (maxed) item.classList.add('owned');

      const info = document.createElement('div');
      info.className = 'upgrade-info';

      const nameEl = document.createElement('div');
      nameEl.className = 'upgrade-name';
      nameEl.textContent = upg.name;
      if (maxed) nameEl.textContent += ' \u2713';
      else if (currentLevel > 0) nameEl.textContent += ' (Lv ' + currentLevel + ')';
      info.appendChild(nameEl);

      const descEl = document.createElement('div');
      descEl.className = 'upgrade-desc';
      if (maxed) {
        descEl.textContent = 'Fully upgraded';
      } else {
        descEl.textContent = upg.descriptions[currentLevel];
      }
      info.appendChild(descEl);

      // Show current effect if partially upgraded
      if (currentLevel > 0 && !maxed) {
        const currentEl = document.createElement('div');
        currentEl.style.cssText = 'font-size:.6rem;color:var(--accent);margin-top:2px';
        currentEl.textContent = 'Current: ' + upg.descriptions[currentLevel - 1];
        info.appendChild(currentEl);
      }

      item.appendChild(info);

      if (!maxed) {
        const buyBtn = document.createElement('button');
        buyBtn.className = canAfford ? 'btn btn-gold' : 'btn btn-muted';
        buyBtn.style.cssText = 'font-size:.75rem;padding:4px 10px;white-space:nowrap';
        buyBtn.textContent = '$' + nextCost;
        buyBtn.disabled = !canAfford;

        buyBtn.addEventListener('click', () => {
          purchaseUpgrade(upg.key, nextCost);
        });
        item.appendChild(buyBtn);
      }

      group.appendChild(item);
    });

    columns.appendChild(group);
  }

  c.appendChild(columns);

  // Stats summary
  const summary = document.createElement('div');
  summary.style.cssText = 'margin-top:20px;padding:12px;background:var(--bg-card);border-radius:var(--radius);font-size:.75rem;font-family:"Courier New",monospace;color:var(--text-muted)';
  summary.textContent =
    'Stable: ' + state.stable.length + '/' + getStableCap() +
    ' | Nursery: ' + state.nursery.length + '/' + getNurseryCap() +
    ' | Catch Gear: ' + CATCH_GEAR[state.upgrades.catchGear].name +
    ' | Energy: ' + state.energy + '/' + (state.maxEnergy + state.upgrades.energyBoost) +
    ' | Rep: ' + state.reputation;
  c.appendChild(summary);
}

function purchaseUpgrade(key, cost) {
  if (state.money < cost) return;
  const currentLevel = state.upgrades[key] || 0;
  const upg = UPGRADES[key];
  if (currentLevel >= upg.maxLevel) return;

  state.money -= cost;
  state.upgrades[key] = currentLevel + 1;

  state.eventLog = 'Purchased ' + upg.name + ' upgrade!';

  // Apply immediate effects
  if (key === 'energyBoost') {
    // Don't retroactively give energy, just update max for next day
  }

  saveState();
  renderHeader();
  renderUpgradesTab();
}

/* ── Event Wiring ────────────────────────────── */
$('endDayBtn').addEventListener('click', endDay);
$('resetBtn').addEventListener('click', () => { resetGame(); });

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
  $('modalOverlay').dataset.locked = '';
}

$('modalOverlay').addEventListener('click', e => {
  if (e.target === $('modalOverlay') && $('modalOverlay').dataset.locked !== 'true') hideModal();
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
