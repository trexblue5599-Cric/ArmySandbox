// js/dude-mix.js  -  the 'Dude remastered' person (Dude_remastered.glb).
// The model has no skeleton, so the body is cut into parts from its shape (head, torso, arms,
// thighs, shins, shoes). Arms and legs turn at the shoulders, hips and knees to walk.
// Same interface as before: dude.load(done), dude.make(look) -> .group .dress(look) .animate(dt, speed) .debug()
const MIX = {
  FILE: 'Dude_remastered.glb',
  HEIGHT: 1.9,             // every person is this many metres tall
  WALK_SPEED: 3.5          // the speed (m/s) for a normal-pace walk
};
const DUDE_CLOTH = 0;      // no separate cloth layer on this model (used by the wardrobe)
// the accessories (hats, glasses, face hair, backpacks, vests...) were built for a model that is
// DUDE_RAW_H units tall and stands DUDE_HEIGHT metres: they are scaled to match this person.
const DUDE_HEIGHT = 1.9, DUDE_RAW_H = 2.632;
// where the body is cut (model units; feet at the bottom)
const SHAPE = {
  SHOE_Y: -1.55,            // below this is shoe
  KNEE_Y: -1.22,            // below this is shin, above is thigh
  HIP_Y: -0.95,             // trousers start here (torso above)
  NECK_Y: -0.22,            // head + neck above this
  ARM_X: 0.22,              // arms are further out than this (sideways)
  HAND_X: 0.5,              // hands + forearms (skin) are further out than this
  SHOULDER: [0.2, -0.3, 0], HIP: [0.09, -0.95, 0], KNEE: [0.1, -1.22, 0]
};

const dude = { ready: false };

// ---------------------------------------------------------------- one-time setup
dude.load = function(done) {
  new THREE.GLTFLoader().load(MIX.FILE, gltf => {
    try { dude.build(gltf); } catch (e) { console.warn('person model could not be used', e); }
    done(dude.ready);
  }, undefined, err => { console.warn(MIX.FILE + ' not loaded', err); done(false); });
};

// the mirror of a point on the left side (+x) is on the right side (-x)
const mirror = p => [-p[0], p[1], p[2]];
const pivotOf = key => {
  if (key.indexOf('arm') >= 0) return key[0] === 'L' ? SHAPE.SHOULDER : mirror(SHAPE.SHOULDER);
  if (key.indexOf('thigh') >= 0) return key[0] === 'L' ? SHAPE.HIP : mirror(SHAPE.HIP);
  if (key.indexOf('shin') >= 0 || key.indexOf('shoe') >= 0) return key[0] === 'L' ? SHAPE.KNEE : mirror(SHAPE.KNEE);
  return [0, 0, 0];   // torso and head
};

