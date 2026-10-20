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

    // traffic
    for (const c of world.traffic) {
      const ahead = c.alongZ ? (pz - c.z) * c.dir : (px - c.x) * c.dir;
      const lat = c.alongZ ? Math.abs(px - c.x) : Math.abs(pz - c.z);
      const target = (ahead > 0 && ahead < 9 && lat < 2.4) ? 0 : c.cruise;
      c.speed = target < c.speed ? Math.max(target, c.speed - 28 * dt) : Math.min(target, c.speed + 6 * dt);
      if (c.alongZ) { c.z += c.dir * c.speed * dt; if (c.z > WRAP) c.z = -WRAP; if (c.z < -WRAP) c.z = WRAP; }
      else          { c.x += c.dir * c.speed * dt; if (c.x > WRAP) c.x = -WRAP; if (c.x < -WRAP) c.x = WRAP; }
      c.g.position.set(c.x, 0, c.z);
      c.g.visible = Math.hypot(px - c.x, pz - c.z) < 170;
    }
    // pedestrians walk around their block, and sometimes stop and stand for a while
    for (const p of world.peds) {
      if (p.wait > 0) { p.wait -= dt; if (p.wait <= 0) p.next = 10 + Math.random() * 20; }
      else { p.next -= dt; if (p.next <= 0) p.wait = 2 + Math.random() * 5; }
      const moving = p.wait <= 0;
      if (moving) p.s += p.sgn * p.speed * dt;
      const r = world.ringPos(p.s, 13.9 + p.off);
      p.g.position.set(p.cx + r[0], 0, p.cz + r[1]);
      p.g.rotation.y = p.sgn > 0 ? r[2] : r[2] + Math.PI;
      const near = Math.hypot(px - p.g.position.x, pz - p.g.position.z) < 90;
      p.g.visible = near;
      if (near) p.d.animate(dt, moving ? p.speed : 0);
    }
    // ferris wheel
    for (const s of world.spinners) {
      s.wheel.rotation.z += 0.18 * dt;
      s.cabs.forEach(c => { c.rotation.z = -s.wheel.rotation.z; });
    }
  };

};
