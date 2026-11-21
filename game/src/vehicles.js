// Vehicle factory, arcade driving physics and traffic AI.
// Five civilian body types plus cruiser and tow truck share one chassis rig.
import * as THREE from 'three';
import { CONFIG, VEHICLE_TYPES } from './config.js';
import { roadLines } from './world.js';
import { rand, randRange, pick, clamp, angleLerp } from './random.js';
const PAINTS = [0xe63946, 0x457b9d, 0x2a9d8f, 0xe9c46a, 0xf4f1de, 0x3d405b, 0x81b29a, 0xbc6c25, 0x9d4edd, 0x00afb9];
const BODY_SHAPES = {
  sedan: { w: 2.0, l: 4.6, h: 0.62, cabinL: 2.2, cabinH: 0.55, cabinOff: -0.2 },
  coupe: { w: 1.9, l: 4.3, h: 0.5, cabinL: 1.8, cabinH: 0.45, cabinOff: -0.35 },
  suv: { w: 2.2, l: 4.9, h: 0.85, cabinL: 2.9, cabinH: 0.8, cabinOff: -0.1 },
  pickup: { w: 2.15, l: 5.1, h: 0.7, cabinL: 1.7, cabinH: 0.65, cabinOff: 0.75 },
  van: { w: 2.2, l: 5.2, h: 1.05, cabinL: 3.4, cabinH: 0.95, cabinOff: -0.3 },
  cruiser: { w: 2.05, l: 4.8, h: 0.62, cabinL: 2.3, cabinH: 0.55, cabinOff: -0.2 },
  towtruck: { w: 2.2, l: 5.6, h: 0.7, cabinL: 1.6, cabinH: 0.7, cabinOff: 0.9 },
};
export function buildVehicleMesh(type, color) {
  const shape = BODY_SHAPES[type] || BODY_SHAPES.sedan;
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(shape.w, shape.h, shape.l), paint);
  body.position.y = 0.55 + shape.h / 2;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(shape.w * 0.86, shape.cabinH, shape.cabinL), new THREE.MeshLambertMaterial({ color: 0x22303c }));
  cabin.position.set(0, 0.55 + shape.h + shape.cabinH / 2, shape.cabinOff);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x16181d });
  const wheels = [];
  const wx = shape.w / 2 - 0.05;
  const wz = shape.l / 2 - 0.85;
  for (const [x, z] of [[-wx, wz], [wx, wz], [-wx, -wz], [wx, -wz]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.38, z);
    group.add(wheel);
    wheels.push(wheel);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0x444f57 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
  for (const sx of [-0.6, 0.6]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.1), headMat);
    head.position.set(sx, 0.85, shape.l / 2 + 0.03);
    group.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.1), tailMat);
    tail.position.set(sx, 0.88, -shape.l / 2 - 0.03);
    group.add(tail);
  }
  if (type === 'cruiser') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0x2255ff }));
    bar.position.set(0, 0.55 + shape.h + shape.cabinH + 0.14, shape.cabinOff);
    group.add(bar);
    group.userData.lightBar = bar;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(shape.w + 0.04, 0.3, shape.l * 0.7), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    stripe.position.y = 0.82;
    group.add(stripe);
  }
  if (type === 'towtruck') {
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.3), new THREE.MeshLambertMaterial({ color: 0xffb703 }));
    boom.position.set(0, 1.7, -shape.l / 2 + 0.7);
    boom.rotation.x = 0.5;
    group.add(boom);
  }
  if (type === 'pickup') {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(shape.w * 0.9, 0.3, 1.9), new THREE.MeshLambertMaterial({ color: 0x2f3338 }));
    bed.position.set(0, 1.05, -shape.l / 2 + 1.15);
    group.add(bed);
  }
  group.userData.wheels = wheels;
  group.userData.headMat = headMat;
  group.userData.shape = shape;
  return group;
}
export class Vehicle {
  constructor(scene, type, x, z, heading, opts) {
    const options = opts || {};
    this.type = type;
    this.stats = VEHICLE_TYPES[type] || VEHICLE_TYPES.sedan;
    this.color = options.color !== undefined ? options.color : pick(PAINTS);
    if (type === 'cruiser') this.color = 0x1d3557;
    this.mesh = buildVehicleMesh(type, this.color);
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
    scene.add(this.mesh);
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.health = this.stats.health;
    this.parked = Boolean(options.parked);
    this.locked = Boolean(options.locked);
    this.isPolice = type === 'cruiser';
    this.driver = options.driver || null;
    this.smokeTimer = 0;
    this.honkTimer = randRange(4, 14);
    this.ai = options.ai || null;
    this.id = Vehicle.nextId;
    Vehicle.nextId += 1;
  }
  get position() { return this.mesh.position; }
  get wrecked() { return this.health <= CONFIG.vehicles.wreckedHealth; }
  get damaged() { return this.health < CONFIG.vehicles.smokeHealthThreshold; }
  speedRatio() { return this.stats.topSpeed ? this.speed / this.stats.topSpeed : 0; }
  applyDrive(dt, throttle, steerInput, handbrake) {
    if (this.wrecked) { this.speed = 0; return; }
    const accel = throttle > 0 ? this.stats.accel : this.stats.brake;
    if (throttle !== 0) {
      this.speed += throttle * accel * dt * (throttle < 0 && this.speed > 0.5 ? 1.6 : 1);
    } else {
      this.speed -= this.speed * 1.4 * dt;
      if (Math.abs(this.speed) < 0.08) this.speed = 0;
    }
    const reverseCap = -this.stats.topSpeed * 0.38;
    this.speed = clamp(this.speed, reverseCap, this.stats.topSpeed);
    if (handbrake) this.speed -= this.speed * 3.2 * dt;
    const steerTarget = steerInput * 0.62;
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * (handbrake ? 10 : 6));
    const grip = handbrake ? 0.55 : 1;
    if (Math.abs(this.speed) > 0.2) {
      const turn = this.steer * this.stats.handling * dt * grip * (this.speed > 0 ? 1 : -1);
      const speedFactor = clamp(Math.abs(this.speed) / 12, 0.25, 1);
      this.heading -= turn * speedFactor;
    }
    this.x += Math.sin(this.heading) * this.speed * dt;
    this.z += Math.cos(this.heading) * this.speed * dt;
    this.syncMesh(dt);
  }
  syncMesh(dt) {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    const wheels = this.mesh.userData.wheels || [];
    for (const wheel of wheels) wheel.rotation.x += (this.speed * (dt || 0.016)) / 0.38;
    if (this.mesh.userData.lightBar) {
      const flash = Math.floor(performance.now() / 220) % 2 === 0;
      this.mesh.userData.lightBar.material.color.setHex(flash ? 0xff2244 : 0x2255ff);
    }
  }
  setHeadlights(on) {
    const mat = this.mesh.userData.headMat;
    if (mat) mat.color.setHex(on ? 0xfff3b0 : 0x444f57);
    this.headlightsOn = Boolean(on);
  }
  setBrakeLights(on) {
    // Tail lamps brighten while braking so following traffic reads intent.
    const shape = this.mesh.userData.shape;
    if (!shape) return;
    if (!this._tailMats) {
      this._tailMats = [];
      this.mesh.traverse((child) => {
        if (child.material && child.material.color && child.geometry && child.geometry.parameters && child.geometry.parameters.depth === 0.1 && child.position.z < 0) this._tailMats.push(child.material);
      });
    }
    for (const mat of this._tailMats) mat.color.setHex(on ? 0xff2a2a : 0x7f1d1d);
  }
  describe() {
    const healthBand = this.wrecked ? 'wrecked' : this.damaged ? 'smoking' : 'sound';
    return this.stats.label + ' - top ' + Math.round(this.stats.topSpeed * 3.6) + ' km/h - ' + healthBand;
  }
  distanceTo(other) {
    return Math.hypot(this.x - other.x, this.z - other.z);
  }
  forwardPoint(range) {
    return {
      x: this.x + Math.sin(this.heading) * (range || 6),
      z: this.z + Math.cos(this.heading) * (range || 6),
    };
  }
  isFacing(x, z, tolerance) {
    const ahead = this.forwardPoint(8);
    return Math.hypot(ahead.x - x, ahead.z - z) < (tolerance || 6);
  }
  damage(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health;
  }
  repair() { this.health = this.stats.health; }
  dispose(scene) { scene.remove(this.mesh); }
}
Vehicle.nextId = 1;
export class TrafficSystem {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.cars = [];
    this.roads = roadLines();
    this.spawnInitial();
  }
  spawnInitial() {
    const types = ['sedan', 'coupe', 'suv', 'pickup', 'van'];
    for (let i = 0; i < CONFIG.vehicles.trafficCount; i += 1) {
      const vertical = rand() < 0.5;
      const road = pick(this.roads);
      const along = randRange(-210, 210);
      const lane = (rand() < 0.5 ? 3.4 : -3.4);
      const x = vertical ? road + lane : along;
      const z = vertical ? along : road + lane;
      const heading = vertical ? (lane > 0 ? Math.PI : 0) : (lane > 0 ? -Math.PI / 2 : Math.PI / 2);
      // Heading convention: forward vector is (sin h, cos h).
      const fixedHeading = vertical ? (lane > 0 ? Math.PI : 0) : (lane > 0 ? Math.PI / 2 : -Math.PI / 2);
      const car = new Vehicle(this.scene, pick(types), x, z, fixedHeading, { ai: { vertical, road, lane, cruise: randRange(11, 17), wait: 0 } });
      this.cars.push(car);
    }
    this.spawnParked();
  }
  spawnParked() {
    const types = ['sedan', 'coupe', 'suv', 'pickup', 'van'];
    const lotX = CONFIG.city.parkLotBlock.bx * CONFIG.city.blockPitch;
    const lotZ = CONFIG.city.parkLotBlock.bz * CONFIG.city.blockPitch;
    for (let i = 0; i < 6; i += 1) {
      const car = new Vehicle(this.scene, pick(types), lotX - 24 + i * 8, lotZ + randRange(-14, 14), Math.PI, { parked: true });
      car.parked = true;
      this.cars.push(car);
    }
    for (let i = 0; i < CONFIG.vehicles.parkedCount - 6; i += 1) {
      const road = pick(this.roads);
      const along = randRange(-200, 200);
      const side = rand() < 0.5 ? 8.6 : -8.6;
      const vertical = rand() < 0.5;
      const car = new Vehicle(this.scene, pick(types), vertical ? road + side : along, vertical ? along : road + side, vertical ? 0 : Math.PI / 2, { parked: true });
      this.cars.push(car);
    }
  }
  nearestCar(x, z, maxDist, includeParked) {
    let best = null;
    let bestDist = maxDist;
    for (const car of this.cars) {
      if (!includeParked && car.parked && !car.ai) continue;
      const d = Math.hypot(car.x - x, car.z - z);
      if (d < bestDist) { bestDist = d; best = car; }
    }
    return best;
  }
  update(dt, playerPos, audio) {
    for (const car of this.cars) {
      if (car.parked || !car.ai) { car.syncMesh(dt); continue; }
      const ai = car.ai;
      let throttle = 0;
      let targetSpeed = ai.cruise;
      // Slow near intersections: where the car's lane crosses another road.
      const crossCoord = ai.vertical ? car.z : car.x;
      for (const r of this.roads) {
        const gap = Math.abs(crossCoord - r);
        if (gap > 2 && gap < 13) targetSpeed = Math.min(targetSpeed, 4.5);
        if (gap <= 2.2 && ai.wait <= 0 && rand() < 0.3) ai.wait = randRange(0.4, 1.1);
      }
      if (ai.wait > 0) { ai.wait -= dt; targetSpeed = 0; }
      // Simple avoidance: brake when a car or the player is right ahead.
      const fx = car.x + Math.sin(car.heading) * 7;
      const fz = car.z + Math.cos(car.heading) * 7;
      for (const other of this.cars) {
        if (other === car) continue;
        if (Math.hypot(other.x - fx, other.z - fz) < 4.2) { targetSpeed = 0; break; }
      }
      if (playerPos && Math.hypot(playerPos.x - fx, playerPos.z - fz) < 4) targetSpeed = 0;
      if (car.speed < targetSpeed) throttle = 0.55;
      else if (car.speed > targetSpeed + 1) throttle = -0.5;
      // Keep to the lane: steer gently back to lane centre.
      const laneCoord = ai.vertical ? car.x - (ai.road + ai.lane) : car.z - (ai.road + ai.lane);
      const steer = clamp(-laneCoord * 0.04, -0.25, 0.25);
      car.applyDrive(dt, throttle, steer * 2, false);
      // Wrap around the city edge so traffic never empties out.
      const lim = CONFIG.city.halfExtent + 18;
      if (car.x > lim) car.x = -lim;
      if (car.x < -lim) car.x = lim;
      if (car.z > lim) car.z = -lim;
      if (car.z < -lim) car.z = lim;
      car.honkTimer -= dt;
      if (car.honkTimer < 0) {
        car.honkTimer = randRange(6, 18);
        if (audio && playerPos && Math.hypot(car.x - playerPos.x, car.z - playerPos.z) < 16 && targetSpeed === 0) audio.horn();
      }
      if (car.damaged) this.smoke(car, dt);
    }
  }
  smoke(car, dt) {
    car.smokeTimer -= dt;
    if (car.smokeTimer > 0) return;
    car.smokeTimer = 0.12;
    if (!this._smokeGeo) {
      this._smokeGeo = new THREE.SphereGeometry(0.5, 6, 6);
      this._smokeMat = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.55 });
      this._puffs = [];
    }
    const puff = new THREE.Mesh(this._smokeGeo, this._smokeMat);
    puff.position.set(car.x, 1.6, car.z);
    puff.userData.life = 1;
    this.scene.add(puff);
    this._puffs.push(puff);
    for (let i = this._puffs.length - 1; i >= 0; i -= 1) {
      const p = this._puffs[i];
      p.userData.life -= dt * 1.4;
      p.position.y += dt * 2.2;
      p.scale.multiplyScalar(1 + dt * 1.6);
      if (p.userData.life <= 0) { this.scene.remove(p); this._puffs.splice(i, 1); }
    }
  }
  all() { return this.cars; }
  freeCarsNear(x, z, maxDist) {
    return this.cars.filter((car) => !car.driver && Math.hypot(car.x - x, car.z - z) < (maxDist || 30));
  }
  fastestParked() {
    let best = null;
    for (const car of this.cars) {
      if (!car.parked) continue;
      if (!best || car.stats.topSpeed > best.stats.topSpeed) best = car;
    }
    return best;
  }
  countByType() {
    const out = {};
    for (const car of this.cars) out[car.type] = (out[car.type] || 0) + 1;
    return out;
  }
  wreckCount() {
    return this.cars.filter((car) => car.wrecked).length;
  }
  removeCar(car) {
    const idx = this.cars.indexOf(car);
    if (idx >= 0) this.cars.splice(idx, 1);
    car.dispose(this.scene);
  }
}
export function collideVehicleWithWorld(vehicle, world) {
  const hit = world.collides(vehicle.x, vehicle.z, 1.35);
  if (hit) {
    const impact = Math.abs(vehicle.speed);
    if (impact > 6) vehicle.damage((impact - 5) * 1.6);
    vehicle.x -= Math.sin(vehicle.heading) * vehicle.speed * 0.03;
    vehicle.z -= Math.cos(vehicle.heading) * vehicle.speed * 0.03;
    vehicle.speed = -vehicle.speed * 0.28;
    vehicle.syncMesh(0.016);
    return impact;
  }
  const lim = CONFIG.city.halfExtent + 26;
  vehicle.x = clamp(vehicle.x, -lim, CONFIG.city.waterStartX - 4);
  vehicle.z = clamp(vehicle.z, -lim, lim);
  return 0;
}
export function collideVehicles(a, list) {
  let impact = 0;
  for (const other of list) {
    if (other === a) continue;
    const d = Math.hypot(other.x - a.x, other.z - a.z);
    if (d < 3.1 && d > 0.001) {
      const push = (3.1 - d) / 2;
      const nx = (a.x - other.x) / d;
      const nz = (a.z - other.z) / d;
      a.x += nx * push;
      a.z += nz * push;
      other.x -= nx * push;
      other.z -= nz * push;
      impact = Math.max(impact, Math.abs(a.speed - other.speed));
      if (impact > 5) { a.damage(impact * 0.9); other.damage(impact * 0.7); }
      a.speed *= 0.45;
      other.speed *= 0.55;
      other.syncMesh(0.016);
    }
  }
  return impact;
}
