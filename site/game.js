/* ═══════════════════════════════════════════════════════════════
   UFO ABDUCTION RUN  —  tnkr.fun parking-page arcade game
   No images. No frameworks. Just canvas primitives & bad jokes.
   ═══════════════════════════════════════════════════════════════ */
(() => {
'use strict';

/* ── Constants ────────────────────────────────── */
const STORAGE_KEY = 'tnkr_abduction_data';
const PLAYER_Y_FRAC = 0.15;          // player starting Y as fraction of canvas height
const PLAYER_Y_MIN  = 0.08;          // highest the UFO can go
const PLAYER_Y_MAX  = 0.60;          // lowest the UFO can go (above ground)
const GROUND_FRAC   = 0.18;          // ground height fraction
const BASE_SCROLL   = 1.8;           // px/frame at sector 1
const SECTOR_TIME   = 30000;         // ms per sector
const SECTOR_ITEMS  = 10;            // items to advance sector
const SPAWN_MIN     = 800;           // ms between spawns (sector 1)
const SPAWN_MAX     = 2200;
const BEAM_WIDTH    = 0.08;          // beam half-width as fraction of canvas width
const BEAM_LENGTH   = 0.55;          // beam length as fraction of canvas height
const HAZARD_MIN    = 4000;          // ms between hazard spawns (sector 1)
const HAZARD_MAX    = 8000;

/* ── Humor data ───────────────────────────────── */
const ITEMS = [
  { type:'cow', pts:10, minSector:1, w:40, h:28, texts:[
    'Moo? MOO?! This is highly irregular.',
    'Diary entry: Was abducted. Pasture was boring anyway.',
    'This cow has seen things. Mostly grass.',
    'Udder disbelief.',
  ]},
  { type:'flamingo', pts:15, minSector:1, w:20, h:36, texts:[
    "I'm not even real and this is still weird.",
    'Plastic fantastic goes intergalactic.',
    'Was lawn. Now space lawn.',
    'Finally, a career change.',
  ]},
  { type:'gnome', pts:25, minSector:1, w:18, h:30, texts:[
    "Finally. I've been waiting for extraction since 1987.",
    'My name is Gerald. I have seen things.',
    'My hat doubles as a beacon. You are welcome.',
    'Garden variety abductee.',
  ]},
  { type:'duck', pts:30, minSector:2, w:18, h:16, texts:[
    'Quack. (Translated: Take me to your leader.)',
    'Bath time is OVER.',
    'Rubber duck debugging has escalated.',
    'Squeaky, but cooperating.',
  ]},
  { type:'cat', pts:40, minSector:2, w:22, h:20, texts:[
    'I meant to get abducted.',
    '*purrs in extraterrestrial*',
    'Finally, servants worthy of my attention.',
    'Landed on all four feet. In space.',
  ]},
  { type:'dish', pts:50, minSector:2, w:32, h:28, texts:[
    'Oh, the irony.',
    'I was pointed the wrong way this whole time.',
    'Signal received. Signal also kidnapped.',
    'This dish served cold... in the void.',
  ]},
  { type:'portapotty', pts:100, minSector:3, w:26, h:36, texts:[
    'You do NOT want to open this in zero gravity.',
    'Contains: 1 confused plumber.',
    'Hazmat suit recommended. We have none.',
    'This was a terrible idea. Full send.',
  ]},
];

const HAZARD_TYPES = ['farmer','helicopter','balloon'];

const DAMAGE_TEXTS = [
  'Ow. That will buff out.',
  'The insurance adjuster is going to love this.',
  'Hull integrity: vibes only.',
  'Shields at 42%. That number means nothing.',
  'Structural damage: cosmetic. Emotional damage: significant.',
  'The mothership is NOT going to be happy about this.',
];

const SECTOR_LABELS = [
  'Casual','Concerning','Misdemeanor','Felony',
  'War Crime','Interdimensional Incident','HR Has Questions',
  'Beyond Classification',
];

const RANKS = [
  [0,   'Unpaid Intern, Abduction Division'],
  [51,  'Licensed Cow Relocator'],
  [201, 'Senior Gnome Acquisitions Specialist'],
  [501, 'VP of Involuntary Relocation'],
  [1001,'Supreme Overlord of Stuff That Was Just Minding Its Own Business'],
];

const GAMEOVER_MSGS = [
  'Mission status: technically a success if you lower your standards enough.',
  "Earth's gravity wins again. It always does.",
  'Your abduction license has been revoked. Again.',
  'The mothership has sent a strongly worded hologram.',
  'Performance review: needs improvement. And a new ship.',
  'You have been reassigned to crop circles.',
];

const HOVER_TITLES = [
  'Definitely not illegal in this galaxy',
  'Ethics committee has been abducted',
  'HR has been notified (HR was also abducted)',
  'Void where prohibited. Everywhere is void.',
  'Side effects may include: existential bovine confusion',
];

/* ── DOM refs ─────────────────────────────────── */
const $  = id => document.getElementById(id);
const gc = $('gamecanvas');
const ctx = gc.getContext('2d');

const dom = {
  wrap:      document.querySelector('.wrap'),
  ufos:      document.querySelectorAll('.ufo, .ufo-link'),
  startBtn:  $('startGame'),
  hud:       $('gameHud'),
  score:     $('scoreDisplay'),
  sector:    $('sectorDisplay'),
  lives:     $('livesDisplay'),
  flavor:    $('gameFlavor'),
  briefing:  $('gameBriefing'),
  over:      $('gameOver'),
  goTitle:   $('goTitle'),
  goScore:   $('goScore'),
  goRank:    $('goRank'),
  goManifest:$('goManifest'),
  retryBtn:  $('goRetry'),
  returnBtn: $('goReturn'),
  paused:    $('gamePaused'),
  funText:   $('funText'),
};

/* ── Game state ───────────────────────────────── */
let state = 'LANDING'; // LANDING | PLAYING | PAUSED | GAME_OVER
let rafId = null;
let scale = 1;         // size scale factor based on canvas width

let player, items, hazards, projectiles, particles;
let score, lives, sector, sectorScore, sectorStart;
let scrollX, lastSpawn, lastHazardSpawn;
let manifest;          // {type: count} for game-over summary
let flavorTimer, dmgFlash;

/* ── Persistence ──────────────────────────────── */
function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function saveData(d) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {}
}

/* ── Canvas sizing ────────────────────────────── */
function resizeGame() {
  gc.width  = innerWidth;
  gc.height = innerHeight;
  scale = gc.width / 800;  // reference width 800
}

/* ── Drawing helpers ──────────────────────────── */
function S(v) { return v * scale; }  // scale a value

function drawPlayerUFO(x, y) {
  // beam
  if (player.beamOn) {
    const bw = gc.width * BEAM_WIDTH;
    const bl = gc.height * BEAM_LENGTH;
    const grad = ctx.createLinearGradient(x, y, x, y + bl);
    grad.addColorStop(0, 'rgba(173,216,255,0.35)');
    grad.addColorStop(1, 'rgba(173,216,255,0.05)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x - S(15), y + S(10));
    ctx.lineTo(x - bw, y + bl);
    ctx.lineTo(x + bw, y + bl);
    ctx.lineTo(x + S(15), y + S(10));
    ctx.closePath();
    ctx.fill();
  }
  // body
  ctx.fillStyle = '#9ea2a8';
  ctx.beginPath(); ctx.ellipse(x, y, S(40), S(12), 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.ellipse(x, y, S(40), S(12), 0, 0, Math.PI*2); ctx.fill();
  // dome
  ctx.fillStyle = '#b9e3ff';
  ctx.beginPath(); ctx.ellipse(x, y - S(14), S(18), S(12), 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#86c9ff'; ctx.lineWidth = S(1.5);
  ctx.beginPath(); ctx.ellipse(x, y - S(14), S(18), S(12), 0, Math.PI, 0); ctx.stroke();
  // lights
  ctx.fillStyle = '#ffd35c';
  [-25, -8, 8, 25].forEach(dx => {
    ctx.beginPath(); ctx.arc(x + S(dx), y + S(4), S(3), 0, Math.PI*2); ctx.fill();
  });
}

function drawCow(x, y, w, h) {
  // body
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - S(w/2), y - S(h*0.6), S(w*0.7), S(h*0.5));
  // spots
  ctx.fillStyle = '#222';
  ctx.fillRect(x - S(w*0.15), y - S(h*0.55), S(w*0.2), S(h*0.2));
  ctx.fillRect(x + S(w*0.1), y - S(h*0.4), S(w*0.15), S(h*0.15));
  // head
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x + S(w*0.4), y - S(h*0.4), S(h*0.2), 0, Math.PI*2); ctx.fill();
  // legs
  ctx.strokeStyle = '#fff'; ctx.lineWidth = S(2);
  [-0.2, 0, 0.15, 0.3].forEach(dx => {
    ctx.beginPath(); ctx.moveTo(x + S(w*dx), y - S(h*0.1)); ctx.lineTo(x + S(w*dx), y); ctx.stroke();
  });
  // eyes
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(x + S(w*0.43), y - S(h*0.43), S(1.5), 0, Math.PI*2); ctx.fill();
}

function drawFlamingo(x, y, w, h) {
  // body
  ctx.fillStyle = '#ff69b4';
  ctx.beginPath(); ctx.ellipse(x, y - S(h*0.5), S(w*0.4), S(h*0.2), 0, 0, Math.PI*2); ctx.fill();
  // neck
  ctx.strokeStyle = '#ff69b4'; ctx.lineWidth = S(2);
  ctx.beginPath(); ctx.moveTo(x, y - S(h*0.6)); ctx.quadraticCurveTo(x + S(w*0.3), y - S(h*0.9), x + S(w*0.1), y - S(h)); ctx.stroke();
  // head
  ctx.beginPath(); ctx.arc(x + S(w*0.1), y - S(h), S(3*scale > 2 ? 3 : 2), 0, Math.PI*2); ctx.fill();
  // beak
  ctx.fillStyle = '#ffa500';
  ctx.beginPath(); ctx.moveTo(x + S(w*0.1) + S(3), y - S(h)); ctx.lineTo(x + S(w*0.1) + S(7), y - S(h) + S(1)); ctx.lineTo(x + S(w*0.1) + S(3), y - S(h) + S(2)); ctx.fill();
  // legs
  ctx.strokeStyle = '#ff69b4'; ctx.lineWidth = S(1.5);
  ctx.beginPath(); ctx.moveTo(x - S(3), y - S(h*0.3)); ctx.lineTo(x - S(5), y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + S(3), y - S(h*0.3)); ctx.lineTo(x + S(5), y); ctx.stroke();
}

function drawGnome(x, y, w, h) {
  // body
  ctx.fillStyle = '#4169e1';
  ctx.fillRect(x - S(w*0.35), y - S(h*0.5), S(w*0.7), S(h*0.35));
  // face
  ctx.fillStyle = '#ffdab9';
  ctx.beginPath(); ctx.arc(x, y - S(h*0.55), S(h*0.15), 0, Math.PI*2); ctx.fill();
  // eyes
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(x - S(2), y - S(h*0.57), S(1), 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + S(2), y - S(h*0.57), S(1), 0, Math.PI*2); ctx.fill();
  // beard
  ctx.fillStyle = '#ddd';
  ctx.beginPath(); ctx.moveTo(x - S(h*0.1), y - S(h*0.45)); ctx.lineTo(x, y - S(h*0.3)); ctx.lineTo(x + S(h*0.1), y - S(h*0.45)); ctx.fill();
  // hat
  ctx.fillStyle = '#e00';
  ctx.beginPath(); ctx.moveTo(x - S(w*0.35), y - S(h*0.6)); ctx.lineTo(x, y - S(h)); ctx.lineTo(x + S(w*0.35), y - S(h*0.6)); ctx.closePath(); ctx.fill();
  // legs
  ctx.fillStyle = '#4169e1';
  ctx.fillRect(x - S(w*0.3), y - S(h*0.15), S(w*0.22), S(h*0.15));
  ctx.fillRect(x + S(w*0.08), y - S(h*0.15), S(w*0.22), S(h*0.15));
}

function drawDuck(x, y, w, h) {
  ctx.fillStyle = '#ffd700';
  ctx.beginPath(); ctx.ellipse(x, y - S(h*0.4), S(w*0.45), S(h*0.35), 0, 0, Math.PI*2); ctx.fill();
  // head
  ctx.beginPath(); ctx.arc(x + S(w*0.3), y - S(h*0.7), S(h*0.22), 0, Math.PI*2); ctx.fill();
  // eye
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(x + S(w*0.35), y - S(h*0.75), S(1.2), 0, Math.PI*2); ctx.fill();
  // beak
  ctx.fillStyle = '#ff8c00';
  ctx.beginPath();
  ctx.moveTo(x + S(w*0.5), y - S(h*0.65));
  ctx.lineTo(x + S(w*0.7), y - S(h*0.6));
  ctx.lineTo(x + S(w*0.5), y - S(h*0.55));
  ctx.fill();
}

function drawCat(x, y, w, h) {
  // body
  ctx.fillStyle = '#888';
  ctx.beginPath(); ctx.ellipse(x, y - S(h*0.35), S(w*0.4), S(h*0.3), 0, 0, Math.PI*2); ctx.fill();
  // head
  ctx.beginPath(); ctx.arc(x + S(w*0.25), y - S(h*0.65), S(h*0.2), 0, Math.PI*2); ctx.fill();
  // ears
  ctx.beginPath();
  ctx.moveTo(x + S(w*0.12), y - S(h*0.78));
  ctx.lineTo(x + S(w*0.08), y - S(h));
  ctx.lineTo(x + S(w*0.25), y - S(h*0.82));
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + S(w*0.3), y - S(h*0.82));
  ctx.lineTo(x + S(w*0.4), y - S(h));
  ctx.lineTo(x + S(w*0.42), y - S(h*0.78));
  ctx.fill();
  // eyes
  ctx.fillStyle = '#0f0';
  ctx.beginPath(); ctx.arc(x + S(w*0.18), y - S(h*0.68), S(1.5), 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + S(w*0.32), y - S(h*0.68), S(1.5), 0, Math.PI*2); ctx.fill();
  // tail
  ctx.strokeStyle = '#888'; ctx.lineWidth = S(2);
  ctx.beginPath(); ctx.moveTo(x - S(w*0.35), y - S(h*0.35));
  ctx.quadraticCurveTo(x - S(w*0.6), y - S(h*0.8), x - S(w*0.45), y - S(h)); ctx.stroke();
}

function drawDish(x, y, w, h) {
  // base
  ctx.fillStyle = '#aaa';
  ctx.fillRect(x - S(w*0.08), y - S(h*0.3), S(w*0.16), S(h*0.3));
  // platform
  ctx.fillRect(x - S(w*0.3), y - S(h*0.1), S(w*0.6), S(h*0.1));
  // dish
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = S(2);
  ctx.beginPath(); ctx.arc(x, y - S(h*0.4), S(w*0.45), Math.PI, 0); ctx.stroke();
  ctx.fillStyle = 'rgba(200,200,200,0.3)';
  ctx.beginPath(); ctx.arc(x, y - S(h*0.4), S(w*0.45), Math.PI, 0); ctx.fill();
  // feed horn
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = S(1.5);
  ctx.beginPath(); ctx.moveTo(x, y - S(h*0.4)); ctx.lineTo(x + S(w*0.15), y - S(h*0.85)); ctx.stroke();
  ctx.fillStyle = '#f00';
  ctx.beginPath(); ctx.arc(x + S(w*0.15), y - S(h*0.85), S(2), 0, Math.PI*2); ctx.fill();
}

function drawPortaPotty(x, y, w, h) {
  // body
  ctx.fillStyle = '#2962ff';
  ctx.fillRect(x - S(w*0.4), y - S(h*0.9), S(w*0.8), S(h*0.9));
  // roof
  ctx.fillStyle = '#1a44aa';
  ctx.fillRect(x - S(w*0.45), y - S(h), S(w*0.9), S(h*0.12));
  // door
  ctx.fillStyle = '#1b3da0';
  ctx.fillRect(x - S(w*0.2), y - S(h*0.75), S(w*0.4), S(h*0.6));
  // vent
  ctx.fillStyle = '#90caf9';
  ctx.fillRect(x - S(w*0.12), y - S(h*0.82), S(w*0.24), S(h*0.06));
  // handle
  ctx.fillStyle = '#ddd';
  ctx.fillRect(x + S(w*0.1), y - S(h*0.45), S(w*0.06), S(h*0.08));
}

function drawFarmer(x, y, frame) {
  // body
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x - S(6), y - S(28), S(12), S(18));
  // head
  ctx.fillStyle = '#ffdab9';
  ctx.beginPath(); ctx.arc(x, y - S(32), S(6), 0, Math.PI*2); ctx.fill();
  // hat
  ctx.fillStyle = '#654321';
  ctx.fillRect(x - S(8), y - S(39), S(16), S(4));
  ctx.fillRect(x - S(5), y - S(43), S(10), S(5));
  // legs
  ctx.strokeStyle = '#556b2f'; ctx.lineWidth = S(3);
  const legSwing = Math.sin(frame * 0.1) * S(4);
  ctx.beginPath(); ctx.moveTo(x - S(3), y - S(10)); ctx.lineTo(x - S(3) - legSwing, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + S(3), y - S(10)); ctx.lineTo(x + S(3) + legSwing, y); ctx.stroke();
  // angry eyes
  ctx.fillStyle = '#f00';
  ctx.beginPath(); ctx.arc(x - S(2), y - S(33), S(1.2), 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + S(2), y - S(33), S(1.2), 0, Math.PI*2); ctx.fill();
  // pitchfork (arm)
  ctx.strokeStyle = '#8B4513'; ctx.lineWidth = S(1.5);
  const armAngle = Math.sin(frame * 0.05) * 0.3;
  const ax = x + S(8), ay = y - S(24);
  const fx = ax + Math.cos(-0.8 + armAngle) * S(20);
  const fy = ay + Math.sin(-0.8 + armAngle) * S(20);
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(fx, fy); ctx.stroke();
  // fork tines
  ctx.strokeStyle = '#aaa'; ctx.lineWidth = S(1);
  const fdir = Math.atan2(fy - ay, fx - ax);
  for (let i = -1; i <= 1; i++) {
    const tx = fx + Math.cos(fdir - Math.PI*0.3) * S(6) + Math.cos(fdir + Math.PI/2) * i * S(3);
    const ty = fy + Math.sin(fdir - Math.PI*0.3) * S(6) + Math.sin(fdir + Math.PI/2) * i * S(3);
    ctx.beginPath(); ctx.moveTo(fx + Math.cos(fdir + Math.PI/2) * i * S(2), fy + Math.sin(fdir + Math.PI/2) * i * S(2));
    ctx.lineTo(tx, ty); ctx.stroke();
  }
}

