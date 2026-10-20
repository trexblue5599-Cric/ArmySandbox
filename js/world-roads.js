// js/world-roads.js  -  ground, roads, lane lines and crosswalks
world.initRoads = function() {
  const { ROADS, ROAD_W, BLOCKS, DISTRICTS, LAKE, CAR_COLORS, DAY_LENGTH, START_HOUR, DOWN_STYLES, MID_STYLES, WALLS, ROOFS, SHIRTS, PANTS, SKINS } = CONFIG;
  const { rnd, pick, mix, smooth, getMat, flat, obstacle } = world;
  // ---------- GROUND, SLAB, ROADS ----------
  const grass = world.add(new THREE.PlaneGeometry(700, 700), 0x6fae4f, 0, 0, 0);
  grass.rotation.x = -Math.PI / 2; grass.castShadow = false;
  const SL = CONFIG.HALF * 2;
  flat(SL, SL, 0x9a9c98, 0, 0.02, 0, 0.04);
  ROADS.forEach(r => {
    flat(SL, ROAD_W, 0x3a3a3d, 0, 0.05, r, 0.05);
    flat(ROAD_W, SL, 0x3a3a3d, r, 0.05, 0, 0.05);
  });

  // road paint (instanced = cheap)
  (function paint() {
    const dummy = new THREE.Object3D();
    const dashes = [], stripes = [];
    ROADS.forEach(r => {
      for (let t = -(CONFIG.HALF - 2); t <= CONFIG.HALF - 2; t += 5) {
        if (ROADS.some(c => Math.abs(t - c) < 8.5)) continue;
        dashes.push([t, r, 0]); dashes.push([r, t, 1]);
      }
    });
    ROADS.forEach(rx => ROADS.forEach(rz => {
      for (let s = -4; s <= 4; s++) {
        stripes.push([rx - 6.6, rz + s, 0]); stripes.push([rx + 6.6, rz + s, 0]);
        stripes.push([rx + s, rz - 6.6, 1]); stripes.push([rx + s, rz + 6.6, 1]);
      }
    }));
    function inst(list, geo, color) {
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color }), list.length);
      list.forEach((d, i) => {
        dummy.position.set(d[0], 0.09, d[1]);
        dummy.rotation.y = d[2] ? Math.PI / 2 : 0;
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      world.scene.add(mesh);
    }
    inst(dashes, new THREE.BoxGeometry(2.2, 0.02, 0.22), 0xe0c940);
    inst(stripes, new THREE.BoxGeometry(2.4, 0.02, 0.5), 0xeeeeee);
  })();

};
