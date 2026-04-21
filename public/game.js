import * as THREE from 'three';
import { TerrainManager } from './terrain.js';
import { buildAirportScene } from './airports3d.js';
import { createAircraftForType, createProceduralAirplane, AircraftPreview, createGLBInstance, applyLiveryToGLB } from './airplane.js?v=7';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AIRCRAFT_TYPES, AIRLINES, getAirlinesForAircraft, getLivery } from './airlines.js';
import { AIRPORTS, searchAirports } from './airports.js';
import { Cockpit } from './cockpit.js';
import { GamepadManager } from './gamepad.js';
import * as Career from './career.js?v=11';
import * as Missions from './missions.js?v=1';

// ============================================================
// STATE
// ============================================================

let scene, camera, renderer, sun;
let terrainManager = null;
let myId = null, ws = null;
let latestState = [], myState = null;
let gameStarted = false, paused = false;
let cockpitOpen = false;
let cockpit = null;
let preview = null;
let previewAnimId = null;
const playerMeshes = new Map();
const gamepadMgr = new GamepadManager();

let pilotName = localStorage.getItem('flugsim_pilot') || '';
let selectedAirport = AIRPORTS[0]; // EDDF default
let selectedAircraft = 'a320';
let selectedAirline = 'lufthansa';
let selectedWeather = 'fewClouds';

const settings = { terrainZoom: 11, terrainRadius: 3, shadows: true, units: 'metric' };

// ============================================================
// MARKETPLACE — Premium Aircraft
// ============================================================
// Items werden vom Server gespiegelt (Preis in Cent, Label, aircraftId).
// Lokaler Fallback sorgt für konsistente UI, wenn /api/market/items
// noch nicht geantwortet hat.

let MARKETPLACE_ITEMS = {
  b747: { price: 2.99, priceCents: 299, label: 'Boeing 747-400' },
  a380: { price: 2.99, priceCents: 299, label: 'Airbus A380' },
  b777: { price: 4.99, priceCents: 499, label: 'Boeing 777-300ER' },
  a350: { price: 4.99, priceCents: 499, label: 'Airbus A350-900' },
};
let marketStripeEnabled = false;

function ownedKey() {
  return `flugsim_owned_${localStorage.getItem('flugsim_access_user') || 'guest'}`;
}
function loadOwnedAircraftLocal() {
  try { return new Set(JSON.parse(localStorage.getItem(ownedKey()) || '[]')); }
  catch { return new Set(); }
}
function saveOwnedAircraftLocal() {
  localStorage.setItem(ownedKey(), JSON.stringify([...ownedAircraft]));
}
function loadOwnedAircraft() { return loadOwnedAircraftLocal(); }
function saveOwnedAircraft() { saveOwnedAircraftLocal(); }
let ownedAircraft = loadOwnedAircraftLocal();

function marketAuthBody() {
  return {
    username: localStorage.getItem('flugsim_access_user') || '',
    deviceId: localStorage.getItem('flugsim_device_id') || '',
  };
}

async function refreshMarketState() {
  const { username, deviceId } = marketAuthBody();
  const qs = new URLSearchParams({ username, deviceId }).toString();
  try {
    const r = await fetch('/api/market/items?' + qs);
    const j = await r.json();
    if (!j.ok) return;
    const next = {};
    for (const it of j.items) {
      next[it.id] = {
        priceCents: it.priceCents,
        price: it.priceCents / 100,
        label: it.label,
        aircraftId: it.aircraftId,
      };
    }
    MARKETPLACE_ITEMS = next;
    marketStripeEnabled = !!j.stripeEnabled;
    ownedAircraft = new Set(j.owned || []);
    saveOwnedAircraftLocal();
    if (typeof updateMarketButtons === 'function') updateMarketButtons();
    if (typeof buildAircraftPanel === 'function' && document.getElementById('panel-aircraft')?.classList.contains('active')) {
      buildAircraftPanel();
    }
  } catch { /* offline — localStorage-Fallback bleibt */ }
}

async function maybeHandleCheckoutReturn() {
  const p = new URLSearchParams(location.search);
  const status = p.get('checkout');
  if (!status) return;
  const sid = p.get('session_id');
  // URL sofort bereinigen (auch bei cancel)
  history.replaceState({}, '', location.pathname);
  if (status !== 'success' || !sid) {
    if (status === 'cancel') showToast('Zahlung abgebrochen');
    return;
  }
  const { username, deviceId } = marketAuthBody();
  if (!username || !deviceId) return;
  try {
    const qs = new URLSearchParams({ username, deviceId, session_id: sid }).toString();
    const r = await fetch('/api/market/confirm?' + qs);
    const j = await r.json();
    if (j.ok && j.paid) {
      ownedAircraft = new Set(j.owned || []);
      saveOwnedAircraftLocal();
      if (typeof updateMarketButtons === 'function') updateMarketButtons();
      showToast('Kauf erfolgreich — Flugzeug freigeschaltet', 'ok');
    } else {
      showToast('Zahlung nicht bestätigt', 'err');
    }
  } catch {
    showToast('Server nicht erreichbar', 'err');
  }
}

// ============================================================
// CAREER
// ============================================================

let careerState = Career.loadCareer(pilotName);
let careerTick = null;
let flightRecord = null; // { startTime, startX, startZ, aircraftId, hoursAtStart }
let careerFlightActive = false; // true, wenn Flug aus der Karriere gestartet wurde
let careerFlightFleetId = null; // Career-Aircraft-ID für Flight-Credit

function saveCareerNow() { Career.saveCareer(pilotName, careerState); }

function openCareer() {
  renderCareer();
  document.getElementById('career-screen').classList.remove('hidden');
  if (!careerTick) {
    careerTick = setInterval(() => {
      Career.runDailyTick(careerState);
      Career.tickPassiveJobs(careerState);
      saveCareerNow();
      renderCareer();
    }, 1000);
  }
}
function closeCareer() {
  document.getElementById('career-screen').classList.add('hidden');
  if (careerTick) { clearInterval(careerTick); careerTick = null; }
}

function showToast(text, cls = '') {
  const el = document.createElement('div');
  el.className = `c-toast ${cls}`;
  el.textContent = text;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 320);
  }, 3200);
}

function renderCareer() {
  const s = careerState;
  const stage = Career.currentStage(s);
  const next = Career.nextStage(s);
  document.getElementById('career-stage-title').textContent = stage.title;
  document.getElementById('career-stage-sub').textContent = `Stufe ${stage.n} / 30`;
  document.getElementById('career-money').textContent = Career.fmtMoney(s.money);
  document.getElementById('career-rep').textContent = s.reputation.toFixed(0);
  document.getElementById('career-hours').textContent = Career.fmtHours(s.flightHours);

  if (next) {
    document.getElementById('career-next-label').textContent = 'NÄCHSTE STUFE';
    document.getElementById('career-next-name').textContent = next.title;
    const pH = Math.min(1, s.flightHours / Math.max(1, next.req.hours));
    const pM = Math.min(1, s.money / Math.max(1, next.req.money));
    const pR = Math.min(1, s.reputation / Math.max(1, next.req.rep));
    document.getElementById('cpb-hours').style.width = `${pH * 100}%`;
    document.getElementById('cpb-money').style.width = `${pM * 100}%`;
    document.getElementById('cpb-rep').style.width = `${pR * 100}%`;
    document.getElementById('cpb-hours-txt').textContent = `${Career.fmtHours(s.flightHours)} / ${Career.fmtHours(next.req.hours)}`;
    document.getElementById('cpb-money-txt').textContent = `${Career.fmtMoney(s.money)} / ${Career.fmtMoney(next.req.money)}`;
    document.getElementById('cpb-rep-txt').textContent = `${s.reputation.toFixed(0)} / ${next.req.rep}`;
  } else {
    document.getElementById('career-next-label').textContent = 'STATUS';
    document.getElementById('career-next-name').textContent = 'ENDGAME ERREICHT';
    for (const id of ['cpb-hours','cpb-money','cpb-rep']) document.getElementById(id).style.width = '100%';
    document.getElementById('cpb-hours-txt').textContent = '—';
    document.getElementById('cpb-money-txt').textContent = '—';
    document.getElementById('cpb-rep-txt').textContent = '—';
  }

  renderHqPanel();
  renderStagesPanel();
  renderFleetPanel();
  renderShopPanel();
  renderJobsPanel();
  renderOpsPanel();
}

let _hqPreview = null;
let _hqAnimId = null;
let _hqBuilt = false;
let _hqLastFlagshipId = null;

function renderHqPanel() {
  const panel = document.getElementById('c-panel-hq');
  const s = careerState;
  const stage = Career.currentStage(s);
  const next = Career.nextStage(s);

  const flagship = s.fleet[s.fleet.length - 1];
  const flagshipShop = flagship ? Career.AIRCRAFT_SHOP[flagship.id] : null;
  const flagshipName = flagshipShop ? flagshipShop.name : '—';

  const xp = Math.round(s.flightHours * 60);
  const xpNext = next ? Math.round(next.req.hours * 60) : Math.max(xp, 1);
  const xpPct = next ? Math.min(100, (xp / xpNext) * 100) : 100;
  const repPct = Math.min(100, s.reputation);

  if (!_hqBuilt) {
    panel.innerHTML = `
      <div class="c-hq">
        <div class="c-hq-top">
          <div class="c-hq-left">
            <div class="c-hq-subtitle">CAREER MODE</div>
            <div class="c-hq-h1">HAUPTQUARTIER</div>
          </div>
          <div class="c-hq-right">
            <div class="c-hq-stage-big" id="c-hq-st">St. 01</div>
            <div class="c-hq-stage-label" id="c-hq-stitle">—</div>
          </div>
        </div>
        <div class="c-hq-hero">
          <div class="c-hq-hero-canvas" id="c-hq-canvas"></div>
          <div class="c-hq-hero-bg"></div>
          <div class="c-hq-hero-grad"></div>
          <div class="c-hq-hero-bars">
            <div class="c-hq-bar">
              <div class="c-hq-bar-top"><span id="c-hq-xp-label">EXP</span><span class="c-hq-bar-val" id="c-hq-xp-val">0 / 0 xp</span></div>
              <div class="c-hq-bar-track"><div class="c-hq-bar-fill" id="c-hq-xp-fill"></div></div>
            </div>
            <div class="c-hq-bar rep">
              <div class="c-hq-bar-top"><span>REPUTATIONSSTUFE</span><span class="c-hq-bar-val" id="c-hq-rep-val">0 / 100</span></div>
              <div class="c-hq-bar-track"><div class="c-hq-bar-fill" id="c-hq-rep-fill"></div></div>
            </div>
          </div>
        </div>
        <div class="c-hq-tiles" id="c-hq-tiles"></div>
      </div>
    `;
    panel.addEventListener('click', (e) => {
      const tile = e.target.closest('.c-hq-tile');
      if (!tile) return;
      const goto = tile.dataset.goto;
      document.querySelectorAll('.c-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.c-panel').forEach(p => p.classList.remove('active'));
      document.querySelector(`.c-tab[data-c-tab="${goto}"]`)?.classList.add('active');
      document.getElementById(`c-panel-${goto}`)?.classList.add('active');
    });
    _hqBuilt = true;
  }

  // Dynamische Werte aktualisieren
  document.getElementById('c-hq-st').textContent = `St. ${String(s.stage).padStart(2, '0')}`;
  document.getElementById('c-hq-stitle').textContent = stage.title.toUpperCase();
  document.getElementById('c-hq-xp-label').textContent = `EXP · ${flagshipName.toUpperCase()}`;
  document.getElementById('c-hq-xp-val').textContent = `${xp.toLocaleString('de-DE')} / ${xpNext.toLocaleString('de-DE')} xp`;
  document.getElementById('c-hq-xp-fill').style.width = `${xpPct}%`;
  document.getElementById('c-hq-rep-val').textContent = `${s.reputation.toFixed(0)} / 100`;
  document.getElementById('c-hq-rep-fill').style.width = `${repPct}%`;

  // Tiles dynamisch
  const tiles = [
    { goto: 'stages', icon: '🎓', label: 'Zertifizierung', right: `Stufe <b>${s.stage}</b>` },
    { goto: 'fleet',  icon: '✈',  label: 'Flotte',         right: `<b>${s.fleet.length}</b> Maschinen` },
    { goto: 'shop',   icon: '🏷',  label: 'Hangar',         right: 'Flugzeuge kaufen' },
    { goto: 'jobs',   icon: '📋', label: 'Aufträge',        right: `<b>${s.passiveJobs.length}</b> aktiv · ${s.jobOffers.length} offen` },
    { goto: 'ops',    icon: '🏢', label: 'Unternehmen',     right: s.stage >= 24 ? `<b>${s.crewHired}</b> Crew` : 'Ab Stufe 24' },
  ];
  document.getElementById('c-hq-tiles').innerHTML = tiles.map(t => `
    <div class="c-hq-tile" data-goto="${t.goto}">
      <div class="c-hq-tile-icon">${t.icon}</div>
      <div class="c-hq-tile-label">${t.label}</div>
      <div class="c-hq-tile-count">${t.right}</div>
    </div>
  `).join('');

  // 3D Preview: nur bauen/tauschen wenn Flaggschiff wechselt
  const canvasContainer = document.getElementById('c-hq-canvas');
  if (canvasContainer && flagship && flagshipShop) {
    if (!_hqPreview) {
      _hqPreview = new AircraftPreview(canvasContainer);
      const loop = () => { _hqAnimId = requestAnimationFrame(loop); _hqPreview.render(); };
      loop();
    }
    if (_hqLastFlagshipId !== flagship.id) {
      _hqPreview.setAircraft(flagshipShop.flyType, getLivery('lufthansa'));
      _hqLastFlagshipId = flagship.id;
    }
  }
}

