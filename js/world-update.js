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
    // pedestrians walk around their block, and sometimes stop and stand for a while
    for (const p of world.peds) {
      if (p.wait > 0) { p.wait -= dt; if (p.wait <= 0) p.next = 10 + Math.random() * 20; }
      else { p.next -= dt; if (p.next <= 0) p.wait = 2 + Math.random() * 5; }
      // stumbling (knocked by the player): stop walking, get shoved a little, then slowly rejoin the path
      p.sT = (p.sT || 0) - dt; p.cool = (p.cool || 0) - dt;
      const stumbling = p.sT > 0;
      const moving = p.wait <= 0 && !stumbling;
      if (moving) p.s += p.sgn * p.speed * dt;
      const r = world.ringPos(p.s, 13.9 + p.off);
      p.kx = (p.kx || 0) + (p.vx || 0) * dt; p.kz = (p.kz || 0) + (p.vz || 0) * dt;
      const damp = Math.exp(-4.5 * dt); p.vx = (p.vx || 0) * damp; p.vz = (p.vz || 0) * damp;
      if (!stumbling) { const back = Math.max(0, 1 - 1.5 * dt); p.kx *= back; p.kz *= back; }
      p.g.position.set(p.cx + r[0] + p.kx, 0, p.cz + r[1] + p.kz);
      p.g.rotation.y = p.sgn > 0 ? r[2] : r[2] + Math.PI;
      const dist = Math.hypot(px - p.g.position.x, pz - p.g.position.z);
      const near = dist < 90;
      p.near = near;
      p.g.visible = near;
      // the player runs / walks into this person -> they lose their balance
      if (near && dist < 1.0 && p.cool <= 0 && player.speed > 1.5 && !vehicleDrive.active) {
        const dx = (p.g.position.x - px) / (dist || 1), dz = (p.g.position.z - pz) / (dist || 1);
        const push = Math.min(5, 1.8 + player.speed * 0.45);
        p.vx = dx * push; p.vz = dz * push;
        p.sT = 1.8; p.cool = 3;
        const yaw = p.g.rotation.y;                          // push direction in the person's own left/right + forward/back
        p.d.stumble(dx * -Math.cos(yaw) + dz * Math.sin(yaw), dx * Math.sin(yaw) + dz * Math.cos(yaw), 1.8);
      }
      if (near) p.d.animate(dt, moving ? p.speed : 0);
    }
    // ferris wheel
    for (const s of world.spinners) {
      s.wheel.rotation.z += 0.18 * dt;
      s.cabs.forEach(c => { c.rotation.z = -s.wheel.rotation.z; });
    }
  };

};
