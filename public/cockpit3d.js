// ============================================================
// COCKPIT 3D — Interaktives Cockpit im Weltraum, an Flugzeug gekoppelt
// ============================================================
// Baut ein detailliertes 3D-Cockpit mit klickbaren Schaltern, beweglichen
// Hebeln, Live-PFD/ND-Displays und animiertem Yoke. Folgt der Pose des
// Spieler-Flugzeugs jeden Frame. Raycasting für Klicks/Hover.

import * as THREE from 'three';

const DEG = Math.PI / 180;

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

    // Sichtbare Eingangs-Werte für Animation
    this.input = { pitch: 0, roll: 0, yaw: 0 };

    // Externer Flugzustand (vom Server)
    this.flight = {
      speed: 0, altitude: 0, vs: 0, heading: 0,
      pitch: 0, roll: 0, throttle: 0, fuel: 1, gLoad: 1,
      flaps: 0, gear: true, spoilers: false, brakes: false,
      parkingBrake: false, lights: false, autopilot: false,
    };

    // Lokaler Schalter-/Dialzustand (für Overhead & MCP-Dials)
    this.s = {
      batt: true, apu: false, eng1: false, eng2: false,
      pitotHeat: false, antiIce: false,
      seatbelt: true, noSmoke: true,
      landingL: false, navL: true, strobe: true, beacon: false,
      apSpeed: 250, apHdg: 0, apAlt: 10000, apVs: 0,
      apHdgHold: false, apAltHold: false, apVnav: false,
      autobrake: 0,
    };

    // Referenzen auf bewegliche Teile
    this.parts = {};
    this.textures = {};

    this._build();
  }

  setVisible(v) { this.group.visible = !!v; }
  isVisible() { return this.group.visible; }

  // Folgt der Pose eines Flugzeug-Mesh (in Weltkoordinaten)
  followAircraft(mesh) {
    if (!mesh) return;
    this.group.position.copy(mesh.position);
    this.group.quaternion.copy(mesh.quaternion);
  }

  // Kamera-Setup: positioniert eine externe Kamera auf dem Pilotensitz
  applyCameraPose(camera) {
    const seatW = this.seatLocal.clone().applyMatrix4(this.group.matrixWorld);
    const lookW = this.lookLocal.clone().applyMatrix4(this.group.matrixWorld);
    this.group.updateMatrixWorld();
    camera.position.copy(seatW);
    camera.up.set(0, 1, 0).applyQuaternion(this.group.quaternion);
    camera.lookAt(lookW);
  }

  // Flugzustand vom Server
  setFlightState(s) {
    if (!s) return;
    this.flight.speed = s.speed || 0;
    this.flight.altitude = s.y || 0;
    this.flight.vs = s.verticalSpeed || 0;
    this.flight.heading = ((((Math.PI - (s.yaw || 0)) * 180 / Math.PI) % 360) + 360) % 360;
    this.flight.pitch = s.pitch || 0;
    this.flight.roll = s.roll || 0;
    this.flight.throttle = s.throttle || 0;
    // Server: fuelPercent 0..100 → normalisieren auf 0..1
    this.flight.fuel = (s.fuelPercent !== undefined ? s.fuelPercent / 100 : 1);
    this.flight.gLoad = s.gForce !== undefined ? s.gForce : 1;
    this.flight.flaps = s.flaps || 0;
    this.flight.gear = !!s.gear;
    this.flight.spoilers = !!s.spoilers;
    this.flight.brakes = !!s.brakes;
    this.flight.parkingBrake = !!s.parkingBrake;
    this.flight.lights = !!s.lights;
    this.flight.autopilot = !!s.autopilot;
    if (s.apAltHold !== undefined) this.s.apAltHold = !!s.apAltHold;
    if (s.apHdgHold !== undefined) this.s.apHdgHold = !!s.apHdgHold;
    this._updateDynamic();
  }

  // Input-Werte (pitch/roll/yaw, -1..1) für Yoke-Animation
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
    this._buildMainPanel();
    this._buildMCP();
    this._buildCenterPedestal();
    this._buildOverhead();
    this._buildYoke();
    this._buildSeats();
    this._buildCockpitLighting();
  }

  _buildShell() {
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x1f1f22, roughness: 0.85, metalness: 0.05 });
    const sidewallMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.9 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.95 });

    // Boden
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 2.6), floorMat);
    floor.position.set(0, 0.02, 0.4);
    this.group.add(floor);

    // Decke
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 2.6), shellMat);
    ceil.position.set(0, 2.15, 0.4);
    this.group.add(ceil);

    // Rückwand
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.1, 0.08), shellMat);
    back.position.set(0, 1.1, -0.85);
    this.group.add(back);

    // Seitenwände
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.1, 2.6), sidewallMat);
    leftWall.position.set(-1.2, 1.1, 0.4);
    this.group.add(leftWall);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.1, 2.6), sidewallMat);
    rightWall.position.set(1.2, 1.1, 0.4);
    this.group.add(rightWall);

    // Fensterrahmen oben (dunkler Balken über der Scheibe)
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.15), shellMat);
    top.position.set(0, 2.0, 1.55);
    this.group.add(top);

    // Mittelpfeiler der Frontscheibe
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.85, 0.09), shellMat);
    post.position.set(0, 1.62, 1.58);
    this.group.add(post);

    // Dachleiste
    const roofEdgeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.6), shellMat);
    roofEdgeL.position.set(-1.15, 2.1, 0.4);
    this.group.add(roofEdgeL);
    const roofEdgeR = roofEdgeL.clone(); roofEdgeR.position.x = 1.15;
    this.group.add(roofEdgeR);
  }

  _buildSeats() {
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x332218, roughness: 0.95 });
    // Kapitän (links), Copilot (rechts)
    for (const x of [-0.45, 0.45]) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.55), seatMat);
      base.position.set(x, 0.55, -0.3);
      this.group.add(base);
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), seatMat);
      cushion.position.set(x, 0.63, -0.3);
      this.group.add(cushion);
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.9, 0.1), seatMat);
      backrest.position.set(x, 1.05, -0.55);
      this.group.add(backrest);
      // Armlehne
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), seatMat);
      arm.position.set(x + 0.25, 0.8, -0.3);
      this.group.add(arm);
      const arm2 = arm.clone(); arm2.position.x = x - 0.25;
      this.group.add(arm2);
    }
  }

  _buildCockpitLighting() {
    // Weiches Innenlicht fürs Cockpit (nur Gruppe beleuchtet)
    const light = new THREE.PointLight(0xfff2d8, 0.9, 5, 1.4);
    light.position.set(0, 2.0, 0.4);
    this.group.add(light);
    const amb = new THREE.AmbientLight(0x3a3a4a, 0.25);
    this.group.add(amb);
  }

  // ------------------------------------------------------------
  // MAIN PANEL — PFD + ND + Engine
  // ------------------------------------------------------------

  _buildMainPanel() {
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.7, metalness: 0.2 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x242428, roughness: 0.8 });

    // Glare shield (Blendschutz oben)
    const glare = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.35), trimMat);
    glare.position.set(0, 1.55, 0.85);
    glare.rotation.x = -0.12;
    this.group.add(glare);

    // Hauptpanel (schräg nach vorne geneigt)
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.1), panelMat);
    panel.position.set(0, 1.20, 0.9);
    panel.rotation.x = -0.22;
    this.group.add(panel);

    // PFD-Display (Primary Flight Display) — links vom Piloten
    this.pfdCanvas = document.createElement('canvas');
    this.pfdCanvas.width = 512; this.pfdCanvas.height = 512;
    this.pfdCtx = this.pfdCanvas.getContext('2d');
    this.textures.pfd = new THREE.CanvasTexture(this.pfdCanvas);
    this.textures.pfd.colorSpace = THREE.SRGBColorSpace;
    const pfd = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.32),
      new THREE.MeshBasicMaterial({ map: this.textures.pfd, toneMapped: false })
    );
    pfd.position.set(-0.55, 1.25, 0.95);
    pfd.rotation.x = -0.22;
    this.group.add(pfd);
    this._drawPFDBezel(-0.55, 1.25, 0.95);

    // ND-Display (Navigation Display) — rechts vom Piloten
    this.ndCanvas = document.createElement('canvas');
    this.ndCanvas.width = 512; this.ndCanvas.height = 512;
    this.ndCtx = this.ndCanvas.getContext('2d');
    this.textures.nd = new THREE.CanvasTexture(this.ndCanvas);
    this.textures.nd.colorSpace = THREE.SRGBColorSpace;
    const nd = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.32),
      new THREE.MeshBasicMaterial({ map: this.textures.nd, toneMapped: false })
    );
    nd.position.set(-0.15, 1.25, 0.95);
    nd.rotation.x = -0.22;
    this.group.add(nd);
    this._drawPFDBezel(-0.15, 1.25, 0.95);

    // Engine/System Display — Mitte
    this.engCanvas = document.createElement('canvas');
    this.engCanvas.width = 512; this.engCanvas.height = 512;
    this.engCtx = this.engCanvas.getContext('2d');
    this.textures.eng = new THREE.CanvasTexture(this.engCanvas);
    this.textures.eng.colorSpace = THREE.SRGBColorSpace;
    const eng = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.32),
      new THREE.MeshBasicMaterial({ map: this.textures.eng, toneMapped: false })
    );
    eng.position.set(0.23, 1.25, 0.95);
    eng.rotation.x = -0.22;
    this.group.add(eng);
    this._drawPFDBezel(0.23, 1.25, 0.95, 0.28);

    // Standby-Instrumente (kleine Analogzeiger) — rechts
    this.sbyCanvas = document.createElement('canvas');
    this.sbyCanvas.width = 256; this.sbyCanvas.height = 256;
    this.sbyCtx = this.sbyCanvas.getContext('2d');
    this.textures.sby = new THREE.CanvasTexture(this.sbyCanvas);
    this.textures.sby.colorSpace = THREE.SRGBColorSpace;
    const sby = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.22),
      new THREE.MeshBasicMaterial({ map: this.textures.sby, toneMapped: false })
    );
    sby.position.set(0.58, 1.25, 0.95);
    sby.rotation.x = -0.22;
    this.group.add(sby);

    this._renderPFD();
    this._renderND();
    this._renderEng();
    this._renderStandby();
  }

  _drawPFDBezel(x, y, z, w = 0.32) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.6, metalness: 0.3 });
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, w + 0.02, 0.015), mat);
    bezel.position.set(x, y, z - 0.004);
    bezel.rotation.x = -0.22;
    this.group.add(bezel);
  }

  // ------------------------------------------------------------
  // AUTOPILOT MCP — oben Mitte über Hauptpanel
  // ------------------------------------------------------------

  _buildMCP() {
    const mcpMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.75 });

    // MCP-Unterframe, geneigt — alle Kinder sind in diesem lokalen Koordsystem
    const mcpFrame = new THREE.Group();
    mcpFrame.position.set(0, 1.52, 0.82);
    mcpFrame.rotation.x = -0.35;
    this.group.add(mcpFrame);
    this.parts.mcpFrame = mcpFrame;

    const mcp = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 0.12), mcpMat);
    mcpFrame.add(mcp);

    // MCP-Faceplate Canvas (SPD/HDG/ALT/VS Digitalanzeigen)
    this.mcpCanvas = document.createElement('canvas');
    this.mcpCanvas.width = 1024; this.mcpCanvas.height = 140;
    this.mcpCtx = this.mcpCanvas.getContext('2d');
    this.textures.mcp = new THREE.CanvasTexture(this.mcpCanvas);
    this.textures.mcp.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(1.28, 0.12),
      new THREE.MeshBasicMaterial({ map: this.textures.mcp, toneMapped: false })
    );
    face.position.set(0, 0.02, 0.062);
    mcpFrame.add(face);
    this._renderMCP();

    // 4 Dial-Paare (SPD, HDG, ALT, VS) — Inc/Dec Knöpfe
    const dials = [
      { key: 'apSpeed', x: -0.48, step: 5, min: 100, max: 400 },
      { key: 'apHdg',   x: -0.16, step: 5, min: 0,   max: 359, wrap: true },
      { key: 'apAlt',   x:  0.18, step: 500, min: 0, max: 45000 },
      { key: 'apVs',    x:  0.48, step: 100, min: -3000, max: 3000 },
    ];
    for (const d of dials) {
      this._addLocalButton(mcpFrame, d.x - 0.045, -0.075, 0.065, 0.02, 0xff5050,
        { type: 'dial', key: d.key, delta: -d.step, min: d.min, max: d.max, wrap: d.wrap });
      this._addLocalButton(mcpFrame, d.x + 0.045, -0.075, 0.065, 0.02, 0x50d0ff,
        { type: 'dial', key: d.key, delta: d.step, min: d.min, max: d.max, wrap: d.wrap });
    }

    // AP-Engage / HDG / ALT / VNAV Buttons — unterhalb des Displays
    const btns = [
      { x: -0.48, key: 'autopilot', color: 0x33cc33 },
      { x: -0.16, key: 'apHdgHold', color: 0xffaa33 },
      { x:  0.18, key: 'apAltHold', color: 0xffaa33 },
      { x:  0.48, key: 'apVnav',    color: 0xffaa33 },
    ];
    this.parts.mcpBtns = {};
    for (const b of btns) {
      const btn = this._addLocalButton(mcpFrame, b.x, -0.03, 0.065, 0.022, b.color,
        { type: 'mcpBtn', key: b.key });
      this.parts.mcpBtns[b.key] = btn;
    }
  }

  // Button relativ zu einem geneigten Parent-Group platzieren
  _addLocalButton(parent, x, y, z, size, color, action) {
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: 0x111111, roughness: 0.4, metalness: 0.3,
    });
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(size, size, 0.015, 16), mat);
    btn.position.set(x, y, z);
    btn.rotation.x = Math.PI / 2; // Achse zeigt nach Z (aus Panel raus)
    btn.userData.clickable = true;
    btn.userData.action = action;
    this.clickables.push(btn);
    parent.add(btn);
    return btn;
  }

  // ------------------------------------------------------------
  // CENTER PEDESTAL — Throttle, Flaps, Gear, Spoilers, Parking
  // ------------------------------------------------------------

  _buildCenterPedestal() {
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.85 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.75 });

    // Pedestal-Körper
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.55), pedMat);
    pedestal.position.set(0, 0.72, 0.35);
    this.group.add(pedestal);

    // Pedestal top-plate (beschriftet)
    const topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.55), trimMat);
    topPlate.position.set(0, 0.945, 0.35);
    this.group.add(topPlate);

    // THROTTLES (2 Stück) — zieh-/klickbar
    this.parts.throttles = [];
    for (let i = 0; i < 2; i++) {
      const x = i === 0 ? -0.08 : 0.08;
      // Hebelbasis (fest)
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.7 });
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.28), baseMat);
      slot.position.set(x, 0.955, 0.30);
      this.group.add(slot);

      const pivot = new THREE.Group();
      pivot.position.set(x, 0.945, 0.40);
      this.group.add(pivot);

      // Hebelarm
      const armMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.5, metalness: 0.6 });
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.18), armMat);
      arm.position.set(0, 0.04, -0.03);
      pivot.add(arm);

      // Hebelkopf (klickbar)
      const knobMat = new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.6 });
      const knob = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.08), knobMat);
      knob.position.set(0, 0.11, -0.12);
      pivot.add(knob);
      knob.userData.clickable = true;
      knob.userData.action = { type: 'throttleDrag', key: `th${i}`, pivot };
      this.clickables.push(knob);

      // Beschriftung auf Knopf
      const labelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const labelGeo = new THREE.PlaneGeometry(0.05, 0.015);
      const label = new THREE.Mesh(labelGeo, labelMat);
      label.position.set(0, 0.17, -0.12);
      pivot.add(label);

      this.parts.throttles.push({ pivot, knob, label });
    }

    // FLAP LEVER — klickbar für Detents
    const flapGroup = new THREE.Group();
    flapGroup.position.set(0.15, 0.96, 0.25);
    this.group.add(flapGroup);

    const flapPlate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 0.22), new THREE.MeshStandardMaterial({ color: 0x0a0a0a }));
    flapPlate.position.y = -0.007;
    flapGroup.add(flapPlate);

    const flapLeverGroup = new THREE.Group();
    flapGroup.add(flapLeverGroup);
    this.parts.flapLever = flapLeverGroup;

    const flapArm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.14), new THREE.MeshStandardMaterial({ color: 0x8a8a8e, metalness: 0.7 }));
    flapArm.position.z = -0.05;
    flapLeverGroup.add(flapArm);
    const flapKnob = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.05), new THREE.MeshStandardMaterial({ color: 0x080808 }));
    flapKnob.position.set(0, 0.04, -0.1);
    flapLeverGroup.add(flapKnob);
    flapKnob.userData.clickable = true;
    flapKnob.userData.action = { type: 'flapCycle' };
    this.clickables.push(flapKnob);

    // GEAR LEVER — großer weißer Radgriff (rechts)
    const gearGroup = new THREE.Group();
    gearGroup.position.set(0.32, 1.15, 0.72);
    gearGroup.rotation.x = -0.25;
    this.group.add(gearGroup);
    this.parts.gearLever = gearGroup;

    const gearArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.14, 12),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.4 })
    );
    gearArm.position.y = -0.07;
    gearGroup.add(gearArm);
    const gearWheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.05, 0.022, 12, 24),
      new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 })
    );
    gearWheel.rotation.y = Math.PI / 2;
    gearGroup.add(gearWheel);
    gearWheel.userData.clickable = true;
    gearWheel.userData.action = { type: 'gearToggle' };
    this.clickables.push(gearWheel);

    // SPOILER LEVER (links)
    const spGroup = new THREE.Group();
    spGroup.position.set(-0.15, 0.96, 0.25);
    this.group.add(spGroup);
    this.parts.spoilerLever = spGroup;

    const spPlate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.18), new THREE.MeshStandardMaterial({ color: 0x0a0a0a }));
    spPlate.position.y = -0.007;
    spGroup.add(spPlate);

    const spArm = new THREE.Group();
    spGroup.add(spArm);
    this.parts.spoilerArm = spArm;
    const spShaft = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.015, 0.12), new THREE.MeshStandardMaterial({ color: 0xff9900, metalness: 0.3 }));
    spShaft.position.z = -0.04;
    spArm.add(spShaft);
    const spKnob = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 12), new THREE.MeshStandardMaterial({ color: 0xff7700 }));
    spKnob.position.set(0, 0.015, -0.09);
    spArm.add(spKnob);
    spKnob.userData.clickable = true;
    spKnob.userData.action = { type: 'spoilersToggle' };
    this.clickables.push(spKnob);

    // PARKING BRAKE — roter Hebel (vorn am Pedestal)
    const pbGroup = new THREE.Group();
    pbGroup.position.set(0, 0.95, 0.58);
    this.group.add(pbGroup);
    this.parts.parkingBrake = pbGroup;

    const pbArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.1, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x660000 })
    );
    pbArm.position.y = 0.05;
    pbGroup.add(pbArm);
    const pbKnob = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xdd0000, roughness: 0.5 })
    );
    pbKnob.position.y = 0.11;
    pbGroup.add(pbKnob);
    pbKnob.userData.clickable = true;
    pbKnob.userData.action = { type: 'parkingBrakeToggle' };
    this.clickables.push(pbKnob);

    // Autobrake-Drehschalter
    this._buildAutobrake();
    // Trim Rad neben Throttle
    this._buildTrimWheel();
  }

  _buildAutobrake() {
    const g = new THREE.Group();
    g.position.set(0.05, 0.96, 0.55);
    this.group.add(g);
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1c })
    );
    body.position.y = 0.01;
    g.add(body);
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.04, 0.025, 16),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2e, metalness: 0.5 })
    );
    knob.position.y = 0.035;
    g.add(knob);
    // Pointer
    const pointer = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.005, 0.008),
      new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xff8800, emissiveIntensity: 0.4 })
    );
    pointer.position.set(0.02, 0.049, 0);
    knob.add(pointer);
    this.parts.autobrakeKnob = knob;
    knob.userData.clickable = true;
    knob.userData.action = { type: 'autobrakeCycle' };
    this.clickables.push(knob);
  }

  _buildTrimWheel() {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.04, 24),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6 })
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(-0.22, 0.88, 0.38);
    this.group.add(wheel);
    // Dekorative Speichen
    for (let i = 0; i < 8; i++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.005, 0.02, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x555555 })
      );
      spoke.rotation.z = (i / 8) * Math.PI * 2;
      wheel.add(spoke);
    }
  }

  // ------------------------------------------------------------
  // OVERHEAD PANEL — Kippschalter
  // ------------------------------------------------------------

  _buildOverhead() {
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.8 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.55), panelMat);
    panel.position.set(0, 2.05, 0.5);
    panel.rotation.x = 0.35;
    this.group.add(panel);

    // Schalter: key, label, position relative zum Panel
    const toggles = [
      { key: 'batt',     label: 'BATT',   col: 0, row: 0 },
      { key: 'apu',      label: 'APU',    col: 1, row: 0 },
      { key: 'eng1',     label: 'ENG 1',  col: 2, row: 0 },
      { key: 'eng2',     label: 'ENG 2',  col: 3, row: 0 },
      { key: 'pitotHeat',label: 'PITOT',  col: 4, row: 0 },
      { key: 'antiIce',  label: 'ICE',    col: 5, row: 0 },

      { key: 'landingL', label: 'LAND',   col: 0, row: 1 },
      { key: 'navL',     label: 'NAV',    col: 1, row: 1 },
      { key: 'strobe',   label: 'STROBE', col: 2, row: 1 },
      { key: 'beacon',   label: 'BCN',    col: 3, row: 1 },
      { key: 'seatbelt', label: 'SEAT',   col: 4, row: 1 },
      { key: 'noSmoke',  label: 'NOSMK',  col: 5, row: 1 },
    ];

    this.parts.toggles = {};
    const ohX0 = -0.55;
    const ohStepX = 0.22;
    const ohY = 2.08;
    const ohZ0 = 0.35;
    const ohStepZ = 0.2;

    for (const t of toggles) {
      const px = ohX0 + t.col * ohStepX;
      const pz = ohZ0 + t.row * ohStepZ;
      const py = ohY + t.row * 0.06; // Leichte Z-Y-Neigung durch Panel-Rotation
      const sw = this._makeToggleSwitch(px, py, pz, this.s[t.key], t.key, t.label);
      this.parts.toggles[t.key] = sw;
    }
  }

  _makeToggleSwitch(x, y, z, initialOn, key, label) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.x = 0.35; // passend zum Overhead-Winkel
    this.group.add(g);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.025, 0.012, 12),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.4 })
    );
    base.rotation.x = Math.PI / 2;
    g.add(base);

    const lever = new THREE.Group();
    g.add(lever);
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.04, 8),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.25 })
    );
    shaft.position.y = 0.02;
    lever.add(shaft);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.009, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9, roughness: 0.2 })
    );
    tip.position.y = 0.045;
    lever.add(tip);

    // Klickziel: Hitbox um Hebel
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.065, 0.035),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.y = 0.025;
    g.add(hit);
    hit.userData.clickable = true;
    hit.userData.action = { type: 'toggle', key };
    this.clickables.push(hit);

    // LED-Indikator unter dem Schalter
    const led = new THREE.Mesh(
      new THREE.CircleGeometry(0.01, 12),
      new THREE.MeshBasicMaterial({ color: 0x224422 })
    );
    led.position.set(0, -0.015, 0.028);
    g.add(led);

    // Rotate lever abhängig vom Zustand
    lever.rotation.x = initialOn ? 0 : 0.6;
    this._setLed(led, initialOn);

    return { group: g, lever, led };
  }

  _setLed(led, on) {
    led.material.color.setHex(on ? 0x33ff44 : 0x224422);
  }

  // ------------------------------------------------------------
  // YOKE — animiert nach pitch/roll input
  // ------------------------------------------------------------

  _buildYoke() {
    const yokeBaseGroup = new THREE.Group();
    yokeBaseGroup.position.set(0, 0.95, 0.45);
    this.group.add(yokeBaseGroup);

    // Yoke-Säule
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.03, 0.4, 12),
      new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.7 })
    );
    col.position.y = -0.1;
    yokeBaseGroup.add(col);

    // Pitch-Pivot (vor/zurück)
    const pitchPivot = new THREE.Group();
    pitchPivot.position.y = 0.1;
    yokeBaseGroup.add(pitchPivot);
    this.parts.yokePitch = pitchPivot;

    // Roll-Pivot (drehen)
    const rollPivot = new THREE.Group();
    pitchPivot.add(rollPivot);
    this.parts.yokeRoll = rollPivot;

    const yokeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.55, metalness: 0.4 });

    // Hauptsteuerholm — W-Form
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.14), yokeMat);
    stem.position.z = 0.07;
    rollPivot.add(stem);

    // Querholm
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.05), yokeMat);
    cross.position.z = 0.14;
    rollPivot.add(cross);

    // Griffe (links/rechts)
    for (const side of [-1, 1]) {
      const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.16, 14),
        yokeMat
      );
      grip.position.set(side * 0.19, -0.05, 0.14);
      rollPivot.add(grip);
      // Handauflage
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1c })
      );
      cap.position.set(side * 0.19, 0.035, 0.14);
      rollPivot.add(cap);
      // Ein paar Knöpfe auf dem Griff
      for (let k = 0; k < 3; k++) {
        const b = new THREE.Mesh(
          new THREE.CylinderGeometry(0.006, 0.006, 0.004, 8),
          new THREE.MeshStandardMaterial({ color: k === 0 ? 0xff0000 : 0x888888 })
        );
        b.rotation.x = Math.PI / 2;
        b.position.set(side * 0.19 + 0.023, 0.005 - k * 0.022, 0.14);
        rollPivot.add(b);
      }
    }

    // Emblem/Anzeige im Zentrum
    const emblem = new THREE.Mesh(
      new THREE.CircleGeometry(0.018, 20),
      new THREE.MeshStandardMaterial({ color: 0x8a1a1a, emissive: 0x441010 })
    );
    emblem.position.set(0, 0, 0.172);
    rollPivot.add(emblem);

    this._animateYoke();
  }

  _animateYoke() {
    if (!this.parts.yokePitch) return;
    // pitch: +1 (Stick zieh) -> Yoke bewegt sich zum Piloten (negative Z)
    this.parts.yokePitch.position.z = THREE.MathUtils.clamp(-this.input.pitch * 0.06, -0.08, 0.08);
    this.parts.yokePitch.rotation.x = THREE.MathUtils.clamp(-this.input.pitch * 0.25, -0.4, 0.4);
    // roll: +1 (links rollen) -> Yoke dreht sich gegen den Uhrzeigersinn
    this.parts.yokeRoll.rotation.z = THREE.MathUtils.clamp(this.input.roll * 0.7, -1.2, 1.2);
  }

  _animatePedals() {
    // Optional: keine Pedale aktuell. Platzhalter.
  }

  // ------------------------------------------------------------
  // CANVAS-DISPLAYS
  // ------------------------------------------------------------

  _updateDynamic() {
    // Throttle-Hebel animieren
    if (this.parts.throttles) {
      for (const t of this.parts.throttles) {
        // 0 (rück) ... 1 (voll): pivot nach vorne kippen
        const a = THREE.MathUtils.clamp(this.flight.throttle, 0, 1);
        t.pivot.rotation.x = THREE.MathUtils.lerp(0.35, -0.55, a);
      }
    }
    // Flap-Hebel (0..4)
    if (this.parts.flapLever) {
      const p = THREE.MathUtils.clamp(this.flight.flaps / 4, 0, 1);
      this.parts.flapLever.rotation.x = THREE.MathUtils.lerp(-0.35, 0.55, p);
    }
    // Gear
    if (this.parts.gearLever) {
      this.parts.gearLever.rotation.x = this.flight.gear ? 0.25 : -0.75;
    }
    // Spoiler
    if (this.parts.spoilerArm) {
      this.parts.spoilerArm.rotation.x = this.flight.spoilers ? 0.6 : -0.4;
    }
    // Parking brake
    if (this.parts.parkingBrake) {
      this.parts.parkingBrake.rotation.x = this.flight.parkingBrake ? 0 : 0.8;
    }
    // Autobrake pointer: rotiere zum Segment
    if (this.parts.autobrakeKnob) {
      const pos = [-0.8, -0.4, 0, 0.4, 0.8][this.s.autobrake] || 0;
      this.parts.autobrakeKnob.rotation.y = pos * Math.PI / 2;
    }
    // LED-Statussync (landingL/navL/strobe/beacon reflektieren gemeinsames lights)
    // Die LEDs der ext. Lichter spiegeln den Serverzustand "lights"
    const toggles = this.parts.toggles || {};
    for (const key of ['batt','apu','eng1','eng2','pitotHeat','antiIce','seatbelt','noSmoke','landingL','navL','strobe','beacon']) {
      const t = toggles[key];
      if (!t) continue;
      let on = this.s[key];
      t.lever.rotation.x = on ? 0 : 0.6;
      this._setLed(t.led, on);
    }
    // MCP-Button-LEDs
    if (this.parts.mcpBtns) {
      const ap = this.parts.mcpBtns.autopilot;
      if (ap) ap.material.emissive.setHex(this.flight.autopilot ? 0x33ff44 : 0x111111);
      const hdg = this.parts.mcpBtns.apHdgHold;
      if (hdg) hdg.material.emissive.setHex(this.s.apHdgHold ? 0xffaa33 : 0x111111);
      const alt = this.parts.mcpBtns.apAltHold;
      if (alt) alt.material.emissive.setHex(this.s.apAltHold ? 0xffaa33 : 0x111111);
      const vnav = this.parts.mcpBtns.apVnav;
      if (vnav) vnav.material.emissive.setHex(this.s.apVnav ? 0xffaa33 : 0x111111);
    }

    this._renderPFD();
    this._renderND();
    this._renderEng();
    this._renderStandby();
    this._renderMCP();
  }

  _renderPFD() {
    const ctx = this.pfdCtx;
    const W = 512, H = 512;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

    // Attitude Indicator (Mitte)
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-this.flight.roll);
    const horizon = this.flight.pitch * 300;
    // Himmel
    ctx.fillStyle = '#1e6aa8';
    ctx.fillRect(-500, -500 + horizon, 1000, 500);
    // Boden
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(-500, horizon, 1000, 500);
    // Horizon-Linie
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-500, horizon); ctx.lineTo(500, horizon); ctx.stroke();
    // Pitch-Skala
    ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff';
    ctx.font = '14px monospace'; ctx.textAlign = 'center';
    for (let p = -60; p <= 60; p += 10) {
      if (p === 0) continue;
      const y = horizon - p * 6;
      const w = p % 20 === 0 ? 80 : 40;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-w/2, y); ctx.lineTo(w/2, y); ctx.stroke();
      if (p % 20 === 0) {
        ctx.fillText(`${Math.abs(p)}`, -w/2 - 12, y + 5);
        ctx.fillText(`${Math.abs(p)}`, w/2 + 12, y + 5);
      }
    }
    ctx.restore();

    // Kreisförmige Maske + Flugzeug-Marker
    ctx.save();
    ctx.strokeStyle = '#ffd000'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W/2 - 60, H/2); ctx.lineTo(W/2 - 20, H/2);
    ctx.moveTo(W/2 + 20, H/2); ctx.lineTo(W/2 + 60, H/2);
    ctx.stroke();
    ctx.fillStyle = '#ffd000';
    ctx.fillRect(W/2 - 5, H/2 - 5, 10, 10);
    ctx.restore();

    // Speed Tape links
    ctx.fillStyle = '#111'; ctx.fillRect(10, 40, 70, H - 80);
    ctx.strokeStyle = '#333'; ctx.strokeRect(10, 40, 70, H - 80);
    const spdKts = this.flight.speed * 1.944;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace';
    for (let s = -50; s <= 50; s += 10) {
      const v = Math.round(spdKts / 10) * 10 + s;
      if (v < 0) continue;
      const y = H/2 - s * 5;
      ctx.textAlign = 'right';
      ctx.fillText(`${v}`, 72, y + 6);
      ctx.strokeStyle = '#888';
      ctx.beginPath(); ctx.moveTo(76, y); ctx.lineTo(80, y); ctx.stroke();
    }
    // Speed-Indikator
    ctx.fillStyle = '#111'; ctx.fillRect(5, H/2 - 18, 80, 36);
    ctx.strokeStyle = '#ffd000'; ctx.lineWidth = 2;
    ctx.strokeRect(5, H/2 - 18, 80, 36);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 22px monospace';
    ctx.fillText(`${Math.round(spdKts)}`, 45, H/2 + 7);
    ctx.fillStyle = '#aaa'; ctx.font = '12px monospace';
    ctx.fillText('KT', 45, 30);

    // Alt Tape rechts
    ctx.fillStyle = '#111'; ctx.fillRect(W - 80, 40, 70, H - 80);
    ctx.strokeStyle = '#333'; ctx.strokeRect(W - 80, 40, 70, H - 80);
    const altFt = this.flight.altitude * 3.281;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px monospace';
    for (let s = -5; s <= 5; s++) {
      const v = Math.round(altFt / 100) * 100 + s * 100;
      const y = H/2 - s * 40;
      ctx.textAlign = 'left';
      ctx.fillText(`${v}`, W - 74, y + 5);
    }
    ctx.fillStyle = '#111'; ctx.fillRect(W - 85, H/2 - 18, 80, 36);
    ctx.strokeStyle = '#ffd000'; ctx.lineWidth = 2;
    ctx.strokeRect(W - 85, H/2 - 18, 80, 36);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 20px monospace';
    ctx.fillText(`${Math.round(altFt)}`, W - 45, H/2 + 7);
    ctx.fillStyle = '#aaa'; ctx.font = '12px monospace';
    ctx.fillText('FT', W - 45, 30);

    // VS-Indikator rechts außen
    const vsFpm = this.flight.vs * 196.85;
    ctx.fillStyle = '#111'; ctx.fillRect(W - 30, 60, 20, H - 120);
    const vy = H/2 - THREE.MathUtils.clamp(vsFpm / 2000, -1, 1) * 150;
    ctx.fillStyle = '#33ff55';
    ctx.fillRect(W - 28, vy - 2, 16, 4);
    ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(vsFpm)}`, W - 20, vy + (vsFpm > 0 ? -6 : 14));

    // Heading bottom
    ctx.fillStyle = '#111'; ctx.fillRect(40, H - 50, W - 80, 40);
    ctx.strokeStyle = '#ffd000'; ctx.strokeRect(40, H - 50, W - 80, 40);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(this.flight.heading).toString().padStart(3, '0')}°`, W/2, H - 22);

    this.textures.pfd.needsUpdate = true;
  }

  _renderND() {
    const ctx = this.ndCtx;
    const W = 512, H = 512;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    // Kompass-Rose
    ctx.save();
    ctx.translate(W/2, H/2 + 40);
    ctx.rotate(-this.flight.heading * DEG);
    ctx.strokeStyle = '#00cc66';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 180, 0, Math.PI * 2); ctx.stroke();
    // Gradmarkierungen
    ctx.fillStyle = '#00cc66'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
    for (let d = 0; d < 360; d += 10) {
      ctx.save();
      ctx.rotate(d * DEG);
      const big = d % 30 === 0;
      ctx.beginPath();
      ctx.moveTo(0, -180);
      ctx.lineTo(0, -180 + (big ? 15 : 8));
      ctx.stroke();
      if (big) {
        const lbl = d === 0 ? 'N' : d === 90 ? 'E' : d === 180 ? 'S' : d === 270 ? 'W' : `${d/10}`;
        ctx.fillText(lbl, 0, -195);
      }
      ctx.restore();
    }
    ctx.restore();
    // Flugzeug-Symbol
    ctx.fillStyle = '#ffff00';
    ctx.save();
    ctx.translate(W/2, H/2 + 40);
    ctx.beginPath();
    ctx.moveTo(0, -18); ctx.lineTo(-14, 14); ctx.lineTo(0, 6); ctx.lineTo(14, 14); ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Heading-Bug
    ctx.save();
    ctx.translate(W/2, H/2 + 40);
    ctx.rotate((this.s.apHdg - this.flight.heading) * DEG);
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.moveTo(0, -180); ctx.lineTo(-8, -168); ctx.lineTo(8, -168); ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Headline
    ctx.fillStyle = '#00cc66'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`HDG ${Math.round(this.flight.heading).toString().padStart(3, '0')}°`, 20, 35);
    ctx.fillText(`GS ${Math.round(this.flight.speed * 1.944)} KT`, 20, 60);
    ctx.textAlign = 'right';
    ctx.fillText(`TRK ${Math.round(this.flight.heading).toString().padStart(3, '0')}°`, W - 20, 35);
    ctx.fillText(`ALT ${Math.round(this.flight.altitude * 3.281)} FT`, W - 20, 60);

    this.textures.nd.needsUpdate = true;
  }

  _renderEng() {
    const ctx = this.engCtx;
    const W = 512, H = 512;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.strokeRect(8, 8, W - 16, H - 16);

    // Throttle N1
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
    ctx.fillText('N1 %', W/2, 40);
    const thr = Math.round(this.flight.throttle * 100);
    // Zwei Balken
    for (let i = 0; i < 2; i++) {
      const x = W/2 - 100 + i * 100;
      ctx.fillStyle = '#222'; ctx.fillRect(x, 60, 60, 180);
      ctx.strokeStyle = '#888'; ctx.strokeRect(x, 60, 60, 180);
      const h = (thr / 100) * 180;
      ctx.fillStyle = thr > 95 ? '#ff3333' : thr > 85 ? '#ffaa33' : '#33ff55';
      ctx.fillRect(x, 60 + 180 - h, 60, h);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace';
      ctx.fillText(`${thr}`, x + 30, 270);
      ctx.font = '14px monospace'; ctx.fillStyle = '#888';
      ctx.fillText(`ENG ${i+1}`, x + 30, 290);
    }

    // Fuel
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'left';
    ctx.fillText('FUEL', 30, 340);
    ctx.fillStyle = '#222'; ctx.fillRect(30, 350, W - 60, 24);
    ctx.strokeStyle = '#888'; ctx.strokeRect(30, 350, W - 60, 24);
    const fu = THREE.MathUtils.clamp(this.flight.fuel, 0, 1);
    ctx.fillStyle = fu < 0.15 ? '#ff4444' : fu < 0.3 ? '#ffaa33' : '#33bbff';
    ctx.fillRect(30, 350, (W - 60) * fu, 24);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.font = 'bold 16px monospace';
    ctx.fillText(`${Math.round(fu * 100)}%`, W - 40, 368);

    // G-Load
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = 'bold 18px monospace';
    ctx.fillText('G-LOAD', 30, 410);
    ctx.fillStyle = Math.abs(this.flight.gLoad) > 3 ? '#ff4444' : '#fff';
    ctx.font = 'bold 32px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`${this.flight.gLoad.toFixed(1)} G`, W - 30, 420);

    // Status zeilen
    ctx.font = '14px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#aaa';
    let yy = 450;
    ctx.fillStyle = this.flight.gear ? '#33ff55' : '#ff8833';
    ctx.fillText(`GEAR  ${this.flight.gear ? 'DOWN' : 'UP'}`, 30, yy); yy += 18;
    ctx.fillStyle = '#fff';
    ctx.fillText(`FLAPS ${this.flight.flaps}`, 30, yy); yy += 18;
    ctx.fillStyle = this.flight.spoilers ? '#ff8833' : '#555';
    ctx.fillText(`SPLR  ${this.flight.spoilers ? 'ARM' : 'OFF'}`, 30, yy); yy += 18;

    this.textures.eng.needsUpdate = true;
  }

  _renderStandby() {
    const ctx = this.sbyCtx;
    const W = 256, H = 256;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    // Standby ADI als kleine Kugel
    ctx.save();
    ctx.translate(W/2, H/2);
    ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.clip();
    ctx.rotate(-this.flight.roll);
    const horizon = this.flight.pitch * 150;
    ctx.fillStyle = '#1e6aa8'; ctx.fillRect(-200, -300 + horizon, 400, 300);
    ctx.fillStyle = '#7a5230'; ctx.fillRect(-200, horizon, 400, 300);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-200, horizon); ctx.lineTo(200, horizon); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W/2, H/2, 100, 0, Math.PI * 2); ctx.stroke();
    // Aircraft-Marker
    ctx.strokeStyle = '#ffd000'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W/2 - 30, H/2); ctx.lineTo(W/2 - 10, H/2);
    ctx.moveTo(W/2 + 10, H/2); ctx.lineTo(W/2 + 30, H/2); ctx.stroke();
    ctx.fillStyle = '#ffd000'; ctx.fillRect(W/2 - 3, H/2 - 3, 6, 6);
    // Label
    ctx.fillStyle = '#888'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
    ctx.fillText('STBY', W/2, 20);
    this.textures.sby.needsUpdate = true;
  }

  _renderMCP() {
    const ctx = this.mcpCtx;
    const W = 1024, H = 140;
    ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.strokeRect(4, 4, W - 8, H - 8);

    // 4 Spalten: SPD, HDG, ALT, VS
    const cols = [
      { label: 'SPD',  value: `${Math.round(this.s.apSpeed)}`, unit: 'KT' },
      { label: 'HDG',  value: `${Math.round(this.s.apHdg).toString().padStart(3,'0')}`, unit: '°' },
      { label: 'ALT',  value: `${Math.round(this.s.apAlt).toString().padStart(5,'0')}`, unit: 'FT' },
      { label: 'V/S',  value: `${this.s.apVs >= 0 ? '+' : ''}${Math.round(this.s.apVs)}`, unit: 'FPM' },
    ];
    const colW = W / 4;
    ctx.textAlign = 'center';
    cols.forEach((c, i) => {
      const cx = i * colW + colW / 2;
      ctx.fillStyle = '#aaa'; ctx.font = '16px monospace';
      ctx.fillText(c.label, cx, 28);
      ctx.fillStyle = '#33ff55'; ctx.font = 'bold 42px monospace';
      ctx.fillText(c.value, cx, 78);
      ctx.fillStyle = '#888'; ctx.font = '13px monospace';
      ctx.fillText(c.unit, cx, 100);
      if (i < 3) { ctx.strokeStyle = '#222'; ctx.beginPath(); ctx.moveTo((i+1) * colW, 10); ctx.lineTo((i+1) * colW, H - 10); ctx.stroke(); }
    });

    // AP-Statuszeile unten
    ctx.fillStyle = this.flight.autopilot ? '#33ff55' : '#555';
    ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`AP: ${this.flight.autopilot ? 'ENGAGED' : '---'}`, 20, H - 14);
    ctx.fillStyle = this.s.apHdgHold ? '#ffaa33' : '#555';
    ctx.fillText(`HDG HOLD`, 200, H - 14);
    ctx.fillStyle = this.s.apAltHold ? '#ffaa33' : '#555';
    ctx.fillText(`ALT HOLD`, 340, H - 14);
    ctx.fillStyle = this.s.apVnav ? '#ffaa33' : '#555';
    ctx.fillText(`VNAV`, 480, H - 14);

    this.textures.mcp.needsUpdate = true;
  }

  // ------------------------------------------------------------
  // RAYCAST / INTERACTION
  // ------------------------------------------------------------

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
    // Unhover
    if (this.hovered && this._hoverOrigEmissive) {
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

  _fireAction(a) {
    switch (a.type) {
      case 'toggle':
        this.s[a.key] = !this.s[a.key];
        // Server-Events nur für Lichter & Systemkritisches
        if (['landingL','navL','strobe','beacon'].includes(a.key)) {
          this.onAction('lights');
        }
        this._updateDynamic();
        break;
      case 'throttleDrag':
        // Klick = erhöhe Throttle in Schritten (Wheel für Drag kommt extra)
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
        if (a.key === 'autopilot') { this.onAction('autopilot', 'master'); }
        else if (a.key === 'apHdgHold') { this.s.apHdgHold = !this.s.apHdgHold; this.onAction('autopilot', 'hdg'); }
        else if (a.key === 'apAltHold') { this.s.apAltHold = !this.s.apAltHold; this.onAction('autopilot', 'alt'); }
        else if (a.key === 'apVnav') { this.s.apVnav = !this.s.apVnav; }
        this._updateDynamic();
        break;
      }
    }
  }

  // Für Scroll-Wheel auf Throttle: delta in -1..1
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
      let v = this.s[a.key] + Math.sign(delta) * a.delta * -1;
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
}
