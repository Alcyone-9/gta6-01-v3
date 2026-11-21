// DOM HUD and the canvas minimap: cash, health, stars, clock, objective,
// dialogue, banners, menus, pause, help, busted and wasted overlays.
import { CONFIG } from './config.js';
import { formatMoney, formatClock, clamp } from './random.js';
function el(id) { return document.getElementById(id); }
export class Hud {
  constructor() {
    this.moneyEl = el('hud-money');
    this.healthFill = el('health-fill');
    this.vehicleFill = el('vehicle-fill');
    this.starsEl = el('hud-stars');
    this.clockEl = el('hud-clock');
    this.objectiveEl = el('hud-objective');
    this.bannerEl = el('banner');
    this.toastEl = el('toast');
    this.dialogueEl = el('dialogue');
    this.dialogueName = el('dialogue-name');
    this.dialogueText = el('dialogue-text');
    this.dialogueHint = el('dialogue-hint');
    this.bustWrap = el('bust-wrap');
    this.bustFill = el('bust-fill');
    this.cassetteEl = el('hud-cassettes');
    this.speedEl = el('hud-speed');
    this.minimap = el('minimap');
    this.minimapCtx = this.minimap ? this.minimap.getContext('2d') : null;
    this.bannerTimer = 0;
    this.toastTimer = 0;
    this.damageVignette = el('damage-vignette');
  }
  showBanner(text, seconds) {
    if (!this.bannerEl) return;
    this.bannerEl.textContent = text;
    this.bannerEl.classList.add('show');
    this.bannerTimer = seconds || 3.2;
  }
  showToast(text, seconds) {
    if (!this.toastEl) return;
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.toastTimer = seconds || 2.6;
  }
  update(dt, state) {
    this.bannerTimer -= dt;
    this.toastTimer -= dt;
    if (this.bannerTimer <= 0 && this.bannerEl) this.bannerEl.classList.remove('show');
    if (this.toastTimer <= 0 && this.toastEl) this.toastEl.classList.remove('show');
    if (this.moneyEl) this.moneyEl.textContent = formatMoney(state.money);
    if (this.healthFill) this.healthFill.style.width = clamp(state.health, 0, 100) + '%';
    if (this.vehicleFill) {
      this.vehicleFill.style.width = state.vehicle ? clamp(state.vehicle.health, 0, 100) + '%' : '0%';
      this.vehicleFill.parentElement.style.opacity = state.vehicle ? '1' : '0.25';
    }
    if (this.starsEl) {
      const stars = state.stars || 0;
      this.starsEl.textContent = stars > 0 ? '★'.repeat(stars) + '☆'.repeat(5 - stars) : '';
      this.starsEl.classList.toggle('hot', stars >= 4);
    }
    if (this.clockEl) this.clockEl.textContent = formatClock(state.hour) + (state.night ? ' - night' : '');
    if (this.objectiveEl) this.objectiveEl.textContent = state.objective || '';
    if (this.cassetteEl) this.cassetteEl.textContent = 'Tapes ' + state.cassettes + '/10';
    if (this.speedEl) this.speedEl.textContent = state.vehicle ? Math.round(Math.abs(state.vehicle.speed) * 3.6) + ' km/h' : '';
    if (this.bustWrap && this.bustFill) {
      const show = state.bust > 1 && state.stars > 0;
      this.bustWrap.classList.toggle('show', show);
      this.bustFill.style.width = clamp(state.bust, 0, 100) + '%';
    }
    if (this.damageVignette) {
      const hurt = Math.max(state.hurtFlash || 0, state.health < 30 ? 0.35 : 0, state.vehicle && state.vehicle.health < 25 ? 0.3 : 0);
      this.damageVignette.style.opacity = String(clamp(hurt, 0, 0.85));
    }
  }
  showDialogue(line) {
    if (!this.dialogueEl) return;
    if (!line) { this.hideDialogue(); return; }
    this.dialogueEl.classList.add('show');
    this.dialogueName.textContent = line.speaker;
    this.dialogueText.textContent = line.text;
    this.dialogueHint.textContent = 'E / Enter - continue (' + (line.index + 1) + '/' + line.total + ')';
  }
  hideDialogue() {
    if (this.dialogueEl) this.dialogueEl.classList.remove('show');
  }
  drawMinimap(state) {
    const ctx = this.minimapCtx;
    if (!ctx || !this.minimap) return;
    const w = this.minimap.width;
    const h = this.minimap.height;
    const extent = CONFIG.city.halfExtent + 46;
    const scale = w / (extent * 2);
    const toX = (x) => (x + extent) * scale;
    const toY = (z) => (z + extent) * scale;
    ctx.fillStyle = '#101826';
    ctx.fillRect(0, 0, w, h);
    // Water and beach on the east edge.
    ctx.fillStyle = '#14586e';
    ctx.fillRect(toX(CONFIG.city.waterStartX), 0, w - toX(CONFIG.city.waterStartX), h);
    ctx.fillStyle = '#c9b458';
    ctx.fillRect(toX(CONFIG.city.beachStartX), 0, toX(CONFIG.city.waterStartX) - toX(CONFIG.city.beachStartX), h);
    // Blocks.
    ctx.fillStyle = '#2d3a2e';
    const pitch = CONFIG.city.blockPitch;
    for (let bx = -2; bx <= 2; bx += 1) {
      for (let bz = -2; bz <= 2; bz += 1) {
        const size = (pitch - CONFIG.city.roadWidth) * scale;
        ctx.fillRect(toX(bx * pitch) - size / 2, toY(bz * pitch) - size / 2, size, size);
      }
    }
    // Roads.
    ctx.strokeStyle = '#596270';
    ctx.lineWidth = Math.max(2, CONFIG.city.roadWidth * scale * 0.7);
    const roads = [];
    for (let k = -2; k <= 2; k += 1) roads.push(k * pitch + pitch / 2);
    roads.push(-2 * pitch - pitch / 2);
    for (const r of roads) {
      ctx.beginPath(); ctx.moveTo(toX(r), 0); ctx.lineTo(toX(r), h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, toY(r)); ctx.lineTo(w, toY(r)); ctx.stroke();
    }
    const dot = (x, z, color, radius) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(toX(x), toY(z), radius, 0, Math.PI * 2);
      ctx.fill();
    };
    if (state.cassetteNear) dot(state.cassetteNear.spot.x, state.cassetteNear.spot.z, '#ffd700', 3.4);
    for (const car of state.traffic || []) dot(car.x, car.z, '#aeb8c4', 1.6);
    for (const cruiser of state.cruisers || []) dot(cruiser.x, cruiser.z, '#3d7bff', 2.6);
    for (const officer of state.officers || []) dot(officer.x, officer.z, '#7fb0ff', 2);
    for (const ped of state.peds || []) dot(ped.x, ped.z, '#d9c8a9', 1.1);
    if (state.heli && state.stars >= 5) dot(state.heli.x, state.heli.z, '#ffffff', 3);
    if (state.target) {
      const pulse = 3.6 + Math.sin(performance.now() * 0.006) * 1.1;
      dot(state.target.x, state.target.z, '#ffd700', pulse);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(toX(state.target.x), toY(state.target.z), pulse + 3.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Player arrow.
    const px = toX(state.playerPos.x);
    const py = toY(state.playerPos.z);
    const heading = state.heading || 0;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(Math.sin(heading), -Math.cos(heading)) + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.4, 5);
    ctx.lineTo(0, 2.6);
    ctx.lineTo(-4.4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    // North marker and a scale bar so the map reads at a glance.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Verdana';
    ctx.fillText('N', w / 2 - 3, 13);
    ctx.beginPath();
    ctx.moveTo(w / 2, 16);
    ctx.lineTo(w / 2 - 4, 24);
    ctx.lineTo(w / 2 + 4, 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(8, h - 10, 42, 3);
    ctx.font = '9px Verdana';
    ctx.fillText('100 m', 8, h - 14);
    if (state.target) {
      const dist = Math.round(Math.hypot(state.target.x - state.playerPos.x, state.target.z - state.playerPos.z));
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 10px Verdana';
      ctx.fillText(dist + ' m', w - 44, h - 12);
    }
  }
}
export function setOverlay(id, show) {
  const node = el(id);
  if (node) node.classList.toggle('show', Boolean(show));
}
export function bindButton(id, handler) {
  const node = el(id);
  if (node) node.addEventListener('click', handler);
  return node;
}
