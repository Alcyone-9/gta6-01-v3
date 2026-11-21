// Seeded random helpers: the city must look identical on every visit,
// so world generation draws from a fixed seed instead of Math.random.
let state = 1837465;
export function seedRandom(seed) {
  state = (seed >>> 0) || 1;
  return state;
}
export function rand() {
  // Mulberry-style step, kept tiny and deterministic.
  state += 0x6d2b79f5;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function randRange(min, max) {
  return min + rand() * (max - min);
}
export function randInt(min, max) {
  return Math.floor(randRange(min, max + 1));
}
export function pick(list) {
  if (!list.length) return null;
  return list[Math.floor(rand() * list.length) % list.length];
}
export function chance(probability) {
  return rand() < probability;
}
export function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
export function lerp(a, b, t) {
  return a + (b - a) * t;
}
export function distance2d(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.hypot(dx, dz);
}
export function angleLerp(a, b, t) {
  let diff = (b - a) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * clamp(t, 0, 1);
}
export function formatMoney(amount) {
  const rounded = Math.round(amount);
  return '$' + String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
export function easeInOut(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}
export function easeOut(t) {
  const x = clamp(t, 0, 1);
  return 1 - (1 - x) * (1 - x);
}
export function pulse(time, speed) {
  return 0.5 + 0.5 * Math.sin(time * (speed || 2));
}
export function wrapAngle(angle) {
  let out = angle % (Math.PI * 2);
  if (out > Math.PI) out -= Math.PI * 2;
  if (out < -Math.PI) out += Math.PI * 2;
  return out;
}
export function bearingTo(ax, az, bx, bz) {
  return Math.atan2(bx - ax, bz - az);
}
export function compassPoint(heading) {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(((heading % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 4)) % 8;
  return names[idx];
}
export function formatClock(hourFloat) {
  const h = Math.floor(hourFloat) % 24;
  const m = Math.floor((hourFloat - Math.floor(hourFloat)) * 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
