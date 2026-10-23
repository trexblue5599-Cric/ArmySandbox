// js/dude-mix.js  -  the Mixamo-rigged person from dtwmp.glb (real joints + its own walk animation).
// Same interface as dude.make(look): .group, .dress(look), .animate(dt, speed).
// Shirt, trousers, skin and shoes are painted per person with vertex colours (no gaps at the joints).
// Eyes: a white circle with a black pupil on the head.
const MIX = {
  FILE: 'dtwmp.glb',
  HEIGHT: 1.9,             // every person is this many metres tall
  WALK_SPEED: 3.5,         // the speed (m/s) at which the walk animation plays at normal pace
  HEAD_BONE: 'mixamorig:Head_06'
};
const dude = { ready: false };
const DUDE_CLOTH = 0;     // no separate cloth layer on this model (used by the wardrobe)
// the accessories (hats, glasses, face hair, backpacks, vests...) were built for a model that is
// DUDE_RAW_H units tall and stands DUDE_HEIGHT metres: they are scaled to match this person.
const DUDE_HEIGHT = 1.9, DUDE_RAW_H = 2.632;

dude.load = function(done) {
  if (typeof THREE.SkeletonUtils === 'undefined') { console.warn('SkeletonUtils missing: using the old dude'); return done(false); }
  new THREE.GLTFLoader().load(MIX.FILE, gltf => {
    try { dude.build(gltf); } catch (e) { console.warn('dtwmp.glb could not be used', e); }
    done(dude.ready);
  }, undefined, err => { console.warn('dtwmp.glb not loaded', err); done(false); });
};

// ---------------------------------------------------------------- one-time setup
dude.build = function(gltf) {
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const H = box.max.y - box.min.y, S = MIX.HEIGHT / H;
  const meshes = []; root.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  if (!meshes.length) throw new Error('no skinned meshes in dtwmp.glb');

  // which part of the body each vertex is: 0 skin, 1 shirt, 2 trousers, 3 shoes
  const regions = meshes.map(m => {
    const pos = m.geometry.attributes.position, n = pos.count, r = new Uint8Array(n);
    let top = -1e9, lo = 1e9, hi = -1e9; const headY = 0;
    for (let i = 0; i < n; i++) { const y = pos.getY(i); top = Math.max(top, y); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    const isShoe = hi < 0.3, isLeg = !isShoe && hi < 2.6;
    for (let i = 0; i < n; i++) {
      const y = pos.getY(i);
      if (isShoe) r[i] = 3;
      else if (isLeg) r[i] = 2;
      else r[i] = y > top - 0.9 ? 0 : 1;      // the head (top of the body) is skin, the rest is shirt
    }
    return r;
  });

  // eyes: where the head is, in the model's own space
  const headVerts = [];
  meshes.forEach((m, k) => {
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) if (regions[k][i] === 0) headVerts.push([p.getX(i), p.getY(i), p.getZ(i)]);
  });
  let x0 = 1e9, x1 = -1e9, y1 = -1e9, zMax = -1e9, yc = 0;
  headVerts.forEach(v => { x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); zMax = Math.max(zMax, v[2]); yc += v[1]; });
  yc /= Math.max(1, headVerts.length);
  const eyeAt = { x: (x1 - x0) * 0.22, y: yc + (y1 - yc) * 0.15, z: zMax };   // offset from the head centre

  const headC = [0, 0, 0]; headVerts.forEach(v => { headC[0] += v[0]; headC[1] += v[1]; headC[2] += v[2]; });
  headC.forEach((_, i) => { headC[i] /= Math.max(1, headVerts.length); });
  dude.src = { root, meshes, regions, S, minY: box.min.y, eyeAt, headC, headBoneName: MIX.HEAD_BONE, clip: gltf.animations[0] };
  dude.ready = true;
};