dude.build = function(gltf) {
  const meshes = []; gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  if (!meshes.length) throw new Error('no mesh in ' + MIX.FILE);
  const body = meshes.reduce((a, b) => (b.geometry.attributes.position.count > a.geometry.attributes.position.count ? b : a));
  // NOTE: do NOT use geometry.toNonIndexed() here. This glb stores its vertex data interleaved
  // (stride 68) and three.js r128's toNonIndexed() copies the raw interleaved array, which scrambles
  // every vertex into spiky shards. Read through the accessors (getX/getY/...) instead.
  const src0 = body.geometry, sP = src0.attributes.position, sN = src0.attributes.normal, sIdx = src0.index;
  const vcount = sIdx ? sIdx.count : sP.count;
  const pArr = new Float32Array(vcount * 3), nArr = new Float32Array(vcount * 3);
  for (let i = 0; i < vcount; i++) {
    const v = sIdx ? sIdx.getX(i) : i;
    pArr[i * 3] = sP.getX(v); pArr[i * 3 + 1] = sP.getY(v); pArr[i * 3 + 2] = sP.getZ(v);
    if (sN) { nArr[i * 3] = sN.getX(v); nArr[i * 3 + 1] = sN.getY(v); nArr[i * 3 + 2] = sN.getZ(v); }
  }
  const P = new THREE.BufferAttribute(pArr, 3), N = sN ? new THREE.BufferAttribute(nArr, 3) : null;

  let minY = 1e9, maxY = -1e9;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const S = MIX.HEIGHT / (maxY - minY);

  // the face's front (the flat part between the eyes), used to smooth the eyebrow ridge away
  let faceZ = -1e9;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (y > SHAPE.NECK_Y && Math.abs(x) < 0.08) faceZ = Math.max(faceZ, z);
  }
  // eyebrows: the small ridge above the eyes. Pull those points back onto the face.
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (y > 0.02 && y < 0.11 && Math.abs(x) > 0.03 && Math.abs(x) < 0.14 && z > faceZ - 0.02) P.setZ(i, Math.min(z, faceZ - 0.012));
  }
  P.needsUpdate = true;

  // sort every triangle into a part (decided by the middle of the triangle)
  const lists = {};
  const put = (k, t) => { (lists[k] = lists[k] || []).push(t, t + 1, t + 2); };
  for (let t = 0; t + 2 < P.count; t += 3) {
    const cx = (P.getX(t) + P.getX(t + 1) + P.getX(t + 2)) / 3;
    const cy = (P.getY(t) + P.getY(t + 1) + P.getY(t + 2)) / 3;
    const ax = Math.abs(cx), sd = cx >= 0 ? 'L' : 'R';
    if (cy < SHAPE.SHOE_Y) put(sd + 'shoe', t);
    else if (cy < SHAPE.HIP_Y && ax < SHAPE.ARM_X) put(sd + (cy < SHAPE.KNEE_Y ? 'shin' : 'thigh'), t);
    else if (ax >= SHAPE.ARM_X) put(sd + 'arm' + (ax > SHAPE.HAND_X ? 'skin' : 'shirt'), t);
    else if (cy >= SHAPE.NECK_Y) put('head', t);
    else put('torso', t);
  }

  // one shared geometry per part, moved so its pivot is at (0,0,0)
  dude.geos = {};
  Object.keys(lists).forEach(k => {
    const idx = lists[k], n = idx.length, pv = pivotOf(k);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = idx[i];
      pos[i * 3] = P.getX(v) - pv[0]; pos[i * 3 + 1] = P.getY(v) - pv[1]; pos[i * 3 + 2] = P.getZ(v) - pv[2];
      if (N) { nor[i * 3] = N.getX(v); nor[i * 3 + 1] = N.getY(v); nor[i * 3 + 2] = N.getZ(v); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (N) g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); else g.computeVertexNormals();
    dude.geos[k] = g;
  });

  // the head's centre and front: the accessories hang from here, and the eyes go on the face
  const head = lists.head || [];
  let hx = 0, hy = 0, hz = 0, n = 0, wx = 0, zFront = -1e9, yMax = -1e9, yMin = 1e9;
  for (let i = 0; i < head.length; i++) {
    const v = head[i], x = P.getX(v), y = P.getY(v), z = P.getZ(v);
    hx += x; hy += y; hz += z; n++;
    wx = Math.max(wx, Math.abs(x));
    if (Math.abs(x) < 0.08) zFront = Math.max(zFront, z);
    yMax = Math.max(yMax, y); yMin = Math.min(yMin, y);
  }
  const headC = n ? [hx / n, hy / n, hz / n] : [0, -0.05, 0];
  dude.src = { S, minY, headC, wx: wx || 0.12, eyeY: (yMax + yMin) / 2 + 0.02, zFront: zFront > -1e8 ? zFront : headC[2] + 0.1 };
  dude.quadGeo = null;      // the small second mesh is the mouth: left out
  dude.ready = true;
};

