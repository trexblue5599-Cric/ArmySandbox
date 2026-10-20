// js/world-collision.js  -  can I walk here? can a bullet/camera pass here?
world.collidesCars = function(x, z, r) {
  for (let i = 0; i < world.traffic.length; i++) {
    const c = world.traffic[i];
    const hw = c.alongZ ? 1 : 2.2, hd = c.alongZ ? 2.2 : 1;
    if (Math.abs(x - c.x) < hw + r && Math.abs(z - c.z) < hd + r) return c;
  }
  return null;
};
world.collides = function(x, z, r) {
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

