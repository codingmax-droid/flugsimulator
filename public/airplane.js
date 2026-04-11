import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ============================================================
// FLUGZEUG-GEOMETRIE-PARAMETER PRO TYP
// Jeder Typ hat einzigartige Proportionen
// ============================================================

const CONFIGS = {
  a320: { // Airbus Narrowbody
    body: { len: 12, r: 0.6, noseTaper: 0.35 },
    wing: { span: 11, root: 3, tip: 0.9, sweep: 2.5, pos: 0.3, y: -0.1 },
    engine: { r: 0.42, len: 2, y: -0.7, z: 3.2, count: 2 },
    tail: { hSpan: 4.5, hChord: 1.5, vH: 2.3, vChord: 2.5 },
    gear: { noseX: 4.5, mainX: -0.5, mainZ: 1.8 },
    winglet: 'fence',
  },
  a330: { // Airbus Widebody Twin
    body: { len: 20, r: 0.88, noseTaper: 0.4 },
    wing: { span: 18, root: 5, tip: 1.2, sweep: 3.5, pos: 1, y: -0.2 },
    engine: { r: 0.6, len: 2.8, y: -1.0, z: 5, count: 2 },
    tail: { hSpan: 6, hChord: 2, vH: 3.2, vChord: 3 },
    gear: { noseX: 7, mainX: -1, mainZ: 2.8 },
    winglet: 'fence',
  },
  a340: { // Airbus Quad
    body: { len: 22, r: 0.88, noseTaper: 0.4 },
    wing: { span: 19, root: 5, tip: 1.2, sweep: 3.5, pos: 1, y: -0.2 },
    engine: { r: 0.38, len: 2.2, y: -0.85, z: 0, count: 4, positions: [[0.5,3.2],[0.2,6.5]] },
    tail: { hSpan: 6, hChord: 2, vH: 3.5, vChord: 3.5 },
    gear: { noseX: 8, mainX: -1, mainZ: 2.8 },
    winglet: 'fence',
  },
  a350: { // Airbus Modern Widebody
    body: { len: 20, r: 0.9, noseTaper: 0.45 },
    wing: { span: 19, root: 5.5, tip: 1, sweep: 4, pos: 1, y: -0.2 },
    engine: { r: 0.55, len: 3, y: -1.0, z: 5, count: 2 },
    tail: { hSpan: 6, hChord: 2, vH: 3.5, vChord: 3.5 },
    gear: { noseX: 7.5, mainX: -1, mainZ: 3 },
    winglet: 'curved',
  },
  a380: { // Double Deck Super
    body: { len: 24, r: 1.25, noseTaper: 0.4, doubleDeck: true },
    wing: { span: 24, root: 7, tip: 1.5, sweep: 5, pos: 1, y: -0.4 },
    engine: { r: 0.52, len: 2.8, y: -1.3, z: 0, count: 4, positions: [[0.5,4.8],[0.2,9]] },
    tail: { hSpan: 8, hChord: 3, vH: 4.5, vChord: 4.5 },
    gear: { noseX: 9, mainX: -1.5, mainZ: 3.5, extraBody: true },
    winglet: 'fence',
  },
  b737: { // Boeing Narrowbody
    body: { len: 12, r: 0.58, noseTaper: 0.3 },
    wing: { span: 11, root: 3, tip: 0.8, sweep: 2.2, pos: 0.2, y: -0.05 },
    engine: { r: 0.38, len: 1.8, y: -0.6, z: 3, count: 2, flat: true },
    tail: { hSpan: 4.5, hChord: 1.4, vH: 2.2, vChord: 2.2 },
    gear: { noseX: 4.5, mainX: -0.5, mainZ: 1.8 },
    winglet: 'split',
  },
  b747: { // Jumbo — Upper Deck Hump
    body: { len: 22, r: 1.05, noseTaper: 0.35, hump: true },
    wing: { span: 19, root: 6, tip: 1.5, sweep: 4.5, pos: 0.5, y: -0.3 },
    engine: { r: 0.48, len: 2.5, y: -1.2, z: 0, count: 4, positions: [[0.8,3.8],[0.3,7.2]] },
    tail: { hSpan: 7, hChord: 2.5, vH: 4, vChord: 4 },
    gear: { noseX: 8, mainX: -1, mainZ: 3.2, extraBody: true },
    winglet: null,
  },
  b757: { // Boeing Long Narrowbody
    body: { len: 15, r: 0.6, noseTaper: 0.32 },
    wing: { span: 12, root: 3.5, tip: 0.9, sweep: 2.5, pos: 0.3, y: -0.1 },
    engine: { r: 0.45, len: 2.3, y: -0.8, z: 3.5, count: 2 },
    tail: { hSpan: 5, hChord: 1.6, vH: 2.8, vChord: 2.8 },
    gear: { noseX: 5.5, mainX: -0.5, mainZ: 2 },
    winglet: null,
  },
  b777: { // Boeing Big Twin
    body: { len: 22, r: 0.98, noseTaper: 0.38 },
    wing: { span: 19, root: 5.5, tip: 1.2, sweep: 4, pos: 1, y: -0.25 },
    engine: { r: 0.7, len: 3.2, y: -1.2, z: 5.2, count: 2 },
    tail: { hSpan: 6.5, hChord: 2.2, vH: 3.5, vChord: 3.5 },
    gear: { noseX: 8, mainX: -1, mainZ: 3.2, extraBody: true },
    winglet: null,
  },
  b787: { // Boeing Dreamliner
    body: { len: 19, r: 0.9, noseTaper: 0.42 },
    wing: { span: 18, root: 5, tip: 1, sweep: 4.5, pos: 1, y: -0.2 },
    engine: { r: 0.52, len: 2.8, y: -1.0, z: 4.8, count: 2, serrated: true },
    tail: { hSpan: 6, hChord: 2, vH: 3.2, vChord: 3.2 },
    gear: { noseX: 7, mainX: -1, mainZ: 2.8 },
    winglet: 'raked',
  },
};

