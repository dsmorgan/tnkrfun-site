/* ═══════════════════════════════════════════════════════════════
   HORSE BREEDER — Static Game Data
   Breeds, coat color genetics, stats, biomes, buyers, upgrades
   ═══════════════════════════════════════════════════════════════ */

/* ── Coat Color Genetics ─────────────────────── */
// Each locus: { alleles, dominance description }
// Horses carry 2 alleles per locus (one from each parent)

const COAT_LOCI = {
  extension: {
    name: 'Extension (MC1R)',
    alleles: ['E', 'e'],
    // E dominant over e. E_ = can make black pigment, ee = chestnut
  },
  agouti: {
    name: 'Agouti (ASIP)',
    alleles: ['A', 'a'],
    // A dominant over a. A_ = restricts black to points (bay), aa = uniform black
    // Only visible when Extension has E_
  },
  cream: {
    name: 'Cream',
    alleles: ['Cr', 'N'],
    // Incomplete dominance: N/N = normal, N/Cr = single dilute, Cr/Cr = double dilute
  },
  dun: {
    name: 'Dun',
    alleles: ['D', 'd'],
    // D dominant. D_ = dun dilution + dorsal stripe
  },
  grey: {
    name: 'Grey',
    alleles: ['G', 'g'],
    // G dominant. G_ = progressive greying with age
  },
  tobiano: {
    name: 'Tobiano',
    alleles: ['T', 't'],
    // T dominant. T_ = large white patches
  },
  overo: {
    name: 'Frame Overo',
    alleles: ['O', 'o'],
    // Incomplete dominant. Oo = overo pattern. OO = lethal white (foal does not survive)
  },
  roan: {
    name: 'Roan',
    alleles: ['Rn', 'rn'],
    // Rn dominant. Rn_ = white hairs intermixed in coat
  },
};

// Coat color resolution: base color from Extension+Agouti, then modifiers
// Returns { name, bodyHex, pointsHex, maneHex, hasPoints, isDilute, isGrey, hasTobiano, hasOvero, hasRoan, hasDun }
const COAT_COLORS = {
  // Base colors
  bay:            { body: '#b8860b', points: '#222',    mane: '#222',    name: 'Bay' },
  black:          { body: '#1a1a1a', points: '#1a1a1a', mane: '#111',    name: 'Black' },
  chestnut:       { body: '#c4522a', points: '#c4522a', mane: '#8b3a1a', name: 'Chestnut' },
  // Single cream dilutions
  buckskin:       { body: '#d4a843', points: '#222',    mane: '#222',    name: 'Buckskin' },
  smokyBlack:     { body: '#2a2520', points: '#2a2520', mane: '#1a1815', name: 'Smoky Black' },
  palomino:       { body: '#daa520', points: '#daa520', mane: '#f5e6b8', name: 'Palomino' },
  // Double cream dilutions
  perlino:        { body: '#f5e6c8', points: '#eadcb0', mane: '#f0dca8', name: 'Perlino' },
  smokyCream:     { body: '#e8dcc8', points: '#e8dcc8', mane: '#e0d0b8', name: 'Smoky Cream' },
  cremello:       { body: '#f5ecd8', points: '#f5ecd8', mane: '#faf0e0', name: 'Cremello' },
  // Dun dilutions
  bayDun:         { body: '#c4a855', points: '#222',    mane: '#222',    name: 'Bay Dun' },
  grullo:         { body: '#8a8480', points: '#555',    mane: '#444',    name: 'Grullo' },
  redDun:         { body: '#d4976a', points: '#d4976a', mane: '#b07850', name: 'Red Dun' },
  // Grey (special - overrides with age)
  grey:           { body: '#aaaaaa', points: '#999',    mane: '#bbb',    name: 'Grey' },
  // Roan variants
  bayRoan:        { body: '#b8860b', points: '#222',    mane: '#222',    name: 'Bay Roan' },
  blueRoan:       { body: '#1a1a1a', points: '#1a1a1a', mane: '#111',    name: 'Blue Roan' },
  redRoan:        { body: '#c4522a', points: '#c4522a', mane: '#8b3a1a', name: 'Red Roan' },
};

// Face marking types (cosmetic, randomly assigned)
const FACE_MARKINGS = ['none', 'star', 'stripe', 'blaze', 'snip', 'bald'];