// ---------------------------------------------------------------- one person
dude.make = function(look) {
  const src = dude.src;
  const obj = THREE.SkeletonUtils.clone(src.root);     // a new skeleton + the same mesh data
  const holder = new THREE.Group();
  holder.add(obj);
  obj.scale.setScalar(src.S);
  obj.position.y = -src.minY * src.S;

  const d = { group: holder, look, skinMat: null, bodyMeshes: [], t: 0, mv: 0, phase: 0, acc: null };
  d.mixer = new THREE.AnimationMixer(obj);
  d.action = d.mixer.clipAction(src.clip);
  d.action.play();
  d.action.time = Math.random() * src.clip.duration;        // everyone starts at a different point of the walk

  // the meshes of THIS person: each gets its own colour data
  const bodyMeshes = [];
  obj.traverse(o => { if (o.isSkinnedMesh) bodyMeshes.push(o); });
  d.regions = src.regions;
  d.parts = bodyMeshes;
  bodyMeshes.forEach((m, k) => {
    m.geometry = m.geometry.clone();                     // own geometry so the colours are not shared
    m.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(m.geometry.attributes.position.count * 3), 3));
    m.material = new THREE.MeshLambertMaterial({ vertexColors: true, skinning: true });
    m.castShadow = true; m.frustumCulled = false;
  });

  // eyes on the head bone (they move with the head)
  obj.updateMatrixWorld(true);
  const head = obj.getObjectByName(src.headBoneName) || obj;
  const hp = new THREE.Vector3(); head.getWorldPosition(hp); obj.worldToLocal(hp);
  const bone = new THREE.Vector3(hp.x, hp.y, hp.z);
  const eyeWhite = dude.eyeWhiteMat || (dude.eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf4f4f4 }));
  const pupilMat = dude.pupilMat || (dude.pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 }));
  dude.eyeGeo = dude.eyeGeo || new THREE.CircleGeometry(0.06, 12);
  dude.pupilGeo = dude.pupilGeo || new THREE.CircleGeometry(0.028, 10);
  [-1, 1].forEach(s => {
    const ex = s * src.eyeAt.x - bone.x, ey = src.eyeAt.y - bone.y, ez = src.eyeAt.z - bone.z + 0.01;
    const w = new THREE.Mesh(dude.eyeGeo, eyeWhite); w.position.set(ex, ey, ez); head.add(w);
    const p = new THREE.Mesh(dude.pupilGeo, pupilMat); p.position.set(ex, ey, ez + 0.002); head.add(p);
  });

  // accessories hang from this frame: its origin is the head centre, its size matches the old model
  const frame = new THREE.Group();
  head.add(frame);
  frame.position.set(src.headC[0] - bone.x, src.headC[1] - bone.y, src.headC[2] - bone.z);
  frame.scale.setScalar((DUDE_HEIGHT / DUDE_RAW_H) / src.S);
  d.frame = frame;

  d.dress = function(l) { dude.dress(d, l); };
  d.animate = function(dt, speed) { dude.animate(d, dt, speed); };
  d.dress(look);
  return d;
};

// the walk: faster when you move faster, almost still when you stand
dude.animate = function(d, dt, speed) {
  const moving = Math.min(1, speed / 1.5);
  d.action.timeScale = 0.15 + Math.min(1.8, speed / MIX.WALK_SPEED) * moving;
  d.mixer.update(dt);
};

// the clothes and skin colours for this person
dude.dress = function(d, look) {
  d.look = look;
  const o = ACC.get('outfit', look.outfit);
  const cols = [
    ACC.SKINS[look.skin % ACC.SKINS.length],    // 0 skin
    ACC.shirtOf(look, o),                       // 1 shirt
    ACC.pantsOf(look, o),                       // 2 trousers
    o.shoes                                     // 3 shoes
  ].map(h => new THREE.Color(h));
  if (d.acc) { d.frame.remove(d.acc); ACC.dispose(d.acc); }
  d.acc = ACC.attach(d.frame, look);
  d.parts.forEach((m, k) => {
    const reg = d.regions[k], arr = m.geometry.attributes.color.array;
    for (let i = 0; i < reg.length; i++) {
      const c = cols[reg[i]];
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
    }
    m.geometry.attributes.color.needsUpdate = true;
  });
};

