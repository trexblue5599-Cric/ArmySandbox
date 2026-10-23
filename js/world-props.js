// js/world-props.js  -  puts the .glb models from props/ around the map.
// Each prop is scaled to a height you choose (in metres) so it looks right no matter how big it was in its file.
// To add a prop: add one line in the PLACE section below.  Format:
//   P('File name without .glb', height_m, x, z, rotation_radians, solid?)
//   LINE('File name', height_m, x0, z0, x1, z1, solid?)  -> repeats the prop along a line (fences)
// solid = true means you can't walk through it.
world.initProps = function() {
  const { CAR_COLORS } = CONFIG;
  const want = [];
  const P = (name, h, x, z, rot, solid) => want.push({ name, h, x, z, rot: rot || 0, solid: !!solid });
  const LINE = (name, h, x0, z0, x1, z1, solid) => want.push({ name, h, line: [x0, z0, x1, z1], solid: !!solid });

  // ---------- PLACE: the city ----------
  // every city block: a bin and a fire hydrant on the pavement
  CONFIG.BLOCKS_Z.forEach((cz) => CONFIG.BLOCKS.forEach((cx) => {
    P('Trash Can', 1.0, cx + 8, cz + 14.7, 0, true);
    P('Fire hydrant', 0.85, cx - 8, cz - 14.7, 0, true);
  }));
  // downtown blocks: a cash machine on the pavement
  CONFIG.BLOCKS_Z.forEach((cz, row) => CONFIG.BLOCKS.forEach((cx, col) => {
    if (CONFIG.DISTRICTS[row][col] === 'downtown') P('ATM', 2.1, cx + 9, cz + 14.7, Math.PI, true);
  }));
  // suburb blocks: a mailbox in front of each house
  CONFIG.BLOCKS_Z.forEach((cz, row) => CONFIG.BLOCKS.forEach((cx, col) => {
    if (CONFIG.DISTRICTS[row][col] !== 'suburb') return;
    [[-7, -7], [7, -7], [-7, 7], [7, 7]].forEach(p => P('Mailbox', 1.1, cx + p[0] + 4.2, cz + p[1] + 5.5, 0, true));
  }));
  // the plaza: flower pots around the fountain
  CONFIG.BLOCKS_Z.forEach((cz, row) => CONFIG.BLOCKS.forEach((cx, col) => {
    if (CONFIG.DISTRICTS[row][col] !== 'plaza') return;
    [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(p => P('Flower Pot', 0.9, cx + p[0], cz + p[1], 0, true));
  }));
  // a billboard for the city edge and one for the highway
  P('Billboard', 9, 70, 170, 0);
  P('Billboard', 9, 124, 168, Math.PI / 2);

  // ---------- PLACE: GLB TREES (files live beside index.html) ----------
  // These exact filenames are supplied by the user. If a file is absent, procedural trees remain.
  const treeModels = ['Tree_3', 'TreeRound_2', 'TreeDry_2'];
  // Reduced by 60% from the previous version (240 -> 96 GLB trees).
  for (let i = 0; i < 96; i++) {
    const x = (world.rnd() - 0.5) * 1120;
    const z = (world.rnd() - 0.5) * 1120;
    if (!world.freeLand || !world.freeLand(x, z)) continue;
    // Leave wide gaps and keep the main urban blocks clear.
    if (Math.abs(x) < 145 && Math.abs(z) < 165) continue;
    if (world.riverDist && world.riverDist(x, z) < 14) continue;
    P(treeModels[i % treeModels.length], 5.5 + world.rnd() * 2.2, x, z, world.rnd() * Math.PI * 2, false);
  }

  // ---------- PLACE: the outside of town ----------
  // farm fences along the north edge of the south-west fields
  LINE('Fence', 1.1, -124, 86.5, -6, 86.5, false);
  // a yard tree at each farm and town spot, and around the fields
  (world.mapTreeSpots || []).forEach(t => P('Tree', 6, t[0], t[1], 0, true));
  // traffic light and stop sign at the farm-road / highway junction
  P('Traffic Light', 4.2, 5.8, 155.2, 0, true);
  P('Stop sign', 2.6, -5.8, 164.8, 0, true);
  // traffic cones around the quarry edge (warning)
  [[-172, 38], [-132, 38], [-172, 98], [-132, 98]].forEach(p => P('Cone', 0.9, p[0], p[1], 0, false));
  // cargo boxes on the harbour quay
  [[136, 18], [136, 24], [146, 21]].forEach(p => P('Box', 1.6, p[0], p[1], 0, true));
  // a yellow-bin pile (trash bags) at the town and harbour
  [[60, 142], [104, 142], [136, 140]].forEach(p => P('trah bag grey', 0.9, p[0], p[1], 0, false));

  // ---------- MORE DETAIL IN THE CITY ----------
  CONFIG.BLOCKS_Z.forEach((cz, row) => CONFIG.BLOCKS.forEach((cx, col) => {
    const d = CONFIG.DISTRICTS[row][col];
    if (d === 'industrial') P('Power Box', 1.8, cx - 13, cz + 14.6, 0, true);          // electric box on the pavement
    if (d === 'suburb') P('Washing Line', 2.2, cx + 12, cz - 3, Math.PI / 2, false);   // washing in the back yard
    if (d === 'mid' || d === 'downtown') P('Fire Exit', 2.6, cx + 11.2, cz - 3, Math.PI / 2, false);   // fire exit on the building side
  }));
  // traffic lights and stop signs at the middle crossing
  P('Traffic Light', 4.2, 6.3, 6.3, Math.PI, true);
  P('Traffic Light', 4.2, -6.3, -6.3, 0, true);
  P('Stop sign', 2.6, 6.3, -6.3, Math.PI / 2, true);
  P('Stop sign', 2.6, -6.3, 6.3, -Math.PI / 2, true);
  // the ends of the farm fence
  P('Fence End', 1.1, -124, 87.5, 0, false);
  P('Fence End', 1.1, -6, 87.5, Math.PI, false);

  // ---------- LOAD + PLACE ----------
  const loader = new THREE.GLTFLoader();
  const names = [...new Set(want.map(w => w.name))];
  const models = {};
  let left = names.length;
  const done = () => { if (--left === 0) placeAll(); };

  names.forEach(name => {
    const isRootAsset = ['Tree_3', 'TreeRound_2', 'TreeDry_2'].includes(name);
    loader.load((isRootAsset ? '' : 'props/') + name + '.glb', gltf => {
      try {
        const root = gltf.scene;
        root.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        if (size.y > 0.0001) models[name] = { root, box, size };
        else console.warn('prop has no size, skipped:', name);
      } catch (e) { console.warn('prop could not be read:', name, e); }
      done();
    }, undefined, err => { console.warn('prop not found:', name, err); done(); });
  });

  function place(m, h, x, z, rot, solid) {
    const s = h / m.size.y;
    const holder = new THREE.Group();
    const obj = m.root.clone(true);                      // shares the geometry + colours: cheap
    obj.scale.setScalar(s);
    const c = m.box.getCenter(new THREE.Vector3());
    obj.position.set(-c.x * s, -m.box.min.y * s, -c.z * s);
    holder.add(obj);
    holder.position.set(x, 0, z);
    holder.rotation.y = rot;
    world.scene.add(holder);
    if (solid) world.obstacle(x, z, Math.max(0.3, m.size.x * s * 0.4), Math.max(0.3, m.size.z * s * 0.4), h);
    return holder;
  }

  function placeAll() {
    want.forEach(w => {
      const m = models[w.name];
      if (!m) return;
      if (w.line) {
        const [x0, z0, x1, z1] = w.line;
        const len = Math.hypot(x1 - x0, z1 - z0);
        const width = m.size.x * (w.h / m.size.y);     // how long one piece is
        const n = Math.min(200, Math.floor(len / Math.max(0.05, width)));   // safety cap
        const rot = Math.atan2(-(z1 - z0), x1 - x0);   // turns the model's length along the line
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          place(m, w.h, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, rot, w.solid);
        }
      } else {
        place(m, w.h, w.x, w.z, w.rot, w.solid);
      }
    });
    world.propsLoaded = true;
  }
};