// Leg marking types (cosmetic)
const LEG_MARKINGS = ['none', 'socks', 'stockings', 'half-pastern'];

/* ── Breed Definitions ───────────────────────── */
const BREEDS = {
  thoroughbred: {
    name: 'Thoroughbred',
    size: '16hh',
    build: 'lean',
    description: 'Tall, lean, and athletic. Born to run.',
    // Allele tendencies: probability weights for wild/new horse generation
    allelePools: {
      extension: { E: 0.7, e: 0.3 },
      agouti:    { A: 0.6, a: 0.4 },
      cream:     { N: 0.95, Cr: 0.05 },
      dun:       { d: 0.98, D: 0.02 },
      grey:      { g: 0.8, G: 0.2 },
      tobiano:   { t: 1.0, T: 0 },
      overo:     { o: 1.0, O: 0 },
      roan:      { rn: 0.95, Rn: 0.05 },
    },
    // Base stat ranges [min, max] for wild-caught horses
    stats: {
      speed:     [55, 85],
      stamina:   [40, 65],
      agility:   [45, 70],
      strength:  [25, 45],
      obedience: [30, 55],
    },
    // Talent ranges (genetic ceiling for training)
    talents: {
      speed:     [70, 100],
      stamina:   [55, 80],
      agility:   [60, 85],
      strength:  [35, 60],
      obedience: [40, 70],
    },
  },
  arabian: {
    name: 'Arabian',
    size: '14.3hh',
    build: 'refined',
    description: 'Refined and spirited. Legendary endurance.',
    allelePools: {
      extension: { E: 0.6, e: 0.4 },
      agouti:    { A: 0.7, a: 0.3 },
      cream:     { N: 0.92, Cr: 0.08 },
      dun:       { d: 0.95, D: 0.05 },
      grey:      { g: 0.65, G: 0.35 },
      tobiano:   { t: 1.0, T: 0 },
      overo:     { o: 0.98, O: 0.02 },
      roan:      { rn: 0.95, Rn: 0.05 },
    },
    stats: {
      speed:     [45, 70],
      stamina:   [60, 90],
      agility:   [50, 75],
      strength:  [20, 40],
      obedience: [35, 60],
    },
    talents: {
      speed:     [60, 85],
      stamina:   [75, 100],
      agility:   [65, 90],
      strength:  [30, 55],
      obedience: [45, 75],
    },
  },
  quarterHorse: {
    name: 'Quarter Horse',
    size: '15.1hh',
    build: 'stocky',
    description: 'Muscular and quick. King of the sprint.',
    allelePools: {
      extension: { E: 0.65, e: 0.35 },
      agouti:    { A: 0.6, a: 0.4 },
      cream:     { N: 0.8, Cr: 0.2 },
      dun:       { d: 0.85, D: 0.15 },
      grey:      { g: 0.9, G: 0.1 },
      tobiano:   { t: 0.95, T: 0.05 },
      overo:     { o: 0.95, O: 0.05 },
      roan:      { rn: 0.85, Rn: 0.15 },
    },
    stats: {
      speed:     [50, 80],
      stamina:   [35, 60],
      agility:   [40, 65],
      strength:  [45, 70],
      obedience: [45, 70],
    },
    talents: {
      speed:     [65, 95],
      stamina:   [50, 75],
      agility:   [55, 80],
      strength:  [60, 85],
      obedience: [55, 85],
    },
  },
  clydesdale: {
    name: 'Clydesdale',
    size: '17hh',
    build: 'heavy',
    description: 'Gentle giant. Built for power.',
    allelePools: {
      extension: { E: 0.75, e: 0.25 },
      agouti:    { A: 0.5, a: 0.5 },
      cream:     { N: 0.95, Cr: 0.05 },
      dun:       { d: 0.95, D: 0.05 },
      grey:      { g: 0.92, G: 0.08 },
      tobiano:   { t: 0.85, T: 0.15 },
      overo:     { o: 0.98, O: 0.02 },
      roan:      { rn: 0.7, Rn: 0.3 },
    },
    stats: {
      speed:     [20, 40],
      stamina:   [50, 75],
      agility:   [15, 35],
      strength:  [65, 95],
      obedience: [50, 75],
    },
    talents: {
      speed:     [30, 55],
      stamina:   [65, 90],
      agility:   [25, 50],
      strength:  [80, 100],
      obedience: [60, 90],
    },
  },
  appaloosa: {
    name: 'Appaloosa',
    size: '15hh',
    build: 'medium',
    description: 'Versatile and eye-catching. Spotted beauty.',
    allelePools: {
      extension: { E: 0.6, e: 0.4 },
      agouti:    { A: 0.55, a: 0.45 },
      cream:     { N: 0.9, Cr: 0.1 },
      dun:       { d: 0.9, D: 0.1 },
      grey:      { g: 0.9, G: 0.1 },
      tobiano:   { t: 0.8, T: 0.2 },
      overo:     { o: 0.85, O: 0.15 },
      roan:      { rn: 0.7, Rn: 0.3 },
    },
    stats: {
      speed:     [40, 65],
      stamina:   [45, 70],
      agility:   [45, 75],
      strength:  [35, 60],
      obedience: [40, 65],
    },
    talents: {
      speed:     [55, 80],
      stamina:   [60, 85],
      agility:   [60, 90],
      strength:  [50, 75],
      obedience: [55, 80],
    },
  },
  paint: {
    name: 'Paint Horse',
    size: '15.2hh',
    build: 'stocky',
    description: 'Bold patterns. Athletic and willing.',
    allelePools: {
      extension: { E: 0.6, e: 0.4 },
      agouti:    { A: 0.55, a: 0.45 },
      cream:     { N: 0.85, Cr: 0.15 },
      dun:       { d: 0.9, D: 0.1 },
      grey:      { g: 0.92, G: 0.08 },
      tobiano:   { t: 0.35, T: 0.65 },
      overo:     { o: 0.55, O: 0.45 },
      roan:      { rn: 0.9, Rn: 0.1 },
    },
    stats: {
      speed:     [45, 70],
      stamina:   [35, 60],
      agility:   [45, 70],
      strength:  [40, 65],
      obedience: [45, 70],
    },
    talents: {
      speed:     [60, 85],
      stamina:   [50, 75],
      agility:   [60, 85],
      strength:  [55, 80],
      obedience: [55, 85],
    },
  },
};

