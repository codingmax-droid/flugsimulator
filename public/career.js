// ============================================================
// CAREER MODE — 30-Stufen-Progression, Flotte, Aufträge, Economy
// ============================================================
//
// Alles läuft INNERHALB der bestehenden „Karriere"-Kachel. State
// wird pro Pilotname in localStorage gespeichert.

// ------------------------------------------------------------
// FLUGZEUG-KATALOG — User-Preisliste, gruppiert nach Tier
// ------------------------------------------------------------
// flyType: mappt auf existierenden In-Game-Typ für echte Flüge
//          (procedural/GLB). Kleinflugzeuge fallen auf 'a220'
//          zurück, Regional auf 'a320', bis Assets nachgerüstet
//          werden.

export const AIRCRAFT_SHOP = {
  // Einsteiger
  c152:    { name: 'Cessna 152',        price:        60_000, daily:     500, tier: 'trainer',  flyType: 'a220' },
  c172:    { name: 'Cessna 172',        price:       300_000, daily:   1_000, tier: 'trainer',  flyType: 'a220' },
  pa28:    { name: 'Piper PA-28',       price:       250_000, daily:     900, tier: 'trainer',  flyType: 'a220' },
  da40:    { name: 'Diamond DA40',      price:       400_000, daily:   1_200, tier: 'ga',       flyType: 'a220' },
  dhc2:    { name: 'DHC-2 Beaver',      price:     1_200_000, daily:   3_000, tier: 'bush',     flyType: 'a220' },

  // Fortgeschritten
  da42:    { name: 'Diamond DA42',      price:       800_000, daily:   2_500, tier: 'ga',       flyType: 'a220' },
  baron58: { name: 'Beechcraft Baron 58',price:      1_000_000,daily:   3_000, tier: 'ga',       flyType: 'a220' },
  seneca5: { name: 'Piper Seneca V',    price:       900_000, daily:   2_800, tier: 'ga',       flyType: 'a220' },
  c208:    { name: 'Cessna 208 Caravan',price:     2_500_000, daily:   6_000, tier: 'utility',  flyType: 'a220' },
  pc12:    { name: 'Pilatus PC-12',     price:     5_000_000, daily:  10_000, tier: 'utility',  flyType: 'a220' },

  // Regional
  atr72:   { name: 'ATR 72',            price:    25_000_000, daily:  60_000, tier: 'regional', flyType: 'a220' },
  dash8:   { name: 'Dash 8 Q400',       price:    30_000_000, daily:  70_000, tier: 'regional', flyType: 'a220' },
  e175:    { name: 'Embraer E175',      price:    50_000_000, daily: 120_000, tier: 'regional', flyType: 'a220' },
  crj900:  { name: 'Bombardier CRJ900', price:    45_000_000, daily: 110_000, tier: 'regional', flyType: 'a220' },
  a220:    { name: 'Airbus A220',       price:    80_000_000, daily: 200_000, tier: 'narrow',   flyType: 'a220' },

  // Narrowbody
  a320:    { name: 'Airbus A320',       price:   100_000_000, daily: 250_000, tier: 'narrow',   flyType: 'a320' },
  b737:    { name: 'Boeing 737-800',    price:    90_000_000, daily: 230_000, tier: 'narrow',   flyType: 'b737' },
  a321:    { name: 'Airbus A321',       price:   130_000_000, daily: 300_000, tier: 'narrow',   flyType: 'a321' },
  b739:    { name: 'Boeing 737-900ER',  price:   110_000_000, daily: 270_000, tier: 'narrow',   flyType: 'b737' },
  a320neo: { name: 'Airbus A320neo',    price:   115_000_000, daily: 280_000, tier: 'narrow',   flyType: 'a320' },
  b737m:   { name: 'Boeing 737 MAX 8',  price:   120_000_000, daily: 290_000, tier: 'narrow',   flyType: 'b737' },
  a321neo: { name: 'Airbus A321neo',    price:   145_000_000, daily: 320_000, tier: 'narrow',   flyType: 'a321' },

  // Widebody / Fracht
  b767f:   { name: 'Boeing 767F',       price:   200_000_000, daily: 400_000, tier: 'freight',  flyType: 'a330' },
  b787:    { name: 'Boeing 787',        price:   250_000_000, daily: 500_000, tier: 'wide',     flyType: 'b787' },
  a330:    { name: 'Airbus A330',       price:   240_000_000, daily: 480_000, tier: 'wide',     flyType: 'a330' },
  b777:    { name: 'Boeing 777',        price:   350_000_000, daily: 700_000, tier: 'wide',     flyType: 'b777' },
  a350:    { name: 'Airbus A350',       price:   320_000_000, daily: 650_000, tier: 'wide',     flyType: 'a350' },
  b777x:   { name: 'Boeing 777X',       price:   400_000_000, daily: 800_000, tier: 'wide',     flyType: 'b777' },

  // VIP
  g650:    { name: 'Gulfstream G650',   price:    75_000_000, daily: 180_000, tier: 'vip',      flyType: 'a220' },

  // Super-Jumbo
  a380:    { name: 'Airbus A380',       price:   450_000_000, daily: 900_000, tier: 'super',    flyType: 'a380' },
  b7478:   { name: 'Boeing 747-8',      price:   420_000_000, daily: 850_000, tier: 'super',    flyType: 'b747' },
};