function drawHelicopter(x, y, frame) {
  // body
  ctx.fillStyle = '#556b2f';
  ctx.beginPath();
  ctx.ellipse(x, y, S(25), S(10), 0, 0, Math.PI*2);
  ctx.fill();
  // cockpit
  ctx.fillStyle = 'rgba(150,200,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(x + S(18), y - S(2), S(10), S(7), 0.2, 0, Math.PI*2);
  ctx.fill();
  // tail
  ctx.fillStyle = '#556b2f';
  ctx.beginPath();
  ctx.moveTo(x - S(20), y - S(4));
  ctx.lineTo(x - S(45), y - S(8));
  ctx.lineTo(x - S(45), y + S(2));
  ctx.lineTo(x - S(20), y + S(4));
  ctx.fill();
  // tail rotor
  ctx.fillStyle = '#444';
  const ta = frame * 0.4;
  ctx.fillRect(x - S(45) - S(1), y - S(8) + Math.sin(ta) * S(8), S(2), S(2));
  // main rotor
  ctx.strokeStyle = '#444'; ctx.lineWidth = S(2);
  const ra = frame * 0.3;
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(ra) * S(35), y - S(10));
  ctx.lineTo(x + Math.cos(ra) * S(35), y - S(10));
  ctx.stroke();
  // rotor hub
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(x, y - S(10), S(3), 0, Math.PI*2); ctx.fill();
}

