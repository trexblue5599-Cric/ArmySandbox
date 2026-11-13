// Southeast cargo docks, boats, warehouses, cranes, containers, and the
// northwest coastal lighthouse shown in the reference map.
world.initHarbour = function() {
  const THREE = window.THREE;
  if (!world.scene || !THREE) return;
  const toWorld = ([px, py]) => [(px - 495) * 0.97, (py - 260) * 0.97];
  const material = (color) => world.getMat ? world.getMat(color) : new THREE.MeshLambertMaterial({ color });
  const box = (w, h, d, color, x, y, z, solid = true, rotation = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
    mesh.position.set(x, y + h / 2, z);
    mesh.rotation.y = rotation;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    world.scene.add(mesh);
    if (solid) world.obstacle(x, z, w / 2, d / 2, h);
    return mesh;
  };
  const boxFromPixels = (w, h, d, color, px, py, solid, rotation, bottomY = 0.04) => {
    const [x, z] = toWorld([px, py]);
    return box(w, h, d, color, x, bottomY, z, solid, rotation || 0);
  };
  // every slab is a thick block whose top is a hair higher than the one under it, so overlapping slabs never flicker
  const dock = (w, d, px, py, rotation, top) => {
    const [dx, dz] = toWorld([px, py]);
    world.docks.push({ x: dx, z: dz, w, d, rot: rotation, top });     // you can walk on it
    const mesh = box(w, 1.6, d, 0x80837f, dx, top - 1.6, dz, false, rotation);   // from 1.6 m below the top, so no gaps show
    return mesh;
  };

  // paved yard + broad quay + three narrow fingers reaching into the eastern ocean
  const quayAngle = -0.42;
  dock(72, 46, 790, 388, quayAngle, 0.30);        // the yard (concrete)
  dock(49, 13, 806, 393, quayAngle, 0.32);        // quay
  dock(31, 7, 827, 412, -0.05, 0.34);
  dock(31, 7, 850, 424, -0.12, 0.36);
  dock(24, 7, 858, 400, 0.23, 0.38);

  // neat rows of cargo containers on the yard, either side of the quay road (left out where they would touch a road)
  const containerColors = [0xc94535, 0x246aa0, 0xe18b32, 0x3e8050, 0xd1a52f, 0x724d8d];
  const [yx, yz] = toWorld([790, 388]);
  const yc = Math.cos(quayAngle), ys = Math.sin(quayAngle);
  let ci = 0;
  [-20, -15, -10, 10, 15, 20].forEach((v, row) => {
    for (let u = -30; u <= 30; u += 9) {
      const cx = yx + u * yc + v * ys, cz = yz - u * ys + v * yc;
      if (!world.footprintClear(cx, cz, 8.6, 5, 2, false, true)) continue;
      if (!world.onDock(cx, cz)) continue;
      const color = containerColors[ci++ % containerColors.length];
      box(8, 2.6, 4.4, color, cx, 0.30, cz, true, quayAngle);
      if ((ci + row) % 3 === 0) box(8, 2.6, 4.4, containerColors[(ci + 2) % containerColors.length], cx, 2.9, cz, true, quayAngle);
    }
  });

  // Two dock cranes with tall legs, cross-bracing, and booms.
  const crane = (px, py, rotation) => {
    const [x, z] = toWorld([px, py]);
    const H = 17, Y = 0;
    const offset = (dx, dz) => {
      const c = Math.cos(rotation), s = Math.sin(rotation);
      return [x + dx * c + dz * s, z - dx * s + dz * c];
    };
    const post = (dx, dz, w, h, d, color, y) => {
      const [bx, bz] = offset(dx, dz);
      return box(w, h, d, color, bx, y, bz, !!world.footprintClear(bx, bz, 1, 1, 1.5) || false, rotation);
    };
    [-4, 4].forEach((dx) => [-1, 1].forEach((dz) => post(dx, dz, 1, H, 1, 0xe6a82e, Y)));
    post(0, 0, 11, 1.2, 5, 0xe6a82e, H - 0.6);
    post(4.8, -1.7, 3.2, 2.8, 2.8, 0x37474f, H - 4.2);
    post(10, 0, 17, 0.75, 0.8, 0x667a83, H - 1.4);
    post(0, 0, 0.55, H - 2, 0.55, 0x25363a, 0);
  };
  crane(818, 385, -0.42);
  crane(846, 405, -0.24);

  // Mooring posts on the fingers, and simple small cargo boats
  [[820, 414], [841, 427], [864, 418], [878, 399]].forEach((p) => {
    const [x, z] = toWorld(p);
    const top = (world.dockTop ? world.dockTop(x, z) : 0) || 0.1;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 2.2, 8), material(0x493e32));
    post.position.set(x, top + 1.1, z);
    world.scene.add(post);
  });
  // a boat only floats where all round it (about 7 m) is open sea: slide it out until it is
  const seaSpot = (x, z) => {
    const clear = (a, b) => [[0, 0], [7, 0], [-7, 0], [0, 7], [0, -7], [5, 5], [-5, -5], [5, -5], [-5, 5]]
      .every(([dx, dz]) => !MAP.containsLand(a + dx, b + dz) && !world.onDock(a + dx, b + dz));
    for (let r = 0; r < 120; r += 2) for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2, a = x + Math.cos(ang) * r, b = z + Math.sin(ang) * r;
      if (clear(a, b)) return [a, b];
    }
    return [x, z];
  };
  const boat = (px, py, scale, rotation, color) => {
    const [x, z] = seaSpot(...toWorld([px, py]));
    const group = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.ConeGeometry(2.3 * scale, 8 * scale, 4), material(color));
    hull.rotation.x = Math.PI / 2;
    hull.rotation.z = Math.PI / 4;
    hull.position.y = 0.25;
    group.add(hull);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2 * scale, 0.65 * scale, 4.8 * scale), material(0xe2d7bd));
    deck.position.set(0, 0.8 * scale, 0);
    group.add(deck);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 5.5 * scale, 6), material(0x4b4032));
    mast.position.set(0, 3.5 * scale, 0);
    group.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.8 * scale, 3.4 * scale), material(0xf4ead3));
    sail.position.set(0.9 * scale, 3.7 * scale, 0);
    group.add(sail);
    group.position.set(x, -0.2, z);
    group.rotation.y = rotation;
    group.traverse((child) => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    world.scene.add(group);
  };
  boat(840, 413, 1.05, 0.5, 0x22556b);
  boat(866, 402, 0.84, -0.4, 0x813e32);
  boat(822, 429, 0.74, 0.8, 0x345d78);

  // The striped lighthouse is on the northwestern point, not at the cargo quay.
  const [lx, lz] = toWorld([228, 98]);
  [[0xffffff, 0, 6], [0xc62828, 6, 9], [0xffffff, 9, 12], [0xc62828, 12, 15]].forEach(([color, lower, upper]) => {
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25 - lower * 0.018, 1.45 - lower * 0.018, upper - lower, 12),
      material(color)
    );
    tower.position.set(lx, (lower + upper) / 2 + 0.4, lz);
    tower.castShadow = true;
    world.scene.add(tower);
  });
  world.obstacle(lx, lz, 1.5, 1.5, 15);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff59d }));
  lamp.position.set(lx, 16.1, lz);
  world.scene.add(lamp);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.6, 10), material(0x37474f));
  roof.position.set(lx, 17.3, lz);
  roof.castShadow = true;
  world.scene.add(roof);

  world.harbourLocation = { x: toWorld([806, 393])[0], z: toWorld([806, 393])[1] };
  world.mapRects.push({ kind: 'p', x: world.harbourLocation.x, z: world.harbourLocation.z, w: 55, d: 45 });
  world.lampList = world.lampList || [];
  [[774, 384], [800, 397], [830, 410], [857, 417]].forEach(([px, py]) => {
    const [x, z] = toWorld([px, py]);
    world.lampList.push([x, z]);
  });
  console.log('reference dockyard and lighthouse built');
};
