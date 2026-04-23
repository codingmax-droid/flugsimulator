// ============================================================
// COCKPIT 3D — Realistisches Airbus-inspiriertes Cockpit
// ============================================================
// Detailliertes Cockpit mit beschrifteten Panels, FMA-Bar auf dem PFD,
// Autopilot-FCU mit Drehreglern, Overhead-Panel mit 3 Reihen, guarded
// Engine-Start-Schaltern, Master-Warning/Caution-Leuchten, MCDU,
// Radio-Panel, Chronometer, Rudder-Pedalen und animiertem Yoke.

import * as THREE from 'three';

const DEG = Math.PI / 180;

// Airbus-inspirierte Farbpalette
const COL = {
  shell:       0x2d2e2a,
  sidewall:    0x3a3b35,
  floor:       0x15150f,
  ceiling:     0x232420,
  panel:       0x0c0c10,   // Instrumenten-Panel dunkel
  pedestal:    0x454539,   // Pedestal graubeige
  overhead:    0x4a4a3d,   // Overhead graubeige
  panelTrim:   0x3c3c33,
  glareshield: 0x14140e,   // fast schwarz
  metalLight:  0xc8c8c8,
  screenBezel: 0x080808,
};

export class Cockpit3D {
  constructor(scene, onAction) {
    this.scene = scene;
    this.onAction = onAction;

    this.group = new THREE.Group();
    this.group.visible = false;
    this.scene.add(this.group);

    this.clickables = [];
    this.hovered = null;
    this._hoverOrigEmissive = null;

    this.seatLocal = new THREE.Vector3(0, 1.28, -0.05);
    this.lookLocal = new THREE.Vector3(0, 1.22, 1.0);

    this.input = { pitch: 0, roll: 0, yaw: 0 };

    this.flight = {
      speed: 0, altitude: 0, vs: 0, heading: 0,
      pitch: 0, roll: 0, throttle: 0, fuel: 1, gLoad: 1,
      flaps: 0, gear: true, spoilers: false, brakes: false,
      parkingBrake: false, lights: false, autopilot: false,
      stallWarning: false,
    };

    // Lokaler Schalter-/Dialzustand
    this.s = {
      // Electrical / Power
      batt1: true, batt2: true, apuMaster: false, apuStart: false,
      extPwr: false, gen1: true, gen2: true, busTie: true,
      // Engines
      eng1Master: false, eng2Master: false, ignStart: 'norm', // norm/start/ignA/ignB
      // Fuel
      fuelPump1L: true, fuelPump1R: true, fuelPump2L: true, fuelPump2R: true,
      // Hydraulics
      hydG: true, hydB: true, hydY: true,
      // Ice / Rain
      pitotHeat: false, antiIce: false,
      // Pax / Cabin
      seatbelt: true, noSmoke: true,
      // Lights
      landingL: false, taxiL: false, navL: true, strobe: true, beacon: false, logoL: true,
      // AP
      apSpeed: 250, apHdg: 0, apAlt: 10000, apVs: 0,
      apHdgHold: false, apAltHold: false, apVnav: false, apAppr: false, apLoc: false,
      fdOn: true,
      // Autobrake
      autobrake: 0,
      // Warning state
      masterWarn: false, masterCaut: false,
    };

    this.parts = {};
    this.textures = {};

    this._build();
  }

  setVisible(v) { this.group.visible = !!v; }
  isVisible() { return this.group.visible; }

  followAircraft(mesh) {
    if (!mesh) return;
    this.group.position.copy(mesh.position);
    this.group.quaternion.copy(mesh.quaternion);
  }

  applyCameraPose(camera) {
    this.group.updateMatrixWorld(true);
    const seatW = this.seatLocal.clone().applyMatrix4(this.group.matrixWorld);
    const lookW = this.lookLocal.clone().applyMatrix4(this.group.matrixWorld);
    camera.position.copy(seatW);
    camera.up.set(0, 1, 0).applyQuaternion(this.group.quaternion);
    camera.lookAt(lookW);
  }

  setFlightState(s) {
    if (!s) return;
    this.flight.speed = s.speed || 0;
    this.flight.altitude = s.y || 0;
    this.flight.vs = s.verticalSpeed || 0;
    this.flight.heading = ((((Math.PI - (s.yaw || 0)) * 180 / Math.PI) % 360) + 360) % 360;
    this.flight.pitch = s.pitch || 0;
    this.flight.roll = s.roll || 0;
    this.flight.throttle = s.throttle || 0;
    this.flight.fuel = s.fuelPercent !== undefined ? s.fuelPercent / 100 : 1;
    this.flight.gLoad = s.gForce !== undefined ? s.gForce : 1;
    this.flight.flaps = s.flaps || 0;
    this.flight.gear = !!s.gear;
    this.flight.spoilers = !!s.spoilers;
    this.flight.brakes = !!s.brakes;
    this.flight.parkingBrake = !!s.parkingBrake;
    this.flight.lights = !!s.lights;
    this.flight.autopilot = !!s.autopilot;
    this.flight.stallWarning = !!s.stallWarning;
    if (s.apAltHold !== undefined) this.s.apAltHold = !!s.apAltHold;
    if (s.apHdgHold !== undefined) this.s.apHdgHold = !!s.apHdgHold;

    // Master warnings
    this.s.masterWarn = this.flight.stallWarning || this.flight.fuel < 0.05 || Math.abs(this.flight.gLoad) > 3.5;
    this.s.masterCaut = this.flight.fuel < 0.15 && this.flight.fuel >= 0.05;

    this._updateDynamic();
  }

  setInput(pitch, roll, yaw) {
    this.input.pitch = pitch;
    this.input.roll = roll;
    this.input.yaw = yaw;
    this._animateYoke();
    this._animatePedals();
  }

  // ============================================================
  // BUILD
  // ============================================================

  _build() {
    this._buildShell();
    this._buildGlareshield();
    this._buildMainPanel();
    this._buildFCU();
    this._buildCenterPedestal();
    this._buildMCDUandRadio();
    this._buildOverhead();
    this._buildYoke();
    this._buildRudderPedals();
    this._buildSeats();
    this._buildChronoAndWarnings();
    this._buildCockpitLighting();
  }

  // ------------------------------------------------------------
  // SHELL — Boden, Decke, Seiten, Windschutzrahmen
  // ------------------------------------------------------------