let _selectedStageN = null;
let _treeState = { scale: 1, tx: 0, ty: 0, drag: null };

function renderStagesPanel() {
  const panel = document.getElementById('c-panel-stages');
  const s = careerState;
  if (_selectedStageN == null) _selectedStageN = s.stage;
  const sel = Career.CAREER_STAGES[_selectedStageN - 1] || Career.CAREER_STAGES[0];

  // Edges
  const edges = Career.CAREER_EDGES.map(([a, b]) => {
    const A = Career.CAREER_LAYOUT[a];
    const B = Career.CAREER_LAYOUT[b];
    if (!A || !B) return '';
    const cls = b <= s.stage ? 'done' : a <= s.stage ? 'reach' : 'locked';
    // leichte Bézier-Kurve für organischeren Look
    const mx = (A[0] + B[0]) / 2;
    const my = (A[1] + B[1]) / 2;
    return `<path class="c-tree-edge ${cls}" d="M${A[0]},${A[1]} Q${mx},${my} ${B[0]},${B[1]}"/>`;
  }).join('');

  // Nodes
  const nodes = Career.CAREER_STAGES.map(st => {
    const pos = Career.CAREER_LAYOUT[st.n];
    if (!pos) return '';
    const [x, y] = pos;
    const isCurrent = st.n === s.stage;
    const isDone = st.n < s.stage;
    const isSelected = st.n === _selectedStageN;
    const cls = [
      isCurrent ? 'current' : '',
      isDone ? 'done' : '',
      st.n > s.stage ? 'locked' : '',
      isSelected ? 'selected' : '',
    ].filter(Boolean).join(' ');
    // Radius skaliert mit Tier (Stufen 1-10 klein, 11-20 mittel, 21-30 groß)
    const r = 26 + Math.min(14, Math.floor((st.n - 1) / 10) * 6);
    return `
      <g class="c-tree-node ${cls}" data-stage="${st.n}" transform="translate(${x},${y})">
        <circle r="${r + 6}" class="c-tree-halo"/>
        <circle r="${r}"/>
        <text dy=".35em">${st.n}</text>
        <text class="c-tree-label" y="${r + 18}">${st.title}</text>
      </g>
    `;
  }).join('');

  const unlocks = sel.unlocks.map(id => `<span class="c-chip">${Career.AIRCRAFT_SHOP[id]?.name || id}</span>`).join('');
  const perks = (sel.perks || []).map(p => `<span class="c-chip perk">${p}</span>`).join('');
  const selStatus = sel.n === s.stage ? 'AKTUELL'
                  : sel.n < s.stage  ? 'ABGESCHLOSSEN'
                  : 'GESPERRT';

  panel.innerHTML = `
    <div class="c-tree-wrap" id="c-tree-wrap">
      <div class="c-tree-inner" id="c-tree-inner">
        <svg viewBox="0 0 2100 900" class="c-tree-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="c-tree-halo-g"><stop offset="0%" stop-color="#4a9eff" stop-opacity=".35"/><stop offset="100%" stop-color="#4a9eff" stop-opacity="0"/></radialGradient>
          </defs>
          <g class="c-tree-edges">${edges}</g>
          <g class="c-tree-nodes">${nodes}</g>
        </svg>
      </div>
      <div class="c-tree-zoom">
        <button class="c-tree-zbtn" id="c-tree-zin">+</button>
        <button class="c-tree-zbtn" id="c-tree-zout">−</button>
        <button class="c-tree-zbtn" id="c-tree-zreset">⟳</button>
      </div>
      <div class="c-tree-detail">
        <div class="c-tree-detail-status">${selStatus}</div>
        <div class="c-tree-detail-num">STUFE ${String(sel.n).padStart(2,'0')} / 30</div>
        <div class="c-tree-detail-title">${sel.title}</div>
        <div class="c-tree-detail-desc">${sel.desc}</div>
        <div class="c-tree-detail-req">
          <div><span>Stunden</span><b>${Career.fmtHours(sel.req.hours)}</b></div>
          <div><span>Kapital</span><b>${Career.fmtMoney(sel.req.money)}</b></div>
          <div><span>Reputation</span><b>${sel.req.rep}</b></div>
        </div>
        <div class="c-tree-detail-unlocks">${unlocks}${perks}</div>
      </div>
    </div>
  `;

  // Event wiring
  const wrap = document.getElementById('c-tree-wrap');
  const inner = document.getElementById('c-tree-inner');
  const applyTransform = () => {
    inner.style.transform = `translate(${_treeState.tx}px, ${_treeState.ty}px) scale(${_treeState.scale})`;
  };
  applyTransform();

  wrap.querySelectorAll('.c-tree-node').forEach(n => {
    n.addEventListener('click', (e) => {
      e.stopPropagation();
      _selectedStageN = +n.dataset.stage;
      renderStagesPanel();
    });
  });

  document.getElementById('c-tree-zin')?.addEventListener('click', () => { _treeState.scale = Math.min(2, _treeState.scale * 1.2); applyTransform(); });
  document.getElementById('c-tree-zout')?.addEventListener('click', () => { _treeState.scale = Math.max(0.4, _treeState.scale / 1.2); applyTransform(); });
  document.getElementById('c-tree-zreset')?.addEventListener('click', () => { _treeState = { scale: 1, tx: 0, ty: 0, drag: null }; applyTransform(); });

  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = wrap.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
    const newScale = Math.min(2, Math.max(0.4, _treeState.scale * factor));
    const ratio = newScale / _treeState.scale;
    _treeState.tx = px - (px - _treeState.tx) * ratio;
    _treeState.ty = py - (py - _treeState.ty) * ratio;
    _treeState.scale = newScale;
    applyTransform();
  }, { passive: false });

  wrap.addEventListener('mousedown', (e) => {
    if (e.target.closest('.c-tree-node') || e.target.closest('.c-tree-zoom')) return;
    _treeState.drag = { x: e.clientX, y: e.clientY, tx: _treeState.tx, ty: _treeState.ty };
    wrap.classList.add('dragging');
  });
  window.addEventListener('mousemove', (e) => {
    if (!_treeState.drag) return;
    _treeState.tx = _treeState.drag.tx + (e.clientX - _treeState.drag.x);
    _treeState.ty = _treeState.drag.ty + (e.clientY - _treeState.drag.y);
    applyTransform();
  });
  window.addEventListener('mouseup', () => {
    if (_treeState.drag) { _treeState.drag = null; wrap.classList.remove('dragging'); }
  });
}

function renderFleetPanel() {
  const panel = document.getElementById('c-panel-fleet');
  const s = careerState;
  if (s.fleet.length === 0) {
    panel.innerHTML = '<p style="color:rgba(255,255,255,.4)">Deine Flotte ist leer. Kaufe ein Flugzeug im Hangar.</p>';
    return;
  }
  const html = s.fleet.map(f => {
    const shop = Career.AIRCRAFT_SHOP[f.id];
    if (!shop) return '';
    const aog = f.inShop || f.wear >= 0.95;
    const repairCost = Math.round(shop.price * 0.05 * f.wear);
    return `
      <div class="c-card ${aog ? 'aog' : ''}">
        <div class="c-card-head">
          <div>
            <div class="c-card-name">${shop.name} ${aog ? '<span class="c-aog-badge">AOG</span>' : ''}</div>
            <div class="c-card-sub">${shop.tier.toUpperCase()} · ${f.uid.split('_').pop()}</div>
          </div>
          <div class="c-card-daily">€${shop.daily.toLocaleString('de-DE')} / Tag</div>
        </div>
        <div>
          <div style="font-size:9px;letter-spacing:1.5px;color:rgba(255,255,255,.35);margin-bottom:4px">ZUSTAND ${Math.round((1 - f.wear) * 100)}%</div>
          <div class="c-wear-bar"><div class="c-wear-fill" style="width:${f.wear * 100}%"></div></div>
        </div>
        <div class="c-card-actions">
          <button class="c-btn" data-act="fly" data-uid="${f.uid}" ${aog ? 'disabled' : ''}>
            ${aog ? 'AOG' : 'FLIEGEN'}
          </button>
          <button class="c-btn warn" data-act="repair" data-uid="${f.uid}" ${f.wear < 0.05 || s.money < repairCost ? 'disabled' : ''}>
            WARTUNG ${repairCost > 0 ? `€${(repairCost/1000).toFixed(0)}k` : ''}
          </button>
          <button class="c-btn ghost" data-act="sell" data-uid="${f.uid}">VERKAUFEN</button>
        </div>
      </div>
    `;
  }).join('');
  panel.innerHTML = `<div class="c-fleet-list">${html}</div>`;
  panel.querySelectorAll('[data-act="repair"]').forEach(b => {
    b.addEventListener('click', () => {
      const res = Career.repairAircraft(careerState, b.dataset.uid);
      if (res.ok) { saveCareerNow(); renderCareer(); showToast(`Wartung €${(res.cost/1000).toFixed(0)}k bezahlt`); }
      else showToast(res.reason || 'Wartung nicht möglich');
    });
  });
  panel.querySelectorAll('[data-act="sell"]').forEach(b => {
    b.addEventListener('click', () => {
      const res = Career.sellAircraft(careerState, b.dataset.uid);
      if (res.ok) { saveCareerNow(); renderCareer(); showToast(`Verkauft für ${Career.fmtMoney(res.refund)}`); }
    });
  });
  panel.querySelectorAll('[data-act="fly"]').forEach(b => {
    b.addEventListener('click', () => startCareerFlight(b.dataset.uid));
  });
}

// ============================================================
// MISSION-FLOW (MSFS-24-artig)
// ============================================================

function findAirportByIcao(icao) {
  return AIRPORTS.find(a => a.icao === icao) || null;
}

function showMissionBriefing(missionUid) {
  const m = careerState.missionOffers.find(x => x.uid === missionUid);
  if (!m) return;
  const t = Missions.MISSION_TYPES[m.type];
  alert(
    `MISSION-BRIEFING — ${m.typeLabel}\n` +
    `${m.description}\n\n` +
    `Route:      ${m.originIcao} (${m.originName}) → ${m.destIcao} (${m.destName})\n` +
    `Distanz:    ${m.distanceKm} km · Zeitbudget: ${m.timeBudgetMin} min\n` +
    `Flugzeug:   ${m.aircraftName}\n` +
    `Ladung:     ${m.payload} ${m.payloadLabel}\n` +
    `Payout:     ${Career.fmtMoney(m.payout)}  (max. ×1.2 bei Spitzen-Score)\n` +
    `XP:         +${m.xpReward}\n` +
    `Landetol.:  VS ≤ ${m.vsTolerance} m/s · Roll ≤ ${(m.rollTolerance*57.3).toFixed(0)}°`
  );
}

function startMissionFlight(missionUid) {
  const m = careerState.missionOffers.find(x => x.uid === missionUid);
  if (!m) return;
  if (careerState.activeMission) { showToast('Andere Mission läuft'); return; }
  // Flugzeug aus Flotte
  const fleet = careerState.fleet.find(f => f.uid === m.aircraftUid && !f.inShop)
             || careerState.fleet.find(f => f.id === m.aircraftId && !f.inShop);
  if (!fleet) { showToast('Flugzeug nicht mehr einsatzbereit'); return; }
  const origin = findAirportByIcao(m.originIcao);
  if (!origin) { showToast('Origin-Airport unbekannt'); return; }

  // Mission aktivieren
  Career.startMission(careerState, m);
  careerState.missionOffers = careerState.missionOffers.filter(x => x.uid !== m.uid);
  saveCareerNow();

  // Flug-Setup vorbelegen
  const shop = Career.AIRCRAFT_SHOP[fleet.id];
  selectedAirport = origin;
  selectedAircraft = shop?.flyType || fleet.id;
  careerFlightActive = true;
  careerFlightFleetId = fleet.id;
  closeCareer();
  // Direkt Ladebildschirm triggern (statt manueller Bestätigung)
  showToast(`Mission gestartet: ${m.originIcao} → ${m.destIcao}`);
  startFlight();
}

