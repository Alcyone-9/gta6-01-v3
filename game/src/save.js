// localStorage save game: one slot, versioned, tolerant of old or broken data.
const SAVE_KEY = 'coral-city-heat-v3-save';
const SAVE_VERSION = 3;
export function defaultSave() {
  return {
    version: SAVE_VERSION,
    missionIndex: 0,
    money: 120,
    cassettes: [],
    completedJobs: [],
    player: { x: -168, z: 168, health: 100 },
    playSeconds: 0,
    finishedStory: false,
  };
}
export function hasSave() {
  try {
    return Boolean(window.localStorage.getItem(SAVE_KEY));
  } catch (err) {
    return false;
  }
}
export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== SAVE_VERSION) return null;
    const base = defaultSave();
    return {
      ...base,
      ...parsed,
      player: { ...base.player, ...(parsed.player || {}) },
      cassettes: Array.isArray(parsed.cassettes) ? parsed.cassettes : [],
      completedJobs: Array.isArray(parsed.completedJobs) ? parsed.completedJobs : [],
    };
  } catch (err) {
    return null;
  }
}
export function writeSave(data) {
  try {
    const payload = { ...defaultSave(), ...data, version: SAVE_VERSION, savedAt: Date.now() };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    return false;
  }
}
export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
    return true;
  } catch (err) {
    return false;
  }
}
export function exportSaveString() {
  try {
    return window.localStorage.getItem(SAVE_KEY) || '';
  } catch (err) {
    return '';
  }
}
export function importSaveString(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || parsed.version !== SAVE_VERSION) return false;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
    return true;
  } catch (err) {
    return false;
  }
}
export function saveAgeSeconds(data) {
  if (!data || !data.savedAt) return null;
  return Math.max(0, Math.round((Date.now() - data.savedAt) / 1000));
}
export function describeSave(data) {
  if (!data) return 'No saved game yet.';
  const jobs = Array.isArray(data.completedJobs) ? data.completedJobs.length : 0;
  const tapes = Array.isArray(data.cassettes) ? data.cassettes.length : 0;
  return 'Jobs done: ' + jobs + ' - Cassettes: ' + tapes + '/10 - Cash: $' + Math.round(data.money || 0);
}
