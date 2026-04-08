// Tinker Impact — static game data
// Heroes, classes, rarity tiers, campaign stages, icon mappings.
// Icons from game-icons.net (CC BY 3.0). Slugs are stored here; the actual SVG
// data URIs live in icon-data.js (ICON_DATA[slug]).

// ───────────────────────────────────────────────
// Rarity tiers (4-tier system: Basic / Common / Rare / Epic)
// ───────────────────────────────────────────────
const RARITY = {
  basic:  { weight:  0, label: 'Basic',  stars: 1, statMult: 0.85, tint: 'basic' },
  common: { weight: 70, label: 'Common', stars: 1, statMult: 1.00, tint: 'common' },
  rare:   { weight: 25, label: 'Rare',   stars: 2, statMult: 1.30, tint: 'rare' },
  epic:   { weight:  5, label: 'Epic',   stars: 3, statMult: 1.65, tint: 'epic' },
};

const PITY_SOFT_THRESHOLD = 8;
const PULL_COST = 100;
const PULL_COST_10 = 900;
const SHARDS_PER_LEVEL = 5;
const MAX_LEVEL = 10;

// ───────────────────────────────────────────────
// Classes
// ───────────────────────────────────────────────
const CLASSES = {
  knight:  { baseHp: 120, baseAtk: 10, baseSpd: 4,  role: 'tank' },
  mage:    { baseHp: 60,  baseAtk: 22, baseSpd: 6,  role: 'aoe'  },
  rogue:   { baseHp: 70,  baseAtk: 16, baseSpd: 10, role: 'back' },
  healer:  { baseHp: 80,  baseAtk: 8,  baseSpd: 7,  role: 'heal' },
};

// ───────────────────────────────────────────────
// Heroes (15 launch — Druid is now Epic)
// ───────────────────────────────────────────────
const HEROES = [
  // Commons (16) — up to 2 per SVG, class-balanced 4/4/4/4
  { id: 'c_knight_1', name: 'Squire',      class: 'knight', rarity: 'common', flavor: 'Holds the line, mostly.' },
  { id: 'c_knight_2', name: 'Footman',     class: 'knight', rarity: 'common', flavor: 'Polished armor, dented helmet.' },
  { id: 'c_knight_3', name: 'Cavalryman',  class: 'knight', rarity: 'common', flavor: 'Horse and sword, not much else.' },
  { id: 'c_knight_4', name: 'Sentinel',    class: 'knight', rarity: 'common', flavor: 'Watches. Always watches.' },
  { id: 'c_mage_1',   name: 'Apprentice',  class: 'mage',   rarity: 'common', flavor: 'Three spells, no patience.' },
  { id: 'c_mage_2',   name: 'Scribe',      class: 'mage',   rarity: 'common', flavor: 'Spells between footnotes.' },
  { id: 'c_mage_3',   name: 'Initiate',    class: 'mage',   rarity: 'common', flavor: 'First robes, first mistakes.' },
  { id: 'c_mage_4',   name: 'Hermit',      class: 'mage',   rarity: 'common', flavor: 'Talks to rocks. Rocks answer.' },
  { id: 'c_rogue_1',  name: 'Cutpurse',    class: 'rogue',  rarity: 'common', flavor: 'Quick fingers, quicker exits.' },
  { id: 'c_rogue_2',  name: 'Pilgrim',     class: 'rogue',  rarity: 'common', flavor: 'Long road, longer knife.' },
  { id: 'c_rogue_3',  name: 'Zealot',      class: 'rogue',  rarity: 'common', flavor: 'Believes hard, stabs harder.' },
  { id: 'c_rogue_4',  name: 'Devotee',     class: 'rogue',  rarity: 'common', flavor: 'Whispers the old oaths.' },
  { id: 'c_healer_1', name: 'Acolyte',     class: 'healer', rarity: 'common', flavor: 'Bandages and prayers.' },
  { id: 'c_healer_2', name: 'Novice',      class: 'healer', rarity: 'common', flavor: 'Learning to bind wounds.' },
  { id: 'c_healer_3', name: 'Deacon',      class: 'healer', rarity: 'common', flavor: 'Keeper of the lesser rites.' },
  { id: 'c_healer_4', name: 'Lamplighter', class: 'healer', rarity: 'common', flavor: 'Brings light to dark halls.' },
  // Rares (6)
  { id: 'r_knight_1', name: 'Paladin',     class: 'knight', rarity: 'rare', flavor: 'Smites with conviction.' },
  { id: 'r_mage_1',   name: 'Pyromancer',  class: 'mage',   rarity: 'rare', flavor: 'Fond of large fires.' },
  { id: 'r_mage_2',   name: 'Frostweaver', class: 'mage',   rarity: 'rare', flavor: 'Speaks in chilled whispers.' },
  { id: 'r_rogue_1',  name: 'Nightblade',  class: 'rogue',  rarity: 'rare', flavor: 'Steps where shadows do.' },
  { id: 'r_rogue_2',  name: 'Duelist',     class: 'rogue',  rarity: 'rare', flavor: 'Counters before you swing.' },
  { id: 'r_healer_1', name: 'Priest',      class: 'healer', rarity: 'rare', flavor: 'Faith with a sharp tongue.' },
  // Epics (4 — one per class now that Druid is Epic)
  { id: 'e_knight',   name: 'Lord Ironveil', class: 'knight', rarity: 'epic', flavor: 'A wall that never blinked.' },
  { id: 'e_mage',     name: 'Archmage Vyr',  class: 'mage',   rarity: 'epic', flavor: 'Forgot more than you know.' },
  { id: 'e_rogue',    name: 'Shadowfang',    class: 'rogue',  rarity: 'epic', flavor: 'Half-rumor, half-blade.' },
  { id: 'r_healer_2', name: 'Druid',         class: 'healer', rarity: 'epic', flavor: 'Friend to roots and thorns.' },
];