function resumeActiveMission(mission) {
  const origin = findAirportByIcao(mission.originIcao);
  if (!origin) return;
  const fleet = careerState.fleet.find(f => f.uid === mission.aircraftUid && !f.inShop)
             || careerState.fleet.find(f => f.id === mission.aircraftId && !f.inShop);
  if (!fleet) { showToast('Flugzeug nicht verfügbar'); return; }
  const shop = Career.AIRCRAFT_SHOP[fleet.id];
  selectedAirport = origin;
  selectedAircraft = shop?.flyType || fleet.id;
  careerFlightActive = true;
  careerFlightFleetId = fleet.id;
  closeCareer();
  startFlight();
}

function updateMissionHUD() {
  const hud = document.getElementById('mission-hud');
  const m = careerState.activeMission;
  if (!m || !myState) { if (hud) hud.classList.add('hidden'); return; }
  if (!hud) return;
  hud.classList.remove('hidden');
  const dest = findAirportByIcao(m.destIcao);
  if (!dest) return;
  const origin = findAirportByIcao(m.originIcao);
  // Welt-km pro Breiten-/Längengrad grob über origin (wir simulieren planar)
  // Tatsächlich ist der Player auf x/z im Meter-Raum relativ zum selectedAirport-Ursprung.
  // Wenn wir am Origin-Airport spawnen, ist (0,0,0) == origin. Ziel in Welt-km: haversine.
  const distTotalKm = m.distanceKm;
  // Distanz von aktuellem Ort zu dest über eine Mischung aus flugzeit und restlicher Entfernung
  // Approximation: Player-Welt-Distanz zum Ursprung + verbleibende Distanz bis Ziel
  const playerKm = Math.sqrt((myState.x||0)**2 + (myState.z||0)**2) / 1000;
  const remainKm = Math.max(0, distTotalKm - playerKm);
  const elapsedMin = (Date.now() - (m.startedAt || Date.now())) / 60000;
  const timeLeft = Math.max(0, m.timeBudgetMin - elapsedMin);
  document.getElementById('mis-hud-type').textContent = m.typeLabel;
  document.getElementById('mis-hud-route').textContent = `${m.originIcao} → ${m.destIcao}`;
  document.getElementById('mis-hud-remain').textContent = `${remainKm.toFixed(0)} km`;
  document.getElementById('mis-hud-time').textContent = `${timeLeft.toFixed(0)} min`;
  document.getElementById('mis-hud-payout').textContent = Career.fmtMoney(m.payout);
}

function tryCompleteActiveMission(landing) {
  const m = careerState.activeMission;
  if (!m || !myState) return;
  // Welches Airport ist am nächsten?
  const myX = myState.x || 0, myZ = myState.z || 0;
  // Origin ist (0,0). Für dest: kein direkter Welt-Koordinaten-Mapping,
  // daher prüfen wir: Wenn Ziel=Origin (Sightseeing), reicht On-Ground + nahe (0,0).
  // Wenn Ziel ≠ Origin, vergleichen wir Strecke: mindestens distanceKm·0.7 geflogen und on-ground + langsam.
  const playerKm = Math.sqrt(myX*myX + myZ*myZ) / 1000;
  const nearOrigin = playerKm < 3;
  const reachedDest = !m.roundTrip && playerKm >= m.distanceKm * 0.7;
  const onGround = myState.onGround && myState.speed < 15;
  if (!onGround) return;

  let landedIcao;
  if (m.roundTrip && nearOrigin) landedIcao = m.originIcao;
  else if (reachedDest) landedIcao = m.destIcao;
  else landedIcao = 'UNKNOWN';

  const result = {
    landedIcao,
    verticalSpeed: landing?.verticalSpeed ?? flightRecord?.lastVs ?? 0,
    roll: landing?.roll ?? flightRecord?.lastRoll ?? 0,
    gear: landing?.gear ?? flightRecord?.lastGear ?? true,
    crashed: !!landing?.crashed,
    durationMin: flightRecord ? (Date.now() - flightRecord.startTime) / 60000 : 0,
    distanceKm: playerKm,
  };
  const score = Missions.scoreMission(m, result);
  const outcome = Career.completeMission(careerState, m, result, score);
  saveCareerNow();
  showMissionComplete(m, score, outcome);
}

function showMissionComplete(mission, score, outcome) {
  const el = document.getElementById('mission-complete');
  if (!el) return;
  el.classList.remove('hidden');
  const success = score.success;
  el.querySelector('.mc-title').textContent = success ? 'MISSION ERFOLGREICH' : 'MISSION FEHLGESCHLAGEN';
  el.querySelector('.mc-title').style.color = success ? '#2dd07e' : '#ff5a5a';
  el.querySelector('.mc-sub').textContent = `${mission.typeLabel} · ${mission.originIcao} → ${mission.destIcao}`;
  el.querySelector('.mc-score-val').textContent = `${(score.score * 100).toFixed(0)}%`;
  el.querySelector('.mc-payout').textContent = Career.fmtMoney(outcome.payout);
  el.querySelector('.mc-xp').textContent = `+${outcome.xp} XP`;
  el.querySelector('.mc-rep').textContent = (outcome.repDelta >= 0 ? '+' : '') + outcome.repDelta;
  el.querySelector('.mc-reasons').innerHTML = score.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('');
  if (outcome.promoted) {
    const p = document.createElement('div');
    p.className = 'mc-promo';
    p.textContent = `🎉 BEFÖRDERT: ${outcome.promoted.title}`;
    el.querySelector('.mc-body').appendChild(p);
  }
}

function startCareerFlight(fleetUid) {
  const f = careerState.fleet.find(a => a.uid === fleetUid);
  if (!f) return;
  const shop = Career.AIRCRAFT_SHOP[f.id];
  if (!shop) return;
  // Tatsächliches In-Game-Flugzeug aus flyType
  selectedAircraft = shop.flyType;
  careerFlightActive = true;
  careerFlightFleetId = f.id;  // Career-ID für Credit
  closeCareer();
  // In den Flight-Setup wechseln, damit Spieler Airport & Wetter wählen kann
  document.getElementById('dashboard-view').classList.add('hidden');
  document.getElementById('flight-setup').classList.remove('hidden');
  // Tabs zurücksetzen auf Fly-Panel
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-panel="fly"]')?.classList.add('active');
  document.getElementById('panel-fly')?.classList.add('active');
  // Preview/Info aktualisieren
  buildAircraftPanel();
  showToast(`${shop.name} ist startbereit — Airport wählen und FLY NOW`);
}