/* ── Stat Definitions ────────────────────────── */
const STAT_DEFS = {
  speed:     { name: 'SPD', label: 'Speed',     color: 'rgb(var(--pill-speed))' },
  stamina:   { name: 'STA', label: 'Stamina',   color: 'rgb(var(--pill-stamina))' },
  agility:   { name: 'AGI', label: 'Agility',   color: 'rgb(var(--pill-agility))' },
  strength:  { name: 'STR', label: 'Strength',  color: 'rgb(var(--pill-strength))' },
  obedience: { name: 'OBD', label: 'Obedience', color: 'rgb(var(--pill-obedience))' },
};

const STAT_COLORS = {
  speed:     '74,158,255',
  stamina:   '80,216,144',
  agility:   '255,179,71',
  strength:  '255,107,107',
  obedience: '180,122,255',
};

/* ── Biomes / Regions ────────────────────────── */
const BIOMES = {
  plains: {
    name: 'Open Plains',
    description: 'Rolling grasslands. Common breeds roam freely.',
    repRequired: 0,
    breeds: ['quarterHorse', 'paint', 'thoroughbred'],
    catchDifficulty: 0.5, // base success rate
    rareChance: 0.08,     // chance of rare color variant
  },
  mountains: {
    name: 'Mountain Range',
    description: 'Rugged terrain. Hardy breeds with strong builds.',
    repRequired: 150,
    breeds: ['appaloosa', 'clydesdale', 'arabian'],
    catchDifficulty: 0.35,
    rareChance: 0.12,
  },
  coast: {
    name: 'Coastal Wilds',
    description: 'Windswept shores. Diverse and unpredictable.',
    repRequired: 400,
    breeds: ['thoroughbred', 'arabian', 'paint', 'appaloosa'],
    catchDifficulty: 0.25,
    rareChance: 0.18,
  },
};

/* ── Equipment / Catch Gear ──────────────────── */
const CATCH_GEAR = [
  { name: 'Lasso',       bonus: 0,    cost: 0 },
  { name: 'Corral Trap', bonus: 0.15, cost: 300 },
  { name: 'Tranq Dart',  bonus: 0.30, cost: 600 },
  { name: 'Pro Rig',     bonus: 0.45, cost: 1200 },
];