// ───────────────────────────────────────────────
// Hero icon map (slug from ICONS.md → game-icons.net author/name)
// Looked up in ICON_DATA at render time.
// ───────────────────────────────────────────────
const HERO_ICONS = {
  // Knights
  c_knight_1: 'skoll/mounted-knight',
  c_knight_2: 'lorc/visored-helm',
  c_knight_3: 'skoll/mounted-knight',
  c_knight_4: 'lorc/visored-helm',
  r_knight_1: 'lorc/visored-helm',
  e_knight:   'delapouite/black-knight-helm',
  // Mages
  c_mage_1:   'delapouite/wizard-face',
  c_mage_2:   'delapouite/wizard-face',
  c_mage_3:   'delapouite/warlock-hood',
  c_mage_4:   'delapouite/warlock-hood',
  r_mage_1:   'delapouite/wizard-face',
  r_mage_2:   'delapouite/warlock-hood',
  e_mage:     'delapouite/warlock-eye',
  // Rogues
  c_rogue_1:  'lorc/robe',
  c_rogue_2:  'lorc/robe',
  c_rogue_3:  'lorc/cultist',
  c_rogue_4:  'lorc/cultist',
  r_rogue_1:  'lorc/robe',
  r_rogue_2:  'lorc/cultist',
  e_rogue:    'lorc/hood',
  // Healers
  c_healer_1: 'delapouite/monk-face',
  c_healer_2: 'delapouite/monk-face',
  c_healer_3: 'delapouite/sun-priest',
  c_healer_4: 'delapouite/sun-priest',
  r_healer_1: 'delapouite/sun-priest',
  r_healer_2: 'delapouite/warlock-hood', // Druid (Epic)
};

// ───────────────────────────────────────────────
// Enemy types
//
// Enemies are identified by a "kind" key (e.g. 'goblin', 'cave-spider').
// Each kind has up to 3 variants — I, II, III — that are stronger versions
// of the same enemy. The base variant (I) uses the kind's primary tier color.
//
// Variant rules in combat:
//   - Stage authoring uses the base kind. At battle start each enemy is
//     rolled for an upgrade: 90% stays at I, 9% becomes II, 1% becomes III.
//   - II = +1 type tier (e.g. A → B), +1 level, ~stat boost
//   - III = +2 type tiers if available (e.g. A → C), +2 levels, larger boost
//
// "Type" letters map to color tints (see RARITY/ENEMY_TYPE_TINT in CSS):
//   A = light green   (weak nature)
//   B = green         (medium nature)
//   C = dark green    (strong nature)
//   D = light blue    (weak ice)
//   E = blue          (medium ice)
//   F = dark blue     (strong ice)
//   G = red           (boss)
// ───────────────────────────────────────────────