function renderShopPanel() {
  const panel = document.getElementById('c-panel-shop');
  const s = careerState;
  const unlocked = Career.allUnlockedAircraft(s);
  const items = Object.entries(Career.AIRCRAFT_SHOP);
  const html = items.map(([id, ac]) => {
    const isUnlocked = unlocked.has(id);
    const canAfford = s.money >= ac.price;
    const locked = !isUnlocked;
    const disabled = locked || !canAfford;
    const stageLock = Career.CAREER_STAGES.find(st => st.unlocks.includes(id));
    return `
      <div class="c-card">
        <div class="c-card-head">
          <div>
            <div class="c-card-name">${ac.name}</div>
            <div class="c-card-sub">${ac.tier.toUpperCase()}${locked && stageLock ? ` · Ab Stufe ${stageLock.n}` : ''}</div>
          </div>
          <div class="c-card-price">${Career.fmtMoney(ac.price)}</div>
        </div>
        <div class="c-card-daily">€${ac.daily.toLocaleString('de-DE')} / Tag Leasing</div>
        <div class="c-card-actions">
          <button class="c-btn" data-act="buy" data-id="${id}" ${disabled ? 'disabled' : ''}>
            ${locked ? '🔒 GESPERRT' : canAfford ? 'KAUFEN' : 'ZU TEUER'}
          </button>
        </div>
      </div>
    `;
  }).join('');
  panel.innerHTML = `<div class="c-shop-list">${html}</div>`;
  panel.querySelectorAll('[data-act="buy"]').forEach(b => {
    b.addEventListener('click', () => {
      const res = Career.buyAircraft(careerState, b.dataset.id);
      if (res.ok) { saveCareerNow(); renderCareer(); showToast(`Gekauft: ${Career.AIRCRAFT_SHOP[b.dataset.id].name}`); }
      else showToast(res.reason);
    });
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

function renderMissionBoard(panel) {
  const s = careerState;
  const origin = selectedAirport?.icao || 'EDDF';
  // Missionen pro Origin cachen — bei Wechsel neu generieren
  if (!s.missionOffers.length || s.missionOffersOrigin !== origin) {
    s.missionOffers = Missions.generateMissions(origin, s, 6);
    s.missionOffersOrigin = origin;
  }
  const active = s.activeMission;
  const offers = s.missionOffers;

  const activeHtml = active ? `
    <div class="c-card mission-active" style="border-color:${escapeAttr(Missions.MISSION_TYPES[active.type]?.color || '#2a7fff')}">
      <div class="c-card-head">
        <div>
          <div class="c-card-name">AKTIVE MISSION — ${escapeHtml(active.typeLabel)}</div>
          <div class="c-card-sub">${escapeHtml(active.originIcao)} → ${escapeHtml(active.destIcao)} · ${active.distanceKm} km · ${active.aircraftName}</div>
        </div>
        <div class="c-card-price">${Career.fmtMoney(active.payout)}</div>
      </div>
      <div class="c-card-actions">
        <button class="c-btn" id="mis-continue">WEITERFLIEGEN</button>
        <button class="c-btn ghost" id="mis-abort">MISSION ABBRECHEN (-2 Ruf)</button>
      </div>
    </div>
  ` : '';

  const offerHtml = offers.map(m => {
    const t = Missions.MISSION_TYPES[m.type];
    const canFly = s.fleet.some(f => f.uid === m.aircraftUid && !f.inShop)
                || s.fleet.some(f => f.id === m.aircraftId && !f.inShop);
    return `
      <div class="c-card mission-card">
        <div class="c-card-head">
          <div>
            <div class="c-card-name">
              <span class="mis-chip" style="background:${escapeAttr(t?.color || '#444')}">${escapeHtml(m.typeLabel)}</span>
              ${escapeHtml(m.originIcao)} → ${escapeHtml(m.destIcao)}
            </div>
            <div class="c-card-sub">${escapeHtml(m.destName)} · ${m.distanceKm} km · ${m.timeBudgetMin} min Budget</div>
          </div>
          <div class="c-card-price">${Career.fmtMoney(m.payout)}</div>
        </div>
        <div class="c-card-sub" style="margin-top:4px">
          ${escapeHtml(m.aircraftName)} · ${m.payload} ${escapeHtml(m.payloadLabel)} · +${m.xpReward} XP
          ${m.requiresSmooth ? ' · <span style="color:#9ec8f0">weiche Landung erforderlich</span>' : ''}
        </div>
        <div class="c-card-actions">
          <button class="c-btn" data-act="start-mission" data-uid="${escapeAttr(m.uid)}" ${canFly && !active ? '' : 'disabled'}>
            ${active ? 'ANDERE MISSION LÄUFT' : canFly ? 'MISSION STARTEN' : 'FLUGZEUG FEHLT'}
          </button>
          <button class="c-btn ghost" data-act="brief" data-uid="${escapeAttr(m.uid)}">BRIEFING</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="c-section-hdr" style="display:flex;align-items:center">
      MISSIONS-BOARD · ${escapeHtml(origin)}
      <button class="c-btn-refresh" id="c-refresh-missions">NEU WÜRFELN</button>
    </div>
    ${activeHtml}
    <div class="c-mission-list">${offerHtml || '<p style="color:rgba(255,255,255,.4)">Keine Missionen — Flotte leer oder Airport zuerst wählen.</p>'}</div>
  `;
}

function renderJobsPanel() {
  const panel = document.getElementById('c-panel-jobs');
  const s = careerState;
  if (s.jobOffers.length === 0) Career.generateJobOffers(s);
  const now = Date.now();

  const active = s.passiveJobs.map(j => {
    const remain = Math.max(0, Math.ceil((j.endsAt - now) / 1000));
    return `
      <div class="c-card">
        <div class="c-card-head">
          <div>
            <div class="c-card-name">${j.aircraftName}</div>
            <div class="c-card-sub">${j.days} Tage Vertrag · ${j.typeLabel}</div>
          </div>
          <div class="c-card-price">${Career.fmtMoney(j.totalPayout)}</div>
        </div>
        <div class="c-job-head">
          <span class="c-job-type ${j.type}">${j.typeLabel.toUpperCase()}</span>
          <span class="c-job-timer">noch ${Math.floor(remain/60)}:${String(remain%60).padStart(2,'0')} min</span>
        </div>
      </div>
    `;
  }).join('');

  const offers = s.jobOffers.map(j => {
    const hasFleet = s.fleet.some(f => f.id === j.aircraftId && !f.inShop);
    return `
      <div class="c-card">
        <div class="c-card-head">
          <div>
            <div class="c-card-name">${j.aircraftName}</div>
            <div class="c-card-sub">${j.days} Tage · €${j.dailyPayout.toLocaleString('de-DE')} / Tag</div>
          </div>
          <div class="c-card-price">${Career.fmtMoney(j.totalPayout)}</div>
        </div>
        <div class="c-job-head">
          <span class="c-job-type ${j.type}">${j.typeLabel.toUpperCase()}</span>
          <span class="c-job-timer">${hasFleet ? '' : '— Flugzeug fehlt in der Flotte'}</span>
        </div>
        <div class="c-card-actions">
          <button class="c-btn" data-act="take" data-uid="${j.uid}" ${hasFleet ? '' : 'disabled'}>ANNEHMEN</button>
        </div>
      </div>
    `;
  }).join('');

  const missionBoard = renderMissionBoard(panel);

  panel.innerHTML = `
    ${missionBoard}
    ${active ? `
      <div class="c-active-jobs" style="margin-top:18px">
        <div class="c-section-hdr" style="display:flex;align-items:center">
          PASSIVE VERTRÄGE (${s.passiveJobs.length})
        </div>
        <div class="c-job-list">${active}</div>
      </div>
    ` : ''}
    <div class="c-section-hdr" style="display:flex;align-items:center;margin-top:14px">
      PASSIVE AUFTRÄGE
      <button class="c-btn-refresh" id="c-refresh-jobs">NEU WÜRFELN</button>
    </div>
    <div class="c-job-list">${offers || '<p style="color:rgba(255,255,255,.4)">Keine Aufträge. Refresh versuchen.</p>'}</div>
  `;
  panel.querySelectorAll('[data-act="take"]').forEach(b => {
    b.addEventListener('click', () => {
      const res = Career.acceptJob(careerState, b.dataset.uid);
      if (res.ok) { saveCareerNow(); renderCareer(); showToast('Auftrag angenommen'); }
      else showToast(res.reason);
    });
  });
  panel.querySelector('#c-refresh-jobs')?.addEventListener('click', () => {
    Career.generateJobOffers(careerState);
    saveCareerNow();
    renderCareer();
  });
  panel.querySelector('#c-refresh-missions')?.addEventListener('click', () => {
    const origin = selectedAirport?.icao || 'EDDF';
    careerState.missionOffers = Missions.generateMissions(origin, careerState, 6);
    careerState.missionOffersOrigin = origin;
    saveCareerNow();
    renderCareer();
  });
  panel.querySelectorAll('[data-act="start-mission"]').forEach(b => {
    b.addEventListener('click', () => startMissionFlight(b.dataset.uid));
  });
  panel.querySelectorAll('[data-act="brief"]').forEach(b => {
    b.addEventListener('click', () => showMissionBriefing(b.dataset.uid));
  });
  panel.querySelector('#mis-continue')?.addEventListener('click', () => {
    const m = careerState.activeMission;
    if (!m) return;
    resumeActiveMission(m);
  });
  panel.querySelector('#mis-abort')?.addEventListener('click', () => {
    Career.abortMission(careerState);
    saveCareerNow();
    renderCareer();
    showToast('Mission abgebrochen');
  });
}

function renderOpsPanel() {
  const panel = document.getElementById('c-panel-ops');
  const s = careerState;
  const stage = Career.currentStage(s);
  const crewUnlocked = s.stage >= 24;
  const crewCostPerDay = s.crewHired * 1200;
  panel.innerHTML = `
    <div class="c-ops-grid">
      <div class="c-ops-card">
        <div class="c-ops-label">INCOME-MULTIPLIER</div>
        <div class="c-ops-val">×${stage.incomeMult.toFixed(2)}</div>
        <div class="c-ops-sub">${stage.perks?.join(' · ') || ''}</div>
      </div>
      <div class="c-ops-card">
        <div class="c-ops-label">FLUG-BILANZ</div>
        <div class="c-ops-val">${s.totalFlights}</div>
        <div class="c-ops-sub">${s.crashes} Crashes · ${s.totalDistanceKm.toFixed(0)} km geflogen</div>
      </div>
      <div class="c-ops-card">
        <div class="c-ops-label">ABGESCHLOSSENE AUFTRÄGE</div>
        <div class="c-ops-val">${s.completedJobs}</div>
        <div class="c-ops-sub">${s.passiveJobs.length} laufen aktuell</div>
      </div>
      <div class="c-ops-card">
        <div class="c-ops-label">CREW</div>
        <div class="c-ops-val">${s.crewHired}</div>
        <div class="c-ops-sub">${crewUnlocked ? `€${crewCostPerDay.toLocaleString('de-DE')} / Tag` : 'Ab Stufe 24'}</div>
        <div class="c-card-actions" style="margin-top:10px">
          <button class="c-btn" id="c-hire" ${crewUnlocked && s.money >= 50_000 ? '' : 'disabled'}>+ CREW €50k</button>
          <button class="c-btn ghost" id="c-fire" ${s.crewHired > 0 ? '' : 'disabled'}>− CREW</button>
        </div>
      </div>
    </div>
  `;
  panel.querySelector('#c-hire')?.addEventListener('click', () => {
    const res = Career.hireCrew(careerState);
    if (res.ok) { saveCareerNow(); renderCareer(); showToast('Crew eingestellt'); }
    else showToast(res.reason);
  });
  panel.querySelector('#c-fire')?.addEventListener('click', () => {
    Career.fireCrew(careerState);
    saveCareerNow(); renderCareer();
  });
}

function isAircraftOwned(id) {
  return !MARKETPLACE_ITEMS[id] || ownedAircraft.has(id);
}

function buyAircraft(id) {
  openCheckoutModal(id);
}

// ============================================================
// CHECKOUT MODAL (Stripe + Demo)
// ============================================================
let checkoutItem = null;

function openCheckoutModal(itemId) {
  const item = MARKETPLACE_ITEMS[itemId];
  if (!item) return;
  if (ownedAircraft.has(itemId)) { showToast('Bereits gekauft', 'info'); return; }
  checkoutItem = itemId;

  document.getElementById('checkout-title').textContent = item.label || itemId.toUpperCase();
  document.getElementById('checkout-price').textContent = formatPrice(item.price);

  document.getElementById('co-demo-iban').value = '';
  document.getElementById('co-demo-ack').checked = false;
  document.getElementById('co-demo-btn').disabled = true;
  document.getElementById('co-demo-status').textContent = '';
  document.getElementById('co-demo-status').className = 'co-status';
  document.getElementById('co-stripe-status').textContent = '';
  document.getElementById('co-stripe-status').className = 'co-status';

  const stripeTab = document.querySelector('[data-co-tab="stripe"]');
  const stripeBtn = document.getElementById('co-stripe-btn');
  if (marketStripeEnabled) {
    stripeTab.classList.remove('disabled');
    stripeBtn.disabled = false;
    document.getElementById('co-stripe-hint').textContent = 'Du wirst zu stripe.com weitergeleitet.';
  } else {
    stripeTab.classList.add('disabled');
    stripeBtn.disabled = true;
    document.getElementById('co-stripe-hint').textContent = 'Stripe auf diesem Server nicht konfiguriert — nutze Demo-Modus.';
  }

  switchCheckoutTab(marketStripeEnabled ? 'stripe' : 'demo');
  document.getElementById('checkout-screen').classList.remove('hidden');
}

function closeCheckoutModal() {
  document.getElementById('checkout-screen').classList.add('hidden');
  checkoutItem = null;
}

function switchCheckoutTab(which) {
  document.querySelectorAll('.co-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.coTab === which);
  });
  document.querySelectorAll('.co-panel').forEach(p => {
    p.classList.toggle('active', p.id === `co-panel-${which}`);
  });
}

async function doStripeCheckout() {
  if (!checkoutItem) return;
  const btn = document.getElementById('co-stripe-btn');
  const status = document.getElementById('co-stripe-status');
  btn.disabled = true;
  status.className = 'co-status info';
  status.textContent = 'Erstelle Zahlungs-Session …';
  try {
    const r = await fetch('/api/market/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...marketAuthBody(),
        itemId: checkoutItem,
        returnBase: location.origin,
      }),
    });
    const j = await r.json();
    if (j.ok && j.alreadyOwned) {
      status.className = 'co-status ok';
      status.textContent = 'Bereits gekauft.';
      await refreshMarketState();
      setTimeout(closeCheckoutModal, 900);
      return;
    }
    if (j.ok && j.url) {
      status.className = 'co-status ok';
      status.textContent = 'Weiterleitung …';
      location.href = j.url;
      return;
    }
    status.className = 'co-status err';
    status.textContent = j.error === 'stripe-disabled'
      ? 'Stripe ist auf dem Server nicht konfiguriert.'
      : j.error === 'unauthorized'
      ? 'Nicht eingeloggt.'
      : 'Fehler beim Erstellen der Zahlung.';
    btn.disabled = false;
  } catch {
    status.className = 'co-status err';
    status.textContent = 'Server nicht erreichbar.';
    btn.disabled = false;
  }
}

async function doDemoBuy() {
  if (!checkoutItem) return;
  const iban = document.getElementById('co-demo-iban').value.replace(/\s+/g, '').toUpperCase();
  const ack  = document.getElementById('co-demo-ack').checked;
  const btn  = document.getElementById('co-demo-btn');
  const status = document.getElementById('co-demo-status');
  if (!ack) return;
  btn.disabled = true;
  status.className = 'co-status info';
  status.textContent = 'Verarbeite (Demo) …';
  try {
    await new Promise(r => setTimeout(r, 700));
    const r = await fetch('/api/market/demo-buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...marketAuthBody(),
        itemId: checkoutItem,
        iban,
        demoAcknowledged: true,
      }),
    });
    const j = await r.json();
    if (j.ok) {
      ownedAircraft = new Set(j.owned || []);
      saveOwnedAircraftLocal();
      updateMarketButtons();
      status.className = 'co-status ok';
      status.textContent = 'Freigeschaltet (Demo).';
      showToast('Flugzeug freigeschaltet (Demo)', 'ok');
      setTimeout(closeCheckoutModal, 900);
      return;
    }
    status.className = 'co-status err';
    status.textContent = j.error === 'iban-format'
      ? 'IBAN-Format ungültig (DE + 2 Ziffern + 10–30 Zeichen).'
      : j.error === 'unauthorized'
      ? 'Nicht eingeloggt.'
      : 'Fehler beim Freischalten.';
    btn.disabled = !ack;
  } catch {
    status.className = 'co-status err';
    status.textContent = 'Server nicht erreichbar.';
    btn.disabled = false;
  }
}

function initCheckoutWiring() {
  document.getElementById('checkout-close')?.addEventListener('click', closeCheckoutModal);
  document.getElementById('checkout-screen')?.addEventListener('click', (e) => {
    if (e.target.id === 'checkout-screen' || e.target.classList.contains('overlay-bg')) closeCheckoutModal();
  });
  document.querySelectorAll('.co-tab').forEach(t => {
    t.addEventListener('click', () => {
      if (t.classList.contains('disabled')) return;
      switchCheckoutTab(t.dataset.coTab);
    });
  });
  document.getElementById('co-stripe-btn')?.addEventListener('click', doStripeCheckout);
  document.getElementById('co-demo-btn')?.addEventListener('click', doDemoBuy);
  const ibanInput = document.getElementById('co-demo-iban');
  const ackCheck = document.getElementById('co-demo-ack');
  const updateDemoBtn = () => {
    const iban = ibanInput.value.replace(/\s+/g, '').toUpperCase();
    const ok = ackCheck.checked && /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban);
    document.getElementById('co-demo-btn').disabled = !ok;
  };
  ibanInput?.addEventListener('input', () => {
    ibanInput.value = ibanInput.value.toUpperCase();
    updateDemoBtn();
  });
  ackCheck?.addEventListener('change', updateDemoBtn);
}

