// js/world-traffic.js  -  cars that drive around the roads
world.initTraffic = function() {
  const { ROADS, ROAD_W, BLOCKS, DISTRICTS, LAKE, CAR_COLORS, DAY_LENGTH, START_HOUR, DOWN_STYLES, MID_STYLES, WALLS, ROOFS, SHIRTS, PANTS, SKINS } = CONFIG;
  const { rnd, pick, mix, smooth, getMat, flat, obstacle } = world;
  // ---------- MOVING CARS ----------
  function makeCar(color) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(world.carGeo(world.pickCarType(), color), world.carMat);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    return g;
  }
  for (let i = 0; i < CONFIG.TRAFFIC_CARS; i++) {
    const alongZ = i % 2 === 0, dir = rnd() < 0.5 ? 1 : -1;
    const road = pick(ROADS), lane = road + dir * 1.9 * (alongZ ? -1 : 1);
    const t = (rnd() - 0.5) * (CONFIG.HALF * 2 - 10);
    const g = makeCar(pick(CAR_COLORS));
    g.rotation.y = alongZ ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    world.cur.add(g);
    world.traffic.push({ g, alongZ, dir, x: alongZ ? lane : t, z: alongZ ? t : lane, speed: 0, cruise: 7 + rnd() * 4 });
  }

};
