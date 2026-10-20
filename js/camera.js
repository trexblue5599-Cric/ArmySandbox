// js/camera.js  -  third-person camera that orbits the player and never goes inside buildings
const camTarget = new THREE.Vector3();
let camDist = 8;
function updateCamera(dt) {
  const p = player.soldier.position;
  const yaw = world.camYaw, pit = world.camPitch;
  const dirX = -Math.sin(yaw) * Math.cos(pit), dirZ = -Math.cos(yaw) * Math.cos(pit), dirY = Math.sin(pit);
  const maxD = player.wardrobeOpen ? 4.2 : 8;
  let d = maxD;
  for (let t = 1; t <= maxD; t += 0.5) {
    if (world.hitObstacle(p.x + dirX * t, p.z + dirZ * t, 2 + dirY * t, 0.5)) { d = Math.max(2.2, t - 1); break; }
  }
  camDist += (d - camDist) * Math.min(1, 8 * dt);
  camTarget.set(p.x + dirX * camDist, (player.wardrobeOpen ? 1.4 : 2) + dirY * camDist, p.z + dirZ * camDist);
  world.camera.position.lerp(camTarget, Math.min(1, 12 * dt));
  world.camera.lookAt(p.x, player.wardrobeOpen ? 0.4 : 1.6, p.z);
}
