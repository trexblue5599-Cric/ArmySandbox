// js/world-districts.js  -  what each 30x30 city block looks like. Change the map in config.js (DISTRICTS).
world.initDistricts = function() {
  const { BLOCKS, DISTRICTS } = CONFIG;
  const { rnd, pick, flat, obstacle } = world;
  const has = n => !!world.models[n];
  const PI = Math.PI;

  // place a building model and show it on the minimap
  function bld(name, x, z, rot) {
    const m = world.place(name, x, z, rot);
    if (!m) return;
    const t = Math.pow(Math.sin(rot || 0), 2);
    world.mapRects.push({ kind: 'b', x, z, w: m.w * (1 - t) + m.d * t, d: m.d * (1 - t) + m.w * t, h: m.h });
  }
  const WIDE = ['bld_red', 'bld_green', 'bld_gb', 'bld_rb', 'bld_red', 'bld_green'].filter(has);
  const CORNER = ['bld_pizza', 'bld_red_corner'].filter(has);
  const wideDepth = () => (world.models[WIDE[0]] ? world.models[WIDE[0]].d : 6.7);

  const TYPES = world.districtTypes = {
    // a ring of 5-storey houses facing the street, with a courtyard inside
    rowblock(cx, cz) {
      if (!WIDE.length) return;
      const d = wideDepth(), e = 13 - d / 2;
      flat(28, 28, 0x8d8d88, cx, 0.05, cz, 0.03);
      [-6.1, 6.1].forEach(xo => {
        bld(pick(WIDE), cx + xo, cz - e, PI);       // north edge, faces north
        bld(pick(WIDE), cx + xo, cz + e, 0);        // south edge, faces south
      });
      [[-1, -PI / 2], [1, PI / 2]].forEach(s => {     // west / east edges
        if (CORNER.length && rnd() < 0.4) {
          bld(pick(CORNER), cx + s[0] * e, cz - 3.1, s[1]);
          bld(pick(CORNER), cx + s[0] * e, cz + 3.1, s[1]);
        } else bld(pick(WIDE), cx + s[0] * e, cz, s[1]);
      });
      world.place('tree', cx, cz, rnd() * 6.28, { hw: 0.5, hd: 0.5 });
      world.place('dumpster', cx + 3.5, cz - 3, rnd() * 6.28);
    },

    // a big landmark building (or two brown ones)
    tower(cx, cz) {
      flat(28, 28, 0xcfc8b8, cx, 0.05, cz, 0.03);
      if (has('bld_big') && (rnd() < 0.65 || !has('bld_brown'))) {
        bld('bld_big', cx, cz, Math.floor(rnd() * 4) * PI / 2);
      } else if (has('bld_brown')) {
        bld('bld_brown', cx - 7, cz, 0);
        bld('bld_brown', cx + 7, cz, 0);
        world.place('planter', cx, cz + 11, 0);
      }
    },

    park(cx, cz) {
      flat(28, 28, 0x5a9a3c, cx, 0.05, cz, 0.03);
      flat(28, 2.4, 0xcdb98c, cx, 0.07, cz);
      flat(2.4, 28, 0xcdb98c, cx, 0.07, cz);
      const pond = world.add(new THREE.CylinderGeometry(4.5, 4.5, 0.05, 16), 0x3a9ad0, cx + 8, 0.08, cz + 8);
      pond.castShadow = false;
      obstacle(cx + 8, cz + 8, 4.5, 4.5, 0.1);
      world.mapRects.push({ kind: 'p', x: cx, z: cz, w: 28, d: 28 });
      world.mapRects.push({ kind: 'w', x: cx + 8, z: cz + 8, w: 9, d: 9 });
      for (let i = 0; i < 9; i++) {
        const x = cx + (rnd() - 0.5) * 25, z = cz + (rnd() - 0.5) * 25;
        if (Math.abs(x - cx) < 3 || Math.abs(z - cz) < 3) continue;
        if (Math.hypot(x - cx - 8, z - cz - 8) < 6.5) continue;
        world.place('tree', x, z, rnd() * 6.28, { s: 0.8 + rnd() * 0.5, hw: 0.5, hd: 0.5 });
      }
      world.place('bench', cx - 5, cz + 1.9, 0);
      world.place('bench', cx + 5, cz - 1.9, PI);
      world.place('bench', cx + 1.9, cz + 5, PI / 2);
      world.place('bench', cx - 1.9, cz - 5, -PI / 2);
      world.place('planter', cx - 9, cz - 9, 0);
      world.place('planter', cx + 9, cz - 9, 0);
      world.place('flower_pot', cx - 11, cz + 1.9, 0);
      world.place('flower_pot', cx + 11, cz - 1.9, 0);
    },

    plaza(cx, cz) {
      flat(28, 28, 0xd2cbbb, cx, 0.05, cz, 0.03);
      world.add(new THREE.CylinderGeometry(4.4, 4.4, 0.7, 20), 0xb0aca4, cx, 0.35, cz);
      world.add(new THREE.CylinderGeometry(3.7, 3.7, 0.74, 20), 0x4aa8d8, cx, 0.37, cz).castShadow = false;
      world.add(new THREE.CylinderGeometry(0.5, 0.7, 2.8, 8), 0xb0aca4, cx, 1.4, cz);
      world.add(new THREE.SphereGeometry(0.7, 8, 8), 0xe3f2fd, cx, 3, cz);
      obstacle(cx, cz, 4.4, 4.4, 3);
      world.mapRects.push({ kind: 'plaza', x: cx, z: cz, w: 28, d: 28 });
      [[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(p => world.place('tree', cx + p[0], cz + p[1], rnd() * 6.28, { hw: 0.5, hd: 0.5 }));
      world.place('bench', cx, cz - 7.5, 0);
      world.place('bench', cx, cz + 7.5, PI);
      world.place('bench', cx - 7.5, cz, PI / 2);
      world.place('bench', cx + 7.5, cz, -PI / 2);
      [[-11, -4], [11, 4], [-4, 11], [4, -11]].forEach(p => world.place('flower_pot', cx + p[0], cz + p[1], 0));
      world.place('planter', cx - 11, cz + 11, 0);
      world.place('planter', cx + 11, cz - 11, 0);
    },

    // car park with a few shops at the back
    parking(cx, cz) {
      flat(28, 28, 0x3a3a3d, cx, 0.05, cz, 0.03);
      const d = wideDepth(), e = 13 - d / 2;
      if (WIDE.length) [-6.1, 6.1].forEach(xo => bld(pick(WIDE), cx + xo, cz - e, PI));
      const cars = CONFIG.PARKED_MODELS.filter(has);
      if (cars.length) {
        for (let i = 0; i < 6; i++) {
          if (rnd() < 0.8) world.place(pick(cars), cx - 10 + i * 4, cz - 1, 0);
          if (rnd() < 0.8) world.place(pick(cars), cx - 10 + i * 4, cz + 9, PI);
        }
      }
      for (let i = 0; i < 5; i++) world.place('cone', cx - 12 + rnd() * 24, cz + 3 + rnd() * 3, 0, { collide: false });
      world.place('dumpster', cx + 11, cz - 5, PI / 2);
      world.place('trash_can', cx - 12, cz - 5, 0);
      for (let i = 0; i < 11; i++) world.place('fence', cx - 12.2 + i * 2.4, cz + 13.4, PI);
    }
  };

  BLOCKS.forEach((cz, row) => BLOCKS.forEach((cx, col) => {
    const G = new THREE.Group();
    world.scene.add(G);
    world.cur = G;                       // flat ground pieces go in this block's group
    world.chunks.push({ g: G, x: cx, z: cz });
    (TYPES[DISTRICTS[row][col]] || TYPES.rowblock)(cx, cz);
    world.cur = world.scene;
  }));
};
