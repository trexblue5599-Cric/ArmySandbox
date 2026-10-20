// js/world-traffic.js  -  cars (Kenney models) that drive around the roads
world.initTraffic = function() {
  const { ROADS } = CONFIG;
  const { rnd, pick } = world;
  const names = CONFIG.TRAFFIC_MODELS.filter(n => world.models[n]);
  if (!names.length) return;

  for (let i = 0; i < CONFIG.TRAFFIC_CARS; i++) {
    const alongZ = i % 2 === 0, dir = rnd() < 0.5 ? 1 : -1;
    const road = pick(ROADS), lane = road + dir * 1.9 * (alongZ ? -1 : 1);
    const t = (rnd() - 0.5) * 170;
    const name = pick(names), mdl = world.models[name];
    const g = new THREE.Group();
    g.add(world.cloneModel(name));
    g.rotation.y = alongZ ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    world.scene.add(g);
    world.traffic.push({
      g, alongZ, dir, x: alongZ ? lane : t, z: alongZ ? t : lane, speed: 0, cruise: 7 + rnd() * 4,
      hwid: mdl.w / 2, hlen: mdl.d / 2
    });
  }
};