function drawBalloon(x, y) {
  // string
  ctx.strokeStyle = '#999'; ctx.lineWidth = S(1);
  ctx.beginPath(); ctx.moveTo(x, y + S(18)); ctx.lineTo(x + S(3), y + S(35)); ctx.stroke();
  // balloon
  ctx.fillStyle = 'rgba(180,180,180,0.6)';
  ctx.beginPath(); ctx.ellipse(x, y, S(14), S(18), 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(200,200,200,0.4)'; ctx.lineWidth = S(1);
  ctx.beginPath(); ctx.ellipse(x, y, S(14), S(18), 0, 0, Math.PI*2); ctx.stroke();
  // highlight
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.ellipse(x - S(4), y - S(5), S(4), S(6), -0.3, 0, Math.PI*2); ctx.fill();
}

function drawPitchfork(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // handle
  ctx.strokeStyle = '#8B4513'; ctx.lineWidth = S(2);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(S(14), 0); ctx.stroke();
  // tines
  ctx.strokeStyle = '#aaa'; ctx.lineWidth = S(1.2);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(S(14), i * S(2));
    ctx.lineTo(S(20), i * S(4)); ctx.stroke();
  }
  ctx.restore();
}

function drawMissile(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // body
  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.moveTo(S(12), 0);
  ctx.lineTo(-S(8), -S(3));
  ctx.lineTo(-S(8), S(3));
  ctx.closePath();
  ctx.fill();
  // nose cone
  ctx.fillStyle = '#e00';
  ctx.beginPath();
  ctx.moveTo(S(12), 0);
  ctx.lineTo(S(7), -S(2.5));
  ctx.lineTo(S(7), S(2.5));
  ctx.closePath();
  ctx.fill();
  // fins
  ctx.fillStyle = '#555';
  ctx.beginPath();
  ctx.moveTo(-S(6), -S(3)); ctx.lineTo(-S(10), -S(7)); ctx.lineTo(-S(8), -S(3));
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-S(6), S(3)); ctx.lineTo(-S(10), S(7)); ctx.lineTo(-S(8), S(3));
  ctx.closePath(); ctx.fill();
  // exhaust flame
  ctx.fillStyle = '#ffa500';
  ctx.beginPath();
  ctx.moveTo(-S(8), -S(2)); ctx.lineTo(-S(14 + Math.random() * 4), 0); ctx.lineTo(-S(8), S(2));
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff0';
  ctx.beginPath();
  ctx.moveTo(-S(8), -S(1)); ctx.lineTo(-S(11 + Math.random() * 3), 0); ctx.lineTo(-S(8), S(1));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawGround(scrollOffset) {
  const gH = gc.height * GROUND_FRAC;
  const gY = gc.height - gH;

  // hills (back layer)
  ctx.fillStyle = '#1a3d1a';
  ctx.beginPath();
  ctx.moveTo(0, gc.height);
  for (let px = 0; px <= gc.width; px += 4) {
    const hy = gY + Math.sin((px + scrollOffset * 0.4) * 0.008) * S(18) - S(8);
    ctx.lineTo(px, hy);
  }
  ctx.lineTo(gc.width, gc.height);
  ctx.closePath();
  ctx.fill();

  // ground
  ctx.fillStyle = '#2d5a2d';
  ctx.fillRect(0, gY + S(10), gc.width, gH);

  // houses / structures
  const structSpacing = S(250);
  const startX = -(scrollOffset % structSpacing);
  const seed = Math.floor(scrollOffset / structSpacing);
  for (let i = 0; i < gc.width / structSpacing + 2; i++) {
    const sx = startX + i * structSpacing + S(30);
    const hash = ((seed + i) * 2654435761) >>> 0;
    if (hash % 3 === 0) {
      // house
      const hw = S(30), hh = S(24);
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(sx, gY + S(10) - hh, hw, hh);
      ctx.fillStyle = '#a0522d';
      ctx.beginPath();
      ctx.moveTo(sx - S(4), gY + S(10) - hh);
      ctx.lineTo(sx + hw/2, gY + S(10) - hh - S(14));
      ctx.lineTo(sx + hw + S(4), gY + S(10) - hh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd';
      ctx.fillRect(sx + hw*0.3, gY + S(10) - hh + S(5), S(8), S(8));
    } else if (hash % 3 === 1) {
      // barn
      const bw = S(40), bh = S(30);
      ctx.fillStyle = '#b22222';
      ctx.fillRect(sx, gY + S(10) - bh, bw, bh);
      ctx.fillStyle = '#8b1a1a';
      ctx.fillRect(sx + bw*0.35, gY + S(10) - bh*0.7, bw*0.3, bh*0.7);
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.moveTo(sx - S(3), gY + S(10) - bh);
      ctx.lineTo(sx + bw/2, gY + S(10) - bh - S(10));
      ctx.lineTo(sx + bw + S(3), gY + S(10) - bh);
      ctx.closePath();
      ctx.fill();
    } else {
      // fence
      ctx.strokeStyle = '#8B7355'; ctx.lineWidth = S(1.5);
      for (let f = 0; f < 5; f++) {
        const fx = sx + f * S(10);
        ctx.beginPath(); ctx.moveTo(fx, gY + S(10)); ctx.lineTo(fx, gY + S(10) - S(15)); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(sx, gY + S(10) - S(12)); ctx.lineTo(sx + S(40), gY + S(10) - S(12)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, gY + S(10) - S(5)); ctx.lineTo(sx + S(40), gY + S(10) - S(5)); ctx.stroke();
    }
  }
}

const DRAW_FNS = {
  cow:        (x,y,it) => drawCow(x, y, it.w, it.h),
  flamingo:   (x,y,it) => drawFlamingo(x, y, it.w, it.h),
  gnome:      (x,y,it) => drawGnome(x, y, it.w, it.h),
  duck:       (x,y,it) => drawDuck(x, y, it.w, it.h),
  cat:        (x,y,it) => drawCat(x, y, it.w, it.h),
  dish:       (x,y,it) => drawDish(x, y, it.w, it.h),
  portapotty: (x,y,it) => drawPortaPotty(x, y, it.w, it.h),
};

/* ── Particles (abduction sparkle) ────────────── */
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * S(3),
      vy: -Math.random() * S(3) - S(1),
      life: 30 + Math.random() * 20,
      maxLife: 50,
      color,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += S(0.05);
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = p.color.replace('1)', alpha + ')');
    ctx.beginPath(); ctx.arc(p.x, p.y, S(2), 0, Math.PI*2); ctx.fill();
  });
}

