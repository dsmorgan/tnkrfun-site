// Tinker Impact — static game data
// Heroes, classes, rarity tiers, campaign stages, icon mappings.
// Icons from game-icons.net (CC BY 3.0). Slugs are stored here; the actual SVG
// data URIs live in icon-data.js (ICON_DATA[slug]).

// ───────────────────────────────────────────────
// Rarity tiers (4-tier system: Basic / Common / Rare / Epic)
// ───────────────────────────────────────────────
// Rarity: per-level multiplier is flat 0.15 (see LEVEL_MULT).
// No per-rarity stat multiplier — rarity instead determines start & max level.
const RARITY = {
  basic:  { weight:  0, label: 'Basic',  stars: 1, tint: 'basic',  startLevel: 1, maxLevel: 5  },
  common: { weight: 70, label: 'Common', stars: 1, tint: 'common', startLevel: 1, maxLevel: 8  },
  rare:   { weight: 25, label: 'Rare',   stars: 2, tint: 'rare',   startLevel: 3, maxLevel: 9  },
  epic:   { weight:  5, label: 'Epic',   stars: 3, tint: 'epic',   startLevel: 5, maxLevel: 10 },
};

const PITY_SOFT_THRESHOLD = 8;
const PULL_COST = 100;
const PULL_COST_10 = 900;
const SHARDS_PER_LEVEL = 5;
const LEVEL_MULT = 0.15; // stat = base × (1 + (level - 1) × LEVEL_MULT)
const MAX_LEVEL_EVER = 10; // absolute ceiling across all tiers

// Dupe-only bonus shards by rarity — uniform random in range.
// Common still gives 1 shard per dupe; Rare and Epic scale with rarity.
const DUPE_SHARD_RANGE = {
  common: [1, 1],
  rare:   [1, 3],
  epic:   [1, 5],
};
function shardsPerDupe(rarity) {
  const [lo, hi] = DUPE_SHARD_RANGE[rarity] || [1, 1];
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

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
  // Phase 2 enemies (3-5) — the "true form" wave
  'shadow-lord-awakened': {
    name: 'Shadow Lord Awakened', class: 'mage',
    icon: 'delapouite/devil-mask',
    types: ['G','G','G'],
    isBoss: true,
    hpMult: 2.0, // special flag — doubled HP from normal
  },
  'shadow-archon': {
    name: 'Shadow Archon', class: 'healer',
    icon: 'delapouite/warlock-hood',
    types: ['G','G','G'],
  },
  'shadow-vanguard': {
    name: 'Shadow Vanguard', class: 'knight',
    icon: 'delapouite/dwarf-face',
    types: ['G','G','G'],
  },
  'shadow-executioner': {
    name: 'Shadow Executioner', class: 'rogue',
    icon: 'lorc/spectre',
    types: ['G','G','G'],
  },
  'void-warlock': {
    name: 'Void Warlock', class: 'mage',
    icon: 'delapouite/warlock-eye',
    types: ['G','G','G'],
  },
  // Phase 2 enemies for 2-5 (ice family, type E/F)
  'yeti-emperor': {
    name: 'Yeti Emperor', class: 'knight',
    icon: 'delapouite/golem-head',
    types: ['F','F','F'],
    isBoss: true,
    hpMult: 2.0,
  },
  'frost-shaman': {
    name: 'Frost Shaman', class: 'mage',
    icon: 'delapouite/warlock-hood',
    types: ['F','F','F'],
  },
  'ice-guardian': {
    name: 'Ice Guardian', class: 'knight',
    icon: 'delapouite/dwarf-face',
    types: ['F','F','F'],
  },
  'glacial-wraith': {
    name: 'Glacial Wraith', class: 'rogue',
    icon: 'lorc/ghost',
    types: ['E','F','F'],
  },
  // Phase 3 boss for 3-5 — "true darkness" form with triple HP
  'shadow-lord-eternal': {
    name: 'Shadow Lord Eternal', class: 'mage',
    icon: 'delapouite/devil-mask',
    types: ['G','G','G'],
    isBoss: true,
    hpMult: 3.0,
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
      {
        id: '2-5', name: 'The Yeti King',
        phases: [
          {
            enemies: [enemy('yeti-king', 4), enemy('frost-mage', 5), enemy('frost-wolf', 5)],
          },
          {
            enemies: [
              enemy('yeti-emperor', 5),
              enemy('frost-shaman', 5),
              enemy('ice-guardian', 5),
              enemy('glacial-wraith', 5),
            ],
            bannerText: 'PHASE 2',
            voiceLines: ['The ice remembers every wound...', 'You will not leave this pass alive!'],
            rewardBonus: 250,
            intensity: 'medium',
            vignette: 'cyan',
            vortexColor: 'cyan',
          },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'The Shadow Keep',
    stages: [
      { id: '3-1', name: 'Outer Walls',   enemies: [enemy('shadow-guard', 5), enemy('shadow-guard', 5), enemy('shadow-archer', 5), enemy('shadow-archer', 5)] },
      { id: '3-2', name: 'Cursed Halls',  enemies: [enemy('wraith', 6), enemy('wraith', 6), enemy('cult-healer', 5), enemy('shadow-guard', 5)] },
      { id: '3-3', name: 'Throne Room',   enemies: [enemy('cult-mage', 6), enemy('shadow-knight', 6), enemy('shadow-archer', 6), enemy('cult-healer', 6)] },
      { id: '3-4', name: 'Inner Sanctum', enemies: [enemy('high-priest', 5), enemy('shadow-knight', 7), enemy('wraith', 7), enemy('cult-mage', 6), enemy('wraith', 7)] },
      {
        id: '3-5', name: 'The Shadow Lord',
        phases: [
          {
            enemies: [enemy('the-shadow-lord', 6), enemy('shadow-knight', 8), enemy('shadow-knight', 8), enemy('wraith', 8), enemy('cult-healer', 7)],
          },
          {
            enemies: [
              enemy('shadow-lord-awakened', 7),
              enemy('shadow-archon', 7),
              enemy('shadow-vanguard', 8),
              enemy('shadow-executioner', 8),
              enemy('void-warlock', 7),
            ],
            bannerText: 'PHASE 2',
            voiceLines: ['You dare strike me down?', 'Witness my true form!'],
            rewardBonus: 500,
            intensity: 'high',
            vignette: 'red',
            vortexColor: 'purple',
          },
          {
            enemies: [
              enemy('shadow-lord-eternal', 8),
              enemy('shadow-archon', 8),
              enemy('shadow-archon', 8),
              enemy('shadow-vanguard', 9),
              enemy('void-warlock', 8),
              enemy('shadow-executioner', 9),
            ],
            bannerText: 'PHASE 3 — TRUE DARKNESS',
            voiceLines: [
              'Impossible... you survived my second form...',
              'Then I shall reveal the true darkness.',
              'Witness the end of all light!',
            ],
            rewardBonus: 1000,
            intensity: 'max',
            vignette: 'darkred',
            vortexColor: 'purple',
          },
        ],
      },
    ],
  },
];
