// js/dude-mix.js  -  the 'Dude remastered' person (Dude_remastered.glb), now properly SKINNED.
// The glb stores a weight for every vertex on 34 joints (but no skeleton), so we build our own small
// skeleton (11 bones) and merge those weights onto it. Result: ONE smooth mesh from the real model,
// no separate limb pieces and no ball joints. Elbows, knees and shoulders bend the real surface.
// Same interface as before: dude.load(done), dude.make(look) -> .group .dress(look) .animate(dt, speed) .debug()
const MIX = {
  FILE: 'Dude_remastered.glb',
  HEIGHT: 1.9,             // every person is this many metres tall
  ARM_DOWN: 1.3            // radians the T-pose arms are lowered by
};
const DUDE_CLOTH = 0;      // no separate cloth layer on this model (used by the wardrobe)
const DUDE_HEIGHT = 1.9;   // (kept for the wardrobe / other files)
// NOTE: the hats, glasses, backpacks... are already built in THIS model's own units (head top y=0.155,
// face points to +z), so they are attached with no extra scaling.

// ---- skeleton: [name, parent, pivot in model units]
const BONES = [
  ['hips',   -1, [0, -0.82, 0]],
  ['chest',   0, [0, -0.45, 0]],
  ['head',    1, [0, -0.12, 0]],
  ['armL',    1, [0.17, -0.27, -0.02]],
  ['foreL',   3, [0.40, -0.285, -0.02]],
  ['armR',    1, [-0.17, -0.27, -0.02]],
  ['foreR',   5, [-0.40, -0.285, -0.02]],
  ['thighL',  0, [0.085, -0.84, 0]],
  ['shinL',   7, [0.09, -1.19, 0]],
  ['thighR',  0, [-0.085, -0.84, 0]],
  ['shinR',   9, [-0.09, -1.19, 0]]
];
const B = {}; BONES.forEach((b, i) => { B[b[0]] = i; });
// which glb joint belongs to which of our bones (joint numbers come from the glb)
const JOINT_BONE = {};
[['head', [0, 1]], ['chest', [2, 3, 8, 21]], ['hips', [5, 6]],
 ['armL', [4]], ['foreL', [9, 10, 11, 12, 17, 18, 19, 20]],
 ['armR', [22]], ['foreR', [23, 24, 25, 26, 27, 28, 32, 33]],   // 28 = right thumb
 ['thighL', [7]], ['shinL', [14, 15, 16]], ['thighR', [13]], ['shinR', [29, 30, 31]]
].forEach(e => e[1].forEach(j => { JOINT_BONE[j] = B[e[0]]; }));

// material slots (every person gets their own set of colours)
const M = { SKIN: 0, SHIRT: 1, PANTS_A: 2, PANTS_B: 3, PANTS_C: 4, SHOE: 5, HAIR: 6, DARK: 7, FOREARM: 8 };
const N_MATS = 9;

const dude = { ready: false };
// the face (model units): a flat panel facing +z. Cartoon eyes: white disc, black outline, small pupil, thick brows.
const DUDE_FACE = { Z: 0.106, EYE_X: 0.042, EYE_Y: 0.05, EYE_R: 0.025, OUTLINE: 0.0045, PUPIL: 0.0095, BROW_Y: 0.089 };

// ---------------------------------------------------------------- one-time setup
dude.load = function(done) {
  new THREE.GLTFLoader().load(MIX.FILE, gltf => {
    try { dude.build(gltf); } catch (e) { console.warn('person model could not be used', e); }
    done(dude.ready);
  }, undefined, err => { console.warn(MIX.FILE + ' not loaded', err); done(false); });
};

