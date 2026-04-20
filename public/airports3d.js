import * as THREE from 'three';

// ============================================================
//   FLUGHAFEN-3D-AUFBAU
//   Aufgebaut am Weltursprung (0,0,0). Das ist die Ausrichtung
//   des gewählten Airports — terrain.js legt das Basis-Tile so
//   aus, dass der Airport bei Welt (0,0) liegt; elev → y=0.
//   Welt-Konvention: +X=Ost, +Z=Süd, -Z=Nord.
//   Für Heading h° (magnetisch/wahr): Richtungsvektor
//   dir = (sin(h·π/180), 0, -cos(h·π/180)).
// ============================================================

const APRON_Y    = 0.05;   // Apron leicht über 0 gegen Z-Fighting mit Terrain
const RUNWAY_Y   = 0.10;
const MARKING_Y  = 0.15;
const LIGHT_Y    = 0.20;

function headingToRad(hdg) { return hdg * Math.PI / 180; }

// Runway-Textur: Asphalt + Mittellinie + Schwellenstreifen
function runwayTexture(lenMeters, widMeters) {
  const ar = Math.max(1, Math.round(lenMeters / widMeters));
  const W = 128;
  const H = 128 * ar;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#1a1a1c';
  g.fillRect(0, 0, W, H);
  // feine Streifigkeit
  for (let i = 0; i < 600; i++) {
    g.fillStyle = `rgba(255,255,255,${0.015 + Math.random() * 0.02})`;
    g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1);
  }
  // Mittellinie (gestrichelt)
  g.fillStyle = '#fafafa';
  const dash = H / (ar * 8);
  const gap  = dash * 0.6;
  const cx = W / 2;
  for (let y = 0; y < H; y += dash + gap) {
    g.fillRect(cx - 1.5, y, 3, dash);
  }
  // Seitenlinien
  g.fillStyle = '#eaeaea';
  g.fillRect(2, 0, 2, H);
  g.fillRect(W - 4, 0, 2, H);
  // Schwellenstreifen (piano keys) oben/unten
  const bars = 8;
  const barW = (W - 40) / (bars * 2 - 1);
  for (let i = 0; i < bars; i++) {
    const x = 20 + i * barW * 2;
    g.fillRect(x, 4, barW, H / (ar * 16));
    g.fillRect(x, H - H / (ar * 16) - 4, barW, H / (ar * 16));
  }
  // Schwellen-Touchdown-Markierung
  g.fillStyle = '#ffffff';
  for (let k = 0; k < 2; k++) {
    const yBase = k === 0 ? H * 0.08 : H * 0.88;
    for (let side = -1; side <= 1; side += 2) {
      for (let j = 0; j < 6; j++) {
        g.fillRect(cx + side * 8 - 2, yBase + j * 4, 4, 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipMapLinearFilter;
  return tex;
}

// Einfache Asphalt-Textur für Apron/Taxiways
function asphaltTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#262628';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    g.fillStyle = `rgba(${140 + Math.random() * 40},${140 + Math.random() * 40},${140 + Math.random() * 40},${Math.random() * 0.15})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 20);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildApron(group) {
  const mat = new THREE.MeshStandardMaterial({
    map: asphaltTexture(),
    color: 0x2a2a2c,
    roughness: 0.95,
    metalness: 0.0,
  });
  const geo = new THREE.PlaneGeometry(1800, 1800);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = APRON_Y;
  mesh.receiveShadow = true;
  mesh.userData.isAirportGround = true;
  group.add(mesh);
  return mesh;
}

function buildRunway(group, rwy) {
  const len = rwy.len || 3000;
  const wid = rwy.wid || 45;
  const mat = new THREE.MeshStandardMaterial({
    map: runwayTexture(len, wid),
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0,
  });
  const geo = new THREE.PlaneGeometry(wid, len);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = RUNWAY_Y;
  // Heading: Richtung, in die die Runway-Länge zeigt.
  // Default: Längsachse +Z (Süd). Heading 0° = Nord = -Z → Rotation um Y um π.
  mesh.rotation.y = Math.PI - headingToRad(rwy.hdg || 0);
  mesh.receiveShadow = true;
  mesh.userData.isAirportGround = true;
  group.add(mesh);

  // Runway-Lichter (Edge-Lights alle 30 m)
  const lightsGroup = new THREE.Group();
  const lampGeo = new THREE.SphereGeometry(0.6, 6, 4);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff1a8 });
  const halfLen = len / 2;
  const halfWid = wid / 2 + 0.5;
  for (let s = -halfLen + 10; s <= halfLen - 10; s += 60) {
    for (const side of [-halfWid, halfWid]) {
      const l = new THREE.Mesh(lampGeo, lampMat);
      l.position.set(side, LIGHT_Y, s);
      lightsGroup.add(l);
    }
  }
  // Schwellen-Lichter (grün/rot) an den Enden
  const thrGeoG = new THREE.SphereGeometry(0.9, 6, 4);
  const thrMatG = new THREE.MeshBasicMaterial({ color: 0x30ff60 });
  const thrMatR = new THREE.MeshBasicMaterial({ color: 0xff3030 });
  for (let x = -halfWid; x <= halfWid; x += 4) {
    const g1 = new THREE.Mesh(thrGeoG, thrMatG);
    g1.position.set(x, LIGHT_Y, -halfLen);
    lightsGroup.add(g1);
    const r1 = new THREE.Mesh(thrGeoG, thrMatR);
    r1.position.set(x, LIGHT_Y, halfLen);
    lightsGroup.add(r1);
  }
  lightsGroup.rotation.y = mesh.rotation.y;
  group.add(lightsGroup);
  return mesh;
}

