import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AIRCRAFT_TYPES } from './airlines.js';

// ============================================================
// FLUGZEUG-GEOMETRIE-PARAMETER PRO TYP
// ============================================================

const CONFIGS = {
  // ===================== JET AIRLINERS (bestehend) =====================
  a320: { archetype: 'airliner', body: { len: 12, r: 0.6, noseTaper: 0.35 }, wing: { span: 11, root: 3, tip: 0.9, sweep: 2.5, pos: 0.3, y: -0.1 }, engine: { r: 0.42, len: 2, y: -0.7, z: 3.2, count: 2 }, tail: { hSpan: 4.5, hChord: 1.5, vH: 2.3, vChord: 2.5 }, gear: { noseX: 4.5, mainX: -0.5, mainZ: 1.8 }, winglet: 'fence' },
  a330: { archetype: 'airliner', body: { len: 20, r: 0.88, noseTaper: 0.4 }, wing: { span: 18, root: 5, tip: 1.2, sweep: 3.5, pos: 1, y: -0.2 }, engine: { r: 0.6, len: 2.8, y: -1.0, z: 5, count: 2 }, tail: { hSpan: 6, hChord: 2, vH: 3.2, vChord: 3 }, gear: { noseX: 7, mainX: -1, mainZ: 2.8 }, winglet: 'fence' },
  a340: { archetype: 'airliner', body: { len: 22, r: 0.88, noseTaper: 0.4 }, wing: { span: 19, root: 5, tip: 1.2, sweep: 3.5, pos: 1, y: -0.2 }, engine: { r: 0.38, len: 2.2, y: -0.85, z: 0, count: 4, positions: [[0.5,3.2],[0.2,6.5]] }, tail: { hSpan: 6, hChord: 2, vH: 3.5, vChord: 3.5 }, gear: { noseX: 8, mainX: -1, mainZ: 2.8 }, winglet: 'fence' },
  a350: { archetype: 'airliner', body: { len: 20, r: 0.9, noseTaper: 0.45 }, wing: { span: 19, root: 5.5, tip: 1, sweep: 4, pos: 1, y: -0.2 }, engine: { r: 0.55, len: 3, y: -1.0, z: 5, count: 2 }, tail: { hSpan: 6, hChord: 2, vH: 3.5, vChord: 3.5 }, gear: { noseX: 7.5, mainX: -1, mainZ: 3 }, winglet: 'curved' },
  a380: { archetype: 'airliner', body: { len: 24, r: 1.25, noseTaper: 0.4, doubleDeck: true }, wing: { span: 24, root: 7, tip: 1.5, sweep: 5, pos: 1, y: -0.4 }, engine: { r: 0.52, len: 2.8, y: -1.3, z: 0, count: 4, positions: [[0.5,4.8],[0.2,9]] }, tail: { hSpan: 8, hChord: 3, vH: 4.5, vChord: 4.5 }, gear: { noseX: 9, mainX: -1.5, mainZ: 3.5, extraBody: true }, winglet: 'fence' },
  b737: { archetype: 'airliner', body: { len: 12, r: 0.58, noseTaper: 0.3 }, wing: { span: 11, root: 3, tip: 0.8, sweep: 2.2, pos: 0.2, y: -0.05 }, engine: { r: 0.38, len: 1.8, y: -0.6, z: 3, count: 2, flat: true }, tail: { hSpan: 4.5, hChord: 1.4, vH: 2.2, vChord: 2.2 }, gear: { noseX: 4.5, mainX: -0.5, mainZ: 1.8 }, winglet: 'split' },
  b747: { archetype: 'airliner', body: { len: 22, r: 1.05, noseTaper: 0.35, hump: true }, wing: { span: 19, root: 6, tip: 1.5, sweep: 4.5, pos: 0.5, y: -0.3 }, engine: { r: 0.48, len: 2.5, y: -1.2, z: 0, count: 4, positions: [[0.8,3.8],[0.3,7.2]] }, tail: { hSpan: 7, hChord: 2.5, vH: 4, vChord: 4 }, gear: { noseX: 8, mainX: -1, mainZ: 3.2, extraBody: true }, winglet: null },
  b757: { archetype: 'airliner', body: { len: 15, r: 0.6, noseTaper: 0.32 }, wing: { span: 12, root: 3.5, tip: 0.9, sweep: 2.5, pos: 0.3, y: -0.1 }, engine: { r: 0.45, len: 2.3, y: -0.8, z: 3.5, count: 2 }, tail: { hSpan: 5, hChord: 1.6, vH: 2.8, vChord: 2.8 }, gear: { noseX: 5.5, mainX: -0.5, mainZ: 2 }, winglet: null },
  b777: { archetype: 'airliner', body: { len: 22, r: 0.98, noseTaper: 0.38 }, wing: { span: 19, root: 5.5, tip: 1.2, sweep: 4, pos: 1, y: -0.25 }, engine: { r: 0.7, len: 3.2, y: -1.2, z: 5.2, count: 2 }, tail: { hSpan: 6.5, hChord: 2.2, vH: 3.5, vChord: 3.5 }, gear: { noseX: 8, mainX: -1, mainZ: 3.2, extraBody: true }, winglet: null },
  b787: { archetype: 'airliner', body: { len: 19, r: 0.9, noseTaper: 0.42 }, wing: { span: 18, root: 5, tip: 1, sweep: 4.5, pos: 1, y: -0.2 }, engine: { r: 0.52, len: 2.8, y: -1.0, z: 4.8, count: 2, serrated: true }, tail: { hSpan: 6, hChord: 2, vH: 3.2, vChord: 3.2 }, gear: { noseX: 7, mainX: -1, mainZ: 2.8 }, winglet: 'raked' },

  // ===================== AIRBUS (NEU) =====================
  a220: { archetype: 'airliner', body: { len: 11, r: 0.55, noseTaper: 0.35 }, wing: { span: 10.5, root: 2.8, tip: 0.8, sweep: 2.2, pos: 0.3, y: -0.1 }, engine: { r: 0.48, len: 2.2, y: -0.7, z: 3, count: 2 }, tail: { hSpan: 4.2, hChord: 1.4, vH: 2.2, vChord: 2.3 }, gear: { noseX: 4, mainX: -0.5, mainZ: 1.7 }, winglet: 'curved' },
  a300: { archetype: 'airliner', body: { len: 17, r: 0.85, noseTaper: 0.4 }, wing: { span: 14, root: 4.5, tip: 1.2, sweep: 3, pos: 0.5, y: -0.2 }, engine: { r: 0.55, len: 2.5, y: -0.9, z: 4, count: 2 }, tail: { hSpan: 5.5, hChord: 1.8, vH: 3, vChord: 3 }, gear: { noseX: 6, mainX: -0.5, mainZ: 2.5 }, winglet: null },
  a321: { archetype: 'airliner', body: { len: 14, r: 0.6, noseTaper: 0.32 }, wing: { span: 11, root: 3, tip: 0.9, sweep: 2.5, pos: 0.3, y: -0.1 }, engine: { r: 0.42, len: 2, y: -0.7, z: 3.2, count: 2 }, tail: { hSpan: 4.5, hChord: 1.5, vH: 2.3, vChord: 2.5 }, gear: { noseX: 5.2, mainX: -0.5, mainZ: 1.8 }, winglet: 'fence' },

  // ===================== BOEING (NEU) =====================
  b707: { archetype: 'airliner', body: { len: 15, r: 0.72, noseTaper: 0.32 }, wing: { span: 13, root: 3.8, tip: 1, sweep: 3, pos: 0.3, y: -0.15 }, engine: { r: 0.32, len: 2.2, y: -0.9, z: 0, count: 4, positions: [[0.8,2.8],[0.4,5.2]] }, tail: { hSpan: 5, hChord: 1.6, vH: 2.8, vChord: 2.8 }, gear: { noseX: 5, mainX: -0.5, mainZ: 2 }, winglet: null },
  b717: { archetype: 'reartwin', body: { len: 11, r: 0.55, noseTaper: 0.32 }, wing: { span: 10, root: 2.8, tip: 0.8, sweep: 2, pos: 0.1, y: -0.15 }, engine: { r: 0.4, len: 2, y: 0.15, z: 1.0, count: 2 }, tail: { hSpan: 4.2, hChord: 1.4, vH: 2.6, vChord: 2.5, tTail: true }, gear: { noseX: 4, mainX: -0.4, mainZ: 1.6 } },
  b727: { archetype: 'trijet', body: { len: 14, r: 0.62, noseTaper: 0.32 }, wing: { span: 11, root: 3, tip: 0.9, sweep: 2.8, pos: 0, y: -0.15 }, engine: { r: 0.35, len: 2, y: 0.15, z: 1.0, wingZ: 0, count: 3 }, tail: { hSpan: 4.5, hChord: 1.5, vH: 2.8, vChord: 2.6, tTail: true }, gear: { noseX: 5, mainX: -0.5, mainZ: 1.8 } },
  b767: { archetype: 'airliner', body: { len: 17, r: 0.78, noseTaper: 0.38 }, wing: { span: 15, root: 4.5, tip: 1.1, sweep: 3.5, pos: 0.7, y: -0.2 }, engine: { r: 0.55, len: 2.7, y: -0.9, z: 4, count: 2 }, tail: { hSpan: 5.5, hChord: 1.8, vH: 3, vChord: 3 }, gear: { noseX: 6.5, mainX: -0.8, mainZ: 2.5 }, winglet: null },
};

// ============================================================
// MATERIAL-FACTORY (PBR wie GLB-Modelle)
// ============================================================
function buildMats(livery) {
  // Livery kann ein Objekt {color1,color2,belly,engine,cheatline,titles,...}
  // oder (Backwards-Compat) nur zwei CSS-Strings sein.
  const L = typeof livery === 'object' ? livery : {
    color1: livery || '#05164d', color2: arguments[1] || '#ffc72c',
    belly: '#eaeaec', engine: '#f2f2f4', cheatline: livery || '#05164d',
    titles: livery || '#05164d', tailStyle: 'solid',
  };
  return {
    L,
    white:      new THREE.MeshStandardMaterial({ color: 0xf5f6f8, metalness: 0.55, roughness: 0.32, envMapIntensity: 1.3 }),
    tailMat:    new THREE.MeshStandardMaterial({ color: new THREE.Color(L.color1), metalness: 0.45, roughness: 0.35, envMapIntensity: 1.2 }),
    tailExtra:  new THREE.MeshStandardMaterial({ color: new THREE.Color(L.tailExtra || L.color2), metalness: 0.45, roughness: 0.35, envMapIntensity: 1.2 }),
    accentMat:  new THREE.MeshStandardMaterial({ color: new THREE.Color(L.color2), metalness: 0.4, roughness: 0.4, envMapIntensity: 1.1 }),
    bellyMat:   new THREE.MeshStandardMaterial({ color: new THREE.Color(L.belly || '#eaeaec'), metalness: 0.55, roughness: 0.35, envMapIntensity: 1.2 }),
    engineMat:  new THREE.MeshStandardMaterial({ color: new THREE.Color(L.engine || '#f2f2f4'), metalness: 0.7, roughness: 0.25, envMapIntensity: 1.4 }),
    cheatMat:   new THREE.MeshStandardMaterial({ color: new THREE.Color(L.cheatline || L.color1), metalness: 0.4, roughness: 0.45, envMapIntensity: 1.0 }),
    titlesMat:  new THREE.MeshStandardMaterial({ color: new THREE.Color(L.titles || L.color1), metalness: 0.3, roughness: 0.5, envMapIntensity: 0.8 }),
    chrome:     new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 0.98, roughness: 0.18, envMapIntensity: 1.6 }),
    dark:       new THREE.MeshStandardMaterial({ color: 0x15181b, metalness: 0.7, roughness: 0.55, envMapIntensity: 0.9 }),
    rubber:     new THREE.MeshStandardMaterial({ color: 0x0a0a0c, metalness: 0.0, roughness: 0.95 }),
    glass:      new THREE.MeshStandardMaterial({ color: 0x0a1626, metalness: 0.92, roughness: 0.08, envMapIntensity: 1.8, transparent: true, opacity: 0.78 }),
    cockpit:    new THREE.MeshStandardMaterial({ color: 0x06101c, metalness: 0.95, roughness: 0.05, envMapIntensity: 2.2, transparent: true, opacity: 0.7 }),
    corrugated: new THREE.MeshStandardMaterial({ color: 0x9ea2a8, metalness: 0.75, roughness: 0.45 }),
    fabric:     new THREE.MeshStandardMaterial({ color: 0xd4cda8, metalness: 0.05, roughness: 0.85 }),
  };
}

