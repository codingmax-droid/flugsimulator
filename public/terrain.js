import * as THREE from 'three';

// --- Tile-Koordinaten-Umrechnung ---

export function latLonToTile(lat, lon, zoom) {
  const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor(
    (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)
  );
  return { x, y, z: zoom };
}

export function tileToBounds(x, y, z) {
  const n = Math.pow(2, z);
  const lonLeft = x / n * 360 - 180;
  const lonRight = (x + 1) / n * 360 - 180;
  const latTop = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
  const latBottom = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
  return { latTop, latBottom, lonLeft, lonRight };
}

// --- Terrain Tile laden ---

const TILE_SEGMENTS = 128;
const tileCache = new Map();
const loadingTiles = new Set();

function tileKey(x, y, z) {
  return `${z}/${x}/${y}`;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function decodeTerrarium(imageData) {
  const elevations = new Float32Array(256 * 256);
  for (let i = 0; i < 256 * 256; i++) {
    const r = imageData[i * 4];
    const g = imageData[i * 4 + 1];
    const b = imageData[i * 4 + 2];
    elevations[i] = (r * 256.0 + g + b / 256.0) - 32768.0;
  }
  return elevations;
}

function sampleElevation(elevations, u, v) {
  // Bilineare Interpolation im 256x256 Grid
  const fx = u * 255;
  const fy = v * 255;
  const ix = Math.min(254, Math.floor(fx));
  const iy = Math.min(254, Math.floor(fy));
  const dx = fx - ix;
  const dy = fy - iy;

  const i00 = iy * 256 + ix;
  const i10 = iy * 256 + ix + 1;
  const i01 = (iy + 1) * 256 + ix;
  const i11 = (iy + 1) * 256 + ix + 1;

  return (
    elevations[i00] * (1 - dx) * (1 - dy) +
    elevations[i10] * dx * (1 - dy) +
    elevations[i01] * (1 - dx) * dy +
    elevations[i11] * dx * dy
  );
}

export async function loadTerrainTile(scene, tx, ty, tz, worldOffsetX, worldOffsetZ, tileWorldSize) {
  const key = tileKey(tx, ty, tz);
  if (tileCache.has(key) || loadingTiles.has(key)) return tileCache.get(key);
  loadingTiles.add(key);

  try {
    // Höhendaten und Satellitenbild parallel laden
    const [terrainImg, satelliteImg] = await Promise.all([
      loadImage(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${tz}/${tx}/${ty}.png`),
      loadImage(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${tz}/${ty}/${tx}`),
    ]);

    // Höhendaten dekodieren
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(terrainImg, 0, 0);
    const imageData = ctx.getImageData(0, 0, 256, 256).data;
    const elevations = decodeTerrarium(imageData);

    // Geometrie erstellen
    const geo = new THREE.PlaneGeometry(tileWorldSize, tileWorldSize, TILE_SEGMENTS, TILE_SEGMENTS);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const lx = positions[i];
      const lz = positions[i + 2];
      // Normalisieren auf 0-1 im Tile
      const u = (lx / tileWorldSize) + 0.5;
      const v = (lz / tileWorldSize) + 0.5;
      positions[i + 1] = sampleElevation(elevations, u, v);
    }
    geo.computeVertexNormals();

    // Satellitentextur
    const texture = new THREE.Texture(satelliteImg);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 4;

    const mat = new THREE.MeshLambertMaterial({ map: texture });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(worldOffsetX, 0, worldOffsetZ);
    mesh.receiveShadow = true;
    mesh.userData.tileKey = key;

    scene.add(mesh);
    tileCache.set(key, mesh);
    loadingTiles.delete(key);
    return mesh;
  } catch (e) {
    console.warn('Terrain-Tile konnte nicht geladen werden:', key, e);
    loadingTiles.delete(key);
    return null;
  }
}

// --- Terrain-Manager: Tiles um Spieler laden/entladen ---

export class TerrainManager {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.zoom = options.zoom || 11;
    this.radius = options.radius || 3; // Tiles in jede Richtung
    this.tileWorldSize = options.tileWorldSize || 2000;
    this.centerLat = options.lat || 47.37;
    this.centerLon = options.lon || 10.98;
    this.activeTiles = new Set();
    this.centerTile = null;
  }

  getTileForWorldPos(wx, wz) {
    // Welche Tile-Koordinate entspricht einer Weltposition?
    // Die Welt-Mitte (0,0) = centerLat/centerLon
    const centerTile = latLonToTile(this.centerLat, this.centerLon, this.zoom);
    const tileOffX = Math.round(wx / this.tileWorldSize);
    const tileOffZ = Math.round(wz / this.tileWorldSize);
    return {
      x: centerTile.x + tileOffX,
      y: centerTile.y + tileOffZ,
      z: this.zoom,
    };
  }

  async update(playerX, playerZ) {
    const centerTile = this.getTileForWorldPos(playerX, playerZ);
    const newKey = tileKey(centerTile.x, centerTile.y, centerTile.z);

    // Nur updaten wenn sich das Center-Tile geändert hat
    if (this.centerTile === newKey) return;
    this.centerTile = newKey;

    const neededTiles = new Set();

    for (let dx = -this.radius; dx <= this.radius; dx++) {
      for (let dz = -this.radius; dz <= this.radius; dz++) {
        const tx = centerTile.x + dx;
        const ty = centerTile.y + dz;
        const key = tileKey(tx, ty, this.zoom);
        neededTiles.add(key);

        if (!tileCache.has(key) && !loadingTiles.has(key)) {
          // Weltposition des Tiles berechnen
          const baseTile = latLonToTile(this.centerLat, this.centerLon, this.zoom);
          const worldX = (tx - baseTile.x) * this.tileWorldSize;
          const worldZ = (ty - baseTile.y) * this.tileWorldSize;
          loadTerrainTile(this.scene, tx, ty, this.zoom, worldX, worldZ, this.tileWorldSize);
        }
      }
    }

    // Alte Tiles entfernen
    for (const key of this.activeTiles) {
      if (!neededTiles.has(key)) {
        const mesh = tileCache.get(key);
        if (mesh) {
          this.scene.remove(mesh);
          mesh.geometry.dispose();
          mesh.material.map?.dispose();
          mesh.material.dispose();
          tileCache.delete(key);
        }
      }
    }

    this.activeTiles = neededTiles;
  }
}
