try { require('dotenv').config(); } catch { /* dotenv optional */ }

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ============================================================
// STRIPE (lazy — funktioniert auch ohne Keys, dann nur Demo-Modus)
// ============================================================
const STRIPE_SECRET_KEY    = process.env.STRIPE_SECRET_KEY    || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const PUBLIC_URL = process.env.PUBLIC_URL || '';
let stripe = null;
if (STRIPE_SECRET_KEY) {
  try { stripe = require('stripe')(STRIPE_SECRET_KEY); }
  catch (e) { console.warn('[market] stripe init failed:', e.message); }
}
const stripeReady = () => !!stripe;

// Webhook MUSS vor express.json() registriert werden (raw body für Signatur-Check)
app.post('/api/market/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  (req, res) => {
    if (!stripeReady() || !STRIPE_WEBHOOK_SECRET) return res.status(503).end();
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.warn('[market/webhook] signature failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      const username = s.metadata?.username;
      const itemId   = s.metadata?.itemId;
      if (username && itemId) grantPurchase(username, itemId, 'stripe', s.id);
    }
    res.json({ received: true });
  }
);

app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// EARLY ACCESS CODES  (each code binds to exactly one device)
// ============================================================

const crypto = require('crypto');
const ACCESS_FILE = path.join(__dirname, 'access-codes.json');
// Key = Benutzername (kleingeschrieben). Passwort = Early-Access-Code.
const DEFAULT_USERS = {
  admin:   { role: 'admin',  label: 'Admin',    password: 'MFs-Admin', deviceId: null, boundAt: null, lastSeen: null },
  tester:  { role: 'tester', label: 'Tester',   password: 'FS-TEST-5N8V-H2J4-6DB9',  deviceId: null, boundAt: null, lastSeen: null },
  tester2: { role: 'tester', label: 'Tester 2', password: 'FS-TEST2-7W4C-P9Y3-R6K1', deviceId: null, boundAt: null, lastSeen: null },
  dani:    { role: 'tester', label: 'Dani',    password: 'dani',               deviceId: null, boundAt: null, lastSeen: null },
};
let accessUsers = loadAccessUsers();
loadFriends();

function loadAccessUsers() {
  try {
    const raw = JSON.parse(fs.readFileSync(ACCESS_FILE, 'utf8'));
    // Migration: altes Format mit Code als Key → username als Key
    const migrated = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k.toUpperCase().startsWith('FS-') && v && v.role) {
        const uname = (v.role || '').toLowerCase();
        migrated[uname] = {
          role: v.role,
          label: v.label || (uname.charAt(0).toUpperCase() + uname.slice(1)),
          password: k,                    // alter Code wird Passwort
          deviceId: v.deviceId || null,
          boundAt:  v.boundAt  || null,
          lastSeen: v.lastSeen || null,
        };
      } else {
        migrated[k.toLowerCase()] = v;
      }
    }
    for (const k of Object.keys(DEFAULT_USERS)) {
      if (!migrated[k]) migrated[k] = { ...DEFAULT_USERS[k] };
      else if (!migrated[k].password) migrated[k].password = DEFAULT_USERS[k].password;
    }
    fs.writeFileSync(ACCESS_FILE, JSON.stringify(migrated, null, 2));
    return migrated;
  } catch {
    fs.writeFileSync(ACCESS_FILE, JSON.stringify(DEFAULT_USERS, null, 2));
    return JSON.parse(JSON.stringify(DEFAULT_USERS));
  }
}
function saveAccessUsers() {
  try { fs.writeFileSync(ACCESS_FILE, JSON.stringify(accessUsers, null, 2)); }
  catch (e) { console.error('access-codes save failed:', e.message); }
}

