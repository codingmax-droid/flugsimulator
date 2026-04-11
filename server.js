const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));

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
// PLAYERS
// ============================================================

let nextId = 1;
const players = new Map();

function createPlayer(id, aircraftType = 'a320', spawnOpts = {}) {
  const phys = AIRCRAFT_PHYSICS[aircraftType] || DEFAULT_PHYSICS;
  return {
    id, aircraftType, airline: '', airport: '', pilotName: '',
    x: spawnOpts.x || 0,
    y: spawnOpts.y || 5,
    z: spawnOpts.z || 0,
    pitch: 0, roll: 0,
    yaw: spawnOpts.yaw || 0,
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
    alive: true, crashReason: '', onGround: false,
    phys,
  };
}

function updatePhysics(p) {
  if (!p.alive) return;
  const input = p.input;
  const ph = p.phys;

  p.pitch += input.pitch * ph.pitchRate * DT;
  p.roll += input.roll * ph.rollRate * DT;
  p.yaw += input.yaw * ph.yawRate * DT;
  p.pitch = clamp(p.pitch, -Math.PI / 2.2, Math.PI / 2.2);
  p.yaw += Math.sin(p.roll) * 1.3 * DT;
  p.throttle = clamp(p.throttle + input.throttle * DT * 0.6, 0, 1);
  p.fuelPercent = Math.max(0, p.fuelPercent - p.throttle * 0.002 * DT);
  const fuelMult = p.fuelPercent > 0 ? 1 : 0;

  // Autopilot
  if (p.autopilot) {
    if (p.apHdgHold) {
      const tgt = -p.apHdg * Math.PI / 180;
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
  p.stallWarning = v < ph.stallSpeed * 1.3 && p.y > GROUND_LEVEL + 15;
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
  if (input.roll === 0) p.roll *= 0.97;
  if (input.pitch === 0) p.pitch *= 0.995;

  p.onGround = p.y <= GROUND_LEVEL + 3;
  if (p.y < GROUND_LEVEL + 2) {
    p.y = GROUND_LEVEL + 2;
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
  if (p.y < -50) {
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
      }
      if (msg.type === 'login') {
        const name = String(msg.name || '').trim().slice(0, 20);
        if (name.length >= 3) {
          player.pilotName = name;
          addEvent('join', `${name} (Spieler #${id}) eingeloggt`);
        }
      }
      if (msg.type === 'selectAircraft') {
        if (AIRCRAFT_PHYSICS[msg.aircraft]) {
          player.aircraftType = msg.aircraft;
          player.phys = AIRCRAFT_PHYSICS[msg.aircraft];
          player.airline = msg.airline || '';
          player.airport = msg.airport || '';
          // Spawn auf Runway
          if (msg.spawnYaw !== undefined) {
            player.yaw = msg.spawnYaw;
            player.y = 3;
            player.speed = 0;
            player.throttle = 0;
            player.parkingBrake = true;
          }
          incrStat(stats.aircraftStats, msg.aircraft.toUpperCase());
          if (msg.airline) incrStat(stats.airlineStats, msg.airline);
          if (msg.airport) incrStat(stats.airportStats, msg.airport);
        }
      }
      if (msg.type === 'flaps') player.flaps = clamp(Math.round(msg.value), 0, 4);
      if (msg.type === 'gear' && player.y > GROUND_LEVEL + 10) player.gear = !player.gear;
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
      if (msg.type === 'respawn') {
        const { aircraftType, airline, airport, phys, yaw } = player;
        Object.assign(player, createPlayer(id, aircraftType, { yaw, y: 3, onRunway: true }));
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