// IATA-Titel als Canvas-Textur (Sprite auf Rumpf)
function createTitleSprite(text, colorHex, bodyR) {
  if (!text) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = colorHex || '#05164d';
  ctx.font = 'bold 96px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 72);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(bodyR * 3.2, bodyR * 0.8);
  const m = new THREE.Mesh(geo, mat);
  m.userData.isTitle = true;
  return m;
}

// ============================================================
// HAUPT-DISPATCHER
// ============================================================

// Echte Welt-Länge pro Typ aus AIRCRAFT_TYPES; fällt auf CONFIGS.body.len zurück.
export function getRealLength(type) {
  const t = AIRCRAFT_TYPES[type];
  if (t && t.length) return t.length;
  const C = CONFIGS[type];
  return C ? C.body.len : 12;
}

// Skalierungsfaktor, der ein CONFIG-basiertes Mesh auf echte Meter bringt.
function getRealScale(type) {
  const C = CONFIGS[type] || CONFIGS.a320;
  const configLen = C.body?.len || C.wing?.rootChord || 12;
  const realLen = getRealLength(type);
  return realLen / configLen;
}

export function buildAircraft(type = 'a320', liveryOrColor1 = '#ffffff', color2 = '#cc0000') {
  const C = CONFIGS[type] || CONFIGS.a320;
  // Backwards-Compat: Strings akzeptieren, Objekte bevorzugen
  const livery = (typeof liveryOrColor1 === 'object' && liveryOrColor1)
    ? liveryOrColor1
    : {
        color1: liveryOrColor1, color2,
        belly: '#eaeaec', engine: '#f2f2f4',
        cheatline: liveryOrColor1, titles: liveryOrColor1,
        tailStyle: 'solid',
      };
  const M = buildMats(livery);
  const arch = C.archetype || 'airliner';
  let inner;
  switch (arch) {
    case 'airliner':       inner = buildAirliner(C, M); break;
    case 'reartwin':       inner = buildRearTwin(C, M); break;
    case 'trijet':         inner = buildTrijet(C, M); break;
    case 'quadrear':       inner = buildQuadRear(C, M); break;
    case 'highwingjet':    inner = buildHighwingJet(C, M); break;
    case 'delta':          inner = buildDelta(C, M); break;
    case 'proptwin':       inner = buildPropTwin(C, M); break;
    case 'propquad':       inner = buildPropQuad(C, M); break;
    case 'trimotorprop':   inner = buildTrimotorProp(C, M); break;
    case 'turbopropwing':  inner = buildTurbopropWing(C, M); break;
    case 'propsingle':     inner = buildPropSingle(C, M); break;
    case 'biplane':        inner = buildBiplane(C, M); break;
    case 'glider':         inner = buildGlider(C, M); break;
    case 'amphibian':      inner = buildAmphibian(C, M); break;
    case 'canard':         inner = buildCanard(C, M); break;
    case 'bizjet':         inner = buildBizjet(C, M); break;
    case 'hondajet':       inner = buildHondajet(C, M); break;
    case 'solar':          inner = buildSolar(C, M); break;
    default:               inner = buildAirliner(C, M);
  }
  inner.rotation.y = -Math.PI / 2;
  const wrapper = new THREE.Group();
  wrapper.add(inner);
  const realScale = getRealScale(type);
  wrapper.scale.setScalar(realScale);
  wrapper.userData.realLength = getRealLength(type);
  // Boden-Offset: wie weit das Flugzeug unterhalb seiner Origin reicht (Räder)
  const box = new THREE.Box3().setFromObject(wrapper);
  wrapper.userData.groundOffset = Math.max(0, -box.min.y);
  return wrapper;
}

// ============================================================
// ARCHETYPE: AIRLINER (Jets unter Flügel)
// ============================================================

function buildAirliner(C, M) {
  const inner = new THREE.Group();
  const B = C.body;
  const halfLen = B.len / 2;

  addFuselage(inner, C, M);
  addCockpitWindows(inner, C, M);
  addPassengerWindows(inner, C, M);

  // ── FLÜGEL ──
  const W = C.wing;
  addWings(inner, W, C.winglet, M);

  // ── TRIEBWERKE ──
  const E = C.engine;
  const positions = [];
  if (E.count === 4 && E.positions) {
    for (const [offX, offZ] of E.positions) {
      positions.push([W.pos + offX, E.y, offZ]);
      positions.push([W.pos + offX, E.y, -offZ]);
    }
  } else if (E.count === 2) {
    positions.push([W.pos, E.y, E.z], [W.pos, E.y, -E.z]);
  }
  for (const [ex, ey, ez] of positions) addJetEngine(inner, ex, ey, ez, E, W, M);

  addConventionalTail(inner, C, M);
  addAirlinerGear(inner, C, M);
  return inner;
}

// ============================================================
// ARCHETYPE: REAR-TWIN (Triebwerke am Heckrumpf, T-Leitwerk)
// ============================================================

function buildRearTwin(C, M) {
  const inner = new THREE.Group();
  addFuselage(inner, C, M);
  addCockpitWindows(inner, C, M);
  addPassengerWindows(inner, C, M);
  addWings(inner, C.wing, C.winglet, M);

  const E = C.engine;
  const B = C.body;
  const rearX = -B.len * 0.35;
  for (const s of [1, -1]) addJetEngine(inner, rearX, E.y, s * E.z, E, C.wing, M, { rearMount: true });

  addTail(inner, C, M);
  addAirlinerGear(inner, C, M);
  return inner;
}

// ============================================================
// ARCHETYPE: TRIJET (2 Flügel + 1 Heck)
// ============================================================

function buildTrijet(C, M) {
  const inner = new THREE.Group();
  addFuselage(inner, C, M);
  addCockpitWindows(inner, C, M);
  addPassengerWindows(inner, C, M);
  addWings(inner, C.wing, C.winglet, M);

  const E = C.engine;
  const W = C.wing;
  const B = C.body;
  // Zwei Flügel-Triebwerke (wie Airliner)
  if (E.wingZ) {
    for (const s of [1, -1]) addJetEngine(inner, W.pos, E.y - 0.3, s * E.wingZ, E, W, M);
  } else {
    const rearX = -B.len * 0.35;
    for (const s of [1, -1]) addJetEngine(inner, rearX, E.y, s * E.z, E, W, M, { rearMount: true });
  }
  // Zentral-Heck-Triebwerk (S-Duct für 727)
  const T = C.tail;
  const cEng = new THREE.Group();
  const nacGeo = new THREE.CylinderGeometry(E.r * 1.05, E.r * 0.9, E.len * 1.1, 16);
  nacGeo.rotateZ(Math.PI / 2);
  cEng.add(new THREE.Mesh(nacGeo, M.chrome));
  const fan = createFan(E.r, 18, M.chrome);
  fan.position.x = E.len * 0.55;
  cEng.add(fan);
  const exh = new THREE.Mesh(new THREE.CylinderGeometry(E.r * 0.6, E.r * 0.65, 0.2, 16), M.dark);
  exh.geometry.rotateZ(Math.PI / 2);
  exh.position.x = -E.len * 0.55;
  cEng.add(exh);
  cEng.position.set(-B.len * 0.5, B.r * 1.1, 0);
  inner.add(cEng);

  addTail(inner, C, M);
  addAirlinerGear(inner, C, M);
  return inner;
}

// ============================================================
// ARCHETYPE: QUAD-REAR (Il-62 etc.)
// ============================================================

function buildQuadRear(C, M) {
  const inner = new THREE.Group();
  addFuselage(inner, C, M);
  addCockpitWindows(inner, C, M);
  addPassengerWindows(inner, C, M);
  addWings(inner, C.wing, C.winglet, M);

  const E = C.engine;
  const B = C.body;
  const baseX = -B.len * 0.35;
  // 4 Triebwerke paarweise am Heck
  for (const [offX, offZ] of E.positions) {
    for (const s of [1, -1]) addJetEngine(inner, baseX + offX, E.y, s * offZ, E, C.wing, M, { rearMount: true });
  }

  addTail(inner, C, M);
  addAirlinerGear(inner, C, M);
  return inner;
}

// ============================================================
// ARCHETYPE: HIGH-WING JET (BAe 146)
// ============================================================

function buildHighwingJet(C, M) {
  const inner = new THREE.Group();
  addFuselage(inner, C, M);
  addCockpitWindows(inner, C, M);
  addPassengerWindows(inner, C, M);
  addWings(inner, C.wing, null, M);

  const E = C.engine;
  const W = C.wing;
  if (E.positions) {
    for (const [offX, offZ] of E.positions) {
      for (const s of [1, -1]) addJetEngine(inner, W.pos + offX, E.y, s * offZ, E, W, M);
    }
  }
  addTail(inner, C, M);
  addAirlinerGear(inner, C, M);
  return inner;
}

// ============================================================
// ARCHETYPE: DELTA (Concorde, Tu-144)
// ============================================================