dude.build = function(gltf) {
  const meshes = []; gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  if (!meshes.length) throw new Error('no mesh in ' + MIX.FILE);
  const body = meshes.reduce((a, b) => (b.geometry.attributes.position.count > a.geometry.attributes.position.count ? b : a));
  const g = body.geometry;
  // read through the accessors (the data is interleaved, so never touch .array directly)
  const aP = g.attributes.position, aN = g.attributes.normal, aJ = g.attributes.skinIndex, aW = g.attributes.skinWeight;
  const n = aP.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  const sIdx = new Uint16Array(n * 4), sWt = new Float32Array(n * 4), main = new Uint8Array(n);
  let minY = 1e9, maxY = -1e9;
  for (let i = 0; i < n; i++) {
    pos[i * 3] = aP.getX(i); pos[i * 3 + 1] = aP.getY(i); pos[i * 3 + 2] = aP.getZ(i);
    if (aN) { nor[i * 3] = aN.getX(i); nor[i * 3 + 1] = aN.getY(i); nor[i * 3 + 2] = aN.getZ(i); }
    minY = Math.min(minY, pos[i * 3 + 1]); maxY = Math.max(maxY, pos[i * 3 + 1]);
    // merge the 34 joint weights onto our 11 bones
    const w = {};
    if (aJ && aW) {
      const js = [aJ.getX(i), aJ.getY(i), aJ.getZ(i), aJ.getW(i)], ws = [aW.getX(i), aW.getY(i), aW.getZ(i), aW.getW(i)];
      for (let k = 0; k < 4; k++) if (ws[k] > 0) { const b = JOINT_BONE[js[k]] !== undefined ? JOINT_BONE[js[k]] : B.chest; w[b] = (w[b] || 0) + ws[k]; }
    } else w[B.chest] = 1;
    const list = Object.keys(w).map(k => [+k, w[k]]).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const tot = list.reduce((s, e) => s + e[1], 0) || 1;
    for (let k = 0; k < 4; k++) { sIdx[i * 4 + k] = list[k] ? list[k][0] : 0; sWt[i * 4 + k] = list[k] ? list[k][1] / tot : 0; }
    main[i] = list[0][0];
  }
  const S = MIX.HEIGHT / (maxY - minY);
  // the model has small raised eye slits: flatten them onto the face so the cartoon eyes sit cleanly on it
  for (let i = 0; i < n; i++) {
    if (main[i] !== B.head) continue;
    const x = Math.abs(pos[i * 3]), y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    if (x > 0.012 && x < 0.072 && y > 0.044 && y < 0.082 && z > 0.095) pos[i * 3 + 2] = DUDE_FACE.Z;
  }

  // sort every triangle into a material region
  const src = g.index; const nt = (src ? src.count : n) / 3;
  const buckets = []; for (let m = 0; m < N_MATS; m++) buckets.push([]);
  for (let t = 0; t < nt; t++) {
    const v = [0, 1, 2].map(k => src ? src.getX(t * 3 + k) : t * 3 + k);
    const cx = (pos[v[0] * 3] + pos[v[1] * 3] + pos[v[2] * 3]) / 3;
    const cy = (pos[v[0] * 3 + 1] + pos[v[1] * 3 + 1] + pos[v[2] * 3 + 1]) / 3;
    const cz = (pos[v[0] * 3 + 2] + pos[v[1] * 3 + 2] + pos[v[2] * 3 + 2]) / 3;
    const bs = v.map(i => main[i]);
    const bone = (bs[0] === bs[1] || bs[0] === bs[2]) ? bs[0] : (bs[1] === bs[2] ? bs[1] : bs[0]);
    const ax = Math.abs(cx);
    let m;
    const legPants = () => (cy >= -1.02 ? M.PANTS_A : cy >= -1.18 ? M.PANTS_B : M.PANTS_C);
    if (bone === B.head) {
      if (cy > 0.085 || (cz < -0.025 && cy > -0.03)) m = M.HAIR;                              // hair
      else m = M.SKIN;
    } else if (bone === B.armL || bone === B.armR) m = M.SHIRT;                                      // sleeve
    else if (bone === B.foreL || bone === B.foreR) m = ax > 0.66 ? M.SKIN : (ax > 0.5 ? M.FOREARM : M.SHIRT);
    else if (bone === B.thighL || bone === B.thighR) m = legPants();
    else if (bone === B.shinL || bone === B.shinR) m = cy < -1.5 ? M.SHOE : legPants();
    else {                                                                                           // torso
      if (cy > -0.2 && ax < 0.08) m = M.SKIN;                                                       // neck
      else if (cy < -0.8) m = M.PANTS_A;
      else m = M.SHIRT;
    }
    buckets[m].push(v[0], v[1], v[2]);
  }
  const index = []; const geo = new THREE.BufferGeometry();
  buckets.forEach((list, m) => { if (list.length) { geo.addGroup(index.length, list.length, m); list.forEach(i => index.push(i)); } });
  geo.setIndex(index);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (aN) geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); else geo.computeVertexNormals();
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sWt, 4));
  geo.computeBoundingSphere();
  dude.geo = geo; dude.src = { S, minY };
  const eyeMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, polygonOffset: true, polygonOffsetFactor: -o, polygonOffsetUnits: -o });
  dude.eye = {
    outlineGeo: new THREE.CircleGeometry(DUDE_FACE.EYE_R + DUDE_FACE.OUTLINE, 20), whiteGeo: new THREE.CircleGeometry(DUDE_FACE.EYE_R, 20),
    pupilGeo: new THREE.CircleGeometry(DUDE_FACE.PUPIL, 14), browGeo: new THREE.BoxGeometry(0.056, 0.012, 0.01),
    outlineMat: eyeMat(0x111111, 1), whiteMat: eyeMat(0xffffff, 2), pupilMat: eyeMat(0x050505, 3)
  };
  dude.ready = true;
};

