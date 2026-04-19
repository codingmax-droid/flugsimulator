import * as THREE from 'three';

// --- Tile-Koordinaten-Umrechnung ---

export function latLonToTile(lat, lon, zoom) {
  const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor(
    (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)
  );
  return { x, y, z: zoom };
}

// Bruchteil-Position innerhalb des Base-Tiles (0..1, top-left origin)
export function latLonToTileFrac(lat, lon, zoom) {
  const n = Math.pow(2, zoom);
  const xFrac = (lon + 180) / 360 * n;
  const yFrac = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n;
  return {
    tile: { x: Math.floor(xFrac), y: Math.floor(yFrac), z: zoom },
    u: xFrac - Math.floor(xFrac),
    v: yFrac - Math.floor(yFrac),
  };
}

export function tileToBounds(x, y, z) {
  const n = Math.pow(2, z);
  const lonLeft = x / n * 360 - 180;
  const lonRight = (x + 1) / n * 360 - 180;
  const latTop = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
  const latBottom = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
  return { latTop, latBottom, lonLeft, lonRight };
}

// --- Tile-Cache & Loading ---

const TILE_SEG_NEAR = 128;
const TILE_SEG_FAR = 64;
const LOD_NEAR_RADIUS = 1;
const MAX_CONCURRENT = 6;

const tileCache = new Map();
const loadingTiles = new Set();
const loadQueue = [];
let activeLoads = 0;

function tileKey(x, y, z) {
  return `${z}/${x}/${y}`;
}

async function fetchImageBitmap(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

function decodeTerrariumFromBitmap(bitmap) {
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(256, 256)
    : Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  const data = ctx.getImageData(0, 0, 256, 256).data;
  const elevations = new Float32Array(256 * 256);
  for (let i = 0; i < 256 * 256; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    elevations[i] = (r * 256.0 + g + b / 256.0) - 32768.0;
  }
  return elevations;
}

function sampleElevation(elevations, u, v) {
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

// Parallelitäts-Limit: neue Jobs nur starten, wenn Slot frei
function pumpQueue() {
  while (activeLoads < MAX_CONCURRENT && loadQueue.length > 0) {
    loadQueue.sort((a, b) => a.priority - b.priority);
    const job = loadQueue.shift();
    activeLoads++;
    job.run().finally(() => {
      activeLoads--;
      pumpQueue();
    });
  }
}

function enqueueTileLoad(scene, tx, ty, tz, worldX, worldZ, tileWorldSize, segments, elevOffset, priority) {
  const key = tileKey(tx, ty, tz);
  if (tileCache.has(key) || loadingTiles.has(key)) return;
  loadingTiles.add(key);

  const job = {
    priority,
    run: () => loadTerrainTile(scene, tx, ty, tz, worldX, worldZ, tileWorldSize, segments, elevOffset),
  };
  loadQueue.push(job);
  pumpQueue();
}

async function loadTerrainTile(scene, tx, ty, tz, worldOffsetX, worldOffsetZ, tileWorldSize, segments, elevOffset) {
  const key = tileKey(tx, ty, tz);
  try {
    const [terrainBitmap, satelliteBitmap] = await Promise.all([
      fetchImageBitmap(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${tz}/${tx}/${ty}.png`),
      fetchImageBitmap(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${tz}/${ty}/${tx}`),
    ]);

    const elevations = decodeTerrariumFromBitmap(terrainBitmap);
    terrainBitmap.close?.();

    const geo = new THREE.PlaneGeometry(tileWorldSize, tileWorldSize, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const lx = positions[i];
      const lz = positions[i + 2];
      const u = (lx / tileWorldSize) + 0.5;
      const v = (lz / tileWorldSize) + 0.5;
      positions[i + 1] = sampleElevation(elevations, u, v) - elevOffset;
    }
    geo.computeVertexNormals();

    const texture = new THREE.CanvasTexture(satelliteBitmap);
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 4;

    const mat = new THREE.MeshLambertMaterial({ map: texture });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(worldOffsetX, 0, worldOffsetZ);
    mesh.receiveShadow = true;
    mesh.userData.tileKey = key;
    mesh.userData.segments = segments;

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

// --- Terrain-Manager ---

export class TerrainManager {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.zoom = options.zoom || 11;
    this.targetRadius = options.radius || 3;
    this.currentRadius = Math.min(2, this.targetRadius);
    this.tileWorldSize = options.tileWorldSize || 2000;
    this.centerLat = options.lat || 47.37;
    this.centerLon = options.lon || 10.98;
    this.elevOffset = options.elevation || 0;
    this.activeTiles = new Set();
    this.centerTile = null;

    // Airport auf Weltursprung (0,0) ausrichten — nicht auf Tile-Mitte
    const frac = latLonToTileFrac(this.centerLat, this.centerLon, this.zoom);
    this.baseTile = frac.tile;
    // Base-Tile-Mitte verschieben, damit Airport bei Welt (0,0) liegt
    this.baseTileCenterX = (0.5 - frac.u) * this.tileWorldSize;
    this.baseTileCenterZ = (0.5 - frac.v) * this.tileWorldSize;
  }

  getTileForWorldPos(wx, wz) {
    const tileOffX = Math.round((wx - this.baseTileCenterX) / this.tileWorldSize);
    const tileOffZ = Math.round((wz - this.baseTileCenterZ) / this.tileWorldSize);
    return {
      x: this.baseTile.x + tileOffX,
      y: this.baseTile.y + tileOffZ,
      z: this.zoom,
    };
  }

  async update(playerX, playerZ) {
    const centerTile = this.getTileForWorldPos(playerX, playerZ);
    const newKey = tileKey(centerTile.x, centerTile.y, centerTile.z);

    // Radius schrittweise ausbauen, sobald initiale Tiles da sind
    if (this.currentRadius < this.targetRadius &&
        this.activeTiles.size > 0 && loadingTiles.size === 0) {
      this.currentRadius++;
    }

    if (this.centerTile === newKey && this.currentRadius === this._lastRadius) return;
    this.centerTile = newKey;
    this._lastRadius = this.currentRadius;

    const neededTiles = new Set();
    const candidates = [];

    for (let dx = -this.currentRadius; dx <= this.currentRadius; dx++) {
      for (let dz = -this.currentRadius; dz <= this.currentRadius; dz++) {
        const tx = centerTile.x + dx;
        const ty = centerTile.y + dz;
        const key = tileKey(tx, ty, this.zoom);
        neededTiles.add(key);

        if (!tileCache.has(key) && !loadingTiles.has(key)) {
          const worldX = (tx - this.baseTile.x) * this.tileWorldSize + this.baseTileCenterX;
          const worldZ = (ty - this.baseTile.y) * this.tileWorldSize + this.baseTileCenterZ;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const segments = dist <= LOD_NEAR_RADIUS ? TILE_SEG_NEAR : TILE_SEG_FAR;
          candidates.push({ tx, ty, worldX, worldZ, segments, dist });
        }
      }
    }

    // Nächste Tiles zuerst laden (distance-sort)
    candidates.sort((a, b) => a.dist - b.dist);
    for (const c of candidates) {
      enqueueTileLoad(this.scene, c.tx, c.ty, this.zoom, c.worldX, c.worldZ,
                      this.tileWorldSize, c.segments, this.elevOffset, c.dist);
    }

    // Entfernte Tiles ausräumen
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