// ------------------------------------------------------------
// 30 KARRIERE-STUFEN
// ------------------------------------------------------------
// req: Schwellen für Auto-Promote (alles muss erfüllt sein)
// unlocks: Flugzeuge, die im Shop freigeschaltet werden
// incomeMult: globaler Multiplikator auf Flug-Einnahmen
// perks: Freitext-Boni für die UI

export const CAREER_STAGES = [
  { n:1,  title:'Flugschüler',          desc:'Erste Flugstunden unter Aufsicht.',      req:{hours:0,   money:0,            rep:0  }, unlocks:['c152'],                    incomeMult:0.8, perks:['Platzrunden bezahlt'] },
  { n:2,  title:'Solo-Flugschüler',     desc:'Allein um den Platz, nur VFR.',          req:{hours:5,   money:15_000,       rep:5  }, unlocks:['c172'],                    incomeMult:0.9, perks:['Kurzstrecken VFR'] },
  { n:3,  title:'Privatpilot',          desc:'PPL erworben — Freunde mitnehmen.',      req:{hours:25,  money:60_000,       rep:10 }, unlocks:['pa28'],                    incomeMult:1.0, perks:['Tagescharter bis 300 km'] },
  { n:4,  title:'Charter-Anfänger',     desc:'Erste bezahlte Charterflüge.',           req:{hours:60,  money:200_000,      rep:15 }, unlocks:['da40'],                    incomeMult:1.05,perks:['Kundenreferenzen sammeln'] },
  { n:5,  title:'Buschpilot',           desc:'Unimproved Strips, Wetteraugen.',        req:{hours:120, money:500_000,      rep:25 }, unlocks:['dhc2'],                    incomeMult:1.1, perks:['Fracht-Prämie +10 %'] },
  { n:6,  title:'Nachtflug',            desc:'Night-Rating in der Tasche.',            req:{hours:180, money:750_000,      rep:30 }, unlocks:[],                          incomeMult:1.15,perks:['Nachtaufschlag auf Aufträge'] },
  { n:7,  title:'IFR-Pilot',            desc:'Instrumentenflug zertifiziert.',         req:{hours:260, money:1_200_000,    rep:35 }, unlocks:['da42'],                    incomeMult:1.2, perks:['Wetter-Immunität bei Einnahmen'] },
  { n:8,  title:'Charterpilot',         desc:'Feste Charteraufträge, Stammkunden.',    req:{hours:360, money:2_500_000,    rep:40 }, unlocks:['baron58'],                 incomeMult:1.25,perks:['Reputationsgewinn ×1.2'] },
  { n:9,  title:'Multi-Engine',         desc:'Class Rating Multi-Engine.',             req:{hours:480, money:4_000_000,    rep:45 }, unlocks:['seneca5'],                 incomeMult:1.3, perks:['Zweimot-Chartern freigeschaltet'] },
  { n:10, title:'Fracht klein',         desc:'Express-Fracht in der Region.',          req:{hours:620, money:6_000_000,    rep:50 }, unlocks:['c208'],                    incomeMult:1.4, perks:['Fracht +25 % Tagesertrag'] },
  { n:11, title:'Co-Pilot Regional',    desc:'Rechter Sitz in der Turboprop.',         req:{hours:800, money:10_000_000,   rep:55 }, unlocks:['atr72','dash8'],           incomeMult:1.5, perks:['Airline-Gehalt geht ein'] },
  { n:12, title:'Co-Pilot Jet',         desc:'First Officer auf Regional-Jet.',        req:{hours:1000,money:18_000_000,   rep:60 }, unlocks:['e175','crj900'],           incomeMult:1.6, perks:['Jet-Tagegelder'] },
  { n:13, title:'Linienpilot',          desc:'Type Rating A320/737 bestanden.',        req:{hours:1300,money:30_000_000,   rep:65 }, unlocks:['a320','b737'],             incomeMult:1.8, perks:['Linien-Premium'] },
  { n:14, title:'Mittelstrecke',        desc:'Sektoren 2–5 h Standard.',               req:{hours:1700,money:55_000_000,   rep:70 }, unlocks:['a321','b739'],             incomeMult:1.95,perks:['Stretch-Varianten freigeschaltet'] },
  { n:15, title:'Kapitän',              desc:'Linker Sitz, A320 Command.',             req:{hours:2100,money:80_000_000,   rep:75 }, unlocks:[],                          incomeMult:2.1, perks:['Kapitäns-Gehalt +40 %'] },
  { n:16, title:'Kapitän erweitert',    desc:'Größere Narrowbody-Flotte.',             req:{hours:2600,money:120_000_000,  rep:78 }, unlocks:['a320neo','b737m'],         incomeMult:2.2, perks:['Moderne Flotte, -10 % Fuel'] },
  { n:17, title:'Fracht groß',          desc:'Widebody-Fracht interkontinental.',      req:{hours:3100,money:180_000_000,  rep:80 }, unlocks:['b767f'],                   incomeMult:2.4, perks:['Nachtfracht-Netz'] },
  { n:18, title:'Langstrecke',          desc:'Widebody-Line-Captain.',                 req:{hours:3700,money:260_000_000,  rep:82 }, unlocks:['b787','a330'],             incomeMult:2.6, perks:['Langstrecken-Ausdauer +20 %'] },
  { n:19, title:'Senior Kapitän',       desc:'Top-Linienrouten, Ausbildungspilot.',    req:{hours:4400,money:360_000_000,  rep:85 }, unlocks:['b777'],                    incomeMult:2.8, perks:['Ruf steigt doppelt so schnell'] },
  { n:20, title:'VIP Pilot',            desc:'Diskreter Business-Jet Charter.',        req:{hours:5200,money:480_000_000,  rep:88 }, unlocks:['g650'],                    incomeMult:3.0, perks:['VIP-Aufschlag auf Charter'] },
  { n:21, title:'Unternehmer',          desc:'Erste eigene Charterfirma gegründet.',   req:{hours:5600,money:600_000_000,  rep:90 }, unlocks:['c208'],                    incomeMult:3.1, perks:['Firmenkonto: passive Aufträge'] },
  { n:22, title:'Charterfirma',         desc:'Feste Kundenbasis, kleine Flotte.',      req:{hours:6000,money:800_000_000,  rep:91 }, unlocks:['pc12'],                    incomeMult:3.2, perks:['Stamm-Kundschaft ×1.15'] },
  { n:23, title:'Flottenaufbau',        desc:'Turboprops im Regionalbetrieb.',         req:{hours:6400,money:1_100_000_000,rep:92 }, unlocks:['atr72','dash8'],           incomeMult:3.35,perks:['Regional-Routen passiv aktiv'] },
  { n:24, title:'Mitarbeiter einstellen',desc:'Erste Co-Piloten & Crews angestellt.',  req:{hours:6800,money:1_500_000_000,rep:93 }, unlocks:[],                          incomeMult:3.5, perks:['Crew zahlt sich durch Routen aus'] },
  { n:25, title:'Regionale Airline',    desc:'Eigene Regional-Marke mit Jets.',        req:{hours:7200,money:2_000_000_000,rep:94 }, unlocks:['e175','crj900'],           incomeMult:3.7, perks:['Liniennetz Stufe 1'] },
  { n:26, title:'Netzwerk',             desc:'Hub-and-Spoke über 20 Stationen.',       req:{hours:7700,money:2_700_000_000,rep:95 }, unlocks:['a220'],                    incomeMult:3.9, perks:['Feeder-Liniennetz'] },
  { n:27, title:'Internationale Airline',desc:'Neos & MAX auf Europa/Middle East.',    req:{hours:8300,money:3_500_000_000,rep:96 }, unlocks:['a320neo','b737m'],         incomeMult:4.1, perks:['Internationales Netzwerk'] },
  { n:28, title:'Große Flotte',         desc:'Dutzende Narrowbody + erste Widebodies.',req:{hours:8900,money:4_500_000_000,rep:97 }, unlocks:['a321neo','b787'],          incomeMult:4.3, perks:['Flottenrabatt -10 %'] },
  { n:29, title:'Premium Airline',      desc:'Langstrecken-Luxus, globale Marke.',     req:{hours:9600,money:5_800_000_000,rep:98 }, unlocks:['a350','b777x'],            incomeMult:4.6, perks:['Premium-Kunden ×1.25'] },
  { n:30, title:'Airline Tycoon',       desc:'Super-Jumbos, weltweiter Konzern.',      req:{hours:10500,money:7_500_000_000,rep:99}, unlocks:['a380','b7478'],            incomeMult:5.0, perks:['Imperium erreicht'] },
];