function timingSafeEq(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

app.post('/api/access', (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase().slice(0, 32);
  const password = String(req.body?.password || '').trim();
  const deviceId = String(req.body?.deviceId || '').trim().slice(0, 128);
  if (!username || !password || !deviceId) return res.json({ ok: false, error: 'missing' });
  const entry = accessUsers[username];
  if (!entry) return res.json({ ok: false, error: 'invalid-user' });
  if (!timingSafeEq(password, entry.password || '')) {
    return res.json({ ok: false, error: 'bad-password' });
  }
  if (entry.role !== 'admin' && entry.deviceId && entry.deviceId !== deviceId) {
    return res.json({ ok: false, error: 'bound-other-device' });
  }
  if (!entry.deviceId) {
    entry.deviceId = deviceId;
    entry.boundAt = Date.now();
    addEvent('access', `${username.toUpperCase()} an Gerät gebunden`);
  }
  entry.lastSeen = Date.now();
  saveAccessUsers();
  res.json({ ok: true, role: entry.role, label: entry.label });
});

// ============================================================
// MARKETPLACE
// ============================================================
// Einmalige Käufe — entsperren Premium-Flugzeuge für den Account.
// Zwei Bezahlwege:
//   1) Stripe Checkout (Karte + SEPA-Lastschrift) — echte Zahlung
//   2) Demo-Modus — offensichtlich ein Placebo, bewegt kein Geld
// Preise in Cent (Stripe-Konvention).
const MARKET_ITEMS = {
  b747:    { aircraftId: 'b747',    priceCents: 299,  label: 'Boeing 747-400',     category: 'aircraft', tagline: 'Queen of the Skies' },
  a380:    { aircraftId: 'a380',    priceCents: 299,  label: 'Airbus A380',        category: 'aircraft', tagline: 'Super Jumbo' },
  b777:    { aircraftId: 'b777',    priceCents: 499,  label: 'Boeing 777-300ER',   category: 'aircraft', tagline: 'Triple Seven' },
  a350:    { aircraftId: 'a350',    priceCents: 499,  label: 'Airbus A350-900',    category: 'aircraft', tagline: 'Next-Gen Widebody' },
  // Kampfjets
  f16:     { aircraftId: 'f16',     priceCents: 699,  label: 'F-16 Fighting Falcon', category: 'fighter', tagline: 'Viper — der Allrounder' },
  typhoon: { aircraftId: 'typhoon', priceCents: 999,  label: 'Eurofighter Typhoon',  category: 'fighter', tagline: 'Europäische Luftüberlegenheit' },
  rafale:  { aircraftId: 'rafale',  priceCents: 999,  label: 'Dassault Rafale',      category: 'fighter', tagline: 'Omnirole — Mehrzweckkämpfer' },
  f35:     { aircraftId: 'f35',     priceCents: 1299, label: 'F-35 Lightning II',    category: 'fighter', tagline: 'Stealth-Multirole' },
  f22:     { aircraftId: 'f22',     priceCents: 1499, label: 'F-22 Raptor',          category: 'fighter', tagline: 'Air Dominance Fighter' },
};

// Bundles — ein Kauf schaltet mehrere Items frei.
const MARKET_BUNDLES = {
  heavy:    { items: ['b747', 'a380'],                 priceCents: 499,  label: 'Heavy Metal Pack',    tagline: 'B747 + A380 — die legendären Jumbos', color: '#b06a1a' },
  widebody: { items: ['b777', 'a350'],                 priceCents: 899,  label: 'Modern Widebody',     tagline: 'B777 + A350 — moderne Langstrecke',   color: '#1558b0' },
  deluxe:   { items: ['b747', 'a380', 'b777', 'a350'], priceCents: 1299, label: 'Aviator Deluxe',      tagline: 'Alles dabei — alle Premium-Flugzeuge', color: '#8a1fb0' },
  // Fighter-Packs
  airsup:   { items: ['f22', 'f35'],                        priceCents: 2499, label: 'Air Superiority',   tagline: 'F-22 + F-35 — moderne US-Stealth',      color: '#2a3a4a' },
  europa:   { items: ['typhoon', 'rafale'],                 priceCents: 1799, label: 'Europa Fighters',   tagline: 'Eurofighter + Rafale',                  color: '#3a4a5a' },
  squadron: { items: ['f16', 'f22', 'f35', 'typhoon', 'rafale'], priceCents: 3999, label: 'Fighter Squadron', tagline: 'Alle 5 Kampfjets im Paket',          color: '#4a5a3a' },
};

function authUser(req) {
  const username = String(req.body?.username || req.query?.username || '').trim().toLowerCase();
  const deviceId = String(req.body?.deviceId || req.query?.deviceId || '').trim();
  if (!username || !deviceId) return null;
  const entry = accessUsers[username];
  if (!entry) return null;
  if (entry.deviceId !== deviceId) return null;
  if (!Array.isArray(entry.purchases)) entry.purchases = [];
  return { username, entry };
}

function grantItem(username, itemId, source, ref) {
  const entry = accessUsers[username];
  if (!entry || !MARKET_ITEMS[itemId]) return false;
  if (!Array.isArray(entry.purchases)) entry.purchases = [];
  if (entry.purchases.some(p => p.itemId === itemId)) return true;
  entry.purchases.push({ itemId, source, ref: ref || null, at: Date.now() });
  saveAccessUsers();
  addEvent('purchase', `${username.toUpperCase()} → ${itemId} (${source})`);
  return true;
}

// Schaltet entweder ein Item oder ein Bundle frei (bei Bundle alle enthaltenen Items).
function grantPurchase(username, id, source, ref) {
  if (MARKET_BUNDLES[id]) {
    const b = MARKET_BUNDLES[id];
    for (const itemId of b.items) grantItem(username, itemId, source, ref);
    return true;
  }
  return grantItem(username, id, source, ref);
}

function ownedIds(entry) {
  return (entry.purchases || []).map(p => p.itemId);
}

function resolvePurchasable(id) {
  if (MARKET_ITEMS[id])   return { kind: 'item',   id, priceCents: MARKET_ITEMS[id].priceCents,   label: MARKET_ITEMS[id].label };
  if (MARKET_BUNDLES[id]) return { kind: 'bundle', id, priceCents: MARKET_BUNDLES[id].priceCents, label: MARKET_BUNDLES[id].label };
  return null;
}

app.get('/api/market/items', (req, res) => {
  const auth = authUser(req);
  const items = Object.entries(MARKET_ITEMS).map(([id, it]) => ({
    id,
    aircraftId: it.aircraftId,
    label: it.label,
    priceCents: it.priceCents,
    category: it.category,
    tagline: it.tagline,
  }));
  const bundles = Object.entries(MARKET_BUNDLES).map(([id, b]) => ({
    id,
    label: b.label,
    priceCents: b.priceCents,
    items: b.items,
    tagline: b.tagline,
    color: b.color,
  }));
  res.json({
    ok: true,
    items,
    bundles,
    owned: auth ? ownedIds(auth.entry) : [],
    stripeEnabled: stripeReady(),
  });
});

// Demo-Bezahlung — streng optisch. Akzeptiert ein Fake-IBAN-Muster und
// bestätigt nach 800 ms, damit es sich wie ein Payment anfühlt. Es wird
// NIE ein echter Zahlungsvorgang ausgelöst; das Server-Log markiert den
// Kauf als source='demo'.
app.post('/api/market/demo-buy', (req, res) => {
  const auth = authUser(req);
  if (!auth) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const itemId = String(req.body?.itemId || '');
  if (!resolvePurchasable(itemId)) return res.status(400).json({ ok: false, error: 'unknown-item' });
  if (!req.body?.demoAcknowledged) {
    return res.status(400).json({ ok: false, error: 'demo-not-acknowledged' });
  }
  const iban = String(req.body?.iban || '').replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) {
    return res.status(400).json({ ok: false, error: 'iban-format' });
  }
  grantPurchase(auth.username, itemId, 'demo', null);
  res.json({ ok: true, owned: ownedIds(auth.entry) });
});

