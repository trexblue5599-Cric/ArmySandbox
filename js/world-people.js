// js/world-people.js  -  people models + pedestrians walking the sidewalks
world.initPeople = function() {
  const { ROADS, ROAD_W, BLOCKS, DISTRICTS, LAKE, CAR_COLORS, DAY_LENGTH, START_HOUR, DOWN_STYLES, MID_STYLES, WALLS, ROOFS, SHIRTS, PANTS, SKINS } = CONFIG;
  const { rnd, pick, mix, smooth, getMat, flat, obstacle } = world;
  // ---------- PEOPLE ----------
  world.makePerson = function(o) {
    const g = new THREE.Group(), m = new THREE.Group(), P = { root: g, inner: m };
    g.add(m);
    const legGeo = new THREE.BoxGeometry(0.3, 0.85, 0.32);
    function limb(geoW, geoH, color, x, y, parent) {
      const lg = new THREE.Group();
      lg.position.set(x, y, 0);
      world.add(new THREE.BoxGeometry(geoW, geoH, geoW), color, 0, -geoH / 2, 0, lg);
      parent.add(lg);
      return lg;
    }
    P.legL = limb(0.3, 0.9, o.pants, -0.18, 0.9, m);
    P.legR = limb(0.3, 0.9, o.pants, 0.18, 0.9, m);
    world.add(new THREE.BoxGeometry(0.75, 0.8, 0.4), o.shirt, 0, 1.3, 0, m);
    P.armL = limb(0.22, 0.75, o.shirt, -0.5, 1.65, m);
    P.armR = limb(0.22, 0.75, o.shirt, 0.5, 1.65, m);
    world.add(new THREE.SphereGeometry(0.24, 8, 8), o.skin, 0, 1.95, 0, m);
    world.add(new THREE.BoxGeometry(0.5, 0.16, 0.5), o.hair, 0, 2.1, -0.02, m);
    return { group: g, parts: P };
  };
  for (let i = 0; i < CONFIG.PEDESTRIANS; i++) {
    const d = dude.make(ACC.randomLook(rnd));   // every pedestrian = dude.glb with a random outfit / hat / extras
    world.scene.add(d.group);
    world.peds.push({
      g: d.group, d, cx: pick(BLOCKS), cz: pick(BLOCKS),
      s: rnd() * 111, sgn: rnd() < 0.5 ? 1 : -1, speed: 1.4 + rnd() * 0.8, off: (rnd() - 0.5) * 0.8,
      wait: 0, next: 2 + rnd() * 20
    });
  }
  world.ringPos = function(s, h) {
    const L = 2 * h;
    s = ((s % (4 * L)) + 4 * L) % (4 * L);
    if (s < L) return [-h + s, -h, Math.PI / 2];
    if (s < 2 * L) return [h, -h + (s - L), 0];
    if (s < 3 * L) return [h - (s - 2 * L), h, -Math.PI / 2];
    return [-h, h - (s - 3 * L), Math.PI];
  };

};
