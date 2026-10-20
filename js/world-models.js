// js/world-models.js  -  loads the .glb files from assets/ and places them.
// world.place('bld_red', x, z, rotation)  puts one copy in the city (fast: all copies are drawn together).
world.models = {};      // name -> { parts, w, d, h }   (size after scaling)
world.instances = {};   // name -> list of placed copies
world.missing = [];     // files that failed to load

world.convertMaterial = (function() {
  const cache = new Map();
  return function(m) {
    if (cache.has(m)) return cache.get(m);
    const col = m.color ? m.color.clone() : new THREE.Color(1, 1, 1);
    if (col.convertLinearToSRGB) col.convertLinearToSRGB();   // glb colours are linear; our screen is not
    const n = new THREE.MeshLambertMaterial({
      color: col, map: m.map || null, vertexColors: !!m.vertexColors,
      transparent: !!m.transparent, opacity: m.opacity === undefined ? 1 : m.opacity,
      side: m.side, alphaTest: m.alphaTest || 0
    });
    if (m.map) { m.map.encoding = THREE.LinearEncoding; m.map.needsUpdate = true; }
    if (/window|glass/i.test(m.name || '')) {                // windows light up at night
      n.emissive = new THREE.Color(0xffd98a);
      n.emissiveIntensity = world.nf;
      world.facadeMats.push(n);
    }
    cache.set(m, n);
    return n;
  };
})();

// resize one loaded model, put its feet on the ground and its centre at (0,0)
world.prepareModel = function(name, cfg, root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  let s = cfg.scale || 1;
  if (cfg.height) s = cfg.height / size.y;
  else if (cfg.length) s = cfg.length / Math.max(size.x, size.z);
  const rot = cfg.rot || 0;
  const N = new THREE.Matrix4().makeRotationY(rot)
    .multiply(new THREE.Matrix4().makeScale(s, s, s))
    .multiply(new THREE.Matrix4().makeTranslation(-ctr.x, -box.min.y, -ctr.z));
  const parts = [];
  root.traverse(o => {
    if (o.isMesh) parts.push({ geometry: o.geometry, material: world.convertMaterial(o.material), matrix: N.clone().multiply(o.matrixWorld) });
  });
  const turned = Math.abs(Math.sin(rot)) > 0.7;
  world.models[name] = { parts, shadow: !!cfg.shadow, w: (turned ? size.z : size.x) * s, d: (turned ? size.x : size.z) * s, h: size.y * s };
};

world.loadModels = function(done) {
  const names = Object.keys(CONFIG.MODELS);
  let left = names.length;
  const status = document.getElementById('loading');
  const finish = () => {
    left--;
    if (status) status.textContent = 'Loading city... ' + (names.length - left) + ' / ' + names.length;
    if (left === 0) done();
  };
  if (!THREE.GLTFLoader) { names.forEach(n => world.missing.push(CONFIG.MODELS[n].file)); done(); return; }
  const loader = new THREE.GLTFLoader();
  names.forEach(name => {
    const cfg = CONFIG.MODELS[name];
    loader.load(CONFIG.ASSET_DIR + cfg.file,
      gltf => {
        try { world.prepareModel(name, cfg, gltf.scene); }
        catch (e) { console.warn('model problem', cfg.file, e); world.missing.push(cfg.file); }
        finish();
      },
      undefined,
      () => { world.missing.push(cfg.file); finish(); });
  });
};

// put a model in the city. opts: { s: size multiplier, y: height, collide: false, hw/hd/h: custom collision box }
world.place = function(name, x, z, rot, opts) {
  const mdl = world.models[name];
  if (!mdl) return null;
  opts = opts || {};
  rot = rot || 0;
  const s = opts.s || 1;
  (world.instances[name] = world.instances[name] || []).push({ x, y: opts.y || 0, z, rot, s });
  if (opts.collide !== false) {
    const t = Math.pow(Math.sin(rot), 2);                   // 0 = facing along z, 1 = turned a quarter
    const hw = (mdl.w * (1 - t) + mdl.d * t) * s / 2, hd = (mdl.d * (1 - t) + mdl.w * t) * s / 2;
    world.obstacle(x, z, opts.hw || hw, opts.hd || hd, opts.h || mdl.h * s);
  }
  return mdl;
};

// turn all placed copies into InstancedMeshes (few draw calls = fast)
world.buildInstances = function() {
  const tmp = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);
  for (const name in world.instances) {
    const list = world.instances[name], mdl = world.models[name];
    mdl.parts.forEach(part => {
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, list.length);
      list.forEach((it, i) => {
        tmp.compose(p.set(it.x, it.y, it.z), q.setFromAxisAngle(Y, it.rot), sc.set(it.s, it.s, it.s));
        tmp.multiply(part.matrix);
        mesh.setMatrixAt(i, tmp);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.castShadow = CONFIG.SHADOWS && mdl.shadow;
      mesh.receiveShadow = true;
      world.scene.add(mesh);
    });
  }
};

// one separate copy that can move (used for the driving cars)
world.cloneModel = function(name) {
  const mdl = world.models[name];
  if (!mdl) return null;
  const g = new THREE.Group();
  mdl.parts.forEach(part => {
    const m = new THREE.Mesh(part.geometry, part.material);
    m.matrixAutoUpdate = false;
    m.matrix.copy(part.matrix);
    m.castShadow = CONFIG.SHADOWS && mdl.shadow;
    m.receiveShadow = true;
    g.add(m);
  });
  return g;
};
