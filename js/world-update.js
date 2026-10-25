// js/world-update.js  -  runs every frame: time of day, traffic, pedestrians, ferris wheel
world.initUpdate = function() {
  const { ROADS, ROAD_W, BLOCKS, DISTRICTS, LAKE, CAR_COLORS, DAY_LENGTH, START_HOUR, DOWN_STYLES, MID_STYLES, WALLS, ROOFS, SHIRTS, PANTS, SKINS } = CONFIG;
  const { rnd, pick, mix, smooth, getMat, flat, obstacle } = world;
  // ---------- UPDATE (called every frame) ----------
  let tick = 0;
  const WRAP = CONFIG.HALF + 6;
  world.update = function(dt, px, pz) {
    world.hour = (world.hour + dt * 24 / DAY_LENGTH) % 24;
    tick -= dt;
    if (tick <= 0) {
      tick = 0.3;
      world.applyTime();
      world.chunks.forEach(c => { c.g.visible = Math.hypot(px - c.x, pz - c.z) < 185; });
    }
    world.sun.position.set(px + world.sunDir.x * 70, world.sunDir.y * 70, pz + world.sunDir.z * 70);
    world.sun.target.position.set(px, 0, pz);
    world.sun.target.updateMatrixWorld();
    world.stars.position.set(px, 0, pz);

    // traffic: cars drive their loops (world-traffic.js)
    world.updateTraffic(dt, px, pz);
    // pedestrians wander freely on walkable land (world-walk.js)
    world.walkPeds(dt, px, pz);
    // ferris wheel
    for (const s of world.spinners) {
      s.wheel.rotation.z += 0.18 * dt;
      s.cabs.forEach(c => { c.rotation.z = -s.wheel.rotation.z; });
    }
  };

};
