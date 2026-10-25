// js/world-collision.js  -  can I walk here? can a bullet/camera pass here?
world.collidesCars = function(x, z, r) {
  for (let i = 0; i < world.traffic.length; i++) {
    const c = world.traffic[i];
    const hw = c.alongZ ? 1 : 2.2, hd = c.alongZ ? 2.2 : 1;
    if (Math.abs(x - c.x) < hw + r && Math.abs(z - c.z) < hd + r) return c;
  }
  return null;
};
// people are solid for the walking player (the driven car ignores them)
world.collidesPeds = function(x, z, r) {
  for (let i = 0; i < world.peds.length; i++) {
    const p = world.peds[i];
    if (!p.near) continue;
    if (Math.hypot(x - p.g.position.x, z - p.g.position.z) < 0.35 + r) return p;
  }
  return null;
};
// the sea and the rivers: you can't walk into water (only on your island map; never inside the house)
world.inWaterSpot = function(x, z) {
  if (typeof MAP === 'undefined' || !MAP.containsLand) return false;
  if (typeof interior !== 'undefined' && interior.active) return false;
  return !MAP.containsLand(x, z) || (MAP.inRiver && MAP.inRiver(x, z));
};
world.collides = function(x, z, r) {
  if (world.inWaterSpot(x, z)) return { water: true };
  const list = world.obstacles;
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (Math.abs(x - o.x) < o.hw + r && Math.abs(z - o.z) < o.hd + r) return o;
  }
  return world.collidesCars(x, z, r);
};
world.hitObstacle = function(x, z, y, pad) {
  pad = pad || 0;
  const list = world.obstacles;
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (o.h > y && Math.abs(x - o.x) < o.hw + pad && Math.abs(z - o.z) < o.hd + pad) return o;
  }
  return null;
};