/* ── Upgrades ────────────────────────────────── */
const UPGRADES = {
  catchGear:     { name: 'Catch Gear',      maxLevel: 3, costs: [300, 600, 1200],  category: 'equipment', descriptions: ['Corral Trap (+15% catch)', 'Tranq Dart (+30% catch)', 'Pro Rig (+45% catch)'] },
  stableSize:    { name: 'Stable Expansion', maxLevel: 3, costs: [200, 500, 1000],  category: 'facility',  descriptions: ['8 stalls', '12 stalls', '16 stalls'] },
  nurserySize:   { name: 'Nursery Upgrade',  maxLevel: 2, costs: [400, 800],        category: 'facility',  descriptions: ['2 breeding slots', '3 breeding slots'] },
  trainingRing:  { name: 'Training Facility',maxLevel: 2, costs: [500, 1200],       category: 'facility',  descriptions: ['Training Barn (+1 stat/session)', 'Pro Facility (+2 stat, talent hints)'] },
  autoFeeder:    { name: 'Auto-Feeder',      maxLevel: 1, costs: [350],             category: 'care',      descriptions: ['Auto basic feed (prevents hunger decay)'] },
  vetOnCall:     { name: 'Vet on Call',       maxLevel: 1, costs: [500],             category: 'care',      descriptions: ['Prevents illness events'] },
  breedLicense:  { name: 'Breeding License',  maxLevel: 1, costs: [200],             category: 'knowledge', descriptions: ['Legal breeding (no fines)'] },
  coatGuide:     { name: 'Coat Genetics Guide',maxLevel: 1, costs: [300],            category: 'knowledge', descriptions: ['Shows genotype on horses'] },
  lineageTracker:{ name: 'Lineage Tracker',   maxLevel: 1, costs: [400],             category: 'knowledge', descriptions: ['Shows full ancestry tree'] },
  energyBoost:   { name: 'Ranch Hands',       maxLevel: 2, costs: [400, 800],        category: 'facility',  descriptions: ['4 energy/day', '5 energy/day'] },
};

/* ── Competition Events ──────────────────────── */
const EVENTS = {
  sprint:     { name: 'Sprint',          primary: 'speed',     secondary: 'agility',   repRequired: 0,   prize: [80, 150],  repGain: 5 },
  marathon:   { name: 'Marathon',         primary: 'stamina',   secondary: 'speed',     repRequired: 0,   prize: [80, 150],  repGain: 5 },
  obstacle:   { name: 'Obstacle Course',  primary: 'agility',   secondary: 'obedience', repRequired: 0,   prize: [80, 150],  repGain: 5 },
  heavyHaul:  { name: 'Heavy Haul',       primary: 'strength',  secondary: 'stamina',   repRequired: 100, prize: [120, 220], repGain: 8 },
  precision:  { name: 'Precision Trial',  primary: 'obedience', secondary: 'agility',   repRequired: 100, prize: [120, 220], repGain: 8 },
  grandPrix:  { name: 'Grand Prix',       primary: null,        secondary: null,        repRequired: 600, prize: [300, 500], repGain: 20 },
};

/* ── Buyer Templates ─────────────────────────── */
const BUYER_NAMES = [
  'Lady Pemberton', 'Duke Harrington', 'Ms. Tanaka', 'Old McGregor',
  'Baron von Clip-Clop', 'Tex Ryder', 'Princess Anastasia', 'Coach Jenkins',
  'The Mysterious Stranger', 'Farmer Giles', 'Countess Rosalind', 'Big Jim',
  'Professor Galloway', 'Sheriff Dawson', 'Madame Bijou', 'Colonel Mustard',
];

const BUYER_QUOTES = [
  "I need a {color} horse. My astrologer insists.",
  "Looking for something {stat}. Don't ask why.",
  "I want a {breed}. Nothing else will do.",
  "My niece wants a {color} horse for her birthday.",
  "I need a fast horse. Legally, I cannot elaborate.",
  "Looking for a horse with high {stat}. It's for a bet.",
  "I require a {color} {breed}. Money is no object. Well, some object.",
  "Heard you breed champions. Prove it.",
  "Need a strong horse. My last one judged me.",
  "Looking for something calm. My last horse was... opinionated.",
];