/* ── Spawning ─────────────────────────────────── */
function spawnItem() {
  const eligible = ITEMS.filter(it => it.minSector <= sector);
  const weights = eligible.map(it => 1 / Math.sqrt(it.pts));
  const total = weights.reduce((a,b) => a+b, 0);
  let r = Math.random() * total;
  let chosen = eligible[0];
  for (let i = 0; i < eligible.length; i++) {
    r -= weights[i];
    if (r <= 0) { chosen = eligible[i]; break; }
  }
  const gY = gc.height * (1 - GROUND_FRAC) + S(10);
  items.push({
    type: chosen.type,
    x: gc.width + S(chosen.w),
    y: gY,
    w: chosen.w,
    h: chosen.h,
    pts: chosen.pts,
    texts: chosen.texts,
    beingAbducted: false,
    abductY: 0,
  });
}

function spawnHazard() {
  const maxIdx = Math.min(HAZARD_TYPES.length, 1 + Math.floor(sector / 2));
  const type = HAZARD_TYPES[Math.floor(Math.random() * maxIdx)];
  const gY = gc.height * (1 - GROUND_FRAC) + S(10);
  if (type === 'farmer') {
    hazards.push({
      type, x: gc.width + S(30), y: gY,
      shootTimer: 60 + Math.random() * 60,
      frame: 0,
    });
  } else if (type === 'helicopter') {
    hazards.push({
      type,
      x: gc.width + S(50),
      y: gc.height * 0.3 + Math.random() * gc.height * 0.2,
      baseY: 0, // set after push
      vx: -(S(2) + sector * S(0.3)),
      bobPhase: Math.random() * Math.PI * 2,
      bobAmp: S(30) + Math.random() * S(20),
      bobSpeed: 0.02 + Math.random() * 0.01,
      shootTimer: 90 + Math.random() * 80,
      frame: 0,
    });
    hazards[hazards.length - 1].baseY = hazards[hazards.length - 1].y;
  } else if (type === 'balloon') {
    hazards.push({
      type,
      x: S(50) + Math.random() * (gc.width - S(100)),
      y: gc.height + S(20),
      vy: -(S(0.5) + Math.random() * S(0.5)),
    });
  }
}