// ============================================================
// HAUPT-BAUFUNKTION
// ============================================================

export function buildAircraft(type = 'a320', color1 = '#ffffff', color2 = '#cc0000') {
  const C = CONFIGS[type] || CONFIGS.a320;
  const inner = new THREE.Group(); // Gebaut entlang X-Achse

  const white = new THREE.MeshPhongMaterial({ color: 0xf0f0f0, shininess: 60 });
  const tailMat = new THREE.MeshPhongMaterial({ color: new THREE.Color(color1), shininess: 50 });
  const accentMat = new THREE.MeshPhongMaterial({ color: new THREE.Color(color2), shininess: 40 });
  const chrome = new THREE.MeshPhongMaterial({ color: 0xbbbbbb, shininess: 90 });
  const dark = new THREE.MeshPhongMaterial({ color: 0x333333 });
  const glass = new THREE.MeshPhongMaterial({ color: 0x1a3050, shininess: 120, transparent: true, opacity: 0.8 });

  const B = C.body;
  const halfLen = B.len / 2;

  // ── RUMPF (Zylinder + Nasenkegel + Heckkonus) ──
  const bodyGeo = new THREE.CylinderGeometry(B.r, B.r, B.len, 20, 1, false);
  bodyGeo.rotateZ(Math.PI / 2);
  const bodyMesh = new THREE.Mesh(bodyGeo, white);
  bodyMesh.castShadow = true;
  inner.add(bodyMesh);

  // Nase
  const noseGeo = new THREE.ConeGeometry(B.r, B.len * B.noseTaper, 20);
  noseGeo.rotateZ(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, white);
  nose.position.x = halfLen + B.len * B.noseTaper * 0.48;
  nose.castShadow = true;
  inner.add(nose);

  // Heck (verjüngt sich)
  const tailConeGeo = new THREE.ConeGeometry(B.r, B.len * 0.22, 20);
  tailConeGeo.rotateZ(Math.PI / 2);
  const tailCone = new THREE.Mesh(tailConeGeo, white);
  tailCone.position.x = -halfLen - B.len * 0.1;
  tailCone.castShadow = true;
  inner.add(tailCone);

  // ── B747 OBERDECK-BUCKEL ──
  if (B.hump) {
    const humpLen = B.len * 0.45;
    const humpGeo = new THREE.CylinderGeometry(B.r * 0.55, B.r * 0.55, humpLen, 16, 1, false, 0, Math.PI);
    humpGeo.rotateZ(Math.PI / 2);
    humpGeo.rotateX(Math.PI); // Oben
    const hump = new THREE.Mesh(humpGeo, white);
    hump.position.set(halfLen * 0.35, B.r * 0.7, 0);
    hump.castShadow = true;
    inner.add(hump);

    // Buckel-Nase abrunden
    const humpNoseGeo = new THREE.SphereGeometry(B.r * 0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    humpNoseGeo.rotateZ(-Math.PI / 2);
    const humpNose = new THREE.Mesh(humpNoseGeo, white);
    humpNose.position.set(halfLen * 0.35 + humpLen / 2, B.r * 0.7, 0);
    inner.add(humpNose);
  }

  // ── A380 DOPPELDECK (breiterer Oberkörper) ──
  if (B.doubleDeck) {
    const ddGeo = new THREE.CylinderGeometry(B.r * 0.92, B.r * 0.92, B.len * 0.88, 20, 1, false, 0, Math.PI);
    ddGeo.rotateZ(Math.PI / 2);
    ddGeo.rotateX(Math.PI);
    const dd = new THREE.Mesh(ddGeo, white);
    dd.position.y = B.r * 0.15;
    dd.castShadow = true;
    inner.add(dd);
  }

  // ── COCKPIT-FENSTER ──
  const cwGeo = new THREE.BoxGeometry(0.5, 0.28, B.r * 1.5);
  const cw = new THREE.Mesh(cwGeo, glass);
  cw.position.set(halfLen + B.len * B.noseTaper * 0.25, B.r * 0.45, 0);
  inner.add(cw);

  // ── PASSAGIER-FENSTERSTREIFEN ──
  const winGeo = new THREE.BoxGeometry(B.len * 0.75, 0.06, B.r * 2.01);
  const winMesh = new THREE.Mesh(winGeo, glass);
  winMesh.position.set(0, B.r * 0.4, 0);
  inner.add(winMesh);

  // ── AIRLINE-STREIFEN am Rumpf ──
  const stripeGeo = new THREE.BoxGeometry(B.len * 0.82, 0.05, B.r * 2.02);
  const stripeMesh = new THREE.Mesh(stripeGeo, accentMat);
  stripeMesh.position.set(0, B.r * 0.1, 0);
  inner.add(stripeMesh);

  // ── FLÜGEL ──
  const W = C.wing;
  for (const side of [1, -1]) {
    const wGeo = createWingGeo(W.span / 2, W.root, W.tip, W.sweep);
    const wMesh = new THREE.Mesh(wGeo, white);
    wMesh.castShadow = true;
    wMesh.position.set(W.pos, W.y, 0);
    if (side === -1) wMesh.scale.z = -1;
    inner.add(wMesh);

    // Winglets
    if (C.winglet === 'fence') {
      const wlGeo = new THREE.BoxGeometry(W.tip * 0.7, W.span * 0.04, 0.04);
      const wl = new THREE.Mesh(wlGeo, white);
      wl.position.set(W.pos + W.sweep, W.y + W.span * 0.02, side * W.span / 2);
      inner.add(wl);
    } else if (C.winglet === 'curved') {
      const wlGeo = new THREE.BoxGeometry(W.tip * 0.5, W.span * 0.06, 0.04);
      const wl = new THREE.Mesh(wlGeo, white);
      wl.position.set(W.pos + W.sweep + 0.3, W.y + W.span * 0.035, side * W.span / 2);
      wl.rotation.z = side * 1.0;
      inner.add(wl);
    } else if (C.winglet === 'raked') {
      const wlGeo = new THREE.BoxGeometry(W.tip * 0.9, W.span * 0.05, 0.04);
      const wl = new THREE.Mesh(wlGeo, white);
      wl.position.set(W.pos + W.sweep + 0.5, W.y + W.span * 0.03, side * (W.span / 2 + 0.2));
      wl.rotation.z = side * 0.6;
      inner.add(wl);
    } else if (C.winglet === 'split') {
      // Boeing split-tip winglet (737 MAX style)
      for (const dir of [1, -1]) {
        const wlGeo = new THREE.BoxGeometry(W.tip * 0.5, W.span * 0.03, 0.03);
        const wl = new THREE.Mesh(wlGeo, white);
        wl.position.set(W.pos + W.sweep, W.y + dir * W.span * 0.02, side * W.span / 2);
        wl.rotation.z = side * dir * 0.7;
        inner.add(wl);
      }
    }
  }

  // ── TRIEBWERKE ──
  const E = C.engine;
  const enginePositions = [];
  if (E.count === 4 && E.positions) {
    for (const [offX, offZ] of E.positions) {
      enginePositions.push([W.pos + offX, E.y, offZ]);
      enginePositions.push([W.pos + offX, E.y, -offZ]);
    }
  } else {
    enginePositions.push([W.pos, E.y, E.z], [W.pos, E.y, -E.z]);
  }

  for (const [ex, ey, ez] of enginePositions) {
    const eg = new THREE.Group();

    // Gondel
    const nacGeo = new THREE.CylinderGeometry(E.r, E.r * 0.88, E.len, 16);
    nacGeo.rotateZ(Math.PI / 2);
    eg.add(new THREE.Mesh(nacGeo, chrome));

    // Intake-Ring
    const ringGeo = new THREE.TorusGeometry(E.r, E.r * 0.07, 8, 20);
    ringGeo.rotateY(Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, dark);
    ring.position.x = E.len / 2;
    eg.add(ring);

    // Innerer Spinner
    const spinGeo = new THREE.ConeGeometry(E.r * 0.25, E.r * 0.6, 12);
    spinGeo.rotateZ(-Math.PI / 2);
    const spin = new THREE.Mesh(spinGeo, chrome);
    spin.position.x = E.len / 2 - 0.1;
    eg.add(spin);

    // Fan-Blades (drehen sich!)
    const fanGroup = new THREE.Group();
    for (let i = 0; i < 18; i++) {
      const bladeGeo = new THREE.BoxGeometry(0.02, E.r * 0.65, E.r * 0.06);
      const blade = new THREE.Mesh(bladeGeo, chrome);
      blade.position.y = E.r * 0.37;
      const pivot = new THREE.Group();
      pivot.add(blade);
      pivot.rotation.x = (i / 18) * Math.PI * 2;
      fanGroup.add(pivot);
    }
    fanGroup.position.x = E.len / 2 - 0.15;
    fanGroup.userData.isPropeller = true;
    eg.add(fanGroup);

    // Exhaust
    const exhGeo = new THREE.CylinderGeometry(E.r * 0.6, E.r * 0.65, 0.2, 16);
    exhGeo.rotateZ(Math.PI / 2);
    const exh = new THREE.Mesh(exhGeo, dark);
    exh.position.x = -E.len / 2;
    eg.add(exh);

    // Pylon
    const pylonH = Math.abs(ey - W.y);
    const pylonGeo = new THREE.BoxGeometry(E.len * 0.45, pylonH, 0.08);
    const pylon = new THREE.Mesh(pylonGeo, chrome);
    pylon.position.set(0, pylonH / 2 + 0.05, 0);
    eg.add(pylon);

    // B737 flat bottom
    if (E.flat) {
      const flatGeo = new THREE.BoxGeometry(E.len * 0.55, 0.06, E.r * 1.6);
      const flat = new THREE.Mesh(flatGeo, chrome);
      flat.position.set(0.1, -E.r * 0.82, 0);
      eg.add(flat);
    }

    // B787 serrated nacelle
    if (E.serrated) {
      for (let i = 0; i < 12; i++) {
        const toothGeo = new THREE.ConeGeometry(0.03, 0.15, 3);
        toothGeo.rotateZ(Math.PI / 2);
        const tooth = new THREE.Mesh(toothGeo, dark);
        const a = (i / 12) * Math.PI * 2;
        tooth.position.set(-E.len / 2 - 0.1, Math.sin(a) * E.r * 0.65, Math.cos(a) * E.r * 0.65);
        eg.add(tooth);
      }
    }

    eg.position.set(ex, ey, ez);
    inner.add(eg);
  }

  // ── HÖHENLEITWERK ──
  const T = C.tail;
  const tailX = -halfLen - B.len * 0.15;
  for (const side of [1, -1]) {
    const hsGeo = createWingGeo(T.hSpan / 2, T.hChord, T.hChord * 0.4, 0.8);
    const hs = new THREE.Mesh(hsGeo, white);
    hs.position.set(tailX, B.r * 0.15, 0);
    if (side === -1) hs.scale.z = -1;
    hs.castShadow = true;
    inner.add(hs);
  }

  // ── SEITENLEITWERK (Airline-Farbe!) ──
  const vfGeo = createFinGeo(T.vH, T.vChord);
  const vf = new THREE.Mesh(vfGeo, tailMat);
  vf.position.set(tailX, B.r, 0);
  vf.castShadow = true;
  inner.add(vf);

  // Akzent auf dem Leitwerk
  const faGeo = new THREE.BoxGeometry(T.vChord * 0.3, T.vH * 0.25, 0.06);
  const fa = new THREE.Mesh(faGeo, accentMat);
  fa.position.set(tailX - T.vChord * 0.15, B.r + T.vH * 0.55, 0);
  inner.add(fa);

  // ── FAHRWERK ──
  const G = C.gear;
  addGearAssembly(inner, G.noseX, -B.r - 0.2, 0, 0.14, 1.0, dark);
  addGearAssembly(inner, G.mainX, -B.r - 0.2, G.mainZ, 0.2, 1.3, dark);
  addGearAssembly(inner, G.mainX, -B.r - 0.2, -G.mainZ, 0.2, 1.3, dark);
  if (G.extraBody) {
    addGearAssembly(inner, G.mainX + 1.5, -B.r - 0.2, G.mainZ * 0.4, 0.18, 1.2, dark);
    addGearAssembly(inner, G.mainX + 1.5, -B.r - 0.2, -G.mainZ * 0.4, 0.18, 1.2, dark);
  }

  // ── WRAPPER: Drehe Modell von X-Achse (Baurichtung) auf Z-Achse (Flugrichtung) ──
  inner.rotation.y = -Math.PI / 2;
  const wrapper = new THREE.Group();
  wrapper.add(inner);
  return wrapper;
}

// ============================================================
// GEOMETRIE-HELFER
// ============================================================

function createWingGeo(halfSpan, rootChord, tipChord, sweep) {
  const verts = [];
  const t = 0.1; // Dicke
  const sweepX = sweep;

  // Root: von -rootChord/2 bis +rootChord/2 bei z=0
  // Tip:  von -tipChord/2+sweep bis +tipChord/2+sweep bei z=halfSpan
  const r0 = rootChord / 2, r1 = -rootChord / 2;
  const t0 = tipChord / 2 + sweepX, t1 = -tipChord / 2 + sweepX;

  const quad = (a, b, c, d) => { verts.push(...a, ...b, ...c, ...a, ...c, ...d); };

  // Oben
  quad([r0, t, 0], [t0, t * 0.3, halfSpan], [t1, t * 0.3, halfSpan], [r1, t, 0]);
  // Unten
  quad([r1, 0, 0], [t1, 0, halfSpan], [t0, 0, halfSpan], [r0, 0, 0]);
  // Vorderkante
  quad([r0, 0, 0], [t0, 0, halfSpan], [t0, t * 0.3, halfSpan], [r0, t, 0]);
  // Hinterkante
  quad([r1, t, 0], [t1, t * 0.3, halfSpan], [t1, 0, halfSpan], [r1, 0, 0]);
  // Flügelspitze
  quad([t0, 0, halfSpan], [t1, 0, halfSpan], [t1, t * 0.3, halfSpan], [t0, t * 0.3, halfSpan]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  geo.computeVertexNormals();
  return geo;
}

function createFinGeo(height, chord) {
  const verts = [];
  const th = 0.06;
  // Dreieckige Finne: Basis = chord, Spitze schmaler und nach hinten geneigt
  const quad = (a, b, c, d) => { verts.push(...a, ...b, ...c, ...a, ...c, ...d); };
  // Zwei Seiten
  for (const z of [0, th]) {
    verts.push(0, 0, z, -chord, 0, z, -chord * 0.35, height, z);
    verts.push(0, 0, z, -chord * 0.35, height, z, 0.15, height * 0.65, z);
  }
  // Vorderkante
  quad([0.15, height * 0.65, 0], [-chord * 0.35, height, 0], [-chord * 0.35, height, th], [0.15, height * 0.65, th]);
  // Hinterkante
  quad([-chord, 0, 0], [-chord, 0, th], [-chord * 0.35, height, th], [-chord * 0.35, height, 0]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  geo.computeVertexNormals();
  return geo;
}

function addGearAssembly(group, x, y, z, wheelR, strutH, mat) {
  const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, strutH, 6), mat);
  strut.position.set(x, y - strutH / 2, z);
  group.add(strut);
  for (const dz of [-0.1, 0.1]) {
    const wGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.1, 10);
    wGeo.rotateX(Math.PI / 2);
    const w = new THREE.Mesh(wGeo, mat);
    w.position.set(x, y - strutH, z + dz);
    group.add(w);
  }
}