  _buildShell() {
    const shellMat = new THREE.MeshStandardMaterial({ color: COL.shell, roughness: 0.85, metalness: 0.03 });
    const sideMat = new THREE.MeshStandardMaterial({ color: COL.sidewall, roughness: 0.9 });
    const floorMat = new THREE.MeshStandardMaterial({ color: COL.floor, roughness: 0.95 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: COL.ceiling, roughness: 0.85 });

    // Boden
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 2.6), floorMat);
    floor.position.set(0, 0.02, 0.4);
    this.group.add(floor);

    // Teppich auf Boden (etwas heller)
    const carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x232319, roughness: 1 })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.046, 0.1);
    this.group.add(carpet);

    // Decke
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 2.6), ceilMat);
    ceil.position.set(0, 2.15, 0.4);
    this.group.add(ceil);

    // Rückwand
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.1, 0.08), shellMat);
    back.position.set(0, 1.1, -0.85);
    this.group.add(back);

    // Seitenwände mit strukturiertem Look
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.1, 2.6), sideMat);
      wall.position.set(1.2 * side, 1.1, 0.4);
      this.group.add(wall);
      // Seitenfenster-Pfosten
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.06), shellMat);
      post.position.set(1.17 * side, 1.7, 1.4);
      this.group.add(post);
    }

    // Windschutzrahmen — obere Kante (gewölbt in drei Segmenten für Airbus-Look)
    for (let i = -1; i <= 1; i++) {
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.14, 0.12),
        shellMat
      );
      seg.position.set(i * 0.72, 1.98 + Math.abs(i) * -0.03, 1.55);
      seg.rotation.z = i * 0.04;
      this.group.add(seg);
    }

    // A-Säulen (geneigt nach innen)
    for (const side of [-1, 1]) {
      const apill = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.9, 0.1),
        shellMat
      );
      apill.position.set(side * 1.12, 1.55, 1.45);
      apill.rotation.z = side * 0.12;
      this.group.add(apill);
    }

    // Mittelpfeiler der Frontscheibe
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.7, 0.09), shellMat);
    post.position.set(0, 1.65, 1.56);
    this.group.add(post);

    // Fensterbank (darunter leicht beleuchteter Balken)
    const sill = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.04, 0.1),
      new THREE.MeshStandardMaterial({ color: COL.panelTrim, roughness: 0.8 })
    );
    sill.position.set(0, 1.35, 1.46);
    this.group.add(sill);

    // Dachleisten
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.6), shellMat);
      edge.position.set(1.15 * side, 2.1, 0.4);
      this.group.add(edge);
    }
  }

  // ------------------------------------------------------------
  // GLARESHIELD — dunkle Leiste über dem Panel (Airbus: fast schwarz)
  // ------------------------------------------------------------

  _buildGlareshield() {
    const gs = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.14, 0.4),
      new THREE.MeshStandardMaterial({ color: COL.glareshield, roughness: 0.6 })
    );
    gs.position.set(0, 1.54, 0.88);
    gs.rotation.x = -0.14;
    this.group.add(gs);

    // Augenbrauen-Leseleuchten (kleine Zylinder unterhalb)
    for (const x of [-0.9, -0.3, 0.3, 0.9]) {
      const lamp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.04, 10),
        new THREE.MeshStandardMaterial({ color: 0x181818, emissive: 0xffcc88, emissiveIntensity: 0.25 })
      );
      lamp.rotation.z = Math.PI / 2;
      lamp.position.set(x, 1.49, 1.03);
      this.group.add(lamp);
    }
  }

  // ------------------------------------------------------------
  // MAIN PANEL — 6 Displays (Airbus: PFD, ND, EWD, SD, Standby)
  // ------------------------------------------------------------

  _buildMainPanel() {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.58, 0.1),
      new THREE.MeshStandardMaterial({ color: COL.panel, roughness: 0.75, metalness: 0.1 })
    );
    panel.position.set(0, 1.18, 0.9);
    panel.rotation.x = -0.22;
    this.group.add(panel);

    // Gemeinsamer Rotations-Container für alle Displays (gleiche Neigung)
    const panelFrame = new THREE.Group();
    panelFrame.position.set(0, 1.18, 0.9);
    panelFrame.rotation.x = -0.22;
    this.group.add(panelFrame);

    // Display-Positionen in Panel-Local-Coords (y=0 Mitte, x=horizontal)
    const dz = 0.055; // leicht vor dem Panel
    this.parts.pfd = this._addDisplay(panelFrame, -0.63, 0.03, dz, 0.32, 0.32, 'pfd', 512);
    this.parts.nd  = this._addDisplay(panelFrame, -0.22, 0.03, dz, 0.32, 0.32, 'nd',  512);
    this.parts.ewd = this._addDisplay(panelFrame,  0.20, 0.03, dz, 0.28, 0.32, 'ewd', 512);
    this.parts.sd  = this._addDisplay(panelFrame,  0.58, 0.03, dz, 0.28, 0.22, 'sd',  512);
    this.parts.sby = this._addDisplay(panelFrame,  0.58, -0.17, dz, 0.22, 0.1, 'sby', 256);

    this._renderPFD();
    this._renderND();
    this._renderEWD();
    this._renderSD();
    this._renderStandby();
  }

  _addDisplay(parent, x, y, z, w, h, key, res) {
    // Bezel (Rahmen)
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.02, h + 0.02, 0.012),
      new THREE.MeshStandardMaterial({ color: COL.screenBezel, roughness: 0.5, metalness: 0.4 })
    );
    bezel.position.set(x, y, z - 0.005);
    parent.add(bezel);

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.width = res; canvas.height = Math.round(res * (h / w));
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    );
    screen.position.set(x, y, z);
    parent.add(screen);

    this.textures[key] = tex;
    this[`${key}Canvas`] = canvas;
    this[`${key}Ctx`] = ctx;
    return { screen, bezel, canvas, ctx, tex };
  }

  // ------------------------------------------------------------
  // FCU — Airbus Flight Control Unit (Autopilot)
  // ------------------------------------------------------------

  _buildFCU() {
    const frame = new THREE.Group();
    frame.position.set(0, 1.525, 0.81);
    frame.rotation.x = -0.38;
    this.group.add(frame);

    // FCU-Gehäuse
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.18, 0.12),
      new THREE.MeshStandardMaterial({ color: COL.overhead, roughness: 0.7 })
    );
    frame.add(body);

    // FCU-Digitalanzeige (SPD / HDG / ALT / V/S)
    this.fcuCanvas = document.createElement('canvas');
    this.fcuCanvas.width = 1024; this.fcuCanvas.height = 120;
    this.fcuCtx = this.fcuCanvas.getContext('2d');
    this.textures.fcu = new THREE.CanvasTexture(this.fcuCanvas);
    this.textures.fcu.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(1.32, 0.09),
      new THREE.MeshBasicMaterial({ map: this.textures.fcu, toneMapped: false })
    );
    face.position.set(0, 0.035, 0.062);
    frame.add(face);
    this._renderFCU();

    // Drehknöpfe (SPD / HDG / ALT / V/S) als dreh-aussehende Zylinder
    const dials = [
      { key: 'apSpeed', x: -0.49, step: 1, min: 100, max: 400 },
      { key: 'apHdg',   x: -0.16, step: 1, min: 0,   max: 359, wrap: true },
      { key: 'apAlt',   x:  0.18, step: 100, min: 0, max: 45000 },
      { key: 'apVs',    x:  0.51, step: 100, min: -3000, max: 3000 },
    ];
    this.parts.fcuKnobs = {};
    for (const d of dials) {
      const knob = this._makeRotaryKnob(frame, d.x, -0.04, 0.072, 0.028, d);
      this.parts.fcuKnobs[d.key] = knob;
    }

    // AP1/AP2/A/THR/LOC/APPR/EXPED-Buttons
    const btns = [
      { x: -0.56, key: 'autopilot', label: 'AP1', color: 0x22cc44 },
      { x: -0.40, key: 'fdOn',      label: 'FD',  color: 0x22cc44 },
      { x: -0.22, key: 'apHdgHold', label: 'HDG', color: 0xffaa33 },
      { x: -0.06, key: 'apLoc',     label: 'LOC', color: 0xffaa33 },
      { x:  0.10, key: 'apAltHold', label: 'ALT', color: 0xffaa33 },
      { x:  0.27, key: 'apVnav',    label: 'VNV', color: 0xffaa33 },
      { x:  0.42, key: 'apAppr',    label: 'APPR',color: 0xffaa33 },
    ];
    this.parts.mcpBtns = {};
    for (const b of btns) {
      const btn = this._addLocalButton(frame, b.x, -0.065, 0.065, 0.019, b.color,
        { type: 'mcpBtn', key: b.key });
      this.parts.mcpBtns[b.key] = btn;
    }
  }

  _makeRotaryKnob(parent, x, y, z, r, dialCfg) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 1.15, r * 1.15, 0.005, 20),
      new THREE.MeshStandardMaterial({ color: 0x151515 })
    );
    base.rotation.x = Math.PI / 2;
    g.add(base);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r * 0.98, 0.02, 20),
      new THREE.MeshStandardMaterial({ color: 0x27272b, metalness: 0.45, roughness: 0.45 })
    );
    body.rotation.x = Math.PI / 2;
    body.position.z = 0.012;
    g.add(body);

    // Riffelung als kleine Zylinder-Segmente
    for (let i = 0; i < 16; i++) {
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(0.004, 0.018, r * 0.2),
        new THREE.MeshStandardMaterial({ color: 0x141416 })
      );
      const a = (i / 16) * Math.PI * 2;
      seg.position.set(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, 0.014);
      seg.rotation.z = a + Math.PI / 2;
      g.add(seg);
    }

    // Marker (weißer Strich)
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, r * 0.8, 0.003),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222 })
    );
    marker.position.set(0, r * 0.35, 0.026);
    g.add(marker);
    // Inc/Dec-Hitbox über den Knopf
    const hit = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 1.1, r * 1.1, 0.03, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.rotation.x = Math.PI / 2;
    hit.position.z = 0.02;
    hit.userData.clickable = true;
    hit.userData.action = { type: 'dial', ...dialCfg, delta: dialCfg.step };
    this.clickables.push(hit);
    g.add(hit);

    return { group: g, marker };
  }

  _addLocalButton(parent, x, y, z, size, color, action) {
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: 0x000000, roughness: 0.35, metalness: 0.25,
    });
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(size, size, 0.012, 16), mat);
    btn.position.set(x, y, z);
    btn.rotation.x = Math.PI / 2;
    btn.userData.clickable = true;
    btn.userData.action = action;
    this.clickables.push(btn);
    parent.add(btn);
    return btn;
  }

  // ------------------------------------------------------------
  // CENTER PEDESTAL — Throttle, Flap, Gear, Spoiler, Parking, Autobrake
  // ------------------------------------------------------------

  _buildCenterPedestal() {
    const pedMat = new THREE.MeshStandardMaterial({ color: COL.pedestal, roughness: 0.8 });
    const trimMat = new THREE.MeshStandardMaterial({ color: COL.panelTrim, roughness: 0.7 });

    // Pedestal-Körper (größer und höher für realistischen Look)
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.75), pedMat);
    pedestal.position.set(0, 0.67, 0.4);
    this.group.add(pedestal);

    // Top-Plate
    const topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.02, 0.75), trimMat);
    topPlate.position.set(0, 0.945, 0.4);
    this.group.add(topPlate);

    // Throttle-Slot-Bezeichnungen per Canvas auf Top-Plate
    const topCanvas = document.createElement('canvas');
    topCanvas.width = 256; topCanvas.height = 400;
    const tctx = topCanvas.getContext('2d');
    tctx.fillStyle = '#45453a'; tctx.fillRect(0, 0, 256, 400);
    tctx.fillStyle = '#222'; tctx.fillRect(8, 8, 240, 384);
    tctx.fillStyle = '#d8d8c8'; tctx.font = 'bold 14px Arial';
    tctx.textAlign = 'center';
    tctx.fillText('THR 1', 70, 40); tctx.fillText('THR 2', 186, 40);
    tctx.fillText('FLAPS', 186, 180); tctx.fillText('SPD BRK', 70, 180);
    tctx.fillText('PARK BRK', 128, 360);
    const topTex = new THREE.CanvasTexture(topCanvas);
    topTex.colorSpace = THREE.SRGBColorSpace;
    const topDecor = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.72),
      new THREE.MeshBasicMaterial({ map: topTex, toneMapped: false })
    );
    topDecor.rotation.x = -Math.PI / 2;
    topDecor.position.set(0, 0.956, 0.4);
    this.group.add(topDecor);

    // THROTTLES (2 Stück) — realistischere Hebel mit Sägezahn-Griff
    this.parts.throttles = [];
    for (let i = 0; i < 2; i++) {
      const x = i === 0 ? -0.07 : 0.07;
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.28), new THREE.MeshStandardMaterial({ color: 0x050505 }));
      slot.position.set(x, 0.966, 0.30);
      this.group.add(slot);

      const pivot = new THREE.Group();
      pivot.position.set(x, 0.955, 0.40);
      this.group.add(pivot);

      // Hebelarm
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.022, 0.022, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.55, roughness: 0.4 })
      );
      arm.position.set(0, 0.045, -0.04);
      pivot.add(arm);

      // Hebelkopf — TO/GA-förmig
      const knob = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.11, 0.09),
        new THREE.MeshStandardMaterial({ color: 0x0f0f0f, roughness: 0.5 })
      );
      knob.position.set(0, 0.12, -0.135);
      pivot.add(knob);
      knob.userData.clickable = true;
      knob.userData.action = { type: 'throttleDrag', key: `th${i}`, pivot };
      this.clickables.push(knob);

      // Hebelkopf-Struktur (Riffelung vorne)
      for (let r = 0; r < 4; r++) {
        const rib = new THREE.Mesh(
          new THREE.BoxGeometry(0.075, 0.008, 0.01),
          new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
        );
        rib.position.set(0, 0.08 + r * 0.02, -0.09);
        pivot.add(rib);
      }

      // TO/GA Button auf Hebelkopf
      const togaMat = new THREE.MeshStandardMaterial({ color: 0x1a4a1a, emissive: 0x226622, emissiveIntensity: 0.3 });
      const toga = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.008, 12), togaMat);
      toga.rotation.x = Math.PI / 2;
      toga.position.set(0, 0.14, -0.175);
      pivot.add(toga);

      this.parts.throttles.push({ pivot, knob });
    }

    // FLAP LEVER (rechts) — mit Detent-Kerben auf Plate
    const flapGroup = new THREE.Group();
    flapGroup.position.set(0.15, 0.96, 0.24);
    this.group.add(flapGroup);

    const flapPlateCanvas = document.createElement('canvas');
    flapPlateCanvas.width = 64; flapPlateCanvas.height = 256;
    const fctx = flapPlateCanvas.getContext('2d');
    fctx.fillStyle = '#080808'; fctx.fillRect(0, 0, 64, 256);
    fctx.fillStyle = '#d0d0c0'; fctx.font = 'bold 11px Arial'; fctx.textAlign = 'left';
    const flapLabels = ['FULL','3','2','1','UP'];
    for (let i = 0; i < 5; i++) {
      const y = 20 + i * 54;
      fctx.fillText(flapLabels[i], 40, y + 4);
      fctx.fillRect(8, y, 24, 2);
    }
    const flapTex = new THREE.CanvasTexture(flapPlateCanvas);
    flapTex.colorSpace = THREE.SRGBColorSpace;
    const flapPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.05, 0.22),
      new THREE.MeshBasicMaterial({ map: flapTex, toneMapped: false })
    );
    flapPlate.rotation.x = -Math.PI / 2;
    flapGroup.add(flapPlate);

    const flapLeverGroup = new THREE.Group();
    flapGroup.add(flapLeverGroup);
    this.parts.flapLever = flapLeverGroup;

    const flapArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.02, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x8a8a90, metalness: 0.7 })
    );
    flapArm.position.z = -0.05;
    flapLeverGroup.add(flapArm);
    const flapKnob = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.07, 0.055),
      new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.5 })
    );
    flapKnob.position.set(0, 0.04, -0.1);
    flapLeverGroup.add(flapKnob);
    flapKnob.userData.clickable = true;
    flapKnob.userData.action = { type: 'flapCycle' };
    this.clickables.push(flapKnob);

    // GEAR LEVER — großer weißer Radgriff, rechts vorne
    const gearGroup = new THREE.Group();
    gearGroup.position.set(0.33, 1.15, 0.72);
    gearGroup.rotation.x = -0.25;
    this.group.add(gearGroup);
    this.parts.gearLever = gearGroup;

    const gearArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.7, roughness: 0.35 })
    );
    gearArm.position.y = -0.08;
    gearGroup.add(gearArm);
    const gearWheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.055, 0.025, 16, 28),
      new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.4 })
    );
    gearWheel.rotation.y = Math.PI / 2;
    gearGroup.add(gearWheel);
    gearWheel.userData.clickable = true;
    gearWheel.userData.action = { type: 'gearToggle' };
    this.clickables.push(gearWheel);
    // 3 grüne Gear-Down-Leuchten rechts über dem Hebel
    this.parts.gearLamps = [];
    for (let i = 0; i < 3; i++) {
      const lamp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.003, 12),
        new THREE.MeshStandardMaterial({ color: 0x112211, emissive: 0x33ff44, emissiveIntensity: 0.5 })
      );
      lamp.rotation.x = Math.PI / 2;
      lamp.position.set(0.33, 1.27 - i * 0.022, 0.78);
      this.group.add(lamp);
      this.parts.gearLamps.push(lamp);
    }

    // SPOILER LEVER (links)
    const spGroup = new THREE.Group();
    spGroup.position.set(-0.15, 0.96, 0.24);
    this.group.add(spGroup);

    const spPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.015, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x060606 })
    );
    spPlate.position.y = -0.006;
    spGroup.add(spPlate);

    const spArm = new THREE.Group();
    spGroup.add(spArm);
    this.parts.spoilerArm = spArm;
    const spShaft = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.018, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xee9900, metalness: 0.3 })
    );
    spShaft.position.z = -0.04;
    spArm.add(spShaft);
    const spKnob = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0xff7700 })
    );
    spKnob.position.set(0, 0.015, -0.09);
    spArm.add(spKnob);
    spKnob.userData.clickable = true;
    spKnob.userData.action = { type: 'spoilersToggle' };
    this.clickables.push(spKnob);

    // PARKING BRAKE — roter Hebel mit "P" Logo
    const pbGroup = new THREE.Group();
    pbGroup.position.set(0, 0.96, 0.65);
    this.group.add(pbGroup);
    this.parts.parkingBrake = pbGroup;

    const pbArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.11, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x550000, roughness: 0.6 })
    );
    pbArm.position.y = 0.055;
    pbGroup.add(pbArm);
    const pbKnob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16),
      new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.5 })
    );
    pbKnob.rotation.z = Math.PI / 2;
    pbKnob.position.y = 0.12;
    pbGroup.add(pbKnob);
    pbKnob.userData.clickable = true;
    pbKnob.userData.action = { type: 'parkingBrakeToggle' };
    this.clickables.push(pbKnob);

    // Autobrake-Drehschalter mit LEDs für Positionen
    this._buildAutobrake();
    this._buildTrimWheel();
    this._buildEngineMasters();
  }

  _buildAutobrake() {
    const g = new THREE.Group();
    g.position.set(0.08, 0.96, 0.55);
    this.group.add(g);
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.02, 20),
      new THREE.MeshStandardMaterial({ color: 0x19191c })
    );
    body.position.y = 0.01;
    g.add(body);
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.033, 0.04, 0.025, 20),
      new THREE.MeshStandardMaterial({ color: 0x2c2c30, metalness: 0.4 })
    );
    knob.position.y = 0.035;
    g.add(knob);
    const pointer = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.005, 0.008),
      new THREE.MeshStandardMaterial({ color: 0xffcc33, emissive: 0xff9900, emissiveIntensity: 0.5 })
    );
    pointer.position.set(0.022, 0.049, 0);
    knob.add(pointer);
    this.parts.autobrakeKnob = knob;
    knob.userData.clickable = true;
    knob.userData.action = { type: 'autobrakeCycle' };
    this.clickables.push(knob);

    // Positionsmarker (OFF/LO/MED/HI/MAX) auf Grundplatte
    const labels = ['OFF','LO','MED','HI','MAX'];
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 128;
    const c = cv.getContext('2d');
    c.fillStyle = '#1a1a1a'; c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#d8d8c8'; c.font = 'bold 10px Arial'; c.textAlign = 'center';
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * Math.PI / 4;
      const lx = 64 + Math.cos(a - Math.PI / 2) * 50;
      const ly = 64 + Math.sin(a - Math.PI / 2) * 50;
      c.fillText(labels[i], lx, ly + 4);
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const ring = new THREE.Mesh(
      new THREE.PlaneGeometry(0.11, 0.11),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.021, 0);
    g.add(ring);
  }

  _buildTrimWheel() {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.04, 28),
      new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.55 })
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(-0.235, 0.88, 0.4);
    this.group.add(wheel);
    for (let i = 0; i < 10; i++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.004, 0.022, 0.13),
        new THREE.MeshStandardMaterial({ color: 0x555555 })
      );
      spoke.rotation.z = (i / 10) * Math.PI * 2;
      wheel.add(spoke);
    }
    // Trim-Skala
    const trimInd = new THREE.Mesh(
      new THREE.PlaneGeometry(0.04, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x111111 })
    );
    trimInd.position.set(-0.235, 0.88, 0.48);
    this.group.add(trimInd);
  }

  _buildEngineMasters() {
    // Engine-Master-Schalter (weiß/schwarz, zwischen Throttle und MCDU)
    for (let i = 0; i < 2; i++) {
      const x = i === 0 ? -0.07 : 0.07;
      const g = new THREE.Group();
      g.position.set(x, 0.97, 0.55);
      this.group.add(g);

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.02, 0.065),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      g.add(base);
      const slider = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.025, 0.025),
        new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 0.45 })
      );
      slider.position.set(0, 0.02, this.s[`eng${i+1}Master`] ? 0.015 : -0.015);
      g.add(slider);
      slider.userData.clickable = true;
      slider.userData.action = { type: 'toggle', key: `eng${i+1}Master` };
      this.clickables.push(slider);
      if (!this.parts.engMasters) this.parts.engMasters = [];
      this.parts.engMasters.push(slider);
    }
  }

  // ------------------------------------------------------------
  // MCDU + RADIO PANEL
  // ------------------------------------------------------------

  _buildMCDUandRadio() {
    // MCDU (Flight Management)
    const mcduCanvas = document.createElement('canvas');
    mcduCanvas.width = 512; mcduCanvas.height = 400;
    this.mcduCanvas = mcduCanvas;
    this.mcduCtx = mcduCanvas.getContext('2d');
    this.textures.mcdu = new THREE.CanvasTexture(mcduCanvas);
    this.textures.mcdu.colorSpace = THREE.SRGBColorSpace;

    const mcduScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.12),
      new THREE.MeshBasicMaterial({ map: this.textures.mcdu, toneMapped: false })
    );
    mcduScreen.position.set(0, 0.95, 0.73);
    mcduScreen.rotation.x = -Math.PI / 2 + 0.4;
    this.group.add(mcduScreen);
    // MCDU-Tastatur-Panel (unter dem Screen)
    const mcduKb = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.02, 0.22),
      new THREE.MeshStandardMaterial({ color: COL.pedestal, roughness: 0.75 })
    );
    mcduKb.position.set(0, 0.94, 0.63);
    mcduKb.rotation.x = -Math.PI / 2 + 0.4;
    this.group.add(mcduKb);
    // Einige Tasten andeuten
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const key = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 0.004, 8),
          new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        key.rotation.x = Math.PI / 2;
        key.position.set(-0.06 + c * 0.04, 0.952, 0.56 + r * 0.025);
        this.group.add(key);
      }
    }

    // Radio-Panel (links und rechts vom MCDU)
    const radioCanvas = document.createElement('canvas');
    radioCanvas.width = 384; radioCanvas.height = 128;
    this.radioCanvas = radioCanvas;
    this.radioCtx = radioCanvas.getContext('2d');
    this.textures.radio = new THREE.CanvasTexture(radioCanvas);
    this.textures.radio.colorSpace = THREE.SRGBColorSpace;
    const radioScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.17, 0.055),
      new THREE.MeshBasicMaterial({ map: this.textures.radio, toneMapped: false })
    );
    // Vor dem MCDU (näher am Piloten), auf Pedestal
    radioScreen.position.set(0, 0.957, 0.44);
    radioScreen.rotation.x = -Math.PI / 2;
    this.group.add(radioScreen);

    this._renderMCDU();
    this._renderRadio();
  }

  // ------------------------------------------------------------
  // OVERHEAD PANEL — 3 Reihen, beschriftetes Canvas-Backdrop
  // ------------------------------------------------------------

  _buildOverhead() {
    // Panel mit geprinteter Label-Textur
    const ohCanvas = document.createElement('canvas');
    ohCanvas.width = 1024; ohCanvas.height = 512;
    const octx = ohCanvas.getContext('2d');
    // Airbus-Grau-Beige Hintergrund
    octx.fillStyle = '#4a4a3d'; octx.fillRect(0, 0, 1024, 512);
    // Leichte Panel-Segment-Trennungen
    octx.strokeStyle = '#2a2a20'; octx.lineWidth = 3;
    octx.strokeRect(8, 8, 1008, 496);
    // Sektionsüberschriften
    const sections = [
      { x: 40,   w: 260, title: 'ELEC' },
      { x: 310,  w: 220, title: 'FUEL' },
      { x: 540,  w: 200, title: 'HYD' },
      { x: 750,  w: 260, title: 'EXT LT / A-ICE' },
    ];
    octx.fillStyle = '#1a1a12'; octx.font = 'bold 18px Arial'; octx.textAlign = 'center';
    for (const s of sections) {
      octx.fillStyle = '#2a2a22'; octx.fillRect(s.x, 20, s.w, 24);
      octx.fillStyle = '#d0d0bc'; octx.fillText(s.title, s.x + s.w/2, 37);
      octx.strokeStyle = '#2a2a1e'; octx.strokeRect(s.x, 20, s.w, 460);
    }

    const ohTex = new THREE.CanvasTexture(ohCanvas);
    ohTex.colorSpace = THREE.SRGBColorSpace;

    // Panel-Platte mit Textur
    const panelPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.7),
      new THREE.MeshStandardMaterial({ map: ohTex, roughness: 0.75 })
    );
    panelPlate.position.set(0, 2.02, 0.5);
    panelPlate.rotation.x = Math.PI / 2 - 0.35;
    this.group.add(panelPlate);

    // Overhead-Frame (tieferer Körper)
    const panelBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.7, 0.06),
      new THREE.MeshStandardMaterial({ color: COL.overhead, roughness: 0.75 })
    );
    panelBody.position.set(0, 2.04, 0.502);
    panelBody.rotation.x = Math.PI / 2 - 0.35;
    this.group.add(panelBody);

    // Switches: key, section, col, row, label, guarded?
    const toggles = [
      // ELEC
      { key: 'batt1',    sec: 0, col: 0, row: 0, label: 'BATT 1' },
      { key: 'batt2',    sec: 0, col: 1, row: 0, label: 'BATT 2' },
      { key: 'extPwr',   sec: 0, col: 2, row: 0, label: 'EXT PWR' },
      { key: 'gen1',     sec: 0, col: 0, row: 1, label: 'GEN 1' },
      { key: 'gen2',     sec: 0, col: 1, row: 1, label: 'GEN 2' },
      { key: 'busTie',   sec: 0, col: 2, row: 1, label: 'BUS TIE' },
      { key: 'apuMaster',sec: 0, col: 0, row: 2, label: 'APU MSTR' },
      { key: 'apuStart', sec: 0, col: 1, row: 2, label: 'APU STRT' },

      // FUEL
      { key: 'fuelPump1L', sec: 1, col: 0, row: 0, label: 'PUMP 1L' },
      { key: 'fuelPump1R', sec: 1, col: 1, row: 0, label: 'PUMP 1R' },
      { key: 'fuelPump2L', sec: 1, col: 0, row: 1, label: 'PUMP 2L' },
      { key: 'fuelPump2R', sec: 1, col: 1, row: 1, label: 'PUMP 2R' },

      // HYD
      { key: 'hydG',     sec: 2, col: 0, row: 0, label: 'HYD G' },
      { key: 'hydB',     sec: 2, col: 1, row: 0, label: 'HYD B' },
      { key: 'hydY',     sec: 2, col: 0, row: 1, label: 'HYD Y' },

      // EXT LT / ANTI-ICE
      { key: 'landingL', sec: 3, col: 0, row: 0, label: 'LAND' },
      { key: 'taxiL',    sec: 3, col: 1, row: 0, label: 'TAXI' },
      { key: 'navL',     sec: 3, col: 2, row: 0, label: 'NAV' },
      { key: 'strobe',   sec: 3, col: 0, row: 1, label: 'STROBE' },
      { key: 'beacon',   sec: 3, col: 1, row: 1, label: 'BCN' },
      { key: 'logoL',    sec: 3, col: 2, row: 1, label: 'LOGO' },
      { key: 'pitotHeat',sec: 3, col: 0, row: 2, label: 'PITOT' },
      { key: 'antiIce',  sec: 3, col: 1, row: 2, label: 'A/ICE' },
      { key: 'seatbelt', sec: 3, col: 2, row: 2, label: 'SEAT' },
    ];

    // Panel in 4 Sektionen aufgeteilt: x-Bereiche
    const sectionsX = [
      { xStart: -0.55, colW: 0.12 },
      { xStart: -0.20, colW: 0.12 },
      { xStart:  0.05, colW: 0.12 },
      { xStart:  0.30, colW: 0.1  },
    ];

    this.parts.toggles = {};
    for (const t of toggles) {
      const sec = sectionsX[t.sec];
      const px = sec.xStart + t.col * sec.colW;
      const pz = 0.4 + t.row * 0.13;
      // Panel-Rotation (0.35 rad) -> y steigt leicht mit z
      const py = 2.05 + (t.row - 1) * 0.045;
      const sw = this._makeToggleSwitch(px, py, pz, this.s[t.key], t.key, t.label);
      this.parts.toggles[t.key] = sw;
    }

    // Guarded Engine-Start-Switches im ELEC-Bereich (statt alter eng1/eng2)
    this.parts.guarded = this.parts.guarded || {};
    this.parts.guarded.eng1Master = this._makeGuardedSwitch(-0.45, 2.13, 0.8, 'eng1Master', 'ENG 1 FIRE');
    this.parts.guarded.eng2Master = this._makeGuardedSwitch(-0.33, 2.13, 0.8, 'eng2Master', 'ENG 2 FIRE');
  }

  _makeToggleSwitch(x, y, z, initialOn, key, label) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.x = 0.35;
    this.group.add(g);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.022, 0.008, 12),
      new THREE.MeshStandardMaterial({ color: 0x0f0f0f, metalness: 0.4 })
    );
    base.rotation.x = Math.PI / 2;
    g.add(base);

    const lever = new THREE.Group();
    g.add(lever);
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.035, 8),
      new THREE.MeshStandardMaterial({ color: 0xdcdcdc, metalness: 0.9, roughness: 0.25 })
    );
    shaft.position.y = 0.018;
    lever.add(shaft);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.007, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9, roughness: 0.2 })
    );
    tip.position.y = 0.04;
    lever.add(tip);

    // Kleines Typenschild unter dem Schalter
    if (label) {
      const lblCv = document.createElement('canvas');
      lblCv.width = 128; lblCv.height = 32;
      const lc = lblCv.getContext('2d');
      lc.fillStyle = 'rgba(0,0,0,0)';
      lc.fillStyle = '#111'; lc.fillRect(0, 0, 128, 32);
      lc.fillStyle = '#d8d8c8'; lc.font = 'bold 18px Arial'; lc.textAlign = 'center';
      lc.fillText(label, 64, 22);
      const lblTex = new THREE.CanvasTexture(lblCv);
      lblTex.colorSpace = THREE.SRGBColorSpace;
      const lblPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.06, 0.015),
        new THREE.MeshBasicMaterial({ map: lblTex, toneMapped: false, transparent: true })
      );
      lblPlane.position.set(0, -0.028, 0.026);
      g.add(lblPlane);
    }

    // Klick-Hitbox
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.055, 0.03),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.y = 0.02;
    g.add(hit);
    hit.userData.clickable = true;
    hit.userData.action = { type: 'toggle', key };
    this.clickables.push(hit);

    // Status-LED
    const led = new THREE.Mesh(
      new THREE.CircleGeometry(0.008, 12),
      new THREE.MeshBasicMaterial({ color: 0x1a3a1a })
    );
    led.position.set(0, -0.008, 0.024);
    g.add(led);

    lever.rotation.x = initialOn ? 0 : 0.55;
    this._setLed(led, initialOn);

    return { group: g, lever, led };
  }

  _makeGuardedSwitch(x, y, z, key, label) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.x = 0.35;
    this.group.add(g);

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.04, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6 })
    );
    body.position.y = 0;
    g.add(body);

    // Rote Klappe (Guard)
    const guardPivot = new THREE.Group();
    guardPivot.position.y = 0.02;
    g.add(guardPivot);
    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, 0.003, 0.052),
      new THREE.MeshStandardMaterial({ color: 0xcc1111, metalness: 0.2, roughness: 0.5 })
    );
    guard.position.z = 0.026;
    guardPivot.add(guard);
    guardPivot.rotation.x = this.s[key] ? -1.3 : 0;

    // Klick-Hitbox über alles
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, 0.06),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.userData.clickable = true;
    hit.userData.action = { type: 'toggle', key };
    this.clickables.push(hit);
    g.add(hit);

    return { group: g, guardPivot };
  }

  _setLed(led, on) {
    led.material.color.setHex(on ? 0x33ff44 : 0x1a3a1a);
  }

  // ------------------------------------------------------------
  // YOKE — Boeing-Style Steuerhorn mit Animation
  // ------------------------------------------------------------

  _buildYoke() {
    const yokeBase = new THREE.Group();
    yokeBase.position.set(0, 0.95, 0.45);
    this.group.add(yokeBase);

    // Säule
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.033, 0.42, 14),
      new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.65 })
    );
    col.position.y = -0.1;
    yokeBase.add(col);

    // Säulen-Riffelung
    const colTrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.03, 14),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6 })
    );
    colTrim.position.y = -0.28;
    yokeBase.add(colTrim);

    // Pitch-Pivot
    const pitchPivot = new THREE.Group();
    pitchPivot.position.y = 0.11;
    yokeBase.add(pitchPivot);
    this.parts.yokePitch = pitchPivot;

    // Roll-Pivot
    const rollPivot = new THREE.Group();
    pitchPivot.add(rollPivot);
    this.parts.yokeRoll = rollPivot;

    const yokeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.55 });

    // Holm (T-Form Airbus, W-Form Boeing — Mischung realistisch)
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.14), yokeMat);
    stem.position.z = 0.07;
    rollPivot.add(stem);

    // Querholm
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.042, 0.055), yokeMat);
    cross.position.z = 0.14;
    rollPivot.add(cross);

    // Griffe
    for (const side of [-1, 1]) {
      const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.024, 0.18, 16),
        yokeMat
      );
      grip.position.set(side * 0.21, -0.06, 0.14);
      rollPivot.add(grip);
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.6 })
      );
      cap.position.set(side * 0.21, 0.04, 0.14);
      rollPivot.add(cap);
      // PTT-Button (rot), AP-Disconnect (rot)
      const colors = [0xcc0000, 0xff8800, 0xcccccc];
      for (let k = 0; k < 3; k++) {
        const b = new THREE.Mesh(
          new THREE.CylinderGeometry(0.007, 0.007, 0.005, 10),
          new THREE.MeshStandardMaterial({ color: colors[k], emissive: colors[k], emissiveIntensity: 0.15 })
        );
        b.rotation.x = Math.PI / 2;
        b.position.set(side * 0.21 + 0.026 * side, 0.01 - k * 0.025, 0.14);
        rollPivot.add(b);
      }
    }

    // Emblem / Stall-Warn LED
    const emblem = new THREE.Mesh(
      new THREE.CircleGeometry(0.02, 20),
      new THREE.MeshStandardMaterial({ color: 0x441010 })
    );
    emblem.position.set(0, 0, 0.175);
    rollPivot.add(emblem);
    this.parts.yokeEmblem = emblem;

    // Yoke-Typenschild
    const lblCv = document.createElement('canvas');
    lblCv.width = 256; lblCv.height = 64;
    const lc = lblCv.getContext('2d');
    lc.fillStyle = '#0a0a0a'; lc.fillRect(0, 0, 256, 64);
    lc.fillStyle = '#c8c8b8'; lc.font = 'bold 22px Arial'; lc.textAlign = 'center';
    lc.fillText('FLUGSIM.COM', 128, 40);
    const lblTex = new THREE.CanvasTexture(lblCv);
    lblTex.colorSpace = THREE.SRGBColorSpace;
    const lbl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.022),
      new THREE.MeshBasicMaterial({ map: lblTex, toneMapped: false })
    );
    lbl.position.set(0, -0.04, 0.175);
    rollPivot.add(lbl);

    this._animateYoke();
  }

  _animateYoke() {
    if (!this.parts.yokePitch) return;
    this.parts.yokePitch.position.z = THREE.MathUtils.clamp(-this.input.pitch * 0.08, -0.1, 0.1);
    this.parts.yokePitch.rotation.x = THREE.MathUtils.clamp(-this.input.pitch * 0.28, -0.45, 0.45);
    this.parts.yokeRoll.rotation.z = THREE.MathUtils.clamp(this.input.roll * 0.75, -1.2, 1.2);
  }

  _animatePedals() {
    if (!this.parts.pedals) return;
    // Yaw: +1 links, -1 rechts
    this.parts.pedals.left.position.z = 0.85 + (this.input.yaw > 0 ? 0.04 * this.input.yaw : 0);
    this.parts.pedals.right.position.z = 0.85 + (this.input.yaw < 0 ? -0.04 * this.input.yaw : 0);
  }

  // ------------------------------------------------------------
  // RUDDER-PEDALE
  // ------------------------------------------------------------

  _buildRudderPedals() {
    const pedalMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.3, roughness: 0.6 });
    const pedals = {};
    for (const side of ['left', 'right']) {
      const x = side === 'left' ? -0.12 : 0.12;
      const g = new THREE.Group();
      g.position.set(x, 0.12, 0.85);
      this.group.add(g);
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.18, 0.03),
        pedalMat
      );
      plate.rotation.x = -0.25;
      g.add(plate);
      const heel = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.03, 0.06),
        pedalMat
      );
      heel.position.set(0, -0.08, 0.03);
      g.add(heel);
      // "RUDDER" Label
      const lblCv = document.createElement('canvas');
      lblCv.width = 128; lblCv.height = 32;
      const lc = lblCv.getContext('2d');
      lc.fillStyle = 'rgba(0,0,0,0)'; lc.clearRect(0,0,128,32);
      lc.fillStyle = '#d0d0c0'; lc.font = 'bold 14px Arial'; lc.textAlign = 'center';
      lc.fillText('RUDDER', 64, 22);
      const lblTex = new THREE.CanvasTexture(lblCv);
      lblTex.colorSpace = THREE.SRGBColorSpace;
      const lbl = new THREE.Mesh(
        new THREE.PlaneGeometry(0.06, 0.015),
        new THREE.MeshBasicMaterial({ map: lblTex, toneMapped: false, transparent: true })
      );
      lbl.position.set(0, 0.02, 0.017);
      lbl.rotation.x = -0.25;
      g.add(lbl);
      pedals[side] = g;
    }
    this.parts.pedals = pedals;
  }

  // ------------------------------------------------------------
  // SEATS
  // ------------------------------------------------------------

  _buildSeats() {
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x2a1f14, roughness: 0.92 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x6a5a3c, roughness: 0.8 });
    for (const x of [-0.48, 0.48]) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.58), seatMat);
      base.position.set(x, 0.55, -0.3);
      this.group.add(base);
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.52), seatMat);
      cushion.position.set(x, 0.63, -0.3);
      this.group.add(cushion);
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.95, 0.1), seatMat);
      backrest.position.set(x, 1.08, -0.56);
      this.group.add(backrest);
      // Kopfstütze
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1), seatMat);
      head.position.set(x, 1.62, -0.56);
      this.group.add(head);
      // Armlehnen
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.32), seatMat);
        arm.position.set(x + side * 0.26, 0.8, -0.3);
        this.group.add(arm);
      }
      // Sicherheitsgurt (diagonaler Streifen)
      const belt = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.9, 0.006),
        beltMat
      );
      belt.position.set(x - 0.12, 0.95, -0.5);
      belt.rotation.z = 0.2;
      this.group.add(belt);
    }
  }

  // ------------------------------------------------------------
  // CHRONOMETER + MASTER WARNING/CAUTION — auf Glareshield
  // ------------------------------------------------------------

  _buildChronoAndWarnings() {
    // Chronometer (Analog-Uhr)
    const chronoCv = document.createElement('canvas');
    chronoCv.width = 128; chronoCv.height = 128;
    this.chronoCanvas = chronoCv;
    this.chronoCtx = chronoCv.getContext('2d');
    this.textures.chrono = new THREE.CanvasTexture(chronoCv);
    this.textures.chrono.colorSpace = THREE.SRGBColorSpace;
    const chrono = new THREE.Mesh(
      new THREE.PlaneGeometry(0.07, 0.07),
      new THREE.MeshBasicMaterial({ map: this.textures.chrono, toneMapped: false })
    );
    chrono.position.set(-0.72, 1.52, 1.04);
    chrono.rotation.x = -0.14;
    this.group.add(chrono);
    this._renderChronometer();
    // Clock Bezel
    const chBezel = new THREE.Mesh(
      new THREE.TorusGeometry(0.038, 0.004, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 })
    );
    chBezel.position.set(-0.72, 1.52, 1.038);
    chBezel.rotation.x = -0.14;
    this.group.add(chBezel);

    // Master Warning (rot) und Master Caution (amber)
    const mkAnnun = (x, color, label, isWarn) => {
      const g = new THREE.Group();
      g.position.set(x, 1.52, 1.04);
      g.rotation.x = -0.14;
      this.group.add(g);
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.06, 0.012),
        new THREE.MeshStandardMaterial({ color: color * 0x000000 | 0x0a0000, emissive: 0x000000, emissiveIntensity: 0 })
      );
      g.add(body);
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(0.065, 0.055),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0 })
      );
      face.position.z = 0.007;
      g.add(face);
      // Text
      const lblCv = document.createElement('canvas');
      lblCv.width = 128; lblCv.height = 96;
      const lc = lblCv.getContext('2d');
      lc.fillStyle = 'rgba(0,0,0,0)'; lc.clearRect(0,0,128,96);
      lc.fillStyle = '#fff'; lc.font = 'bold 16px Arial'; lc.textAlign = 'center';
      lc.fillText('MASTER', 64, 38);
      lc.fillText(label, 64, 60);
      const lblTex = new THREE.CanvasTexture(lblCv); lblTex.colorSpace = THREE.SRGBColorSpace;
      const lbl = new THREE.Mesh(
        new THREE.PlaneGeometry(0.06, 0.045),
        new THREE.MeshBasicMaterial({ map: lblTex, toneMapped: false, transparent: true })
      );
      lbl.position.z = 0.008;
      g.add(lbl);
      return { face, body };
    };
    this.parts.masterWarn = mkAnnun(0.68, 0xff3333, 'WARN', true);
    this.parts.masterCaut = mkAnnun(0.78, 0xffaa22, 'CAUT', false);
  }

  // ------------------------------------------------------------
  // COCKPIT LIGHTING
  // ------------------------------------------------------------

  _buildCockpitLighting() {
    const panelLight = new THREE.PointLight(0xffe0b0, 0.7, 4, 1.4);
    panelLight.position.set(0, 1.85, 1.0);
    this.group.add(panelLight);
    const backLight = new THREE.PointLight(0xfff2d8, 0.5, 3, 1.5);
    backLight.position.set(0, 1.9, -0.2);
    this.group.add(backLight);
    const amb = new THREE.AmbientLight(0x22262a, 0.3);
    this.group.add(amb);
  }

  // ------------------------------------------------------------
  // DYNAMIC UPDATES
  // ------------------------------------------------------------

  _updateDynamic() {
    // Throttles animieren
    if (this.parts.throttles) {
      for (const t of this.parts.throttles) {
        const a = THREE.MathUtils.clamp(this.flight.throttle, 0, 1);
        t.pivot.rotation.x = THREE.MathUtils.lerp(0.35, -0.6, a);
      }
    }
    if (this.parts.flapLever) {
      const p = THREE.MathUtils.clamp(this.flight.flaps / 4, 0, 1);
      this.parts.flapLever.rotation.x = THREE.MathUtils.lerp(-0.35, 0.55, p);
    }
    if (this.parts.gearLever) {
      this.parts.gearLever.rotation.x = this.flight.gear ? 0.25 : -0.85;
    }
    if (this.parts.gearLamps) {
      const on = this.flight.gear;
      for (const lamp of this.parts.gearLamps) {
        lamp.material.emissive.setHex(on ? 0x33ff44 : 0x222222);
      }
    }
    if (this.parts.spoilerArm) {
      this.parts.spoilerArm.rotation.x = this.flight.spoilers ? 0.6 : -0.4;
    }
    if (this.parts.parkingBrake) {
      this.parts.parkingBrake.rotation.x = this.flight.parkingBrake ? 0 : 0.75;
    }
    if (this.parts.autobrakeKnob) {
      const pos = [-0.8, -0.4, 0, 0.4, 0.8][this.s.autobrake] || 0;
      this.parts.autobrakeKnob.rotation.y = pos * Math.PI / 2;
    }
    if (this.parts.engMasters) {
      for (let i = 0; i < 2; i++) {
        if (this.parts.engMasters[i]) {
          this.parts.engMasters[i].position.z = this.s[`eng${i+1}Master`] ? 0.015 : -0.015;
        }
      }
    }

    // Toggle-Schalter-LEDs
    const toggles = this.parts.toggles || {};
    for (const key of Object.keys(toggles)) {
      const t = toggles[key];
      const on = !!this.s[key];
      t.lever.rotation.x = on ? 0 : 0.55;
      this._setLed(t.led, on);
    }

    // Guarded Schalter
    const guarded = this.parts.guarded || {};
    for (const key of Object.keys(guarded)) {
      guarded[key].guardPivot.rotation.x = this.s[key] ? -1.3 : 0;
    }

    // MCP-Buttons
    if (this.parts.mcpBtns) {
      const set = (k, on, c) => {
        const b = this.parts.mcpBtns[k];
        if (!b) return;
        b.material.emissive.setHex(on ? c : 0x000000);
      };
      set('autopilot', this.flight.autopilot, 0x22cc44);
      set('fdOn',      this.s.fdOn,           0x22cc44);
      set('apHdgHold', this.s.apHdgHold,      0xff9933);
      set('apLoc',     this.s.apLoc,          0xff9933);
      set('apAltHold', this.s.apAltHold,      0xff9933);
      set('apVnav',    this.s.apVnav,         0xff9933);
      set('apAppr',    this.s.apAppr,         0xff9933);
    }

    // Yoke Stall-LED
    if (this.parts.yokeEmblem) {
      const m = this.parts.yokeEmblem.material;
      m.emissive.setHex(this.flight.stallWarning ? 0xff0000 : 0x000000);
      m.emissiveIntensity = this.flight.stallWarning ? 0.8 : 0;
    }

    // Master Warning/Caution Leuchten
    if (this.parts.masterWarn) {
      this.parts.masterWarn.face.material.emissiveIntensity = this.s.masterWarn ? (Math.sin(Date.now() / 120) * 0.5 + 0.7) : 0;
    }
    if (this.parts.masterCaut) {
      this.parts.masterCaut.face.material.emissiveIntensity = this.s.masterCaut ? 0.8 : 0;
    }

    this._renderPFD();
    this._renderND();
    this._renderEWD();
    this._renderSD();
    this._renderStandby();
    this._renderFCU();
    this._renderMCDU();
    this._renderRadio();
    this._renderChronometer();
  }

  // ============================================================
  // DISPLAY RENDERERS
  // ============================================================

  _renderPFD() {
    const ctx = this.pfdCtx;
    const W = 512, H = 512;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

    // FMA-Bar oben (Airbus: 5 grüne/weiße Spalten)
    const fma = [
      { t: this.flight.autopilot ? 'CLB' : '', c: '#22ee44' },
      { t: this.s.apHdgHold ? 'HDG' : 'HDG', c: '#22ee44' },
      { t: this.s.apAltHold ? 'ALT' : '', c: '#22ee44' },
      { t: this.s.apLoc ? 'LOC' : '', c: '#ffffff' },
      { t: this.flight.autopilot ? 'AP1' : '', c: '#ffffff' },
    ];
    ctx.fillStyle = '#0a0a0e'; ctx.fillRect(5, 5, W - 10, 34);
    ctx.strokeStyle = '#444'; ctx.strokeRect(5, 5, W - 10, 34);
    ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
    const cw = (W - 10) / 5;
    fma.forEach((f, i) => {
      ctx.fillStyle = f.c;
      ctx.fillText(f.t, 5 + cw * i + cw / 2, 28);
    });

    // Attitude-Indikator (Mittelbereich)
    const cx = W / 2, cy = H / 2 + 30;
    ctx.save();
    ctx.beginPath(); ctx.rect(90, 60, W - 180, H - 160); ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-this.flight.roll);
    const horizon = this.flight.pitch * 280;
    ctx.fillStyle = '#0e5a92'; ctx.fillRect(-500, -600 + horizon, 1000, 600);
    ctx.fillStyle = '#6e4722'; ctx.fillRect(-500, horizon, 1000, 600);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-500, horizon); ctx.lineTo(500, horizon); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    for (let p = -60; p <= 60; p += 10) {
      if (p === 0) continue;
      const y = horizon - p * 6;
      const w = p % 20 === 0 ? 80 : 40;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-w/2, y); ctx.lineTo(w/2, y); ctx.stroke();
      if (p % 20 === 0) {
        ctx.fillText(`${Math.abs(p)}`, -w/2 - 14, y + 4);
        ctx.fillText(`${Math.abs(p)}`, w/2 + 14, y + 4);
      }
    }
    ctx.restore();

    // Roll-Indikator oben (Skala bis 60°)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    for (let r = -60; r <= 60; r += 10) {
      ctx.save();
      ctx.rotate(r * DEG);
      const big = r % 30 === 0;
      ctx.beginPath();
      ctx.moveTo(0, -150);
      ctx.lineTo(0, -150 + (big ? 14 : 7));
      ctx.stroke();
      ctx.restore();
    }
    // Roll-Zeiger (invertierter Pfeil)
    ctx.rotate(-this.flight.roll);
    ctx.fillStyle = '#ffd000';
    ctx.beginPath(); ctx.moveTo(0, -150); ctx.lineTo(-8, -136); ctx.lineTo(8, -136); ctx.closePath(); ctx.fill();
    ctx.restore();

    // Flugzeug-Marker
    ctx.strokeStyle = '#ffd000'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 70, cy); ctx.lineTo(cx - 24, cy);
    ctx.moveTo(cx + 24, cy); ctx.lineTo(cx + 70, cy);
    ctx.moveTo(cx - 24, cy); ctx.lineTo(cx - 24, cy + 8);
    ctx.moveTo(cx + 24, cy); ctx.lineTo(cx + 24, cy + 8);
    ctx.stroke();
    ctx.fillStyle = '#ffd000';
    ctx.fillRect(cx - 5, cy - 5, 10, 10);

    // Slip-Indikator (Kugel unter Attitude)
    ctx.fillStyle = '#111'; ctx.fillRect(cx - 50, H/2 + 130, 100, 10);
    ctx.strokeStyle = '#888'; ctx.strokeRect(cx - 50, H/2 + 130, 100, 10);
    ctx.fillStyle = '#ffd000';
    const slipX = cx + THREE.MathUtils.clamp(-this.flight.roll * 100, -40, 40);
    ctx.beginPath(); ctx.arc(slipX, H/2 + 135, 5, 0, Math.PI * 2); ctx.fill();

    // Speed-Tape links
    this._drawTape(ctx, 16, 50, 72, H - 100, this.flight.speed * 1.944, 10, 'KT');

    // Alt-Tape rechts
    this._drawTape(ctx, W - 88, 50, 72, H - 100, this.flight.altitude * 3.281, 100, 'FT', true);

    // VS-Anzeige ganz rechts
    const vsFpm = this.flight.vs * 196.85;
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(W - 12, 80, 10, H - 180);
    const vy = H/2 - THREE.MathUtils.clamp(vsFpm / 2000, -1, 1) * 130;
    ctx.fillStyle = '#33ff55';
    ctx.fillRect(W - 14, vy - 2, 14, 4);

    // Heading-Tape unten
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(88, H - 62, W - 176, 48);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(88, H - 62, W - 176, 48);
    const hdg = this.flight.heading;
    ctx.textAlign = 'center'; ctx.font = 'bold 12px monospace';
    for (let d = -30; d <= 30; d += 10) {
      const v = ((Math.round(hdg / 10) * 10 + d) % 360 + 360) % 360;
      const x = cx + d * 6;
      ctx.fillStyle = '#fff';
      ctx.fillText(`${v === 0 ? 'N' : v === 90 ? 'E' : v === 180 ? 'S' : v === 270 ? 'W' : v.toString().padStart(3,'0')}`, x, H - 44);
      ctx.strokeStyle = '#888'; ctx.beginPath();
      ctx.moveTo(x, H - 32); ctx.lineTo(x, H - 26); ctx.stroke();
    }
    // Heading-Marker
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(cx - 34, H - 22, 68, 18);
    ctx.strokeStyle = '#ffd000'; ctx.lineWidth = 2; ctx.strokeRect(cx - 34, H - 22, 68, 18);
    ctx.fillStyle = '#ffd000'; ctx.font = 'bold 16px monospace';
    ctx.fillText(`${Math.round(hdg).toString().padStart(3, '0')}°`, cx, H - 8);

    // ILS/VOR (wenn APPR aktiv)
    if (this.s.apAppr) {
      ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 1.5;
      ctx.strokeRect(W - 88, 70, 80, 20);
      ctx.fillStyle = '#00ff00'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
      ctx.fillText('ILS 109.50', W - 84, 84);
    }

    this.textures.pfd.needsUpdate = true;
  }

  _drawTape(ctx, x, y, w, h, value, step, unit, isRight = false) {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    const cy = y + h / 2;
    const pxPerUnit = 4.5;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px monospace';
    ctx.textAlign = isRight ? 'left' : 'right';
    const round = Math.round(value / step) * step;
    for (let s = -5; s <= 5; s++) {
      const v = round + s * step;
      if (step === 10 && v < 0) continue;
      const ys = cy - ((v - value) * pxPerUnit);
      if (ys < y + 10 || ys > y + h - 10) continue;
      ctx.fillText(`${v}`, isRight ? x + 8 : x + w - 6, ys + 5);
      ctx.strokeStyle = '#888';
      ctx.beginPath();
      if (isRight) { ctx.moveTo(x, ys); ctx.lineTo(x + 4, ys); } else { ctx.moveTo(x + w - 4, ys); ctx.lineTo(x + w, ys); }
      ctx.stroke();
    }
    // Window/Indikator
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(x - 3, cy - 16, w + 6, 32);
    ctx.strokeStyle = '#ffd000'; ctx.lineWidth = 2; ctx.strokeRect(x - 3, cy - 16, w + 6, 32);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 20px monospace';
    ctx.fillText(`${Math.round(value)}`, x + w / 2, cy + 7);
    // Label
    ctx.fillStyle = '#aaa'; ctx.font = '11px monospace';
    ctx.fillText(unit, x + w / 2, y + 20);
  }

  _renderND() {
    const ctx = this.ndCtx;
    const W = 512, H = 512;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

    // Modus-Header (Airbus: ROSE / ARC / PLAN)
    ctx.fillStyle = '#00cc66'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`ARC 80 NM`, 20, 25);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`GS ${Math.round(this.flight.speed * 1.944)}`, W - 20, 25);
    ctx.fillText(`TAS ${Math.round(this.flight.speed * 1.944)}`, W - 20, 45);

    // Kompass-Rose (halbrund, Airbus ARC-Modus)
    const cx = W / 2, cy = H / 2 + 120;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-this.flight.heading * DEG);
    ctx.strokeStyle = '#cccccc';
    // Range-Ringe
    for (let r = 80; r <= 240; r += 80) {
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI + 0.5, -0.5); ctx.stroke();
    }
    // Äußerer Ring mit Ticks
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 240, -Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
    for (let d = 0; d < 360; d += 5) {
      ctx.save();
      ctx.rotate(d * DEG);
      const big = d % 30 === 0;
      const med = d % 10 === 0;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -240);
      ctx.lineTo(0, -240 + (big ? 16 : med ? 10 : 5));
      ctx.stroke();
      if (big) {
        const lbl = d === 0 ? 'N' : d === 90 ? 'E' : d === 180 ? 'S' : d === 270 ? 'W' : `${(d/10).toString()}`;
        ctx.fillStyle = (d === 0) ? '#ffff00' : '#ffffff';
        ctx.fillText(lbl, 0, -258);
      }
      ctx.restore();
    }
    ctx.restore();

    // Flugzeug-Symbol (fest in Mitte)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.moveTo(0, -20); ctx.lineTo(-14, 12); ctx.lineTo(0, 4); ctx.lineTo(14, 12); ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Track-Linie (vorwärts)
    ctx.strokeStyle = '#00ff00'; ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 240); ctx.stroke();
    ctx.setLineDash([]);

    // Heading-Bug
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.s.apHdg - this.flight.heading) * DEG);
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.moveTo(-8, -240); ctx.lineTo(8, -240); ctx.lineTo(0, -230); ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Heading-Zeiger (gelb nach oben)
    ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy - 238); ctx.lineTo(cx, cy - 252); ctx.stroke();

    // Wind-Pfeil oben links
    ctx.fillStyle = '#00ffff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
    ctx.fillText('WIND 270° / 12', 20, H - 30);

    // Range-Ring-Labels
    ctx.fillStyle = '#cccccc'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('40', cx, cy - 75); ctx.fillText('80', cx, cy - 155);

    this.textures.nd.needsUpdate = true;
  }

  _renderEWD() {
    const ctx = this.ewdCtx;
    const W = 512, H = 512;
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#444'; ctx.strokeRect(6, 6, W - 12, H - 12);

    const thr = Math.round(this.flight.throttle * 100);
    // N1-Kreise (Airbus-Style)
    for (let i = 0; i < 2; i++) {
      const x = W/2 - 90 + i * 180;
      const y = 110;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 55, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
      // Fill-Bogen
      const frac = THREE.MathUtils.clamp(thr / 100, 0, 1);
      ctx.strokeStyle = thr > 95 ? '#ff3333' : thr > 85 ? '#ffaa33' : '#33ff55';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(x, y, 55, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * frac); ctx.stroke();
      // Digit
      ctx.fillStyle = '#fff'; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`${thr}`, x, y + 10);
      ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#aaa';
      ctx.fillText('N1', x, y - 25);
      ctx.fillText(`ENG ${i+1}`, x, y + 78);
    }

    // EGT
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
    for (let i = 0; i < 2; i++) {
      const x = W/2 - 90 + i * 180;
      ctx.fillText(`EGT  ${Math.round(420 + thr * 4)}°C`, x, 230);
      ctx.fillText(`FF   ${Math.round(thr * 20)} KG/M`, x, 250);
      ctx.fillText(`N2   ${Math.round(thr * 0.95)}%`, x, 270);
    }

    // Trennlinie
    ctx.strokeStyle = '#444'; ctx.beginPath(); ctx.moveTo(20, 290); ctx.lineTo(W - 20, 290); ctx.stroke();

    // Fuel
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'left';
    ctx.fillText('FUEL', 20, 320);
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(20, 328, W - 40, 22);
    ctx.strokeStyle = '#666'; ctx.strokeRect(20, 328, W - 40, 22);
    const fu = THREE.MathUtils.clamp(this.flight.fuel, 0, 1);
    ctx.fillStyle = fu < 0.15 ? '#ff4444' : fu < 0.3 ? '#ffaa33' : '#33bbff';
    ctx.fillRect(20, 328, (W - 40) * fu, 22);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.font = 'bold 13px monospace';
    ctx.fillText(`${Math.round(fu * 100)}%`, W - 26, 344);

    // Flaps/Gear/Spoiler/Parking-Zeile
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left';
    let yy = 380;
    const row = (label, on, offColor, onColor) => {
      ctx.fillStyle = on ? onColor : offColor;
      ctx.fillText(label, 20, yy);
      yy += 20;
    };
    row(`FLAPS  ${this.flight.flaps}`, this.flight.flaps > 0, '#888', '#33ff55');
    row(`GEAR   ${this.flight.gear ? 'DOWN' : 'UP'}`, this.flight.gear, '#ffaa33', '#33ff55');
    row(`SPLR   ${this.flight.spoilers ? 'ARM' : 'OFF'}`, !this.flight.spoilers, '#ff8833', '#888');
    row(`PARK   ${this.flight.parkingBrake ? 'SET' : 'REL'}`, !this.flight.parkingBrake, '#ff3333', '#888');
    row(`G     ${this.flight.gLoad.toFixed(1)}`, Math.abs(this.flight.gLoad) > 3, '#888', '#ff3333');

    // Warning messages (rechts)
    ctx.textAlign = 'right';
    if (this.flight.stallWarning) {
      ctx.fillStyle = '#ff0000'; ctx.fillText('STALL', W - 20, 380);
    }
    if (this.flight.fuel < 0.15) {
      ctx.fillStyle = '#ffaa00'; ctx.fillText('LOW FUEL', W - 20, 400);
    }
    if (!this.flight.gear && this.flight.altitude < 300 && this.flight.speed * 1.944 < 180) {
      ctx.fillStyle = '#ff0000'; ctx.fillText('GEAR NOT DOWN', W - 20, 420);
    }

    this.textures.ewd.needsUpdate = true;
  }

  _renderSD() {
    const ctx = this.sdCtx;
    const W = 512, H = this.sdCanvas.height;
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#444'; ctx.strokeRect(6, 6, W - 12, H - 12);

    // System-Display: Hydraulics-Status
    ctx.fillStyle = '#d8d8c8'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
    ctx.fillText('HYD', W/2, 30);
    const hyd = [
      { k: 'hydG', label: 'GREEN', x: W/2 - 100 },
      { k: 'hydB', label: 'BLUE',  x: W/2 },
      { k: 'hydY', label: 'YELLOW',x: W/2 + 100 },
    ];
    for (const h of hyd) {
      ctx.fillStyle = this.s[h.k] ? '#33ff55' : '#666';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(h.label, h.x, 60);
      ctx.strokeStyle = this.s[h.k] ? '#33ff55' : '#666';
      ctx.beginPath(); ctx.moveTo(h.x - 20, 80); ctx.lineTo(h.x + 20, 80);
      ctx.lineTo(h.x + 20, 100); ctx.lineTo(h.x - 20, 100); ctx.closePath();
      ctx.stroke();
      const p = this.s[h.k] ? Math.round(2800 + Math.random() * 200) : 0;
      ctx.fillText(`${p} PSI`, h.x, 95);
    }

    // Fuel-Tanks
    ctx.fillStyle = '#d8d8c8'; ctx.font = 'bold 14px monospace';
    ctx.fillText('FUEL', W/2, 135);
    const kg = Math.round(this.flight.fuel * 18500);
    ctx.fillStyle = '#33ff55'; ctx.font = 'bold 13px monospace';
    ctx.fillText(`${kg} KG`, W/2, 160);
    // Tank-Bar
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(40, 172, W - 80, 14);
    ctx.strokeStyle = '#666'; ctx.strokeRect(40, 172, W - 80, 14);
    ctx.fillStyle = '#33bbff'; ctx.fillRect(40, 172, (W - 80) * this.flight.fuel, 14);

    this.textures.sd.needsUpdate = true;
  }

  _renderStandby() {
    const ctx = this.sbyCtx;
    const W = 256, H = this.sbyCanvas.height;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W/2, H/2);
    ctx.beginPath(); ctx.arc(0, 0, Math.min(W, H) * 0.4, 0, Math.PI * 2); ctx.clip();
    ctx.rotate(-this.flight.roll);
    const horizon = this.flight.pitch * 100;
    ctx.fillStyle = '#0e5a92'; ctx.fillRect(-200, -300 + horizon, 400, 300);
    ctx.fillStyle = '#6e4722'; ctx.fillRect(-200, horizon, 400, 300);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-200, horizon); ctx.lineTo(200, horizon); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W/2, H/2, Math.min(W, H) * 0.4, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ffd000'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W/2 - 30, H/2); ctx.lineTo(W/2 - 10, H/2);
    ctx.moveTo(W/2 + 10, H/2); ctx.lineTo(W/2 + 30, H/2); ctx.stroke();
    ctx.fillStyle = '#ffd000'; ctx.fillRect(W/2 - 3, H/2 - 3, 6, 6);
    ctx.fillStyle = '#888'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('STBY', W/2, 12);
    this.textures.sby.needsUpdate = true;
  }

  _renderFCU() {
    const ctx = this.fcuCtx;
    const W = 1024, H = 120;
    ctx.fillStyle = '#12120e'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#333'; ctx.strokeRect(4, 4, W - 8, H - 8);

    const cols = [
      { label: 'SPD', value: `${Math.round(this.s.apSpeed).toString().padStart(3, '0')}`, unit: 'KT' },
      { label: 'HDG', value: `${Math.round(this.s.apHdg).toString().padStart(3, '0')}`, unit: '°'  },
      { label: 'ALT', value: `${Math.round(this.s.apAlt).toString().padStart(5, '0')}`, unit: 'FT' },
      { label: 'V/S', value: `${this.s.apVs >= 0 ? '+' : ''}${Math.round(this.s.apVs).toString().padStart(4, '0')}`, unit: 'FPM' },
    ];
    const colW = W / 4;
    ctx.textAlign = 'center';
    cols.forEach((c, i) => {
      const cx = i * colW + colW / 2;
      ctx.fillStyle = '#aaa'; ctx.font = 'bold 14px monospace';
      ctx.fillText(c.label, cx, 25);
      ctx.fillStyle = '#ffcc33'; ctx.font = 'bold 44px "JetBrains Mono",monospace';
      ctx.fillText(c.value, cx, 82);
      ctx.fillStyle = '#888'; ctx.font = '12px monospace';
      ctx.fillText(c.unit, cx, 104);
      if (i < 3) { ctx.strokeStyle = '#333'; ctx.beginPath(); ctx.moveTo((i+1) * colW, 10); ctx.lineTo((i+1) * colW, H - 10); ctx.stroke(); }
    });

    this.textures.fcu.needsUpdate = true;
  }

  _renderMCDU() {
    const ctx = this.mcduCtx;
    const W = 512, H = 400;
    ctx.fillStyle = '#0a1a0a'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#444'; ctx.strokeRect(8, 8, W - 16, H - 16);

    const lines = [
      { c: '#fff', t: 'FLUGSIM MCDU — STATUS' },
      { c: '#666', t: '─────────────────────' },
      { c: '#33ff55', t: `AP          ${this.flight.autopilot ? 'ENGAGED' : 'OFF'}` },
      { c: '#ffcc33', t: `SPD TGT     ${Math.round(this.s.apSpeed)} KT` },
      { c: '#ffcc33', t: `HDG TGT     ${Math.round(this.s.apHdg).toString().padStart(3,'0')}°` },
      { c: '#ffcc33', t: `ALT TGT     ${Math.round(this.s.apAlt)} FT` },
      { c: '#33bbff', t: `FUEL        ${Math.round(this.flight.fuel * 100)}%` },
      { c: '#33bbff', t: `G LOAD      ${this.flight.gLoad.toFixed(2)} G` },
      { c: '#666', t: '─────────────────────' },
      { c: '#fff', t: 'FMGS FUNCTIONS' },
      { c: '#aaa', t: 'PERF  F-PLN  PROG' },
      { c: '#aaa', t: 'RAD NAV  FUEL  SEC' },
      { c: '#666', t: '─────────────────────' },
      { c: '#33ff55', t: '> READY <' },
    ];
    ctx.font = 'bold 20px "JetBrains Mono",monospace';
    ctx.textAlign = 'left';
    lines.forEach((ln, i) => {
      ctx.fillStyle = ln.c;
      ctx.fillText(ln.t, 20, 38 + i * 24);
    });

    this.textures.mcdu.needsUpdate = true;
  }

  _renderRadio() {
    const ctx = this.radioCtx;
    const W = 384, H = 128;
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#444'; ctx.strokeRect(6, 6, W - 12, H - 12);

    ctx.fillStyle = '#888'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left';
    ctx.fillText('COM1', 20, 28);
    ctx.fillText('COM2', 20, 60);
    ctx.fillText('NAV1', 210, 28);
    ctx.fillText('NAV2', 210, 60);
    ctx.fillText('XPDR', 20, 92);
    ctx.fillText('ATC', 210, 92);

    ctx.fillStyle = '#ffcc33'; ctx.font = 'bold 22px "JetBrains Mono",monospace';
    ctx.fillText('118.450', 80, 32);
    ctx.fillText('121.500', 80, 64);
    ctx.fillText('109.500', 270, 32);
    ctx.fillText('114.800', 270, 64);
    ctx.fillText('4237', 80, 96);
    ctx.fillStyle = '#33ff55';
    ctx.fillText('ON', 270, 96);

    this.textures.radio.needsUpdate = true;
  }

  _renderChronometer() {
    const ctx = this.chronoCtx;
    const W = 128, H = 128;
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W/2, H/2, 58, 0, Math.PI * 2); ctx.stroke();

    // Zifferblatt
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      const x = W/2 + Math.cos(a) * 50;
      const y = H/2 + Math.sin(a) * 50;
      ctx.fillText(h === 0 ? '12' : `${h}`, x, y + 4);
      ctx.strokeStyle = '#888';
      const x2 = W/2 + Math.cos(a) * 56;
      const y2 = H/2 + Math.sin(a) * 56;
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(W/2 + Math.cos(a) * 60, H/2 + Math.sin(a) * 60); ctx.stroke();
    }

    const now = new Date();
    const hAng = ((now.getUTCHours() % 12) + now.getUTCMinutes() / 60) / 12 * Math.PI * 2 - Math.PI / 2;
    const mAng = (now.getUTCMinutes() + now.getUTCSeconds() / 60) / 60 * Math.PI * 2 - Math.PI / 2;
    const sAng = now.getUTCSeconds() / 60 * Math.PI * 2 - Math.PI / 2;

    const hand = (ang, length, width, color) => {
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(W/2, H/2);
      ctx.lineTo(W/2 + Math.cos(ang) * length, H/2 + Math.sin(ang) * length);
      ctx.stroke();
    };
    hand(hAng, 28, 4, '#fff');
    hand(mAng, 42, 3, '#fff');
    hand(sAng, 46, 1.5, '#ff3333');

    // Mitte
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(W/2, H/2, 3, 0, Math.PI * 2); ctx.fill();

    // UTC Label
    ctx.fillStyle = '#888'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('UTC', W/2, H - 16);

    this.textures.chrono.needsUpdate = true;
  }

  // ============================================================
  // INTERACTION
  // ============================================================

  handleClick(raycaster) {
    const hit = raycaster.intersectObjects(this.clickables, false)[0];
    if (!hit) return false;
    const obj = hit.object;
    const action = obj.userData.action;
    if (!action) return false;
    this._fireAction(action);
    return true;
  }

  handleHover(raycaster) {
    const hit = raycaster.intersectObjects(this.clickables, false)[0];
    const next = hit ? hit.object : null;
    if (next === this.hovered) return;
    if (this.hovered && this._hoverOrigEmissive !== null) {
      const mat = this.hovered.material;
      if (mat && mat.emissive) mat.emissive.setHex(this._hoverOrigEmissive);
    }
    this.hovered = next;
    this._hoverOrigEmissive = null;
    if (next && next.material && next.material.emissive) {
      this._hoverOrigEmissive = next.material.emissive.getHex();
      next.material.emissive.setHex(0x555533);
    }
  }

  handleWheel(raycaster, delta) {
    const hit = raycaster.intersectObjects(this.clickables, false)[0];
    if (!hit) return false;
    const a = hit.object.userData.action;
    if (!a) return false;
    if (a.type === 'throttleDrag') {
      this.onAction('throttleStep', { delta: delta * 0.05 });
      return true;
    }
    if (a.type === 'dial') {
      const sign = delta > 0 ? 1 : -1;
      const step = a.step * sign;
      let v = this.s[a.key] + step;
      if (a.wrap) v = ((v % 360) + 360) % 360;
      v = Math.max(a.min, Math.min(a.max, v));
      this.s[a.key] = v;
      const mapping = { apSpeed: 'setSpd', apHdg: 'setHdg', apAlt: 'setAlt', apVs: 'setVs' };
      this.onAction('autopilotDial', { key: mapping[a.key], value: v });
      this._updateDynamic();
      return true;
    }
    return false;
  }

  _fireAction(a) {
    switch (a.type) {
      case 'toggle':
        this.s[a.key] = !this.s[a.key];
        if (['landingL','taxiL','navL','strobe','beacon','logoL'].includes(a.key)) {
          this.onAction('lights');
        }
        this._updateDynamic();
        break;
      case 'throttleDrag':
        this.onAction('throttleStep', { delta: 0.1 });
        break;
      case 'flapCycle':
        this.onAction('flapCycle');
        break;
      case 'gearToggle':
        this.onAction('gear');
        break;
      case 'spoilersToggle':
        this.onAction('spoilers');
        break;
      case 'parkingBrakeToggle':
        this.onAction('parkingBrake');
        break;
      case 'autobrakeCycle':
        this.s.autobrake = (this.s.autobrake + 1) % 5;
        this.onAction('autobrake', this.s.autobrake);
        this._updateDynamic();
        break;
      case 'dial': {
        let v = this.s[a.key] + a.delta;
        if (a.wrap) v = ((v % 360) + 360) % 360;
        v = Math.max(a.min, Math.min(a.max, v));
        this.s[a.key] = v;
        const mapping = { apSpeed: 'setSpd', apHdg: 'setHdg', apAlt: 'setAlt', apVs: 'setVs' };
        this.onAction('autopilotDial', { key: mapping[a.key], value: v });
        this._updateDynamic();
        break;
      }
      case 'mcpBtn': {
        if (a.key === 'autopilot') this.onAction('autopilot', 'master');
        else if (a.key === 'apHdgHold') { this.s.apHdgHold = !this.s.apHdgHold; this.onAction('autopilot', 'hdg'); }
        else if (a.key === 'apAltHold') { this.s.apAltHold = !this.s.apAltHold; this.onAction('autopilot', 'alt'); }
        else if (a.key === 'apVnav') this.s.apVnav = !this.s.apVnav;
        else if (a.key === 'apAppr') this.s.apAppr = !this.s.apAppr;
        else if (a.key === 'apLoc') this.s.apLoc = !this.s.apLoc;
        else if (a.key === 'fdOn') this.s.fdOn = !this.s.fdOn;
        this._updateDynamic();
        break;
      }
    }
  }
}