/* ── Collision helpers ────────────────────────── */
function beamHitsItem(item) {
  if (!player.beamOn) return false;
  const bTop = player.y + S(10);
  const bBot = player.y + gc.height * BEAM_LENGTH;
  const bHalfW = gc.width * BEAM_WIDTH;
  const ix = item.x;
  const iy = item.beingAbducted ? item.abductY : item.y;
  if (iy < bTop || iy > bBot) return false;
  const frac = (iy - bTop) / (bBot - bTop);
  const halfWAtY = S(15) + frac * (bHalfW - S(15));
  return Math.abs(ix - player.x) < halfWAtY + S(item.w/2);
}

function hazardHitsPlayer(h) {
  const px = player.x, py = player.y;
  const pr = S(35);
  if (h.type === 'farmer') {
    return Math.abs(h.x - px) < S(20) && Math.abs(h.y - S(20) - py) < pr;
  } else if (h.type === 'helicopter') {
    return Math.abs(h.x - px) < S(40) && Math.abs(h.y - py) < S(18);
  } else if (h.type === 'balloon') {
    const dx = h.x - px, dy = h.y - py;
    return Math.sqrt(dx*dx + dy*dy) < S(20) + pr;
  }
  return false;
}

function projectileHitsPlayer(p) {
  const dx = p.x - player.x, dy = p.y - player.y;
  return Math.sqrt(dx*dx + dy*dy) < S(30);
}