// ============================================================
// PUBLIC API
// ============================================================

export function createAircraftForType(type, color1, color2) {
  return buildAircraft(type, color1, color2);
}

export function createProceduralAirplane(id) {
  return buildAircraft('a320', '#05164d', '#ffc72c');
}

export async function loadAircraftModel(type) {
  try {
    const gltf = await new Promise((resolve, reject) => {
      new GLTFLoader().load(`/models/${type}.glb`, resolve, undefined, reject);
    });
    return gltf.scene.clone();
  } catch (e) { return null; }
}

// ============================================================
// 3D PREVIEW (Menü)
// ============================================================

export class AircraftPreview {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1524);

    this.camera = new THREE.PerspectiveCamera(30, 2, 0.1, 300);
    this.camera.position.set(20, 10, 20);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const d = new THREE.DirectionalLight(0xfff5e0, 1.3);
    d.position.set(15, 20, 10);
    this.scene.add(d);
    const rim = new THREE.DirectionalLight(0x4a9eff, 0.3);
    rim.position.set(-15, 5, -10);
    this.scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshLambertMaterial({ color: 0x151e2d })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3;
    this.scene.add(ground);

    this.model = null;
    this.angle = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = this.container.clientWidth || 400;
    const h = this.container.clientHeight || 280;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  setAircraft(type, color1, color2) {
    if (this.model) { this.scene.remove(this.model); }
    this.model = buildAircraft(type, color1, color2);
    this.scene.add(this.model);
    this.resize();
  }

  render() {
    this.angle += 0.004;
    if (this.model) {
      this.model.rotation.y = this.angle;
      this.model.traverse(c => {
        if (c.userData?.isPropeller) c.rotation.x += 0.12;
      });
    }
    const dist = 25;
    this.camera.position.set(
      Math.sin(this.angle * 0.4) * dist,
      7 + Math.sin(this.angle * 0.25) * 2,
      Math.cos(this.angle * 0.4) * dist
    );
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }
}