function buildDelta(C, M) {
  const inner = new THREE.Group();
  const B = C.body;

  // Schlanker, ovaler Rumpf
  const bodyGeo = new THREE.CylinderGeometry(B.r, B.r * 0.8, B.len, 18, 1, false);
  bodyGeo.rotateZ(Math.PI / 2);
  inner.add(new THREE.Mesh(bodyGeo, M.white));

  // Lange spitze Nase (ggf. „droop")
  const noseGeo = new THREE.ConeGeometry(B.r * 0.8, B.len * B.noseTaper, 18);
  noseGeo.rotateZ(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, M.white);
  nose.position.x = B.len / 2 + B.len * B.noseTaper * 0.48;
  inner.add(nose);

  // Heck
  const tailConeGeo = new THREE.ConeGeometry(B.r * 0.8, B.len * 0.2, 16);
  tailConeGeo.rotateZ(Math.PI / 2);
  const tailCone = new THREE.Mesh(tailConeGeo, M.white);
  tailCone.position.x = -B.len / 2 - B.len * 0.1;
  inner.add(tailCone);

  // Cockpitfenster (klein, weit vorn)
  const cw = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, B.r * 0.9), M.glass);
  cw.position.set(B.len / 2 + B.len * B.noseTaper * 0.2, B.r * 0.6, 0);
  inner.add(cw);

  // ── DELTA-FLÜGEL ──
  const W = C.wing;
  for (const side of [1, -1]) {
    const deltaGeo = createDeltaWing(W.rootChord, W.span / 2, W.sweep, W.ogee);
    const w = new THREE.Mesh(deltaGeo, M.white);
    w.position.set(-W.rootChord * 0.1, W.y, 0);
    if (side === -1) w.scale.z = -1;
    inner.add(w);
  }

  // Seitenleitwerk
  const T = C.tail;
  const vf = new THREE.Mesh(createFinGeo(T.vH, T.vChord), M.tailMat);
  vf.position.set(-B.len * 0.35, B.r, 0);
  inner.add(vf);

  // Canards (Tu-144)
  if (B.canard) {
    for (const side of [1, -1]) {
      const cGeo = createWingGeo(1.5, 1, 0.4, 0.5);
      const c = new THREE.Mesh(cGeo, M.white);
      c.position.set(B.len * 0.25, B.r * 0.8, 0);
      if (side === -1) c.scale.z = -1;
      inner.add(c);
    }
  }

  // 4 Jet-Triebwerke paarweise unter dem Flügel
  const E = C.engine;
  for (const side of [1, -1]) {
    for (const zOff of [E.z * 0.7, E.z * 1.6]) {
      addJetEngine(inner, -W.rootChord * 0.25, E.y, side * zOff, { ...E, len: E.len }, { y: W.y }, M);
    }
  }

  // Fahrwerk
  const G = C.gear;
  addGearAssembly(inner, G.noseX, -B.r - 0.15, 0, 0.14, 0.9, M.chrome, M.rubber);
  for (const s of [1, -1]) addGearAssembly(inner, G.mainX, -B.r - 0.15, s * G.mainZ, 0.2, 1.2, M.chrome, M.rubber);
  return inner;
}

// ============================================================
// ARCHETYPE: PROP-SINGLE (Cessna 172, SR22, Super Cub etc.)
// ============================================================

function buildPropSingle(C, M) {
  const inner = new THREE.Group();
  const B = C.body;
  const halfLen = B.len / 2;

  // Schlanker Rumpf
  const bodyMat = B.aerobatic ? M.accentMat : M.white;
  const bodyGeo = new THREE.CylinderGeometry(B.r, B.r * 0.6, B.len, 14);
  bodyGeo.rotateZ(Math.PI / 2);
  inner.add(new THREE.Mesh(bodyGeo, bodyMat));

  // Nase: Propeller-Spinner + Motorhaube
  const cowlGeo = new THREE.CylinderGeometry(B.r, B.r * 0.6, B.len * 0.22, 14);
  cowlGeo.rotateZ(Math.PI / 2);
  const cowl = new THREE.Mesh(cowlGeo, M.tailMat);
  cowl.position.x = halfLen + B.len * 0.11;
  inner.add(cowl);
  const spinGeo = new THREE.ConeGeometry(B.r * 0.3, 0.3, 14);
  spinGeo.rotateZ(-Math.PI / 2);
  const spin = new THREE.Mesh(spinGeo, M.chrome);
  spin.position.x = halfLen + B.len * 0.22 + 0.15;
  inner.add(spin);

  // Propeller
  const prop = createPropeller(C.engine.bladeCount || 2, B.r * 2, 0.08, M.dark);
  prop.position.x = halfLen + B.len * 0.22 + 0.2;
  inner.add(prop);

  // Cockpit / Kabinenfenster
  const cabGeo = new THREE.BoxGeometry(B.len * 0.35, B.r * 0.7, B.r * 1.8);
  const cab = new THREE.Mesh(cabGeo, M.glass);
  cab.position.set(halfLen * 0.1, B.r * 0.55, 0);
  inner.add(cab);

  // Flügel (hoch, tief oder mittig)
  const W = C.wing;
  addWings(inner, W, null, M);
  if (W.strutted) addWingStruts(inner, W, B, M);

  // Leitwerk
  addTail(inner, C, M);

  // Fahrwerk (feststehend oder Spornrad)
  addLightGear(inner, C, M);
  return inner;
}

// ============================================================
// ARCHETYPE: PROP-TWIN (DC-3, Beechcraft etc.)
// ============================================================

function buildPropTwin(C, M) {
  const inner = new THREE.Group();
  const B = C.body;
  const halfLen = B.len / 2;

  const bodyGeo = new THREE.CylinderGeometry(B.r, B.r * 0.6, B.len, 18);
  bodyGeo.rotateZ(Math.PI / 2);
  inner.add(new THREE.Mesh(bodyGeo, M.white));

  // Nase (abgerundet)
  const noseGeo = new THREE.SphereGeometry(B.r, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  noseGeo.rotateZ(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, M.white);
  nose.position.x = halfLen;
  inner.add(nose);

  // Heck
  const tailGeo = new THREE.ConeGeometry(B.r, B.len * 0.3, 14);
  tailGeo.rotateZ(Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, M.white);
  tail.position.x = -halfLen - B.len * 0.15;
  inner.add(tail);

  // Kabinenfenster (Streifen)
  const winGeo = new THREE.BoxGeometry(B.len * 0.55, 0.08, B.r * 2.01);
  const win = new THREE.Mesh(winGeo, M.glass);
  win.position.y = B.r * 0.45;
  inner.add(win);

  // Flügel
  const W = C.wing;
  addWings(inner, W, null, M);

  // Zwei Radial-Propellertriebwerke
  const E = C.engine;
  for (const side of [1, -1]) {
    addPropellerEngine(inner, W.pos + E.len * 0.3, W.y + E.y, side * E.z, E, M);
  }

  // Leitwerk
  addTail(inner, C, M);

  // Fahrwerk
  if (B.taildragger) addTaildraggerGear(inner, C, M);
  else addAirlinerGear(inner, C, M);
  return inner;
}

// ============================================================
// ARCHETYPE: PROP-QUAD (Lockheed Constellation)
// ============================================================

function buildPropQuad(C, M) {
  const inner = new THREE.Group();
  const B = C.body;
  const halfLen = B.len / 2;

  // Geschwungener Rumpf (gekrümmte Linie der Constellation)
  const bodyGeo = new THREE.CylinderGeometry(B.r, B.r * 0.55, B.len, 20);
  bodyGeo.rotateZ(Math.PI / 2);
  inner.add(new THREE.Mesh(bodyGeo, M.white));

  const noseGeo = new THREE.ConeGeometry(B.r, B.len * B.noseTaper, 16);
  noseGeo.rotateZ(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, M.white);
  nose.position.x = halfLen + B.len * B.noseTaper * 0.48;
  inner.add(nose);

  const tailGeo = new THREE.ConeGeometry(B.r * 0.8, B.len * 0.3, 14);
  tailGeo.rotateZ(Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, M.white);
  tail.position.x = -halfLen - B.len * 0.15;
  inner.add(tail);

  addPassengerWindows(inner, C, M);
  addCockpitWindows(inner, C, M);

  // Flügel
  const W = C.wing;
  addWings(inner, W, null, M);

  // 4 Radial-Triebwerke
  const E = C.engine;
  for (const [offX, offZ] of E.positions) {
    for (const side of [1, -1]) {
      addPropellerEngine(inner, W.pos + offX, W.y - 0.1, side * offZ, E, M);
    }
  }

  // Drei-Finnen-Leitwerk (Constellation-Signatur)
  const T = C.tail;
  const tailX = -halfLen - B.len * 0.2;
  // Höhenleitwerk
  for (const side of [1, -1]) {
    const hs = new THREE.Mesh(createWingGeo(T.hSpan / 2, T.hChord, T.hChord * 0.4, 0.5), M.white);
    hs.position.set(tailX, B.r * 0.1, 0);
    if (side === -1) hs.scale.z = -1;
    inner.add(hs);
  }
  // Drei Finnen
  for (const z of [-T.hSpan * 0.48, 0, T.hSpan * 0.48]) {
    const vf = new THREE.Mesh(createFinGeo(T.vH, T.vChord), z === 0 ? M.tailMat : M.white);
    vf.position.set(tailX, B.r * 0.1, z);
    inner.add(vf);
  }

  // Fahrwerk Spornrad
  if (B.taildragger) addTaildraggerGear(inner, C, M);
  else addAirlinerGear(inner, C, M);
  return inner;
}

// ============================================================
// ARCHETYPE: TRIMOTOR-PROP (Ju 52, Ford Trimotor)
// ============================================================

function buildTrimotorProp(C, M) {
  const inner = new THREE.Group();
  const B = C.body;
  const halfLen = B.len / 2;
  const fuselageMat = B.corrugated ? M.corrugated : M.white;

  // Rumpf (ggf. Wellblech optisch durch Ribben-Streifen angedeutet)
  const bodyGeo = new THREE.CylinderGeometry(B.r, B.r * 0.55, B.len, 16);
  bodyGeo.rotateZ(Math.PI / 2);
  inner.add(new THREE.Mesh(bodyGeo, fuselageMat));
  if (B.corrugated) addCorrugationRings(inner, B, M);

  // Nase
  const noseGeo = new THREE.CylinderGeometry(B.r * 0.6, B.r * 0.45, B.len * B.noseTaper, 12);
  noseGeo.rotateZ(Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, M.dark);
  nose.position.x = halfLen + B.len * B.noseTaper * 0.5;
  inner.add(nose);

  // Heck
  const tailGeo = new THREE.ConeGeometry(B.r * 0.7, B.len * 0.25, 12);
  tailGeo.rotateZ(Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, fuselageMat);
  tail.position.x = -halfLen - B.len * 0.12;
  inner.add(tail);

  // Hoher Flügel
  const W = C.wing;
  addWings(inner, W, null, M, B.corrugated ? M.corrugated : null);

  // Drei Sternmotoren
  const E = C.engine;
  addPropellerEngine(inner, halfLen + B.len * B.noseTaper * 0.5 + 0.3, 0, 0, E, M, { nose: true });
  for (const side of [1, -1]) {
    addPropellerEngine(inner, W.pos + 0.2, W.y - 0.4, side * E.z, E, M);
  }

  addTail(inner, C, M);
  addTaildraggerGear(inner, C, M);
  return inner;
}

// ============================================================
// ARCHETYPE: TURBOPROP-WING (ATR, Dash 8)
// ============================================================

function buildTurbopropWing(C, M) {
  const inner = new THREE.Group();
  const B = C.body;
  const halfLen = B.len / 2;

  const bodyGeo = new THREE.CylinderGeometry(B.r, B.r * 0.55, B.len, 18);
  bodyGeo.rotateZ(Math.PI / 2);
  inner.add(new THREE.Mesh(bodyGeo, M.white));
  const noseGeo = new THREE.ConeGeometry(B.r, B.len * B.noseTaper, 14);
  noseGeo.rotateZ(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, M.white);
  nose.position.x = halfLen + B.len * B.noseTaper * 0.48;
  inner.add(nose);
  const tailGeo = new THREE.ConeGeometry(B.r * 0.8, B.len * 0.28, 14);
  tailGeo.rotateZ(Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, M.white);
  tail.position.x = -halfLen - B.len * 0.14;
  inner.add(tail);

  addCockpitWindows(inner, C, M);
  addPassengerWindows(inner, C, M);

  const W = C.wing;
  addWings(inner, W, null, M);

  // Turboprop-Gondeln mit großen sichtbaren Propellern
  const E = C.engine;
  for (const side of [1, -1]) {
    addPropellerEngine(inner, W.pos + 0.3, W.y, side * E.z, E, M, { turboprop: true });
  }

  addTail(inner, C, M);
  // Rumpfmontiertes Hauptfahrwerk
  addAirlinerGear(inner, C, M);
  return inner;
}

// ============================================================
// ARCHETYPE: BIPLANE (Pitts, An-2)
// ============================================================

function buildBiplane(C, M) {
  const inner = new THREE.Group();
  const B = C.body;
  const halfLen = B.len / 2;

  // Schmaler Rumpf (Stoff/Holz-Look)
  const bodyGeo = new THREE.CylinderGeometry(B.r, B.r * 0.45, B.len, 12);
  bodyGeo.rotateZ(Math.PI / 2);
  inner.add(new THREE.Mesh(bodyGeo, M.tailMat));
  // Nase
  const cowlGeo = new THREE.CylinderGeometry(B.r * 1.1, B.r, B.len * 0.15, 14);
  cowlGeo.rotateZ(Math.PI / 2);
  const cowl = new THREE.Mesh(cowlGeo, M.dark);
  cowl.position.x = halfLen + B.len * 0.07;
  inner.add(cowl);

  // Cockpit offen
  const openPit = new THREE.Mesh(new THREE.BoxGeometry(B.len * 0.2, 0.1, B.r * 1.2), M.dark);
  openPit.position.set(halfLen * 0.2, B.r * 0.9, 0);
  inner.add(openPit);

  // Propeller
  const prop = createPropeller(C.engine.bladeCount || 2, B.r * 2, 0.08, M.dark);
  prop.position.x = halfLen + B.len * 0.16;
  inner.add(prop);

  // Zwei Flügel
  const W = C.wing;
  const upperY = W.y + W.gap * 0.5;
  const lowerY = W.y - W.gap * 0.5;
  const staggerX = W.stagger;
  for (const side of [1, -1]) {
    // Oberer Flügel
    const upGeo = createWingGeo(W.upperSpan / 2, W.upperRoot, W.upperRoot * 0.9, 0);
    const up = new THREE.Mesh(upGeo, M.white);
    up.position.set(staggerX, upperY, 0);
    if (side === -1) up.scale.z = -1;
    inner.add(up);
    // Unterer Flügel
    const loGeo = createWingGeo(W.lowerSpan / 2, W.lowerRoot, W.lowerRoot * 0.9, 0);
    const lo = new THREE.Mesh(loGeo, M.white);
    lo.position.set(-staggerX * 0.5, lowerY, 0);
    if (side === -1) lo.scale.z = -1;
    inner.add(lo);
  }
  // Streben zwischen Flügeln
  for (const side of [1, -1]) {
    for (const zFrac of [0.35, 0.75]) {
      const z = side * (W.upperSpan / 2) * zFrac;
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, W.gap, 6), M.chrome);
      strut.position.set(staggerX * 0.2, W.y, z);
      inner.add(strut);
    }
  }
  // N-Streben Mitte
  for (const side of [1, -1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, W.gap, 6), M.chrome);
    strut.position.set(staggerX * 0.2, W.y, side * 0.3);
    inner.add(strut);
  }

  addTail(inner, C, M);
  addTaildraggerGear(inner, C, M);
  return inner;
}

