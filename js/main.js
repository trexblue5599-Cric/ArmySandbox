// js/main.js  -  loads the dude, then starts everything (in the right order) and runs the game loop
function startGame() {
  world.initCore();
  world.initSky();
  world.initTextures();
  world.initRoads();
  world.initBuildings();
  world.initDistricts();
  world.initMap();          // farmland, lake, harbour, airport, roads outside the city
  world.initOutskirts();    // forests and mountains
  world.initFill();         // trees, bushes and paved slabs on the empty land
  world.initBatches();
  world.initTraffic();
  vehicleDrive.init();
  world.initPeople();
  world.initProps();        // .glb props from the props/ folder
  world.initVehicles();     // trains on the railway, boats on the water
  world.initGlow();         // street lamps glow at night
  world.initUpdate();
  world.applyTime();

  player.init();
  fp.init();                // first-person camera + your arm
  initHud();
  initMinimap();
  wardrobe.init();
  interior.init();          // builds the inside of the house
  world.initGrass();        // grass texture on every grass ground (after the house lawn exists)
  interior.spawnInside();   // you start inside the house

  const loading = document.getElementById('loading');
  if (loading) loading.remove();

  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    vehicleDrive.update(dt);
    if (!vehicleDrive.active) player.update(dt);
    interior.update(dt);
    const ref = vehicleDrive.active ? vehicleDrive.active.root.position : player.soldier.position;
    world.update(dt, ref.x, ref.z);
    world.updateVehicles(dt);
    if (vehicleDrive.active) vehicleDrive.updateCamera(dt); else updateCamera(dt);
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
