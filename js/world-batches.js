// js/world-batches.js  -  parked cars + draws all trees/lamps/cars in a few fast batches
world.initBatches = function() {
  const { ROADS, ROAD_W, BLOCKS, DISTRICTS, LAKE, CAR_COLORS, DAY_LENGTH, START_HOUR, DOWN_STYLES, MID_STYLES, WALLS, ROOFS, SHIRTS, PANTS, SKINS } = CONFIG;
  const { rnd, pick, mix, smooth, getMat, flat, obstacle } = world;
  // ---------- PARKED CARS along the curbs ----------
  ROADS.forEach(r => {
    for (let t = -80; t <= 80; t += 9) {
      if (ROADS.some(c => Math.abs(t - c) < 9)) continue;
      [-4.0, 4.0].forEach(off => {
        if (rnd() < 0.3) world.parkedCar(t, r + off, pick(CAR_COLORS), false);
        if (rnd() < 0.3) world.parkedCar(r + off, t, pick(CAR_COLORS), true);
      });
    }
  });

  // ---------- BATCHES (instanced = very few draw calls) ----------
  (function batches() {
    const d = new THREE.Object3D();
    function make(geo, mat, list, fn, shadow) {
      if (!list.length) return;
      const m = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((it, i) => { fn(d, it); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
      m.instanceMatrix.needsUpdate = true;
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      world.scene.add(m);
    }
    // trees
    make(new THREE.CylinderGeometry(0.22, 0.32, 2.6, 6), getMat(0x5d4037), world.treeList,
      (o, t) => { o.position.set(t[0], 1.3 * t[2], t[1]); o.rotation.set(0, 0, 0); o.scale.set(t[2], t[2], t[2]); }, true);
    make(new THREE.IcosahedronGeometry(1.9, 0), getMat(0x3f7d3a), world.treeList,
      (o, t) => { o.position.set(t[0], 3.9 * t[2], t[1]); o.rotation.set(0, t[0], 0); o.scale.set(t[2], t[2], t[2]); }, true);
    make(new THREE.IcosahedronGeometry(1.35, 0), getMat(0x4a8f43), world.treeList,
      (o, t) => { o.position.set(t[0], 5.1 * t[2], t[1]); o.rotation.set(0, t[1], 0); o.scale.set(t[2], t[2], t[2]); }, true);
    // lamp posts
    make(new THREE.CylinderGeometry(0.1, 0.13, 6, 6), getMat(0x444444), world.lampList,
      (o, l) => { o.position.set(l[0], 3, l[1]); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); }, false);
    make(new THREE.BoxGeometry(0.7, 0.2, 0.7), world.lampMat, world.lampList,
      (o, l) => { o.position.set(l[0], 6.1, l[1]); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); }, false);
    // parked cars: body (one batch per colour), chassis, cabin
    const place = (o, c, y, dz) => {
      o.position.set(c[0] + (c[3] ? 0 : dz), y, c[1] + (c[3] ? dz : 0));
      o.scale.set(1, 1, 1);
      o.rotation.set(0, c[3] ? 0 : Math.PI / 2, 0);
    };
    const bodyGeo = new THREE.BoxGeometry(1.9, 0.65, 4.2);
    CAR_COLORS.forEach(col => make(bodyGeo, getMat(col), world.carList.filter(c => c[2] === col), (o, c) => place(o, c, 0.85, 0), true));
    make(new THREE.BoxGeometry(1.8, 0.4, 3.9), getMat(0x15151a), world.carList, (o, c) => place(o, c, 0.3, 0), false);
    make(new THREE.BoxGeometry(1.62, 0.55, 2.1), getMat(0x1c2733), world.carList, (o, c) => place(o, c, 1.45, -0.2), true);
  })();

};