// ============================================================
// ARCHETYPE: GLIDER (Segelflugzeug)
// ============================================================

function buildGlider(C, M) {
  const inner = new THREE.Group();
  const B = C.body;
  const halfLen = B.len / 2;

  // Sehr schlanker, tropfenförmiger Rumpf
  const bodyGeo = new THREE.CylinderGeometry(B.r, B.r * 0.25, B.len, 18);
  bodyGeo.rotateZ(Math.PI / 2);
  inner.add(new THREE.Mesh(bodyGeo, M.white));

  // Abgerundete Nase (halbe Kugel)
  const noseGeo = new THREE.SphereGeometry(B.r, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  noseGeo.rotateZ(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, M.white);
  nose.position.x = halfLen;
  inner.add(nose);

  // Großes Cockpit-Glas (Kanzel)
  const canopyGeo = new THREE.SphereGeometry(B.r * 0.95, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const canopy = new THREE.Mesh(canopyGeo, M.glass);
  canopy.position.set(halfLen * 0.3, B.r * 0.3, 0);
  canopy.scale.set(2.2, 1, 1);
  inner.add(canopy);

  // Dünnes Heck
  const tailGeo = new THREE.ConeGeometry(B.r * 0.3, B.len * 0.3, 12);
  tailGeo.rotateZ(Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, M.white);
  tail.position.x = -halfLen - B.len * 0.15;
  inner.add(tail);

  // Schmale hohe Flügel (sehr hohes Streckungsverhältnis)
  const W = C.wing;
  for (const side of [1, -1]) {
    const g = createWingGeo(W.span / 2, W.root, W.tip, W.sweep, { thin: true });
    const w = new THREE.Mesh(g, M.white);
    w.position.set(W.pos, W.y, 0);
    if (side === -1) w.scale.z = -1;
    inner.add(w);
  }

  addTail(inner, C, M);
  // Zentrales Bugrad
  addGearAssembly(inner, 0, -B.r - 0.1, 0, 0.1, 0.4, M.chrome, M.rubber);
  // Heckkufe
  const skid = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.08), M.dark);
  skid.position.set(-halfLen - B.len * 0.2, -B.r * 0.5, 0);
  inner.add(skid);
  return inner;
}

// ============================================================
// ARCHETYPE: AMPHIBIAN (CL-415, ICON A5)
// ============================================================

function buildAmphibian(C, M) {
  const inner = new THREE.Group();
  const B = C.body;
  const halfLen = B.len / 2;

  // Bootsrumpf (unten flach, oben rund)
  const hullGeo = new THREE.BoxGeometry(B.len, B.r * 0.9, B.r * 1.6);
  const hull = new THREE.Mesh(hullGeo, M.white);
  hull.position.y = -B.r * 0.2;
  inner.add(hull);
  // Oberer Teil (zylindrisch)
  const topGeo = new THREE.CylinderGeometry(B.r * 0.7, B.r * 0.7, B.len * 0.9, 16, 1, false, 0, Math.PI);
  topGeo.rotateZ(Math.PI / 2);
  topGeo.rotateX(Math.PI);
  const top = new THREE.Mesh(topGeo, M.white);
  top.position.y = B.r * 0.3;
  inner.add(top);

  // Abgerundete Nase
  const noseGeo = new THREE.SphereGeometry(B.r * 0.8, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  noseGeo.rotateZ(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, M.white);
  nose.position.set(halfLen, 0, 0);
  inner.add(nose);

  addCockpitWindows(inner, C, M);

  // Heck
  const tailGeo = new THREE.ConeGeometry(B.r * 0.6, B.len * 0.25, 12);
  tailGeo.rotateZ(Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, M.white);
  tail.position.x = -halfLen - B.len * 0.12;
  inner.add(tail);

  // Hoher Flügel
  const W = C.wing;
  addWings(inner, W, null, M);
  if (W.strutted) addWingStruts(inner, W, B, M);

  // Triebwerke (Prop)
  const E = C.engine;
  if (E.pusher) {
    // Pusher-Propeller hinter Cockpit
    addPropellerEngine(inner, -halfLen * 0.3, W.y + 0.3, 0, E, M, { pusher: true });
  } else {
    for (const side of [1, -1]) {
      addPropellerEngine(inner, W.pos + 0.3, W.y + E.y - W.y, side * E.z, E, M, { turboprop: true });
    }
  }

  addTail(inner, C, M);

  // Schwimmer/Stabilisatoren am Flügel
  for (const side of [1, -1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.3), M.white);
    f.position.set(W.pos + 0.1, W.y - 0.2, side * W.span * 0.4);
    inner.add(f);
  }
  // Einfaches Fahrwerk für Landungen
  if (C.gear.retractable || C.gear.noseX) {
    addGearAssembly(inner, C.gear.noseX, -B.r * 0.7, 0, 0.12, 0.4, M.chrome, M.rubber);
    for (const s of [1, -1]) addGearAssembly(inner, C.gear.mainX, -B.r * 0.7, s * C.gear.mainZ, 0.14, 0.4, M.chrome, M.rubber);
  }
  return inner;
}

// ============================================================
// ARCHETYPE: CANARD (VariEze)
// ============================================================

function buildCanard(C, M) {
  const inner = new THREE.Group();
  const B = C.body;
  const halfLen = B.len / 2;

  // Sehr schlanker Rumpf
  const bodyGeo = new THREE.CylinderGeometry(B.r, B.r * 0.4, B.len, 14);
  bodyGeo.rotateZ(Math.PI / 2);
  inner.add(new THREE.Mesh(bodyGeo, M.white));
  // Nase spitz
  const noseGeo = new THREE.ConeGeometry(B.r, B.len * B.noseTaper, 14);
  noseGeo.rotateZ(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, M.white);
  nose.position.x = halfLen + B.len * B.noseTaper * 0.48;
  inner.add(nose);

  // Bubble-Canopy
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(B.r, 14, 10), M.glass);
  canopy.position.set(halfLen * 0.3, B.r * 0.6, 0);
  canopy.scale.set(1.6, 0.6, 0.9);
  inner.add(canopy);

  // Hauptflügel (hinten, gepfeilt)
  const W = C.wing;
  for (const side of [1, -1]) {
    const g = createWingGeo(W.span / 2, W.root, W.tip, W.sweep);
    const w = new THREE.Mesh(g, M.white);
    w.position.set(W.pos, W.y, 0);
    if (side === -1) w.scale.z = -1;
    inner.add(w);
  }

  // Canards (vorne, klein)
  const CN = C.canard;
  for (const side of [1, -1]) {
    const g = createWingGeo(CN.span / 2, CN.root, CN.tip, 0);
    const c = new THREE.Mesh(g, M.white);
    c.position.set(CN.pos, CN.y, 0);
    if (side === -1) c.scale.z = -1;
    inner.add(c);
  }

  // Winglet-Finnen an Flügelspitzen (kein klassisches Heckleitwerk)
  if (C.fins) {
    for (const side of [1, -1]) {
      const f = new THREE.Mesh(createFinGeo(C.fins.h, C.fins.chord), M.tailMat);
      f.position.set(W.pos + W.sweep, W.y, side * (W.span / 2));
      inner.add(f);
    }
  }

  // Pusher-Propeller am Heck
  const E = C.engine;
  const spin = new THREE.Mesh(new THREE.ConeGeometry(B.r * 0.4, 0.3, 12), M.chrome);
  spin.geometry.rotateZ(Math.PI / 2);
  spin.position.x = -halfLen - 0.2;
  inner.add(spin);
  const prop = createPropeller(E.bladeCount || 2, B.r * 2.5, 0.08, M.dark);
  prop.position.x = -halfLen - 0.25;
  prop.userData.pusher = true;
  inner.add(prop);

  // Einfaches Fahrwerk
  addGearAssembly(inner, C.gear.noseX, -B.r - 0.1, 0, 0.08, 0.35, M.chrome, M.rubber);
  for (const s of [1, -1]) addGearAssembly(inner, C.gear.mainX, -B.r - 0.1, s * C.gear.mainZ, 0.1, 0.35, M.chrome, M.rubber);
  return inner;
}