// ------------------------------------------------------------
// SKILL-TREE LAYOUT (MSFS-style)
// ------------------------------------------------------------
// x,y in SVG-viewBox 0..2000, 0..1000

export const CAREER_LAYOUT = {
  1:  [100, 500],   // Flugschüler — Startknoten mitte-links
  2:  [220, 500],
  3:  [340, 500],
  4:  [460, 400],
  5:  [460, 600],
  6:  [580, 330],
  7:  [580, 470],
  8:  [700, 360],
  9:  [700, 500],
  10: [700, 640],
  11: [820, 500],
  12: [940, 500],
  13: [1060, 500],
  14: [1180, 420],
  15: [1180, 580],
  16: [1300, 420],
  17: [1300, 580],
  18: [1300, 700],
  19: [1420, 440],
  20: [1420, 620],
  21: [1540, 680],
  22: [1540, 780],
  23: [1660, 720],
  24: [1660, 830],
  25: [1540, 540],
  26: [1660, 480],
  27: [1780, 420],
  28: [1880, 360],
  29: [1940, 290],
  30: [2000, 220],
};

export const CAREER_EDGES = [
  [1,2],[2,3],[3,4],[3,5],
  [4,6],[4,7],[5,7],
  [6,8],[7,8],[7,9],[5,10],[9,10],
  [8,11],[9,11],[10,11],
  [11,12],[12,13],
  [13,14],[13,15],
  [14,16],[15,16],
  [16,17],[16,18],
  [17,19],[18,19],
  [19,20],[19,21],
  [21,22],[22,23],[23,24],
  [24,25],[19,25],
  [25,26],[26,27],[27,28],
  [28,29],[29,30],
];

