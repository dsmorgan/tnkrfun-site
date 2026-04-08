# Tinker Impact — Icon Set

All icons from [game-icons.net](https://game-icons.net/) (CC BY 3.0).
Format per row: `slug = author/name` (e.g. `delapouite/bandit`).
Raw SVG URL: `https://raw.githubusercontent.com/game-icons/icons/master/<slug>.svg`
Preview URL: `https://game-icons.net/1x1/<slug>.html`

## 👉 Visual picker

Open **[icon-picker.html](http://localhost:8080/tinker-impact/icon-picker.html)** in a
browser. All candidates are grouped by role, rendered in all 3 rarity tints, with copy-slug
buttons. Find one you like → click **copy slug** → paste it in the table below.

**How to edit this file:**
- Replace the `slug` value on any row to override.
- Rows are grouped by class so you can see C → R → E progression at a glance.
- Leave a slug blank / delete a row to fall back to the class icon.
- When you're done, tell me and I'll fetch + inline the SVGs into `data.js`.

---

## Heroes — Knights (Tank)

| Hero ID | Name | Rarity | Slug |
|---|---|---|---|
| c_knight_1 | Squire         | Common | `skoll/mounted-knight` |
| c_knight_2 | Footman        | Common | `lorc/visored-helm` |
| c_knight_3 | Cavalryman     | Common | `skoll/mounted-knight` |
| c_knight_4 | Sentinel       | Common | `lorc/visored-helm` |
| r_knight_1 | Paladin        | Rare   | `lorc/visored-helm` |
| e_knight   | Lord Ironveil  | Epic   | `delapouite/black-knight-helm` |

## Heroes — Mages (AoE DPS)

| Hero ID | Name | Rarity | Slug |
|---|---|---|---|
| c_mage_1 | Apprentice     | Common | `delapouite/wizard-face` |
| c_mage_2 | Scribe         | Common | `delapouite/wizard-face` |
| c_mage_3 | Initiate       | Common | `delapouite/warlock-hood` |
| c_mage_4 | Hermit         | Common | `delapouite/warlock-hood` |
| r_mage_1 | Pyromancer     | Rare   | `delapouite/wizard-face` |
| r_mage_2 | Frostweaver    | Rare   | `delapouite/warlock-hood` |
| e_mage   | Archmage Vyr   | Epic   | `delapouite/warlock-eye` |

## Heroes — Rogues (Speed / Burst)

| Hero ID | Name | Rarity | Slug |
|---|---|---|---|
| c_rogue_1 | Cutpurse      | Common | `lorc/robe` |
| c_rogue_2 | Pilgrim       | Common | `lorc/robe` |
| c_rogue_3 | Zealot        | Common | `lorc/cultist` |
| c_rogue_4 | Devotee       | Common | `lorc/cultist` |
| r_rogue_1 | Nightblade    | Rare   | `lorc/robe` |
| r_rogue_2 | Duelist       | Rare   | `lorc/cultist` |
| e_rogue   | Shadowfang    | Epic   | `lorc/hood` |

## Heroes — Healers (Support)

| Hero ID | Name | Rarity | Slug |
|---|---|---|---|
| c_healer_1 | Acolyte      | Common | `delapouite/monk-face` |
| c_healer_2 | Novice       | Common | `delapouite/monk-face` |
| c_healer_3 | Deacon       | Common | `delapouite/sun-priest` |
| c_healer_4 | Lamplighter  | Common | `delapouite/sun-priest` |
| r_healer_1 | Priest       | Rare   | `delapouite/sun-priest` |
| r_healer_2 | Druid        | Epic   | `delapouite/warlock-hood` |

---

## Enemies

Keyed by enemy name from `data.js` (lowercase-hyphenated).
Any enemy without a slug falls back to its class icon.

### Goblins / Orcs
| Enemy |  Type |Slug |
|---|---|---|
| goblin-whelp   | A | `delapouite/goblin-head` |
| goblin         | B | `delapouite/goblin-head` |
| goblin-shaman  | B | `delapouite/ogre` |
| goblin-warlord | C | `delapouite/orc-head` |

### Spiders / Bugs
| Enemy |  Type |Slug |
|---|---|---|
| cave-spider | A | `delapouite/spider-eye` |
| cave-spider II| B | `delapouite/spider-eye` |
| cave-spider III| C | `delapouite/spider-bot` |

### Bandits / Humanoids
| Enemy |  Type |Slug |
|---|---|---|
| bandit        | A | `delapouite/kenku-head` |
| bandit-healer | B | `delapouite/kenku-head` |
| bandit-brute  | C | `delapouite/kenku-head` |

### Wolves
| Enemy |  Type |Slug |
|---|---|---|
| frost-wolf | D | `lorc/wolf-head` |
| frost-wolf II| E | `lorc/wolf-head` |
| frost-wolf III| F | `lorc/wolf-head` |

### Bears
| Enemy |  Type |Slug |
|---|---|---|
| cave-bear | A | `delapouite/bear-head` |
| cave-bear II| B | `delapouite/bear-head` |
| cave-bear III| C | `delapouite/bear-head` |

### Yetis / Giants
| Enemy |  Type |Slug |
|---|---|---|
| yeti-cub  | A | `delapouite/metal-golem-head` |
| yeti-cub  II| B | `delapouite/metal-golem-head` |
| yeti-king | B | `delapouite/golem-head` |
| yeti-king II| C | `delapouite/golem-head` |

### Frost / Ice
| Enemy |  Type |Slug |
|---|---|---|
| ice-sprite   | D | `lorc/ghost` |
| frost-mage   | D | `delapouite/warlock-hood` |
| ice-priest   | E | `delapouite/monk-face` |
| frost-knight | E | `delapouite/dwarf-face` |
| frost-wraith | F | `lorc/spectre` |

### Shadow / Cult (Chapter 3)
| Enemy |  Type | Slug |
|---|---|---|
| shadow-guard    | A | `delapouite/dwarf-face` |
| shadow-archer   | A | `delapouite/archer` |
| shadow-knight   | B | `delapouite/dwarf-face` |
| wraith          | B | `lorc/spectre` |
| cult-healer     | B | `delapouite/monk-face` |
| cult-mage       | C | `delapouite/warlock-hood` |
| high-priest     | C | `delapouite/sun-priest` |
| the-shadow-lord | G | `delapouite/devil-mask` |

---

## Future expansion

### Weapons — Swords
| Key |  Type | Slug |
|---|---|---|
| dagger            | Basic | `lorc/plain-dagger` |
| sword             | Basic | `delapouite/two-handed-sword` |
| war-sword         | Common | `delapouite/two-handed-sword` |
| katana            | Common | `delapouite/katana` |
| battle-sword      | Epic | `delapouite/two-handed-sword` |
| shard-sword       | Epic | `lorc/shard-sword` |
| power-sword       | Epic | `lorc/piercing-sword` |
| energy-sword      | Rare | `lorc/energy-sword` |
| master-power-sword| Rare | `lorc/pointy-sword` |


### Weapons — Axes / Hammers
| Key |  Type | Slug |
|---|---|---|
| hammer          | Basic | `delapouite/warhammer` |
| axe             | Basic | `delapouite/glaive` |
| power-axe       | Common | `delapouite/glaive` |
| war-hammer      | Common | `delapouite/thor-hammer` |
| power-hammer    | Epic | `delapouite/thor-hammer` |
| flail           | Epic | `delapouite/flail` |
| halberd         | Epic | `lorc/halberd` |
| master-halberd  | Rare | `delapouite/sharp-halberd` |
| war-axe         | Rare | `delapouite/war-axe` |


### Weapons — Ranged
| Key |  Type | Slug |
|---|---|---|
| slingshot     | Basic | `delapouite/slingshot` |
| sling         | Basic | `delapouite/sling` |
| bow-and-arrow | Common | `delapouite/bow-arrow` |
| crossbow      | Common | `carl-olsen/crossbow` |
| power-crossbow| Epic | `carl-olsen/crossbow` |
| high-shot-bow | Epic | `lorc/high-shot` |
| master-spear  | Rare | `lorc/spear-hook` |
| master-bow    | Rare | `lorc/high-shot` |


### Weapons — Staves
| Key |  Type | Slug |
|---|---|---|
| wizard-staff     | Basic | `lorc/wizard-staff` |
| mace-staff       | Basic | `delapouite/flanged-mace` |
| power-mace-staff | Common | `delapouite/flanged-mace` |
| skull-staff      | Common | `delapouite/skull-staff` |
| power-skull-staff| Epic | `delapouite/skull-staff` |
| lunar-staff      | Epic | `delapouite/lunar-wand` |
| crescent-staff   | Epic | `delapouite/crescent-staff` |
| crystal-staff    | Rare | `lorc/crystal-wand` |
| master-scepter   | Rare | `delapouite/winged-scepter` |

### Shields
| Key |  Type | Slug |
|---|---|---|
| shield           | Basic | `delapouite/templar-shield` |
| spiked-shield    | Basic | `delapouite/spiked-shield` |
| power-shield     | Common | `delapouite/dragon-shield` |
| skull-shield     | Common | `lorc/skull-shield` |
| ice-shield       | Epic | `lorc/ice-shield` |
| fire-shield      | Epic | `lorc/fire-shield` |
| lightning-shield | Epic | `lorc/lightning-shield` |
| winged-shield    | Rare | `lorc/winged-shield` |
| master-shield    | Rare | `lorc/bordered-shield` |


### Spells / magic
| Key |  Type | Slug |
|---|---|---|
| magic-powder     | Basic | `delapouite/sparkles` |
| fire-orb         | Basic | `lorc/fire-zone` |
| lightning-orb    | Common | `delapouite/lightning-dome` |
| bolt-spell       | Common | `lorc/arcing-bolt` |
| lightning-spell  | Epic | `lorc/focused-lightning` |
| fire-spell       | Epic | `lorc/comet-spark` |
| ice-spell        | Epic | `lorc/ice-bolt` |
| frostfire-spell  | Rare | `lorc/frostfire` |
| dragon-orb       | Rare | `delapouite/dragon-orb` |

### Potions
| Key |  Type | Slug |
|---|---|---|
| health-potion       | Common | `delapouite/health-potion` |
| boost-potion        | Common | `lorc/round-bottom-flask` |
| power-health-potion | Epic | `delapouite/health-potion` |
| power-boost-potion  | Epic | `lorc/round-bottom-flask` |

### Gems
| Key |  Type | Slug |
|---|---|---|
| gems         | Common | `lorc/gems` |
| crystals     | Common | `delapouite/crystal-shrine` |
| emerald      | Epic | `lorc/emerald` |
| diamond      | Epic | `lorc/cut-diamond` |
| fire-diamond | Rare | `delapouite/fire-gem` |

---

## Rarity & enemy tint scheme

Each silhouette is recolored with a 3-stop vertical gradient (top-light → mid-saturated → bottom-deep) via CSS `mask-image` + gradient background. Glow is a `drop-shadow()` filter applied to the masked shape. Pulse animations cycle the glow intensity.

### Hero rarity tiers

| Rarity | Top | Mid | Bottom | Glow color | Pulse |
|---|---|---|---|---|---|
| Basic  | `#cfd5df` | `#9ca3af` | `#6b7280` | — | — |
| Common | `#7ec0ff` | `#3b82f6` | `#1d4ed8` | `rgba(59,130,246,.55)` | — |
| Rare   | `#fff2a8` | `#ffcc33` | `#ff9500` | `rgba(255,179,0,.75)` | **gold pulse** (2.4s) |
| Epic   | `#e9b8ff` | `#a855f7` | `#6b21a8` | `rgba(168,85,247,.7)`  | **purple pulse** (2.2s) |

### Enemy type tiers (A–G)

Nature family (A→C = weak→strong green), Ice family (D→F = weak→strong blue), Boss (G = red).
Stronger tiers get more saturated colors and glow; C/F/G pulse.

| Type | Theme | Top | Mid | Bottom | Glow | Pulse |
|---|---|---|---|---|---|---|
| A | light green  | `#bbf7a8` | `#84cc16` | `#4d7c0f` | — | — |
| B | green        | `#86efac` | `#22c55e` | `#15803d` | — | — |
| C | dark green   | `#5eead4` | `#10b981` | `#064e3b` | `rgba(16,185,129,.6)` | **green pulse** (3s) |
| D | light blue   | `#bae6fd` | `#7dd3fc` | `#0369a1` | — | — |
| E | medium blue  | `#7dd3fc` | `#0ea5e9` | `#075985` | — | — |
| F | dark blue    | `#60a5fa` | `#1e40af` | `#1e3a8a` | `rgba(30,64,175,.7)`  | **deep-blue pulse** (2.8s) |
| G | boss red     | `#fca5a5` | `#ef4444` | `#991b1b` | `rgba(239,68,68,.75)` | **red pulse** (1.6s, fastest) |

Hex values are in [index.html](index.html) under the `.tint-*` rules. Edit there to tune.