function formatPrice(p) {
  return p.toFixed(2).replace('.', ',') + '\u00a0€';
}

const marketPreviews = new Map(); // id -> { preview, card }
let marketAnimId = null;

function buildMarketplace() {
  const grid = document.getElementById('market-grid');
  if (!grid || grid.childElementCount > 0) return;
  for (const [id, item] of Object.entries(MARKETPLACE_ITEMS)) {
    const ac = AIRCRAFT_TYPES[id];
    if (!ac) continue;
    const card = document.createElement('div');
    card.className = 'market-card';
    card.innerHTML = `
      <div class="market-card-preview"></div>
      <div class="market-card-body">
        <div>
          <div class="market-card-mfr">${ac.manufacturer.toUpperCase()}</div>
          <div class="market-card-name">${ac.name}</div>
        </div>
        <div class="market-specs">
          <span class="market-spec">${ac.engines} ENG</span>
          <span class="market-spec">${ac.passengers} PAX</span>
          <span class="market-spec">${ac.range.toLocaleString('de-DE')} km</span>
          <span class="market-spec">MTOW ${(ac.mtow/1000).toFixed(0)}t</span>
        </div>
        <div class="market-card-foot">
          <div class="market-price">${formatPrice(item.price)}</div>
          <button class="market-buy" data-buy="${id}">KAUFEN</button>
        </div>
      </div>
    `;
    grid.appendChild(card);

    const previewContainer = card.querySelector('.market-card-preview');
    const preview = new AircraftPreview(previewContainer);
    preview.setAircraft(id, getLivery('lufthansa'));
    marketPreviews.set(id, { preview, card });

    card.querySelector('[data-buy]').addEventListener('click', () => buyAircraft(id));
  }
  updateMarketButtons();
}

function updateMarketButtons() {
  for (const [id, { card }] of marketPreviews) {
    const owned = ownedAircraft.has(id);
    const btn = card.querySelector('[data-buy]');
    btn.classList.toggle('owned', owned);
    btn.disabled = owned;
    btn.textContent = owned ? 'GEKAUFT' : 'KAUFEN';
  }
}

function startMarketAnim() {
  if (marketAnimId) return;
  const loop = () => {
    marketAnimId = requestAnimationFrame(loop);
    for (const { preview } of marketPreviews.values()) preview.render();
  };
  loop();
}
function stopMarketAnim() {
  if (marketAnimId) { cancelAnimationFrame(marketAnimId); marketAnimId = null; }
}

function openMarketplace() {
  buildMarketplace();
  updateMarketButtons();
  document.getElementById('marketplace-screen').classList.remove('hidden');
  startMarketAnim();
}

function closeMarketplace() {
  document.getElementById('marketplace-screen').classList.add('hidden');
  stopMarketAnim();
}

// ============================================================
// INIT THREE.JS
// ============================================================

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.FogExp2(0x9dc4e0, 0.00007);

  camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 1, 80000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = settings.shadows;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  // PBR Environment: gives aircraft metallic surfaces real reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3a6b35, 0.25));
  sun = new THREE.DirectionalLight(0xfff0dd, 1.4);
  sun.position.set(2000, 3000, 1000);
  sun.castShadow = settings.shadows;
  sun.shadow.mapSize.setScalar(2048);
  const s = 300;
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
  sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
  scene.add(sun); scene.add(sun.target);

  // Sky
  const skyGeo = new THREE.SphereGeometry(40000, 32, 16);
  scene.add(new THREE.Mesh(skyGeo, new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { topColor: { value: new THREE.Color(0x002266) }, bottomColor: { value: new THREE.Color(0xc0d8ee) } },
    vertexShader: `varying vec3 vWP;void main(){vWP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec3 topColor,bottomColor;varying vec3 vWP;void main(){float h=normalize(vWP).y;gl_FragColor=vec4(mix(bottomColor,topColor,max(h,0.)),1.);}`,
  })));

  // Clouds
  const cg = new THREE.SphereGeometry(1, 6, 4);
  const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
  for (let i = 0; i < 90; i++) {
    const g = new THREE.Group();
    for (let j = 0; j < 4 + Math.random() * 6; j++) {
      const p = new THREE.Mesh(cg, cm);
      p.scale.set(50 + Math.random() * 90, 10 + Math.random() * 20, 50 + Math.random() * 90);
      p.position.set((Math.random()-.5)*140, (Math.random()-.5)*12, (Math.random()-.5)*140);
      g.add(p);
    }
    g.position.set((Math.random()-.5)*18000, 500+Math.random()*1800, (Math.random()-.5)*18000);
    scene.add(g);
  }
}

// ============================================================
// PLAYER MESHES
// ============================================================

function getPlayerMesh(id, aircraftType, airline) {
  const key = `${id}_${aircraftType}_${airline}`;
  const existing = playerMeshes.get(id);

  // Wenn Typ oder Airline gewechselt hat, Mesh neu bauen
  if (existing && existing.userData._key !== key) {
    scene.remove(existing);
    playerMeshes.delete(id);
  }

  if (!playerMeshes.has(id)) {
    // Airline-ID aus Namen ermitteln, dann vollständige Livery laden
    let airlineId = null;
    if (airline) {
      const e = Object.entries(AIRLINES).find(([, a]) => a.name === airline);
      if (e) airlineId = e[0];
    }
    const livery = getLivery(airlineId);
    const type = aircraftType || 'a320';
    const wrapper = new THREE.Group();
    // Prozedurales Mesh ist bereits in echten Metern skaliert (buildAircraft)
    const proc = createAircraftForType(type, livery);
    wrapper.add(proc);
    const acData = AIRCRAFT_TYPES[type];
    wrapper.userData._key = key;
    wrapper.userData._hasGLB = false;
    wrapper.userData.realLength = acData?.length || proc.userData.realLength || 12;
    scene.add(wrapper);
    playerMeshes.set(id, wrapper);

    // GLB asynchron laden und prozeduralen Fallback ersetzen
    createGLBInstance(type).then((glb) => {
      if (!glb) return;
      const current = playerMeshes.get(id);
      if (!current || current.userData._key !== key) return; // zwischenzeitlich gewechselt
      applyLiveryToGLB(glb, livery);
      current.remove(proc);
      current.add(glb);
      current.userData._hasGLB = true;
      current.userData.realLength = glb.userData.realLength || current.userData.realLength;
    });
  }
  return playerMeshes.get(id);
}

function removePlayerMesh(id) {
  const mesh = playerMeshes.get(id);
  if (mesh) { scene.remove(mesh); playerMeshes.delete(id); }
}

// ============================================================
// INPUT
// ============================================================

const keys = {};
const pressed = {};

window.addEventListener('keydown', (e) => {
  if (!gameStarted) return;
  keys[e.code] = true;
  if (!pressed[e.code]) { pressed[e.code] = true; onKeyPress(e.code); }
  if (e.code === 'Tab' || e.code === 'ShiftLeft' || e.code === 'ControlLeft') e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false; pressed[e.code] = false;
  if (e.code === 'KeyB' && ws?.readyState === 1) ws.send(JSON.stringify({ type: 'brakes', value: false }));
});

function onKeyPress(code) {
  // Tab und Escape brauchen keine WS-Verbindung
  if (code === 'Tab') {
    cockpitOpen = !cockpitOpen;
    document.getElementById('cockpit-overlay').classList.toggle('hidden', !cockpitOpen);
    return;
  }
  if (code === 'Escape') {
    if (cockpitOpen) { cockpitOpen = false; document.getElementById('cockpit-overlay').classList.add('hidden'); return; }
    const s = myState;
    if (s && !s.alive) return;
    paused = !paused;
    document.getElementById('pause-menu').classList.toggle('hidden', !paused);
    return;
  }

  if (!ws || ws.readyState !== 1) return;
  const s = myState;
  switch (code) {
    case 'KeyF': ws.send(JSON.stringify({ type: 'flaps', value: Math.min(4, (s?.flaps||0)+1) })); break;
    case 'KeyV': ws.send(JSON.stringify({ type: 'flaps', value: Math.max(0, (s?.flaps||0)-1) })); break;
    case 'KeyG': ws.send(JSON.stringify({ type: 'gear' })); break;
    case 'KeyB': ws.send(JSON.stringify({ type: 'brakes', value: true })); break;
    case 'KeyL': ws.send(JSON.stringify({ type: 'lights' })); break;
    case 'KeyK': ws.send(JSON.stringify({ type: 'spoilers' })); break;
    case 'KeyR':
      if (s && !s.alive) { ws.send(JSON.stringify({ type: 'respawn' })); document.getElementById('crash-screen').classList.add('hidden'); }
      break;
  }
}

// Sanft gerampte Tastatur-Eingabe — binäres W/A/D/S fühlt sich direkt
// analog an, statt sofort auf volle Auslenkung zu springen.
const kbInput = { pitch: 0, roll: 0, yaw: 0 };
let _kbInputTs = 0;
const KB_RAMP = 3.8;   // Einheiten/s zum Ziel hin
const KB_DECAY = 5.5;  // Einheiten/s Richtung 0 ohne Taste (schnellere Selbstzentrierung)

function updateKbInput() {
  const now = performance.now();
  const dt = _kbInputTs ? Math.min(0.1, (now - _kbInputTs) / 1000) : 0;
  _kbInputTs = now;
  const tgt = {
    pitch: (keys['KeyW']||keys['ArrowUp']?1:0) + (keys['KeyS']||keys['ArrowDown']?-1:0),
    roll:  (keys['KeyA']||keys['ArrowLeft']?1:0) + (keys['KeyD']||keys['ArrowRight']?-1:0),
    yaw:   (keys['KeyQ']?1:0) + (keys['KeyE']?-1:0),
  };
  for (const k of ['pitch','roll','yaw']) {
    const cur = kbInput[k], t = tgt[k];
    const rate = (t === 0 ? KB_DECAY : KB_RAMP) * dt;
    const diff = t - cur;
    kbInput[k] = Math.abs(diff) <= rate ? t : cur + Math.sign(diff) * rate;
  }
}

function currentTerrainHeight() {
  if (!terrainManager || !myState) return null;
  const h = terrainManager.sampleHeightAt(myState.x, myState.z);
  return (h == null || !Number.isFinite(h)) ? null : h;
}

function getInput() {
  updateKbInput();
  const th = currentTerrainHeight();
  const msg = {
    type: 'input',
    pitch: kbInput.pitch,
    roll: kbInput.roll,
    yaw: kbInput.yaw,
    throttle: (keys['ShiftLeft']||keys['ShiftRight']?1:0)+(keys['ControlLeft']||keys['ControlRight']?-1:0),
  };
  if (th != null) msg.terrainHeight = th;
  return msg;
}

// ============================================================
// WEBSOCKET
// ============================================================

