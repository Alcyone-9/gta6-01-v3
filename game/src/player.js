// The hero, Vera Solano: on-foot movement, a follow camera, car entry,
// health and cash. Driving itself lives in vehicles.js; this file owns Vera.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { buildPedestrianMesh } from './pedestrians.js';
import { clamp } from './random.js';
export class Player {
  constructor(scene) {
    this.mesh = buildPedestrianMesh(0xef476f, 0x2b2d42);
    const start = CONFIG.player.startPosition;
    this.x = start.x;
    this.z = start.z;
    this.y = 0;
    this.heading = 0.6;
    this.cameraYaw = 0.6;
    this.cameraPitch = 0.32;
    this.health = CONFIG.player.maxHealth;
    this.money = CONFIG.player.startMoney;
    this.vehicle = null;
    this.walkPhase = 0;
    this.hurtFlash = 0;
    this.dead = false;
    this.stamina = 100;
    this.breathTimer = 0;
    this.swimming = false;
    this.mesh.position.set(this.x, 0, this.z);
    scene.add(this.mesh);
    this.name = 'Vera Solano';
  }
  get inVehicle() { return Boolean(this.vehicle); }
  get position() {
    if (this.vehicle) return this.vehicle.mesh.position;
    return this.mesh.position;
  }
  get speed() {
    if (this.vehicle) return Math.abs(this.vehicle.speed);
    return this._footSpeed || 0;
  }
  enterVehicle(vehicle) {
    this.vehicle = vehicle;
    vehicle.parked = false;
    vehicle.driver = this;
    this.mesh.visible = false;
  }
  exitVehicle() {
    if (!this.vehicle) return null;
    const vehicle = this.vehicle;
    vehicle.driver = null;
    this.vehicle = null;
    const sideX = Math.cos(vehicle.heading);
    const sideZ = -Math.sin(vehicle.heading);
    this.x = vehicle.x + sideX * 2.4;
    this.z = vehicle.z + sideZ * 2.4;
    this.mesh.visible = true;
    this.mesh.position.set(this.x, 0, this.z);
    return vehicle;
  }
  hurt(amount) {
    if (this.dead) return;
    this.health = Math.max(0, this.health - amount);
    this.hurtFlash = 1;
    if (this.health <= 0) this.dead = true;
  }
  heal(amount) {
    this.health = Math.min(CONFIG.player.maxHealth, this.health + (amount || 25));
    this.dead = this.health <= 0;
  }
  addMoney(amount) {
    this.money = Math.max(0, Math.round(this.money + amount));
    return this.money;
  }
  payFine(amount) {
    const paid = Math.min(this.money, Math.max(0, Math.round(amount)));
    this.money -= paid;
    return paid;
  }
  teleport(x, z, heading) {
    if (this.vehicle) this.exitVehicle();
    this.x = x;
    this.z = z;
    if (heading !== undefined) {
      this.heading = heading;
      this.cameraYaw = heading;
    }
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = this.heading;
  }
  updateOnFoot(dt, input, world) {
    const move = input.consumeMouse();
    this.cameraYaw -= move.dx * 0.0042;
    this.cameraPitch = clamp(this.cameraPitch + move.dy * 0.003, 0.08, 1.05);
    const forward = input.forwardAxis();
    const strafe = input.strafeAxis();
    const wantsRun = input.down('ShiftLeft') || input.down('ShiftRight');
    const moving = forward !== 0 || strafe !== 0;
    // Sprinting drains stamina; walking lets Vera catch her breath.
    if (wantsRun && moving && this.stamina > 1) {
      this.stamina = Math.max(0, this.stamina - dt * 16);
    } else {
      this.stamina = Math.min(100, this.stamina + dt * (moving ? 7 : 13));
    }
    const running = wantsRun && this.stamina > 2;
    this.swimming = this.x > 262;
    const speed = this.swimming ? 5.5 : running ? CONFIG.player.runSpeed : CONFIG.player.walkSpeed;
    this.breathTimer -= dt;
    if (running && moving && this.breathTimer <= 0) this.breathTimer = 0.34;
    let mx = 0;
    let mz = 0;
    const sin = Math.sin(this.cameraYaw);
    const cos = Math.cos(this.cameraYaw);
    mx += sin * forward + cos * strafe;
    mz += cos * forward - sin * strafe;
    const len = Math.hypot(mx, mz);
    this._footSpeed = 0;
    if (len > 0.01) {
      mx /= len;
      mz /= len;
      const nx = this.x + mx * speed * dt;
      const nz = this.z + mz * speed * dt;
      if (!world.collides(nx, this.z, CONFIG.player.radius)) this.x = nx;
      if (!world.collides(this.x, nz, CONFIG.player.radius)) this.z = nz;
      this.x = clamp(this.x, -252, 264);
      this.z = clamp(this.z, -252, 252);
      this.heading = Math.atan2(mx, mz);
      this.walkPhase += dt * speed * 1.7;
      this._footSpeed = speed;
    }
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    const parts = this.mesh.userData.parts;
    const swing = Math.sin(this.walkPhase) * (this._footSpeed > 0 ? 0.6 : 0);
    parts.legL.rotation.x = swing;
    parts.legR.rotation.x = -swing;
    parts.armL.rotation.x = -swing * 0.85;
    parts.armR.rotation.x = swing * 0.85;
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.4);
    return { forward, strafe };
  }
  cameraFor(rendererCamera, dt, speedRatio) {
    const target = this.position;
    const dist = this.inVehicle ? CONFIG.player.cameraDistance + 3.4 : CONFIG.player.cameraDistance;
    const height = this.inVehicle ? 5 : CONFIG.player.cameraHeight;
    if (this.inVehicle && this.vehicle) {
      // While driving the camera eases behind the car's heading.
      const behind = this.vehicle.heading + Math.PI;
      let diff = behind - this.cameraYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const ease = Math.abs(this.vehicle.speed) > 3 ? 1.9 : 0.6;
      this.cameraYaw += diff * Math.min(1, dt * ease);
      const move = this._lastMouse;
      if (move && (move.dx || move.dy)) this.cameraYaw -= move.dx * 0.0042;
    }
    const cx = target.x + Math.sin(this.cameraYaw) * -Math.cos(this.cameraPitch) * -dist * -1;
    // Simpler stable orbit: camera sits opposite the yaw direction.
    const ox = target.x - Math.sin(this.cameraYaw) * dist * Math.cos(this.cameraPitch);
    const oz = target.z - Math.cos(this.cameraYaw) * dist * Math.cos(this.cameraPitch);
    const oy = height + Math.sin(this.cameraPitch) * dist * 0.6;
    const smooth = Math.min(1, dt * 7);
    if (!this._camPos) this._camPos = new THREE.Vector3(ox, oy, oz);
    this._camPos.x += (ox - this._camPos.x) * smooth;
    this._camPos.y += (oy - this._camPos.y) * smooth;
    this._camPos.z += (oz - this._camPos.z) * smooth;
    rendererCamera.position.copy(this._camPos);
    rendererCamera.lookAt(target.x, target.y + 1.7, target.z);
    const targetFov = 62 + clamp(Math.abs(speedRatio || 0), 0, 1) * 13;
    if (Math.abs(rendererCamera.fov - targetFov) > 0.1) {
      rendererCamera.fov += (targetFov - rendererCamera.fov) * Math.min(1, dt * 5);
      rendererCamera.updateProjectionMatrix();
    }
    void cx;
  }
  noteMouse(dx, dy) {
    this._lastMouse = { dx, dy };
  }
}