// ------------------------------------------------------------
// STATE
// ------------------------------------------------------------

const DEFAULT_STATE = () => ({
  stage: 1,
  money: 5_000,             // Startkapital
  reputation: 50,           // 0..100
  flightHours: 0,
  totalFlights: 0,
  totalDistanceKm: 0,
  crashes: 0,
  fleet: [{ uid: 'starter_c152', id: 'c152', wear: 0, inShop: false }],
  crewHired: 0,
  passiveJobs: [],          // aktive passive Aufträge
  jobOffers: [],            // angebotene Aufträge
  completedJobs: 0,
  lastDailyTick: Date.now(),
  history: [],
  createdAt: Date.now(),
});

export function careerStorageKey(pilotName) {
  return `flugsim_career_${pilotName || 'guest'}`;
}

export function loadCareer(pilotName) {
  try {
    const raw = localStorage.getItem(careerStorageKey(pilotName));
    if (!raw) return DEFAULT_STATE();
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE(), ...parsed };
  } catch {
    return DEFAULT_STATE();
  }
}

export function saveCareer(pilotName, state) {
  try { localStorage.setItem(careerStorageKey(pilotName), JSON.stringify(state)); }
  catch { /* Quota überschritten — ignorieren */ }
}

// ------------------------------------------------------------
// PROGRESSION / PROMOTION
// ------------------------------------------------------------