// Terminal: langgestreckter Gebäuderiegel mit Glas-Fenstern
function buildTerminal(group, offset = new THREE.Vector3(0, 0, 350)) {
  const body = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xbcc3cc, roughness: 0.7, metalness: 0.15 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x9ec8f0, roughness: 0.15, metalness: 0.5,
    transparent: true, opacity: 0.85,
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.8 });

  // Hauptkörper 250 × 24 × 50 m
  const main = new THREE.Mesh(
    new THREE.BoxGeometry(250, 24, 50),
    [wallMat, wallMat, roofMat, wallMat, glassMat, glassMat],
  );
  main.position.y = 12;
  main.castShadow = true;
  main.receiveShadow = true;
  body.add(main);

  // Glasfront vorne (Richtung Apron = -Z)
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 18),
    glassMat,
  );
  glass.position.set(0, 11, -25.1);
  body.add(glass);

  // Dach-Akzent
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(254, 1.5, 54),
    roofMat,
  );
  roof.position.y = 24.8;
  body.add(roof);

  // Jet Bridges
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue;
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(4, 4, 28),
      wallMat,
    );
    bridge.position.set(i * 28, 6, -40);
    body.add(bridge);
  }

  body.position.copy(offset);
  group.add(body);
  return body;
}

// Control Tower
function buildTower(group, offset = new THREE.Vector3(-300, 0, 250)) {
  const t = new THREE.Group();
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0xe4e7ec, roughness: 0.7 });
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0x233040, roughness: 0.2, metalness: 0.4,
    emissive: 0x8bb8e0, emissiveIntensity: 0.15,
  });
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 4, 45, 16),
    shaftMat,
  );
  shaft.position.y = 22.5;
  shaft.castShadow = true;
  t.add(shaft);

  const cabin = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 5, 5, 16),
    cabinMat,
  );
  cabin.position.y = 48;
  cabin.castShadow = true;
  t.add(cabin);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(7.5, 3, 16),
    new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.6 }),
  );
  roof.position.y = 52;
  t.add(roof);

  // Spitze mit Blink-Licht
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff4040 }),
  );
  top.position.y = 54;
  top.userData.isBeacon = true;
  t.add(top);

  t.position.copy(offset);
  group.add(t);
  return t;
}

// Einfache Hangars am Rand
function buildHangars(group) {
  const hangarMat = new THREE.MeshStandardMaterial({ color: 0x6c7480, roughness: 0.8 });
  for (let i = 0; i < 3; i++) {
    const h = new THREE.Mesh(
      new THREE.BoxGeometry(60, 18, 40),
      hangarMat,
    );
    h.position.set(320 + i * 70, 9, -200);
    h.castShadow = true;
    h.receiveShadow = true;
    group.add(h);
    // Bogendach-Andeutung
    const arch = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 20, 60, 16, 1, true, 0, Math.PI),
      hangarMat,
    );
    arch.rotation.z = Math.PI / 2;
    arch.rotation.y = Math.PI / 2;
    arch.position.set(320 + i * 70, 18, -200);
    group.add(arch);
  }
}

// Flaggenmast mit IATA-Code
function buildSignpost(group, airport) {
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 14, 8),
    new THREE.MeshStandardMaterial({ color: 0xaeb4bd }),
  );
  post.position.set(50, 7, 80);
  group.add(post);

  // Schild-Canvas
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#0c1424';
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#2a7fff';
  g.lineWidth = 6;
  g.strokeRect(6, 6, 500, 244);
  g.fillStyle = '#fff';
  g.font = 'bold 120px Inter, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(airport.iata || airport.icao || 'APT', 256, 110);
  g.font = '32px Inter, sans-serif';
  g.fillStyle = '#9ec8f0';
  g.fillText((airport.city || '').slice(0, 24).toUpperCase(), 256, 200);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 7),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
  );
  sign.position.set(50, 12, 80);
  group.add(sign);
}

export function buildAirportScene(scene, airport) {
  const root = new THREE.Group();
  root.name = `airport_${airport?.icao || 'origin'}`;
  root.userData.isAirportScene = true;

  buildApron(root);

  const runways = (airport && airport.rwy) ? airport.rwy : [{ hdg: 0, len: 3000, wid: 45 }];
  for (const r of runways) buildRunway(root, r);

  buildTerminal(root);
  buildTower(root);
  buildHangars(root);
  if (airport) buildSignpost(root, airport);

  scene.add(root);
  return root;
}