// ============================================================
// ARCHETYPE: BIZJET (Gulfstream, Global, Citation)
// ============================================================

function buildBizjet(C, M) {
  const inner = new THREE.Group();
  addFuselage(inner, C, M);
  addCockpitWindows(inner, C, M);
  // Bizjet-Fenster: kleiner/runder, als Streifen okay
  addPassengerWindows(inner, C, M);
  addWings(inner, C.wing, C.winglet, M);

  const E = C.engine;
  const B = C.body;
  const rearX = -B.len * 0.35;
  for (const s of [1, -1]) addJetEngine(inner, rearX, E.y, s * E.z, E, C.wing, M, { rearMount: true });

  addTail(inner, C, M);
  addAirlinerGear(inner, C, M);
  return inner;
}

// ============================================================
// ARCHETYPE: HONDAJET (Triebwerke ÜBER dem Flügel)
// ============================================================

function buildHondajet(C, M) {
  const inner = new THREE.Group();
  addFuselage(inner, C, M);
  addCockpitWindows(inner, C, M);
  addPassengerWindows(inner, C, M);
  addWings(inner, C.wing, null, M);

  const E = C.engine;
  const W = C.wing;
  for (const s of [1, -1]) {
    addJetEngine(inner, W.pos, W.y + 0.4, s * E.z, E, W, M, { overWing: true });
  }
  addTail(inner, C, M);
  addAirlinerGear(inner, C, M);
  return inner;
}

// ============================================================
// ARCHETYPE: SOLAR (Solar Impulse — sehr weiter Flügel, leichte Props)
// ============================================================

function buildSolar(C, M) {
  const inner = new THREE.Group();
  const B = C.body;
  const halfLen = B.len / 2;

  const bodyGeo = new THREE.CylinderGeometry(B.r, B.r * 0.35, B.len, 14);
  bodyGeo.rotateZ(Math.PI / 2);
  inner.add(new THREE.Mesh(bodyGeo, M.white));
  const noseGeo = new THREE.ConeGeometry(B.r, B.len * B.noseTaper, 14);
  noseGeo.rotateZ(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, M.white);
  nose.position.x = halfLen + B.len * B.noseTaper * 0.48;
  inner.add(nose);
  const tailGeo = new THREE.ConeGeometry(B.r * 0.5, B.len * 0.25, 12);
  tailGeo.rotateZ(Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, M.white);
  tail.position.x = -halfLen - B.len * 0.12;
  inner.add(tail);

  // Extrem breite Solar-Fläche
  const W = C.wing;
  for (const side of [1, -1]) {
    const g = createWingGeo(W.span / 2, W.root, W.tip, W.sweep, { thin: true });
    const w = new THREE.Mesh(g, M.dark); // Solarzellen dunkel
    w.position.set(W.pos, W.y, 0);
    if (side === -1) w.scale.z = -1;
    inner.add(w);
  }

  // 4 kleine Props
  const E = C.engine;
  for (const [, offZ] of E.positions) {
    for (const side of [1, -1]) {
      addPropellerEngine(inner, W.pos + 0.3, W.y - 0.3, side * offZ, E, M, { tiny: true });
    }
  }
  addTail(inner, C, M);
  addAirlinerGear(inner, C, M);
  return inner;
}

// ============================================================
// RUMPF / FENSTER / FLÜGEL — gemeinsame Helfer
// ============================================================

function addFuselage(group, C, M) {
  const B = C.body;
  const halfLen = B.len / 2;
  // Geloftetes Profil: Nasenradius → Vollradius → Heck (Lathe rotiert um Y-Achse)
  const noseL = B.len * (B.noseTaper || 0.35);
  const midL = B.len;                         // Zylinder-Länge bleibt B.len
  const tailL = B.len * 0.25;
  const pts = [];
  const push = (x, r) => pts.push(new THREE.Vector2(Math.max(r, 0.001), x));
  // Nase (smooth curve)
  const noseSteps = 8;
  for (let i = 0; i <= noseSteps; i++) {
    const t = i / noseSteps;
    const r = B.r * Math.sin(t * Math.PI * 0.5) * (0.15 + 0.85 * t);
    push(-halfLen - noseL + t * noseL, r);
  }
  // Zylindrischer Mittelteil
  push(-halfLen + 0.01, B.r);
  push(halfLen - 0.01, B.r);
  // Heck (smooth taper)
  const tailSteps = 10;
  for (let i = 1; i <= tailSteps; i++) {
    const t = i / tailSteps;
    const r = B.r * (1 - t) * (1 - t * 0.6);
    push(halfLen + t * tailL, r);
  }
  const latheGeo = new THREE.LatheGeometry(pts, 36);
  latheGeo.rotateZ(-Math.PI / 2);
  const bodyMesh = new THREE.Mesh(latheGeo, M.white);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // Belly: untere Hälfte in Livery-Farbe (leicht nach innen gesetzt, damit keine Z-Fighting)
  const bellyGeo = new THREE.LatheGeometry(pts, 36, 0, Math.PI);
  bellyGeo.rotateZ(-Math.PI / 2);
  bellyGeo.rotateX(Math.PI);
  const belly = new THREE.Mesh(bellyGeo, M.bellyMat);
  belly.scale.setScalar(0.998);
  belly.castShadow = true;
  belly.receiveShadow = true;
  group.add(belly);

  // Zurück-Kompatibilität für alten Code (nicht mehr benutzt, aber z. B. Buckel)
  if (B.hump) {
    const humpLen = B.len * 0.45;
    const humpGeo = new THREE.CylinderGeometry(B.r * 0.55, B.r * 0.55, humpLen, 16, 1, false, 0, Math.PI);
    humpGeo.rotateZ(Math.PI / 2);
    humpGeo.rotateX(Math.PI);
    const hump = new THREE.Mesh(humpGeo, M.white);
    hump.position.set(halfLen * 0.35, B.r * 0.7, 0);
    group.add(hump);
    const humpNoseGeo = new THREE.SphereGeometry(B.r * 0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    humpNoseGeo.rotateZ(-Math.PI / 2);
    const humpNose = new THREE.Mesh(humpNoseGeo, M.white);
    humpNose.position.set(halfLen * 0.35 + humpLen / 2, B.r * 0.7, 0);
    group.add(humpNose);
  }
  if (B.doubleDeck) {
    const ddGeo = new THREE.CylinderGeometry(B.r * 0.92, B.r * 0.92, B.len * 0.88, 20, 1, false, 0, Math.PI);
    ddGeo.rotateZ(Math.PI / 2);
    ddGeo.rotateX(Math.PI);
    const dd = new THREE.Mesh(ddGeo, M.white);
    dd.position.y = B.r * 0.15;
    group.add(dd);
  }

  // Weißes Heck-Positionslicht
  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9,
    metalness: 0.1, roughness: 0.3,
  });
  const tailLight = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), tailLightMat);
  tailLight.position.set(-halfLen - tailL * 0.95, 0, 0);
  group.add(tailLight);

  // Anti-Collision-Beacon (rot, Rücken + Bauch mittig)
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff1010, emissive: 0xff2020, emissiveIntensity: 1.0,
    metalness: 0.1, roughness: 0.4,
  });
  const beaconTop = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), beaconMat);
  beaconTop.position.set(halfLen * 0.1, B.r * 1.02, 0);
  group.add(beaconTop);
  const beaconBot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), beaconMat);
  beaconBot.position.set(halfLen * 0.1, -B.r * 1.02, 0);
  group.add(beaconBot);

  // Pitot-Tubes seitlich an der Nase
  for (const side of [0.9, -0.9]) {
    const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.3, 6), M.chrome);
    pitot.rotation.z = Math.PI / 2;
    pitot.position.set(halfLen + noseL * 0.55, -B.r * 0.05, side * B.r * 0.6);
    group.add(pitot);
  }
}

function addCockpitWindows(group, C, M) {
  const B = C.body;
  const halfLen = B.len / 2;
  const noseL = B.len * (B.noseTaper || 0.35);
  // Gewölbte Cockpit-Verglasung: Torus-Ausschnitt über Rumpf gespannt
  const cockpitX = halfLen - B.len * 0.05;
  // Schräg abfallende Windschutzscheibe (flache Scheibe, leicht gewölbt)
  const wsGeo = new THREE.SphereGeometry(B.r * 1.02, 20, 10, Math.PI * 0.75, Math.PI * 0.5, Math.PI * 0.25, Math.PI * 0.3);
  const ws = new THREE.Mesh(wsGeo, M.cockpit);
  ws.position.set(cockpitX + noseL * 0.25, 0, 0);
  ws.rotation.y = Math.PI;
  group.add(ws);
  // Rahmen-Streifen als dunkle Linie
  const frameGeo = new THREE.TorusGeometry(B.r * 1.01, 0.015, 6, 24, Math.PI);
  frameGeo.rotateY(Math.PI / 2);
  const frame = new THREE.Mesh(frameGeo, M.dark);
  frame.position.set(cockpitX + noseL * 0.2, 0, 0);
  frame.rotation.z = -0.15;
  group.add(frame);
}

