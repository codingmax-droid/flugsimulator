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
  constructor(scene, onAction, aircraftType = 'a320') {
    this.scene = scene;
    this.onAction = onAction;
    this.aircraftType = aircraftType;
    this.isFighter = ['f16', 'f22', 'f35', 'typhoon', 'rafale'].includes(aircraftType);

    this.group = new THREE.Group();
    this.group.visible = false;
    this.scene.add(this.group);

    this.clickables = [];
    this.hovered = null;
    this._hoverOrigEmissive = null;

    this.seatLocal = new THREE.Vector3(-0.4, 1.28, -0.12);
    this.lookLocal = new THREE.Vector3(-0.1, 1.18, 1.0);

    this.input = { pitch: 0, roll: 0, yaw: 0 };

    this.flight = {
      speed: 0, altitude: 0, vs: 0, heading: 0,
      pitch: 0, roll: 0, throttle: 0, fuel: 1, gLoad: 1,
      flaps: 0, gear: true, spoilers: false, brakes: false,
      parkingBrake: false, lights: false, autopilot: false,
      stallWarning: false,
    };

    // Lokaler Schalter-/Dialzustand (Airbus-Style)
    this.s = {
      // ELEC
      batt1: true, batt2: true, apuMaster: false, apuStart: false,
      extPwr: false, gen1: true, gen2: true, apuGen: false,
      busTie: true, idg1: true, idg2: true, galy: true,
      // ENGINES / FIRE
      eng1Master: false, eng2Master: false, apuFire: false,
      // FUEL
      fuelPump1L: true, fuelPump1R: true, fuelPump2L: true, fuelPump2R: true,
      ctrPump1: false, ctrPump2: false, xFeed: false, fuelMode: false,
      // HYD
      hydG: true, hydB: true, hydY: true, ptu: true,
      // AIR COND
      pack1: true, pack2: true, hotAir: true,
      apuBleed: false, eng1Bld: true, eng2Bld: true, xBleed: false, ramAir: false, press: true,
      // ANTI-ICE
      pitotHeat: false, antiIce: false,
      wingAntiIce: false, eng1AntiIce: false, eng2AntiIce: false,
      probeHeat: true, windowHeat: false,
      // SIGNS
      seatbelt: true, noSmoke: true, emerExit: true, calls: false, evac: false,
      // LIGHTS
      landingL: false, landingR: false, taxiL: false, noseL: false,
      navL: true, strobe: true, beacon: false, logoL: true,
      wingL: false, rwyTurn: false,
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
    if (this.isFighter) {
      this._renderHUD();
      this._renderMFDLeft();
      this._renderMFDRight();
      this._renderDED();
    }
  }

  setInput(pitch, roll, yaw) {
    this.input.pitch = pitch;
    this.input.roll = roll;
    this.input.yaw = yaw;
    this._animateSidestick();
    this._animatePedals();
  }

  // ============================================================
  // BUILD
  // ============================================================

  _build() {
    if (this.isFighter) {
      this._buildFighterShell();
      this._buildFighterPanel();
      this._buildFighterSideSticks();
      this._buildFighterCenterConsole();
      this._buildFighterOverhead();
    } else {
      this._buildShell();
      this._buildGlareshield();
      this._buildMainPanel();
      this._buildFCU();
      this._buildCenterPedestal();
      this._buildMCDUandRadio();
      this._buildOverhead();
      this._buildSidesticks();
      this._buildRudderPedals();
      this._buildSeats();
      this._buildChronoAndWarnings();
    }
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
      new THREE.BoxGeometry(2.4, 0.58, 0.1),
      new THREE.MeshStandardMaterial({ color: COL.panel, roughness: 0.75, metalness: 0.1 })
    );
    panel.position.set(0, 1.18, 0.9);
    panel.rotation.x = -0.22;
    this.group.add(panel);

    const panelFrame = new THREE.Group();
    panelFrame.position.set(0, 1.18, 0.9);
    panelFrame.rotation.x = -0.22;
    this.group.add(panelFrame);

    // Dual-Pilot Layout (Airbus): Capt PFD | Capt ND | EWD | SD | F/O ND | F/O PFD
    const dz = 0.055;
    const W = 0.26, H = 0.26;
    this.parts.pfd  = this._addDisplay(panelFrame, -0.86, 0.02, dz, W, H, 'pfd',  512);
    this.parts.nd   = this._addDisplay(panelFrame, -0.56, 0.02, dz, W, H, 'nd',   512);
    this.parts.ewd  = this._addDisplay(panelFrame, -0.26, 0.02, dz, W, H, 'ewd',  512);
    this.parts.sd   = this._addDisplay(panelFrame,  0.04, 0.02, dz, W, H, 'sd',   512);
    // F/O-Displays (spiegeln Captain's Texturen für maximale Performance)
    this._addMirrorDisplay(panelFrame, 0.34, 0.02, dz, W, H, this.textures.nd);
    this._addMirrorDisplay(panelFrame, 0.64, 0.02, dz, W, H, this.textures.pfd);

    // Standby-Instrumente (ISIS) zentral unter EWD
    this.parts.sby = this._addDisplay(panelFrame, -0.11, -0.19, dz, 0.12, 0.12, 'sby', 256);

    // Zusätzlicher Schriftzug "CAPT" und "F/O" unter den Displays
    const addSide = (x, text) => {
      const cv = document.createElement('canvas');
      cv.width = 128; cv.height = 32;
      const c = cv.getContext('2d');
      c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, 128, 32);
      c.fillStyle = '#888'; c.font = 'bold 14px Arial'; c.textAlign = 'center';
      c.fillText(text, 64, 22);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      const lbl = new THREE.Mesh(
        new THREE.PlaneGeometry(0.1, 0.02),
        new THREE.MeshBasicMaterial({ map: t, toneMapped: false, transparent: true })
      );
      lbl.position.set(x, -0.185, dz - 0.001);
      panelFrame.add(lbl);
    };
    addSide(-0.71, 'CAPT');
    addSide( 0.49, 'F/O');

    this._renderPFD();
    this._renderND();
    this._renderEWD();
    this._renderSD();
    this._renderStandby();
  }

  _addMirrorDisplay(parent, x, y, z, w, h, tex) {
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.02, h + 0.02, 0.012),
      new THREE.MeshStandardMaterial({ color: COL.screenBezel, roughness: 0.5, metalness: 0.4 })
    );
    bezel.position.set(x, y, z - 0.005);
    parent.add(bezel);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    );
    screen.position.set(x, y, z);
    parent.add(screen);
    return screen;
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

    // THROTTLE-DETENT-PLATE — zentrale Platte mit Markierungen zwischen den 2 Throttles
    const detentCv = document.createElement('canvas');
    detentCv.width = 128; detentCv.height = 512;
    const dc = detentCv.getContext('2d');
    dc.fillStyle = '#050505'; dc.fillRect(0, 0, 128, 512);
    dc.fillStyle = '#b8b8a0'; dc.font = 'bold 13px Arial'; dc.textAlign = 'center';
    // Airbus-Detents: TO/GA, FLX/MCT, CLB, IDLE, REV (von vorne nach hinten)
    const detents = [
      { y: 40,  lbl: 'TO/GA', color: '#ffffff' },
      { y: 115, lbl: 'FLX/MCT', color: '#ffffff' },
      { y: 200, lbl: 'CLB', color: '#ffcc33' },
      { y: 320, lbl: 'IDLE', color: '#ffffff' },
      { y: 455, lbl: 'REV', color: '#ff4433' },
    ];
    for (const d of detents) {
      dc.fillStyle = d.color; dc.fillText(d.lbl, 64, d.y);
      dc.strokeStyle = '#4a4a4a'; dc.lineWidth = 1;
      dc.beginPath(); dc.moveTo(12, d.y + 6); dc.lineTo(116, d.y + 6); dc.stroke();
    }
    const detentTex = new THREE.CanvasTexture(detentCv); detentTex.colorSpace = THREE.SRGBColorSpace;
    const detentPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, 0.32),
      new THREE.MeshBasicMaterial({ map: detentTex, toneMapped: false })
    );
    detentPlate.rotation.x = -Math.PI / 2;
    detentPlate.position.set(0, 0.967, 0.3);
    this.group.add(detentPlate);

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
  // OVERHEAD — Airbus-Style mit beleuchteten Pushbutton-Switches
  // ------------------------------------------------------------

  _buildOverhead() {
    // Frame-Group: alle Overhead-Kinder teilen diese Rotation → korrekte Ausrichtung
    // Lokale Achsen im Frame (nach Rotation π/2 - 0.35 um X):
    //   +x  → +x world (links/rechts)
    //   +y  → mostly +z world (nach hinten Richtung Pilot)
    //   +z  → mostly -y world (nach unten Richtung Pilot) = Unterseite des Panels
    const ohFrame = new THREE.Group();
    ohFrame.position.set(0, 2.04, 0.5);
    ohFrame.rotation.x = Math.PI / 2 - 0.35;
    this.group.add(ohFrame);
    this.parts.ohFrame = ohFrame;

    // Panel-Körper (1.55 breit, 0.75 "tief" entlang world Z, 0.08 dünn)
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.75, 0.08),
      new THREE.MeshStandardMaterial({ color: COL.overhead, roughness: 0.8 })
    );
    ohFrame.add(panel);

    // Bedruckte Label-Textur auf Unterseite (lokal +Z)
    const lblCv = document.createElement('canvas');
    lblCv.width = 1550; lblCv.height = 750;
    const lc = lblCv.getContext('2d');
    lc.fillStyle = '#4a4a3d'; lc.fillRect(0, 0, 1550, 750);
    const secs = [
      { x: 20,   w: 280, title: 'ELEC' },
      { x: 310,  w: 260, title: 'FUEL' },
      { x: 580,  w: 280, title: 'AIR COND' },
      { x: 870,  w: 280, title: 'ANTI ICE / HYD' },
      { x: 1160, w: 370, title: 'EXT / INT LT · SIGNS' },
    ];
    lc.textAlign = 'center';
    for (const s of secs) {
      lc.fillStyle = '#1a1a14'; lc.fillRect(s.x, 14, s.w, 32);
      lc.fillStyle = '#e0e0cc'; lc.font = 'bold 22px Arial';
      lc.fillText(s.title, s.x + s.w/2, 38);
      lc.strokeStyle = '#22221a'; lc.lineWidth = 3;
      lc.strokeRect(s.x, 14, s.w, 720);
    }
    lc.font = 'bold 14px Arial'; lc.fillStyle = '#bbbbac';
    lc.fillText('HYD', 995, 62);
    lc.fillText('FIRE', 60, 62);
    const lblTex = new THREE.CanvasTexture(lblCv); lblTex.colorSpace = THREE.SRGBColorSpace;
    const labelPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 0.75),
      new THREE.MeshBasicMaterial({ map: lblTex, toneMapped: false })
    );
    labelPlate.position.z = 0.041;
    // Plane-Default-Normale ist +Z (lokal) → weltweit -Y (nach unten). Perfekt.
    // Kein zusätzliches Flippen nötig: Canvas-Text landet richtig herum, weil PFD etc. es auch tun.
    ohFrame.add(labelPlate);

    // Layout: 5 Sektionen mit xLocal-Mitte, jeweils 3-4 Spalten, 6 Reihen (yLocal)
    // yLocal: -0.34 (Panel-vorne, Windshield-nah) bis +0.34 (Panel-hinten, Pilot-nah)
    const ROWS = [-0.30, -0.22, -0.14, -0.06, 0.02, 0.10, 0.18, 0.26];

    this.parts.pbs = {};
    const place = (xCenter, col, slots, row, key, upper, lower) => {
      const pbW = 0.062;
      const x = xCenter + (col - (slots - 1) / 2) * pbW;
      this.parts.pbs[key] = this._makeAirbusPB_inFrame(ohFrame, x, ROWS[row], 0.048, key, upper, lower);
    };

    // ELEC (xE = -0.63)
    const xE = -0.63;
    place(xE, 0, 3, 1, 'batt1',     'BAT 1',   'OFF');
    place(xE, 1, 3, 1, 'batt2',     'BAT 2',   'OFF');
    place(xE, 2, 3, 1, 'extPwr',    'EXT PWR', 'AVAIL');
    place(xE, 0, 3, 2, 'gen1',      'GEN 1',   'OFF');
    place(xE, 1, 3, 2, 'gen2',      'GEN 2',   'OFF');
    place(xE, 2, 3, 2, 'apuGen',    'APU GEN', 'OFF');
    place(xE, 0, 3, 3, 'busTie',    'BUS TIE', 'OFF');
    place(xE, 1, 3, 3, 'idg1',      'IDG 1',   'OFF');
    place(xE, 2, 3, 3, 'idg2',      'IDG 2',   'OFF');
    place(xE, 0, 3, 4, 'apuMaster', 'APU MSTR','ON');
    place(xE, 1, 3, 4, 'apuStart',  'START',   'AVAIL');
    place(xE, 2, 3, 4, 'galy',      'GALY',    'OFF');

    // FUEL (xF = -0.27)
    const xF = -0.27;
    place(xF, 0, 3, 1, 'fuelPump1L', 'L TK 1', 'OFF');
    place(xF, 1, 3, 1, 'ctrPump1',   'CTR 1',  'OFF');
    place(xF, 2, 3, 1, 'fuelPump2R', 'R TK 1', 'OFF');
    place(xF, 0, 3, 2, 'fuelPump2L', 'L TK 2', 'OFF');
    place(xF, 1, 3, 2, 'ctrPump2',   'CTR 2',  'OFF');
    place(xF, 2, 3, 2, 'fuelPump1R', 'R TK 2', 'OFF');
    place(xF, 0, 3, 3, 'xFeed',      'X FEED', 'OPEN');
    place(xF, 1, 3, 3, 'fuelMode',   'MODE',   'MAN');

    // AIR COND (xA = 0.10)
    const xA = 0.10;
    place(xA, 0, 3, 1, 'pack1',    'PACK 1',  'OFF');
    place(xA, 1, 3, 1, 'pack2',    'PACK 2',  'OFF');
    place(xA, 2, 3, 1, 'hotAir',   'HOT AIR', 'OFF');
    place(xA, 0, 3, 2, 'apuBleed', 'APU BLD', 'OFF');
    place(xA, 1, 3, 2, 'eng1Bld',  'ENG1 BLD','OFF');
    place(xA, 2, 3, 2, 'eng2Bld',  'ENG2 BLD','OFF');
    place(xA, 0, 3, 3, 'xBleed',   'X BLEED', 'SHUT');
    place(xA, 1, 3, 3, 'ramAir',   'RAM AIR', 'OFF');
    place(xA, 2, 3, 3, 'press',    'CABIN',   'AUTO');

    // ANTI-ICE / HYD (xI = 0.48)
    const xI = 0.48;
    place(xI, 0, 3, 1, 'wingAntiIce','WING', 'OFF');
    place(xI, 1, 3, 1, 'eng1AntiIce','ENG 1','OFF');
    place(xI, 2, 3, 1, 'eng2AntiIce','ENG 2','OFF');
    place(xI, 0, 3, 2, 'probeHeat',  'PROBE','AUTO');
    place(xI, 1, 3, 2, 'pitotHeat',  'PITOT','OFF');
    place(xI, 2, 3, 2, 'windowHeat', 'WINDOW','OFF');
    place(xI, 0, 3, 4, 'hydG',       'HYD G','OFF');
    place(xI, 1, 3, 4, 'hydB',       'HYD B','OFF');
    place(xI, 2, 3, 4, 'hydY',       'HYD Y','OFF');
    place(xI, 1, 3, 5, 'ptu',        'PTU',  'AUTO');

    // LIGHTS/SIGNS (xL = 0.92)
    const xL = 0.92;
    place(xL, 0, 4, 1, 'landingL',  'LAND L', 'OFF');
    place(xL, 1, 4, 1, 'landingR',  'LAND R', 'OFF');
    place(xL, 2, 4, 1, 'taxiL',     'TAXI',   'OFF');
    place(xL, 3, 4, 1, 'noseL',     'NOSE',   'OFF');
    place(xL, 0, 4, 2, 'strobe',    'STROBE', 'AUTO');
    place(xL, 1, 4, 2, 'beacon',    'BCN',    'OFF');
    place(xL, 2, 4, 2, 'navL',      'NAV',    'OFF');
    place(xL, 3, 4, 2, 'logoL',     'LOGO',   'OFF');
    place(xL, 0, 4, 3, 'wingL',     'WING',   'OFF');
    place(xL, 1, 4, 3, 'rwyTurn',   'RWY TRN','OFF');
    place(xL, 2, 4, 3, 'seatbelt',  'SEAT',   'AUTO');
    place(xL, 3, 4, 3, 'noSmoke',   'SMOKING','AUTO');
    place(xL, 0, 4, 4, 'emerExit',  'EMER EX','ARM');
    place(xL, 1, 4, 4, 'calls',     'CALLS',  'OFF');
    place(xL, 2, 4, 4, 'evac',      'EVAC',   'ARM');

    // FIRE-Schalter (Guarded, links unten im ELEC-Bereich)
    this.parts.guarded = this.parts.guarded || {};
    const fireRow = ROWS[6];
    this.parts.guarded.eng1Master = this._makeGuardedSwitchInFrame(ohFrame, -0.72, fireRow, 0.05, 'eng1Master', 'ENG 1 FIRE');
    this.parts.guarded.eng2Master = this._makeGuardedSwitchInFrame(ohFrame, -0.65, fireRow, 0.05, 'eng2Master', 'ENG 2 FIRE');
    this.parts.guarded.apuFire    = this._makeGuardedSwitchInFrame(ohFrame, -0.58, fireRow, 0.05, 'apuFire',    'APU FIRE');
  }

  // Airbus-Pushbutton innerhalb eines Frame-Groups (Frame handhabt Rotation)
  _makeAirbusPB_inFrame(parent, x, y, z, key, upperText, lowerText) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);

    // Body protrudiert in +Z-Richtung (lokal) = nach unten zum Piloten (in world)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.045, 0.014),
      new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.55, metalness: 0.15 })
    );
    body.position.z = 0.007;
    g.add(body);

    // Face: PlaneGeometry, Default-Normale +Z (lokal) → nach unten in world
    const W = 128, H = 112;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.05, 0.042),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    );
    face.position.z = 0.015;
    g.add(face);

    // Hitbox
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.05, 0.025),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.z = 0.012;
    g.add(hit);
    hit.userData.clickable = true;
    hit.userData.action = { type: 'toggle', key };
    this.clickables.push(hit);

    const draw = (on) => {
      const c = cv.getContext('2d');
      c.fillStyle = '#0e0e12'; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#1e1e22'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(4, H/2); c.lineTo(W-4, H/2); c.stroke();
      c.textAlign = 'center';
      c.fillStyle = on ? '#ffffff' : '#6a6a6e';
      c.font = 'bold 22px Arial';
      c.fillText(upperText, W/2, H/2 - 10);
      if (lowerText) {
        c.fillStyle = on ? '#3a3a3e' : '#d8d8c0';
        c.font = 'bold 18px Arial';
        c.fillText(lowerText, W/2, H/2 + 30);
      }
      tex.needsUpdate = true;
    };
    draw(!!this.s[key]);

    return { group: g, face, draw, key };
  }

  // Guarded Switch innerhalb eines Frame-Groups
  _makeGuardedSwitchInFrame(parent, x, y, z, key, label) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.05, 0.025),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6 })
    );
    body.position.z = 0.012;
    g.add(body);

    const guardPivot = new THREE.Group();
    guardPivot.position.z = 0.024;
    g.add(guardPivot);
    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.058, 0.048, 0.004),
      new THREE.MeshStandardMaterial({ color: 0xcc1111, metalness: 0.2, roughness: 0.5 })
    );
    guard.position.y = 0.024;
    guardPivot.add(guard);
    guardPivot.rotation.x = this.s[key] ? 1.3 : 0;

    // Hit
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.06, 0.03),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.z = 0.018;
    g.add(hit);
    hit.userData.clickable = true;
    hit.userData.action = { type: 'toggle', key };
    this.clickables.push(hit);

    return { group: g, guardPivot };
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
  // SIDESTICKS — Airbus-Style (2 Stück: Captain links, F/O rechts)
  // ------------------------------------------------------------

  _buildSidesticks() {
    this.parts.sidesticks = {};
    for (const side of ['capt', 'fo']) {
      const x = side === 'capt' ? -0.92 : 0.92;
      const g = new THREE.Group();
      g.position.set(x, 0.82, -0.1);
      this.group.add(g);

      // Basisplatte mit Typenschild
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.025, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.6 })
      );
      base.position.y = 0;
      g.add(base);
      // Seitenkonsole-Erhöhung unter der Basis
      const console_ = new THREE.Mesh(
        new THREE.BoxGeometry(0.17, 0.2, 0.45),
        new THREE.MeshStandardMaterial({ color: COL.sidewall, roughness: 0.85 })
      );
      console_.position.set(0, -0.12, 0.05);
      g.add(console_);

      // Pivot für Pitch-/Roll-Bewegung
      const pivot = new THREE.Group();
      pivot.position.y = 0.015;
      g.add(pivot);

      // Schaft (leicht nach vorne geneigt)
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.028, 0.13, 14),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.4, roughness: 0.55 })
      );
      shaft.position.y = 0.07;
      pivot.add(shaft);

      // Faltenbalg (gummiert) um den Schaft
      const boot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.04, 0.04, 16),
        new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95 })
      );
      boot.position.y = 0.025;
      pivot.add(boot);

      // Griff (ergonomischer Kegelstumpf, typisch Airbus)
      const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.04, 0.13, 14),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6 })
      );
      grip.position.y = 0.19;
      pivot.add(grip);
      // Griff-Rückseite flacher
      const gripBack = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.13, 0.055),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6 })
      );
      gripBack.position.set(0, 0.19, -0.028);
      pivot.add(gripBack);

      // Trigger (vorne am Griff)
      const trig = new THREE.Mesh(
        new THREE.BoxGeometry(0.022, 0.045, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x080808 })
      );
      trig.position.set(0, 0.165, 0.037);
      pivot.add(trig);

      // A/P-Disconnect-Button (rot, auf der Spitze)
      const apDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013, 0.013, 0.008, 14),
        new THREE.MeshStandardMaterial({ color: 0xcc0a0a, emissive: 0x330000 })
      );
      apDisc.position.y = 0.262;
      pivot.add(apDisc);

      // Priority-Pushbutton (seitlich, schwarz)
      const prioBtn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.009, 0.005, 12),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      prioBtn.rotation.z = Math.PI / 2;
      prioBtn.position.set(side === 'capt' ? 0.034 : -0.034, 0.2, 0);
      pivot.add(prioBtn);

      // Typenschild auf der Seitenkonsole
      const lblCv = document.createElement('canvas');
      lblCv.width = 256; lblCv.height = 64;
      const lc = lblCv.getContext('2d');
      lc.fillStyle = '#0a0a0a'; lc.fillRect(0, 0, 256, 64);
      lc.fillStyle = '#c8c8bc'; lc.font = 'bold 18px Arial'; lc.textAlign = 'center';
      lc.fillText(side === 'capt' ? 'CAPT' : 'F/O', 128, 26);
      lc.font = 'bold 14px Arial';
      lc.fillText('SIDESTICK', 128, 48);
      const tex = new THREE.CanvasTexture(lblCv); tex.colorSpace = THREE.SRGBColorSpace;
      const lbl = new THREE.Mesh(
        new THREE.PlaneGeometry(0.08, 0.02),
        new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
      );
      lbl.position.set(0, 0.014, 0.06);
      lbl.rotation.x = -Math.PI / 2;
      g.add(lbl);

      // Klickbar für AP-Disc (Kapitänsstick)
      if (side === 'capt') {
        apDisc.userData.clickable = true;
        apDisc.userData.action = { type: 'mcpBtn', key: 'autopilot' };
        this.clickables.push(apDisc);
      }

      this.parts.sidesticks[side] = { pivot, apDisc };
    }
    this._animateSidestick();
  }

  _animateSidestick() {
    const ss = this.parts.sidesticks;
    if (!ss) return;
    // Captain-Sidestick bewegt sich mit Input
    const capt = ss.capt?.pivot;
    if (capt) {
      capt.rotation.x = THREE.MathUtils.clamp(-this.input.pitch * 0.35, -0.45, 0.45);
      capt.rotation.z = THREE.MathUtils.clamp(this.input.roll * 0.35, -0.45, 0.45);
    }
    // Fighter side stick
    const fStick = this.parts.sideStick;
    if (fStick && this.isFighter) {
      fStick.rotation.x = THREE.MathUtils.clamp(-this.input.pitch * 0.4, -0.5, 0.5);
      fStick.rotation.z = THREE.MathUtils.clamp(this.input.roll * 0.4, -0.5, 0.5);
    }
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

    // Airbus-Pushbuttons neu zeichnen, wenn Zustand sich geändert hat
    const pbs = this.parts.pbs || {};
    for (const pb of Object.values(pbs)) {
      if (!pb || !pb.draw) continue;
      const on = !!this.s[pb.key];
      if (pb._lastOn !== on) { pb.draw(on); pb._lastOn = on; }
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

    // Sidestick AP-Disc-Button bei Stall blinken
    if (this.parts.sidesticks?.capt?.apDisc) {
      const m = this.parts.sidesticks.capt.apDisc.material;
      if (this.flight.stallWarning) {
        m.emissive.setHex(0xff0000);
        m.emissiveIntensity = (Math.sin(Date.now() / 120) * 0.5 + 0.7);
      } else {
        m.emissive.setHex(0x330000);
        m.emissiveIntensity = 1;
      }
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

    // FMA-Bar (Airbus Style - 5 columns)
    ctx.fillStyle = '#111'; ctx.fillRect(5, 5, W - 10, 32);
    ctx.strokeStyle = '#333'; ctx.strokeRect(5, 5, W - 10, 32);
    const fmaCols = [
      { t: this.flight.autopilot ? 'CLB' : '', color: '#33ff66' },
      { t: 'HDG', color: this.s.apHdgHold ? '#33ff66' : '#33ff66' },
      { t: 'ALT', color: this.s.apAltHold ? '#33ff66' : '#33ff66' },
      { t: this.s.apLoc ? 'LOC' : '', color: '#ffffff' },
      { t: this.flight.autopilot ? 'AP1' : '', color: '#ffffff' },
    ];
    const cw = (W - 10) / 5;
    ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
    fmaCols.forEach((f, i) => {
      ctx.fillStyle = f.color;
      ctx.fillText(f.t, 5 + cw * i + cw / 2, 27);
    });

    // Main Attitude Area
    const cx = W / 2, cy = H / 2 + 25;

    // Sky/Brown background (pitch-sensitive)
    ctx.save();
    ctx.beginPath(); ctx.rect(70, 55, W - 140, H - 140); ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-this.flight.roll);
    const pitchOff = this.flight.pitch * 7; // 1° pitch = 7 pixels
    ctx.fillStyle = '#0055a5'; ctx.fillRect(-300, -350 + pitchOff, 600, 350);
    ctx.fillStyle = '#8b6914'; ctx.fillRect(-300, pitchOff, 600, 350);
    ctx.restore();

    // Pitch ladder lines (every 5°, labeled every 10°)
    ctx.save();
    ctx.beginPath(); ctx.rect(70, 55, W - 140, H - 140); ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-this.flight.roll);
    ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.lineWidth = 1;
    for (let p = -60; p <= 60; p += 5) {
      if (p === 0) continue;
      const y = -p * 7 + this.flight.pitch * 7;
      const w = p % 10 === 0 ? 70 : 35;
      ctx.beginPath();
      if (p > 0) { ctx.moveTo(-w, y); ctx.lineTo(w, y); }
      else { ctx.moveTo(-w, y); ctx.lineTo(w, y); }
      ctx.stroke();
      if (p % 10 === 0) {
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.abs(p)}`, -w - 5, y + 4);
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.abs(p)}`, w + 5, y + 4);
      }
    }
    // Horizon line (solid)
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-200, this.flight.pitch * 7); ctx.lineTo(200, this.flight.pitch * 7); ctx.stroke();
    ctx.restore();

    // Bank angle scale (top arc)
    ctx.save();
    ctx.translate(cx, cy - 150);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    // Scale: ±10°, ±20°, ±30°, ±45°, ±60°
    const bankAngles = [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60];
    for (const ba of bankAngles) {
      ctx.save();
      ctx.rotate(ba * DEG);
      ctx.beginPath(); ctx.moveTo(0, -130); ctx.lineTo(0, -130 + (Math.abs(ba) % 30 === 0 ? 16 : 10)); ctx.stroke();
      ctx.restore();
    }
    // Bank pointer (triangle at bottom)
    ctx.rotate(-this.flight.roll);
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath(); ctx.moveTo(0, -130); ctx.lineTo(-9, -115); ctx.lineTo(9, -115); ctx.closePath(); ctx.fill();
    ctx.restore();

    // Aircraft symbol (fixed, centered)
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 4; ctx.fillStyle = '#ffcc00';
    ctx.beginPath(); ctx.moveTo(cx - 80, cy); ctx.lineTo(cx - 25, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 25, cy); ctx.lineTo(cx + 80, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 25, cy); ctx.lineTo(cx - 25, cy + 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 25, cy); ctx.lineTo(cx + 25, cy + 12); ctx.stroke();
    ctx.fillRect(cx - 6, cy - 6, 12, 12);

    // Slip indicator
    ctx.fillStyle = '#222'; ctx.fillRect(cx - 55, cy + 138, 110, 12);
    ctx.strokeStyle = '#666'; ctx.strokeRect(cx - 55, cy + 138, 110, 12);
    const slipX = cx + THREE.MathUtils.clamp(this.flight.roll * 45, -45, 45);
    ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(slipX, cy + 144, 6, 0, Math.PI * 2); ctx.fill();

    // === LEFT SIDE: Speed Tape ===
    const spd = this.flight.speed * 1.944;
    const spdTapeX = 14;
    ctx.fillStyle = '#000'; ctx.fillRect(spdTapeX, 45, 70, H - 90);
    ctx.strokeStyle = '#444'; ctx.strokeRect(spdTapeX, 45, 70, H - 90);

    ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#aaa';
    ctx.textAlign = 'right';
    ctx.fillText('KT', spdTapeX + 66, 58);

    ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    const targetSpd = Math.round(spd / 10) * 10;
    for (let d = -5; d <= 5; d++) {
      const v = targetSpd + d * 10;
      if (v < 50 || v > 500) continue;
      const ty = cy + (targetSpd - v) * 2.2;
      if (ty < 55 || ty > H - 35) continue;
      ctx.fillStyle = v === targetSpd ? '#fff' : '#888';
      ctx.fillText(`${v}`, spdTapeX + 35, ty + 5);
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
      ctx.beginPath();
      if (v % 20 === 0) { ctx.moveTo(spdTapeX, ty); ctx.lineTo(spdTapeX + 14, ty); }
      else { ctx.moveTo(spdTapeX + 8, ty); ctx.lineTo(spdTapeX + 14, ty); }
      ctx.stroke();
    }
    // Speed window
    ctx.fillStyle = '#000'; ctx.fillRect(spdTapeX - 2, cy - 20, 74, 40);
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2; ctx.strokeRect(spdTapeX - 2, cy - 20, 74, 40);
    ctx.font = 'bold 22px monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(spd)}`, spdTapeX + 35, cy + 8);
    // V/S bug on speed tape
    if (this.flight.vs > 100) { ctx.fillStyle = '#33ff66'; ctx.fillText('▲', spdTapeX + 62, cy - 5); }
    if (this.flight.vs < -100) { ctx.fillStyle = '#ff4444'; ctx.fillText('▼', spdTapeX + 62, cy + 15); }

    // === RIGHT SIDE: Altitude Tape ===
    const alt = this.flight.altitude * 3.281;
    const altTapeX = W - 84;
    ctx.fillStyle = '#000'; ctx.fillRect(altTapeX, 45, 70, H - 90);
    ctx.strokeStyle = '#444'; ctx.strokeRect(altTapeX, 45, 70, H - 90);

    ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#aaa';
    ctx.textAlign = 'left';
    ctx.fillText('FT', altTapeX + 4, 58);

    ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    const targetAlt = Math.round(alt / 100) * 100;
    for (let d = -5; d <= 5; d++) {
      const v = targetAlt + d * 100;
      if (v < 0) continue;
      const ty = cy + (targetAlt - v) * 0.5;
      if (ty < 55 || ty > H - 35) continue;
      ctx.fillStyle = v === targetAlt ? '#fff' : '#888';
      ctx.fillText(`${v}`, altTapeX + 35, ty + 5);
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(altTapeX + 56, ty); ctx.lineTo(altTapeX + 70, ty); ctx.stroke();
    }
    // Altitude window
    ctx.fillStyle = '#000'; ctx.fillRect(altTapeX - 2, cy - 20, 74, 40);
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2; ctx.strokeRect(altTapeX - 2, cy - 20, 74, 40);
    ctx.font = 'bold 22px monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(alt)}`, altTapeX + 35, cy + 8);

    // === V/S Indicator (right edge) ===
    const vsFpm = this.flight.vs * 196.85;
    ctx.fillStyle = '#000'; ctx.fillRect(W - 14, 80, 12, H - 170);
    const vy = cy - THREE.MathUtils.clamp(vsFpm / 1500, -1, 1) * 120;
    ctx.fillStyle = '#33ff66';
    ctx.fillRect(W - 16, vy - 2, 16, 5);

    // === Heading Tape (bottom) ===
    ctx.fillStyle = '#000'; ctx.fillRect(80, H - 65, W - 160, 50);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(80, H - 65, W - 160, 50);

    ctx.save();
    ctx.beginPath(); ctx.rect(80, H - 65, W - 160, 50); ctx.clip();
    ctx.translate(cx - this.flight.heading * 3, 0);
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    for (let d = -45; d <= 45; d += 5) {
      const v = ((Math.round(this.flight.heading / 10) * 10 + d) % 360 + 360) % 360;
      const x = cx + d * 6;
      ctx.fillStyle = '#fff';
      const label = v === 0 ? 'N' : v === 90 ? 'E' : v === 180 ? 'S' : v === 270 ? 'W' : `${v}`;
      ctx.fillText(label, x, H - 50);
      if (v % 30 === 0) {
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, H - 38); ctx.lineTo(x, H - 32); ctx.stroke();
      }
    }
    ctx.restore();

    // Heading window
    ctx.fillStyle = '#000'; ctx.fillRect(cx - 38, H - 25, 76, 22);
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2; ctx.strokeRect(cx - 38, H - 25, 76, 22);
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    const hdgLabel = ['N','N','E','SE','S','SW','W','NW'][Math.round(this.flight.heading / 45) % 8];
    ctx.fillText(`${hdgLabel} ${Math.round(this.flight.heading).toString().padStart(3,'0')}°`, cx, H - 8);

    // ILS indicator
    if (this.s.apAppr) {
      ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 1.5;
      ctx.strokeRect(W - 88, 70, 80, 22);
      ctx.fillStyle = '#00ff00'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
      ctx.fillText('ILS', W - 84, 82);
    }

    // G-Force display (bottom left corner)
    ctx.fillStyle = Math.abs(this.flight.gLoad) > 3.5 ? '#ff4444' : '#aaa';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`G ${this.flight.gLoad.toFixed(2)}`, 18, H - 18);

    // Radio Alt (bottom left area)
    if (this.flight.altitude < 2500) {
      const radioAlt = Math.max(0, this.flight.altitude - 2).toFixed(0);
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 12px monospace';
      ctx.fillText(`RA ${radioAlt}`, 18, 75);
    }

    // Landing gear indication
    if (!this.flight.gear && this.flight.altitude < 1000) {
      ctx.fillStyle = '#ff4444'; ctx.font = 'bold 14px monospace';
      ctx.fillText('GEAR UP', cx - 30, cy - 100);
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

    // Mode selector
    ctx.fillStyle = '#00cc66'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
    ctx.fillText('ARC  80', 15, 22);
    ctx.textAlign = 'right'; ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText(`GS ${Math.round(this.flight.speed * 1.944)} kt`, W - 15, 22);
    ctx.fillText(`TAS ${Math.round(this.flight.speed * 1.944 * 0.98)} kt`, W - 15, 36);

    const cx = W / 2, cy = H / 2 + 100;

    // Compass rose with rotating frame
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-this.flight.heading * DEG);

    // Range rings (80, 40, 20 NM if scale is 80)
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1;
    for (const r of [60, 120, 180]) {
      ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();
    }

    // Outer compass arc with ticks
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 200, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();

    // Heading ticks and labels
    ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    for (let h = -90; h <= 90; h += 10) {
      const rad = (90 + h) * DEG;
      const px = Math.sin(rad) * 200, py = -Math.cos(rad) * 200;
      const px2 = Math.sin(rad) * 215, py2 = -Math.cos(rad) * 215;
      if (h === 0) continue;
      ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px2, py2); ctx.stroke();
    }

    // N/E/S/W labels
    ctx.fillStyle = '#fff';
    ctx.fillText('N', 0, -220); ctx.fillText('E', 220, 0); ctx.fillText('S', 0, 220); ctx.fillText('W', -220, 0);

    // Track line (dashed cyan line showing actual track)
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -180); ctx.stroke();
    ctx.setLineDash([]);

    // Weather radar if stormy (red blobs)
    if (currentWeather?.turbulence > 0.3) {
      ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
      ctx.beginPath(); ctx.arc(60, -40, 30, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-30, 20, 25, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();

    // Navigation beacons (VOR/NDB)
    ctx.fillStyle = '#00ffff'; ctx.font = '10px monospace';
    ctx.fillText('VOR', cx + 40, cy - 80);
    ctx.fillStyle = '#ffaa00';
    ctx.fillText('NDB', cx - 70, cy + 30);

    // Ground track vector (short line ahead of aircraft)
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy - 30); ctx.stroke();

    this.textures.nd.needsUpdate = true;
  }

  _renderSD() {
    const ctx = this.sdCtx;
    const W = 512, H = 450;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#222'; ctx.strokeRect(5, 5, W - 10, H - 10);

    // === HYDRAULIC SYSTEMS ===
    ctx.fillStyle = '#ccc'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('HYDRAULIC', W / 2, 30);

    const hydColors = { G: '#33ff55', B: '#3366ff', Y: '#ffcc00' };
    const hydPress = { G: 2850, B: 2800, Y: 2750 };
    const hydX = [W / 2 - 130, W / 2, W / 2 + 130];
    for (let i = 0; i < 3; i++) {
      const sys = ['G', 'B', 'Y'][i];
      ctx.fillStyle = hydColors[sys]; ctx.font = 'bold 12px monospace';
      ctx.fillText(sys + ' SYS', hydX[i], 55);
      // Reservoir shape
      ctx.strokeStyle = hydColors[sys]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hydX[i] - 25, 65); ctx.lineTo(hydX[i] + 25, 65);
      ctx.lineTo(hydX[i] + 20, 100); ctx.lineTo(hydX[i] - 20, 100); ctx.closePath(); ctx.stroke();
      // Pressure value
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace';
      ctx.fillText(`${hydPress[sys]} PSI`, hydX[i], 90);
    }

    // === FUEL SYSTEM ===
    ctx.fillStyle = '#ccc'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('FUEL', W / 2, 130);

    const fuelKg = Math.round(this.flight.fuel * 18000);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace';
    ctx.fillText(`${fuelKg} KG`, W / 2, 150);

    // Fuel tank visualization
    const tanks = [
      { label: 'L', x: 80, w: 60 },
      { label: 'C', x: W / 2 - 30, w: 60 },
      { label: 'R', x: W - 140, w: 60 },
    ];
    ctx.fillStyle = '#222'; ctx.fillRect(60, 160, W - 120, 20);
    ctx.strokeStyle = '#444'; ctx.strokeRect(60, 160, W - 120, 20);
    const totalFuel = this.flight.fuel;
    let fillX = 60;
    for (const t of tanks) {
      const fW = (W - 120) / 3 * totalFuel;
      ctx.fillStyle = '#3399ff'; ctx.fillRect(fillX, 160, fW, 20);
      fillX += (W - 120) / 3;
    }
    ctx.fillStyle = '#888'; ctx.font = '10px monospace';
    ctx.fillText('L', 80, 195); ctx.fillText('C', W / 2, 195); ctx.fillText('R', W - 80, 195);

    // === ELECTRICAL ===
    ctx.fillStyle = '#ccc'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('ELECTRICAL', W / 2, 220);

    const genStates = [
      { label: 'GEN 1', on: this.s.gen1, x: 80 },
      { label: 'GEN 2', on: this.s.gen2, x: W / 2 },
      { label: 'APU GEN', on: this.s.apuGen, x: W - 80 },
    ];
    for (const g of genStates) {
      ctx.fillStyle = g.on ? '#33ff55' : '#444'; ctx.font = 'bold 11px monospace';
      ctx.fillText(g.label, g.x, 240);
      ctx.fillText(g.on ? 'ON' : 'OFF', g.x, 255);
    }

    // === ANTI-ICE ===
    ctx.fillStyle = '#ccc'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('ANTI-ICE', W / 2, 285);

    const iceItems = [
      { label: 'WING', on: this.s.wingAntiIce, x: 90 },
      { label: 'ENG 1', on: this.s.eng1AntiIce, x: W / 2 - 60 },
      { label: 'ENG 2', on: this.s.eng2AntiIce, x: W / 2 + 60 },
      { label: 'PROBE', on: this.s.probeHeat, x: W - 90 },
    ];
    for (const item of iceItems) {
      ctx.fillStyle = item.on ? '#33ff55' : '#444'; ctx.font = 'bold 11px monospace';
      ctx.fillText(item.label, item.x, 305);
      ctx.fillStyle = item.on ? '#33ff55' : '#555';
      ctx.fillRect(item.x - 18, 310, 36, 8);
    }

    // === PRESSURIZATION ===
    ctx.fillStyle = '#ccc'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left';
    ctx.fillText('CABIN', 30, 345);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace';
    ctx.fillText('1013 HPA', 30, 365);
    ctx.fillStyle = '#888'; ctx.font = '11px monospace';
    ctx.fillText('AUTO', 30, 385);

    // === ENGINE FIRE ===
    ctx.fillStyle = this.s.eng1Master ? '#ff3333' : '#333'; ctx.font = 'bold 11px monospace';
    ctx.fillText('ENG 1', 30, 415);
    ctx.fillStyle = this.s.eng2Master ? '#ff3333' : '#333';
    ctx.fillText('ENG 2', 90, 415);

    // === WEIGHT/BALANCE hint ===
    ctx.fillStyle = '#888'; ctx.font = '10px monospace'; ctx.textAlign = 'right';
    ctx.fillText('GW 64000 KG', W - 20, 415);

    this.textures.sd.needsUpdate = true;
  }

  _renderStandby() {
    const ctx = this.sbyCtx;
    const W = 512, H = 512;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.strokeRect(5, 5, W - 10, H - 10);

    // === ENGINE N1 GAUGES (Airbus style circular) ===
    const thr = this.flight.throttle || 0;
    const n1 = Math.round(50 + thr * 50 + (Math.random() - 0.5) * 2); // realistic N1 spool
    const egt = Math.round(200 + thr * 600 + (Math.random() - 0.5) * 20); // EGT varies with thrust

    for (let i = 0; i < 2; i++) {
      const x = W / 2 - 120 + i * 240;
      const y = 110;

      // Outer ring
      ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 60, Math.PI * 0.7, Math.PI * 2.3); ctx.stroke();

      // N1 arc (color-coded)
      const n1Frac = THREE.MathUtils.clamp((n1 - 50) / 50, 0, 1);
      const arcEnd = Math.PI * 0.7 + Math.PI * 1.6 * n1Frac;
      ctx.strokeStyle = n1 > 95 ? '#ff3333' : n1 > 85 ? '#ffaa33' : '#33ff55';
      ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(x, y, 60, Math.PI * 0.7, arcEnd); ctx.stroke();

      // N1 digital readout
      ctx.fillStyle = '#fff'; ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`${n1}`, x, y + 12);

      // N1 label
      ctx.fillStyle = '#888'; ctx.font = 'bold 12px monospace';
      ctx.fillText('N1', x, y - 22);
      ctx.fillText(`ENG ${i + 1}`, x, y + 38);
      ctx.fillStyle = '#666'; ctx.font = '11px monospace';
      ctx.fillText('%', x, y - 8);

      // EGT below
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace';
      ctx.fillText(`EGT ${egt}°C`, x, y + 60);
    }

    // === FUEL QUANTITY ===
    const fuelKg = Math.round(this.flight.fuel * 18000);
    ctx.fillStyle = '#888'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
    ctx.fillText('FUEL', 25, 230);
    ctx.fillStyle = '#333'; ctx.fillRect(25, 240, W - 50, 18);
    ctx.strokeStyle = '#444'; ctx.strokeRect(25, 240, W - 50, 18);
    const fu = THREE.MathUtils.clamp(this.flight.fuel, 0, 1);
    ctx.fillStyle = fu < 0.15 ? '#ff4444' : fu < 0.3 ? '#ffaa33' : '#33bbff';
    ctx.fillRect(25, 240, (W - 50) * fu, 18);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.font = 'bold 11px monospace';
    ctx.fillText(`${fuelKg} KG`, W - 25, 254);

    // === ENGINE PARAMETERS ROW ===
    ctx.fillStyle = '#888'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
    ctx.fillText('N2', 25, 290); ctx.fillText('FF', 130, 290); ctx.fillText('OIL', 230, 290); ctx.fillText('VIB', 300, 290);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace';
    ctx.fillText(`${Math.round(90 + thr * 10)}%`, 25, 305);
    ctx.fillText(`${Math.round(2 + thr * 8)} t/h`, 130, 305);
    ctx.fillText(`${Math.round(15 + thr * 20)} PSI`, 230, 305);
    ctx.fillText(`${(Math.random() * 0.4).toFixed(1)}`, 300, 305);

    // === STATUS INDICATORS ===
    ctx.fillStyle = '#333'; ctx.fillRect(20, 325, W - 40, 150);
    ctx.strokeStyle = '#444'; ctx.strokeRect(20, 325, W - 40, 150);

    ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
    const statusY = [345, 365, 385, 405, 425];
    const status = [
      { label: 'FLAPS', val: `${[0,1,2,3,5][this.flight.flaps] || 0}`, ok: this.flight.flaps >= 0 },
      { label: 'GEAR', val: this.flight.gear ? 'DOWN' : 'UP', ok: this.flight.gear },
      { label: 'SPOILER', val: this.flight.spoilers ? 'ARM' : 'OFF', ok: !this.flight.spoilers },
      { label: 'PARK BRK', val: this.flight.parkingBrake ? 'SET' : 'OFF', ok: !this.flight.parkingBrake },
      { label: 'G', val: this.flight.gLoad.toFixed(1), ok: Math.abs(this.flight.gLoad) < 3.5 },
    ];
    status.forEach((s, i) => {
      ctx.fillStyle = '#888'; ctx.fillText(s.label, 30, statusY[i]);
      ctx.fillStyle = s.ok ? '#33ff55' : '#ff4444';
      ctx.fillText(s.val, 110, statusY[i]);
    });

    // === WARNINGS ===
    ctx.textAlign = 'right';
    if (this.flight.stallWarning) {
      ctx.fillStyle = '#ff0000'; ctx.font = 'bold 14px monospace';
      ctx.fillText('!! STALL !!', W - 25, 345);
    }
    if (this.flight.fuel < 0.15) {
      ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 12px monospace';
      ctx.fillText('LOW FUEL', W - 25, 365);
    }
    if (!this.flight.gear && this.flight.altitude < 500) {
      ctx.fillStyle = '#ff4444'; ctx.font = 'bold 12px monospace';
      ctx.fillText('GEAR UP', W - 25, 385);
    }

    // === ANTI-ICE / BLEED ===
    ctx.fillStyle = '#888'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
    ctx.fillText('ANTI-ICE', 350, 290);
    ctx.fillStyle = this.s.antiIce ? '#33ff55' : '#444';
    ctx.fillText('WING', 350, 305);
    ctx.fillStyle = this.s.pitotHeat ? '#33ff55' : '#444';
    ctx.fillText('PITOT', 410, 305);

    this.textures.ewd.needsUpdate = true;
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
    ctx.fillStyle = '#0d0d0a'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(3, 3, W - 6, H - 6);

    // Speed / Heading / Altitude / V/S columns
    const colW = W / 4;
    const fcuData = [
      { label: 'SPD', value: `${String(Math.round(this.s.apSpeed)).padStart(3, '0')}`, unit: 'KT',
        active: this.s.apHdgHold, preview: false },
      { label: 'HDG', value: `${String(Math.round(this.s.apHdg)).padStart(3, '0')}`, unit: '°',
        active: this.s.apHdgHold, preview: true },
      { label: 'ALT', value: `${String(Math.round(this.s.apAlt)).padStart(5, '0')}`, unit: 'FT',
        active: this.s.apAltHold, preview: false },
      { label: 'V/S', value: `${this.s.apVs >= 0 ? '+' : ''}${String(Math.round(this.s.apVs)).padStart(4, '0')}`, unit: 'FPM',
        active: this.s.apVnav, preview: false },
    ];

    ctx.textAlign = 'center';
    fcuData.forEach((c, i) => {
      const cx = i * colW + colW / 2;

      // Label
      ctx.fillStyle = '#777'; ctx.font = 'bold 12px monospace';
      ctx.fillText(c.label, cx, 18);

      // Value display (LED-style)
      ctx.fillStyle = c.active ? '#00dd00' : '#004400';
      ctx.font = 'bold 36px "Courier New", monospace';
      ctx.fillText(c.value, cx, 72);

      // Active indicator dot
      if (c.active) {
        ctx.fillStyle = '#00ff00';
        ctx.beginPath(); ctx.arc(cx, 90, 4, 0, Math.PI * 2); ctx.fill();
      }

      // Unit
      ctx.fillStyle = '#555'; ctx.font = '10px monospace';
      ctx.fillText(c.unit, cx, 100);
    });

    // AP engaged indicator
    if (this.flight.autopilot) {
      ctx.fillStyle = '#00ff00'; ctx.font = 'bold 14px monospace';
      ctx.fillText('AP ENGAGED', W - 80, 20);
    }

    // Speed intervention (A/THR)
    if (this.s.autoThrust) {
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 12px monospace';
      ctx.fillText('A/THR', 80, 20);
    }
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
        if (['landingL','landingR','taxiL','noseL','navL','strobe','beacon','logoL','wingL','rwyTurn'].includes(a.key)) {
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

  // ============================================================
  // FIGHTER COCKPIT BUILD METHODS
  // ============================================================

  _buildFighterShell() {
    const col = { shell: 0x1a1a1e, sidewall: 0x252528, floor: 0x0f0f10, ceiling: 0x181820 };
    const shellMat = new THREE.MeshStandardMaterial({ color: col.shell, roughness: 0.85, metalness: 0.05 });
    const sideMat = new THREE.MeshStandardMaterial({ color: col.sidewall, roughness: 0.9 });
    const floorMat = new THREE.MeshStandardMaterial({ color: col.floor, roughness: 0.95 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: col.ceiling, roughness: 0.85 });

    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 2.2), floorMat);
    floor.position.set(0, 0.02, 0.2);
    this.group.add(floor);

    const ceil = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 2.2), ceilMat);
    ceil.position.set(0, 1.85, 0.2);
    this.group.add(ceil);

    const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.85, 0.08), shellMat);
    back.position.set(0, 0.95, -0.85);
    this.group.add(back);

    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.85, 2.2), sideMat);
      wall.position.set(0.96 * side, 0.95, 0.2);
      this.group.add(wall);
    }

    // Canopy Rahmen
    for (let i = -1; i <= 1; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.1), shellMat);
      seg.position.set(i * 0.55, 1.78 + Math.abs(i) * -0.04, 1.3);
      seg.rotation.z = i * 0.06;
      this.group.add(seg);
    }
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), shellMat);
      pillar.position.set(side * 0.95, 1.45, 1.3);
      pillar.rotation.z = side * 0.1;
      this.group.add(pillar);
    }
    const centerPillar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.6, 0.07), shellMat);
    centerPillar.position.set(0, 1.5, 1.3);
    this.group.add(centerPillar);
  }

  _buildFighterPanel() {
    // Fighter HUD statt mehrere Displays
    const hudBezel = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.25, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.7, metalness: 0.2 })
    );
    hudBezel.position.set(0, 1.35, 0.9);
    hudBezel.rotation.x = -0.15;
    this.group.add(hudBezel);

    this.parts.hudCanvas = document.createElement('canvas');
    this.parts.hudCanvas.width = 512; this.parts.hudCanvas.height = 200;
    const hudCtx = this.parts.hudCanvas.getContext('2d');
    this.textures.hud = new THREE.CanvasTexture(this.parts.hudCanvas);
    this.textures.hud.colorSpace = THREE.SRGBColorSpace;
    const hudScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.22),
      new THREE.MeshBasicMaterial({ map: this.textures.hud, toneMapped: false })
    );
    hudScreen.position.set(0, 1.35, 0.92);
    hudScreen.rotation.x = -0.15;
    this.group.add(hudScreen);

    // LEFT MFD (Stores / Weapon)
    this.parts.mfdLeft = this._addDisplay(this.group, -0.55, 0.02, 0.88, 0.22, 0.18, 'mfdL', 512);
    // RIGHT MFD (Radar / Info)
    this.parts.mfdRight = this._addDisplay(this.group, 0.55, 0.02, 0.88, 0.22, 0.18, 'mfdR', 512);

    // DED (Data Entry Display) unter links MFD
    this.parts.ded = this._addDisplay(this.group, -0.55, -0.17, 0.88, 0.18, 0.12, 'ded', 512);
    // UFC (Up Front Controller) Tastenfeld daneben
    this._buildUFCPanel();

    this._renderHUD();
    this._renderMFDLeft();
    this._renderMFDRight();
    this._renderDED();
  }

  _buildUFCPanel() {
    const ufc = new THREE.Group();
    ufc.position.set(-0.28, 0.92, 0.88);
    ufc.rotation.x = -0.3;
    this.group.add(ufc);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.1, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.7 })
    );
    ufc.add(body);

    // 4×3 Tasten-Matrix
    const btnColors = [0x222230, 0x222230, 0x223322, 0x222230, 0x222230, 0x223322, 0x222230, 0x222230, 0x223322, 0x222230, 0x222230, 0x332222];
    let idx = 0;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const btn = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.025, 0.008),
          new THREE.MeshStandardMaterial({ color: btnColors[idx], emissive: 0x111122, emissiveIntensity: 0.2 })
        );
        btn.position.set(-0.09 + col * 0.06, 0.03 - row * 0.022, 0.032);
        btn.userData.clickable = true;
        btn.userData.action = { type: 'ufcBtn', index: idx };
        this.clickables.push(btn);
        ufc.add(btn);
        idx++;
      }
    }
  }

  _renderHUD() {
    const ctx = this.parts.hudCanvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 200);
    ctx.fillStyle = '#001122';
    ctx.fillRect(0, 0, 512, 200);

    const cx = 256, cy = 100;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1.5;

    // Flight path marker
    ctx.beginPath();
    ctx.moveTo(cx, cy - 20); ctx.lineTo(cx - 15, cy + 10); ctx.lineTo(cx, cy + 5); ctx.lineTo(cx + 15, cy + 10);
    ctx.closePath(); ctx.stroke();

    // Heading tape segments
    ctx.font = '11px monospace';
    ctx.fillStyle = '#00ff88';
    const hdg = this.flight.heading || 0;
    for (let d = -30; d <= 30; d += 10) {
      const tickHdg = ((hdg + d + 360) % 360);
      const x = cx + d * 3;
      ctx.beginPath(); ctx.moveTo(x, cy + 25); ctx.lineTo(x, cy + 30); ctx.stroke();
      if (d % 20 === 0) ctx.fillText(String(tickHdg).padStart(3, '0'), x - 12, cy + 42);
    }

    // Speed ladder
    ctx.fillStyle = '#00ff88';
    const spd = Math.round(this.flight.speed * 1.944);
    for (let d = -4; d <= 4; d++) {
      const y = cy + d * 18;
      ctx.beginPath(); ctx.moveTo(cx - 60, y); ctx.lineTo(cx - 50, y); ctx.stroke();
      if (d === 0) ctx.fillText(String(spd), cx - 80, y + 4);
    }

    // Altitude tape
    const alt = Math.round(this.flight.altitude * 3.281);
    ctx.fillText(String(alt).padStart(5, '0'), cx + 55, cy + 4);

    // G-Force display
    const g = this.flight.gLoad?.toFixed(2) || '1.00';
    ctx.fillStyle = Math.abs(this.flight.gLoad) > 3.5 ? '#ff4444' : '#00ff88';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`G:${g}`, 20, 25);

    // Throttle percent
    const thr = Math.round((this.flight.throttle || 0) * 100);
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(`THR:${thr}%`, 20, 45);

    // Stall warning
    if (this.flight.stallWarning) {
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('!! STALL !!', cx - 45, 60);
    }
  }

  _renderMFDLeft() {
    const ctx = this.mfdLCtx;
    if (!ctx) return;
    ctx.clearRect(0, 0, 512, 360);
    ctx.fillStyle = '#001108';
    ctx.fillRect(0, 0, 512, 360);
    ctx.strokeStyle = '#00ff44';
    ctx.lineWidth = 1;
    ctx.font = '12px monospace';

    // Weapon stores status
    ctx.fillStyle = '#00ff44';
    ctx.fillText('STORES', 20, 25);
    ctx.fillStyle = '#88ff88';
    ctx.fillText('AIM-9X [2]', 20, 50);
    ctx.fillText('AIM-120D [4]', 20, 70);
    ctx.fillText('CBU-97 [2]', 20, 90);
    ctx.fillText('FUEL: ' + Math.round(this.flight.fuel * 100) + '%', 20, 120);

    // Master mode
    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('A/A', 400, 30);
    ctx.strokeRect(395, 15, 40, 20);
  }

  _renderMFDRight() {
    const ctx = this.mfdRCtx;
    if (!ctx) return;
    ctx.clearRect(0, 0, 512, 360);
    ctx.fillStyle = '#001108';
    ctx.fillRect(0, 0, 512, 360);
    ctx.strokeStyle = '#00ff44';
    ctx.lineWidth = 1;
    ctx.font = '12px monospace';

    ctx.fillStyle = '#00ff44';
    ctx.fillText('RADAR', 20, 25);
    ctx.fillStyle = '#88ff88';
    ctx.fillText('TGT: ---', 20, 50);
    ctx.fillText('RANGE: 20 NM', 20, 70);
    ctx.fillText('ALT: ' + Math.round(this.flight.altitude) + 'M', 20, 90);

    ctx.fillStyle = '#00ff44';
    ctx.fillText('HSI', 400, 25);
    ctx.strokeRect(395, 15, 40, 20);
  }

  _renderDED() {
    const ctx = this.dedCtx;
    if (!ctx) return;
    ctx.clearRect(0, 0, 512, 360);
    ctx.fillStyle = '#001108';
    ctx.fillRect(0, 0, 512, 360);
    ctx.fillStyle = '#ffaa00';
    ctx.font = '14px monospace';
    ctx.fillText('DED', 10, 25);
    ctx.fillStyle = '#00ff44';
    ctx.fillText('TOS: 00:00:00', 10, 50);
    ctx.fillText('WPT: --', 10, 75);
  }

  _buildFighterSideSticks() {
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, metalness: 0.4, roughness: 0.6 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.95 });

    for (const side of ['left']) {
      const x = side === 'left' ? -0.32 : 0.32;
      const stickGroup = new THREE.Group();
      stickGroup.position.set(x, 0.95, 0.35);
      this.group.add(stickGroup);
      this.parts.sideStick = stickGroup;

      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.08, 0.12), rubberMat);
      grip.position.set(0, 0.12, 0.05);
      stickGroup.add(grip);

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.18, 12), stickMat);
      shaft.position.set(0, 0.02, -0.02);
      stickGroup.add(shaft);

      // Trigger button
      const trigger = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.025, 0.01),
        new THREE.MeshStandardMaterial({ color: 0x882222, emissive: 0x441111 })
      );
      trigger.position.set(0, 0.06, 0.11);
      trigger.userData.clickable = true;
      trigger.userData.action = { type: 'weaponTrigger' };
      this.clickables.push(trigger);
      stickGroup.add(trigger);

      // Weapon pickle button (top of grip)
      const pickle = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.02, 0.015),
        new THREE.MeshStandardMaterial({ color: 0x228822, emissive: 0x114411 })
      );
      pickle.position.set(0, 0.15, 0.02);
      pickle.userData.clickable = true;
      pickle.userData.action = { type: 'weaponPickle' };
      this.clickables.push(pickle);
      stickGroup.add(pickle);
    }

    // Throttle Handle
    const throttleGroup = new THREE.Group();
    throttleGroup.position.set(-0.55, 0.65, 0.25);
    this.group.add(throttleGroup);
    this.parts.fighterThrottle = throttleGroup;

    const tHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.14, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x151518, metalness: 0.3, roughness: 0.5 })
    );
    throttleGroup.add(tHandle);

    // Target designation hat (mini hat switch on throttle)
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.008, 12),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    hat.position.set(0, 0.08, 0);
    throttleGroup.add(hat);
    hat.userData.clickable = true;
    hat.userData.action = { type: 'targetDesignator' };
    this.clickables.push(hat);
  }

  _buildFighterCenterConsole() {
    // Schmaleres Center Pedestal für Fighter
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x252528, roughness: 0.8 });
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.65), pedMat);
    pedestal.position.set(0, 0.57, 0.25);
    this.group.add(pedestal);

    const topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.015, 0.65), pedMat);
    topPlate.position.set(0, 0.8, 0.25);
    this.group.add(topPlate);

    // ECM / EW panel
    const ecmCanvas = document.createElement('canvas');
    ecmCanvas.width = 128; ecmCanvas.height = 256;
    const ecmCtx = ecmCanvas.getContext('2d');
    ecmCtx.fillStyle = '#0a0a0f'; ecmCtx.fillRect(0, 0, 128, 256);
    ecmCtx.fillStyle = '#ff8800'; ecmCtx.font = 'bold 11px monospace'; ecmCtx.fillText('ECM', 10, 20);
    ecmCtx.fillStyle = '#00ff88'; ecmCtx.fillText('RWR: ---', 10, 45);
    ecmCtx.fillText('FLARE: 30', 10, 65);
    ecmCtx.fillText('CHAFF: 30', 10, 85);
    const ecmTex = new THREE.CanvasTexture(ecmCanvas);
    ecmTex.colorSpace = THREE.SRGBColorSpace;
    const ecmPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.2),
      new THREE.MeshBasicMaterial({ map: ecmTex, toneMapped: false })
    );
    ecmPanel.position.set(0, 0.72, 0.1);
    ecmPanel.rotation.x = -0.3;
    this.group.add(ecmPanel);
  }

  _buildFighterOverhead() {
    const overhead = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.04, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x1e1e22, roughness: 0.85 })
    );
    overhead.position.set(0, 1.78, 0.1);
    this.group.add(overhead);

    // Warning lights panel
    const warnPanel = new THREE.Group();
    warnPanel.position.set(-0.6, 1.75, 0.4);
    this.group.add(warnPanel);
    this.parts.warnLights = [];

    const warnLabels = ['MASTER\nCAUTION', 'MASTER\nWARNING', 'ENG\nFIRE', 'HYD'];
    const warnColors = [0xaaaa00, 0xff4444, 0xff2200, 0x00ff44];
    for (let i = 0; i < 4; i++) {
      const light = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.003, 16),
        new THREE.MeshStandardMaterial({ color: warnColors[i], emissive: warnColors[i], emissiveIntensity: 0.5 })
      );
      light.rotation.x = Math.PI / 2;
      light.position.set(i * 0.06 - 0.09, 0, 0.02);
      warnPanel.add(light);
      this.parts.warnLights.push(light);
    }

    // Anti-G seats
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x252530, roughness: 0.9 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.35), seatMat);
    seat.position.set(0, 0.5, -0.15);
    this.group.add(seat);
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.08), seatMat);
    seatBack.position.set(0, 0.8, -0.28);
    seatBack.rotation.x = 0.15;
    this.group.add(seatBack);
  }
}
