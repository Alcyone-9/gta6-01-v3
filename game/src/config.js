// Coral City Heat v3 - central tuning constants.
// Every gameplay number lives here so balancing never hunts through systems.
export const CONFIG = {
  city: {
    blocksPerSide: 5,
    blockPitch: 84,
    roadWidth: 20,
    buildingInset: 7,
    sidewalkWidth: 4,
    halfExtent: 232,
    beachStartX: 238,
    waterStartX: 268,
    parkLotBlock: { bx: 2, bz: -2 },
  },
  day: {
    cycleSeconds: 240,
    startHour: 16.6,
    sunriseHour: 6,
    sunsetHour: 19,
    nightSky: 0x0b1026,
    daySky: 0x87ceeb,
    duskSky: 0xff9a5c,
  },
  player: {
    walkSpeed: 9,
    runSpeed: 15,
    radius: 0.55,
    maxHealth: 100,
    startMoney: 120,
    startPosition: { x: -168, z: 168 },
    cameraDistance: 9,
    cameraHeight: 4.2,
  },
  vehicles: {
    enterRange: 4.2,
    trafficCount: 14,
    parkedCount: 12,
    smokeHealthThreshold: 45,
    wreckedHealth: 0,
    maxHealth: 100,
  },
  police: {
    starThresholds: [0, 35, 80, 140, 210, 300],
    heatDecayPerSecond: 2.2,
    heatDecayHiddenPerSecond: 7,
    bustRadius: 5.2,
    bustFillPerSecond: 34,
    bustDrainPerSecond: 26,
    bustFineBase: 150,
    wastedFineBase: 200,
    cruiserCountByStar: [0, 1, 2, 3, 4, 5],
    footCountByStar: [0, 0, 1, 2, 3, 4],
    roadblockMinStar: 4,
    helicopterMinStar: 5,
  },
  economy: {
    cassetteRewardEach: 25,
    cassetteRewardAll: 500,
    towPay: 220,
  },
  missions: {
    interactRange: 5,
    markerHeight: 14,
  },
  render: {
    maxPixelRatio: 1.6,
    fogNearDay: 120,
    fogFarDay: 620,
    fogNearNight: 60,
    fogFarNight: 340,
    shadowMapSize: 1024,
  },
};
export const VEHICLE_TYPES = {
  sedan: { label: 'Marina Sedan', topSpeed: 34, accel: 15, brake: 30, handling: 2.1, health: 100, seats: 4 },
  coupe: { label: 'Solstice Coupe', topSpeed: 46, accel: 24, brake: 34, handling: 2.7, health: 85, seats: 2 },
  suv: { label: 'Palmetto SUV', topSpeed: 36, accel: 16, brake: 28, handling: 1.8, health: 130, seats: 5 },
  pickup: { label: 'Dockhand Pickup', topSpeed: 33, accel: 14, brake: 27, handling: 1.7, health: 125, seats: 3 },
  van: { label: 'Courier Van', topSpeed: 30, accel: 12, brake: 25, handling: 1.5, health: 140, seats: 3 },
  cruiser: { label: 'CCPD Cruiser', topSpeed: 43, accel: 22, brake: 34, handling: 2.5, health: 120, seats: 4 },
  towtruck: { label: 'Harbor Tow Truck', topSpeed: 31, accel: 13, brake: 28, handling: 1.6, health: 135, seats: 2 },
};
export const STAR_NAMES = ['Clean', 'Noticed', 'Pursued', 'Hunted', 'Manhunt', 'Citywide'];
export const DISTRICTS = [
  { name: 'Harbor Quarter', bx: -2, bz: 2, blurb: 'Docks, tow yards and the ferry office.' },
  { name: 'Marina Row', bx: 0, bz: 2, blurb: 'Cafes and the south promenade stalls.' },
  { name: 'Pier District', bx: 2, bz: 2, blurb: 'Beach kiosks under the cranes.' },
  { name: 'Old Market', bx: -2, bz: 0, blurb: 'Billboards, stalls and side streets.' },
  { name: 'Downtown', bx: 0, bz: 0, blurb: 'The fountain block, towers on every corner.' },
  { name: 'Palm Heights', bx: 2, bz: 0, blurb: 'Hotels facing the sand.' },
  { name: 'Northgate', bx: -2, bz: -2, blurb: 'Police HQ watches the north-west corner.' },
  { name: 'Gallery Mile', bx: 0, bz: -2, blurb: 'Galleries, clinics and careful drivers.' },
  { name: 'Coral General', bx: 2, bz: -2, blurb: 'The hospital and its courier depot.' },
];
export function districtAt(x, z) {
  const pitch = CONFIG.city.blockPitch;
  const bx = Math.max(-2, Math.min(2, Math.round(x / pitch)));
  const bz = Math.max(-2, Math.min(2, Math.round(z / pitch)));
  if (x > CONFIG.city.beachStartX) return { name: 'The Beach', blurb: 'Sand, lifeguard towers and moored boats.' };
  for (const d of DISTRICTS) if (d.bx === bx && d.bz === bz) return d;
  return DISTRICTS[4];
}
export const SIDE_HUSTLES = [
  { id: 'taxi', label: 'Beach taxi fares', payPerFare: 45, note: 'Stop near a waving pedestrian on the promenade.' },
  { id: 'delivery', label: 'Market parcel drops', payPerFare: 35, note: 'Stallholders pay for quick parcel hops.' },
  { id: 'valet', label: 'Hotel valet parking', payPerFare: 55, note: 'Park hotel cars in the lot without a scratch.' },
];
