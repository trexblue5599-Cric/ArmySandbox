// js/main.js  -  loads the dude, then starts everything (in the right order) and runs the game loop
function startGame() {
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
  fp.init();                // first-person camera + your arm
  initHud();
  initMinimap();
  wardrobe.init();
  interior.init();          // builds the inside of the house
  interior.spawnInside();   // you start inside the house

  const loading = document.getElementById('loading');
  if (loading) loading.remove();

  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    player.update(dt);
    interior.update(dt);
    world.update(dt, player.soldier.position.x, player.soldier.position.z);
    updateCamera(dt);
    drawMinimap();
    updateHud();
    fp.render(dt);            // draws the world, then your arm on top
  }

  addEventListener('resize', () => {
    world.camera.aspect = innerWidth / innerHeight;
    world.camera.updateProjectionMatrix();
    world.renderer.setSize(innerWidth, innerHeight);
  });

  world.camera.position.set(0, 5, -8);
  loop();
}

dude.load(startGame);   // starts the game even if dude.glb fails (simple stand-in people are used)