function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}`);
  ws.addEventListener('open', () => {
    // Pilotname senden
    ws.send(JSON.stringify({ type: 'login', name: pilotName }));

    // Runway-Heading → Yaw. Welt-Konvention: +X=Ost, +Z=Süd, -Z=Nord.
    // Mesh-Nase zeigt bei yaw=0 nach +Z (Süden). Heading 0° = Norden = -Z
    // verlangt yaw=π. Allgemein: yaw = π − heading.
    const rwyHdg = selectedAirport?.rwy?.[0]?.hdg || 0;
    const spawnYaw = Math.PI - rwyHdg * Math.PI / 180;
    ws.send(JSON.stringify({
      type: 'selectAircraft',
      aircraft: selectedAircraft,
      airline: AIRLINES[selectedAirline]?.name || '',
      airport: selectedAirport?.icao || '',
      spawnYaw,
    }));
    ws.send(JSON.stringify({ type: 'weather', preset: selectedWeather }));
  });
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'init') myId = msg.id;
    if (msg.type === 'state') {
      latestState = msg.players;
      myState = latestState.find(p => p.id === myId) || null;
      if (myState && !myState.alive) showCrash();
    }
    if (msg.type === 'playerLeft') removePlayerMesh(msg.id);
  });
  ws.addEventListener('close', () => setTimeout(connectWS, 2000));
}

setInterval(() => {
  if (!ws || ws.readyState !== 1 || paused) return;

  // Gamepad Poll
  const gp = gamepadMgr.poll();
  if (gp) {
    // Gamepad-Achsen senden (inkl. Terrain-Höhe für Boden-Kollision)
    const th = currentTerrainHeight();
    const gpMsg = {
      type: 'input',
      pitch: gp.pitch,
      roll: gp.roll,
      yaw: gp.yaw,
      throttle: 0, // Throttle wird separat gesetzt
    };
    if (th != null) gpMsg.terrainHeight = th;
    ws.send(JSON.stringify(gpMsg));

    // Absolute Throttle
    ws.send(JSON.stringify({ type: 'setThrottle', value: gp.throttle }));

    // Bremsen (gehalten)
    ws.send(JSON.stringify({ type: 'brakes', value: gp.brakesHeld }));

    // Button-Actions
    for (const action of gp.actions) {
      switch (action) {
        case 'flapsUp': ws.send(JSON.stringify({ type: 'flaps', value: Math.min(4, (myState?.flaps||0)+1) })); break;
        case 'flapsDown': ws.send(JSON.stringify({ type: 'flaps', value: Math.max(0, (myState?.flaps||0)-1) })); break;
        case 'gear': ws.send(JSON.stringify({ type: 'gear' })); break;
        case 'spoilers': ws.send(JSON.stringify({ type: 'spoilers' })); break;
        case 'lights': ws.send(JSON.stringify({ type: 'lights' })); break;
        case 'parkingBrake': ws.send(JSON.stringify({ type: 'parkingBrake' })); break;
        case 'cockpit':
          cockpitOpen = !cockpitOpen;
          document.getElementById('cockpit-overlay').classList.toggle('hidden', !cockpitOpen);
          break;
        case 'pause':
          if (myState?.alive) { paused = !paused; document.getElementById('pause-menu').classList.toggle('hidden', !paused); }
          break;
        case 'respawn':
          if (myState && !myState.alive) {
            ws.send(JSON.stringify({ type: 'respawn' }));
            document.getElementById('crash-screen').classList.add('hidden');
          }
          break;
      }
    }
  } else {
    // Tastatur-Input
    ws.send(JSON.stringify(getInput()));
  }
}, 1000 / 30);

// ============================================================
// CAMERA — Always behind aircraft
// ============================================================

const smoothPos = new THREE.Vector3();
const smoothLook = new THREE.Vector3();

function updateCamera(mesh) {
  // Kamera-Abstand skaliert mit echter Flugzeuglänge (MSFS-artige Chase-Kamera)
  const len = mesh.userData.realLength || 12;
  const back = Math.max(14, len * 0.95);
  const up = Math.max(4, len * 0.22);
  const ahead = Math.max(10, len * 0.7);
  const off = new THREE.Vector3(0, up, -back).applyQuaternion(mesh.quaternion);
  const tPos = mesh.position.clone().add(off);
  const tLook = mesh.position.clone().add(new THREE.Vector3(0, up * 0.15, ahead).applyQuaternion(mesh.quaternion));

  smoothPos.lerp(tPos, 0.07);
  smoothLook.lerp(tLook, 0.07);
  camera.position.copy(smoothPos);
  camera.lookAt(smoothLook);
}

// ============================================================
// HUD
// ============================================================

function updateHUD() {
  if (!myState) return;
  const s = myState;
  const m = settings.units === 'metric';

  const spd = m ? (s.speed*3.6).toFixed(0) : (s.speed*1.944).toFixed(0);
  const alt = m ? s.y.toFixed(0) : (s.y*3.281).toFixed(0);
  const vs = s.verticalSpeed * (m ? 60 : 196.85);
  const gs = m ? (s.groundSpeed*3.6).toFixed(0) : (s.groundSpeed*1.944).toFixed(0);
  const hdg = ((((Math.PI - s.yaw)*180/Math.PI)%360)+360)%360;

  document.getElementById('pfd-spd').textContent = spd;
  document.getElementById('pfd-alt').textContent = alt;
  document.getElementById('pfd-vs').textContent = (vs>0?'+':'')+vs.toFixed(0);
  document.getElementById('pfd-hdg').textContent = hdg.toFixed(0)+'°';
  document.getElementById('pfd-gs').textContent = gs;
  document.getElementById('pfd-spd-unit').textContent = m?'km/h':'kt';
  document.getElementById('pfd-alt-unit').textContent = m?'m':'ft';

  // ADI
  const pitchDeg = -(s.pitch*180/Math.PI)*2;
  const rollDeg = -(s.roll*180/Math.PI);
  const adi = document.getElementById('adi-pitch-roll');
  if (adi) adi.setAttribute('transform', `rotate(${rollDeg}) translate(0,${pitchDeg})`);

  // Compass
  updateCompass(hdg);

  // Systems
  document.getElementById('s-thr').style.width = `${s.throttle*100}%`;
  document.getElementById('s-thr-v').textContent = `${(s.throttle*100).toFixed(0)}%`;
  document.getElementById('s-fuel').style.width = `${s.fuelPercent}%`;
  document.getElementById('s-fuel-v').textContent = `${s.fuelPercent.toFixed(0)}%`;
  const gEl = document.getElementById('s-g');
  gEl.textContent = s.gForce.toFixed(1);
  gEl.style.color = s.gForce>4||s.gForce<0?'#ff4444':s.gForce>2.5?'#ffaa00':'#fff';

  // Status dots
  setDot('st-gear', s.gear, 'on');
  setDot('st-flaps', s.flaps>0, 'amber'); setText('st-flaps', `FLP ${s.flaps}`);
  setDot('st-brk', s.brakes, 'amber');
  setDot('st-spl', s.spoilers, 'amber');
  setDot('st-lgt', s.lights, 'on');
  setDot('st-ap', s.autopilot, 'on');
  setDot('st-park', s.parkingBrake, 'amber');

  // Info
  const acData = AIRCRAFT_TYPES[s.aircraftType];
  document.getElementById('info-aircraft').textContent = acData?.name || s.aircraftType;
  document.getElementById('info-airline').textContent = s.airline || '-';
  const gpTxt = gamepadMgr.connected ? `${latestState.length} online | 🎮 ${gamepadMgr.controllerName}` : `${latestState.length} online`;
  document.getElementById('info-players').textContent = gpTxt;

  // Warnings
  document.getElementById('warn-stall').classList.toggle('hidden', !s.stallWarning);
  document.getElementById('warn-ovspd').classList.toggle('hidden', s.speed < 250);
  document.getElementById('warn-gpws').classList.toggle('hidden', !(s.y < 50 && s.verticalSpeed < -5 && !s.onGround));

  // Bottom
  document.getElementById('hud-loc').textContent = `${pilotName} | ${selectedAirport?.icao || '-'}`;
  const now = new Date();
  document.getElementById('hud-time').textContent = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}Z`;

  // Update cockpit
  if (cockpit) cockpit.updateFromState(s);
}

function setDot(id, active, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  const dot = el.querySelector('.dot');
  if (dot) { dot.className = `dot${active?' '+cls:''}`; }
}
function setText(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  const dot = el.querySelector('.dot');
  el.textContent = '';
  if (dot) el.appendChild(dot);
  el.appendChild(document.createTextNode(text));
}

function updateCompass(hdg) {
  const tape = document.getElementById('compass-tape');
  if (!tape) return;
  const labels = ['N','030','060','E','120','150','S','210','240','W','300','330'];
  let html = '';
  const w = 320;
  for (let d = -180; d <= 540; d += 30) {
    const off = ((d-hdg+540)%360-180)/1.2+w/2;
    if (off<-30||off>w+30) continue;
    const idx = ((d%360)+360)%360/30;
    const lbl = labels[Math.round(idx)%12];
    const maj = ['N','E','S','W'].includes(lbl);
    html += `<span style="position:absolute;left:${off}px;font-weight:${maj?700:400};color:${maj?'#4a9eff':'rgba(255,255,255,.35)'};font-size:${maj?'12px':'9px'};transform:translateX(-50%);font-family:'JetBrains Mono',monospace">${lbl}</span>`;
  }
  tape.innerHTML = html;
}

// ============================================================
// CRASH
// ============================================================

function showCrash() {
  const el = document.getElementById('crash-screen');
  if (!el.classList.contains('hidden')) return;
  el.classList.remove('hidden');
  document.getElementById('crash-reason').textContent = myState?.crashReason || '';
  document.getElementById('cr-spd').textContent = (myState.speed*3.6).toFixed(0);
  document.getElementById('cr-alt').textContent = myState.y.toFixed(0);
  document.getElementById('cr-g').textContent = myState.gForce.toFixed(1);
  if (careerState.activeMission) {
    tryCompleteActiveMission({ crashed: true });
  } else {
    creditCurrentFlight({ crashed: true });
  }
}

function creditCurrentFlight(override = {}) {
  if (!flightRecord || flightRecord.credited) return;
  flightRecord.credited = true;
  const durationMin = Math.max(0.5, (Date.now() - flightRecord.startTime) / 60000);
  const dx = (myState?.x || 0) - flightRecord.startX;
  const dz = (myState?.z || 0) - flightRecord.startZ;
  const distanceKm = Math.sqrt(dx * dx + dz * dz) / 1000;
  const landing = {
    crashed: override.crashed ?? false,
    verticalSpeed: flightRecord.lastVs,
    roll: flightRecord.lastRoll,
    gear: flightRecord.lastGear,
  };
  const result = Career.creditFlight(careerState, {
    distanceKm, durationMin,
    aircraftId: flightRecord.aircraftId,
    landing,
  });
  saveCareerNow();
  if (result.payout) showToast(`+ ${Career.fmtMoney(result.payout)}`);
  if (result.promoted) showToast(`🎉 BEFÖRDERT: ${result.promoted.title}`, 'promotion');
}

// ============================================================
// MENU LOGIC
// ============================================================

function initDashboard() {
  const dashView = document.getElementById('dashboard-view');
  const flightSetup = document.getElementById('flight-setup');

  const showSetup = (panelId) => {
    dashView.classList.add('hidden');
    flightSetup.classList.remove('hidden');
    if (panelId) {
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelector(`.nav-tab[data-panel="${panelId}"]`)?.classList.add('active');
      document.getElementById(`panel-${panelId}`)?.classList.add('active');
    }
  };
  const showDash = () => {
    flightSetup.classList.add('hidden');
    dashView.classList.remove('hidden');
  };

  document.querySelectorAll('.dash-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      if (tile.classList.contains('locked')) return;
      const which = tile.dataset.tile;
      if (which === 'freeflight') showSetup('fly');
      else if (which === 'career') openCareer();
      else if (which === 'challenge') showSetup('weather');
      else if (which === 'worldphoto') showSetup('fly');
      else if (which === 'marketplace') openMarketplace();
    });
  });

  document.querySelector('[data-dash-icon="settings"]')?.addEventListener('click', () => showSetup('settings'));
  document.getElementById('topbar-back')?.addEventListener('click', showDash);
  document.getElementById('market-close')?.addEventListener('click', closeMarketplace);
  document.getElementById('marketplace-screen')?.addEventListener('click', (e) => {
    if (e.target.id === 'marketplace-screen' || e.target.classList.contains('overlay-bg')) closeMarketplace();
  });
  // Career overlay
  document.getElementById('career-close')?.addEventListener('click', closeCareer);
  document.getElementById('career-screen')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('overlay-bg')) closeCareer();
  });
  document.querySelectorAll('.c-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.c-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.c-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`c-panel-${tab.dataset.cTab}`).classList.add('active');
    });
  });

  document.getElementById('dash-pilot-name').textContent = pilotName;

  startGlobe();
}

function startGlobe() {
  const canvas = document.getElementById('dash-globe-canvas');
  if (!canvas || canvas.dataset.init) return;
  canvas.dataset.init = '1';

  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.15;

  const sc = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  cam.position.set(0, 0, 3.2);

  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(1.2, 0.6, 3.5); // front-lit so the camera-facing hemisphere is illuminated
  sc.add(sun);
  sc.add(new THREE.AmbientLight(0xbfd4ff, 0.45));

  const tl = new THREE.TextureLoader();
  tl.crossOrigin = 'anonymous';
  const earthTex = tl.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');
  earthTex.colorSpace = THREE.SRGBColorSpace;
  earthTex.anisotropy = 8;
  const specTex = tl.load('https://threejs.org/examples/textures/planets/earth_specular_2048.jpg');
  const normalTex = tl.load('https://threejs.org/examples/textures/planets/earth_normal_2048.jpg');

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 96),
    new THREE.MeshPhongMaterial({
      map: earthTex,
      specularMap: specTex,
      normalMap: normalTex,
      specular: new THREE.Color(0x333344),
      shininess: 14,
    })
  );
  // Standard three.js earth texture has the prime meridian opposite the seam; rotating by PI+0.2 centers Europe toward the camera.
  earth.rotation.y = Math.PI + 0.2;
  earth.rotation.z = 0.41; // Earth axial tilt
  sc.add(earth);

  // atmosphere halo (back-side sphere with fresnel shader)
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.09, 64, 64),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false,
      uniforms: { c: { value: 0.55 }, p: { value: 3.2 }, glow: { value: new THREE.Color(0x4a9eff) } },
      vertexShader: `varying vec3 vN; varying vec3 vP; void main(){vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vP=mv.xyz; gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform float c; uniform float p; uniform vec3 glow; varying vec3 vN; varying vec3 vP; void main(){ vec3 vd=normalize(-vP); float intensity = pow(c - dot(vN, vd), p); gl_FragColor = vec4(glow, 1.0) * intensity; }`,
    })
  );
  sc.add(halo);

  const resize = () => {
    const w = canvas.clientWidth | 0, h = canvas.clientHeight | 0;
    if (!w || !h) return;
    r.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);

  const loop = () => {
    earth.rotation.y += 0.0012;
    r.render(sc, cam);
    requestAnimationFrame(loop);
  };
  loop();
}