/* ── Flavor text ──────────────────────────────── */
function showFlavor(text) {
  dom.flavor.textContent = text;
  dom.flavor.style.display = 'block';
  dom.flavor.style.opacity = '1';
  clearTimeout(flavorTimer);
  flavorTimer = setTimeout(() => {
    dom.flavor.style.opacity = '0';
    setTimeout(() => { dom.flavor.style.display = 'none'; }, 300);
  }, 2000);
}

/* ── HUD ──────────────────────────────────────── */
function updateHUD() {
  dom.score.textContent  = 'SPECIMENS: ' + score;
  dom.sector.textContent = 'SECTOR ' + sector + ': ' + SECTOR_LABELS[Math.min(sector-1, SECTOR_LABELS.length-1)];
  dom.lives.textContent = '';
  for (let i = 0; i < lives; i++) {
    const sp = document.createElement('span');
    sp.textContent = '\uD83D\uDEF8';
    dom.lives.appendChild(sp);
  }
}

/* ── Damage ───────────────────────────────────── */
function takeDamage() {
  lives--;
  dmgFlash = 15;
  showFlavor(DAMAGE_TEXTS[Math.floor(Math.random() * DAMAGE_TEXTS.length)]);
  spawnParticles(player.x, player.y, 'rgba(255,80,80,1)', 12);
  updateHUD();
  if (lives <= 0) endGame();
}

/* ── Sector advancement ───────────────────────── */
function checkSector(now) {
  if (sectorScore >= SECTOR_ITEMS || now - sectorStart >= SECTOR_TIME) {
    sector++;
    sectorScore = 0;
    sectorStart = now;
    const label = SECTOR_LABELS[Math.min(sector-1, SECTOR_LABELS.length-1)];
    showFlavor('ENTERING SECTOR ' + sector + ': ' + label);
    updateHUD();
  }
}

/* ── Game loop ────────────────────────────────── */
let lastTime = 0;
let frame = 0;

function gameLoop(ts) {
  if (state !== 'PLAYING') return;
  rafId = requestAnimationFrame(gameLoop);

  lastTime = ts;
  frame++;

  const now = performance.now();
  const spd = BASE_SCROLL * scale * (1 + (sector - 1) * 0.15);

  scrollX += spd;

  // spawn items
  const spawnInterval = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
  if (now - lastSpawn > spawnInterval / (1 + (sector-1)*0.1)) {
    spawnItem();
    lastSpawn = now;
  }

  // spawn hazards
  const hazInterval = HAZARD_MIN + Math.random() * (HAZARD_MAX - HAZARD_MIN);
  if (now - lastHazardSpawn > hazInterval / (1 + (sector-1)*0.15)) {
    spawnHazard();
    lastHazardSpawn = now;
  }

  // ── Update ──
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.beingAbducted) {
      // track toward player UFO center
      const dx = player.x - it.abductX;
      const dy = (player.y + S(5)) - it.abductY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const speed = S(3) + (1 - dist / gc.height) * S(2); // accelerate as it gets closer
      if (dist > speed) {
        it.abductX += (dx / dist) * speed;
        it.abductY += (dy / dist) * speed;
      }
      it.abductX += Math.sin(frame * 0.15) * S(0.3); // wobble
      // shrink as it approaches the UFO
      it.abductScale = Math.max(0.15, dist / it.abductStartDist);
      if (dist < S(15)) {
        // collected — absorbed into the UFO
        score += it.pts;
        sectorScore++;
        manifest[it.type] = (manifest[it.type] || 0) + 1;
        const txt = it.texts[Math.floor(Math.random() * it.texts.length)];
        showFlavor(txt);
        spawnParticles(player.x, player.y + S(5), 'rgba(173,216,255,1)', 8);
        updateHUD();
        checkSector(now);
        items.splice(i, 1);
      }
    } else {
      it.x -= spd;
      if (beamHitsItem(it)) {
        it.beingAbducted = true;
        it.abductX = it.x;
        it.abductY = it.y;
        it.abductScale = 1;
        const dx = player.x - it.x;
        const dy = (player.y + S(5)) - it.y;
        it.abductStartDist = Math.sqrt(dx*dx + dy*dy) || 1;
      }
      if (it.x < -S(50)) items.splice(i, 1);
    }
  }

  // hazards
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    h.frame = (h.frame || 0) + 1;
    if (h.type === 'farmer') {
      h.x -= spd;
      h.shootTimer--;
      if (h.shootTimer <= 0) {
        const angle = Math.atan2(player.y - (h.y - S(20)), player.x - h.x);
        projectiles.push({
          x: h.x, y: h.y - S(20),
          vx: Math.cos(angle) * S(3.5),
          vy: Math.sin(angle) * S(3.5),
          angle,
          life: 120,
          src: 'farmer',
        });
        h.shootTimer = 80 + Math.random() * 60;
      }
      if (h.x < -S(40)) hazards.splice(i, 1);
      else if (hazardHitsPlayer(h)) { hazards.splice(i, 1); takeDamage(); }
    } else if (h.type === 'helicopter') {
      h.x += h.vx;
      h.bobPhase += h.bobSpeed;
      h.y = h.baseY + Math.sin(h.bobPhase) * h.bobAmp;
      h.baseY += h.vx * 0.05; // slight downward drift as it moves
      h.shootTimer--;
      if (h.shootTimer <= 0) {
        const angle = Math.atan2(player.y - h.y, player.x - h.x);
        projectiles.push({
          x: h.x, y: h.y,
          vx: Math.cos(angle) * S(4),
          vy: Math.sin(angle) * S(4),
          angle,
          life: 100,
          src: 'helicopter',
        });
        h.shootTimer = 60 + Math.random() * 50;
      }
      if (h.x < -S(60)) hazards.splice(i, 1);
      else if (hazardHitsPlayer(h)) { hazards.splice(i, 1); takeDamage(); }
    } else if (h.type === 'balloon') {
      h.y += h.vy;
      if (h.y < -S(30)) hazards.splice(i, 1);
      else if (hazardHitsPlayer(h)) {
        showFlavor('THAT was a weather balloon. We are supposed to be the cover story!');
        hazards.splice(i, 1);
        takeDamage();
      }
    }
  }

  // projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += S(0.04);
    p.angle = Math.atan2(p.vy, p.vx);
    p.life--;
    if (p.life <= 0 || p.y > gc.height) { projectiles.splice(i, 1); continue; }
    if (projectileHitsPlayer(p)) { projectiles.splice(i, 1); takeDamage(); }
  }

  updateParticles();
  checkSector(now);

  // ── Draw ──
  ctx.clearRect(0, 0, gc.width, gc.height);

  drawGround(scrollX);

  items.forEach(it => {
    if (it.beingAbducted) {
      ctx.save();
      const s = it.abductScale;
      ctx.translate(it.abductX, it.abductY);
      ctx.scale(s, s);
      ctx.globalAlpha = Math.max(0.3, s);
      if (DRAW_FNS[it.type]) DRAW_FNS[it.type](0, 0, it);
      ctx.restore();
    } else {
      if (DRAW_FNS[it.type]) DRAW_FNS[it.type](it.x, it.y, it);
    }
  });

  hazards.forEach(h => {
    if (h.type === 'farmer') drawFarmer(h.x, h.y, h.frame);
    else if (h.type === 'helicopter') drawHelicopter(h.x, h.y, h.frame);
    else if (h.type === 'balloon') drawBalloon(h.x, h.y);
  });

  projectiles.forEach(p => {
    if (p.src === 'helicopter') drawMissile(p.x, p.y, p.angle);
    else drawPitchfork(p.x, p.y, p.angle);
  });

  drawParticles();

  drawPlayerUFO(player.x, player.y);

  // damage flash
  if (dmgFlash > 0) {
    ctx.fillStyle = 'rgba(255,0,0,' + (dmgFlash / 30) + ')';
    ctx.fillRect(0, 0, gc.width, gc.height);
    dmgFlash--;
  }
}

