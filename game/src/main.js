// Coral City Heat v3 - boot, game loop and the state machine that ties
// every system together: menu, playing, paused, dialogue, busted, wasted,
// story complete. Crime hooks feed police heat; missions drive the story.
import * as THREE from 'three';
import { CONFIG, districtAt } from './config.js';
import { clamp, compassPoint } from './random.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { World } from './world.js';
import { Vehicle, TrafficSystem, collideVehicleWithWorld, collideVehicles } from './vehicles.js';
import { PedestrianSystem } from './pedestrians.js';
import { Player } from './player.js';
import { PoliceSystem } from './police.js';
import { MissionSystem, MISSIONS } from './missions.js';
import { Collectibles } from './collectibles.js';
import { Hud, setOverlay, bindButton } from './hud.js';
import { loadSave, writeSave, hasSave, describeSave, clearSave } from './save.js';
import { shotNameFromUrl, applyShotPose } from './shots.js';
class Game {
  constructor() {
    this.canvasHost = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.render.maxPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Shadows are authored on the meshes but the renderer keeps them off:
    // flat-shaded colour and the day-night rig carry the look, and skipping
    // the shadow pass keeps frame times low on modest hardware.
    this.renderer.shadowMap.enabled = false;
    this.canvasHost.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1400);
    this.camera.position.set(-190, 30, 210);
    this.camera.lookAt(0, 0, 0);
    this.input = new Input();
    this.audio = new AudioEngine();
    this.world = new World(this.scene);
    this.scene.background = this.world.skyColor;
    this.traffic = new TrafficSystem(this.scene, this.world);
    this.pedestrians = new PedestrianSystem(this.scene, this.world, 26);
    this.player = new Player(this.scene);
    this.police = new PoliceSystem(this.scene, this.world, this.traffic);
    this.missions = new MissionSystem();
    this.collectibles = new Collectibles(this.scene);
    this.hud = new Hud();
    this.marker = this.buildMarker();
    this.state = 'menu';
    this.hour = CONFIG.day.startHour;
    this.elapsed = 0;
    this.playSeconds = 0;
    this.lastTime = performance.now();
    this.heroCar = null;
    this.towTarget = null;
    this.ramCooldown = 0;
    this.crimeCooldown = 0;
    this.saveNote = '';
    this.setupMenu();
    this.resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this.resizeHandler);
  }
  buildMarker() {
    const group = new THREE.Group();
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.34 });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, CONFIG.missions.markerHeight, 18, 1, true), beamMat);
    beam.position.y = CONFIG.missions.markerHeight / 2;
    group.add(beam);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.18, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffd700 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.25;
    group.add(ring);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 2.2, 4), new THREE.MeshBasicMaterial({ color: 0xffd700 }));
    cone.rotation.x = Math.PI;
    cone.position.y = CONFIG.missions.markerHeight + 1.4;
    group.add(cone);
    group.userData.spin = [ring, cone];
    this.scene.add(group);
    return group;
  }
  setupMenu() {
    const save = loadSave();
    const note = document.getElementById('save-note');
    if (note) note.textContent = save ? describeSave(save) : 'No saved game yet. New Game starts Vera fresh in Coral City.';
    const cont = document.getElementById('btn-continue');
    if (cont) cont.disabled = !hasSave();
    bindButton('btn-new', () => { clearSave(); this.beginPlay(false); });
    bindButton('btn-continue', () => { this.beginPlay(false, true); });
    bindButton('btn-resume', () => this.setPaused(false));
    bindButton('btn-help-close', () => { setOverlay('help-screen', false); if (this.state === 'paused') setOverlay('pause-screen', true); });
    bindButton('btn-help', () => { setOverlay('help-screen', true); setOverlay('pause-screen', false); });
    bindButton('btn-quit-menu', () => { this.toMenu(); });
    bindButton('btn-again', () => { setOverlay('end-screen', false); this.beginPlay(false); });
  }
  toMenu() {
    this.state = 'menu';
    setOverlay('pause-screen', false);
    setOverlay('end-screen', false);
    setOverlay('start-screen', true);
    this.setupMenu();
  }
  beginPlay(fromShot, useSave) {
    setOverlay('start-screen', false);
    setOverlay('end-screen', false);
    setOverlay('pause-screen', false);
    setOverlay('respawn-screen', false);
    const save = useSave ? loadSave() : null;
    if (save) {
      this.missions.restore({ index: save.missionIndex, completed: save.completedJobs, finishedStory: save.finishedStory });
      this.collectibles.restore(save.cassettes);
      this.player.money = save.money;
      this.player.health = save.player.health || 100;
      this.player.teleport(save.player.x, save.player.z, 0.6);
      this.playSeconds = save.playSeconds || 0;
      this.hud.showBanner('Welcome back to Coral City', 2.6);
    } else if (!fromShot) {
      this.hud.showBanner('Coral City Heat - Job 1 awaits at the gold marker', 3.6);
    }
    this.state = 'playing';
    this.audio.ensure();
    this.audio.startMusic();
  }
  setHour(hour) {
    this.hour = ((hour % 24) + 24) % 24;
  }
  setPaused(paused) {
    if (paused && this.state === 'playing') {
      this.state = 'paused';
      setOverlay('pause-screen', true);
    } else if (!paused && this.state === 'paused') {
      this.state = 'playing';
      setOverlay('pause-screen', false);
    }
  }
  spawnHeroCar(type, x, z, heading) {
    const car = new Vehicle(this.scene, type || 'coupe', x, z, heading || 0, {});
    this.traffic.cars.push(car);
    this.heroCar = car;
    return car;
  }
  autosave() {
    const pos = this.player;
    writeSave({
      missionIndex: this.missions.index,
      money: this.player.money,
      cassettes: this.collectibles.serialize(),
      completedJobs: this.missions.completed.slice(),
      player: { x: pos.x, z: pos.z, health: Math.max(35, this.player.health) },
      playSeconds: Math.round(this.playSeconds),
      finishedStory: this.missions.finishedStory,
    });
  }
  showDialogue() {
    const line = this.missions.dialogueCurrent();
    this.hud.showDialogue(line);
    if (line) this.state = 'dialogue';
  }
  finishDialogue() {
    const result = this.missions.advanceDialogue();
    if (!result) { this.hud.hideDialogue(); return; }
    if (result.done) {
      this.hud.hideDialogue();
      this.state = 'playing';
      const after = result.after;
      if (after === 'begin-job') this.activateJob();
      if (after === 'job-done') this.celebrateJobDone();
    } else {
      this.hud.showDialogue(this.missions.dialogueCurrent());
    }
  }
  tryStartJob() {
    if (this.missions.active || this.missions.dialogue) return;
    const mission = this.missions.current();
    if (!mission) return;
    const pos = this.player.position;
    if (Math.hypot(pos.x - mission.start.x, pos.z - mission.start.z) > CONFIG.missions.interactRange + 2) {
      this.hud.showToast('Reach the gold marker to start: ' + mission.title, 2);
      return;
    }
    this.missions.startDialogue(mission.intro, 'begin-job');
    this.showDialogue();
    this.audio.blip(720, 0.12, 0.2, 'triangle');
  }
  activateJob() {
    const mission = this.missions.current();
    if (!mission) return;
    // Some jobs hand Vera a specific vehicle.
    if (mission.id === 'tow-duty') {
      const truck = this.spawnHeroCar('towtruck', mission.start.x + 6, mission.start.z + 4, 0.4);
      this.hud.showToast('Tow truck ready beside you', 2.6);
      void truck;
    }
    if (mission.id === 'gallery-piece' || mission.id === 'clinic-dash' || mission.id === 'hot-package' || mission.id === 'coral-heat') {
      if (!this.player.vehicle) this.spawnHeroCar('sedan', mission.start.x + 7, mission.start.z - 3, -0.5);
    }
    this.missions.begin(mission, this.player.vehicle);
    if (mission.startHeat) this.police.addHeat(mission.startHeat, this.player.position.x, this.player.position.z);
    this.hud.showBanner(mission.title + ' - ' + mission.objective, 4);
    this.audio.success();
  }
  celebrateJobDone() {
    this.autosave();
    if (this.missions.finishedStory) {
      this.state = 'complete';
      const stats = document.getElementById('end-stats');
      if (stats) stats.textContent = 'All 10 jobs done - Cash ' + this.player.money + ' - Cassettes ' + this.collectibles.count() + '/10 - Played ' + Math.round(this.playSeconds / 60) + ' min';
      setOverlay('end-screen', true);
    }
  }
  completeJobFlow(result) {
    const mission = result.mission;
    this.player.addMoney(result.pay);
    this.audio.cash();
    this.audio.success();
    this.police.heat = Math.max(0, this.police.heat - 40);
    this.hud.showBanner(mission.title + ' complete - earned $' + result.pay, 4.2);
    this.missions.startDialogue(mission.outro, 'job-done');
    this.showDialogue();
  }
  failJob(reason) {
    const result = this.missions.fail(reason);
    this.audio.fail();
    this.hud.showBanner('Job failed: ' + reason, 3.6);
    void result;
  }
  handleCrime(kind, x, z, amount) {
    if (this.crimeCooldown > 0 && kind === 'minor') return;
    this.police.addHeat(amount, x, z);
    if (kind !== 'minor') this.crimeCooldown = 0.7;
  }
  respawn(kind) {
    const isBusted = kind === 'busted';
    const fine = isBusted ? this.police.fineForBusted() : this.police.fineForWasted();
    const paid = this.player.payFine(fine);
    this.police.clearHeat();
    if (this.player.vehicle) this.player.exitVehicle();
    this.player.dead = false;
    this.player.heal(100);
    if (isBusted) {
      this.player.teleport(-196, -196, 0.8);
      this.hud.showBanner('BUSTED - released from CCPD HQ, fine $' + paid, 4);
      this.audio.bustedSting();
    } else {
      this.player.teleport(196, -186, -0.8);
      this.hud.showBanner('WASTED - patched up at Coral General, bill $' + paid, 4);
      this.audio.fail();
    }
    if (this.missions.active) this.failJob(isBusted ? 'Arrested mid-job.' : 'Hospitalised mid-job.');
    this.state = 'playing';
    this.autosave();
  }
  updatePlaying(dt) {
    this.playSeconds += dt;
    this.ramCooldown = Math.max(0, this.ramCooldown - dt);
    this.crimeCooldown = Math.max(0, this.crimeCooldown - dt);
    this.hour = (this.hour + (dt * 24) / CONFIG.day.cycleSeconds) % 24;
    const player = this.player;
    const input = this.input;
    // Pause and job keys.
    if (input.justPressed('KeyP') || input.justPressed('Escape')) { this.setPaused(true); return; }
    if (input.justPressed('KeyM')) {
      const on = this.audio.toggleMusic();
      this.hud.showToast(on ? 'Music on' : 'Music off', 1.4);
    }
    if (this.missions.dialogue) { this.showDialogue(); this.state = 'dialogue'; return; }
    // Driving or walking.
    let impact = 0;
    if (player.vehicle) {
      const car = player.vehicle;
      const throttle = input.forwardAxis();
      const steer = input.strafeAxis();
      const handbrake = input.down('Space');
      car.applyDrive(dt, throttle, -steer, handbrake);
      impact = collideVehicleWithWorld(car, this.world);
      const carHit = collideVehicles(car, this.traffic.all());
      impact = Math.max(impact, carHit);
      if (impact > 7) {
        this.audio.crash(impact);
        player.hurt(impact > 13 ? 5 : 0);
        this.handleCrime('crash', car.x, car.z, impact * 1.5);
        this.pedestrians.scareNear(car.x, car.z, 12, 0.8);
      }
      if (input.justPressed('KeyH')) this.audio.horn();
      if (input.justPressed('KeyE')) {
        player.exitVehicle();
        this.audio.door();
        this.audio.setEngine(0, false);
      }
      this.audio.setEngine(car.speedRatio(), true);
    } else {
      player.updateOnFoot(dt, input, this.world);
      this.audio.setEngine(0, false);
      if (input.justPressed('KeyE')) {
        const car = this.traffic.nearestCar(player.x, player.z, CONFIG.vehicles.enterRange, true);
        if (car) {
          const wasParkedTraffic = car.parked && !car.isPolice;
          player.enterVehicle(car);
          this.audio.door();
          if (wasParkedTraffic) this.handleCrime('theft', car.x, car.z, 26);
          if (car.isPolice) this.handleCrime('theft', car.x, car.z, 55);
        } else {
          this.tryStartJob();
        }
      }
      if (input.justPressed('KeyF')) this.tryStartJob();
    }
    if (player.vehicle && input.justPressed('KeyF')) this.tryStartJob();
    // Traffic, people, police.
    const threats = this.traffic.all().map((c) => ({ x: c.x, z: c.z, speed: Math.abs(c.speed) }));
    if (player.vehicle) threats.push({ x: player.vehicle.x, z: player.vehicle.z, speed: Math.abs(player.vehicle.speed) });
    this.traffic.update(dt, player.position, this.audio);
    this.pedestrians.update(dt, threats);
    const policeEvents = {
      onRam: () => {
        if (this.ramCooldown <= 0) {
          player.hurt(4);
          this.handleCrime('ram', player.position.x, player.position.z, 18);
          this.ramCooldown = 1;
          this.audio.crash(8);
        }
      },
      onSpike: () => { this.hud.showToast('Spike strip! Tyres shredded, speed cut', 2.4); this.audio.crash(6); },
    };
    const starsBefore = this._lastStars || 0;
    const policeResult = this.police.update(dt, player, this.audio, policeEvents);
    if (this.police.stars !== starsBefore) {
      this._lastStars = this.police.stars;
      if (this.police.stars > starsBefore && this.police.stars > 0) {
        this.hud.showToast(this.police.dispatchLine(), 3);
        if (this.police.stars >= 4) this.audio.distantSirenPan();
      }
      if (this.police.stars === 0 && starsBefore > 0) {
        this.hud.showToast('You lost the CCPD. Heat cleared.', 2.6);
      }
    }
    // District changes get a quiet toast so the city feels named, not generic.
    const district = districtAt(player.position.x, player.position.z);
    if (this._lastDistrict !== district.name) {
      if (this._lastDistrict) this.hud.showToast(district.name + ' - ' + district.blurb, 2.2);
      this._lastDistrict = district.name;
    }
    // Footsteps while running on foot, splashes at the waterline.
    if (!player.vehicle && player.speed > 4) {
      this._stepTimer = (this._stepTimer || 0) - dt;
      if (this._stepTimer <= 0) {
        this._stepTimer = player.speed > 11 ? 0.27 : 0.4;
        if (player.swimming) this.audio.splash();
        else this.audio.footstep(player.speed > 11);
      }
    }
    // Checkpoint ping for race-style progress.
    if (this._lastStage !== undefined && this.missions.active && this.missions.stage !== this._lastStage) {
      this.audio.checkpoint();
    }
    if (this.missions.active) this._lastStage = this.missions.stage;
    if (policeResult.busted) { this.state = 'busted'; this.respawn('busted'); return; }
    if (player.dead) { this.state = 'wasted'; this.respawn('wasted'); return; }
    // Speeding past cruisers and reckless hits feed heat slowly.
    if (player.vehicle && Math.abs(player.vehicle.speed) > 30 && this.police.cruisers.length) {
      this.handleCrime('minor', player.vehicle.x, player.vehicle.z, 4 * dt * 10);
    }
    // Collectibles.
    this.collectibles.update(dt, player.position, (item, count) => {
      const reward = this.collectibles.rewardFor(count);
      player.addMoney(reward);
      this.audio.pickup();
      this.hud.showBanner('Golden cassette ' + count + '/10 - +$' + reward, 2.8);
      if (count >= 10) this.hud.showToast('All cassettes found: collector bonus paid', 3.4);
      this.autosave();
    });
    // Missions.
    const missionTick = this.missions.update(dt);
    if (missionTick && missionTick.failed) { this.failJob(missionTick.reason); }
    const target = this.missions.targetFor();
    if (target) {
      this.marker.visible = true;
      this.marker.position.set(target.x, 0, target.z);
      const dist = Math.hypot(player.position.x - target.x, player.position.z - target.z);
      const nearJobStart = !this.missions.active;
      const reachDist = nearJobStart ? CONFIG.missions.interactRange : 5.2;
      if (dist < reachDist && !nearJobStart) {
        const result = this.missions.reachTarget(player, this.police, player.vehicle);
        if (result && result.completed) this.completeJobFlow(result);
        else if (result && result.failed) this.failJob(result.reason);
        else if (result && result.progress) { this.hud.showToast(result.message, 2.6); this.audio.pickup(); }
        else if (result && result.blocked) this.hud.showToast(result.message, 1.6);
      }
    } else {
      this.marker.visible = false;
    }
    // Tow job staging: arriving at the stranded coupe in the tow truck hooks it.
    if (this.missions.active && this.missions.active.id === 'tow-duty' && this.missions.stage === 0 && player.vehicle && player.vehicle.type !== 'towtruck') {
      this.hud.showToast('You need the tow truck for this job', 1.2);
    }
  }
  updateDialogue(dt) {
    void dt;
    if (this.input.justPressed('KeyE') || this.input.justPressed('Enter') || this.input.justPressed('Space')) this.finishDialogue();
  }
  renderOnce(dt) {
    const focus = this.player.position;
    const info = this.world.update(dt, this.hour, focus);
    const target = this.missions.targetFor();
    if (target) {
      this.marker.visible = true;
      this.marker.position.set(target.x, Math.sin(performance.now() * 0.002) * 0.15, target.z);
    } else {
      this.marker.visible = false;
    }
    for (const part of this.marker.userData.spin) part.rotation.z += dt * 1.4;
    const night = info.night;
    for (const car of this.traffic.all()) car.setHeadlights(night);
    for (const cruiser of this.police.cruisers) cruiser.setHeadlights(true);
    this.player.cameraFor(this.camera, Math.max(dt, 0.001), this.player.vehicle ? this.player.vehicle.speedRatio() : 0);
    const cassetteNear = this.collectibles.nearestUnfound(focus.x, focus.z, 65);
    this.hud.update(dt, {
      money: this.player.money,
      health: this.player.health,
      vehicle: this.player.vehicle,
      stars: this.police.stars,
      hour: this.hour,
      night,
      objective: this.state === 'menu' ? 'Coral City Heat' : this.missions.objectiveText() + '  [' + districtAt(focus.x, focus.z).name + ' ' + compassPoint(this.player.vehicle ? this.player.vehicle.heading : this.player.heading) + ']',
      cassettes: this.collectibles.count(),
      bust: this.police.bust,
      hurtFlash: this.player.hurtFlash,
    });
    if (this.state !== 'menu') {
      this.hud.drawMinimap({
        playerPos: { x: focus.x, z: focus.z },
        heading: this.player.vehicle ? this.player.vehicle.heading : this.player.heading,
        traffic: this.traffic.all().filter((c) => c !== this.player.vehicle),
        cruisers: this.police.cruisers,
        officers: this.police.officers,
        peds: [],
        target,
        cassetteNear,
        heli: this.police.heli ? { x: this.police.heli.position.x, z: this.police.heli.position.z } : null,
        stars: this.police.stars,
      });
    }
    this.renderer.render(this.scene, this.camera);
  }
  loop(now) {
    const dt = clamp((now - this.lastTime) / 1000, 0.001, 0.05);
    this.lastTime = now;
    this.elapsed += dt;
    if (this.state === 'playing') this.updatePlaying(dt);
    else if (this.state === 'dialogue') this.updateDialogue(dt);
    else if (this.state === 'paused') {
      if (this.input.justPressed('KeyP') || this.input.justPressed('Escape')) this.setPaused(false);
    }
    this.renderOnce(dt);
    this.input.endFrame();
    window.requestAnimationFrame((t) => this.loop(t));
  }
  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  start() {
    const shot = shotNameFromUrl();
    if (shot) {
      setOverlay('start-screen', false);
      applyShotPose(shot, this);
    }
    window.requestAnimationFrame((t) => { this.lastTime = t; this.loop(t); });
  }
}
const game = new Game();
game.start();
export { game, MISSIONS };