/* ── Horse Names ─────────────────────────────── */
const NAME_PREFIXES = [
  'Thunder', 'Shadow', 'Storm', 'Midnight', 'Golden', 'Silver', 'Wild',
  'Lucky', 'Dusty', 'Rusty', 'Whiskey', 'Copper', 'Onyx', 'Ruby',
  'Misty', 'Blaze', 'Spirit', 'Ember', 'Frost', 'Maple', 'Sage',
  'Arrow', 'Rebel', 'Rogue', 'Noble', 'Swift', 'Star', 'River',
];
const NAME_SUFFIXES = [
  'clap', 'bolt', 'dancer', 'runner', 'whisper', 'heart', 'fire',
  'wind', 'dream', 'song', 'light', 'streak', 'mane', 'hoof',
  'star', 'moon', 'blaze', 'spirit', 'charm', 'pride',
  '', '', '', '', '', '', '', // empty = prefix-only name
];

/* ── Happiness Flavors ───────────────────────── */
const MOOD_TEXTS = {
  high:   ['is vibing', 'is living their best life', 'is radiating contentment', 'approves of you (for now)'],
  medium: ['seems fine', 'is tolerating existence', 'is cautiously optimistic', 'is plotting something'],
  low:    ['is judging you silently', 'is having an existential crisis', 'demands better management', 'is writing a strongly worded letter'],
  zero:   ['has given up on you', 'is considering a career change', 'refuses to make eye contact'],
};

/* ── Random Events ───────────────────────────── */
const RANDOM_EVENTS = [
  { name: 'Rare Sighting',     weight: 15, effect: 'rareBoost',     duration: 3, text: 'A rare wild horse has been spotted near the {biome}!' },
  { name: 'Buyer Rush',        weight: 12, effect: 'buyerRush',     duration: 3, text: 'Word of your ranch spread! Extra buyers are calling.' },
  { name: 'Equipment Trouble', weight: 8,  effect: 'gearDown',      duration: 2, text: 'Your catch gear needs repairs. Reduced effectiveness.' },
  { name: 'Mutation Surge',    weight: 5,  effect: 'mutationBoost', duration: 3, text: 'Something in the water... Mutation rates doubled!' },
  { name: 'Inspector Visit',   weight: 10, effect: 'inspection',    duration: 0, text: 'A breeding inspector has arrived for a surprise visit.' },
  { name: 'Celebrity Buyer',   weight: 3,  effect: 'celebrity',     duration: 1, text: 'A celebrity wants to buy a horse! Premium prices offered.' },
  { name: 'Storm Warning',     weight: 10, effect: 'storm',         duration: 1, text: 'A storm blocks all exploration today.' },
  { name: 'Good Weather',      weight: 15, effect: 'goodWeather',   duration: 1, text: 'Beautiful day! Horses train more effectively today.' },
];

/* ── Care Shop ───────────────────────────────── */
const CARE_SHOP = {
  basicFeed:   { name: 'Basic Feed',      desc: '10 servings \u2014 prevents daily happiness decay', cost: 15,  stock: 'basic',   amount: 10, type: 'feed' },
  premiumFeed: { name: 'Premium Feed',    desc: '10 servings \u2014 +1 happiness/day & training boost', cost: 40,  stock: 'premium', amount: 10, type: 'feed' },
  treat:       { name: 'Treats',          desc: 'x5 \u2014 +8 happiness per use',       cost: 10,  stock: 'treats',       amount: 5, type: 'supply' },
  brush:       { name: 'Grooming Kit',    desc: 'x5 \u2014 +6 happiness & training bonus', cost: 12,  stock: 'brush',        amount: 5, type: 'supply' },
  appleBasket: { name: 'Apple Basket',    desc: 'x3 \u2014 +12 happiness, clears overtrain', cost: 18, stock: 'appleBasket',  amount: 3, type: 'supply' },
};

const CARE_ACTIONS = [
  { key: 'walk',    name: 'Gentle Walk',    desc: 'A calm stroll around the ranch', supply: null,          happiness: 3,  effect: null },
  { key: 'treat',   name: 'Give Treat',     desc: 'A tasty reward',                 supply: 'treats',      happiness: 8,  effect: null },
  { key: 'brush',   name: 'Brush & Groom',  desc: 'Coat care + bonding',            supply: 'brush',       happiness: 6,  effect: 'brushed' },
  { key: 'apple',   name: 'Apple Basket',   desc: 'A whole basket of apples',       supply: 'appleBasket', happiness: 12, effect: 'clearOvertrain' },
];