/* ── Game state transitions ───────────────────── */
function resetGame() {
  player = {
    x: gc.width / 2,
    y: gc.height * PLAYER_Y_FRAC,
    beamOn: false,
    targetX: gc.width / 2,
    targetY: gc.height * PLAYER_Y_FRAC,
  };
  items = [];
  hazards = [];
  projectiles = [];
  particles = [];
  score = 0;
  lives = 3;
  sector = 1;
  sectorScore = 0;
  sectorStart = performance.now();
  scrollX = 0;
  lastSpawn = performance.now();
  lastHazardSpawn = performance.now();
  manifest = {};
  dmgFlash = 0;
  frame = 0;
  updateHUD();
}

function startGame() {
  state = 'PLAYING';
  resizeGame();
  resetGame();

  // hide landing
  dom.wrap.style.opacity = '0';
  dom.ufos.forEach(u => { u.style.opacity = '0'; });
  setTimeout(() => {
    dom.wrap.style.display = 'none';
    dom.ufos.forEach(u => { u.style.display = 'none'; });
  }, 300);

  // show game
  gc.style.display = 'block';
  dom.hud.style.display = 'block';

  // briefing
  dom.briefing.style.display = 'flex';
  setTimeout(() => {
    dom.briefing.style.display = 'none';
    lastTime = performance.now();
    lastSpawn = performance.now();
    lastHazardSpawn = performance.now();
    sectorStart = performance.now();
    rafId = requestAnimationFrame(gameLoop);
  }, 2000);
}

function endGame() {
  state = 'GAME_OVER';
  if (rafId) cancelAnimationFrame(rafId);

  const data = loadData();
  const isNewHigh = score > (data.highScore || 0);
  if (isNewHigh) data.highScore = score;
  data.totalAbductions = (data.totalAbductions || 0) + Object.values(manifest).reduce((a,b)=>a+b, 0);
  data.gamesPlayed = (data.gamesPlayed || 0) + 1;
  saveData(data);

  // determine rank
  let rank = RANKS[0][1];
  for (const [threshold, title] of RANKS) {
    if (score >= threshold) rank = title;
  }

  const msg = GAMEOVER_MSGS[Math.floor(Math.random() * GAMEOVER_MSGS.length)];
  dom.goTitle.textContent = isNewHigh ? 'NEW RECORD!' : 'MISSION COMPLETE';

  // build score text
  let scoreText = 'Score: ' + score;
  if (data.highScore > score) scoreText += ' | High Score: ' + data.highScore;
  dom.goScore.textContent = scoreText;
  if (isNewHigh) {
    const sub = document.createElement('div');
    sub.style.cssText = 'color:#39ff14;font-size:.8em;margin-top:.3em';
    sub.textContent = 'Galactic Command is... impressed? Concerned? Both.';
    dom.goScore.appendChild(sub);
  }

  dom.goRank.textContent = rank;

  // build manifest with safe DOM methods
  dom.goManifest.textContent = '';
  const title = document.createElement('strong');
  title.textContent = 'ABDUCTION MANIFEST:';
  dom.goManifest.appendChild(title);
  dom.goManifest.appendChild(document.createElement('br'));

  let totalItems = 0;
  for (const [type, count] of Object.entries(manifest)) {
    const def = ITEMS.find(i => i.type === type);
    const name = type === 'portapotty' ? 'Porta-Potty' : type.charAt(0).toUpperCase() + type.slice(1);
    const pts = def ? def.pts * count : 0;
    const line = document.createTextNode(name + (count > 1 ? ' x' + count : '') + ' (' + pts + ' pts)');
    dom.goManifest.appendChild(line);
    dom.goManifest.appendChild(document.createElement('br'));
    totalItems += count;
  }
  if (totalItems === 0) {
    const em = document.createElement('em');
    em.textContent = 'Nothing. You abducted nothing.';
    dom.goManifest.appendChild(em);
    dom.goManifest.appendChild(document.createElement('br'));
  }
  dom.goManifest.appendChild(document.createElement('br'));
  const msgEl = document.createElement('em');
  msgEl.textContent = msg;
  dom.goManifest.appendChild(msgEl);

  dom.over.style.display = 'flex';
}