// ---------------------------------------------------------------- one person
dude.make = function(look) {
  const src = dude.src;
  const holder = new THREE.Group(), obj = new THREE.Group(), bodyG = new THREE.Group();
  holder.add(obj); obj.add(bodyG);
  obj.scale.setScalar(src.S);
  obj.position.y = -src.minY * src.S;                   // feet on the ground

  // bones (each person has their own, the geometry is shared)
  const bones = BONES.map((b, i) => {
    const bone = new THREE.Bone(); bone.name = b[0];
    const pp = b[1] >= 0 ? BONES[b[1]][2] : [0, 0, 0];
    bone.position.set(b[2][0] - pp[0], b[2][1] - pp[1], b[2][2] - pp[2]);
    return bone;
  });
  BONES.forEach((b, i) => { if (b[1] >= 0) bones[b[1]].add(bones[i]); });

  // materials: one set of colours per person
  const mats = [];
  for (let i = 0; i < N_MATS; i++) { const m = new THREE.MeshLambertMaterial(); m.skinning = true; mats.push(m); }
  mats[M.DARK].color.setHex(0x1a1210);

  const mesh = new THREE.SkinnedMesh(dude.geo, mats);
  mesh.castShadow = true; mesh.frustumCulled = false;
  bodyG.add(mesh); mesh.add(bones[0]);
  holder.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));

  // cartoon eyes on the face, hung on the head bone: white disc + black outline + pupil, thick eyebrows
  const E = dude.eye, hp = BONES[B.head][2];
  [-1, 1].forEach(sd => {
    const eye = new THREE.Group();
    eye.position.set(sd * DUDE_FACE.EYE_X - hp[0], DUDE_FACE.EYE_Y - hp[1], DUDE_FACE.Z + 0.0015 - hp[2]);
    const o = new THREE.Mesh(E.outlineGeo, E.outlineMat), w = new THREE.Mesh(E.whiteGeo, E.whiteMat), p = new THREE.Mesh(E.pupilGeo, E.pupilMat);
    w.position.z = 0.0004; p.position.set(-sd * 0.003, -0.001, 0.0008);
    eye.add(o, w, p); eye.rotation.y = sd * 0.06;
    bones[B.head].add(eye);
    const brow = new THREE.Mesh(E.browGeo, mats[M.DARK]);
    brow.position.set(sd * DUDE_FACE.EYE_X - hp[0], DUDE_FACE.BROW_Y - hp[1], DUDE_FACE.Z + 0.002 - hp[2]);
    brow.rotation.z = -sd * 0.14;                                  // inner ends a little lower: a serious look
    bones[B.head].add(brow);
  });

  // the accessories (hats, glasses, backpacks...) are in model units, so hang them on the chest bone
  // at the model origin (they then twist and bob together with the body)
  const frame = new THREE.Group();
  frame.position.set(-BONES[B.chest][2][0], -BONES[B.chest][2][1], -BONES[B.chest][2][2]);
  bones[B.chest].add(frame);

  const d = { group: holder, look, mats, bones, bodyG, frame, acc: null, phase: Math.random() * 6.28, mv: 0, t: Math.random() * 10 };
  d.debug = () => 'bones ' + bones.length + '  materials ' + mats.length + '  accessory pieces ' + (d.acc ? d.acc.children.length : 0);
  d.dress = l => dude.dress(d, l);
  d.animate = (dt, speed) => dude.animate(d, dt, speed);
  d.dress(look);
  dude.animate(d, 0, 0);                                   // arms down straight away (even for far-off people)
  return d;
};

