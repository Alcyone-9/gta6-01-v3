// Story campaign: ten jobs for Vera Solano across Coral City, each with
// named original characters, dialogue, a world marker and a cash payout.
// Job types: deliver, pickup, collect, race, pristine, escape, tow, finale.
export const CHARACTERS = {
  marina: { name: 'Marina Vale', role: 'Cafe owner, first client', color: 0xffd166 },
  dario: { name: 'Dario Flint', role: 'Harbor dispatcher', color: 0x4cc9f0 },
  sol: { name: 'Sol Benitez', role: 'Retired racer', color: 0x06d6a0 },
  priya: { name: 'Priya Nair', role: 'Clinic courier chief', color: 0xf72585 },
  hank: { name: 'Hank Mercer', role: 'Tow yard owner', color: 0xffb703 },
  luna: { name: 'Luna Park', role: 'Night market singer', color: 0xb5179e },
  omar: { name: 'Omar Haddad', role: 'Gallery mover', color: 0x90be6d },
};
export const MISSIONS = [
  {
    id: 'first-run', title: 'First Run', giver: 'marina', pay: 180, type: 'deliver', timeLimit: 95,
    start: { x: -126, z: 150 }, target: { x: 150, z: -42 }, needVehicle: false,
    intro: [
      ['Marina Vale', 'Vera, thank the tide. My cafe cooler died and the ice is melting.'],
      ['Vera Solano', 'Point me at the crate, Marina. I drive faster than ice melts.'],
      ['Marina Vale', 'Take this chilled crate to the beach kiosk before the timer runs out.'],
    ],
    outro: [['Marina Vale', 'Still cold. You just saved the lunch rush, Vera.']],
    objective: 'Deliver the chilled crate to the beach kiosk',
  },
  {
    id: 'harbor-pickup', title: 'Harbor Pickup', giver: 'dario', pay: 220, type: 'pickup', timeLimit: 110,
    start: { x: -126, z: 126 }, target: { x: 126, z: 126 }, drop: { x: -42, z: -126 }, needVehicle: true,
    intro: [
      ['Dario Flint', 'A ferry mechanic is stranded at the east pier with our only pump part.'],
      ['Vera Solano', 'Pick him up and bring him back to the harbor office. On it.'],
    ],
    outro: [['Dario Flint', 'Pump fixed, ferries running. The harbor owes you one.']],
    objective: 'Pick up the mechanic, then drive him to the harbor office',
  },
  {
    id: 'lost-cargo', title: 'Lost Cargo', giver: 'dario', pay: 260, type: 'collect', timeLimit: 150,
    start: { x: -42, z: -126 }, target: { x: 42, z: 42 }, needVehicle: false,
    collectPoints: [{ x: -84, z: 0 }, { x: 42, z: 42 }, { x: 126, z: -84 }],
    intro: [
      ['Dario Flint', 'A delivery trike tipped over and scattered three crates across downtown.'],
      ['Vera Solano', 'Three crates, no excuses. I will sweep the blocks.'],
    ],
    outro: [['Dario Flint', 'Every crate accounted for. Nothing walks off my docks again.']],
    objective: 'Recover 3 scattered crates around the city',
  },
  {
    id: 'clinic-dash', title: 'Clinic Dash', giver: 'priya', pay: 300, type: 'deliver', timeLimit: 80,
    start: { x: 84, z: -42 }, target: { x: 190, z: -190 }, needVehicle: true,
    intro: [
      ['Priya Nair', 'The clinic needs this vaccine cooler now, not after traffic clears.'],
      ['Vera Solano', 'Traffic will move. It always does when I lean on the horn.'],
    ],
    outro: [['Priya Nair', 'Cold chain intact. The clinic staff send their thanks.']],
    objective: 'Rush the vaccine cooler to the hospital',
  },
  {
    id: 'sunset-circuit', title: 'Sunset Circuit', giver: 'sol', pay: 340, type: 'race', timeLimit: 120,
    start: { x: -126, z: -42 }, target: { x: -168, z: -168 }, needVehicle: true,
    checkpoints: [{ x: -168, z: -168 }, { x: 0, z: -168 }, { x: 168, z: -84 }, { x: 168, z: 84 }, { x: 0, z: 168 }, { x: -126, z: -42 }],
    intro: [
      ['Sol Benitez', 'My old circuit, five gates around the grid. Beat the clock and it pays.'],
      ['Vera Solano', 'Your records are about to become history, Sol.'],
    ],
    outro: [['Sol Benitez', 'Clean lines, no shortcuts through the palms. Superb.']],
    objective: 'Hit every race checkpoint before time runs out',
  },
  {
    id: 'gallery-piece', title: 'Fragile Freight', giver: 'omar', pay: 380, type: 'pristine', timeLimit: 150,
    start: { x: 42, z: -42 }, target: { x: -168, z: 84 }, needVehicle: true, maxDamage: 78,
    intro: [
      ['Omar Haddad', 'One sculpture, one careful driver. Arrive with the car nearly untouched.'],
      ['Vera Solano', 'Slow hands, soft brakes. The sculpture rides like royalty.'],
    ],
    outro: [['Omar Haddad', 'Not a scratch on the crate. The gallery will call again.']],
    objective: 'Deliver the sculpture without wrecking the car (keep health above 78)',
  },
  {
    id: 'hot-package', title: 'Hot Package', giver: 'luna', pay: 420, type: 'escape', timeLimit: 170,
    start: { x: 126, z: 42 }, target: { x: -196, z: -196 }, needVehicle: true, startHeat: 150,
    intro: [
      ['Luna Park', 'Those men took my stage royalties. I grabbed the ledger back, now they chase me.'],
      ['Vera Solano', 'Get in. Lose the heat first, then we reach the police HQ and hand it in.'],
    ],
    outro: [['Luna Park', 'Ledger delivered, royalties safe. You drive like a chorus, Vera.']],
    objective: 'Lose your wanted level, then reach police HQ with the ledger',
  },
  {
    id: 'tow-duty', title: 'Tow Duty', giver: 'hank', pay: 400, type: 'tow', timeLimit: 160,
    start: { x: 168, z: -126 }, target: { x: 84, z: -168 }, drop: { x: 168, z: -126 }, needVehicle: false,
    intro: [
      ['Hank Mercer', 'A coupe died by the east blocks. Take my tow truck, hook it, haul it home.'],
      ['Vera Solano', 'One dead coupe, delivered to the yard. Consider it done.'],
    ],
    outro: [['Hank Mercer', 'Hooked and hauled without a new dent. Fine work.']],
    objective: 'Take the tow truck, reach the stranded coupe, then return to the yard',
  },
  {
    id: 'night-market', title: 'Night Market Run', giver: 'luna', pay: 460, type: 'collect', timeLimit: 160,
    start: { x: -42, z: 42 }, target: { x: 84, z: 126 }, needVehicle: false,
    collectPoints: [{ x: -126, z: 84 }, { x: 0, z: -42 }, { x: 84, z: 126 }],
    intro: [
      ['Luna Park', 'Three stallholders hold my stage gear. Collect it before the market opens.'],
      ['Vera Solano', 'Speakers, lights, costume trunk. I will gather the whole show.'],
    ],
    outro: [['Luna Park', 'The show goes on tonight, and you are on the guest list forever.']],
    objective: 'Collect 3 pieces of stage gear for Luna',
  },
  {
    id: 'coral-heat', title: 'Coral Heat', giver: 'marina', pay: 900, type: 'finale', timeLimit: 240,
    start: { x: -150, z: 126 }, target: { x: 168, z: 168 }, drop: { x: -196, z: -196 }, needVehicle: true, startHeat: 90,
    checkpoints: [{ x: 16, z: 16 }, { x: 168, z: 168 }],
    intro: [
      ['Marina Vale', 'One last run, Vera. The tide festival fund, the whole season in one case.'],
      ['Dario Flint', 'Every crew in Coral City trusts you with this. That says everything.'],
      ['Vera Solano', 'Then I finish it. Festival fund to the pier, then straight to HQ.'],
    ],
    outro: [
      ['Marina Vale', 'The festival is saved. Coral City runs on people like you.'],
      ['Vera Solano', 'It runs on all of us. I just hold the wheel.'],
    ],
    objective: 'Finale: reach the pier checkpoint, then deliver the festival fund to police HQ',
  },
];
export class MissionSystem {
  constructor() {
    this.index = 0;
    this.active = null;
    this.stage = 0;
    this.collected = 0;
    this.timeLeft = 0;
    this.dialogue = null;
    this.dialogueLine = 0;
    this.dialogueAfter = null;
    this.finishedStory = false;
    this.completed = [];
    this.startVehicleHealth = 100;
  }
  current() {
    return MISSIONS[this.index] || null;
  }
  startDialogue(lines, after) {
    this.dialogue = lines;
    this.dialogueLine = 0;
    this.dialogueAfter = after || null;
    return lines[0];
  }
  advanceDialogue() {
    if (!this.dialogue) return null;
    this.dialogueLine += 1;
    if (this.dialogueLine >= this.dialogue.length) {
      const after = this.dialogueAfter;
      this.dialogue = null;
      this.dialogueLine = 0;
      this.dialogueAfter = null;
      return { done: true, after };
    }
    return { done: false, line: this.dialogue[this.dialogueLine] };
  }
  dialogueCurrent() {
    if (!this.dialogue) return null;
    const line = this.dialogue[this.dialogueLine];
    return { speaker: line[0], text: line[1], index: this.dialogueLine, total: this.dialogue.length };
  }
  begin(mission, playerVehicle) {
    this.active = mission;
    this.stage = 0;
    this.collected = 0;
    this.timeLeft = mission.timeLimit || 0;
    this.startVehicleHealth = playerVehicle ? playerVehicle.health : 100;
    return mission;
  }
  cancel() {
    this.active = null;
    this.stage = 0;
    this.collected = 0;
    this.timeLeft = 0;
  }
  targetFor() {
    const m = this.active;
    if (!m) {
      const next = this.current();
      return next ? { x: next.start.x, z: next.start.z, label: 'Next job: ' + next.title } : null;
    }
    if (m.type === 'collect') {
      const point = (m.collectPoints || [])[this.collected];
      return point ? { x: point.x, z: point.z, label: m.objective + ' (' + this.collected + '/' + m.collectPoints.length + ')' } : null;
    }
    if (m.type === 'race' || (m.type === 'finale' && this.stage < (m.checkpoints || []).length)) {
      const points = m.checkpoints || [];
      const point = points[this.stage];
      if (point) return { x: point.x, z: point.z, label: m.objective + ' - gate ' + (this.stage + 1) + '/' + points.length };
    }
    if ((m.type === 'pickup' || m.type === 'tow') && this.stage === 0) return { x: m.target.x, z: m.target.z, label: m.objective };
    if ((m.type === 'pickup' || m.type === 'tow') && this.stage >= 1) return { x: m.drop.x, z: m.drop.z, label: m.objective };
    if (m.type === 'finale') return { x: m.drop.x, z: m.drop.z, label: m.objective };
    return { x: m.target.x, z: m.target.z, label: m.objective };
  }
  update(dt) {
    if (this.active && this.timeLeft > 0) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) return { failed: true, reason: 'Time ran out.' };
    }
    return null;
  }
  reachTarget(player, police, playerVehicle) {
    const m = this.active;
    if (!m) return null;
    if (m.type === 'collect') {
      this.collected += 1;
      if (this.collected >= (m.collectPoints || []).length) return this.complete();
      return { progress: true, message: 'Collected ' + this.collected + ' of ' + m.collectPoints.length };
    }
    if (m.type === 'race') {
      this.stage += 1;
      if (this.stage >= (m.checkpoints || []).length) return this.complete();
      return { progress: true, message: 'Checkpoint ' + this.stage + ' cleared' };
    }
    if (m.type === 'pickup' || m.type === 'tow') {
      if (this.stage === 0) {
        this.stage = 1;
        return { progress: true, message: m.type === 'tow' ? 'Coupe hooked. Haul it to the yard.' : 'Passenger aboard. Drive to the drop-off.' };
      }
      return this.complete();
    }
    if (m.type === 'pristine') {
      const health = playerVehicle ? playerVehicle.health : 0;
      if (!playerVehicle) return { failed: true, reason: 'The sculpture must arrive by car.' };
      if (health < (m.maxDamage || 70)) return { failed: true, reason: 'The car took too much damage for the fragile freight.' };
      return this.complete();
    }
    if (m.type === 'escape') {
      if (police && police.stars > 0) return { blocked: true, message: 'Lose the police first, then reach HQ.' };
      return this.complete();
    }
    if (m.type === 'finale') {
      if (this.stage < (m.checkpoints || []).length) {
        this.stage += 1;
        return { progress: true, message: 'Pier checkpoint cleared. Now deliver to HQ.' };
      }
      return this.complete();
    }
    return this.complete();
  }
  complete() {
    const m = this.active;
    if (!m) return null;
    this.completed.push(m.id);
    this.active = null;
    this.index += 1;
    this.stage = 0;
    this.collected = 0;
    this.timeLeft = 0;
    if (this.index >= MISSIONS.length) this.finishedStory = true;
    return { completed: true, mission: m, pay: m.pay };
  }
  fail(reason) {
    const m = this.active;
    this.cancel();
    return { failed: true, mission: m, reason: reason || 'Job failed.' };
  }
  objectiveText() {
    const m = this.active;
    if (m) {
      const timer = this.timeLeft > 0 ? ' - ' + Math.ceil(this.timeLeft) + 's' : '';
      return m.title + ': ' + m.objective + timer;
    }
    const next = this.current();
    if (next) return 'Go to the gold marker to start: ' + next.title + ' (for ' + CHARACTERS[next.giver].name + ')';
    return 'Story complete. Free roam Coral City, find the golden cassettes.';
  }
  hintFor() {
    const m = this.active || this.current();
    if (!m) return 'Free roam: hunt cassettes, or restart the chain from the menu.';
    const hints = {
      deliver: 'Any car works. Beat the timer, keep the cooler cold.',
      pickup: 'Stop beside the passenger, then follow the marker to the drop.',
      collect: 'Crates glow gold on the minimap edge: sweep them in any order shown.',
      race: 'Cut corners on empty sidewalks, brake late, never handbrake on straights.',
      pristine: 'Health is the cargo. Coast to corners and let traffic pass first.',
      escape: 'Break line of sight, hide until stars fade, then roll to HQ.',
      tow: 'The tow truck spawns beside Hank. Hook the coupe by reaching it.',
      finale: 'Pier first, HQ second. Save your handbrake for the last blocks.',
    };
    return hints[m.type] || 'Follow the gold marker.';
  }
  totalPayAvailable() {
    return MISSIONS.reduce((sum, m) => sum + m.pay, 0);
  }
  earnedSoFar() {
    return MISSIONS.filter((m) => this.completed.includes(m.id)).reduce((sum, m) => sum + m.pay, 0);
  }
  serialize() {
    return { index: this.index, completed: this.completed.slice(), finishedStory: this.finishedStory };
  }
  restore(data) {
    if (!data) return;
    this.index = Math.min(MISSIONS.length, data.index || data.missionIndex || 0);
    this.completed = Array.isArray(data.completed) ? data.completed.slice() : (Array.isArray(data.completedJobs) ? data.completedJobs.slice() : []);
    this.finishedStory = Boolean(data.finishedStory) || this.index >= MISSIONS.length;
  }
}
