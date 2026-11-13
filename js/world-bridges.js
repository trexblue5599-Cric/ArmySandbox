// js/world-bridges.js  -  real-looking bridges wherever a road crosses a river.
// The road itself is already walkable/drivable over the water (see MAP.inRiver in world-map.js);
// this file only adds the solid deck, side walls and pillars so each crossing looks like a bridge.
// world.bridges lists them (x, z, length) for later use (cars, missions...).
world.initBridges = function() {
  const THREE = window.THREE;
  if (!world.scene || !THREE || !world.roadPaths || typeof MAP === 'undefined') return;

  const slabs = [], walls = [], pillars = [];
  world.bridges = [];

  world.roadPaths.forEach((road) => {
    // sample the road every ~1.5 m and find the stretches that are over the river
    const pts = [];
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i], b = road.points[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.ceil(L / 1.5));
      for (let k = 0; k < n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
    }
    pts.push(road.points[road.points.length - 1]);
    const wet = pts.map(p => MAP.inRiverRaw(p[0], p[1]));
    let k = 0;
    while (k < pts.length) {
      if (!wet[k]) { k++; continue; }
      let e = k; while (e + 1 < pts.length && wet[e + 1]) e++;
      const a = Math.max(0, k - 3), b = Math.min(pts.length - 1, e + 3);      // a little land at each end
      addSpan(road, pts.slice(a, b + 1));
      k = e + 1;
    }
  });

  function addSpan(road, p) {
    const W = road.width + 6;                       // as wide as the kerb strip
    let len = 0, nextPillar = 8;
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
      if (L < 0.01) continue;
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, rot = -Math.atan2(dz, dx);
      const top = MAP.heightAt(mx, mz) + 0.26;      // just under the kerb surface
      slabs.push({ x: mx, y: top - 0.45, z: mz, rot, sx: L + 0.15, sy: 0.9, sz: W });
      const nx = -dz / L, nz = dx / L;
      [-1, 1].forEach(side => walls.push({ x: mx + nx * side * (W / 2 - 0.15), y: top + 0.55, z: mz + nz * side * (W / 2 - 0.15), rot, sx: L + 0.15, sy: 1.1, sz: 0.3 }));
      len += L;
      if (len >= nextPillar) {
        nextPillar += 12;
        const h = top - 0.9 + 3.5;                   // from 3.5 m under the water up to the deck
        pillars.push({ x: mx, y: top - 0.9 - h / 2, z: mz, rot, sx: 1.4, sy: h, sz: W - 1 });
      }
    }
    const mid = p[Math.floor(p.length / 2)];
    world.bridges.push({ x: mid[0], z: mid[1], length: len, width: W, road: road.name });
  }

  const make = (list, color) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color }), list.length);
    const o = new THREE.Object3D();
    list.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z); o.rotation.set(0, it.rot, 0); o.scale.set(it.sx, it.sy, it.sz);
      o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    world.scene.add(mesh);
  };
  make(slabs, 0x7d7f7a);      // concrete deck
  make(walls, 0xcfcac0);      // side walls
  make(pillars, 0x65675f);    // pillars down into the water
};
