// js/main.js  -  starts everything (in the right order) and runs the game loop
const loadingEl = document.createElement('div');
loadingEl.id = 'loading';
loadingEl.style.cssText = 'position:fixed;left:0;top:40%;width:100%;text-align:center;color:#fff;font:bold 20px sans-serif;text-shadow:0 2px 6px #000;z-index:40;pointer-events:none';
loadingEl.textContent = 'Loading city...';
document.body.appendChild(loadingEl);

world.initCore();
world.initSky();
world.initRoads();
world.initPeople();      // (makePerson is needed by the player)
player.init();
initHud();

// load the 3D models, then build the city out of them
world.loadModels(() => {
  world.initDistricts();
  world.initProps();
  world.initOutskirts();
  world.buildInstances();
  world.initTraffic();
  world.initUpdate();
  world.applyTime();
  initMinimap();

  if (world.missing.length) {
    loadingEl.style.top = '70px';
    loadingEl.style.font = '12px sans-serif';
    loadingEl.textContent = 'Missing files in assets/: ' + world.missing.join(', ');
    setTimeout(() => loadingEl.remove(), 20000);
  } else loadingEl.remove();

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
  world.camera.position.set(0, 5, -8);
  loop();
});

addEventListener('resize', () => {
  world.camera.aspect = innerWidth / innerHeight;
  world.camera.updateProjectionMatrix();
  world.renderer.setSize(innerWidth, innerHeight);
});
