// js/world-roads.js  -  the city street grid. Roads run between the city blocks, with junctions, so the
// cars can drive on them and turn at crossings, and the people keep off them.
// The road layout comes from CONFIG.ROADS (the outer ring is ±120). To change the roads, change CONFIG.ROADS and ROAD_W.
world.initRoads = function() {
  const W = CONFIG.ROAD_W || 10;
  const xs = CONFIG.ROADS.filter(v => Math.abs(v) <= 120);      // the grid lines (roads run along each one)
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3d });

  // the city ground (under the blocks and the roads)
  world.flat(252, 252, 0x9a9c98, 0, 0.02, 0, 0.04);

  // every road is split into pieces between junctions; cars can turn at each junction
  const paths = [];
  xs.forEach(z => {                                             // roads running along x
    for (let i = 0; i < xs.length - 1; i++) paths.push({ points: [[xs[i], z], [xs[i + 1], z]], width: W });
  });
  xs.forEach(x => {                                             // roads running along z
    for (let i = 0; i < xs.length - 1; i++) paths.push({ points: [[x, xs[i]], [x, xs[i + 1]]], width: W });
  });

  // the asphalt of each piece
  paths.forEach(p => {
    const [a, b] = p.points, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const horizontal = Math.abs(b[1] - a[1]) < 1e-6;
    const m = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? len : W, 0.02, horizontal ? W : len), roadMat);
    m.position.set(mx, 0.06, mz);
    m.receiveShadow = true;
    world.scene.add(m);
  });

  // centre dashes, one instanced mesh for all of them
  const dashes = [];
  paths.forEach(p => {
    const [a, b] = p.points, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const horizontal = Math.abs(b[1] - a[1]) < 1e-6;
    const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    for (let s = W / 2 + 1.5; s < len - W / 2; s += 6) {
      dashes.push({ x: a[0] + ux * s, z: a[1] + uz * s, horizontal });
    }
  });
  if (dashes.length) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(3, 0.02, 0.3), new THREE.MeshLambertMaterial({ color: 0xe8e2c0 }), dashes.length);
    const d = new THREE.Object3D();
    dashes.forEach((t, i) => {
      d.position.set(t.x, 0.09, t.z);
      d.rotation.set(0, t.horizontal ? 0 : Math.PI / 2, 0);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    world.scene.add(mesh);
  }

  world.roadPaths = paths;
  world.roadCenterlines = paths.map(p => ({ points: p.points, width: p.width }));
  world.roadNetworkBuilt = true;
};