const ENEMY_VARIANT_ROLL = [
  { tier: 0, weight: 90 }, // I  — base
  { tier: 1, weight:  9 }, // II — bumped one shade
  { tier: 2, weight:  1 }, // III — bumped two shades (where available)
];

// Each kind: icon slug, display name, base type letter, list of available
// type letters in escalation order, stat profile (class), base level offset.
const ENEMY_KINDS = {
  // ── Goblins / Orcs ─────────────────────────────────
  'goblin-whelp': {
    name: 'Goblin Whelp', class: 'rogue',
    icon: 'delapouite/goblin-head',
    types: ['A','B','C'], // I/II/III tints
  },
  'goblin': {
    name: 'Goblin', class: 'rogue',
    icon: 'delapouite/goblin-head',
    types: ['B','C','C'],
  },
  'goblin-shaman': {
    name: 'Goblin Shaman', class: 'mage',
    icon: 'delapouite/ogre',
    types: ['B','C','C'],
  },
  'goblin-warlord': {
    name: 'Goblin Warlord', class: 'knight',
    icon: 'delapouite/orc-head',
    types: ['C','C','C'],
  },

  // ── Spiders / Bugs ─────────────────────────────────
  'cave-spider': {
    name: 'Cave Spider', class: 'rogue',
    icon: 'delapouite/spider-eye',
    types: ['A','B','C'],
    // Variant III uses a different icon (more menacing)
    altIcons: { 2: 'delapouite/spider-bot' },
    altNames: { 1: 'Cave Spider II', 2: 'Cave Spider III' },
  },

  // ── Bandits / Humanoids ────────────────────────────
  'bandit': {
    name: 'Bandit', class: 'rogue',
    icon: 'delapouite/kenku-head',
    types: ['A','B','C'],
  },
  'bandit-healer': {
    name: 'Bandit Healer', class: 'healer',
    icon: 'delapouite/kenku-head',
    types: ['B','C','C'],
  },
  'bandit-brute': {
    name: 'Bandit Brute', class: 'knight',
    icon: 'delapouite/kenku-head',
    types: ['C','C','C'],
  },

  // ── Wolves ─────────────────────────────────────────
  'frost-wolf': {
    name: 'Frost Wolf', class: 'rogue',
    icon: 'lorc/wolf-head',
    types: ['D','E','F'],
  },

  // ── Bears ──────────────────────────────────────────
  'cave-bear': {
    name: 'Cave Bear', class: 'knight',
    icon: 'delapouite/bear-head',
    types: ['A','B','C'],
  },

  // ── Yetis / Giants ─────────────────────────────────
  'yeti-cub': {
    name: 'Yeti Cub', class: 'knight',
    icon: 'delapouite/metal-golem-head',
    types: ['A','B','C'],
  },
  'yeti-king': {
    name: 'Yeti King', class: 'knight',
    icon: 'delapouite/golem-head',
    types: ['B','C','C'],
  },

  // ── Frost / Ice ────────────────────────────────────
  'ice-sprite': {
    name: 'Ice Sprite', class: 'mage',
    icon: 'lorc/ghost',
    types: ['D','E','F'],
  },
  'frost-mage': {
    name: 'Frost Mage', class: 'mage',
    icon: 'delapouite/warlock-hood',
    types: ['D','E','F'],
  },
  'ice-priest': {
    name: 'Ice Priest', class: 'healer',
    icon: 'delapouite/monk-face',
    types: ['E','F','F'],
  },
  'frost-knight': {
    name: 'Frost Knight', class: 'knight',
    icon: 'delapouite/dwarf-face',
    types: ['E','F','F'],
  },
  'frost-wraith': {
    name: 'Frost Wraith', class: 'rogue',
    icon: 'lorc/spectre',
    types: ['F','F','F'],
  },

  // ── Shadow / Cult (Chapter 3) ──────────────────────
  'shadow-guard': {
    name: 'Shadow Guard', class: 'knight',
    icon: 'delapouite/dwarf-face',
    types: ['A','B','C'],
  },
  'shadow-archer': {
    name: 'Shadow Archer', class: 'rogue',
    icon: 'delapouite/archer',
    types: ['A','B','C'],
  },
  'shadow-knight': {
    name: 'Shadow Knight', class: 'knight',
    icon: 'delapouite/dwarf-face',
    types: ['B','C','C'],
  },
  'wraith': {
    name: 'Wraith', class: 'rogue',
    icon: 'lorc/spectre',
    types: ['B','C','C'],
  },
  'cult-healer': {
    name: 'Cult Healer', class: 'healer',
    icon: 'delapouite/monk-face',
    types: ['B','C','C'],
  },
  'cult-mage': {
    name: 'Cult Mage', class: 'mage',
    icon: 'delapouite/warlock-hood',
    types: ['C','C','C'],
  },
  'high-priest': {
    name: 'High Priest', class: 'healer',
    icon: 'delapouite/sun-priest',
    types: ['C','C','C'],
  },
  'the-shadow-lord': {
    name: 'The Shadow Lord', class: 'mage',
    icon: 'delapouite/devil-mask',
    types: ['G','G','G'], // boss tier — always red
    isBoss: true,
  },
};

