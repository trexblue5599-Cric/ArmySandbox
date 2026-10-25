// js/world-harbour.js  -  the Harbour and Docks zone (east side of the map, on the quay).
// Adds: a pier out into the sea with a lighthouse, two gantry cranes, stacked containers,
// a boat rental hut with a sign, and quay lamps. Everything is solid where it should be.
// To move something, change the numbers in this file.
world.initHarbour = function() {
  const { add, obstacle } = world;
  const box = (w, h, d, color, x, y, z, solid) => {
    add(new THREE.BoxGeometry(w, h, d), color, x, y + h / 2, z);
    if (solid !== false) obstacle(x, z, w / 2, d / 2, h);
  };

  // ---------- the pier: a long walkway out over the sea, above the water ----------
  world.flat(22, 6, 0x9e9a92, 161, 0.17, 0, 0.02);
  world.mapRects.push({ kind: 'p', x: 161, z: 0, w: 22, d: 6 });
  // railings along the pier (low, solid so you don't walk off the edge)
  box(22, 0.8, 0.12, 0xb0bec5, 161, 0.18, 3.0);
  box(22, 0.8, 0.12, 0xb0bec5, 161, 0.18, -3.0);

  // ---------- lighthouse at the end of the pier ----------
  const LX = 170, LZ = 0;
  [[0xffffff, 0, 6], [0xc62828, 6, 9], [0xffffff, 9, 12], [0xc62828, 12, 15]].forEach(b => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(1.3 - b[1] * 0.02, 1.4 - b[1] * 0.02, b[2] - b[1], 12), world.getMat(b[0]));
    c.position.set(LX, 0.17 + (b[1] + b[2]) / 2, LZ); c.castShadow = true; world.scene.add(c);
  });
  obstacle(LX, LZ, 1.4, 1.4, 15);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff59d }));
  lamp.position.set(LX, 16.2, LZ); world.scene.add(lamp);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.6, 10), world.getMat(0x37474f));
  roof.position.set(LX, 17.8, LZ); roof.castShadow = true; world.scene.add(roof);

  // ---------- two gantry cranes over the quay ----------
  const crane = (x, z) => {
    const H = 17, Y = 0;
    box(1.0, H, 1.0, 0xf9a825, x - 3.5, Y, z - 0.9);
    box(1.0, H, 1.0, 0xf9a825, x + 3.5, Y, z - 0.9);
    box(1.0, H, 1.0, 0xf9a825, x - 3.5, Y, z + 0.9);
    box(1.0, H, 1.0, 0xf9a825, x + 3.5, Y, z + 0.9);
    box(8.0, 1.0, 3.0, 0xf9a825, x, H - 0.5, z);                // top frame
    box(3.0, 2.6, 2.6, 0x37474f, x + 4.5, H - 3.5, z - 1.5);    // operator cabin
    box(16.0, 0.7, 0.7, 0x546e7a, x + 4.5, H - 1.2, z + 0.9, false);   // boom over the ship
  };
  crane(144, -25);
  crane(144, 25);

  // ---------- stacked containers near the cranes ----------
  const cols = [0xc62828, 0x1565c0, 0xef6c00, 0x2e7d32, 0xf9a825, 0x6a1b9a];
  [[131, 14], [137, 14], [131, 20], [137, 20]].forEach((p, i) => {
    box(5, 2.6, 2.4, cols[i % cols.length], p[0], 0.05, p[1]);
    box(5, 2.6, 2.4, cols[(i + 3) % cols.length], p[0], 2.65, p[1]);   // second layer
  });

  // ---------- boat rental hut with a sign ----------
  box(6, 3, 4, 0xf5f5f5, 128, 0.05, 38);
  const roofHut = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.4, 4.6), world.getMat(0x1565c0));
  roofHut.position.set(128, 3.25, 38); roofHut.castShadow = true; world.scene.add(roofHut);
  box(4, 0.9, 0.2, 0x1565c0, 128, 3.0, 35.9, false);     // sign board

  // ---------- quay lamps (glow at night, see world-glow.js) ----------
  [[128, -27], [128, 27], [150, 27], [150, -27]].forEach(p => world.lamp(p[0], p[1]));

  console.log('harbour built');
};
