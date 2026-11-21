// Coral City Police Department: heat, stars, cruisers, foot officers,
// roadblocks with spike strips, a searchlight helicopter, and the BUSTED meter.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Vehicle, collideVehicleWithWorld, collideVehicles } from './vehicles.js';
import { buildPedestrianMesh } from './pedestrians.js';
import { clamp, randRange } from './random.js';
export class PoliceSystem {
  constructor(scene, world, traffic) {
    this.scene = scene;
    this.world = world;
    this.traffic = traffic;
    this.heat = 0;
    this.stars = 0;
    this.bust = 0;
    this.cruisers = [];
    this.officers = [];
    this.roadblocks = [];
    this.hiddenTimer = 0;
    this.spawnCooldown = 0;
    this.witnessCooldown = 0;
    this.heli = null;
    this.heliLight = null;
    this.buildHelicopter();
  }
  addHeat(amount, x, z) {
    this.heat = clamp(this.heat + amount, 0, CONFIG.police.starThresholds[5] + 60);
    this.lastCrimePos = { x, z };
  }
  computeStars() {
    const t = CONFIG.police.starThresholds;
    let stars = 0;
    for (let i = 1; i <= 5; i += 1) if (this.heat >= t[i]) stars = i;
    return stars;
  }
  clearHeat() {
    this.heat = 0;
    this.stars = 0;
    this.bust = 0;
    this.despawnAll();
  }
  buildHelicopter() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 6.4), new THREE.MeshLambertMaterial({ color: 0x1d3557 }));
    body.position.y = 0;
    group.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.6), new THREE.MeshLambertMaterial({ color: 0x1d3557 }));
    tail.position.set(0, 0.3, -5.2);
    group.add(tail);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.12, 0.7), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    rotor.position.y = 1.25;
    group.add(rotor);
    group.userData.rotor = rotor;
    const spot = new THREE.SpotLight(0xfff6c9, 0, 120, 0.32, 0.5, 1);
    spot.position.set(0, -1, 0);
    group.add(spot);
    group.add(spot.target);
    group.userData.spot = spot;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(5.2, 20), new THREE.MeshBasicMaterial({ color: 0xfff6c9, transparent: true, opacity: 0 }));
    disc.rotation.x = -Math.PI / 2;
    group.add(disc);
    group.userData.disc = disc;
    group.visible = false;
    this.scene.add(group);
    this.heli = group;
    this.heliLight = spot;
  }
  spawnCruiserNear(target) {
    const angle = randRange(0, Math.PI * 2);
    const dist = randRange(52, 68);
    const x = clamp(target.x + Math.cos(angle) * dist, -240, 250);
    const z = clamp(target.z + Math.sin(angle) * dist, -240, 240);
    const cruiser = new Vehicle(this.scene, 'cruiser', x, z, Math.atan2(target.x - x, target.z - z), {});
    cruiser.ai = { pursuit: true };
    this.cruisers.push(cruiser);
    return cruiser;
  }
  spawnOfficerNear(target) {
    const mesh = buildPedestrianMesh(0x1d3557, 0x14213d);
    const x = clamp(target.x + randRange(-9, 9), -245, 250);
    const z = clamp(target.z + randRange(-9, 9), -245, 245);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    const officer = { mesh, x, z, heading: 0, walkPhase: randRange(0, 5), speed: 5.6 };
    this.officers.push(officer);
    return officer;
  }
  buildRoadblock(target) {
    this.clearRoadblock();
    const heading = target.heading || 0;
    const aheadX = target.x + Math.sin(heading) * 34;
    const aheadZ = target.z + Math.cos(heading) * 34;
    const group = new THREE.Group();
    const cars = [];
    for (const offset of [-4.4, 4.4]) {
      const px = aheadX + Math.cos(heading) * offset;
      const pz = aheadZ - Math.sin(heading) * offset;
      const cruiser = new Vehicle(this.scene, 'cruiser', px, pz, heading + Math.PI / 2, { parked: true });
      cruiser.parked = true;
      cars.push(cruiser);
      this.cruisers.push(cruiser);
    }
    // Spike strip across the lane.
    const strip = new THREE.Mesh(new THREE.BoxGeometry(11, 0.16, 1.1), new THREE.MeshLambertMaterial({ color: 0xadb5bd }));
    strip.position.set(aheadX, 0.1, aheadZ);
    strip.rotation.y = heading;
    group.add(strip);
    this.scene.add(group);
    const cones = [];
    for (let i = -2; i <= 2; i += 1) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1, 8), new THREE.MeshLambertMaterial({ color: 0xfb8500 }));
      cone.position.set(aheadX + i * 3.4, 0.5, aheadZ + 2.4);
      this.scene.add(cone);
      cones.push(cone);
    }
    this.roadblocks.push({ x: aheadX, z: aheadZ, strip, group, cones, cars, spikeUsed: false });
  }
  clearRoadblock() {
    for (const block of this.roadblocks) {
      this.scene.remove(block.group);
      for (const cone of block.cones) this.scene.remove(cone);
      this.scene.remove(block.strip);
    }
    this.roadblocks = [];
  }
  despawnAll() {
    for (const cruiser of this.cruisers) cruiser.dispose(this.scene);
    this.cruisers = [];
    for (const officer of this.officers) this.scene.remove(officer.mesh);
    this.officers = [];
    this.clearRoadblock();
    if (this.heli) this.heli.visible = false;
  }
  despawnFar(target) {
    for (let i = this.cruisers.length - 1; i >= 0; i -= 1) {
      const c = this.cruisers[i];
      if (c.parked) continue;
      if (Math.hypot(c.x - target.x, c.z - target.z) > 150) {
        c.dispose(this.scene);
        this.cruisers.splice(i, 1);
      }
    }
    for (let i = this.officers.length - 1; i >= 0; i -= 1) {
      const o = this.officers[i];
      if (Math.hypot(o.x - target.x, o.z - target.z) > 90) {
        this.scene.remove(o.mesh);
        this.officers.splice(i, 1);
      }
    }
  }
  update(dt, player, audio, events) {
    const target = player.position;
    const targetSpeed = player.speed;
    const playerVehicle = player.vehicle;
    this.stars = this.computeStars();
    // Heat decays, faster when no police can see the player.
    const anyNear = this.cruisers.some((c) => Math.hypot(c.x - target.x, c.z - target.z) < 42)
      || this.officers.some((o) => Math.hypot(o.x - target.x, o.z - target.z) < 24);
    const decay = anyNear ? CONFIG.police.heatDecayPerSecond : CONFIG.police.heatDecayHiddenPerSecond;
    if (this.stars > 0) this.heat = Math.max(CONFIG.police.starThresholds[this.stars - 1] + 0.01, this.heat - 0);
    if (!anyNear && this.stars > 0) {
      this.hiddenTimer += dt;
      if (this.hiddenTimer > 3.5) this.heat = Math.max(0, this.heat - decay * dt);
    } else {
      this.hiddenTimer = 0;
    }
    this.stars = this.computeStars();
    if (this.stars === 0 && (this.cruisers.length || this.officers.length)) this.despawnAll();
    // Spawn to the star quota.
    this.spawnCooldown -= dt;
    const wantedCruisers = CONFIG.police.cruiserCountByStar[this.stars];
    const activeCruisers = this.cruisers.filter((c) => !c.parked).length;
    if (this.stars > 0 && activeCruisers < wantedCruisers && this.spawnCooldown <= 0) {
      this.spawnCruiserNear(target);
      this.spawnCooldown = 1.6;
    }
    const wantedOfficers = (!playerVehicle || playerVehicle.wrecked) ? CONFIG.police.footCountByStar[this.stars] : Math.max(0, CONFIG.police.footCountByStar[this.stars] - 2);
    if (this.stars >= 2 && this.officers.length < wantedOfficers && this.spawnCooldown <= 0) {
      this.spawnOfficerNear(target);
      this.spawnCooldown = 1.2;
    }
    if (this.stars >= CONFIG.police.roadblockMinStar && this.roadblocks.length === 0 && playerVehicle) {
      this.buildRoadblock({ x: target.x, z: target.z, heading: playerVehicle.heading });
    }
    if (this.stars < CONFIG.police.roadblockMinStar && this.roadblocks.length) {
      const parkedCars = this.roadblocks.flatMap((b) => b.cars);
      this.cruisers = this.cruisers.filter((c) => !parkedCars.includes(c));
      for (const c of parkedCars) c.dispose(this.scene);
      this.clearRoadblock();
    }
    // Cruiser pursuit.
    let nearestPoliceDist = 999;
    for (const cruiser of this.cruisers) {
      if (cruiser.parked) { cruiser.syncMesh(dt); continue; }
      const dx = target.x - cruiser.x;
      const dz = target.z - cruiser.z;
      const dist = Math.hypot(dx, dz);
      nearestPoliceDist = Math.min(nearestPoliceDist, dist);
      const desired = Math.atan2(dx, dz);
      let diff = desired - cruiser.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = clamp(diff * 1.7, -1, 1);
      let throttle = 1;
      if (dist < 7) throttle = 0.25;
      if (Math.abs(diff) > 2.4) throttle = -0.7;
      cruiser.applyDrive(dt, throttle, steer, false);
      const hitWorld = collideVehicleWithWorld(cruiser, this.world);
      const hitCars = collideVehicles(cruiser, this.traffic.all());
      if (playerVehicle && Math.hypot(playerVehicle.x - cruiser.x, playerVehicle.z - cruiser.z) < 3.4) {
        collideVehicles(cruiser, [playerVehicle]);
        if (Math.abs(cruiser.speed) > 8 && events.onRam) events.onRam(cruiser);
      }
      if ((hitWorld > 9 || hitCars > 11) && !cruiser.wrecked) cruiser.damage(6);
      cruiser.setHeadlights(true);
    }
    // Foot officers chase on foot.
    for (const officer of this.officers) {
      const dx = target.x - officer.x;
      const dz = target.z - officer.z;
      const dist = Math.hypot(dx, dz);
      nearestPoliceDist = Math.min(nearestPoliceDist, dist);
      if (dist > 1.4) {
        officer.heading = Math.atan2(dx, dz);
        const nx = officer.x + Math.sin(officer.heading) * officer.speed * dt;
        const nz = officer.z + Math.cos(officer.heading) * officer.speed * dt;
        if (!this.world.collides(nx, nz, 0.4)) { officer.x = nx; officer.z = nz; }
        officer.walkPhase += dt * 8;
      }
      officer.mesh.position.set(officer.x, 0, officer.z);
      officer.mesh.rotation.y = officer.heading;
      const parts = officer.mesh.userData.parts;
      const swing = Math.sin(officer.walkPhase) * 0.6;
      parts.legL.rotation.x = swing;
      parts.legR.rotation.x = -swing;
      parts.armL.rotation.x = -swing;
      parts.armR.rotation.x = swing;
    }
    // Spike strips.
    if (playerVehicle) {
      for (const block of this.roadblocks) {
        if (!block.spikeUsed && Math.hypot(playerVehicle.x - block.x, playerVehicle.z - block.z) < 5.4) {
          block.spikeUsed = true;
          playerVehicle.speed *= 0.32;
          playerVehicle.damage(9);
          if (events.onSpike) events.onSpike();
        }
      }
    }
    // Helicopter at five stars.
    const heliActive = this.stars >= CONFIG.police.helicopterMinStar;
    if (this.heli) {
      this.heli.visible = heliActive;
      if (heliActive) {
        const t = performance.now() * 0.0004;
        const hx = target.x + Math.cos(t) * 20;
        const hz = target.z + Math.sin(t) * 20;
        this.heli.position.set(hx, 30, hz);
        this.heli.lookAt(target.x, 0, target.z);
        this.heli.userData.rotor.rotation.y += dt * 28;
        const spot = this.heli.userData.spot;
        spot.intensity = 900;
        spot.target.position.set(target.x - hx, -30, target.z - hz);
        const disc = this.heli.userData.disc;
        disc.position.set(target.x - hx, -29.4, target.z - hz);
        disc.material.opacity = 0.16;
        nearestPoliceDist = Math.min(nearestPoliceDist, 30);
      }
    }
    // The BUSTED meter: fills while police are close and the player is slow or on foot.
    const vulnerable = !playerVehicle || targetSpeed < 3.2 || (playerVehicle && playerVehicle.wrecked);
    if (this.stars > 0 && vulnerable && nearestPoliceDist < CONFIG.police.bustRadius + 3.4) {
      this.bust = clamp(this.bust + CONFIG.police.bustFillPerSecond * dt, 0, 100);
    } else {
      this.bust = clamp(this.bust - CONFIG.police.bustDrainPerSecond * dt, 0, 100);
    }
    if (audio) audio.setSiren(this.stars > 0, nearestPoliceDist);
    this.despawnFar(target);
    return { nearestPoliceDist, busted: this.bust >= 100 };
  }
  dispatchLine() {
    // Short flavour lines the HUD can flash when the star level changes.
    const lines = {
      1: 'Dispatch: units, keep eyes on a courier near the last report.',
      2: 'Dispatch: cruiser responding, suspect vehicle described.',
      3: 'Dispatch: all nearby units join the pursuit.',
      4: 'Dispatch: roadblocks authorised, spike strips out.',
      5: 'Dispatch: citywide manhunt, air unit overhead.',
    };
    return lines[this.stars] || '';
  }
  starLabel() {
    const labels = ['Clean', 'Noticed', 'Pursued', 'Hunted', 'Manhunt', 'Citywide'];
    return labels[this.stars] || 'Clean';
  }
  nearestCruiserDistance(target) {
    let best = 999;
    for (const cruiser of this.cruisers) {
      const d = Math.hypot(cruiser.x - target.x, cruiser.z - target.z);
      if (d < best) best = d;
    }
    return best;
  }
  fineForBusted() {
    return CONFIG.police.bustFineBase + this.stars * 90;
  }
  fineForWasted() {
    return CONFIG.police.wastedFineBase + this.stars * 60;
  }
}
