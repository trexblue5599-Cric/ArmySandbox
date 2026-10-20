// js/main.js  -  starts everything (in the right order) and runs the game loop
world.initCore();
world.initSky();
world.initTextures();
world.initRoads();
world.initBuildings();
world.initDistricts();
world.initOutskirts();
world.initBatches();
world.initTraffic();
world.initPeople();
world.initUpdate();
world.applyTime();

player.init();
initHud();
initMinimap();

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  player.update(dt);
  world.update(dt, player.soldier.position.x, player.soldier.position.z);
  updateCamera(dt);
  drawMinimap();
  updateHud();
  world.renderer.render(world.scene, world.camera);
}

addEventListener('resize', () => {
  world.camera.aspect = innerWidth / innerHeight;
  world.camera.updateProjectionMatrix();
  world.renderer.setSize(innerWidth, innerHeight);
});

world.camera.position.set(0, 5, -8);
loop();
