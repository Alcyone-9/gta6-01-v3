// Ten golden cassettes hidden around Coral City: rooftops are out, so they
// glow at street corners, the pier, the lot and the landmarks instead.
import * as THREE from 'three';
import { CONFIG } from './config.js';
export const CASSETTE_SPOTS = [
  { x: -206, z: -186, hint: 'Behind police HQ' },
  { x: 232, z: 40, hint: 'On the pier sand' },
  { x: 168, z: -140, hint: 'Tow yard corner' },
  { x: -30, z: -30, hint: 'Downtown crossing' },
  { x: 58, z: 200, hint: 'South promenade' },
  { x: -200, z: 30, hint: 'West billboard base' },
  { x: 30, z: -200, hint: 'North market edge' },
  { x: 196, z: 196, hint: 'South-east beach path' },
  { x: -84, z: -84, hint: 'Midtown palm cluster' },
  { x: 0, z: 84, hint: 'Central fountain block' },
];
export class Collectibles {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.found = new Set();
    this.group = new THREE.Group();
    scene.add(this.group);
    CASSETTE_SPOTS.forEach((spot, index) => {
      const mesh = this.buildCassette();
      mesh.position.set(spot.x, 1.15, spot.z);
      mesh.userData.index = index;
      this.group.add(mesh);
      const light = new THREE.PointLight(0xffd700, 1.1, 13, 1.8);
      light.position.set(spot.x, 1.6, spot.z);
      this.group.add(light);
      this.items.push({ mesh, light, spot, index, taken: false });
    });
  }
  buildCassette() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.75, 0.22), new THREE.MeshBasicMaterial({ color: 0xffc300 }));
    group.add(body);
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x3a2b00 });
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.34, 0.24), windowMat);
    win.position.y = 0.08;
    group.add(win);
    for (const sx of [-0.22, 0.22]) {
      const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 10), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
      reel.rotation.x = Math.PI / 2;
      reel.position.set(sx, 0.08, 0);
      group.add(reel);
    }
    return group;
  }
  restore(foundList) {
    this.found = new Set(foundList || []);
    for (const item of this.items) {
      if (this.found.has(item.index)) {
        item.taken = true;
        item.mesh.visible = false;
        item.light.intensity = 0;
      }
    }
  }
  update(dt, playerPos, onPickup) {
    const spin = performance.now() * 0.0016;
    for (const item of this.items) {
      if (item.taken) continue;
      item.mesh.rotation.y = spin + item.index;
      item.mesh.position.y = 1.15 + Math.sin(spin * 2 + item.index) * 0.18;
      if (playerPos && Math.hypot(playerPos.x - item.spot.x, playerPos.z - item.spot.z) < 2.4) {
        item.taken = true;
        item.mesh.visible = false;
        item.light.intensity = 0;
        this.found.add(item.index);
        if (onPickup) onPickup(item, this.found.size);
      }
    }
  }
  nearestUnfound(x, z, maxDist) {
    let best = null;
    let bestD = maxDist || 60;
    for (const item of this.items) {
      if (item.taken) continue;
      const d = Math.hypot(item.spot.x - x, item.spot.z - z);
      if (d < bestD) { bestD = d; best = item; }
    }
    return best;
  }
  hintsRemaining() {
    return this.items.filter((item) => !item.taken).map((item) => item.spot.hint);
  }
  nextHint() {
    const hints = this.hintsRemaining();
    return hints.length ? hints[0] : 'Every cassette is on the shelf. Collector status: legend.';
  }
  completionRewardPreview() {
    const remaining = CASSETTE_SPOTS.length - this.found.size;
    return remaining * CONFIG.economy.cassetteRewardEach + (remaining > 0 ? CONFIG.economy.cassetteRewardAll : 0);
  }
  count() { return this.found.size; }
  allFound() { return this.found.size >= CASSETTE_SPOTS.length; }
  serialize() { return Array.from(this.found); }
  rewardFor(count) {
    if (count >= CASSETTE_SPOTS.length) return CONFIG.economy.cassetteRewardEach + CONFIG.economy.cassetteRewardAll;
    return CONFIG.economy.cassetteRewardEach;
  }
}