function addPassengerWindows(group, C, M) {
  const B = C.body;
  const halfLen = B.len / 2;
  // Reihe echter runder Fenster (kleine Scheiben in Fuselage eingelassen)
  const windowCount = Math.floor(B.len * 2.5);
  const startX = -halfLen * 0.75;
  const endX = halfLen * 0.55;
  const spacing = (endX - startX) / windowCount;
  const winRadius = Math.min(0.055, B.r * 0.08);
  for (let side of [1, -1]) {
    const angle = side * 0.38; // leicht oberhalb der Mittellinie
    for (let i = 0; i < windowCount; i++) {
      const x = startX + i * spacing;
      const y = Math.sin(angle) * B.r;
      const z = side * Math.cos(angle) * B.r * 1.003;
      const winGeo = new THREE.CircleGeometry(winRadius, 10);
      const win = new THREE.Mesh(winGeo, M.glass);
      win.position.set(x, y, z);
      win.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(win);
    }
    // Zweite Deck-Reihe beim A380
    if (B.doubleDeck) {
      const angle2 = side * 0.9;
      for (let i = 0; i < windowCount * 0.8; i++) {
        const x = startX + i * spacing * 1.1;
        const y = Math.sin(angle2) * B.r;
        const z = side * Math.cos(angle2) * B.r * 1.003;
        const win = new THREE.Mesh(new THREE.CircleGeometry(winRadius, 10), M.glass);
        win.position.set(x, y, z);
        win.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        group.add(win);
      }
    }
  }
  // Cheatline: zwei flache Streifen unter der Fensterreihe (Livery-Farbe)
  const cheatY = B.r * (M.L.cheatlineY ?? 0.02) + B.r * 0.08;
  const cheat = new THREE.Mesh(new THREE.BoxGeometry(B.len * 0.82, 0.05, B.r * 2.02), M.cheatMat);
  cheat.position.y = cheatY;
  group.add(cheat);
  // Belly-Kante (dünner dunkler Trennstrich unten, damit Belly visuell abgesetzt wirkt)
  const bellyLine = new THREE.Mesh(new THREE.BoxGeometry(B.len * 0.86, 0.03, B.r * 2.005), M.dark);
  bellyLine.position.y = -B.r * 0.1;
  group.add(bellyLine);

  // Türen (markante dunkle Rechtecke)
  const doorPositions = [halfLen * 0.4, -halfLen * 0.1, -halfLen * 0.5];
  for (const dx of doorPositions) {
    for (const side of [1, -1]) {
      const doorGeo = new THREE.BoxGeometry(0.35, 0.55, 0.02);
      const door = new THREE.Mesh(doorGeo, M.dark);
      door.position.set(dx, B.r * 0.35, side * B.r * 1.002);
      door.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(door);
    }
  }

  // IATA-Titles (Airline-Code) vorne am Rumpf, beidseitig
  if (M.L.iata) {
    for (const side of [1, -1]) {
      const t = createTitleSprite(M.L.iata, M.L.titles, B.r);
      if (!t) continue;
      t.position.set(halfLen * 0.35, B.r * 0.55, side * B.r * 1.003);
      t.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(t);
    }
  }
}

function addCorrugationRings(group, B, M) {
  const halfLen = B.len / 2;
  for (let x = -halfLen + 0.5; x < halfLen; x += 0.6) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(B.r * 1.01, 0.025, 6, 18), M.dark);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = x;
    group.add(ring);
  }
}

function addWings(group, W, wingletType, M, wingMat) {
  const mat = wingMat || M.white;
  for (const side of [1, -1]) {
    const wGeo = createWingGeo(W.span / 2, W.root, W.tip, W.sweep);
    const wMesh = new THREE.Mesh(wGeo, mat);
    wMesh.castShadow = true;
    wMesh.position.set(W.pos, W.y, 0);
    if (side === -1) wMesh.scale.z = -1;
    group.add(wMesh);
    // Nav-Leuchte an der Flügelspitze (rot links, grün rechts)
    const navColor = side > 0 ? 0x00ff55 : 0xff2020;
    const navMat = new THREE.MeshStandardMaterial({
      color: navColor, emissive: navColor, emissiveIntensity: 1.4,
      metalness: 0.1, roughness: 0.4,
    });
    const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), navMat);
    navLight.position.set(W.pos + W.sweep * 0.95, W.y + 0.05, side * (W.span / 2 - 0.05));
    group.add(navLight);
    // Weißer Strobe als kleine Scheibe daneben
    const strobeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.7,
      metalness: 0.1, roughness: 0.3,
    });
    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), strobeMat);
    strobe.position.set(W.pos + W.sweep * 0.9, W.y + 0.04, side * (W.span / 2 - 0.15));
    group.add(strobe);
    if (wingletType === 'fence') {
      const wl = new THREE.Mesh(new THREE.BoxGeometry(W.tip * 0.7, W.span * 0.04, 0.04), mat);
      wl.position.set(W.pos + W.sweep, W.y + W.span * 0.02, side * W.span / 2);
      group.add(wl);
    } else if (wingletType === 'curved') {
      const wl = new THREE.Mesh(new THREE.BoxGeometry(W.tip * 0.5, W.span * 0.06, 0.04), mat);
      wl.position.set(W.pos + W.sweep + 0.3, W.y + W.span * 0.035, side * W.span / 2);
      wl.rotation.z = side * 1.0;
      group.add(wl);
    } else if (wingletType === 'raked') {
      const wl = new THREE.Mesh(new THREE.BoxGeometry(W.tip * 0.9, W.span * 0.05, 0.04), mat);
      wl.position.set(W.pos + W.sweep + 0.5, W.y + W.span * 0.03, side * (W.span / 2 + 0.2));
      wl.rotation.z = side * 0.6;
      group.add(wl);
    } else if (wingletType === 'split') {
      for (const dir of [1, -1]) {
        const wl = new THREE.Mesh(new THREE.BoxGeometry(W.tip * 0.5, W.span * 0.03, 0.03), mat);
        wl.position.set(W.pos + W.sweep, W.y + dir * W.span * 0.02, side * W.span / 2);
        wl.rotation.z = side * dir * 0.7;
        group.add(wl);
      }
    }
  }
}

function addWingStruts(group, W, B, M) {
  for (const side of [1, -1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, W.y + B.r, 6), M.chrome);
    strut.rotation.z = side * 0.4;
    strut.position.set(W.pos, W.y * 0.5 - B.r * 0.3, side * W.span * 0.25);
    group.add(strut);
  }
}

// ============================================================
// TRIEBWERKE
// ============================================================

function addJetEngine(group, ex, ey, ez, E, W, M, opts = {}) {
  const eg = new THREE.Group();
  // Gelofteter Nacellen-Profil: Einlauflippe → Bauch → Auslass
  const nacPts = [];
  const np = (x, r) => nacPts.push(new THREE.Vector2(Math.max(r, 0.001), x));
  const L = E.len;
  np(-L * 0.5 - 0.02, E.r * 0.55);   // Auslass (schmal)
  np(-L * 0.5 + 0.05, E.r * 0.72);
  np(-L * 0.4, E.r * 0.88);
  np(-L * 0.1, E.r * 1.0);
  np(L * 0.25, E.r * 1.05);           // Bauch
  np(L * 0.42, E.r * 1.02);
  np(L * 0.48, E.r * 0.96);           // Lippe außen
  np(L * 0.50, E.r * 0.92);           // Einlauf-Kante
  np(L * 0.48, E.r * 0.88);           // Lippe innen
  np(L * 0.42, E.r * 0.82);
  np(L * 0.1, E.r * 0.78);
  np(-L * 0.3, E.r * 0.70);
  np(-L * 0.5 + 0.03, E.r * 0.65);
  const nacGeo = new THREE.LatheGeometry(nacPts, 28);
  nacGeo.rotateZ(-Math.PI / 2);
  const nacelle = new THREE.Mesh(nacGeo, M.engineMat);
  nacelle.castShadow = true;
  eg.add(nacelle);
  // Dunkler Einlauf-Innenring
  const lipGeo = new THREE.TorusGeometry(E.r * 0.88, E.r * 0.05, 8, 24);
  lipGeo.rotateY(Math.PI / 2);
  const lip = new THREE.Mesh(lipGeo, M.dark);
  lip.position.x = L * 0.47;
  eg.add(lip);
  // Spinner (drehender Kegel)
  const spinGeo = new THREE.ConeGeometry(E.r * 0.3, E.r * 0.75, 16);
  spinGeo.rotateZ(-Math.PI / 2);
  const spin = new THREE.Mesh(spinGeo, M.chrome);
  spin.position.x = L * 0.38;
  eg.add(spin);
  // Fan-Blades
  const fan = createFan(E.r * 0.85, 22, M.chrome);
  fan.position.x = L * 0.3;
  eg.add(fan);
  // Abgaskern (innen dunkel)
  const coreGeo = new THREE.CylinderGeometry(E.r * 0.55, E.r * 0.48, L * 0.35, 16);
  coreGeo.rotateZ(Math.PI / 2);
  const core = new THREE.Mesh(coreGeo, M.dark);
  core.position.x = -L * 0.35;
  eg.add(core);
  // Abgaskegel (hinten)
  const exhConeGeo = new THREE.ConeGeometry(E.r * 0.38, L * 0.3, 14);
  exhConeGeo.rotateZ(Math.PI / 2);
  const exhCone = new THREE.Mesh(exhConeGeo, M.dark);
  exhCone.position.x = -L * 0.65;
  eg.add(exhCone);

  if (opts.rearMount) {
    // Pylon seitlich am Rumpf
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(E.len * 0.4, 0.08, 0.4), M.chrome);
    pylon.position.set(0, 0, -Math.sign(ez) * 0.25);
    eg.add(pylon);
  } else if (opts.overWing) {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(E.len * 0.4, 0.3, 0.08), M.chrome);
    pylon.position.set(0, -0.2, 0);
    eg.add(pylon);
  } else {
    const pylonH = Math.abs(ey - W.y);
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(E.len * 0.45, pylonH, 0.08), M.chrome);
    pylon.position.set(0, pylonH / 2 + 0.05, 0);
    eg.add(pylon);
  }
  if (E.flat) {
    const flat = new THREE.Mesh(new THREE.BoxGeometry(E.len * 0.55, 0.06, E.r * 1.6), M.chrome);
    flat.position.set(0.1, -E.r * 0.82, 0);
    eg.add(flat);
  }
  if (E.serrated) {
    for (let i = 0; i < 12; i++) {
      const toothGeo = new THREE.ConeGeometry(0.03, 0.15, 3);
      toothGeo.rotateZ(Math.PI / 2);
      const tooth = new THREE.Mesh(toothGeo, M.dark);
      const a = (i / 12) * Math.PI * 2;
      tooth.position.set(-E.len / 2 - 0.1, Math.sin(a) * E.r * 0.65, Math.cos(a) * E.r * 0.65);
      eg.add(tooth);
    }
  }
  eg.position.set(ex, ey, ez);
  group.add(eg);
}

function createFan(r, bladeCount, mat) {
  const fanGroup = new THREE.Group();
  for (let i = 0; i < bladeCount; i++) {
    const bladeGeo = new THREE.BoxGeometry(0.02, r * 0.65, r * 0.06);
    const blade = new THREE.Mesh(bladeGeo, mat);
    blade.position.y = r * 0.37;
    const pivot = new THREE.Group();
    pivot.add(blade);
    pivot.rotation.x = (i / bladeCount) * Math.PI * 2;
    fanGroup.add(pivot);
  }
  fanGroup.position.x = 0.1;
  fanGroup.userData.isPropeller = true;
  return fanGroup;
}

function createPropeller(bladeCount, diameter, width, mat) {
  const g = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 10), mat);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  for (let i = 0; i < bladeCount; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(width, diameter, 0.03), mat);
    blade.position.y = 0;
    const pivot = new THREE.Group();
    pivot.add(blade);
    pivot.rotation.x = (i / bladeCount) * Math.PI * 2;
    g.add(pivot);
  }
  g.userData.isPropeller = true;
  return g;
}