// ───────────────────────────────────────────────
// Campaign — stages reference enemies by kind key + base level.
// At battle start, each enemy is rolled for variant upgrades.
// ───────────────────────────────────────────────
function enemy(kind, level) { return { kind, level }; }

const CAMPAIGN = [
  {
    id: 1,
    name: 'The Goblin Woods',
    stages: [
      { id: '1-1', name: 'Forest Edge',    enemies: [enemy('goblin-whelp', 1), enemy('goblin-whelp', 1)] },
      { id: '1-2', name: 'Mossy Hollow',   enemies: [enemy('goblin', 1), enemy('goblin', 1), enemy('goblin-shaman', 1)] },
      { id: '1-3', name: 'Spider Glade',   enemies: [enemy('cave-spider', 1), enemy('cave-spider', 1)] },
      { id: '1-4', name: "Thieves' Camp",  enemies: [enemy('bandit', 1), enemy('bandit-healer', 1), enemy('bandit-brute', 1)] },
      { id: '1-5', name: 'Goblin Warlord', enemies: [enemy('goblin-warlord', 1), enemy('goblin-shaman', 1), enemy('goblin', 1)] },
    ],
  },
  {
    id: 2,
    name: 'The Frozen Pass',
    stages: [
      { id: '2-1', name: 'Snowfield',     enemies: [enemy('frost-wolf', 4), enemy('frost-wolf', 4), enemy('frost-wolf', 4)] },
      { id: '2-2', name: 'Ice Cavern',    enemies: [enemy('ice-sprite', 4), enemy('ice-sprite', 4), enemy('cave-bear', 3)] },
      { id: '2-3', name: 'Glacier Path',  enemies: [enemy('yeti-cub', 5), enemy('yeti-cub', 5), enemy('frost-mage', 3)] },
      { id: '2-4', name: 'Frozen Shrine', enemies: [enemy('ice-priest', 4), enemy('frost-knight', 4), enemy('frost-wraith', 3)] },
      { id: '2-5', name: 'The Yeti King', enemies: [enemy('yeti-king', 4), enemy('frost-mage', 5), enemy('frost-wolf', 5)] },
    ],
  },
  {
    id: 3,
    name: 'The Shadow Keep',
    stages: [
      { id: '3-1', name: 'Outer Walls',   enemies: [enemy('shadow-guard', 5), enemy('shadow-guard', 5), enemy('shadow-archer', 5)] },
      { id: '3-2', name: 'Cursed Halls',  enemies: [enemy('wraith', 6), enemy('wraith', 6), enemy('cult-healer', 5)] },
      { id: '3-3', name: 'Throne Room',   enemies: [enemy('cult-mage', 6), enemy('cult-mage', 6), enemy('shadow-knight', 6)] },
      { id: '3-4', name: 'Inner Sanctum', enemies: [enemy('high-priest', 5), enemy('shadow-knight', 7), enemy('wraith', 7)] },
      { id: '3-5', name: 'The Shadow Lord', enemies: [enemy('the-shadow-lord', 6), enemy('shadow-knight', 8), enemy('wraith', 8)] },
    ],
  },
];
