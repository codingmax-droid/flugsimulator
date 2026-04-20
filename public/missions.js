// ============================================================
//   AKTIVE MISSIONEN (MSFS-24-artig)
//   Mission = Briefing (Start → Ziel, Last, Bedingungen) → Flug →
//   Bewertung bei Landung (Genauigkeit, Schonung, Zeit).
// ============================================================

import { AIRPORTS } from './airports.js';
import { AIRCRAFT_SHOP } from './career.js';

// ------------------------------------------------------------
// MISSION-TYPEN
// ------------------------------------------------------------

export const MISSION_TYPES = {
  charter: {
    id: 'charter', label: 'Passagier-Charter', color: '#2a7fff',
    description: 'Privatkunden von A nach B bringen. Weiche Landung erwartet.',
    payloadLabel: 'Pax',
    requiresSmooth: true,
    vsTolerance: 2.5,   // m/s
    rollTolerance: 0.15,
    rateBase: 12,       // €/km × Basis
    xpBase: 80,
  },
  cargo: {
    id: 'cargo', label: 'Fracht', color: '#d0a02d',
    description: 'Fracht zügig ans Ziel. Handling darf robust sein.',
    payloadLabel: 't Fracht',
    requiresSmooth: false,
    vsTolerance: 5,
    rollTolerance: 0.35,
    rateBase: 10,
    xpBase: 70,
  },
  vip: {
    id: 'vip', label: 'VIP-Charter', color: '#b855ff',
    description: 'Sehr hohe Erwartungen: butterweich, pünktlich, diskret.',
    payloadLabel: 'VIP-Pax',
    requiresSmooth: true,
    vsTolerance: 1.5,
    rollTolerance: 0.08,
    rateBase: 28,
    xpBase: 160,
  },
  medevac: {
    id: 'medevac', label: 'Medevac', color: '#ff4b4b',
    description: 'Patient an Bord. Schnell aber sicher — Zeit zählt.',
    payloadLabel: 'Patienten',
    requiresSmooth: true,
    vsTolerance: 3,
    rollTolerance: 0.2,
    rateBase: 22,
    xpBase: 140,
    timeBonus: true,
  },
  sightseeing: {
    id: 'sightseeing', label: 'Sightseeing-Tour', color: '#2dd07e',
    description: 'Rundflug mit Touristen — bei demselben Airport landen.',
    payloadLabel: 'Gäste',
    requiresSmooth: true,
    vsTolerance: 3,
    rollTolerance: 0.3,
    rateBase: 16,
    xpBase: 90,
    roundTrip: true,
  },
};

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

const R_EARTH = 6371; // km
export function haversineKm(a, b) {
  const toRad = (x) => x * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(x));
}

// Grober Range-Filter nach Tier/Typ
const TIER_RANGE = {
  trainer:   300,
  ga:        900,
  bush:      800,
  utility:   1500,
  regional:  2500,
  narrow:    5500,
  wide:      13000,
  freight:   10000,
  vip:       11000,
  super:     15000,
};

function rangeForAircraft(aircraftId) {
  const shop = AIRCRAFT_SHOP[aircraftId];
  if (!shop) return 500;
  return TIER_RANGE[shop.tier] || 1500;
}

function pickWeighted(map) {
  const total = Object.values(map).reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of Object.entries(map)) { r -= w; if (r <= 0) return k; }
  return Object.keys(map)[0];
}

// ------------------------------------------------------------
// MISSION GENERATION
// ------------------------------------------------------------