function initMenu() {
  initDashboard();

  // Tab navigation
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      t.classList.add('active');
      document.getElementById(`panel-${t.dataset.panel}`).classList.add('active');
    });
  });

  // Airport map markers
  const map = document.getElementById('world-map');
  const mapInner = document.getElementById('world-map-inner');
  AIRPORTS.forEach((ap, i) => {
    const m = document.createElement('div');
    m.className = 'map-marker' + (ap.icao==='EDDF'?' active':'');
    m.style.left = `${((ap.lon+180)/360)*100}%`;
    m.style.top = `${((90-ap.lat)/180)*100}%`;
    m.innerHTML = `<div class="map-marker-label">${ap.iata}</div>`;
    m.addEventListener('click', (e) => { e.stopPropagation(); selectAirport(ap); });
    mapInner.appendChild(m);
  });
  document.getElementById('airport-count').textContent = `${AIRPORTS.length} Flughäfen weltweit`;

  // Map zoom + pan
  const mapState = { scale: 1, tx: 0, ty: 0 };
  const MIN_SCALE = 1, MAX_SCALE = 8;
  const applyMapTransform = () => {
    mapInner.style.transform = `translate(${mapState.tx}px, ${mapState.ty}px) scale(${mapState.scale})`;
  };
  const clampPan = () => {
    const w = map.clientWidth, h = map.clientHeight;
    const maxX = 0, minX = w - w * mapState.scale;
    const maxY = 0, minY = h - h * mapState.scale;
    mapState.tx = Math.min(maxX, Math.max(minX, mapState.tx));
    mapState.ty = Math.min(maxY, Math.max(minY, mapState.ty));
  };
  const zoomAt = (cx, cy, factor) => {
    const rect = map.getBoundingClientRect();
    const px = cx - rect.left, py = cy - rect.top;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, mapState.scale * factor));
    const ratio = newScale / mapState.scale;
    mapState.tx = px - (px - mapState.tx) * ratio;
    mapState.ty = py - (py - mapState.ty) * ratio;
    mapState.scale = newScale;
    clampPan();
    applyMapTransform();
  };
  map.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1/1.15);
  }, { passive: false });

  let drag = null;
  map.addEventListener('mousedown', (e) => {
    if (e.target.closest('.map-marker') || e.target.closest('.map-zoom-controls')) return;
    drag = { x: e.clientX, y: e.clientY, tx: mapState.tx, ty: mapState.ty };
    map.classList.add('dragging');
  });
  window.addEventListener('mousemove', (e) => {
    if (!drag) return;
    mapState.tx = drag.tx + (e.clientX - drag.x);
    mapState.ty = drag.ty + (e.clientY - drag.y);
    clampPan();
    applyMapTransform();
  });
  window.addEventListener('mouseup', () => { drag = null; map.classList.remove('dragging'); });

  document.getElementById('map-zoom-in').addEventListener('click', () => {
    const r = map.getBoundingClientRect();
    zoomAt(r.left + r.width/2, r.top + r.height/2, 1.5);
  });
  document.getElementById('map-zoom-out').addEventListener('click', () => {
    const r = map.getBoundingClientRect();
    zoomAt(r.left + r.width/2, r.top + r.height/2, 1/1.5);
  });
  document.getElementById('map-zoom-reset').addEventListener('click', () => {
    mapState.scale = 1; mapState.tx = 0; mapState.ty = 0; applyMapTransform();
  });

  // Airport search
  const searchInput = document.getElementById('airport-search');
  const searchResults = document.getElementById('search-results');
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    if (q.length < 2) { searchResults.classList.add('hidden'); return; }
    const results = searchAirports(q);
    searchResults.classList.remove('hidden');
    searchResults.innerHTML = results.map(a =>
      `<div class="search-result" data-icao="${a.icao}">
        <span class="sr-icao">${a.icao}</span>
        <span class="sr-iata">${a.iata}</span>
        <span class="sr-name">${a.name}</span>
        <span class="sr-city">${a.city}, ${a.country}</span>
      </div>`
    ).join('');
    searchResults.querySelectorAll('.search-result').forEach(el => {
      el.addEventListener('click', () => {
        const ap = AIRPORTS.find(a => a.icao === el.dataset.icao);
        if (ap) { selectAirport(ap); searchInput.value = `${ap.icao} — ${ap.name}`; searchResults.classList.add('hidden'); }
      });
    });
  });
  searchInput.addEventListener('focus', () => { if (searchInput.value.length >= 2) searchResults.classList.remove('hidden'); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.airport-search-bar')) searchResults.classList.add('hidden'); });

  selectedAirport = AIRPORTS[0];
  updateDepInfo();

  // Aircraft panel
  buildAircraftPanel();

  // Weather
  document.querySelectorAll('.wx-card[data-wx]').forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll('.wx-card').forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      selectedWeather = c.dataset.wx;
      updateConditions();
    });
  });
  updateConditions();

  // Settings
  document.querySelectorAll('.set-btn').forEach(b => {
    b.addEventListener('click', () => {
      b.parentElement.querySelectorAll('.set-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const k = b.dataset.key, v = b.dataset.val;
      if (k==='terrainZoom') settings.terrainZoom = +v;
      if (k==='terrainRadius') settings.terrainRadius = +v;
      if (k==='shadows') settings.shadows = v==='1';
      if (k==='units') settings.units = v;
    });
  });

  // Fly button
  document.getElementById('btn-fly').addEventListener('click', startFlight);

  // Pause
  document.getElementById('btn-resume').addEventListener('click', () => { paused=false; document.getElementById('pause-menu').classList.add('hidden'); });
  document.getElementById('btn-respawn-p').addEventListener('click', () => {
    if (flightRecord?.wasAirborne) creditCurrentFlight();
    if (ws?.readyState===1) ws.send(JSON.stringify({type:'respawn'}));
    paused=false; document.getElementById('pause-menu').classList.add('hidden');
    if (flightRecord) flightRecord = { ...flightRecord, credited: false, startTime: Date.now(), startX: myState?.x || 0, startZ: myState?.z || 0, wasAirborne: false };
  });
  document.getElementById('btn-quit').addEventListener('click', () => {
    if (careerFlightActive && flightRecord?.wasAirborne && !flightRecord.credited) {
      creditCurrentFlight();
    }
    location.reload();
  });
  document.getElementById('btn-end-flight').addEventListener('click', () => {
    if (careerState.activeMission) {
      tryCompleteActiveMission();
    } else if (flightRecord?.wasAirborne && !flightRecord.credited) {
      creditCurrentFlight();
    }
    setTimeout(() => location.reload(), careerState.activeMission ? 2500 : 0);
  });
  document.getElementById('btn-wx-pause').addEventListener('click', () => {
    // Quick cycle weather
    const presets = ['clear','fewClouds','scattered','overcast','stormy'];
    const idx = (presets.indexOf(selectedWeather)+1)%presets.length;
    selectedWeather = presets[idx];
    if (ws?.readyState===1) ws.send(JSON.stringify({type:'weather',preset:selectedWeather}));
    paused=false; document.getElementById('pause-menu').classList.add('hidden');
  });

  // Crash
  document.getElementById('btn-retry').addEventListener('click', () => {
    if (ws?.readyState===1) ws.send(JSON.stringify({type:'respawn'}));
    document.getElementById('crash-screen').classList.add('hidden');
    if (flightRecord) flightRecord = { ...flightRecord, credited: false, startTime: Date.now(), startX: myState?.x || 0, startZ: myState?.z || 0, wasAirborne: false };
  });
  document.getElementById('btn-cr-menu').addEventListener('click', () => location.reload());

  // Cockpit close
  document.getElementById('cockpit-close').addEventListener('click', () => {
    cockpitOpen = false;
    document.getElementById('cockpit-overlay').classList.add('hidden');
  });
}

function selectAirport(ap) {
  selectedAirport = ap;
  // Highlight active marker
  document.querySelectorAll('.map-marker').forEach(m => {
    const lbl = m.querySelector('.map-marker-label');
    m.classList.toggle('active', lbl && lbl.textContent === ap.iata);
  });
  updateDepInfo();
}

function updateDepInfo() {
  const a = selectedAirport;
  document.getElementById('dep-icao').textContent = a.icao;
  document.getElementById('dep-name').textContent = a.name;
  document.getElementById('dep-sub').textContent = `${a.city}, ${a.country}`;
  document.getElementById('dep-coords').textContent = `${Math.abs(a.lat).toFixed(2)}°${a.lat>=0?'N':'S'} ${Math.abs(a.lon).toFixed(2)}°${a.lon>=0?'E':'W'}`;
  document.getElementById('dep-elev').textContent = `${a.elev}m MSL`;
  if (a.rwy && a.rwy.length > 0) {
    const r = a.rwy[0];
    const opp = (r.hdg + 180) % 360;
    document.getElementById('dep-rwy').textContent = `RWY ${String(Math.round(r.hdg/10)).padStart(2,'0')}/${String(Math.round(opp/10)).padStart(2,'0')} — ${r.len}m`;
  }
}

function updateConditions() {
  const wx = { clear:{w:'2kt',v:'50km',c:'CLR'}, fewClouds:{w:'5kt',v:'40km',c:'2000m'}, scattered:{w:'10kt',v:'25km',c:'1500m'}, overcast:{w:'15kt',v:'12km',c:'800m'}, stormy:{w:'30kt',v:'3km',c:'300m'} }[selectedWeather];
  if (!wx) return;
  document.getElementById('cond-wind').textContent = wx.w;
  document.getElementById('cond-vis').textContent = wx.v;
  document.getElementById('cond-clouds').textContent = wx.c;
}