function returnToLanding() {
  state = 'LANDING';
  if (rafId) cancelAnimationFrame(rafId);

  gc.style.display = 'none';
  dom.hud.style.display = 'none';
  dom.over.style.display = 'none';
  dom.paused.style.display = 'none';
  dom.flavor.style.display = 'none';

  dom.wrap.style.display = 'flex';
  dom.ufos.forEach(u => { u.style.display = ''; });
  requestAnimationFrame(() => {
    dom.wrap.style.opacity = '1';
    dom.ufos.forEach(u => { u.style.opacity = '1'; });
  });

  // restart idle timer
  clearTimeout(idleTimer);
  idleTimer = setTimeout(startIdle, 30000);
}

function togglePause() {
  if (state === 'PLAYING') {
    state = 'PAUSED';
    if (rafId) cancelAnimationFrame(rafId);
    dom.paused.style.display = 'flex';
  } else if (state === 'PAUSED') {
    state = 'PLAYING';
    dom.paused.style.display = 'none';
    lastTime = performance.now();
    rafId = requestAnimationFrame(gameLoop);
  }
}

/* ── Input handling ───────────────────────────── */
const keys = {};
const MOVE_SPEED_FRAC = 0.006;

document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') e.preventDefault();
  if (e.code === 'Space') { if (state === 'PLAYING') player.beamOn = true; }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (state === 'PLAYING' || state === 'PAUSED') togglePause();
  }
});
document.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'Space' && state === 'PLAYING') player.beamOn = false;
});

setInterval(() => {
  if (state !== 'PLAYING' || !player) return;
  const spd = gc.width * MOVE_SPEED_FRAC;
  if (keys['ArrowLeft']  || keys['KeyA']) player.x = Math.max(S(40), player.x - spd);
  if (keys['ArrowRight'] || keys['KeyD']) player.x = Math.min(gc.width - S(40), player.x + spd);
  if (keys['ArrowUp']    || keys['KeyW']) player.y = Math.max(gc.height * PLAYER_Y_MIN, player.y - spd);
  if (keys['ArrowDown']  || keys['KeyS']) player.y = Math.min(gc.height * PLAYER_Y_MAX, player.y + spd);
}, 16);

// touch
let touchActive = false;
gc.addEventListener('touchstart', e => {
  e.preventDefault();
  touchActive = true;
  if (state === 'PLAYING') {
    player.beamOn = true;
    player.targetX = e.touches[0].clientX;
    player.targetY = e.touches[0].clientY;
  }
}, { passive: false });
gc.addEventListener('touchmove', e => {
  e.preventDefault();
  if (state === 'PLAYING' && touchActive) {
    player.targetX = e.touches[0].clientX;
    player.targetY = e.touches[0].clientY;
  }
}, { passive: false });
gc.addEventListener('touchend', () => {
  touchActive = false;
  if (state === 'PLAYING') player.beamOn = false;
});

setInterval(() => {
  if (state !== 'PLAYING' || !player || !touchActive) return;
  const dx = player.targetX - player.x;
  player.x += dx * 0.15;
  player.x = Math.max(S(40), Math.min(gc.width - S(40), player.x));
  const dy = player.targetY - player.y;
  player.y += dy * 0.15;
  player.y = Math.max(gc.height * PLAYER_Y_MIN, Math.min(gc.height * PLAYER_Y_MAX, player.y));
}, 16);

/* ── DOM wiring ───────────────────────────────── */
dom.startBtn.addEventListener('click', startGame);
dom.retryBtn.addEventListener('click', () => {
  dom.over.style.display = 'none';
  resetGame();
  state = 'PLAYING';
  lastTime = performance.now();
  rafId = requestAnimationFrame(gameLoop);
});
dom.returnBtn.addEventListener('click', returnToLanding);

dom.paused.addEventListener('click', () => {
  if (state === 'PAUSED') togglePause();
});

window.addEventListener('resize', () => {
  if (state === 'PLAYING' || state === 'PAUSED') {
    resizeGame();
    player.y = gc.height * PLAYER_Y_FRAC;
  }
});

dom.wrap.style.transition = 'opacity 0.3s';
dom.ufos.forEach(u => { u.style.transition = 'opacity 0.3s'; });

// cycle hover titles on start button
let titleIdx = 0;
setInterval(() => {
  titleIdx = (titleIdx + 1) % HOVER_TITLES.length;
  dom.startBtn.title = HOVER_TITLES[titleIdx];
}, 3000);

/* ── Idle easter egg ──────────────────────────── */
let idleTimer = null;
let idleActive = false;
const originalFunText = dom.funText ? dom.funText.textContent : '';

function startIdle() {
  if (state !== 'LANDING' || !dom.funText || idleActive) return;
  idleActive = true;
  dom.funText.style.transition = 'transform 2s, opacity 2s';
  dom.funText.style.transform = 'translateY(-40px)';
  dom.funText.style.opacity = '0';
  setTimeout(() => {
    if (idleActive && dom.funText) {
      dom.funText.textContent = 'Fun was here. You missed it.';
      dom.funText.style.transform = 'translateY(0)';
      dom.funText.style.opacity = '1';
    }
  }, 2000);
}

function resetIdle() {
  if (idleActive && dom.funText) {
    idleActive = false;
    dom.funText.style.transition = 'opacity 0.5s';
    dom.funText.style.opacity = '0';
    setTimeout(() => {
      if (dom.funText) {
        dom.funText.textContent = originalFunText;
        dom.funText.style.opacity = '1';
      }
    }, 500);
  }
  clearTimeout(idleTimer);
  if (state === 'LANDING') {
    idleTimer = setTimeout(startIdle, 30000);
  }
}

['mousemove','keydown','touchstart','scroll'].forEach(ev => {
  document.addEventListener(ev, resetIdle, { passive: true });
});
if (state === 'LANDING') idleTimer = setTimeout(startIdle, 30000);

})();
