// js/world-props.js  -  street furniture: lamps, trees, hydrants, mailboxes, traffic lights, bus stops, parked cars
world.initProps = function() {
  const { ROADS, BLOCKS } = CONFIG;
  const { rnd, pick } = world;
  const place = world.place;
  const PI = Math.PI;

  // ---- lamp posts (simple shapes, drawn together) ----
  const lamps = [];
  BLOCKS.forEach(cz => BLOCKS.forEach(cx => {
    [[-14.5, -14.5], [14.5, -14.5], [-14.5, 14.5], [14.5, 14.5], [0, -14.5], [0, 14.5], [-14.5, 0], [14.5, 0]]
      .forEach(p => { lamps.push([cx + p[0], cz + p[1]]); world.obstacle(cx + p[0], cz + p[1], 0.2, 0.2, 6); });

    // street trees + little furniture on the sidewalks
    [[-14.5, -7], [14.5, 7], [-7, 14.5], [7, -14.5]].forEach(p =>
      place('tree', cx + p[0], cz + p[1], rnd() * 6.28, { s: 0.6 + rnd() * 0.25, hw: 0.4, hd: 0.4 }));
    place('hydrant',   cx - 14.4, cz - 10, 0);
    place('mailbox',   cx + 14.4, cz + 10, -PI / 2);
    place('trash_can', cx - 14.4, cz + 10, 0);
    place('power_box', cx + 14.4, cz - 10, 0);
  }));
  if (lamps.length) {
    const d = new THREE.Object3D();
    const inst = (geo, mat, fn) => {
      const m = new THREE.InstancedMesh(geo, mat, lamps.length);
      lamps.forEach((l, i) => { fn(d, l); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
      m.instanceMatrix.needsUpdate = true; m.frustumCulled = false;
      world.scene.add(m);
    };
    inst(new THREE.CylinderGeometry(0.1, 0.13, 6, 6), world.getMat(0x444444),
      (o, l) => { o.position.set(l[0], 3, l[1]); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); });
    inst(new THREE.BoxGeometry(0.7, 0.2, 0.7), world.lampMat,
      (o, l) => { o.position.set(l[0], 6.1, l[1]); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); });
  }

  // ---- intersections: traffic lights + manholes ----
  ROADS.forEach(rx => ROADS.forEach(rz => {
    place('traffic_light', rx + 6.3, rz + 6.3, 0, { hw: 0.3, hd: 0.3 });
    place('traffic_light', rx - 6.3, rz - 6.3, PI, { hw: 0.3, hd: 0.3 });
    place('manhole', rx + 2.6, rz - 2.6, 0, { collide: false });
  }));

  // ---- a few bus stops ----
  for (let i = 0; i < 6; i++) {
    const cx = pick(BLOCKS), cz = pick(BLOCKS), south = rnd() < 0.5;
    place('bus_stop', cx + (rnd() < 0.5 ? -4 : 4), cz + (south ? 14.1 : -14.1), south ? 0 : PI);
  }

  // ---- parked cars along the curbs ----
  const PARKED = CONFIG.PARKED_MODELS.filter(n => world.models[n]);
  if (PARKED.length) {
    ROADS.forEach(r => {
      for (let t = -80; t <= 80; t += 9) {
        if (ROADS.some(c => Math.abs(t - c) < 9)) continue;
        [-4.0, 4.0].forEach(off => {
          if (rnd() < 0.3) place(pick(PARKED), t, r + off, rnd() < 0.5 ? PI / 2 : -PI / 2);
          if (rnd() < 0.3) place(pick(PARKED), r + off, t, rnd() < 0.5 ? 0 : PI);
        });
      }
    });
  }
};
