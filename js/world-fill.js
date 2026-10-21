// js/world-fill.js  -  fills the empty land around the town: trees, bushes and paved slabs.
// Everything is placed only on free land: never on roads, water, buildings, farms or the town.
// To change how much fills the empty land, change FILL below.
const FILL = {
  TREES: 900,        // full-size trees (they become obstacles)
  BUSHES: 2600,      // low bushes (you walk through them)
  SLABS: 36,         // paved slabs (16 x 16 m with a tile grid)
  REACH: CONFIG.LIMIT - 24,   // how far from the middle the filling goes
  TRIES: 60000       // random spots to try before stopping
};

world.initFill = function() {
  const rand = Math.random;
  const placed = [];   // slabs placed here, so nothing overlaps them

  // a spot is good when it is free land, not on a map patch / building / water, and not on another slab
  const inside = (r, x, z, m) => Math.abs(x - r.x) < r.w / 2 + m && Math.abs(z - r.z) < r.d / 2 + m;
  const good = (x, z, m) => {
    if (Math.abs(x) > FILL.REACH || Math.abs(z) > FILL.REACH) return false;
    if (!world.freeLand(x, z)) return false;
    if (world.mapRects.some(r => inside(r, x, z, m))) return false;
    if (placed.some(r => inside(r, x, z, m))) return false;
    return true;
  };

  // ---------- paved slabs first (so trees and bushes keep off them) ----------
  let slabs = 0;
  for (let i = 0; i < FILL.TRIES && slabs < FILL.SLABS; i++) {
    const x = (rand() * 2 - 1) * FILL.REACH, z = (rand() * 2 - 1) * FILL.REACH;
    if (!good(x, z, 6)) continue;
    const S = 16;
    world.flat(S, S, 0xd7d3c9, x, 0.07, z, 0.02);                 // the slab
    for (let k = -S / 2 + 4; k < S / 2; k += 4) {                  // tile lines
      world.flat(S, 0.12, 0xb8b4a9, x, 0.09, z + k, 0.02);
      world.flat(0.12, S, 0xb8b4a9, x + k, 0.09, z, 0.02);
    }
    placed.push({ x, z, w: S, d: S });
    slabs++;
  }

  // ---------- trees ----------
  let trees = 0;
  for (let i = 0; i < FILL.TRIES && trees < FILL.TREES; i++) {
    const x = (rand() * 2 - 1) * FILL.REACH, z = (rand() * 2 - 1) * FILL.REACH;
    if (!good(x, z, 3)) continue;
    world.tree(x, z, 0.9 + rand() * 0.7);
    trees++;
  }

  // ---------- bushes: one instanced mesh for all of them (very few draw calls) ----------
  const spots = [];
  for (let i = 0; i < FILL.TRIES && spots.length < FILL.BUSHES; i++) {
    const x = (rand() * 2 - 1) * FILL.REACH, z = (rand() * 2 - 1) * FILL.REACH;
    if (!good(x, z, 1)) continue;
    spots.push([x, z]);
  }
  if (spots.length) {
    const geo = new THREE.IcosahedronGeometry(0.9, 0);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
    const greens = [0x3f7d3a, 0x4a8f43, 0x2f6b2c, 0x5a9c3f, 0x3a7f4f];
    const d = new THREE.Object3D(), col = new THREE.Color();
    spots.forEach((p, i) => {
      const s = 0.7 + rand() * 0.8;
      d.position.set(p[0], 0.55 * s, p[1]);
      d.rotation.set(0, rand() * 6.28, 0);
      d.scale.set(s * (1 + rand() * 0.4), s * (0.7 + rand() * 0.3), s * (1 + rand() * 0.4));
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      mesh.setColorAt(i, col.setHex(greens[Math.floor(rand() * greens.length)]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    world.scene.add(mesh);
  }
  console.log('filled: slabs', slabs, 'trees', trees, 'bushes', spots.length);
};
