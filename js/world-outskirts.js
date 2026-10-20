// js/world-outskirts.js  -  lake, forest and mountains around the city
world.initOutskirts = function() {
  const { LAKE } = CONFIG;
  const { rnd, getMat, obstacle } = world;

  const sand = world.add(new THREE.CylinderGeometry(26, 26, 0.04, 20), 0xe3d3a1, LAKE.x, 0.03, LAKE.z);
  sand.castShadow = false;
  const lake = world.add(new THREE.CylinderGeometry(20, 20, 0.05, 20), 0x3a9ad0, LAKE.x, 0.06, LAKE.z);
  lake.castShadow = false;
  obstacle(LAKE.x, LAKE.z, 17, 17, 0.1);
  world.mapRects.push({ kind: 'w', x: LAKE.x, z: LAKE.z, w: 40, d: 40 });

  // forest
  for (let i = 0; i < 260; i++) {
    const x = (rnd() - 0.5) * 290, z = (rnd() - 0.5) * 290;
    if (Math.abs(x) < 92 && Math.abs(z) < 92) continue;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < 30) continue;
    const near = Math.abs(x) < 120 && Math.abs(z) < 120;
    world.place('tree', x, z, rnd() * 6.28, { s: 1 + rnd() * 0.7, collide: near, hw: 0.5, hd: 0.5, h: 6 });
  }

  // mountains far away (hazy in the fog)
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2 + rnd() * 0.2, r = 160 + rnd() * 12;
    const rad = 28 + rnd() * 18, hgt = 30 + rnd() * 40;
    const mx = Math.cos(a) * r, mz = Math.sin(a) * r;
    const m = new THREE.Mesh(new THREE.ConeGeometry(rad, hgt, 6), getMat(0x7a93ad));
    m.position.set(mx, hgt / 2 - 1, mz);
    world.scene.add(m);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.38, hgt * 0.32, 6), getMat(0xf2f6fa));
    cap.position.set(mx, hgt - hgt * 0.16 - 1, mz);
    world.scene.add(cap);
  }
};