export function generateMissions(originIcao, state, count = 6) {
  const origin = AIRPORTS.find(a => a.icao === originIcao) || AIRPORTS[0];
  if (!origin) return [];

  // Verfügbare Flotte mit unlocked Aircraft
  const fleet = state.fleet.filter(f => !f.inShop);
  if (fleet.length === 0) return [];

  const missions = [];
  const seenPairs = new Set();
  const attempts = count * 10;

  // Mission-Typen nach Level gewichten
  const stage = state.stage || 1;
  const typeWeights = {
    charter:     stage < 20 ? 3 : 2,
    cargo:       stage < 10 ? 2 : 3,
    sightseeing: stage < 6  ? 3 : 1,
    medevac:     stage < 8  ? 1 : 2,
    vip:         stage < 18 ? 0 : 3,
  };

  for (let tries = 0; tries < attempts && missions.length < count; tries++) {
    const f = fleet[Math.floor(Math.random() * fleet.length)];
    const maxRange = rangeForAircraft(f.id);
    const type = MISSION_TYPES[pickWeighted(typeWeights)];

    // Zielairport: Sightseeing → gleicher Airport
    let dest;
    let distanceKm;
    if (type.roundTrip) {
      dest = origin;
      distanceKm = 40 + Math.random() * 120; // Tour-Länge
    } else {
      const candidates = AIRPORTS.filter(a => a.icao !== origin.icao);
      // wähle gewichtet nach Distanz zu maxRange
      for (let j = 0; j < 8; j++) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        const d = haversineKm(origin, pick);
        if (d >= 80 && d <= maxRange * 0.9) { dest = pick; distanceKm = d; break; }
      }
      if (!dest) continue;
    }

    const pairKey = `${type.id}_${origin.icao}_${dest.icao}_${f.id}`;
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    const shop = AIRCRAFT_SHOP[f.id];
    const payload = estimatePayload(type, shop);
    const payout = Math.round(
      distanceKm * type.rateBase * (1 + (stage.n || 0) * 0)
      * (type.requiresSmooth ? 1.0 : 0.9)
      * (0.85 + Math.random() * 0.3)
    );
    const timeBudgetMin = Math.round(distanceKm / 8 * 60 / 60 + 10);

    missions.push({
      uid: `mis_${Date.now().toString(36)}_${missions.length}_${Math.random().toString(36).slice(2,5)}`,
      type: type.id,
      typeLabel: type.label,
      typeColor: type.color,
      description: type.description,
      originIcao: origin.icao, originName: origin.name, originLat: origin.lat, originLon: origin.lon,
      destIcao: dest.icao, destName: dest.name, destLat: dest.lat, destLon: dest.lon, destElev: dest.elev || 0,
      distanceKm: Math.round(distanceKm),
      timeBudgetMin,
      aircraftId: f.id,
      aircraftUid: f.uid,
      aircraftName: shop?.name || f.id,
      payload,
      payloadLabel: type.payloadLabel,
      payout,
      xpReward: type.xpBase + Math.round(distanceKm * 0.15),
      requiresSmooth: type.requiresSmooth,
      vsTolerance: type.vsTolerance,
      rollTolerance: type.rollTolerance,
      roundTrip: !!type.roundTrip,
      timeBonus: !!type.timeBonus,
      generatedAt: Date.now(),
    });
  }
  return missions;
}

function estimatePayload(type, shop) {
  if (!shop) return type.id === 'cargo' ? 1 : 2;
  const tier = shop.tier;
  if (type.id === 'cargo') {
    const t = { trainer: 0.2, ga: 0.4, bush: 0.7, utility: 2, regional: 6, narrow: 18, wide: 50, freight: 60, vip: 1, super: 90 }[tier] || 3;
    return +t.toFixed(1);
  }
  if (type.id === 'vip') return 2 + Math.floor(Math.random() * 6);
  const pax = { trainer: 1, ga: 3, bush: 5, utility: 8, regional: 60, narrow: 160, wide: 280, freight: 4, vip: 10, super: 500 }[tier] || 4;
  // Sightseeing etwa halbe Kapazität
  return Math.max(1, Math.round(pax * (type.id === 'sightseeing' ? 0.5 : 0.8)));
}

// ------------------------------------------------------------
// SCORING
// ------------------------------------------------------------
//
// Bewertung bei Mission-Abschluss:
//   - correctAirport: am Ziel gelandet
//   - touchdownQuality aus VS/Roll
//   - timeScore gegen timeBudget
//   - noCrash
//
// score 0..1.0 → Payout-Multiplier
//

export function scoreMission(mission, result) {
  const reasons = [];
  if (result.crashed) {
    return { success: false, mult: 0, score: 0, reasons: ['CRASH — Mission fehlgeschlagen'] };
  }
  const onCorrect = result.landedIcao === mission.destIcao
    || (mission.roundTrip && result.landedIcao === mission.originIcao);
  if (!onCorrect) {
    reasons.push(`Falscher Airport: ${result.landedIcao || 'irgendwo'} statt ${mission.destIcao}`);
    return { success: false, mult: 0.1, score: 0.1, reasons };
  }
  let score = 1.0;
  const vs = Math.abs(result.verticalSpeed || 0);
  const roll = Math.abs(result.roll || 0);
  if (vs > mission.vsTolerance) {
    const over = vs - mission.vsTolerance;
    score -= Math.min(0.4, over * 0.08);
    reasons.push(`Hart aufgesetzt (VS ${vs.toFixed(1)} m/s, Tol. ${mission.vsTolerance})`);
  } else {
    reasons.push('Weiche Landung ✓');
  }
  if (roll > mission.rollTolerance) {
    score -= 0.15;
    reasons.push(`Seitliche Landung (Roll ${(roll*57.3).toFixed(0)}°)`);
  }
  if (!result.gear) {
    score -= 0.5;
    reasons.push('Belly-Landing!');
  }
  // Zeit
  if (mission.timeBudgetMin > 0) {
    const overtime = Math.max(0, result.durationMin - mission.timeBudgetMin);
    if (overtime > 0) {
      score -= Math.min(0.25, overtime / mission.timeBudgetMin);
      reasons.push(`Über Zeitbudget (+${overtime.toFixed(0)} min)`);
    } else {
      reasons.push('Im Zeitbudget ✓');
      if (mission.timeBonus) score += Math.min(0.15, -overtime / mission.timeBudgetMin);
    }
  }
  score = Math.max(0.1, Math.min(1.2, score));
  return {
    success: true,
    mult: score,
    score,
    reasons,
  };
}