export function currentStage(state) {
  return CAREER_STAGES[state.stage - 1] || CAREER_STAGES[0];
}

export function nextStage(state) {
  return CAREER_STAGES[state.stage] || null; // state.stage ist 1-based → nextStage[state.stage] ist Index n
}

export function isAircraftUnlocked(state, aircraftId) {
  for (let i = 0; i < state.stage; i++) {
    if (CAREER_STAGES[i].unlocks.includes(aircraftId)) return true;
  }
  return false;
}

export function allUnlockedAircraft(state) {
  const set = new Set();
  for (let i = 0; i < state.stage; i++) {
    for (const id of CAREER_STAGES[i].unlocks) set.add(id);
  }
  return set;
}

export function checkPromotion(state) {
  const next = nextStage(state);
  if (!next) return null;
  const { hours, money, rep } = next.req;
  if (state.flightHours >= hours && state.money >= money && state.reputation >= rep) {
    state.stage += 1;
    state.history.push({ type: 'promotion', stage: state.stage, at: Date.now() });
    return CAREER_STAGES[state.stage - 1];
  }
  return null;
}

// ------------------------------------------------------------
// FLOTTE / SHOP
// ------------------------------------------------------------

export function buyAircraft(state, id) {
  const ac = AIRCRAFT_SHOP[id];
  if (!ac) return { ok: false, reason: 'Unbekanntes Flugzeug' };
  if (!isAircraftUnlocked(state, id)) return { ok: false, reason: 'Noch gesperrt' };
  if (state.money < ac.price) return { ok: false, reason: 'Zu wenig Kapital' };
  state.money -= ac.price;
  const uid = `${id}_${Math.random().toString(36).slice(2, 8)}`;
  state.fleet.push({ uid, id, wear: 0, inShop: false });
  state.history.push({ type: 'buy', id, at: Date.now(), price: ac.price });
  return { ok: true, uid };
}

export function sellAircraft(state, uid) {
  const idx = state.fleet.findIndex(a => a.uid === uid);
  if (idx < 0) return { ok: false };
  const ac = state.fleet[idx];
  const shop = AIRCRAFT_SHOP[ac.id];
  if (!shop) return { ok: false };
  // Rückkauf 60 % minus Wear
  const refund = Math.round(shop.price * 0.6 * (1 - Math.min(0.5, ac.wear)));
  state.money += refund;
  state.fleet.splice(idx, 1);
  state.history.push({ type: 'sell', id: ac.id, at: Date.now(), refund });
  return { ok: true, refund };
}

export function repairAircraft(state, uid) {
  const ac = state.fleet.find(a => a.uid === uid);
  if (!ac) return { ok: false };
  const shop = AIRCRAFT_SHOP[ac.id];
  if (!shop) return { ok: false };
  const cost = Math.round(shop.price * 0.05 * ac.wear);
  if (state.money < cost) return { ok: false, reason: 'Zu wenig Kapital' };
  state.money -= cost;
  ac.wear = 0;
  ac.inShop = false;
  return { ok: true, cost };
}

// ------------------------------------------------------------
// FLUG-ABSCHLUSS → Gutschrift
// ------------------------------------------------------------
// landing: { crashed: bool, verticalSpeed: m/s, roll: rad, gear: bool }
// Rückgabe: { money, hours, rep, promoted? }

