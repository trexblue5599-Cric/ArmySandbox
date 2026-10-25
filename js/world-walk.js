// js/world-walk.js  -  where people can walk, and the road rules for them and for the cars.
// People walk anywhere on land: grass, pavements, fields, car parks. Not on roads, not in water,
// not through buildings, props or trees. Cars use the road network only (world-traffic.js).

// distance from a point to the nearest road centre-line, minus half the road's width
// (negative means you are on the road)
world.roadGap = function(x, z) {
  const paths = world.roadPaths || [];
  let best = 1e9;
  for (const path of paths) {
    const pts = path.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1];
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t)) - path.width / 2;
      if (d < best) best = d;
    }
  }
  return best;
};

world.inWaterAt = function(x, z) {
  return world.mapRects.some(r => r.kind === 'w' && Math.abs(x - r.x) < r.w / 2 && Math.abs(z - r.z) < r.d / 2);
};

// can a person stand here? (grass, pavement and fields are fine; roads, water and solids are not)
world.walkable = function(x, z, margin) {
  const m = margin === undefined ? 0.45 : margin;
  const L = CONFIG.LIMIT - 20;
  if (Math.abs(x) > L || Math.abs(z) > L) return false;
  if (world.inWaterAt(x, z)) return false;
  if (world.roadGap(x, z) < 1.2) return false;
  if (world.collides(x, z, m)) return false;
  return true;
};

// the nearest walkable spot to (x, z); used so nobody is put inside a wall or in the road
world.freeSpot = function(x, z) {
  if (world.walkable(x, z)) return { x, z };
  for (let r = 0.5; r <= 10; r += 0.5) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const tx = x + Math.cos(a) * r, tz = z + Math.sin(a) * r;
      if (world.walkable(tx, tz)) return { x: tx, z: tz };
    }
  }
  return { x, z };
};

// a random walkable point near (x, z), within 'radius' metres
world.randomWalkableNear = function(x, z, radius) {
  for (let i = 0; i < 80; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius;
    const tx = x + Math.cos(a) * r, tz = z + Math.sin(a) * r;
    if (world.walkable(tx, tz)) return { x: tx, z: tz };
  }
  return null;
};

// a random walkable point anywhere in the playable area (used to start people)
world.randomWalkable = function() {
  const L = CONFIG.LIMIT - 40;
  for (let i = 0; i < 400; i++) {
    const tx = (Math.random() * 2 - 1) * L, tz = (Math.random() * 2 - 1) * L;
    if (world.walkable(tx, tz)) return { x: tx, z: tz };
  }
  return { x: 0, z: 0 };
};

// everyone who walks: pick a new place to go to, walk there, pick another
world.walkPeds = function(dt, px, pz) {
  for (const p of world.peds) {
    if (p.wait > 0) { p.wait -= dt; p.d.animate(dt, 0); p.g.visible = Math.hypot(px - p.x, pz - p.z) < 90; continue; }
    if (!p.tx) {
      const t = world.randomWalkableNear(p.x, p.z, 35) || world.randomWalkable();
      p.tx = t.x; p.tz = t.z;
    }
    const dx = p.tx - p.x, dz = p.tz - p.z, dist = Math.hypot(dx, dz);
    if (dist < 0.8) {
      p.tx = null;
      if (Math.random() < 0.3) p.wait = 2 + Math.random() * 4;   // sometimes stop for a moment
      continue;
    }
    const step = Math.min(dist, p.speed * dt);
    const nx = p.x + dx / dist * step, nz = p.z + dz / dist * step;
    if (world.walkable(nx, nz)) { p.x = nx; p.z = nz; }
    else { p.tx = null; }                                       // blocked: choose another place
    p.g.position.set(p.x, 0, p.z);
    p.g.rotation.y = Math.atan2(dx, dz);
    const near = Math.hypot(px - p.x, pz - p.z) < 90;
    p.g.visible = near;
    if (near) p.d.animate(dt, p.speed);
  }
};
