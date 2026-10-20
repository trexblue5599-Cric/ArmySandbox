// js/world-batches.js  -  draws trees and lamps in a few fast batches
// (The old code-generated parked cars have been removed to use .glb cars instead)
world.initBatches = function() {
  const { rnd, pick, mix, smooth, getMat, flat, obstacle } = world;

  // ---------- BATCHES (instanced = very few draw calls) ----------
  (function batches() {
    const d = new THREE.Object3D();
    function make(geo, mat, list, fn, shadow) {
      if (!list || !list.length) return;
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
  })();
}; 