export function creditFlight(state, { distanceKm, durationMin, aircraftId, landing }) {
  const stage = currentStage(state);
  const shop = AIRCRAFT_SHOP[aircraftId] || AIRCRAFT_SHOP.c152;
  state.totalFlights += 1;
  state.flightHours += durationMin / 60;
  state.totalDistanceKm += distanceKm;

  // Wear auf das konkrete Gerät (erstes passendes)
  const f = state.fleet.find(a => a.id === aircraftId);
  if (f) f.wear = Math.min(1, (f.wear || 0) + durationMin / 600);

  // Reputation anhand Landing Quality
  let repDelta = 0;
  let moneyMult = 1;
  if (landing?.crashed) {
    repDelta = -10;
    state.crashes += 1;
    // Crash-Cost: Reparatur fix
    const crashCost = Math.round(shop.price * 0.15);
    state.money = Math.max(0, state.money - crashCost);
    state.history.push({ type: 'crash', at: Date.now(), aircraftId, cost: crashCost });
  } else {
    const vs = Math.abs(landing?.verticalSpeed || 0);
    const roll = Math.abs(landing?.roll || 0);
    if (vs < 1.5 && roll < 0.1)   repDelta = 3;
    else if (vs < 3 && roll < 0.2) repDelta = 1;
    else if (vs < 5)               repDelta = 0;
    else                            repDelta = -2;
    if (!landing?.gear)             repDelta -= 4; // Belly-Landing
    moneyMult = 1 + Math.max(0, repDelta) * 0.05;
  }
  // Level-20-Bonus auf Reputation
  if (state.stage >= 19) repDelta = Math.round(repDelta * 2);
  state.reputation = Math.max(0, Math.min(100, state.reputation + repDelta));

  // Einnahmen
  let payout = 0;
  if (!landing?.crashed) {
    const base = 25 * distanceKm + 8 * durationMin;
    payout = Math.round(base * stage.incomeMult * moneyMult * (0.8 + state.reputation / 250));
    state.money += payout;
    state.history.push({ type: 'flight', at: Date.now(), aircraftId, distanceKm, payout, repDelta });
  }

  const promoted = checkPromotion(state);
  return { payout, hours: durationMin / 60, repDelta, promoted };
}

// ------------------------------------------------------------
// DAILY TICK — läuft unabhängig (1 real = 1 sim day bei 60s Compression)
// ------------------------------------------------------------
// Zieht Tageskosten ab, addiert passive Job-Einnahmen.

const DAILY_TICK_MS = 60_000; // 60 s echt = 1 sim-Tag

export function runDailyTick(state) {
  const now = Date.now();
  const elapsed = now - (state.lastDailyTick || now);
  const days = Math.floor(elapsed / DAILY_TICK_MS);
  if (days <= 0) return { days: 0 };
  state.lastDailyTick = (state.lastDailyTick || now) + days * DAILY_TICK_MS;

  let totalCost = 0;
  let totalIncome = 0;

  for (let i = 0; i < days; i++) {
    // Tageskosten Flotte
    for (const f of state.fleet) {
      const shop = AIRCRAFT_SHOP[f.id];
      if (!shop) continue;
      // AOG (wear >= 1): halbe Kosten, kein passives Einkommen
      const factor = f.wear >= 1 ? 0.5 : 1;
      if (f.wear >= 1) f.inShop = true;
      totalCost += shop.daily * factor;

      // Passives Einkommen pro gewähltem Flugzeug (ab Stufe 11)
      if (state.stage >= 11 && !f.inShop) {
        const stage = currentStage(state);
        // Widebodies skalieren stärker mit Reputation
        const tierMult = { trainer:0.3, ga:0.5, bush:0.6, utility:0.7,
                           regional:1.0, narrow:1.3, wide:1.7, freight:1.5,
                           vip:2.0, super:2.3 }[shop.tier] || 1;
        const income = shop.daily * 0.85 * tierMult * (state.reputation / 50) * stage.incomeMult;
        totalIncome += income;
        // Wear leicht ansteigend
        f.wear = Math.min(1, f.wear + 0.004);
      }
    }

    // Crew-Kosten ab Stufe 24
    if (state.stage >= 24) {
      totalCost += state.crewHired * 1200;
      // Crew erhöht Einkommen um +10 % je Crew, max +50 %
      const crewBoost = Math.min(0.5, state.crewHired * 0.1);
      totalIncome += totalIncome * crewBoost - totalIncome * (crewBoost - crewBoost);
    }
  }

  state.money += Math.round(totalIncome - totalCost);
  if (state.money < 0) {
    // Insolvenzschutz: Flotte zwangsverkaufen bis Cash wieder positiv
    state.history.push({ type: 'bankruptcy_warning', at: now });
    while (state.money < 0 && state.fleet.length > 1) {
      const f = state.fleet[state.fleet.length - 1];
      sellAircraft(state, f.uid);
    }
    state.money = Math.max(0, state.money);
  }

  checkPromotion(state);
  return { days, cost: totalCost, income: totalIncome };
}

