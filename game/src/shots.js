// Deterministic screenshot poses for ?shot=<name>.
// Each pose stages the live game (never a mock-up), hides menus, renders a
// few stable frames and only then raises window.__shotReady.
export function shotNameFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('shot');
  } catch (err) {
    return null;
  }
}
export const SHOT_POSES = ['cover', 'drive', 'chase', 'mission'];
export function applyShotPose(name, game) {
  if (!SHOT_POSES.includes(name)) return false;
  game.beginPlay(true);
  game.setHour(17.4);
  if (name === 'cover') poseCover(game);
  if (name === 'drive') poseDrive(game);
  if (name === 'chase') poseChase(game);
  if (name === 'mission') poseMission(game);
  game.hud.showBanner('', 0);
  // Freeze the simulation so the staged frame is the frame that is shot:
  // the render loop still draws HUD and minimap, nothing moves or decays.
  game.state = 'paused';
  let frames = 0;
  const wait = () => {
    frames += 1;
    game.renderOnce(0.016);
    if (frames < 4) window.requestAnimationFrame(wait);
    else window.__shotReady = true;
  };
  window.requestAnimationFrame(wait);
  return true;
}
function poseCover(game) {
  // Vera stands mid-road on the north-south avenue, city vista ahead.
  game.player.teleport(-42, 24, 0);
  game.player.cameraYaw = 0;
  game.player.cameraPitch = 0.26;
  game.setHour(17.55);
  game.hud.showToast('Coral City at golden hour', 30);
}
function poseDrive(game) {
  game.setHour(15.2);
  const car = game.traffic.nearestCar(-42, 42, 90, false) || game.spawnHeroCar('coupe', -42, 46, 0.8);
  if (car.type !== 'coupe') {
    // Prefer a sporty shape for the driving shot.
  }
  car.x = -42;
  car.z = 60;
  car.heading = 0.12;
  car.speed = 19;
  car.parked = false;
  game.player.enterVehicle(car);
  game.player.cameraYaw = car.heading + Math.PI;
  game.player._camPos = null;
  game.hud.showToast('Solstice Coupe - W drive, Space handbrake', 30);
}
function poseChase(game) {
  game.setHour(13.4);
  // On the open avenue: roadblock ahead of the coupe, cruisers behind it.
  const car = game.spawnHeroCar('coupe', -42, -34, 0.08);
  car.speed = 17;
  game.player.enterVehicle(car);
  game.police.addHeat(230, car.x, car.z);
  game.police.stars = game.police.computeStars();
  game.police.buildRoadblock({ x: car.x, z: car.z, heading: car.heading });
  const spots = [[-46, -52], [-37, -56], [-42, -63]];
  for (const [sx, sz] of spots) {
    const cruiser = game.police.spawnCruiserNear({ x: car.x, z: car.z });
    cruiser.x = sx;
    cruiser.z = sz;
    cruiser.heading = 0.08;
    cruiser.speed = 14;
    cruiser.syncMesh(0.016);
  }
  game.police.bust = 46;
  game.player.cameraYaw = car.heading + Math.PI;
  game.player._camPos = null;
  game.hud.showToast('Wanted: lose them or get busted', 30);
}
function poseMission(game) {
  game.setHour(10.6);
  const mission = game.missions.current();
  if (mission) {
    // Stand on the open avenue near the giver, looking toward the gold marker.
    game.player.teleport(mission.start.x + 4, mission.start.z - 9, -0.42);
    game.player.cameraYaw = -0.42;
    game.player.cameraPitch = 0.3;
    game.player._camPos = null;
    game.missions.startDialogue(mission.intro, null);
    game.showDialogue();
  }
  game.hud.showToast('Story job available - gold marker', 30);
}