app.post('/api/market/checkout', async (req, res) => {
  if (!stripeReady()) return res.status(503).json({ ok: false, error: 'stripe-disabled' });
  const auth = authUser(req);
  if (!auth) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const purchaseId = String(req.body?.itemId || '');
  const resolved = resolvePurchasable(purchaseId);
  if (!resolved) return res.status(400).json({ ok: false, error: 'unknown-item' });
  // Einzel-Items: wenn schon besessen, nichts tun. Bundles: wenn alle enthaltenen Items schon besessen, als owned werten.
  const owned = ownedIds(auth.entry);
  if (resolved.kind === 'item' && owned.includes(resolved.id)) {
    return res.json({ ok: true, alreadyOwned: true });
  }
  if (resolved.kind === 'bundle' && MARKET_BUNDLES[resolved.id].items.every(i => owned.includes(i))) {
    return res.json({ ok: true, alreadyOwned: true });
  }
  const base = (req.body?.returnBase && String(req.body.returnBase)) || PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'sepa_debit'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Flugsim — ${resolved.label}` },
          unit_amount: resolved.priceCents,
        },
        quantity: 1,
      }],
      success_url: `${base}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${base}/?checkout=cancel`,
      metadata: { username: auth.username, itemId: resolved.id },
      client_reference_id: `${auth.username}:${resolved.id}`,
    });
    res.json({ ok: true, url: session.url });
  } catch (e) {
    console.warn('[market/checkout]', e.message);
    res.status(500).json({ ok: false, error: 'stripe-error' });
  }
});

// Fallback zur Webhook-Freischaltung: nach Stripe-Redirect zurück
// kann der Client die Session hier gegenprüfen (falls Webhook noch nicht
// durchgelaufen ist). Idempotent — grantItem erkennt doppelte Käufe.
app.get('/api/market/confirm', async (req, res) => {
  if (!stripeReady()) return res.status(503).json({ ok: false });
  const auth = authUser(req);
  if (!auth) return res.status(401).json({ ok: false });
  const sessionId = String(req.query?.session_id || '');
  if (!sessionId) return res.status(400).json({ ok: false });
  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    if (s.payment_status === 'paid') {
      const itemId = s.metadata?.itemId;
      const username = s.metadata?.username;
      if (username === auth.username && itemId) grantPurchase(username, itemId, 'stripe', s.id);
    }
    res.json({ ok: true, paid: s.payment_status === 'paid', owned: ownedIds(auth.entry) });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

// ============================================================
// STATISTICS TRACKING
// ============================================================

const stats = {
  startTime: Date.now(),
  totalConnections: 0,
  totalCrashes: 0,
  totalFlights: 0,
  aircraftStats: {},   // { 'a320': 5, 'b747': 2 }
  airlineStats: {},
  airportStats: {},
  crashReasons: {},
  events: [],          // { time, type, detail }
};

function addEvent(type, detail) {
  stats.events.push({ time: Date.now(), type, detail });
  if (stats.events.length > 500) stats.events.shift();
}

function incrStat(obj, key) {
  if (!key) return;
  obj[key] = (obj[key] || 0) + 1;
}

// Stats API
app.get('/api/stats', (req, res) => {
  const playerList = [];
  for (const p of players.values()) {
    playerList.push({
      id: p.id,
      pilotName: p.pilotName,
      aircraftType: p.aircraftType,
      airline: p.airline,
      airport: p.airport,
      altitude: p.y,
      speed: p.speed * 3.6,
      x: p.x, z: p.z,
      fuel: p.fuelPercent,
      alive: p.alive,
      throttle: p.throttle,
      flaps: p.flaps,
      gear: p.gear,
    });
  }

  res.json({
    playersOnline: players.size,
    totalConnections: stats.totalConnections,
    totalCrashes: stats.totalCrashes,
    totalFlights: stats.totalFlights,
    uptimeSeconds: (Date.now() - stats.startTime) / 1000,
    startTime: stats.startTime,
    players: playerList,
    aircraftStats: stats.aircraftStats,
    airlineStats: stats.airlineStats,
    airportStats: stats.airportStats,
    crashReasons: stats.crashReasons,
    events: stats.events.slice(-100),
  });
});

// ============================================================
// AIRCRAFT PHYSICS PROFILES
// ============================================================

const AIRCRAFT_PHYSICS = {
  // --- JET AIRLINERS BESTAND ---
  a320:  { mass: 64000,  wingArea: 122.6, liftCoeff: 1.4,  dragCoeff: 0.028, thrustMax: 240000,  stallSpeed: 54,  pitchRate: 1.5, rollRate: 2.0, yawRate: 0.8 },
  a330:  { mass: 180000, wingArea: 361.6, liftCoeff: 1.5,  dragCoeff: 0.026, thrustMax: 640000,  stallSpeed: 58,  pitchRate: 1.2, rollRate: 1.5, yawRate: 0.6 },
  a340:  { mass: 245000, wingArea: 439.4, liftCoeff: 1.5,  dragCoeff: 0.027, thrustMax: 604000,  stallSpeed: 62,  pitchRate: 1.0, rollRate: 1.3, yawRate: 0.5 },
  a350:  { mass: 195000, wingArea: 443,   liftCoeff: 1.55, dragCoeff: 0.024, thrustMax: 748000,  stallSpeed: 56,  pitchRate: 1.3, rollRate: 1.6, yawRate: 0.7 },
  a380:  { mass: 390000, wingArea: 845,   liftCoeff: 1.6,  dragCoeff: 0.025, thrustMax: 1244000, stallSpeed: 64,  pitchRate: 0.8, rollRate: 1.0, yawRate: 0.4 },
  b737:  { mass: 62000,  wingArea: 124.6, liftCoeff: 1.35, dragCoeff: 0.029, thrustMax: 242800,  stallSpeed: 53,  pitchRate: 1.6, rollRate: 2.2, yawRate: 0.9 },
  b747:  { mass: 285000, wingArea: 541.2, liftCoeff: 1.5,  dragCoeff: 0.026, thrustMax: 1009600, stallSpeed: 60,  pitchRate: 0.9, rollRate: 1.1, yawRate: 0.5 },
  b757:  { mass: 84000,  wingArea: 185.3, liftCoeff: 1.45, dragCoeff: 0.027, thrustMax: 383400,  stallSpeed: 55,  pitchRate: 1.4, rollRate: 1.8, yawRate: 0.8 },
  b777:  { mass: 240000, wingArea: 427.8, liftCoeff: 1.55, dragCoeff: 0.025, thrustMax: 1027800, stallSpeed: 58,  pitchRate: 1.1, rollRate: 1.4, yawRate: 0.6 },
  b787:  { mass: 181000, wingArea: 377,   liftCoeff: 1.5,  dragCoeff: 0.023, thrustMax: 640000,  stallSpeed: 56,  pitchRate: 1.3, rollRate: 1.6, yawRate: 0.7 },

  // --- AIRBUS NEU ---
  a220:  { mass: 45000,  wingArea: 112,   liftCoeff: 1.4,  dragCoeff: 0.028, thrustMax: 184000,  stallSpeed: 50,  pitchRate: 1.7, rollRate: 2.1, yawRate: 0.9 },
  a300:  { mass: 130000, wingArea: 260,   liftCoeff: 1.45, dragCoeff: 0.028, thrustMax: 500000,  stallSpeed: 56,  pitchRate: 1.3, rollRate: 1.6, yawRate: 0.7 },
  a321:  { mass: 75000,  wingArea: 122.6, liftCoeff: 1.4,  dragCoeff: 0.028, thrustMax: 293000,  stallSpeed: 56,  pitchRate: 1.4, rollRate: 1.9, yawRate: 0.8 },

  // --- BOEING NEU ---
  b707:  { mass: 117000, wingArea: 283,   liftCoeff: 1.4,  dragCoeff: 0.029, thrustMax: 320000,  stallSpeed: 58,  pitchRate: 1.2, rollRate: 1.5, yawRate: 0.7 },
  b717:  { mass: 49000,  wingArea: 93,    liftCoeff: 1.35, dragCoeff: 0.030, thrustMax: 170000,  stallSpeed: 52,  pitchRate: 1.6, rollRate: 2.0, yawRate: 0.9 },
  b727:  { mass: 86000,  wingArea: 157.9, liftCoeff: 1.4,  dragCoeff: 0.029, thrustMax: 213000,  stallSpeed: 56,  pitchRate: 1.3, rollRate: 1.7, yawRate: 0.8 },
  b767:  { mass: 155000, wingArea: 283.3, liftCoeff: 1.5,  dragCoeff: 0.027, thrustMax: 560000,  stallSpeed: 56,  pitchRate: 1.3, rollRate: 1.6, yawRate: 0.7 },

  // --- KAMPFJETS ---
  // Hohes Schub-Gewicht-Verhältnis + hohe Rollraten + niedrige Flächenbelastung verträgt.
  f16:     { mass: 8570,  wingArea: 27.87, liftCoeff: 1.55, dragCoeff: 0.022, thrustMax: 131000, stallSpeed: 67, pitchRate: 4.5, rollRate: 6.0, yawRate: 2.0 },
  f22:     { mass: 19700, wingArea: 78.04, liftCoeff: 1.6,  dragCoeff: 0.021, thrustMax: 312000, stallSpeed: 72, pitchRate: 5.0, rollRate: 6.5, yawRate: 2.2 },
  f35:     { mass: 13199, wingArea: 42.7,  liftCoeff: 1.55, dragCoeff: 0.022, thrustMax: 191000, stallSpeed: 69, pitchRate: 4.2, rollRate: 5.5, yawRate: 1.9 },
  typhoon: { mass: 11000, wingArea: 51.2,  liftCoeff: 1.6,  dragCoeff: 0.022, thrustMax: 180000, stallSpeed: 65, pitchRate: 4.8, rollRate: 6.2, yawRate: 2.1 },
  rafale:  { mass: 10300, wingArea: 45.7,  liftCoeff: 1.6,  dragCoeff: 0.022, thrustMax: 151200, stallSpeed: 64, pitchRate: 4.6, rollRate: 6.0, yawRate: 2.0 },
};
const DEFAULT_PHYSICS = AIRCRAFT_PHYSICS.a320;

// ============================================================
// CONSTANTS
// ============================================================

const TICK_RATE = 60;
const DT = 1 / TICK_RATE;
const GRAVITY = 9.81;
const AIR_DENSITY = 1.225;
const GROUND_LEVEL = 0;

const FLAP_SETTINGS = [
  [0, 0], [0.12, 0.025], [0.25, 0.06], [0.40, 0.10], [0.55, 0.18],
];

// ============================================================
// WEATHER
// ============================================================

const WEATHER_PRESETS = {
  clear:      { name: 'CAVOK',  windSpeed: 2,  windDir: 0,   turbulence: 0,   visibility: 50000 },
  fewClouds:  { name: 'FEW',    windSpeed: 5,  windDir: 0.5, turbulence: 0.1, visibility: 40000 },
  scattered:  { name: 'SCT',    windSpeed: 10, windDir: 1.0, turbulence: 0.2, visibility: 25000 },
  overcast:   { name: 'OVC',    windSpeed: 15, windDir: 1.5, turbulence: 0.35,visibility: 12000 },
  stormy:     { name: 'TS',     windSpeed: 30, windDir: 2.0, turbulence: 0.7, visibility: 3000 },
};
let currentWeather = { ...WEATHER_PRESETS.fewClouds };

// ============================================================
// FRIENDS
// ============================================================

const FRIENDS_FILE = path.join(__dirname, 'friends.json');
// Structure: { "username": { friends: ["friendName", ...], pendingIn: [{from:"name", ts:123}, ...], pendingOut: ["name", ...] } }
let friendsData = {};

function loadFriends() {
  try { friendsData = JSON.parse(fs.readFileSync(FRIENDS_FILE, 'utf8')); } catch { friendsData = {}; }
  // Ensure every user entry has all fields
  for (const k of Object.keys(friendsData)) {
    if (!Array.isArray(friendsData[k].friends)) friendsData[k].friends = [];
    if (!Array.isArray(friendsData[k].pendingIn)) friendsData[k].pendingIn = [];
    if (!Array.isArray(friendsData[k].pendingOut)) friendsData[k].pendingOut = [];
  }
}
function saveFriends() {
  try { fs.writeFileSync(FRIENDS_FILE, JSON.stringify(friendsData, null, 2)); } catch (e) { console.error('friends save failed:', e.message); }
}
function getFriendsEntry(name) {
  const n = name.toLowerCase();
  if (!friendsData[n]) friendsData[n] = { friends: [], pendingIn: [], pendingOut: [] };
  return friendsData[n];
}
function isOnline(name) {
  for (const p of players.values()) if ((p.pilotName || '').toLowerCase() === name.toLowerCase()) return p;
  return null;
}
function sendToPlayer(name, msg) {
  const n = name.toLowerCase();
  for (const ws of wss.clients) {
    const p = ws._player;
    if (p && (p.pilotName || '').toLowerCase() === n) { ws.send(JSON.stringify(msg)); return; }
  }
}
function friendsUpdateFor(name) {
  const n = name.toLowerCase();
  const entry = getFriendsEntry(n);
  sendToPlayer(n, { type: 'friendsUpdate', friends: entry.friends, pending: entry.pendingIn });
}

// ============================================================
// PLAYERS
// ============================================================

let nextId = 1;
const players = new Map();

function createPlayer(id, aircraftType = 'a320', spawnOpts = {}) {
  const phys = AIRCRAFT_PHYSICS[aircraftType] || DEFAULT_PHYSICS;
  return {
    id, aircraftType, airline: '', airport: '', pilotName: '',
    x: Number.isFinite(spawnOpts.x) ? spawnOpts.x : 0,
    y: Number.isFinite(spawnOpts.y) ? spawnOpts.y : 5,
    z: Number.isFinite(spawnOpts.z) ? spawnOpts.z : 0,
    pitch: 0, roll: 0,
    yaw: spawnOpts.yaw || 0,
    spawn: {
      x: Number.isFinite(spawnOpts.x) ? spawnOpts.x : 0,
      y: Number.isFinite(spawnOpts.y) ? spawnOpts.y : 5,
      z: Number.isFinite(spawnOpts.z) ? spawnOpts.z : 0,
      yaw: spawnOpts.yaw || 0,
    },
    speed: spawnOpts.onRunway ? 0 : 70,
    throttle: spawnOpts.onRunway ? 0 : 0.5,
    flaps: 0, gear: true, brakes: false, parkingBrake: false,
    lights: false, spoilers: false,
    autopilot: false, apAltHold: false, apHdgHold: false,
    apAlt: 10000, apHdg: 0, apSpeed: 250, apVs: 0,
    autobrake: 0,
    stallWarning: false, gForce: 1.0,
    groundSpeed: 0, verticalSpeed: 0, aoa: 0,
    fuelPercent: 100,
    input: { pitch: 0, roll: 0, yaw: 0, throttle: 0 },
    // Vom Client gemeldete Terrain-Höhe (Raycast). null = unbekannt → 0 als Floor.
    terrainHeight: 0,
    alive: true, crashReason: '', onGround: false,
    phys,
  };
}

// Maximale gewünschte Stick-Deflection in Radiant
const MAX_PITCH_CMD = 0.42;  // ~24° Pitch
const MAX_ROLL_CMD  = 1.05;  // ~60° Bank
const ROT_FACTOR    = 1.1;   // Rotations­geschwindigkeit ≈ 1.1 × stallSpeed

function updatePhysics(p) {
  if (!p.alive) return;
  const input = p.input;
  const ph = p.phys;

  // Steuerwirksamkeit skaliert mit Anströmgeschwindigkeit:
  // unter ~60 kt IAS mushy, bei Reiseflug scharf
  const vKt = p.speed * 1.944;
  const ctrlEff = clamp(vKt / 70, 0.2, 1.3);

  // ── ATTITUDE COMMAND (Ziel-Lage statt Ratensteuerung) ──
  // input = Stick-Position in [-1,1]; das Flugzeug lerpt Richtung
  // Ziel-Lage und kehrt beim Loslassen von selbst in die Level-Lage zurück.
  const tgtPitch = clamp(input.pitch, -1, 1) * MAX_PITCH_CMD;
  const tgtRoll  = clamp(input.roll,  -1, 1) * MAX_ROLL_CMD;
  p.pitch += (tgtPitch - p.pitch) * ph.pitchRate * ctrlEff * DT;
  p.roll  += (tgtRoll  - p.roll ) * ph.rollRate  * ctrlEff * DT;

  // Yaw: Seitenruder-Kommando + Turn-Coordination aus Bank
  const coordYawRate = p.speed > 25 ? (GRAVITY * Math.tan(p.roll)) / Math.max(p.speed, 30) : 0;
  p.yaw += (input.yaw * ph.yawRate * ctrlEff + coordYawRate) * DT;

  // Ground-Lock: am Boden und unter Rotationsgeschwindigkeit sind
  // Pitch/Roll passiv — keine ungewollten Aufbäumer beim Taxiing.
  const rotSpeed = ph.stallSpeed * ROT_FACTOR;
  if (p.onGround && p.speed < rotSpeed) {
    const lock = p.speed < rotSpeed * 0.6 ? 0.6 : 0.9;
    p.pitch *= lock;
    p.roll  *= lock;
  }

  p.pitch = clamp(p.pitch, -Math.PI / 3, Math.PI / 3);
  p.roll  = clamp(p.roll,  -Math.PI / 2.2, Math.PI / 2.2);
  p.throttle = clamp(p.throttle + input.throttle * DT * 0.6, 0, 1);
  p.fuelPercent = Math.max(0, p.fuelPercent - p.throttle * 0.002 * DT);
  const fuelMult = p.fuelPercent > 0 ? 1 : 0;

  // Autopilot
  if (p.autopilot) {
    if (p.apHdgHold) {
      const tgt = Math.PI - p.apHdg * Math.PI / 180;
      let diff = tgt - p.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.roll = clamp(diff * 2, -0.5, 0.5);
    }
    if (p.apAltHold) {
      const altFt = p.y * 3.281;
      const altDiff = p.apAlt - altFt;
      const tgtVs = clamp(altDiff * 0.5, -1500, 1500);
      const vsFpm = p.verticalSpeed * 196.85;
      p.pitch = clamp(p.pitch + (tgtVs - vsFpm) * 0.00005 * DT, -0.3, 0.3);
    }
  }

  const flapSetting = FLAP_SETTINGS[p.flaps] || FLAP_SETTINGS[0];
  const liftCoeff = ph.liftCoeff + flapSetting[0];
  const dragCoeff = ph.dragCoeff + flapSetting[1] + (p.gear ? 0.018 : 0) + (p.spoilers ? 0.07 : 0) + (p.brakes && p.onGround ? 0.12 : 0);
  const v = p.speed;
  const q = 0.5 * AIR_DENSITY * v * v;
  const lift = q * ph.wingArea * liftCoeff * Math.cos(p.roll);
  const drag = q * ph.wingArea * dragCoeff;
  const thrust = p.throttle * ph.thrustMax * fuelMult;
  p.aoa = p.pitch;
  const groundY = Math.max(GROUND_LEVEL, p.terrainHeight || 0);
  p.stallWarning = v < ph.stallSpeed * 1.3 && p.y > groundY + 15;
  const sf = v < ph.stallSpeed ? Math.max(0.15, v / ph.stallSpeed) : 1.0;
  const windX = Math.sin(currentWeather.windDir) * currentWeather.windSpeed * DT;
  const windZ = Math.cos(currentWeather.windDir) * currentWeather.windSpeed * DT;
  const turb = currentWeather.turbulence * (Math.random() - 0.5) * 2;
  const accel = (thrust - drag) / ph.mass - GRAVITY * Math.sin(p.pitch);
  const prev = p.speed;
  p.speed = Math.max(0, v + accel * DT);
  const spdChg = (p.speed - prev) / DT;
  p.gForce = clamp(1.0 + spdChg / GRAVITY + p.speed * Math.abs(p.roll) * 0.3 / GRAVITY, -2, 7);
  const vertAccel = (lift * sf / ph.mass) - GRAVITY + (thrust / ph.mass) * Math.sin(p.pitch);
  const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch), cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
  const dx = sy * cp * p.speed * DT + windX;
  const dy = sp * p.speed * DT;
  const dz = cy * cp * p.speed * DT + windZ;
  p.x += dx;
  p.y += dy + (vertAccel - GRAVITY * sp) * DT * 0.3 + turb * 0.5;
  p.z += dz;
  p.groundSpeed = Math.sqrt(dx * dx + dz * dz) / DT;
  p.verticalSpeed = (dy + (vertAccel - GRAVITY * sp) * DT * 0.3) / DT;

  p.onGround = p.y <= groundY + 3;
  // Boden­berührung ohne Fahrwerk = sofortiger Crash (Belly Landing),
  // unabhängig von Geschwindigkeit oder Fluglage.
  if (p.onGround && !p.gear) {
    p.y = groundY + 2;
    p.alive = false;
    p.crashReason = 'Belly Landing — Fahrwerk eingefahren';
    stats.totalCrashes++;
    incrStat(stats.crashReasons, p.crashReason);
    addEvent('crash', `#${p.id} ${p.aircraftType.toUpperCase()} — ${p.crashReason}`);
    return;
  }
  if (p.y < groundY + 2) {
    // Impact-Geschwindigkeit: je höher das Gelände über der alten Annahme,
    // desto eher CFIT (Controlled Flight Into Terrain)
    const sinkRate = -p.verticalSpeed; // m/s
    const hardHit = sinkRate > 8 || p.speed > 110;
    const steep   = Math.abs(p.pitch) > 0.4 || Math.abs(p.roll) > 0.6;
    const overTerrain = groundY > 10; // nicht auf Runway-Niveau

    p.y = groundY + 2;
    if (overTerrain && (hardHit || steep)) {
      p.alive = false;
      p.crashReason = 'CFIT — Aufprall am Gelände';
      stats.totalCrashes++;
      incrStat(stats.crashReasons, p.crashReason);
      addEvent('crash', `#${p.id} ${p.aircraftType.toUpperCase()} — ${p.crashReason}`);
      return;
    }
    if (p.speed > 85 || Math.abs(p.pitch) > 0.4 || Math.abs(p.roll) > 0.6) {
      p.alive = false;
      if (!p.gear) p.crashReason = 'Belly Landing — Gear eingefahren';
      else if (p.speed > 85) p.crashReason = `Überhöhte Geschwindigkeit (${(p.speed * 3.6).toFixed(0)} km/h)`;
      else if (Math.abs(p.pitch) > 0.4) p.crashReason = 'Zu steiler Anflug';
      else p.crashReason = 'Seitliche Landung';
      stats.totalCrashes++;
      incrStat(stats.crashReasons, p.crashReason);
      addEvent('crash', `#${p.id} ${p.aircraftType.toUpperCase()} — ${p.crashReason}`);
      return;
    }
    if (!p.gear) { p.alive = false; p.crashReason = 'Belly Landing'; stats.totalCrashes++; incrStat(stats.crashReasons, p.crashReason); addEvent('crash', `#${p.id} — Belly Landing`); return; }
    p.pitch = Math.max(-0.05, p.pitch); p.roll *= 0.9;
    if (p.parkingBrake) p.speed *= 0.98;
    else if (p.brakes || p.autobrake > 0) p.speed *= p.brakes ? 0.995 : [1, 0.998, 0.996, 0.994, 0.99][p.autobrake];
    else p.speed *= 0.9997;
    p.verticalSpeed = 0;
  }
  if (p.gForce > 5.5 || p.gForce < -1.5) {
    p.alive = false; p.crashReason = `Strukturversagen (${p.gForce.toFixed(1)}G)`;
    stats.totalCrashes++; incrStat(stats.crashReasons, 'Strukturversagen'); addEvent('crash', `#${p.id} — Strukturversagen`);
  }
  if (p.y < groundY - 50) {
    p.alive = false; p.crashReason = 'CFIT';
    stats.totalCrashes++; incrStat(stats.crashReasons, 'CFIT'); addEvent('crash', `#${p.id} — CFIT`);
  }
}