// ------------------------------------------------------------
// PASSIVE JOB OFFERS — generiert sich aus Flotte
// ------------------------------------------------------------

const JOB_TYPES = [
  { type: 'passenger', label: 'Passagier',  rate: 1.0 },
  { type: 'cargo',     label: 'Fracht',     rate: 1.2 },
  { type: 'luxury',    label: 'Luxus/VIP', rate: 1.8 },
];

export function generateJobOffers(state, count = 4) {
  state.jobOffers = [];
  const unlockedShopIds = [...allUnlockedAircraft(state)];
  if (unlockedShopIds.length === 0) unlockedShopIds.push('c152');
  for (let i = 0; i < count; i++) {
    const acId = unlockedShopIds[Math.floor(Math.random() * unlockedShopIds.length)];
    const shop = AIRCRAFT_SHOP[acId];
    if (!shop) continue;
    const jt = JOB_TYPES[Math.floor(Math.random() * JOB_TYPES.length)];
    const days = 3 + Math.floor(Math.random() * 10);
    const dailyPayout = Math.round(shop.daily * (0.7 + Math.random() * 0.9) * jt.rate);
    state.jobOffers.push({
      uid: `job_${Date.now().toString(36)}_${i}`,
      aircraftId: acId,
      aircraftName: shop.name,
      type: jt.type,
      typeLabel: jt.label,
      days,
      dailyPayout,
      totalPayout: dailyPayout * days,
      generatedAt: Date.now(),
    });
  }
  return state.jobOffers;
}

export function acceptJob(state, uid) {
  const idx = state.jobOffers.findIndex(j => j.uid === uid);
  if (idx < 0) return { ok: false, reason: 'Auftrag nicht mehr verfügbar' };
  const job = state.jobOffers[idx];
  // Prüfen: passendes Flugzeug in der Flotte
  const hasFleet = state.fleet.some(f => f.id === job.aircraftId && !f.inShop);
  if (!hasFleet) return { ok: false, reason: `Kein einsatzbereites ${job.aircraftName} in deiner Flotte` };
  state.jobOffers.splice(idx, 1);
  state.passiveJobs.push({
    ...job,
    startedAt: Date.now(),
    endsAt: Date.now() + job.days * DAILY_TICK_MS,
  });
  return { ok: true };
}

export function tickPassiveJobs(state) {
  const now = Date.now();
  const completed = state.passiveJobs.filter(j => now >= j.endsAt);
  for (const j of completed) {
    state.money += Math.round(j.totalPayout * 0.4);  // 60 % wurden bereits via runDailyTick ausgezahlt
    state.reputation = Math.min(100, state.reputation + 1);
    state.completedJobs += 1;
    state.history.push({ type: 'job_done', at: now, uid: j.uid, payout: j.totalPayout });
  }
  state.passiveJobs = state.passiveJobs.filter(j => now < j.endsAt);
}

// ------------------------------------------------------------
// CREW
// ------------------------------------------------------------

export function hireCrew(state) {
  if (state.stage < 24) return { ok: false, reason: 'Erst ab Stufe 24' };
  const cost = 50_000;
  if (state.money < cost) return { ok: false, reason: 'Zu wenig Kapital' };
  state.money -= cost;
  state.crewHired += 1;
  return { ok: true };
}

export function fireCrew(state) {
  if (state.crewHired <= 0) return { ok: false };
  state.crewHired -= 1;
  return { ok: true };
}

// ------------------------------------------------------------
// FORMATTER
// ------------------------------------------------------------

export function fmtMoney(v) {
  if (v >= 1_000_000_000) return `€${(v / 1_000_000_000).toFixed(2)} Mrd`;
  if (v >= 1_000_000)     return `€${(v / 1_000_000).toFixed(2)} Mio`;
  if (v >= 1_000)         return `€${(v / 1_000).toFixed(1)} k`;
  return `€${Math.round(v)}`;
}

export function fmtHours(h) {
  if (h < 1) return `${(h * 60).toFixed(0)} min`;
  return `${h.toFixed(1)} h`;
}
