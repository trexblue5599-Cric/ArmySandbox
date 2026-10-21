// js/world-districts.js  -  what each city block looks like (change the map in config.js)
world.initDistricts = function() {
  const { ROADS, ROAD_W, BLOCKS, DISTRICTS, LAKE, CAR_COLORS, DAY_LENGTH, START_HOUR, DOWN_STYLES, MID_STYLES, WALLS, ROOFS, SHIRTS, PANTS, SKINS } = CONFIG;
  const { rnd, pick, mix, smooth, getMat, flat, obstacle } = world;

  const TYPES = world.districtTypes = {
    downtown(cx, cz) {
      const L = Math.floor(rnd() * 3);
      if (L === 0) world.building(cx, cz, 22, 22, 55 + rnd() * 40, pick(DOWN_STYLES));
      else if (L === 1) {
        world.building(cx - 7, cz, 12, 24, 38 + rnd() * 40, pick(DOWN_STYLES));
        world.building(cx + 7.5, cz, 11, 24, 30 + rnd() * 40, pick(DOWN_STYLES));
      } else {
        [[-7, -7], [7.5, -7], [-7, 7.5], [7.5, 7.5]].forEach(p => world.building(cx + p[0], cz + p[1], 11, 11, 28 + rnd() * 45, pick(DOWN_STYLES)));
      }
    },
    tower(cx, cz) {
      world.building(cx, cz, 20, 20, 118, 'glass');
      world.building(cx - 11.5, cz + 10, 4, 4, 8, 'concrete');
      flat(26, 26, 0xcfc8b8, cx, 0.06, cz);
    },
    mid(cx, cz) {
      if (rnd() < 0.5) {
        world.building(cx - 7, cz, 12, 26, 12 + rnd() * 14, pick(MID_STYLES));
        world.building(cx + 7.5, cz, 11, 26, 10 + rnd() * 16, pick(MID_STYLES));
      } else {
        world.building(cx, cz - 7.5, 26, 11, 10 + rnd() * 14, pick(MID_STYLES));
        world.building(cx - 7, cz + 7.5, 12, 11, 8 + rnd() * 14, pick(MID_STYLES));
        world.building(cx + 7.5, cz + 7.5, 11, 11, 10 + rnd() * 12, pick(MID_STYLES));
      }
    },
    suburb(cx, cz) {
      flat(28, 28, 0x7cc05a, cx, 0.05, cz, 0.03);
      [[-7, -7], [7, -7], [-7, 7], [7, 7]].forEach(p => {
        const hx = cx + p[0], hz = cz + p[1], wallC = pick(WALLS), roofC = pick(ROOFS);
        if (world.isHeroHouse && world.isHeroHouse(hx, hz)) {
          world.heroHouse(hx, hz, wallC, roofC);   // YOUR house (house-exterior.js)
          rnd();                                   // keeps the random city exactly the same
        } else {
          world.house(hx, hz, wallC, roofC);
          world.tree(cx + p[0] * 1.6, cz + p[1] * 1.45);
        }
      });
    },
    park(cx, cz, fair) {
      flat(28, 28, 0x5a9a3c, cx, 0.05, cz, 0.03);
      flat(28, 2.4, 0xcdb98c, cx, 0.07, cz);
      flat(2.4, 28, 0xcdb98c, cx, 0.07, cz);
      const pond = world.add(new THREE.CylinderGeometry(4.5, 4.5, 0.05, 16), 0x3a9ad0, cx + 8, 0.08, cz + 8);
      pond.castShadow = false;
      obstacle(cx + 8, cz + 8, 4.5, 4.5, 0.1);
      world.mapRects.push({ kind: 'w', x: cx + 8, z: cz + 8, w: 9, d: 9 });
      for (let i = 0; i < 9; i++) {
        const x = cx + (rnd() - 0.5) * 25, z = cz + (rnd() - 0.5) * 25;
        if (Math.abs(x - cx) < 3 || Math.abs(z - cz) < 3) continue;
        if (Math.hypot(x - cx - 8, z - cz - 8) < 6.5) continue;
        world.tree(x, z);
      }
      world.bench(cx - 5, cz + 1.8, false);
      world.bench(cx + 5, cz - 1.8, false);
      world.bench(cx + 1.8, cz + 5, true);
      if (fair) world.ferris(cx - 7, cz - 7);
      world.mapRects.push({ kind: 'p', x: cx, z: cz, w: 28, d: 28 });
    },
    plaza(cx, cz) {
      flat(28, 28, 0xd2cbbb, cx, 0.05, cz, 0.03);
      world.add(new THREE.CylinderGeometry(4.4, 4.4, 0.7, 20), 0xb0aca4, cx, 0.35, cz);
      const water = world.add(new THREE.CylinderGeometry(3.7, 3.7, 0.74, 20), 0x4aa8d8, cx, 0.37, cz);
      water.castShadow = false;
      world.add(new THREE.CylinderGeometry(0.5, 0.7, 2.8, 8), 0xb0aca4, cx, 1.4, cz);
      world.add(new THREE.SphereGeometry(0.7, 8, 8), 0xe3f2fd, cx, 3, cz);
      obstacle(cx, cz, 4.4, 4.4, 3);
      [[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(p => world.tree(cx + p[0], cz + p[1]));
      world.bench(cx, cz - 8, false); world.bench(cx, cz + 8, false);
      world.bench(cx - 8, cz, true); world.bench(cx + 8, cz, true);
      world.mapRects.push({ kind: 'plaza', x: cx, z: cz, w: 28, d: 28 });
    },
    industrial(cx, cz) {
      flat(28, 28, 0x8d8d88, cx, 0.05, cz, 0.03);
      world.building(cx - 5, cz - 8, 22, 10, 8, 'metal');
      world.building(cx - 5, cz + 8, 22, 10, 7, 'metal');
      const cc = [0xc62828, 0x1565c0, 0xef6c00, 0x2e7d32, 0x6a1b9a, 0xf9a825];
      for (let i = 0; i < 6; i++) {
        const x = cx + 9 + (i % 2) * 3, z = cz - 9 + Math.floor(i / 2) * 6.5;
        world.add(new THREE.BoxGeometry(2.5, 2.6, 6), cc[i], x, 1.3, z);
        obstacle(x, z, 1.25, 3, 2.6);
        if (i > 3) world.add(new THREE.BoxGeometry(2.5, 2.6, 6), cc[(i + 2) % 6], x, 3.9, z);
      }
      world.add(new THREE.CylinderGeometry(2.4, 2.4, 9, 10), 0xb0bec5, cx + 9, 4.5, cz + 10);
      obstacle(cx + 9, cz + 10, 2.4, 2.4, 9);
    }
  };
  TYPES.fair = (cx, cz) => TYPES.park(cx, cz, true);

  // ---------- BUILD THE BLOCKS ----------
  BLOCKS.forEach((cz, row) => BLOCKS.forEach((cx, col) => {
    const G = new THREE.Group();
    world.scene.add(G);
    world.cur = G;
    world.chunks.push({ g: G, x: cx, z: cz });
    (TYPES[DISTRICTS[row][col]] || TYPES.mid)(cx, cz);
    // sidewalk lamps and street trees
    [[-14.5, -14.5], [14.5, -14.5], [-14.5, 14.5], [14.5, 14.5], [0, -14.5], [0, 14.5], [-14.5, 0], [14.5, 0]].forEach(p => world.lamp(cx + p[0], cz + p[1]));
    [[-14.5, -7], [14.5, 7], [-7, 14.5], [7, -14.5]].forEach(p => { if (!(world.isHeroTree && world.isHeroTree(cx + p[0], cz + p[1]))) world.tree(cx + p[0], cz + p[1], 0.8); });
    world.cur = world.scene;
  }));

};