function getState() {
  const out = [];
  for (const p of players.values()) {
    out.push({
      id:p.id, pilotName:p.pilotName, aircraftType:p.aircraftType, airline:p.airline, airport:p.airport,
      x:p.x, y:p.y, z:p.z, pitch:p.pitch, roll:p.roll, yaw:p.yaw,
      speed:p.speed, throttle:p.throttle, flaps:p.flaps, gear:p.gear,
      brakes:p.brakes, parkingBrake:p.parkingBrake, lights:p.lights, spoilers:p.spoilers,
      autopilot:p.autopilot, apAltHold:p.apAltHold, apHdgHold:p.apHdgHold,
      stallWarning:p.stallWarning, gForce:p.gForce,
      groundSpeed:p.groundSpeed, verticalSpeed:p.verticalSpeed, aoa:p.aoa,
      fuelPercent:p.fuelPercent, alive:p.alive, crashReason:p.crashReason, onGround:p.onGround,
    });
  }
  return out;
}

// ============================================================
// WEBSOCKET
// ============================================================

wss.on('connection', (ws) => {
  const id = nextId++;
  const player = createPlayer(id);
  ws._player = player;
  players.set(id, player);

  stats.totalConnections++;
  stats.totalFlights++;
  addEvent('join', `Spieler #${id} verbunden`);

  ws.send(JSON.stringify({ type: 'init', id, state: getState(), weather: currentWeather }));
  broadcast({ type: 'playerJoined', id });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'input') {
        player.input.pitch = clamp(msg.pitch || 0, -1, 1);
        player.input.roll = clamp(msg.roll || 0, -1, 1);
        player.input.yaw = clamp(msg.yaw || 0, -1, 1);
        player.input.throttle = clamp(msg.throttle || 0, -1, 1);
        if (typeof msg.terrainHeight === 'number' && Number.isFinite(msg.terrainHeight)) {
          // Clamp auf plausiblen Bereich (Ozean-Tiefen bis höchste Berge)
          player.terrainHeight = clamp(msg.terrainHeight, -500, 9000);
        }
      }
      if (msg.type === 'login') {
        const name = String(msg.name || '').trim().slice(0, 20);
        if (name.length >= 3) {
          player.pilotName = name;
          addEvent('join', `${name} (Spieler #${id}) eingeloggt`);
          // Send current friends state to the newly logged-in player
          const entry = getFriendsEntry(name);
          ws.send(JSON.stringify({ type: 'friendsUpdate', friends: entry.friends, pending: entry.pendingIn }));
        }
      }
      // Friend operations
      if (msg.type === 'friendRequest') {
        const target = String(msg.to || '').trim().toLowerCase().slice(0, 20);
        const fromName = player.pilotName || '';
        if (!target || target === fromName.toLowerCase() || target.length < 3) { /* ignore */ }
        else {
          const fromEntry = getFriendsEntry(fromName);
          // Already friends or already sent?
          if (fromEntry.friends.includes(target)) { /* already friends */ }
          else if (fromEntry.pendingOut.includes(target)) { /* already sent */ }
          else {
            fromEntry.pendingOut.push(target);
            const toEntry = getFriendsEntry(target);
            toEntry.pendingIn.push({ from: fromName, ts: Date.now() });
            saveFriends();
            // Notify target if online
            sendToPlayer(target, { type: 'friendInvite', from: fromName });
            // Confirm to sender
            ws.send(JSON.stringify({ type: 'friendRequestSent', to: target }));
          }
        }
      }
      if (msg.type === 'friendAccept') {
        const fromName = String(msg.from || '').trim();
        const myName = player.pilotName || '';
        if (!fromName || fromName === myName) return;
        const myEntry = getFriendsEntry(myName);
        const fromEntry = getFriendsEntry(fromName);
        // Remove from pendingIn, add to friends both ways
        myEntry.pendingIn = myEntry.pendingIn.filter(p => p.from !== fromName);
        fromEntry.pendingOut = fromEntry.pendingOut.filter(n => n !== myName.toLowerCase());
        if (!myEntry.friends.includes(fromName)) myEntry.friends.push(fromName);
        if (!fromEntry.friends.includes(myName)) fromEntry.friends.push(myName);
        saveFriends();
        friendsUpdateFor(myName);
        friendsUpdateFor(fromName);
        // Notify the other player
        sendToPlayer(fromName, { type: 'friendAccepted', by: myName });
      }
      if (msg.type === 'friendDecline') {
        const fromName = String(msg.from || '').trim();
        const myName = player.pilotName || '';
        if (!fromName || fromName === myName) return;
        const myEntry = getFriendsEntry(myName);
        const fromEntry = getFriendsEntry(fromName);
        myEntry.pendingIn = myEntry.pendingIn.filter(p => p.from !== fromName);
        fromEntry.pendingOut = fromEntry.pendingOut.filter(n => n !== myName.toLowerCase());
        saveFriends();
        friendsUpdateFor(myName);
        // Notify the other player
        sendToPlayer(fromName, { type: 'friendDeclined', by: myName });
      }
      if (msg.type === 'friendRemove') {
        const target = String(msg.to || '').trim();
        const myName = player.pilotName || '';
        if (!target || target === myName) return;
        const myEntry = getFriendsEntry(myName);
        const targetEntry = getFriendsEntry(target);
        myEntry.friends = myEntry.friends.filter(f => f !== target);
        targetEntry.friends = targetEntry.friends.filter(f => f !== myName);
        saveFriends();
        friendsUpdateFor(myName);
        friendsUpdateFor(target);
        sendToPlayer(target, { type: 'friendRemoved', by: myName });
      }
      if (msg.type === 'friendChat') {
        const target = String(msg.to || '').trim().toLowerCase();
        const text = String(msg.text || '').trim().slice(0, 200);
        const fromName = player.pilotName || '';
        if (!target || !text || target === fromName.toLowerCase()) return;
        // Only send if they are friends
        const myEntry = getFriendsEntry(fromName);
        if (!myEntry.friends.map(f => f.toLowerCase()).includes(target)) return;
        // Deliver to target and echo back to sender with id
        const ts = Date.now();
        sendToPlayer(target, { type: 'friendChat', from: fromName, text, ts });
        ws.send(JSON.stringify({ type: 'friendChatEcho', to: target, text, ts }));
      }
      if (msg.type === 'selectAircraft') {
        if (AIRCRAFT_PHYSICS[msg.aircraft]) {
          const yaw = msg.spawnYaw !== undefined ? msg.spawnYaw : player.yaw;
          const sx  = Number.isFinite(msg.spawnX) ? msg.spawnX : 0;
          const sz  = Number.isFinite(msg.spawnZ) ? msg.spawnZ : 0;
          const pname = player.pilotName;
          Object.assign(player, createPlayer(id, msg.aircraft, { yaw, x: sx, z: sz, y: 3, onRunway: true }));
          player.pilotName = pname;
          player.airline = msg.airline || '';
          player.airport = msg.airport || '';
          incrStat(stats.aircraftStats, msg.aircraft.toUpperCase());
          if (msg.airline) incrStat(stats.airlineStats, msg.airline);
          if (msg.airport) incrStat(stats.airportStats, msg.airport);
        }
      }
      if (msg.type === 'flaps') player.flaps = clamp(Math.round(msg.value), 0, 4);
      if (msg.type === 'gear' && player.y > Math.max(GROUND_LEVEL, player.terrainHeight || 0) + 10) player.gear = !player.gear;
      if (msg.type === 'brakes') player.brakes = !!msg.value;
      if (msg.type === 'parkingBrake') player.parkingBrake = !player.parkingBrake;
      if (msg.type === 'lights') player.lights = !player.lights;
      if (msg.type === 'spoilers') player.spoilers = !player.spoilers;
      if (msg.type === 'autobrake') player.autobrake = clamp(msg.value || 0, 0, 4);
      if (msg.type === 'setThrottle') player.throttle = clamp(msg.value || 0, 0, 1);
      if (msg.type === 'autopilot') {
        if (msg.key === 'master') player.autopilot = !player.autopilot;
        if (msg.key === 'hdg') player.apHdgHold = !player.apHdgHold;
        if (msg.key === 'alt') player.apAltHold = !player.apAltHold;
        if (msg.key === 'setAlt') player.apAlt = clamp(msg.value || 10000, 0, 45000);
        if (msg.key === 'setHdg') player.apHdg = ((msg.value || 0) % 360 + 360) % 360;
        if (msg.key === 'setSpd') player.apSpeed = clamp(msg.value || 250, 100, 400);
        if (msg.key === 'setVs') player.apVs = clamp(msg.value || 0, -3000, 3000);
      }
      if (msg.type === 'weather') {
        const preset = WEATHER_PRESETS[msg.preset];
        if (preset) { currentWeather = { ...preset }; broadcast({ type: 'weather', weather: currentWeather }); }
      }
      if (msg.type === 'chat') {
        const text = String(msg.text || '').trim().slice(0, 200);
        if (text) broadcast({ type: 'chat', id, name: player.pilotName || 'Unknown', text, ts: Date.now() });
      }
      if (msg.type === 'respawn') {
        const { aircraftType, airline, airport, phys, spawn } = player;
        const pname = player.pilotName;
        Object.assign(player, createPlayer(id, aircraftType, {
          yaw: spawn?.yaw || 0,
          x:   spawn?.x   || 0,
          z:   spawn?.z   || 0,
          y: 3, onRunway: true,
        }));
        player.pilotName = pname;
        player.airline = airline; player.airport = airport; player.phys = phys;
        stats.totalFlights++;
        addEvent('spawn', `#${id} Respawn — ${aircraftType.toUpperCase()}`);
      }
    } catch (e) { /* ignore */ }
  });

  ws.on('close', () => {
    const pName = player.pilotName || `#${id}`;
    players.delete(id);
    broadcast({ type: 'playerLeft', id });
    addEvent('leave', `${pName} getrennt`);
  });
});

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(data);
  }
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ============================================================
// GAME LOOP
// ============================================================

setInterval(() => {
  for (const p of players.values()) updatePhysics(p);
  broadcast({ type: 'state', players: getState() });
}, 1000 / TICK_RATE);

// ============================================================
// START — Bind to 0.0.0.0 for public access
// ============================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✈  Flugsim.com Server`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Stats:   http://localhost:${PORT}/stats.html`);
  console.log(`   API:     http://localhost:${PORT}/api/stats`);
  console.log('');

  // Show network IPs
  const nets = require('os').networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`   Network: http://${net.address}:${PORT}`);
      }
    }
  }
  console.log('');
});