// Aircraft panel
function buildAircraftPanel() {
  // Create 3D preview
  const previewContainer = document.getElementById('ac-preview-3d');
  if (previewContainer && !preview) {
    preview = new AircraftPreview(previewContainer);
    // Animate preview
    function animatePreview() {
      previewAnimId = requestAnimationFrame(animatePreview);
      preview.render();
    }
    animatePreview();
  }

  // Falls aktuell ausgewähltes Flugzeug gesperrt ist, auf A320 zurückfallen
  if (!isAircraftOwned(selectedAircraft)) selectedAircraft = 'a320';

  const list = document.getElementById('ac-type-list');
  const types = Object.entries(AIRCRAFT_TYPES);
  list.innerHTML = '';
  types.forEach(([id, ac]) => {
    const locked = !isAircraftOwned(id);
    const price = MARKETPLACE_ITEMS[id]?.price;
    const el = document.createElement('div');
    el.className = 'ac-type-item' + (id===selectedAircraft?' active':'') + (locked?' locked':'');
    const priceTag = locked && price != null
      ? `<span class="ac-price-tag">${formatPrice(price)}</span>`
      : '';
    const lockIcon = locked ? '<span class="ac-lock-icon">🔒</span>' : '';
    el.innerHTML = `<div class="ac-t-name">${lockIcon}${ac.name}${priceTag}</div><div class="ac-t-sub">${ac.manufacturer} / ${ac.type.toUpperCase()} / ${ac.engines} Engines</div>`;
    el.addEventListener('click', () => {
      if (locked) { openMarketplace(); return; }
      list.querySelectorAll('.ac-type-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      selectedAircraft = id;
      showAircraftDetail(id);
      updateDepAircraft();
    });
    list.appendChild(el);
  });
  showAircraftDetail(selectedAircraft);
  updateDepAircraft();
}

function showAircraftDetail(id) {
  const ac = AIRCRAFT_TYPES[id];
  document.getElementById('ac-detail-header').textContent = ac.name;
  const specs = document.getElementById('ac-specs');
  specs.innerHTML = [
    ['MAX SPEED', `${ac.maxSpeed} km/h`],
    ['CRUISE', `${ac.cruiseSpeed} km/h`],
    ['RANGE', `${ac.range} km`],
    ['WINGSPAN', `${ac.wingspan} m`],
    ['LENGTH', `${ac.length} m`],
    ['PASSENGERS', ac.passengers],
    ['MTOW', `${(ac.mtow/1000).toFixed(0)}t`],
    ['ENGINES', ac.engines],
    ['CEILING', `FL${(ac.maxAlt/100).toFixed(0)}`],
  ].map(([l,v]) => `<div class="ac-spec"><div class="ac-spec-label">${l}</div><div class="ac-spec-val">${v}</div></div>`).join('');

  // Airlines
  const airlines = getAirlinesForAircraft(id);
  const grid = document.getElementById('airline-grid');
  grid.innerHTML = '';
  airlines.forEach(a => {
    const el = document.createElement('div');
    el.className = 'airline-item' + (a.id===selectedAirline?' active':'');
    el.innerHTML = `<div class="airline-swatch" style="background:${a.color1}"></div><span class="airline-name">${a.name}</span><span class="airline-iata">${a.iata}</span>`;
    el.addEventListener('click', () => {
      grid.querySelectorAll('.airline-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      selectedAirline = a.id;
      updateDepAircraft();
      updatePreview();
    });
    grid.appendChild(el);
  });

  // Auto-select first airline if current not available
  if (!airlines.find(a => a.id === selectedAirline) && airlines.length) {
    selectedAirline = airlines[0].id;
    grid.querySelector('.airline-item')?.classList.add('active');
  }
}

function updatePreview() {
  if (preview) {
    preview.setAircraft(selectedAircraft, getLivery(selectedAirline));
  }
}

function updateDepAircraft() {
  const ac = AIRCRAFT_TYPES[selectedAircraft];
  const al = AIRLINES[selectedAirline];
  document.getElementById('dep-aircraft').textContent = ac?.name || '';
  document.getElementById('dep-airline').textContent = al?.name || '';
  updatePreview();
}

// ============================================================
// COCKPIT INIT
// ============================================================

function initCockpit() {
  cockpit = new Cockpit(document.getElementById('cockpit-body'), (type, data) => {
    if (!ws || ws.readyState !== 1) return;

    switch (type) {
      case 'throttle':
        ws.send(JSON.stringify({ type: 'setThrottle', value: data.value }));
        break;
      case 'flaps':
        ws.send(JSON.stringify({ type: 'flaps', value: data.value }));
        break;
      case 'gear':
        ws.send(JSON.stringify({ type: 'gear' }));
        break;
      case 'button':
        if (data.key === 'parkingBrake') ws.send(JSON.stringify({ type: 'parkingBrake' }));
        if (data.key === 'spoilers') ws.send(JSON.stringify({ type: 'spoilers' }));
        if (data.key === 'autopilot') ws.send(JSON.stringify({ type: 'autopilot', key: 'master' }));
        if (data.key === 'apHdgHold') ws.send(JSON.stringify({ type: 'autopilot', key: 'hdg' }));
        if (data.key === 'apAltHold') ws.send(JSON.stringify({ type: 'autopilot', key: 'alt' }));
        break;
      case 'dial':
        if (data.key === 'apAlt') ws.send(JSON.stringify({ type: 'autopilot', key: 'setAlt', value: data.value }));
        if (data.key === 'apHdg') ws.send(JSON.stringify({ type: 'autopilot', key: 'setHdg', value: data.value }));
        if (data.key === 'apSpeed') ws.send(JSON.stringify({ type: 'autopilot', key: 'setSpd', value: data.value }));
        if (data.key === 'apVs') ws.send(JSON.stringify({ type: 'autopilot', key: 'setVs', value: data.value }));
        break;
      case 'switch':
        if (data.key === 'landingLights' || data.key === 'navLights' || data.key === 'strobes' || data.key === 'beacon') {
          ws.send(JSON.stringify({ type: 'lights' }));
        }
        break;
      case 'autobrake':
        ws.send(JSON.stringify({ type: 'autobrake', value: data.value }));
        break;
      case 'lights':
        ws.send(JSON.stringify({ type: 'lights' }));
        break;
    }
  });
}

// ============================================================
// START FLIGHT
// ============================================================

async function startFlight() {
  if (gameStarted) return;
  gameStarted = true;

  document.getElementById('main-menu').classList.add('hidden');
  const ls = document.getElementById('loading-screen');
  ls.classList.remove('hidden');
  const fill = document.getElementById('load-fill');
  const txt = document.getElementById('load-text');

  // Stop preview animation
  if (previewAnimId) { cancelAnimationFrame(previewAnimId); previewAnimId = null; }

  fill.style.width = '10%'; txt.textContent = 'Initializing 3D engine...';
  initScene();
  await sleep(200);

  fill.style.width = '30%'; txt.textContent = 'Loading aircraft model...';
  await sleep(200);

  fill.style.width = '50%'; txt.textContent = 'Downloading satellite terrain data...';
  terrainManager = new TerrainManager(scene, {
    lat: selectedAirport.lat, lon: selectedAirport.lon,
    elevation: selectedAirport.elev || 0,
    zoom: settings.terrainZoom, radius: settings.terrainRadius, tileWorldSize: 2000,
  });
  await terrainManager.update(0, 0);

  // 3D-Airport-Szene am Ursprung aufbauen (Runways, Terminal, Tower, Lichter)
  buildAirportScene(scene, selectedAirport);

  fill.style.width = '80%'; txt.textContent = 'Connecting to server...';
  connectWS();
  await sleep(500);

  fill.style.width = '100%'; txt.textContent = 'Ready for takeoff!';
  await sleep(300);

  ls.classList.add('hidden');
  document.getElementById('flight-hud').classList.remove('hidden');
  document.getElementById('hud-loc').textContent = selectedAirport.name;

  initCockpit();
  flightRecord = {
    startTime: Date.now(),
    startX: 0, startZ: 0,
    maxSpeed: 0,
    aircraftId: careerFlightActive && careerFlightFleetId ? careerFlightFleetId : selectedAircraft,
    career: careerFlightActive,
    credited: false,
    wasAirborne: false,
    lastVs: 0,
    lastRoll: 0,
    lastGear: true,
  };
  animate();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
// RENDER LOOP
// ============================================================

let lastTU = 0;

function animate() {
  requestAnimationFrame(animate);
  if (paused) { renderer.render(scene, camera); return; }

  for (const p of latestState) {
    const mesh = getPlayerMesh(p.id, p.aircraftType, p.airline);
    // Server legt Boden bei y=2 fest (Altminimum). Wir heben jedes Flugzeug um
    // seinen eigenen Rad-zu-Origin-Offset, damit Räder visuell den Grund berühren.
    const groundOffset = mesh.userData.groundOffset || 0;
    const visualY = p.y - 2 + groundOffset;
    mesh.position.lerp(new THREE.Vector3(p.x, visualY, p.z), 0.2);
    const euler = new THREE.Euler(p.pitch, p.yaw, -p.roll, 'YXZ');
    mesh.quaternion.slerp(new THREE.Quaternion().setFromEuler(euler), 0.2);
    mesh.traverse(c => { if (c.userData.isPropeller) c.rotation.x += p.throttle*0.8+0.15; });
    mesh.visible = p.alive;
  }

  for (const [id] of playerMeshes) {
    if (!latestState.find(p => p.id === id)) removePlayerMesh(id);
  }

  if (myId && playerMeshes.has(myId)) updateCamera(playerMeshes.get(myId));

  if (terrainManager && myState) {
    const now = Date.now();
    if (now - lastTU > 500) { lastTU = now; terrainManager.update(myState.x, myState.z); }
  }

  // Flight-Record für Career-Credit mitschreiben
  if (flightRecord && myState && myState.alive) {
    flightRecord.lastVs = myState.verticalSpeed;
    flightRecord.lastRoll = myState.roll;
    flightRecord.lastGear = myState.gear;
    if (!myState.onGround) flightRecord.wasAirborne = true;
    if (myState.speed > flightRecord.maxSpeed) flightRecord.maxSpeed = myState.speed;
  }

  if (sun && camera) {
    sun.position.copy(camera.position).add(new THREE.Vector3(2000,3000,1000));
    sun.target.position.copy(camera.position);
    sun.target.updateMatrixWorld();
  }

  updateHUD();
  updateMissionHUD();
  renderer.render(scene, camera);
}

// ============================================================
// LOGIN
// ============================================================

function getDeviceId() {
  let id = localStorage.getItem('flugsim_device_id');
  if (!id) {
    const rnd = (crypto.randomUUID && crypto.randomUUID()) ||
      ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
    id = 'dev_' + rnd;
    localStorage.setItem('flugsim_device_id', id);
  }
  return id;
}

async function verifyAccessCode(username, password) {
  try {
    const r = await fetch('/api/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, deviceId: getDeviceId() }),
    });
    return await r.json();
  } catch {
    return { ok: false, error: 'network' };
  }
}

function initLogin() {
  initCheckoutWiring();
  const loginScreen = document.getElementById('login-screen');
  const loginInput = document.getElementById('login-name');
  const accessInput = document.getElementById('login-access');
  const passwordInput = document.getElementById('login-password');
  const accessHint = document.getElementById('login-access-hint');
  const loginBtn = document.getElementById('login-btn');

  // Auto-fill (Passwort NIE persistent)
  if (pilotName && pilotName.length >= 3) loginInput.value = pilotName;
  const savedUser = localStorage.getItem('flugsim_access_user') || '';
  if (savedUser) accessInput.value = savedUser;

  function updateBtn() {
    const nameOk = loginInput.value.trim().length >= 3;
    const userOk = accessInput.value.trim().length >= 3;
    const pwOk   = passwordInput.value.length >= 4;
    loginBtn.disabled = !(nameOk && userOk && pwOk);
  }
  updateBtn();

  loginInput.addEventListener('input', updateBtn);
  passwordInput.addEventListener('input', () => {
    accessHint.textContent = 'Konto gerätgebunden — nur auf diesem Gerät nutzbar';
    accessHint.style.color = '';
    updateBtn();
  });
  accessInput.addEventListener('input', () => {
    accessInput.value = accessInput.value.toLowerCase();
    accessHint.textContent = 'Konto gerätgebunden — nur auf diesem Gerät nutzbar';
    accessHint.style.color = '';
    updateBtn();
  });

  const onEnter = (e) => { if (e.code === 'Enter' && !loginBtn.disabled) doLogin(); };
  loginInput.addEventListener('keydown', onEnter);
  accessInput.addEventListener('keydown', onEnter);
  passwordInput.addEventListener('keydown', onEnter);
  loginBtn.addEventListener('click', doLogin);

  async function doLogin() {
    const username = accessInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const name = loginInput.value.trim().slice(0, 20);
    if (name.length < 3 || username.length < 3 || password.length < 4) return;

    loginBtn.disabled = true;
    const prevText = loginBtn.textContent;
    loginBtn.textContent = 'PRÜFE …';
    accessHint.textContent = 'Prüfe Zugangsdaten …';
    accessHint.style.color = 'rgba(255,255,255,.35)';

    const res = await verifyAccessCode(username, password);
    if (!res.ok) {
      const msg = res.error === 'bound-other-device'
        ? 'Konto ist bereits an ein anderes Gerät gebunden'
        : res.error === 'bad-password'
        ? 'Falsches Passwort'
        : res.error === 'invalid-user'
        ? 'Unbekannter Benutzer'
        : res.error === 'network'
        ? 'Server nicht erreichbar'
        : 'Zugang verweigert';
      accessHint.textContent = msg;
      accessHint.style.color = '#ff5a5a';
      loginBtn.textContent = prevText;
      loginBtn.disabled = false;
      passwordInput.value = '';
      updateBtn();
      return;
    }

    localStorage.setItem('flugsim_access_user', username);
    localStorage.setItem('flugsim_access_role', res.role);

    pilotName = name;
    localStorage.setItem('flugsim_pilot', pilotName);
    ownedAircraft = loadOwnedAircraft();
    careerState = Career.loadCareer(pilotName);
    selectedAircraft = 'a320';
    selectedAirline = 'lufthansa';

    loginScreen.classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('menu-pilot-name').textContent = pilotName;

    initMenu();
    refreshMarketState();
    maybeHandleCheckoutReturn();
  }
}

// ============================================================
// BOOT
// ============================================================

initLogin();