// ---------------------------------------------------------------- one person
dude.make = function(look) {
  const src = dude.src;
  const holder = new THREE.Group();
  const obj = new THREE.Group();
  holder.add(obj);
  obj.scale.setScalar(src.S);
  obj.position.y = -src.minY * src.S;                   // feet on the ground

  // the body and the joints (a joint's group sits at its pivot)
  const bodyG = new THREE.Group(); obj.add(bodyG);
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(...SHAPE.SHOULDER); armR.position.set(...mirror(SHAPE.SHOULDER));
  bodyG.add(armL, armR);
  const thighL = new THREE.Group(), thighR = new THREE.Group();
  thighL.position.set(...SHAPE.HIP); thighR.position.set(...mirror(SHAPE.HIP));
  bodyG.add(thighL, thighR);
  const shinL = new THREE.Group(), shinR = new THREE.Group();
  const kneeOffL = [SHAPE.KNEE[0] - SHAPE.HIP[0], SHAPE.KNEE[1] - SHAPE.HIP[1], SHAPE.KNEE[2] - SHAPE.HIP[2]];
  shinL.position.set(...kneeOffL); shinR.position.set(-kneeOffL[0], kneeOffL[1], kneeOffL[2]);
  thighL.add(shinL); thighR.add(shinR);

  // colours for this person: one material per colour
  const mats = {
    shirt: new THREE.MeshLambertMaterial(), pants: new THREE.MeshLambertMaterial(),
    skin: new THREE.MeshLambertMaterial(), shoe: new THREE.MeshLambertMaterial(), dark: new THREE.MeshLambertMaterial({ color: 0x2a1a14 })
  };
  const matOf = k => (k.indexOf('skin') >= 0 || k === 'head') ? mats.skin : k.indexOf('shoe') >= 0 ? mats.shoe :
    (k.indexOf('thigh') >= 0 || k.indexOf('shin') >= 0) ? mats.pants : mats.shirt;
  const groupOf = k => {
    if (k[0] === 'L' && k.indexOf('arm') >= 0) return armL;
    if (k[0] === 'R' && k.indexOf('arm') >= 0) return armR;
    if (k[0] === 'L' && k.indexOf('thigh') >= 0) return thighL;
    if (k[0] === 'R' && k.indexOf('thigh') >= 0) return thighR;
    if (k[0] === 'L' && (k.indexOf('shin') >= 0 || k.indexOf('shoe') >= 0)) return shinL;
    if (k[0] === 'R' && (k.indexOf('shin') >= 0 || k.indexOf('shoe') >= 0)) return shinR;
    return bodyG;
  };
  Object.keys(dude.geos).forEach(k => {
    const m = new THREE.Mesh(dude.geos[k], matOf(k));
    m.castShadow = true; m.frustumCulled = false;
    groupOf(k).add(m);
  });
  if (dude.quadGeo) { const q = new THREE.Mesh(dude.quadGeo, mats.dark); q.frustumCulled = false; bodyG.add(q); }
  // rounded joints so a bent limb shows no gap
  const cap = (r, mat, parent) => { const m = new THREE.Mesh(dude.capGeo(r), mat); m.castShadow = true; parent.add(m); };
  cap(0.09, mats.shirt, armL); cap(0.09, mats.shirt, armR);
  cap(0.11, mats.pants, thighL); cap(0.11, mats.pants, thighR);
  cap(0.08, mats.pants, shinL); cap(0.08, mats.pants, shinR);

  // the eyes: a white disc with a black pupil, on the face
  dude.eyeGeo = dude.eyeGeo || new THREE.CircleGeometry(0.02, 12);
  dude.pupilGeo = dude.pupilGeo || new THREE.CircleGeometry(0.009, 10);
  dude.eyeWhiteMat = dude.eyeWhiteMat || new THREE.MeshBasicMaterial({ color: 0xf4f4f4 });
  dude.pupilMat = dude.pupilMat || new THREE.MeshBasicMaterial({ color: 0x111111 });
  [-1, 1].forEach(s => {
    const ex = s * src.wx * 0.45, ey = src.eyeY, ez = src.zFront + 0.004;
    const w = new THREE.Mesh(dude.eyeGeo, dude.eyeWhiteMat); w.position.set(ex, ey, ez); bodyG.add(w);
    const p = new THREE.Mesh(dude.pupilGeo, dude.pupilMat); p.position.set(ex, ey, ez + 0.001); bodyG.add(p);
  });

  // the accessories hang from the head centre, at the old model's size
  const frame = new THREE.Group();
  frame.position.set(src.headC[0], src.headC[1], src.headC[2]);
  frame.scale.setScalar((DUDE_HEIGHT / DUDE_RAW_H) / src.S);
  bodyG.add(frame);

  const d = { group: holder, look, mats, armL, armR, thighL, thighR, shinL, shinR, bodyG, frame, acc: null, phase: Math.random() * 6.28, mv: 0 };
  d.debug = () => 'parts ' + Object.keys(dude.geos).length + '  accessory pieces ' + (d.acc ? d.acc.children.length : 0) +
    '  head at y ' + src.headC[1].toFixed(2);
  d.dress = l => dude.dress(d, l);
  d.animate = (dt, speed) => dude.animate(d, dt, speed);
  d.dress(look);
  dude.animate(d, 0, 0);                                   // arms down straight away (even for people who are far off)
  return d;
};

dude.capGeo = function(r) {
  dude.capCache = dude.capCache || {};
  return dude.capCache[r] || (dude.capCache[r] = new THREE.SphereGeometry(r, 10, 8));
};

// ---------------------------------------------------------------- the walk
// arms hang down and swing; legs swing and the knees bend. Faster when you move faster.
dude.animate = function(d, dt, speed) {
  const k = Math.min(1, speed / 1.5);
  d.mv += (k - d.mv) * Math.min(1, 8 * dt);
  d.phase += dt * (3 + 2.4 * Math.min(1.4, speed / 2.5));
  const s = Math.sin(d.phase), mv = d.mv;
  d.armL.rotation.set(s * 0.4 * mv, 0, -1.2);             // arm hangs down (Z), swings forward/back (X)
  d.armR.rotation.set(-s * 0.4 * mv, 0, 1.2);
  d.thighL.rotation.set(-s * 0.5 * mv, 0, 0);
  d.thighR.rotation.set(s * 0.5 * mv, 0, 0);
  d.shinL.rotation.set(Math.max(0, s) * 0.6 * mv, 0, 0);  // the knee bends on the way back (sign to check)
  d.shinR.rotation.set(Math.max(0, -s) * 0.6 * mv, 0, 0);
  d.bodyG.position.y = Math.abs(s) * 0.02 * mv;
  d.armL.rotation.order = d.armR.rotation.order = 'XYZ';
};

// ---------------------------------------------------------------- the clothes
dude.dress = function(d, look) {
  d.look = look;
  const o = ACC.get('outfit', look.outfit);
  const skin = ACC.SKINS[look.skin % ACC.SKINS.length];
  d.mats.skin.color.setHex(skin);
  d.mats.shirt.color.setHex(ACC.shirtOf(look, o));
  d.mats.pants.color.setHex(ACC.pantsOf(look, o));
  d.mats.shoe.color.setHex(o.shoes);
  if (d.acc) { d.frame.remove(d.acc); ACC.dispose(d.acc); }
  d.acc = ACC.attach(d.frame, look);
};
