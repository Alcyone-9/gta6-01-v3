// Sidewalk pedestrians: simple articulated figures who stroll block loops,
// step aside from cars and sprint away from danger.
import * as THREE from 'three';
import { blockCenters } from './world.js';
import { rand, randRange, pick, clamp } from './random.js';
const SHIRTS = [0xef476f, 0xffd166, 0x06d6a0, 0x118ab2, 0xffffff, 0xff8fa3, 0x90be6d, 0xf3722c];
const PANTS = [0x2b2d42, 0x4a4e69, 0x6c5849, 0x22223b, 0x5a189a];
export function buildPedestrianMesh(shirt, pants) {
  const group = new THREE.Group();
  const legMat = new THREE.MeshLambertMaterial({ color: pants });
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xe8b08a });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), legMat);
  legL.position.set(-0.16, 0.43, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.16;
  group.add(legR);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.78, 0.36), shirtMat);
  torso.position.y = 1.24;
  torso.castShadow = true;
  group.add(torso);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), shirtMat);
  armL.position.set(-0.48, 1.22, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.48;
  group.add(armR);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 10), skinMat);
  head.position.y = 1.86;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.3, 0.14, 10), new THREE.MeshLambertMaterial({ color: pick(SHIRTS) }));
  cap.position.y = 2.05;
  group.add(cap);
  group.userData.parts = { legL, legR, armL, armR, torso };
  return group;
}
export class Pedestrian {
  constructor(scene, x, z) {
    this.mesh = buildPedestrianMesh(pick(SHIRTS), pick(PANTS));
    this.x = x;
    this.z = z;
    this.heading = randRange(0, Math.PI * 2);
    this.speed = randRange(1.6, 2.8);
    this.baseSpeed = this.speed;
    this.fear = 0;
    this.walkPhase = randRange(0, 6);
    this.waypoint = null;
    this.wait = 0;
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
    this.pickWaypoint();
  }
  pickWaypoint() {
    const blocks = blockCenters();
    const block = pick(blocks);
    const side = Math.floor(randRange(0, 4));
    const half = 30;
    const along = randRange(-half, half);
    if (side === 0) this.waypoint = { x: block.x + along, z: block.z - half };
    else if (side === 1) this.waypoint = { x: block.x + along, z: block.z + half };
    else if (side === 2) this.waypoint = { x: block.x - half, z: block.z + along };
    else this.waypoint = { x: block.x + half, z: block.z + along };
  }
  scare(fromX, fromZ, amount) {
    this.fear = Math.min(1.6, this.fear + (amount || 1));
    this.fleeFrom = { x: fromX, z: fromZ };
  }
  update(dt, threats, world) {
    this.fear = Math.max(0, this.fear - dt * 0.45);
    let targetSpeed = this.baseSpeed;
    let dirX = 0;
    let dirZ = 0;
    if (this.fear > 0.25 && this.fleeFrom) {
      dirX = this.x - this.fleeFrom.x;
      dirZ = this.z - this.fleeFrom.z;
      const len = Math.hypot(dirX, dirZ) || 1;
      dirX /= len;
      dirZ /= len;
      targetSpeed = 6.4;
    } else if (this.waypoint) {
      dirX = this.waypoint.x - this.x;
      dirZ = this.waypoint.z - this.z;
      const dist = Math.hypot(dirX, dirZ);
      if (dist < 1.6) {
        if (rand() < 0.3) this.wait = randRange(0.6, 2.4);
        this.pickWaypoint();
      } else {
        dirX /= dist;
        dirZ /= dist;
      }
    }
    // Step aside from anything fast and close.
    if (threats) {
      for (const t of threats) {
        const d = Math.hypot(t.x - this.x, t.z - this.z);
        if (d < 5 && t.speed > 4) {
          const awayX = (this.x - t.x) / (d || 1);
          const awayZ = (this.z - t.z) / (d || 1);
          dirX += awayX * 1.7;
          dirZ += awayZ * 1.7;
          targetSpeed = Math.max(targetSpeed, 5.2);
          if (d < 3.2) this.scare(t.x, t.z, 0.7);
        }
      }
    }
    if (this.wait > 0) {
      this.wait -= dt;
      targetSpeed = 0;
    }
    const len = Math.hypot(dirX, dirZ);
    if (len > 0.01 && targetSpeed > 0) {
      dirX /= len;
      dirZ /= len;
      this.heading = Math.atan2(dirX, dirZ);
      const nx = this.x + dirX * targetSpeed * dt;
      const nz = this.z + dirZ * targetSpeed * dt;
      if (!world.collides(nx, nz, 0.4)) {
        this.x = nx;
        this.z = nz;
      } else {
        this.pickWaypoint();
      }
      this.walkPhase += dt * targetSpeed * 2.4;
    }
    this.x = clamp(this.x, -248, 262);
    this.z = clamp(this.z, -248, 248);
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    const parts = this.mesh.userData.parts;
    const swing = Math.sin(this.walkPhase) * (targetSpeed > 0 ? 0.55 : 0);
    parts.legL.rotation.x = swing;
    parts.legR.rotation.x = -swing;
    parts.armL.rotation.x = -swing * 0.8;
    parts.armR.rotation.x = swing * 0.8;
    if (this.fear > 0.5) {
      parts.armL.rotation.x = -2.4;
      parts.armR.rotation.x = -2.4;
    }
  }
  dispose(scene) { scene.remove(this.mesh); }
}
export const PED_LINES = [
  'Mind the palms, friend.',
  'Festival is going to be huge this year.',
  'That driver again? Bold.',
  'Best coffee on Marina Row, no contest.',
  'Ferry is late. Ferry is always late.',
  'Golden tapes? I hid mine years ago.',
  'Watch for the tow truck on Harbor Quarter.',
  'Sunset circuit record still stands, I hear.',
];
export function pedestrianLine(index) {
  return PED_LINES[Math.abs(index || 0) % PED_LINES.length];
}
export class PedestrianSystem {
  constructor(scene, world, count) {
    this.scene = scene;
    this.world = world;
    this.peds = [];
    const blocks = blockCenters();
    const total = count || 26;
    for (let i = 0; i < total; i += 1) {
      const block = pick(blocks);
      const x = block.x + randRange(-30, 30);
      const z = block.z + (rand() < 0.5 ? -30 : 30);
      this.peds.push(new Pedestrian(scene, x, z));
    }
  }
  update(dt, threats) {
    for (const ped of this.peds) ped.update(dt, threats, this.world);
  }
  scareNear(x, z, radius, amount) {
    for (const ped of this.peds) {
      if (Math.hypot(ped.x - x, ped.z - z) < radius) ped.scare(x, z, amount);
    }
  }
  wavingNear(x, z, maxDist) {
    // Promenade pedestrians sometimes hail a ride: a wave is both arms up
    // with no fear, which the HUD can surface as a side-hustle prompt.
    let best = null;
    let bestD = maxDist || 14;
    for (const ped of this.peds) {
      if (ped.fear > 0.1) continue;
      const d = Math.hypot(ped.x - x, ped.z - z);
      if (d < bestD) { bestD = d; best = ped; }
    }
    return best;
  }
  calmAll() {
    for (const ped of this.peds) ped.fear = Math.min(ped.fear, 0.2);
  }
  countAfraid() {
    return this.peds.filter((p) => p.fear > 0.4).length;
  }
  nearest(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const ped of this.peds) {
      const d = Math.hypot(ped.x - x, ped.z - z);
      if (d < bestD) { bestD = d; best = ped; }
    }
    return best;
  }
  all() { return this.peds; }
}
