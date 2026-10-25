// js/main.js  -  loads the dude, then starts everything (in the right order) and runs the game loop
function startGame() {
  // each step runs on its own: if one fails, the rest still run and the problem is shown on screen
  const problems = [];
  const step = (name, fn) => { try { fn(); } catch (e) { console.error(name, e); problems.push(name + ": " + (e && e.message ? e.message : e)); } };
  step("world.initCore()", () => { world.initCore(); });
  step("world.initSky()", () => { world.initSky(); });
  step("world.initTextures()", () => { world.initTextures(); });
  step("world.initRoads()", () => { world.initRoads(); });
  step("world.initBuildings()", () => { world.initBuildings(); });
  step("world.initDistricts()", () => { world.initDistricts(); });
  step("world.initMap()", () => { world.initMap(); });  // farmland, lake, harbour, airport, roads outside the city
  step("world.initOutskirts()", () => { world.initOutskirts(); });  // forests and mountains
  step("world.initFill()", () => { world.initFill(); });  // trees, bushes and paved slabs on the empty land
  step("world.initHarbour()", () => { world.initHarbour(); });  // harbour zone: pier, lighthouse, cranes, containers, rental hut
  step("world.initBatches()", () => { world.initBatches(); });
  step("world.initTraffic()", () => { world.initTraffic(); });
  step("vehicleDrive.init()", () => { vehicleDrive.init(); });
  step("world.initPeople()", () => { world.initPeople(); });
  step("world.initProps()", () => { world.initProps(); });  // .glb props from the props/ folder
  step("world.initVehicles()", () => { world.initVehicles(); });  // trains on the railway, boats on the water
  step("world.initGlow()", () => { world.initGlow(); });  // street lamps glow at night
  step("world.initUpdate()", () => { world.initUpdate(); });
  step("world.applyTime()", () => { world.applyTime(); });

  step("player.init()", () => { player.init(); });
  step("fp.init()", () => { fp.init(); });  // first-person camera + your arm
  step("initHud()", () => { initHud(); });
  step("initMinimap()", () => { initMinimap(); });
  step("wardrobe.init()", () => { wardrobe.init(); });
  step("interior.init()", () => { interior.init(); });  // builds the inside of the house
  step("world.initGrass()", () => { world.initGrass(); });  // grass texture on every grass ground (after the house lawn exists)
  step("interior.spawnInside()", () => { interior.spawnInside(); });  // you start inside the house


  const loading = document.getElementById('loading');
  if (problems.length) {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#b71c1c;color:#fff;font:13px sans-serif;padding:6px;z-index:60;white-space:pre-wrap';
    banner.textContent = 'Startup problems (game still running):\n' + problems.join('\n');
    document.body.appendChild(banner);
  }
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

dude.load(startGame);     // loads dtwmp.glb (the player and every NPC)
