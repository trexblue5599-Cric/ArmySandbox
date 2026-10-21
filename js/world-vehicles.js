// js/world-vehicles.js  -  trains and boats from the vehicles/ folders.
//   * a train runs up and down the west railway (it stops at each end, then comes back)
//   * boats sail back and forth on the north lake, the east lake and the east sea
//   * buoys sit on the water
// Change the numbers in TRAIN and BOATS below to move or speed them up.
const TRAIN = {
  X: -133,          // the railway runs north-south at this x
  Z0: -196, Z1: 196,// where the track starts and ends
  SPEED: 14,        // units per second
  PAUSE: 3,         // seconds it waits at each end
  LOCO: 2.4, CAR: 2.7, GAP: 0.2,   // lengths of the locomotive and carriages
  MODELS: ['vehicles/trains/train-diesel-a.glb', 'vehicles/trains/train-carriage-container-red.glb',
           'vehicles/trains/train-carriage-tank.glb', 'vehicles/trains/train-carriage-container-blue.glb']
};
const BOATS = [
  // from / to are the two ends of its route (in water); scale = how big it looks
  { path: 'vehicles/ships/ship-ocean-liner.glb', from: [176, -24], to: [176, 36], scale: 1.2, speed: 3.5 },
  { path: 'vehicles/ships/ship-cargo-b.glb',    from: [30, -160],  to: [210, -160], scale: 1.6, speed: 4 },
  { path: 'vehicles/ships/boat-tug-c.glb',      from: [150, -100], to: [150, -52],  scale: 2.0, speed: 3 },
  { path: 'vehicles/ships/boat-speed-e.glb',    from: [60, -205],  to: [60, -140],  scale: 2.0, speed: 7 },
  { path: 'vehicles/ships/boat-house-c.glb',    from: [200, -84],  to: [200, -40],  scale: 1.8, speed: 2.5 }
];
const BUOYS = [[140, -60], [60, -132], [176, -28], [200, -112]];

world.initVehicles = function() {
  const loader = new THREE.GLTFLoader();
  const load = (path, cb) => loader.load(path, g => cb(g.scene), undefined, err => console.warn('vehicle missing:', path, err));

  // stand a model on the ground: its bottom at yBottom, its middle on (0, 0), scaled to 'scale'
  const standing = (scene, scale, yBottom) => {
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const c = box.getCenter(new THREE.Vector3());
    scene.scale.setScalar(scale);
    scene.position.set(-c.x * scale, yBottom - box.min.y * scale, -c.z * scale);
    const g = new THREE.Group(); g.add(scene); return g;
  };

  // ---------- the railway: one straight track piece, repeated ----------
  load('vehicles/trains/railroad-straight.glb', tpl => {
    const piece = standing(tpl, 1, 0.06);
    for (let z = TRAIN.Z0 + 2; z < TRAIN.Z1; z += 4) {
      const t = piece.clone(true);
      t.position.set(TRAIN.X, 0, z);
      world.scene.add(t);
    }
  });

  // ---------- the train: loads each carriage, then starts the ride ----------
  const parts = new Array(TRAIN.MODELS.length);
  let left = TRAIN.MODELS.length;
  TRAIN.MODELS.forEach((path, i) => load(path, scene => {
    parts[i] = standing(scene, 1, 0.16);      // sits on top of the track
    if (--left === 0) startTrain(parts.filter(Boolean));
  }));
  // (if a model is missing its slot stays empty; the train runs with what loaded)
  setTimeout(() => { if (left > 0 && parts.some(Boolean)) { left = 0; startTrain(parts.filter(Boolean)); } }, 15000);

  const startTrain = (groups) => {
    const cars = groups.map((g, i) => { world.scene.add(g); return { g, len: i === 0 ? TRAIN.LOCO : TRAIN.CAR }; });
    world.train = { cars, front: TRAIN.Z0, dir: 1, pause: 0 };
  };

  // ---------- boats ----------
  BOATS.forEach(b => load(b.path, scene => {
    const g = standing(scene, b.scale, 0.04);   // floats just above the water
    world.scene.add(g);
    const dx = b.to[0] - b.from[0], dz = b.to[1] - b.from[1];
    const len = Math.hypot(dx, dz);
    world.boats = world.boats || [];
    world.boats.push({ g, b, len, u: 0, dir: 1, heading: Math.atan2(dx, dz), t: Math.random() * 6 });
  }));

  // ---------- buoys ----------
  load('vehicles/ships/buoy.glb', scene => {
    BUOYS.forEach(p => { const g = standing(scene.clone(true), 1, 0.04); g.position.set(p[0], 0, p[1]); world.scene.add(g); });
  });
};

// called every frame from the game loop
world.updateVehicles = function(dt) {
  // the train
  const tr = world.train;
  if (tr) {
    if (tr.pause > 0) tr.pause -= dt;
    else {
      tr.front += tr.dir * TRAIN.SPEED * dt;
      if (tr.dir > 0 && tr.front >= TRAIN.Z1) { tr.front = TRAIN.Z1; tr.dir = -1; tr.pause = TRAIN.PAUSE; }
      if (tr.dir < 0 && tr.front <= TRAIN.Z0) { tr.front = TRAIN.Z0; tr.dir = 1; tr.pause = TRAIN.PAUSE; }
    }
    // each carriage sits behind the one in front of it
    let back = 0;
    tr.cars.forEach((c, i) => {
      const centre = back + c.len / 2;
      c.g.position.set(TRAIN.X, 0, tr.front - tr.dir * centre);
      c.g.rotation.y = tr.dir > 0 ? 0 : Math.PI;
      back += c.len + TRAIN.GAP;
    });
  }

  // the boats
  (world.boats || []).forEach(o => {
    const b = o.b;
    o.u += o.dir * b.speed * dt / o.len;
    if (o.u >= 1) { o.u = 1; o.dir = -1; }
    if (o.u <= 0) { o.u = 0; o.dir = 1; }
    const x = b.from[0] + (b.to[0] - b.from[0]) * o.u;
    const z = b.from[1] + (b.to[1] - b.from[1]) * o.u;
    o.t += dt;
    o.g.position.set(x, Math.sin(o.t * 1.6) * 0.05, z);      // a little bob on the waves
    o.g.rotation.y = o.heading + (o.dir < 0 ? Math.PI : 0);
  });
};
