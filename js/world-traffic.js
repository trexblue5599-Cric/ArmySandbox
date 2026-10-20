// js/world-traffic.js  -  cars that drive around the roads
world.initTraffic = function() {
  const { ROADS, ROAD_W, BLOCKS, DISTRICTS, LAKE, CAR_COLORS, DAY_LENGTH, START_HOUR, DOWN_STYLES, MID_STYLES, WALLS, ROOFS, SHIRTS, PANTS, SKINS } = CONFIG;
  const { rnd, pick, mix, smooth, getMat, flat, obstacle } = world;
  // ---------- MOVING CARS ----------
  function makeCar(color) {
    const g = new THREE.Group();
    world.add(new THREE.BoxGeometry(1.8, 0.4, 3.9), 0x15151a, 0, 0.3, 0, g).castShadow = false;
    world.add(new THREE.BoxGeometry(1.9, 0.65, 4.2), color, 0, 0.85, 0, g);
    world.add(new THREE.BoxGeometry(1.62, 0.55, 2.1), 0x1c2733, 0, 1.45, -0.2, g);
    world.add(new THREE.BoxGeometry(0.5, 0.12, 0.05), 0xfff2c0, 0, 0.9, 2.12, g).castShadow = false;
    return g;
  }
  for (let i = 0; i < CONFIG.TRAFFIC_CARS; i++) {
    const alongZ = i % 2 === 0, dir = rnd() < 0.5 ? 1 : -1;
    const road = pick(ROADS), lane = road + dir * 1.9 * (alongZ ? -1 : 1);
    const t = (rnd() - 0.5) * 170;
    const g = makeCar(pick(CAR_COLORS));
    g.rotation.y = alongZ ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    world.cur.add(g);
    world.traffic.push({ g, alongZ, dir, x: alongZ ? lane : t, z: alongZ ? t : lane, speed: 0, cruise: 7 + rnd() * 4 });
  }

};
