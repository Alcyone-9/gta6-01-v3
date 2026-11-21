// Coral City generation: a 5x5 block grid, beach and water to the east,
// palms, lamps, props and a full day-night light rig. One file builds it all.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { seedRandom, rand, randRange, pick, chance } from './random.js';
const PALETTE = [0xf2d5a0, 0xe8a598, 0x9fd8d4, 0xf7ead1, 0xc9b8e8, 0xf5c86b, 0xa8c686, 0xe6e6fa, 0xffb7a5, 0x8ecae6];
const ROOFS = [0x8d6e63, 0x607d8b, 0x795548, 0x546e7a, 0x9e7b53];
export function blockCenters() {
  const out = [];
  const pitch = CONFIG.city.blockPitch;
  for (let bx = -2; bx <= 2; bx += 1) {
    for (let bz = -2; bz <= 2; bz += 1) out.push({ bx, bz, x: bx * pitch, z: bz * pitch });
  }
  return out;
}
export function roadLines() {
  const pitch = CONFIG.city.blockPitch;
  const half = CONFIG.city.roadWidth / 2;
  const lines = [];
  for (let i = -2; i <= 2; i += 1) {
    lines.push((i - 0.5) * pitch - half + pitch / 2);
  }
  // Roads sit between blocks: offsets at pitch/2 steps.
  const roads = [];
  for (let k = -2; k <= 2; k += 1) roads.push(k * pitch + pitch / 2);
  roads.push(-2 * pitch - pitch / 2);
  return roads;
}
export function isOnRoad(x, z) {
  const pitch = CONFIG.city.blockPitch;
  const half = CONFIG.city.roadWidth / 2 + 1;
  const roads = roadLines();
  for (const r of roads) {
    if (Math.abs(x - r) < half || Math.abs(z - r) < half) return true;
  }
  return false;
}
function box(w, h, d, color, x, y, z, parent, opts) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  if (opts && opts.ry) mesh.rotation.y = opts.ry;
  mesh.castShadow = Boolean(opts && opts.shadow);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.lampLights = [];
    this.lampHeads = [];
    this.windowMats = [];
    this.water = null;
    this.sun = null;
    this.moon = null;
    this.hemi = null;
    this.skyColor = new THREE.Color(CONFIG.day.daySky);
    this.build();
  }
  build() {
    seedRandom(90210);
    const scene = this.scene;
    scene.fog = new THREE.Fog(CONFIG.day.daySky, CONFIG.render.fogNearDay, CONFIG.render.fogFarDay);
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x8a6f4d, 0.9);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe3b3, 1.6);
    this.sun.castShadow = false;
    scene.add(this.sun);
    scene.add(this.sun.target);
    this.moon = new THREE.DirectionalLight(0x8fb2ff, 0);
    scene.add(this.moon);
    this.buildGround();
    this.buildRoads();
    this.buildBlocks();
    this.buildBeach();
    this.buildProps();
    this.buildLandmarks();
    this.buildExtras();
  }
  buildExtras() {
    // Harbor cranes on the east edge, silhouetted against the water.
    for (const cz of [-120, 40, 170]) {
      box(2, 17, 2, 0xfb8500, 252, 8.5, cz - 6, this.scene, {});
      box(2, 17, 2, 0xfb8500, 252, 8.5, cz + 6, this.scene, {});
      box(2, 2, 20, 0xfb8500, 252, 17.5, cz, this.scene, {});
      box(1, 1, 13, 0xfb8500, 246, 16.4, cz, this.scene, {});
      box(4, 3.4, 4, pick([0x118ab2, 0xef476f, 0x06d6a0]), 252, 1.7, cz + randRange(-4, 4), this.scene, {});
      this.colliders.push({ x: 252, z: cz, hw: 2, hd: 8, height: 17 });
    }
    // Central fountain: a landmark in the middle block with benches.
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.8, 1, 20), new THREE.MeshLambertMaterial({ color: 0x90a4ae }));
    basin.position.set(0, 0.5, 0);
    this.scene.add(basin);
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 5.8, 0.4, 20), new THREE.MeshLambertMaterial({ color: 0x35b6d9 }));
    pool.position.set(0, 1.05, 0);
    this.scene.add(pool);
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.5, 4.6, 8), new THREE.MeshBasicMaterial({ color: 0xcdf3ff, transparent: true, opacity: 0.75 }));
    jet.position.set(0, 3.2, 0);
    this.scene.add(jet);
    this.fountainJet = jet;
    this.colliders.push({ x: 0, z: 0, hw: 6.6, hd: 6.6, height: 1 });
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      this.buildBench(Math.cos(a) * 10, Math.sin(a) * 10);
    }
    // Night-market stalls along the south promenade.
    const stallColors = [0xef476f, 0xffd166, 0x06d6a0, 0x118ab2, 0xb5179e, 0xfb8500];
    for (let i = 0; i < 6; i += 1) {
      const sx = -90 + i * 32;
      const sz = 226;
      box(5.4, 2.4, 3.6, 0xf1fa8c, sx, 1.2, sz, this.scene, {});
      const awning = box(6.2, 0.3, 4.6, stallColors[i], sx, 2.9, sz, this.scene, {});
      awning.rotation.x = 0.18;
      box(4.6, 0.9, 0.4, stallColors[(i + 2) % stallColors.length], sx, 1.5, sz + 1.9, this.scene, {});
      this.colliders.push({ x: sx, z: sz, hw: 3, hd: 2.2, height: 2.6 });
    }
    // Lifeguard towers watching the beach.
    for (const lz of [-150, 10, 150]) {
      box(0.4, 4.6, 0.4, 0xffffff, 246, 2.3, lz - 1.4, this.scene, {});
      box(0.4, 4.6, 0.4, 0xffffff, 246, 2.3, lz + 1.4, this.scene, {});
      box(3.4, 2, 3.6, 0xff5964, 246, 5.4, lz, this.scene, { shadow: true });
      box(3.8, 0.3, 4, 0xffffff, 246, 6.6, lz, this.scene, {});
      this.colliders.push({ x: 246, z: lz, hw: 1.8, hd: 1.8, height: 5 });
    }
    // Moored boats bobbing just off the sand.
    this.boats = [];
    for (let i = 0; i < 4; i += 1) {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1, 6.4), new THREE.MeshLambertMaterial({ color: pick(stallColors) }));
      hull.position.y = 0.4;
      boat.add(hull);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5, 6), new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
      mast.position.y = 3;
      boat.add(mast);
      const sail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.4, 2.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      sail.position.set(0, 2.8, 1);
      boat.add(sail);
      boat.position.set(292 + (i % 2) * 16, 0, -160 + i * 95);
      this.scene.add(boat);
      this.boats.push(boat);
    }
  }
  buildGround() {
    const size = CONFIG.city.halfExtent * 2 + 260;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ color: 0x9aa578 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.06;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.city.halfExtent * 2 + 60, CONFIG.city.halfExtent * 2 + 60), new THREE.MeshLambertMaterial({ color: 0xb8b09a }));
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = -0.02;
    plaza.receiveShadow = true;
    this.scene.add(plaza);
  }
  buildRoads() {
    const roads = roadLines();
    const extent = CONFIG.city.halfExtent + 30;
    const mat = new THREE.MeshLambertMaterial({ color: 0x3c4148 });
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xf7e08a });
    for (const r of roads) {
      const v = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.city.roadWidth, extent * 2), mat);
      v.rotation.x = -Math.PI / 2;
      v.position.set(r, 0.01, 0);
      v.receiveShadow = true;
      this.scene.add(v);
      const h = new THREE.Mesh(new THREE.PlaneGeometry(extent * 2, CONFIG.city.roadWidth), mat);
      h.rotation.x = -Math.PI / 2;
      h.position.set(0, 0.012, r);
      h.receiveShadow = true;
      this.scene.add(h);
      for (let d = -extent; d < extent; d += 26) {
        if (isOnRoad(r, d) && Math.abs(((d / 84) % 1 + 1) % 1) < 0.2) continue;
        const dashV = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 6), dashMat);
        dashV.rotation.x = -Math.PI / 2;
        dashV.position.set(r, 0.03, d);
        this.scene.add(dashV);
        const dashH = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.5), dashMat);
        dashH.rotation.x = -Math.PI / 2;
        dashH.position.set(d, 0.03, r);
        this.scene.add(dashH);
      }
    }
  }
  buildBlocks() {
    for (const block of blockCenters()) {
      const isLot = block.bx === CONFIG.city.parkLotBlock.bx && block.bz === CONFIG.city.parkLotBlock.bz;
      if (isLot) { this.buildParkingLot(block.x, block.z); continue; }
      const perSide = 2;
      const span = CONFIG.city.blockPitch - CONFIG.city.roadWidth - CONFIG.city.sidewalkWidth * 2;
      const cell = span / perSide;
      for (let ix = 0; ix < perSide; ix += 1) {
        for (let iz = 0; iz < perSide; iz += 1) {
          const x = block.x - span / 2 + cell * (ix + 0.5);
          const z = block.z - span / 2 + cell * (iz + 0.5);
          this.buildBuilding(x, z, cell - CONFIG.city.buildingInset);
        }
      }
      this.buildSidewalk(block.x, block.z, span + 6);
    }
  }
  buildSidewalk(x, z, size) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ color: 0xd8d2c2 }));
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(x, 0.015, z);
    walk.receiveShadow = true;
    this.scene.add(walk);
  }
  buildBuilding(x, z, footprint) {
    const height = randRange(10, 52);
    const color = pick(PALETTE);
    const body = box(footprint, height, footprint, color, x, height / 2, z, this.scene, { shadow: true });
    box(footprint + 1.4, 1.2, footprint + 1.4, pick(ROOFS), x, height + 0.6, z, this.scene, {});
    if (chance(0.55)) box(footprint * 0.4, randRange(2, 5), footprint * 0.4, 0xd9d9d9, x + randRange(-4, 4), height + 2.4, z, this.scene, {});
    if (chance(0.4)) {
      const signMat = new THREE.MeshBasicMaterial({ color: pick([0xff5d8f, 0x00c2a8, 0xffb703, 0x4cc9f0]) });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(footprint * 0.7, 1.6, 0.4), signMat);
      sign.position.set(x, height * 0.72, z + footprint / 2 + 0.3);
      this.scene.add(sign);
      this.windowMats.push(signMat);
    }
    const winMat = new THREE.MeshBasicMaterial({ color: 0x2c3e50 });
    this.windowMats.push(winMat);
    const rows = Math.min(5, Math.max(2, Math.floor(height / 7)));
    const cols = Math.max(2, Math.floor(footprint / 8));
    const winGeo = new THREE.BoxGeometry(1.7, 2.1, 0.15);
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (!chance(0.55)) continue;
        const wx = x - footprint / 2 + (c + 0.5) * (footprint / cols);
        const wy = 3 + r * 4.4;
        if (wy > height - 2) continue;
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(wx, wy, z + footprint / 2 + 0.09);
        this.scene.add(win);
      }
    }
    this.colliders.push({ x, z, hw: footprint / 2 + 0.4, hd: footprint / 2 + 0.4, height });
    return body;
  }
  buildParkingLot(x, z) {
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(62, 62), new THREE.MeshLambertMaterial({ color: 0x565b63 }));
    lot.rotation.x = -Math.PI / 2;
    lot.position.set(x, 0.02, z);
    lot.receiveShadow = true;
    this.scene.add(lot);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
    for (let i = -3; i <= 3; i += 1) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 52), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x + i * 8, 0.035, z);
      this.scene.add(line);
    }
    const booth = box(6, 3.4, 5, 0xffd166, x - 24, 1.7, z - 24, this.scene, { shadow: true });
    this.colliders.push({ x: booth.position.x, z: booth.position.z, hw: 3.4, hd: 2.9, height: 3.4 });
  }
  buildBeach() {
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(70, CONFIG.city.halfExtent * 2 + 200), new THREE.MeshLambertMaterial({ color: 0xf4e2a1 }));
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(CONFIG.city.beachStartX + 20, 0.0, 0);
    sand.receiveShadow = true;
    this.scene.add(sand);
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x1b9aaa, transparent: true, opacity: 0.86 });
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(360, CONFIG.city.halfExtent * 2 + 320), waterMat);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(CONFIG.city.waterStartX + 170, -0.4, 0);
    this.scene.add(this.water);
    for (let z = -220; z <= 220; z += 44) {
      this.buildPalm(CONFIG.city.beachStartX + randRange(2, 16), z + randRange(-8, 8));
      if (chance(0.6)) {
        const um = box(0.3, 3, 0.3, 0xffffff, CONFIG.city.beachStartX + 8, 1.5, z + 10, this.scene, {});
        const top = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.2, 8), new THREE.MeshLambertMaterial({ color: pick([0xef476f, 0xffd166, 0x06d6a0]) }));
        top.position.set(um.position.x, 3.4, um.position.z);
        this.scene.add(top);
      }
    }
  }
  buildPalm(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.5, 7, 6), new THREE.MeshLambertMaterial({ color: 0x8d6e63 }));
    trunk.position.set(x, 3.5, z);
    trunk.rotation.z = randRange(-0.08, 0.08);
    trunk.castShadow = true;
    this.scene.add(trunk);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e9e5b });
    for (let i = 0; i < 6; i += 1) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.18, 1.1), leafMat);
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(x + Math.cos(a) * 2.1, 7.2, z + Math.sin(a) * 2.1);
      leaf.rotation.y = -a;
      leaf.rotation.z = -0.42;
      this.scene.add(leaf);
    }
    this.colliders.push({ x, z, hw: 0.6, hd: 0.6, height: 7 });
  }
  buildProps() {
    const roads = roadLines();
    for (const rx of roads) {
      for (let z = -210; z <= 210; z += 42) {
        this.buildLamp(rx + 11, z);
        this.buildLamp(rx - 11, z + 21);
      }
    }
    for (const block of blockCenters()) {
      for (let i = 0; i < 3; i += 1) {
        const x = block.x + randRange(-26, 26);
        const z = block.z + randRange(-26, 26);
        if (isOnRoad(x, z)) continue;
        if (chance(0.5)) this.buildPalm(x, z);
        else this.buildBench(x, z);
      }
      const hx = block.x + 28;
      const hz = block.z + 28;
      const hydrant = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 8), new THREE.MeshLambertMaterial({ color: 0xe63946 }));
      hydrant.position.set(hx, 0.55, hz);
      this.scene.add(hydrant);
      this.colliders.push({ x: hx, z: hz, hw: 0.5, hd: 0.5, height: 1.1 });
    }
    this.buildBillboard(-42, -232, 0.4);
    this.buildBillboard(126, 232, Math.PI);
    this.buildBillboard(-232, 42, Math.PI / 2);
  }
  buildLamp(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 6.4, 6), new THREE.MeshLambertMaterial({ color: 0x37474f }));
    pole.position.set(x, 3.2, z);
    this.scene.add(pole);
    const headMat = new THREE.MeshBasicMaterial({ color: 0x555f6b });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), headMat);
    head.position.set(x, 6.5, z);
    this.scene.add(head);
    this.lampHeads.push(headMat);
    // Only some lamps carry a real light; the rest just glow at night,
    // which keeps the light count low enough for smooth rendering.
    if (this.lampLights.length < 8) {
      const light = new THREE.PointLight(0xffd9a0, 0, 26, 1.6);
      light.position.set(x, 6.2, z);
      this.scene.add(light);
      this.lampLights.push(light);
    }
    this.colliders.push({ x, z, hw: 0.35, hd: 0.35, height: 6.4 });
  }
  buildBench(x, z) {
    box(2.6, 0.25, 0.8, 0x7a5230, x, 0.7, z, this.scene, {});
    box(2.6, 0.7, 0.18, 0x7a5230, x, 1.05, z - 0.35, this.scene, {});
    this.colliders.push({ x, z, hw: 1.4, hd: 0.5, height: 1 });
  }
  buildBillboard(x, z, ry) {
    box(1, 11, 1, 0x546e7a, x - 5, 5.5, z, this.scene, {});
    box(1, 11, 1, 0x546e7a, x + 5, 5.5, z, this.scene, {});
    const boardMat = new THREE.MeshBasicMaterial({ color: 0xff5d8f });
    const board = new THREE.Mesh(new THREE.BoxGeometry(15, 5.4, 0.5), boardMat);
    board.position.set(x, 12.4, z);
    board.rotation.y = ry;
    this.scene.add(board);
    this.windowMats.push(boardMat);
    this.colliders.push({ x, z, hw: 6, hd: 1, height: 12 });
  }
  buildLandmarks() {
    // Police headquarters, hospital and the hero's apartment: story anchors.
    const hq = box(34, 16, 22, 0xcfd8dc, -210, 8, -210, this.scene, { shadow: true });
    box(36, 2, 24, 0x37474f, -210, 17, -210, this.scene, {});
    this.colliders.push({ x: -210, z: -210, hw: 18, hd: 12, height: 16 });
    this.landmarkPolice = hq.position;
    const hosp = box(30, 13, 20, 0xffffff, 210, 6.5, -210, this.scene, { shadow: true });
    box(4, 10, 1, 0xe63946, 210, 8, -199.4, this.scene, {});
    box(10, 3.4, 1, 0xe63946, 210, 8, -199.3, this.scene, {});
    this.colliders.push({ x: 210, z: -210, hw: 16, hd: 11, height: 13 });
    this.landmarkHospital = hosp.position;
    const home = box(16, 9, 14, 0xffd166, -168, 4.5, 176, this.scene, { shadow: true });
    box(17, 1, 15, 0xef476f, -168, 9.4, 176, this.scene, {});
    this.colliders.push({ x: -168, z: 176, hw: 8.6, hd: 7.6, height: 9 });
    this.landmarkHome = home.position;
  }
  collides(x, z, radius) {
    for (const c of this.colliders) {
      if (Math.abs(x - c.x) < c.hw + radius && Math.abs(z - c.z) < c.hd + radius) return c;
    }
    return null;
  }
  update(dt, hour, focus) {
    const dayAmount = daylightAmount(hour);
    const duskAmount = duskFactor(hour);
    const sky = new THREE.Color(CONFIG.day.nightSky);
    sky.lerp(new THREE.Color(CONFIG.day.daySky), dayAmount);
    if (duskAmount > 0) sky.lerp(new THREE.Color(CONFIG.day.duskSky), duskAmount * 0.55);
    this.skyColor.copy(sky);
    this.scene.fog.color.copy(sky);
    this.scene.fog.near = CONFIG.render.fogNearNight + (CONFIG.render.fogNearDay - CONFIG.render.fogNearNight) * dayAmount;
    this.scene.fog.far = CONFIG.render.fogFarNight + (CONFIG.render.fogFarDay - CONFIG.render.fogFarNight) * dayAmount;
    const sunAngle = ((hour - 6) / 12) * Math.PI;
    const sx = Math.cos(sunAngle) * 260;
    const sy = Math.max(8, Math.sin(sunAngle) * 240);
    if (focus) {
      this.sun.position.set(focus.x + sx, sy, focus.z + 90);
      this.sun.target.position.set(focus.x, 0, focus.z);
    }
    this.sun.intensity = 0.12 + dayAmount * 1.55;
    this.sun.color.setHSL(0.1, 0.55, 0.72 - duskAmount * 0.12);
    this.moon.intensity = (1 - dayAmount) * 0.35;
    if (focus) this.moon.position.set(focus.x - 120, 180, focus.z - 80);
    this.hemi.intensity = 0.22 + dayAmount * 0.75;
    const night = dayAmount < 0.25;
    for (const mat of this.lampHeads) mat.color.setHex(night ? 0xffd166 : 0x555f6b);
    let lampBudget = night ? 14 : 0;
    for (const light of this.lampLights) {
      if (focus && light.position.distanceTo(focus) > 95) { light.intensity = 0; continue; }
      light.intensity = lampBudget > 0 ? 1.15 : 0;
      lampBudget -= 1;
    }
    for (const mat of this.windowMats) {
      if (mat.color && mat.userData.base === undefined) mat.userData.base = mat.color.getHex();
    }
    if (this.water) {
      this.water.position.y = -0.4 + Math.sin(performance.now() * 0.0012) * 0.08;
      this.water.material.color.setHex(dayAmount > 0.3 ? 0x1b9aaa : 0x0d3b66);
    }
    if (this.fountainJet) {
      this.fountainJet.scale.y = 0.85 + Math.sin(performance.now() * 0.004) * 0.2;
    }
    if (this.boats) {
      for (let i = 0; i < this.boats.length; i += 1) {
        const boat = this.boats[i];
        boat.position.y = Math.sin(performance.now() * 0.0011 + i * 1.7) * 0.22;
        boat.rotation.z = Math.sin(performance.now() * 0.0009 + i) * 0.05;
      }
    }
    return { dayAmount, night };
  }
}
export function daylightAmount(hour) {
  if (hour >= 7 && hour <= 17.5) return 1;
  if (hour >= 6 && hour < 7) return hour - 6;
  if (hour > 17.5 && hour <= 19.5) return Math.max(0, 1 - (hour - 17.5) / 2);
  return 0.04;
}
export function duskFactor(hour) {
  if (hour >= 16.5 && hour <= 19.5) return Math.sin(((hour - 16.5) / 3) * Math.PI);
  if (hour >= 5.5 && hour <= 7.5) return Math.sin(((hour - 5.5) / 2) * Math.PI) * 0.6;
  return 0;
}
