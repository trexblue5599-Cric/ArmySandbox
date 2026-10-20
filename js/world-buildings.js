// js/world-buildings.js  -  building, house, bench, ferris wheel, tree, lamp (the object builders)
world.initBuildings = function() {
  const { ROADS, ROAD_W, BLOCKS, DISTRICTS, LAKE, CAR_COLORS, DAY_LENGTH, START_HOUR, DOWN_STYLES, MID_STYLES, WALLS, ROOFS, SHIRTS, PANTS, SKINS } = CONFIG;
  const { rnd, pick, mix, smooth, getMat, flat, obstacle } = world;
  // ---------- COLLECTED OBJECTS (drawn at the end as a few big batches) ----------
  world.treeList = []; world.lampList = []; world.carList = [];
  world.tree = function(x, z, s) {
    world.treeList.push([x, z, s || (0.85 + rnd() * 0.5)]);
    obstacle(x, z, 0.5, 0.5, 6);
  };
  world.lamp = function(x, z) { world.lampList.push([x, z]); obstacle(x, z, 0.2, 0.2, 6); };
  world.parkedCar = function(x, z, color, alongZ, type) {
    world.carList.push([x, z, color, alongZ, type || 'wagon', world.rnd() < 0.5 ? 1 : -1]);
    obstacle(x, z, alongZ ? 1.1 : 2.3, alongZ ? 2.3 : 1.1, 1.7);
  };

  // ---------- BUILDERS ----------
  world.building = function(x, z, w, d, h, style, tint) {
    const side = world.facade(style, d, h, tint), front = world.facade(style, w, h, tint), roofMat = getMat(0x55575a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roofMat, roofMat, front, front]);
    b.position.set(x, h / 2, z);
    b.castShadow = true; b.receiveShadow = true;
    world.cur.add(b);
    if (h > 55) {
      world.add(new THREE.CylinderGeometry(0.15, 0.25, 9, 5), 0x888888, x, h + 4.5, z).castShadow = false;
    } else if (style !== 'house') {
      world.add(new THREE.BoxGeometry(2.2, 1.2, 2.2), 0x8a8a8a, x + w * 0.2, h + 0.6, z - d * 0.2);
    }
    obstacle(x, z, w / 2, d / 2, h);
    world.mapRects.push({ kind: 'b', x, z, w, d, h });
  };

  world.house = function(x, z, wall, roof) {
    world.building(x, z, 9, 9, 4.6, 'house', wall);
    const r = world.add(new THREE.ConeGeometry(7.2, 3.4, 4), roof, x, 6.3, z);
    r.rotation.y = Math.PI / 4;
    world.add(new THREE.BoxGeometry(1.1, 2, 0.15), 0x5d4037, x, 1, z + 4.55);
    world.add(new THREE.BoxGeometry(1, 2.2, 1), 0x8d6e63, x + 2.5, 6.8, z - 1.5);
  };

  world.bench = function(x, z, vertical) {
    const g = new THREE.Group();
    world.add(new THREE.BoxGeometry(2, 0.25, 0.7), 0x6d4c41, 0, 0.5, 0, g);
    world.add(new THREE.BoxGeometry(2, 0.6, 0.15), 0x6d4c41, 0, 0.9, -0.3, g);
    g.position.set(x, 0, z);
    g.rotation.y = vertical ? Math.PI / 2 : 0;
    world.cur.add(g);
    obstacle(x, z, vertical ? 0.5 : 1, vertical ? 1 : 0.5, 0.9);
  };

  world.ferris = function(x, z) {
    const frame = new THREE.Group();
    const legL = world.add(new THREE.BoxGeometry(0.5, 10, 0.5), 0x546e7a, -2.2, 4.3, 0, frame);
    legL.rotation.z = -0.4;
    const legR = world.add(new THREE.BoxGeometry(0.5, 10, 0.5), 0x546e7a, 2.2, 4.3, 0, frame);
    legR.rotation.z = 0.4;
    frame.position.set(x, 0, z);
    world.cur.add(frame);
    const wheel = new THREE.Group();
    wheel.position.set(x, 8.8, z + 0.5);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 0.22, 6, 24), getMat(0xeceff1));
    ring.castShadow = true;
    wheel.add(ring);
    for (let i = 0; i < 4; i++) {
      const sp = world.add(new THREE.BoxGeometry(14, 0.12, 0.12), 0xeceff1, 0, 0, 0, wheel);
      sp.rotation.z = i * Math.PI / 4;
    }
    const cabs = [];
    const cols = [0xe53935, 0xfdd835, 0x1e88e5, 0x43a047, 0xfb8c00];
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      const c = world.add(new THREE.BoxGeometry(1.3, 1.1, 1.3), cols[i % 5], Math.cos(a) * 7, Math.sin(a) * 7, 0, wheel);
      cabs.push(c);
    }
    world.cur.add(wheel);
    world.spinners.push({ wheel, cabs });
    obstacle(x, z, 6, 1.2, 15);
  };

};