function addPropellerEngine(group, x, y, z, E, M, opts = {}) {
  const eg = new THREE.Group();
  const r = E.r || 0.25;
  // Gondel / Sternmotor
  if (E.radial) {
    const cowl = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 0.85, r * 1.6, 14), M.dark);
    cowl.rotation.z = Math.PI / 2;
    eg.add(cowl);
    // Sichtbare Zylinder
    for (let i = 0; i < 7; i++) {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.18, r * 0.18, r * 0.4, 8), M.chrome);
      const a = (i / 7) * Math.PI * 2;
      cyl.position.set(0, Math.sin(a) * r * 0.75, Math.cos(a) * r * 0.75);
      cyl.rotation.x = a;
      eg.add(cyl);
    }
  } else {
    const nac = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.55, (E.len || 1.5), 14), M.chrome);
    nac.rotation.z = Math.PI / 2;
    eg.add(nac);
  }
  const spin = new THREE.Mesh(new THREE.ConeGeometry(r * 0.35, 0.25, 12), M.chrome);
  spin.geometry.rotateZ(-Math.PI / 2);
  spin.position.x = (E.len || 1.5) / 2 + (E.radial ? r * 0.85 : 0.1);
  if (opts.pusher) {
    spin.rotation.z = Math.PI;
    spin.position.x = -(E.len || 1.5) / 2 - 0.15;
  }
  eg.add(spin);
  const propD = opts.tiny ? r * 3 : (opts.turboprop ? r * 6 : r * 5);
  const prop = createPropeller(E.bladeCount || 2, propD, 0.08, M.dark);
  prop.position.x = spin.position.x + (opts.pusher ? -0.05 : 0.1);
  if (opts.pusher) prop.userData.pusher = true;
  eg.add(prop);
  // Pylon zum Flügel
  if (!opts.nose && !opts.pusher) {
    const pylonH = 0.3;
    const pylon = new THREE.Mesh(new THREE.BoxGeometry((E.len || 1) * 0.4, pylonH, 0.06), M.chrome);
    pylon.position.set(0, pylonH / 2 + r * 0.4, 0);
    eg.add(pylon);
  }
  eg.position.set(x, y, z);
  group.add(eg);
}

// ============================================================
// LEITWERKE
// ============================================================

function buildTailFin(T, M) {
  // Seitenleitwerk nach Livery.tailStyle; liefert Group mit Finnen
  const g = new THREE.Group();
  const style = (M.L?.tailStyle) || 'solid';
  const base = new THREE.Mesh(createFinGeo(T.vH, T.vChord), M.tailMat);
  g.add(base);
  if (style === 'stripe') {
    // Horizontaler Streifen auf halber Höhe
    const s = new THREE.Mesh(new THREE.BoxGeometry(T.vChord * 0.9, T.vH * 0.22, 0.08), M.tailExtra);
    s.position.set(-T.vChord * 0.45, T.vH * 0.45, 0);
    g.add(s);
  } else if (style === 'split') {
    // Oben Livery-Primary, unten Tail-Extra/Secondary
    const bot = new THREE.Mesh(createFinGeo(T.vH * 0.5, T.vChord), M.tailExtra);
    g.add(bot);
  } else if (style === 'sweep') {
    // Diagonal-Sweep: Dreieck aus Secondary über Finne
    const tri = new THREE.Shape();
    tri.moveTo(0, 0); tri.lineTo(-T.vChord, 0); tri.lineTo(-T.vChord * 0.35, T.vH);
    const sw = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.07, bevelEnabled: false }), M.tailExtra);
    sw.position.z = -0.035;
    sw.scale.set(0.95, 0.55, 1);  // nur unterer Teil
    g.add(sw);
  } else if (style === 'tricolor') {
    // Drei horizontale Bänder
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(T.vChord * 0.85, T.vH * 0.22, 0.07),
        [M.tailMat, M.tailExtra, M.accentMat][i % 3]
      );
      band.position.set(-T.vChord * 0.4, T.vH * (0.18 + i * 0.28), 0);
      g.add(band);
    }
  } else if (style === 'eurowhite') {
    // Weiße Finne mit Logo-Fleck (Primary)
    base.material = M.white;
    const logo = new THREE.Mesh(new THREE.CircleGeometry(T.vH * 0.18, 16), M.tailMat);
    logo.position.set(-T.vChord * 0.5, T.vH * 0.55, 0.05);
    g.add(logo);
  }
  return g;
}

function addConventionalTail(group, C, M) {
  const B = C.body;
  const T = C.tail;
  const tailX = -B.len / 2 - B.len * 0.15;
  for (const side of [1, -1]) {
    const hs = new THREE.Mesh(createWingGeo(T.hSpan / 2, T.hChord, T.hChord * 0.4, 0.8), M.white);
    hs.position.set(tailX, B.r * 0.15, 0);
    if (side === -1) hs.scale.z = -1;
    group.add(hs);
  }
  const fin = buildTailFin(T, M);
  fin.position.set(tailX, B.r, 0);
  group.add(fin);
  const fa = new THREE.Mesh(new THREE.BoxGeometry(T.vChord * 0.3, T.vH * 0.25, 0.06), M.accentMat);
  fa.position.set(tailX - T.vChord * 0.15, B.r + T.vH * 0.55, 0);
  group.add(fa);
}

function addTail(group, C, M) {
  const B = C.body;
  const T = C.tail;
  if (!T) return;
  const tailX = -B.len / 2 - B.len * 0.15;
  // Seitenleitwerk (mit Livery-Style)
  const fin = buildTailFin(T, M);
  fin.position.set(tailX, B.r, 0);
  group.add(fin);
  const fa = new THREE.Mesh(new THREE.BoxGeometry(T.vChord * 0.3, T.vH * 0.25, 0.06), M.accentMat);
  fa.position.set(tailX - T.vChord * 0.15, B.r + T.vH * 0.55, 0);
  group.add(fa);
  // Höhenleitwerk — T-Tail oder konventionell
  const hY = T.tTail ? B.r + T.vH : B.r * 0.15;
  const hX = T.tTail ? tailX - T.vChord * 0.25 : tailX;
  for (const side of [1, -1]) {
    const hs = new THREE.Mesh(createWingGeo(T.hSpan / 2, T.hChord, T.hChord * 0.4, 0.6), M.white);
    hs.position.set(hX, hY, 0);
    if (side === -1) hs.scale.z = -1;
    group.add(hs);
  }
}

// ============================================================
// FAHRWERK
// ============================================================

function addAirlinerGear(group, C, M) {
  const B = C.body;
  const G = C.gear;
  if (!G) return;
  // Bug-Fahrwerk: 2 Räder auf einer Achse
  addGearAssembly(group, G.noseX, -B.r - 0.2, 0, 0.14, 1.0, M.chrome, M.rubber);
  // Haupt-Fahrwerk: Bogie-Größe anhand der Flugzeuggröße
  const mainAxleCount = B.len >= 20 ? 3 : (B.len >= 15 ? 2 : 1);  // 6/4/2 Räder
  addMainBogie(group, G.mainX, -B.r - 0.2,  G.mainZ, mainAxleCount, M);
  addMainBogie(group, G.mainX, -B.r - 0.2, -G.mainZ, mainAxleCount, M);
  if (G.extraBody) {
    // Zusätzliches Rumpf-Hauptfahrwerk (747/777/a380/dc10)
    addMainBogie(group, G.mainX + 1.5, -B.r - 0.2,  G.mainZ * 0.4, mainAxleCount, M);
    addMainBogie(group, G.mainX + 1.5, -B.r - 0.2, -G.mainZ * 0.4, mainAxleCount, M);
  }
}

// Bogie: axleCount Achsen (2 Räder pro Achse) auf einem Träger
function addMainBogie(group, x, y, z, axleCount, M) {
  const strutH = 1.3;
  const wheelR = 0.22;
  const axleSpace = 0.6;
  const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, strutH, 8), M.chrome);
  strut.position.set(x, y - strutH / 2, z);
  group.add(strut);
  // Quer-Träger
  const bogieLen = Math.max(0.4, (axleCount - 1) * axleSpace + 0.4);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(bogieLen, 0.08, 0.15), M.dark);
  beam.position.set(x, y - strutH, z);
  group.add(beam);
  for (let i = 0; i < axleCount; i++) {
    const ax = x + (i - (axleCount - 1) / 2) * axleSpace;
    for (const dz of [-0.2, 0.2]) {
      const wGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.14, 16);
      wGeo.rotateX(Math.PI / 2);
      const w = new THREE.Mesh(wGeo, M.rubber);
      w.position.set(ax, y - strutH, z + dz);
      group.add(w);
    }
  }
}

function addLightGear(group, C, M) {
  const B = C.body;
  const G = C.gear;
  if (!G) return;
  if (G.taildragger) {
    addTaildraggerGear(group, C, M);
  } else {
    addGearAssembly(group, G.noseX, -B.r - 0.1, 0, 0.11, 0.5, M.chrome, M.rubber);
    for (const s of [1, -1]) addGearAssembly(group, G.mainX, -B.r - 0.1, s * G.mainZ, 0.13, 0.55, M.chrome, M.rubber);
  }
}

function addTaildraggerGear(group, C, M) {
  const B = C.body;
  const G = C.gear;
  if (!G) return;
  for (const s of [1, -1]) addGearAssembly(group, G.mainX, -B.r - 0.15, s * G.mainZ, 0.16, 0.7, M.chrome, M.rubber);
  // Spornrad
  addGearAssembly(group, G.tailX, -B.r * 0.4, 0, 0.08, 0.3, M.chrome, M.rubber);
}

function addGearAssembly(group, x, y, z, wheelR, strutH, strutMat, wheelMat) {
  const tireMat = wheelMat || strutMat;
  const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, strutH, 8), strutMat);
  strut.position.set(x, y - strutH / 2, z);
  group.add(strut);
  for (const dz of [-0.1, 0.1]) {
    const wGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.11, 14);
    wGeo.rotateX(Math.PI / 2);
    const w = new THREE.Mesh(wGeo, tireMat);
    w.position.set(x, y - strutH, z + dz);
    group.add(w);
  }
}

// ============================================================
// GEOMETRIE-HELFER
// ============================================================

