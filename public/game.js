import * as THREE from 'three';
import { TerrainManager } from './terrain.js';
import { createAircraftForType, createProceduralAirplane, AircraftPreview, createGLBInstance, applyLiveryToGLB } from './airplane.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AIRCRAFT_TYPES, AIRLINES, getAirlinesForAircraft, getLivery } from './airlines.js';
import { AIRPORTS, searchAirports } from './airports.js';
import { Cockpit } from './cockpit.js';
import { GamepadManager } from './gamepad.js';

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

function getInput() {
  updateKbInput();
  return {
    type: 'input',
    pitch: kbInput.pitch,
    roll: kbInput.roll,
    yaw: kbInput.yaw,
    throttle: (keys['ShiftLeft']||keys['ShiftRight']?1:0)+(keys['ControlLeft']||keys['ControlRight']?-1:0),
  };
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

    // Runway-Heading in Radians
    const rwyHdg = selectedAirport?.rwy?.[0]?.hdg || 0;
    const spawnYaw = -rwyHdg * Math.PI / 180;
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
    // Gamepad-Achsen senden
    ws.send(JSON.stringify({
      type: 'input',
      pitch: gp.pitch,
      roll: gp.roll,
      yaw: gp.yaw,
      throttle: 0, // Throttle wird separat gesetzt
    }));

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
  const hdg = (((-s.yaw*180/Math.PI)%360)+360)%360;

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
}

// ============================================================
// MENU LOGIC
// ============================================================

function initMenu() {
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
    if (ws?.readyState===1) ws.send(JSON.stringify({type:'respawn'}));
    paused=false; document.getElementById('pause-menu').classList.add('hidden');
  });
  document.getElementById('btn-quit').addEventListener('click', () => location.reload());
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

  const list = document.getElementById('ac-type-list');
  const types = Object.entries(AIRCRAFT_TYPES);
  list.innerHTML = '';
  types.forEach(([id, ac], i) => {
    const el = document.createElement('div');
    el.className = 'ac-type-item' + (id===selectedAircraft?' active':'');
    el.innerHTML = `<div class="ac-t-name">${ac.name}</div><div class="ac-t-sub">${ac.manufacturer} / ${ac.type.toUpperCase()} / ${ac.engines} Engines</div>`;
    el.addEventListener('click', () => {
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

  fill.style.width = '80%'; txt.textContent = 'Connecting to server...';
  connectWS();
  await sleep(500);

  fill.style.width = '100%'; txt.textContent = 'Ready for takeoff!';
  await sleep(300);

  ls.classList.add('hidden');
  document.getElementById('flight-hud').classList.remove('hidden');
  document.getElementById('hud-loc').textContent = selectedAirport.name;

  initCockpit();
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

  if (sun && camera) {
    sun.position.copy(camera.position).add(new THREE.Vector3(2000,3000,1000));
    sun.target.position.copy(camera.position);
    sun.target.updateMatrixWorld();
  }

  updateHUD();
  renderer.render(scene, camera);
}

// ============================================================
// LOGIN
// ============================================================

function initLogin() {
  const loginScreen = document.getElementById('login-screen');
  const loginInput = document.getElementById('login-name');
  const loginBtn = document.getElementById('login-btn');

  // Auto-fill wenn schon eingeloggt
  if (pilotName && pilotName.length >= 3) {
    loginInput.value = pilotName;
    loginBtn.disabled = false;
  }

  loginInput.addEventListener('input', () => {
    const val = loginInput.value.trim();
    loginBtn.disabled = val.length < 3;
  });

  loginInput.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' && !loginBtn.disabled) doLogin();
  });

  loginBtn.addEventListener('click', doLogin);

  function doLogin() {
    pilotName = loginInput.value.trim().slice(0, 20);
    if (pilotName.length < 3) return;
    localStorage.setItem('flugsim_pilot', pilotName);

    loginScreen.classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('menu-pilot-name').textContent = pilotName;

    initMenu();
  }
}

// ============================================================
// BOOT
// ============================================================

initLogin();