// ---------------------------------------------------------------- the walk
const _q = new THREE.Quaternion(), _ax = new THREE.Vector3();
// bend a forearm forwards by `ang` around the world side-to-side axis (the upper arm is tilted, so convert the axis)
function elbowBend(bone, sd, ang) {
  const a = MIX.ARM_DOWN;
  _ax.set(Math.cos(a), sd > 0 ? Math.sin(a) : -Math.sin(a), 0);
  bone.quaternion.setFromAxisAngle(_ax, -ang);
}
dude.animate = function(d, dt, speed) {
  d.t += dt;
  const k = Math.min(1, speed / 1.5);
  d.mv += (k - d.mv) * Math.min(1, 8 * dt);
  d.phase += dt * (3 + 2.4 * Math.min(1.4, speed / 2.5));
  const s = Math.sin(d.phase), c = Math.cos(d.phase), mv = d.mv, idle = 1 - mv;
  const bn = d.bones, run = Math.max(0, Math.min(1, (speed - 4) / 4));
  const A = 0.4 + 0.25 * run;                                   // swing size
  // legs: swing at the hip, the knee bends while the leg comes forward
  bn[B.thighL].rotation.set(-s * A * 1.1 * mv, 0, 0);
  bn[B.thighR].rotation.set(s * A * 1.1 * mv, 0, 0);
  bn[B.shinL].rotation.set((Math.max(0, c) * (0.7 + 0.5 * run) + 0.04) * mv, 0, 0);
  bn[B.shinR].rotation.set((Math.max(0, -c) * (0.7 + 0.5 * run) + 0.04) * mv, 0, 0);
  // arms: hang down (Z), swing opposite to the legs (X), elbows bend a little
  const breathe = Math.sin(d.t * 1.7) * 0.03 * idle;
  const out = 0.05 + Math.sin(d.t * 1.3) * 0.01 * idle;
  bn[B.armL].rotation.set(s * A * mv + breathe, 0, -(MIX.ARM_DOWN - out));
  bn[B.armR].rotation.set(-s * A * mv - breathe, 0, MIX.ARM_DOWN - out);
  bn[B.armL].rotation.order = bn[B.armR].rotation.order = 'XYZ';
  elbowBend(bn[B.foreL], 1, 0.12 + 0.55 * Math.max(0, -s) * mv + 0.45 * run * mv);
  elbowBend(bn[B.foreR], -1, 0.12 + 0.55 * Math.max(0, s) * mv + 0.45 * run * mv);
  // body: chest twists against the hips, bob, lean
  bn[B.hips].rotation.set((0.03 + 0.1 * run) * mv, s * 0.07 * mv, s * 0.025 * mv);
  bn[B.chest].rotation.set(0, -s * 0.16 * mv, Math.sin(d.t * 1.1) * 0.01 * idle);
  bn[B.head].rotation.set(0, s * 0.06 * mv, 0);
  d.bodyG.position.y = Math.abs(c) * 0.025 * mv + Math.sin(d.t * 2.2) * 0.004 * idle;
};

// ---------------------------------------------------------------- the clothes
dude.dress = function(d, look) {
  d.look = look;
  const o = ACC.get('outfit', look.outfit);
  const skin = ACC.SKINS[look.skin % ACC.SKINS.length];
  const shirt = ACC.shirtOf(look, o), pants = ACC.pantsOf(look, o);
  const shorts = o.shortsY !== undefined;
  const m = d.mats;
  m[M.SKIN].color.setHex(skin);
  m[M.SHIRT].color.setHex(shirt);
  m[M.FOREARM].color.setHex(o.long ? shirt : skin);                  // long sleeves or bare forearms
  m[M.HAIR].color.setHex(ACC.HAIRS[look.hair % ACC.HAIRS.length]);
  m[M.SHOE].color.setHex(o.shoes);
  // the three leg bands: bare skin below shortsY for shorts / dresses
  [[M.PANTS_A, -0.92], [M.PANTS_B, -1.10], [M.PANTS_C, -1.37]].forEach(e => m[e[0]].color.setHex(shorts && e[1] < o.shortsY ? skin : pants));
  if (d.acc) { d.frame.remove(d.acc); ACC.dispose(d.acc); }
  d.acc = ACC.attach(d.frame, look);
};
