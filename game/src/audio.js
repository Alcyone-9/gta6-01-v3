// Procedural WebAudio: a looping synth groove plus every sound effect.
// Nothing is loaded from a file; oscillators and filtered noise do it all.
const BASSLINE = [55, 0, 55, 0, 65.41, 0, 55, 0, 49, 0, 49, 0, 73.42, 0, 61.74, 0];
const ARP = [220, 261.63, 329.63, 440, 329.63, 261.63, 293.66, 392, 329.63, 293.66, 261.63, 220, 246.94, 293.66, 369.99, 293.66];
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.step = 0;
    this.nextNoteTime = 0;
    this.timer = null;
    this.musicOn = true;
    this.started = false;
  }
  ensure() {
    if (this.ctx) {
      const now = performance.now();
      if (this.ctx.state === 'suspended' && now - (this._resumeAt || 0) > 1500) {
        this._resumeAt = now;
        this.ctx.resume();
      }
      return true;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.34;
      this.musicGain.connect(this.master);
      this.started = true;
      return true;
    } catch (err) {
      return false;
    }
  }
  startMusic() {
    if (!this.ensure()) return;
    if (this.timer) return;
    this.nextNoteTime = this.ctx.currentTime + 0.06;
    this.timer = window.setInterval(() => this.schedule(), 42);
  }
  stopMusic() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
  }
  toggleMusic() {
    this.musicOn = !this.musicOn;
    if (this.musicOn) this.startMusic();
    else this.stopMusic();
    return this.musicOn;
  }
  schedule() {
    if (!this.ctx || !this.musicOn) return;
    const stepDur = 60 / 112 / 2;
    while (this.nextNoteTime < this.ctx.currentTime + 0.14) {
      this.playStep(this.step, this.nextNoteTime, stepDur);
      this.nextNoteTime += stepDur;
      this.step = (this.step + 1) % 64;
    }
  }
  playStep(step, when, dur) {
    const barStep = step % 16;
    const bass = BASSLINE[barStep];
    if (bass) this.tone(bass, when, dur * 1.7, 'triangle', 0.32, this.musicGain);
    if (step % 2 === 0) {
      const arp = ARP[barStep];
      this.tone(arp * 2, when, dur * 0.8, 'square', 0.055, this.musicGain);
    }
    if (barStep % 4 === 2) this.hat(when, 0.05);
    if (barStep === 0 || barStep === 8) this.kick(when);
    if (barStep === 4 || barStep === 12) this.snare(when);
  }
  tone(freq, when, dur, type, volume, dest) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(gain);
    gain.connect(dest || this.master);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }
  noiseBuffer() {
    if (this._noise) return this._noise;
    const len = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    this._noise = buffer;
    return buffer;
  }
  noise(when, dur, volume, freq) {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq || 1800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(when);
    src.stop(when + dur + 0.02);
  }
  hat(when, volume) { this.noise(when, 0.05, volume, 6200); }
  kick(when) {
    if (!this.ctx) return;
    this.tone(120, when, 0.12, 'sine', 0.5, this.musicGain);
  }
  snare(when) { this.noise(when, 0.11, 0.16, 1600); }
  blip(freq, dur, volume, type) {
    if (!this.ensure()) return;
    const now = this.ctx.currentTime;
    this.tone(freq || 660, now, dur || 0.12, type || 'sine', volume || 0.22, this.master);
  }
  pickup() { this.blip(880, 0.1, 0.24, 'sine'); window.setTimeout(() => this.blip(1320, 0.14, 0.2, 'sine'), 70); }
  cash() { this.blip(1046, 0.09, 0.22, 'triangle'); window.setTimeout(() => this.blip(1568, 0.16, 0.22, 'triangle'), 80); }
  door() { this.blip(180, 0.09, 0.3, 'square'); }
  crash(strength) { if (this.ensure()) this.noise(this.ctx.currentTime, 0.22, Math.min(0.5, 0.18 + (strength || 0) * 0.03), 420); }
  shot() { if (this.ensure()) { this.noise(this.ctx.currentTime, 0.09, 0.3, 900); this.blip(140, 0.07, 0.24, 'sawtooth'); } }
  horn() { this.blip(392, 0.28, 0.2, 'square'); this.blip(330, 0.28, 0.16, 'square'); }
  success() { [523, 659, 784, 1046].forEach((f, i) => window.setTimeout(() => this.blip(f, 0.16, 0.22, 'triangle'), i * 90)); }
  fail() { [392, 330, 262, 196].forEach((f, i) => window.setTimeout(() => this.blip(f, 0.18, 0.22, 'triangle'), i * 110)); }
  bustedSting() { [220, 208, 196, 185].forEach((f, i) => window.setTimeout(() => this.blip(f, 0.22, 0.26, 'sawtooth'), i * 120)); }
  footstep(running) {
    if (!this.ensure()) return;
    this.noise(this.ctx.currentTime, 0.045, running ? 0.1 : 0.06, 700);
  }
  splash() {
    if (!this.ensure()) return;
    this.noise(this.ctx.currentTime, 0.4, 0.2, 900);
    this.blip(300, 0.3, 0.08, 'sine');
  }
  unlock() {
    this.blip(1180, 0.06, 0.18, 'square');
    window.setTimeout(() => this.blip(1180, 0.06, 0.18, 'square'), 110);
  }
  radioClick() {
    this.blip(1900, 0.03, 0.1, 'square');
  }
  checkpoint() {
    this.blip(740, 0.09, 0.2, 'triangle');
    window.setTimeout(() => this.blip(990, 0.13, 0.2, 'triangle'), 75);
  }
  tyreScreech(strength) {
    if (!this.ensure()) return;
    this.noise(this.ctx.currentTime, 0.16, Math.min(0.22, 0.08 + (strength || 0) * 0.02), 2600);
  }
  distantSirenPan() {
    // A soft two-tone swell used under the dispatch chatter on high stars.
    if (!this.ensure()) return;
    const now = this.ctx.currentTime;
    this.tone(660, now, 0.4, 'sine', 0.045, this.master);
    this.tone(520, now + 0.42, 0.4, 'sine', 0.045, this.master);
  }
  setEngine(speedRatio, running) {
    if (!this.ensure()) return;
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineOsc.type = 'sawtooth';
      this.engineGain.gain.value = 0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 480;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
    }
    const target = running ? 0.05 + Math.abs(speedRatio) * 0.07 : 0;
    this.engineOsc.frequency.setTargetAtTime(58 + Math.abs(speedRatio) * 150, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.09);
  }
  setSiren(active, distance) {
    if (!this.ensure()) return;
    if (active && !this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();
      this.sirenOsc.type = 'triangle';
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
    }
    if (!this.sirenOsc) return;
    const now = this.ctx.currentTime;
    if (active) {
      const wave = 720 + Math.sin(now * 5.2) * 190;
      this.sirenOsc.frequency.setTargetAtTime(wave, now, 0.05);
      const vol = Math.max(0, 0.12 - (distance || 0) * 0.0016);
      this.sirenGain.gain.setTargetAtTime(vol, now, 0.1);
    } else {
      this.sirenGain.gain.setTargetAtTime(0, now, 0.1);
    }
  }
}