function createWingGeo(halfSpan, rootChord, tipChord, sweep, opts = {}) {
  // Profilierter Flügel (NACA-ähnlich): Querschnitt mit gewölbter Oberseite,
  // abgerundeter Nase, dünner Hinterkante. Entlang der Spannweite gelotet.
  const chordSegs = 14;  // Punkte pro Halbprofil
  const spanSegs = opts.thin ? 6 : 8;
  const thickMax = opts.thin ? 0.06 : 0.14;
  // NACA-0012-ähnliches Halbprofil
  const profileY = (tp) => {
    // tp: 0 Vorderkante → 1 Hinterkante
    const t = Math.max(tp, 0.0001);
    return 5 * thickMax * (0.2969 * Math.sqrt(t) - 0.1260 * t - 0.3516 * t * t + 0.2843 * t * t * t - 0.1036 * t * t * t * t);
  };

  const verts = [];
  const idx = [];
  // Für jede Spannweiten-Station: ringförmiges Profil (2*chordSegs Punkte)
  const ringSize = 2 * chordSegs;
  for (let s = 0; s <= spanSegs; s++) {
    const sf = s / spanSegs;
    const z = sf * halfSpan;
    const chord = rootChord * (1 - sf) + tipChord * sf;
    const sweepOff = sf * sweep;
    // Oben: Vorderkante → Hinterkante
    for (let i = 0; i < chordSegs; i++) {
      const tp = i / (chordSegs - 1);
      const x = chord / 2 - tp * chord + sweepOff;
      const y = profileY(tp);
      verts.push(x, y, z);
    }
    // Unten: Hinterkante → Vorderkante
    for (let i = 0; i < chordSegs; i++) {
      const tp = 1 - (i / (chordSegs - 1));
      const x = chord / 2 - tp * chord + sweepOff;
      const y = -profileY(tp) * 0.55;   // Unterseite flacher
      verts.push(x, y, z);
    }
  }
  // Oberfläche zwischen den Ringen triangulieren
  for (let s = 0; s < spanSegs; s++) {
    for (let i = 0; i < ringSize; i++) {
      const a = s * ringSize + i;
      const b = s * ringSize + ((i + 1) % ringSize);
      const c = (s + 1) * ringSize + ((i + 1) % ringSize);
      const d = (s + 1) * ringSize + i;
      idx.push(a, b, c, a, c, d);
    }
  }
  // Wurzel-Kappe (z=0)
  for (let i = 1; i < ringSize - 1; i++) {
    idx.push(0, i + 1, i);
  }
  // Flügelspitze-Kappe (z=halfSpan)
  const base = spanSegs * ringSize;
  for (let i = 1; i < ringSize - 1; i++) {
    idx.push(base, base + i, base + i + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function createDeltaWing(rootChord, halfSpan, sweep, ogee) {
  const verts = [];
  const t = 0.12;
  // Root leading edge at (rootChord/2, 0), root trailing edge at (-rootChord/2, 0)
  // Tip at (-rootChord/2 + sweep, halfSpan)  — spitze, hinten
  const r0 = rootChord / 2, r1 = -rootChord / 2;
  const tipX = -rootChord / 2 + sweep;
  const quad = (a, b, c, d) => { verts.push(...a, ...b, ...c, ...a, ...c, ...d); };
  // Oben
  quad([r0, t, 0], [tipX, t * 0.2, halfSpan], [tipX, t * 0.2, halfSpan], [r1, t, 0]);
  // Unten
  quad([r1, 0, 0], [tipX, 0, halfSpan], [tipX, 0, halfSpan], [r0, 0, 0]);
  // Vorderkante
  quad([r0, 0, 0], [tipX, 0, halfSpan], [tipX, t * 0.2, halfSpan], [r0, t, 0]);
  // Hinterkante
  quad([r1, t, 0], [tipX, t * 0.2, halfSpan], [tipX, 0, halfSpan], [r1, 0, 0]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  geo.computeVertexNormals();
  return geo;
}

function createFinGeo(height, chord) {
  const verts = [];
  const th = 0.06;
  const quad = (a, b, c, d) => { verts.push(...a, ...b, ...c, ...a, ...c, ...d); };
  for (const z of [0, th]) {
    verts.push(0, 0, z, -chord, 0, z, -chord * 0.35, height, z);
    verts.push(0, 0, z, -chord * 0.35, height, z, 0.15, height * 0.65, z);
  }
  quad([0.15, height * 0.65, 0], [-chord * 0.35, height, 0], [-chord * 0.35, height, th], [0.15, height * 0.65, th]);
  quad([-chord, 0, 0], [-chord, 0, th], [-chord * 0.35, height, th], [-chord * 0.35, height, 0]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  geo.computeVertexNormals();
  return geo;
}

// ============================================================
// PUBLIC API
// ============================================================

export function createAircraftForType(type, liveryOrColor1, color2) {
  return buildAircraft(type, liveryOrColor1, color2);
}

export function createProceduralAirplane() {
  return buildAircraft('a320', '#05164d', '#ffc72c');
}

const _glbCache = new Map();
const _loader = new GLTFLoader();

// Typen mit vorhandenen GLB-Dateien unter /public/models/*.glb
const GLB_AVAILABLE = new Set(['a320','a330','a340','a350','a380','b747','b757','b787']);

// Mapping „Typ → nächstpassendes vorhandenes GLB" für Jets ohne eigenes Modell.
// Props/Segler/Amphibien/Bizjets/Concorde bleiben bewusst prozedural, weil kein
// sinnvolles GLB-Vorbild unter den vorhandenen Dateien existiert.
const GLB_FALLBACK = {
  // Narrow-Body 2-Triebwerk → a320
  b737:       'a320',
  a220:       'a320',
  a321:       'a320',
  b717:       'a320',
  // Wide-Body 2-Triebwerk
  a300:       'a330',
  b767:       'a330',
  b777:       'b787',
  // 4-Triebwerk → a340
  b707:       'a340',
  // Trijet Boeing
  b727:       'b757',
};

// Färbt die hellen Materialien eines GLB mit der Airline-Primärfarbe ein.
// Weiß/hellgraue Flächen (Rumpf) werden getöntr Lufthansa wird blau, Swiss rot usw.
// Dunkle Materialien (Triebwerke, Fahrwerk) und Glas bleiben unverändert.
export function applyLiveryToGLB(root, livery) {
  if (!root || !livery?.color1) return;
  const primary = new THREE.Color(livery.color1);
  const secondary = new THREE.Color(livery.color2 || livery.color1);
  const belly = new THREE.Color(livery.belly || '#eaeaec');
  const visited = new WeakSet();
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const assign = (m) => {
      if (!m || visited.has(m)) return m;
      if (!m.color) { visited.add(m); return m; }
      const hsl = { h: 0, s: 0, l: 0 };
      m.color.getHSL(hsl);
      const clone = m.clone();
      // Helle, wenig gesättigte Flächen (klassisch weißer Rumpf) → Primary
      if (hsl.l > 0.6 && hsl.s < 0.25 && !m.transparent) {
        clone.color.copy(primary).lerp(belly, 0.35);
      }
      visited.add(clone);
      return clone;
    };
    if (Array.isArray(o.material)) o.material = o.material.map(assign);
    else o.material = assign(o.material);
  });
}

export function loadAircraftModel(type) {
  if (!GLB_AVAILABLE.has(type) && !GLB_FALLBACK[type]) return Promise.resolve(null);
  if (_glbCache.has(type)) return _glbCache.get(type);
  const p = new Promise((resolve) => {
    const srcType = GLB_AVAILABLE.has(type) ? type : GLB_FALLBACK[type];
    _loader.load(
      `/models/${srcType}.glb`,
      (gltf) => {
        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3(); box.getSize(size);
        const center = new THREE.Vector3(); box.getCenter(center);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim === 0) { resolve(null); return; }
        const target = getRealLength(type);
        const s = target / maxDim;
        const wrap = new THREE.Group();
        root.position.sub(center).multiplyScalar(s);
        root.scale.setScalar(s);
        wrap.add(root);
        // GLB-Modelle haben Nase am +X (wie procedural inner). Wir drehen
        // den ganzen Wrapper so, dass die Nase bei yaw=0 auf +Z zeigt —
        // konsistent mit Physik und Kamera. Die Rotation liegt am wrap
        // (nicht am root), damit das BBox-Centering in root-local
        // unberührt bleibt.
        wrap.rotation.y = -Math.PI / 2;
        wrap.userData.realLength = target;
        // Boden-Offset nach Skalierung ermitteln (Y von Y-Rotation unbeeinflusst)
        const scaledBox = new THREE.Box3().setFromObject(wrap);
        wrap.userData.groundOffset = Math.max(0, -scaledBox.min.y);
        wrap.traverse((o) => {
          if (!o.isMesh) return;
          o.castShadow = true; o.receiveShadow = true;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            if (!m) continue;
            if ('envMapIntensity' in m) m.envMapIntensity = 1.1;
            if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
          }
        });
        resolve(wrap);
      },
      undefined,
      () => resolve(null),
    );
  });
  _glbCache.set(type, p);
  return p;
}

export async function createGLBInstance(type) {
  const tmpl = await loadAircraftModel(type);
  return tmpl ? tmpl.clone(true) : null;
}

// ============================================================
// 3D PREVIEW (Menü)
// ============================================================

export class AircraftPreview {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1524);
    this.camera = new THREE.PerspectiveCamera(30, 2, 0.1, 2000);
    this.camera.position.set(20, 10, 20);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.7;
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const d = new THREE.DirectionalLight(0xfff5e0, 1.5);
    d.position.set(15, 20, 10);
    this.scene.add(d);
    const rim = new THREE.DirectionalLight(0x4a9eff, 0.4);
    rim.position.set(-15, 5, -10);
    this.scene.add(rim);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshLambertMaterial({ color: 0x151e2d }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
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
  setAircraft(type, liveryOrColor1, color2) {
    if (this.model) this.scene.remove(this.model);
    this.model = buildAircraft(type, liveryOrColor1, color2);
    this.model.position.y = this.model.userData.groundOffset || 0;
    this.scene.add(this.model);
    this._realLen = this.model.userData.realLength || 12;
    this.resize();
    const reqType = type;
    const livery = (typeof liveryOrColor1 === 'object') ? liveryOrColor1 : { color1: liveryOrColor1, color2 };
    createGLBInstance(type).then((glb) => {
      if (!glb || this._lastType !== reqType) return;
      applyLiveryToGLB(glb, livery);
      this.scene.remove(this.model);
      this.model = glb;
      this.model.position.y = this.model.userData.groundOffset || 0;
      this._realLen = glb.userData.realLength || this._realLen;
      this.scene.add(this.model);
    });
    this._lastType = type;
  }
  render() {
    this.angle += 0.004;
    if (this.model) {
      this.model.rotation.y = this.angle;
      this.model.traverse(c => {
        if (c.userData?.isPropeller) {
          c.rotation.x += c.userData.pusher ? -0.25 : 0.25;
        }
      });
    }
    // Abstand passt sich an Spannweite (horizontal) und halbe Länge (vertikal) an, damit das Flugzeug immer vollständig ins Bild passt.
    const len = this._realLen || 12;
    const span = len * 1.05;          // Spannweite ~ Länge bei Airlinern
    const diag = len * 0.55;          // Halbdiagonale (in Bildhöhe sichtbar)
    const aspect = this.camera.aspect || 2;
    const vFov = (this.camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const distH = (span * 0.6) / Math.tan(hFov / 2);
    const distV = diag / Math.tan(vFov / 2);
    const dist = Math.max(distH, distV, 18);
    const baseY = (this.model?.position.y || 0);
    this.camera.position.set(
      Math.sin(this.angle * 0.4) * dist,
      baseY + Math.max(5, len * 0.28) + Math.sin(this.angle * 0.25) * len * 0.06,
      Math.cos(this.angle * 0.4) * dist
    );
    this.camera.lookAt(0, baseY + len * 0.08, 0);
    this.renderer.render(this.scene, this.camera);
  }
}
