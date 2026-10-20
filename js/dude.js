// js/dude.js  -  loads dude.glb ONCE, cuts it into body / arms / legs, and makes as many animated people as you want.
// Used for the player AND every pedestrian.  dude.make(look) -> person with .group, .animate(dt, speed), .dress(look)
const DUDE_FILE = 'dude.glb';    // must be next to index.html
const DUDE_HEIGHT = 1.9;         // how tall he is in the world
const DUDE_FACING = 0;           // if everyone walks backwards, change 0 to Math.PI
const ARM_REST = 72 * Math.PI / 180;   // the glb is in a T-pose, so arms are lowered by this angle

const dude = { ready: false, T: null, mat: null };

// colour regions painted on the model
const REG = { SHOE: 0, PANTS: 1, SKIN: 2, SHIRT: 3, HAIR: 4, FOREARM: 5, DARK: 6 };
// where each body part turns (model units)
const PIVOT = { armL: [0.16, -0.26, -0.02], armR: [-0.16, -0.26, -0.02], legL: [0.085, -0.84, 0], legR: [-0.085, -0.84, 0], body: [0, 0, 0] };
// which skeleton joint (stored in the glb) belongs to which part
const JOINT_PART = {};
[['armL', [4, 9, 10, 11, 12, 17, 18, 19, 20]], ['armR', [22, 23, 24, 25, 26, 27, 32, 33]],
 ['legL', [7, 14, 15, 16]], ['legR', [13, 29, 30, 31]]].forEach(e => e[1].forEach(j => { JOINT_PART[j] = e[0]; }));
const PART_NAMES = ['body', 'armL', 'armR', 'legL', 'legR'];

// ---------------------------------------------------------------- loading
dude.load = function(done) {
  let finished = false;
  const fin = ok => { if (!finished) { finished = true; done(ok); } };
  if (!THREE.GLTFLoader) { console.warn('GLTFLoader missing - using the simple stand-in people'); fin(false); return; }
  new THREE.GLTFLoader().load(DUDE_FILE, gltf => {
    try { dude.build(gltf.scene); dude.ready = true; } catch (e) { console.warn('dude.glb could not be used', e); }
    fin(dude.ready);
  }, undefined, err => { console.warn('dude.glb not loaded - using the simple stand-in people', err); fin(false); });
};

// cut the model into 5 parts (triangle soup, positions relative to each part's pivot)
dude.build = function(root) {
  const meshes = [];
  root.traverse(o => { if (o.isMesh && o.geometry.attributes.position) meshes.push(o); });
  let minY = 1e9, maxY = -1e9;
  meshes.forEach(m => { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y; } });
  const H = (maxY - minY) || 1;
  const parts = {};
  PART_NAMES.forEach(n => { parts[n] = { pos: [], nor: [], reg: [], ys: [] }; });

  function region(part, x, y, z, tiny) {
    if (tiny) return REG.DARK;
    const h = (y - minY) / H;
    if (part === 'legL' || part === 'legR') return h < 0.06 ? REG.SHOE : REG.PANTS;
    if (part === 'armL' || part === 'armR') { const ax = Math.abs(x); return ax < 0.5 ? REG.SHIRT : ax < 0.64 ? REG.FOREARM : REG.SKIN; }
    if (y < -0.62) return REG.PANTS;
    if (h < 0.8) return REG.SHIRT;
    return (h > 0.94 || (h > 0.86 && z < -0.03)) ? REG.HAIR : REG.SKIN;
  }

  meshes.forEach(m => {
    const g = m.geometry, p = g.attributes.position, nr = g.attributes.normal, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const cnt = p.count, tiny = cnt < 20;
    const partOf = new Array(cnt);
    for (let i = 0; i < cnt; i++) {
      let part = 'body';
      if (!tiny) {
        if (si && sw) {
          const ws = [sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)], js = [si.getX(i), si.getY(i), si.getZ(i), si.getW(i)];
          let k = 0; for (let q = 1; q < 4; q++) if (ws[q] > ws[k]) k = q;
          part = JOINT_PART[js[k]] || 'body';
        } else {   // no skeleton data: guess by position
          const x = p.getX(i), y = p.getY(i);
          if (y < -0.84) part = x > 0 ? 'legL' : 'legR';
          else if (Math.abs(x) > 0.17 && y > -0.5) part = x > 0 ? 'armL' : 'armR';
        }
      }
      partOf[i] = part;
    }
    const idx = g.index ? g.index.array : null;
    const tris = idx ? idx.length / 3 : cnt / 3;
    for (let t = 0; t < tris; t++) {
      const v = idx ? [idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]] : [t * 3, t * 3 + 1, t * 3 + 2];
      const a = partOf[v[0]], b = partOf[v[1]], c = partOf[v[2]];
      const part = (a === b || a === c) ? a : (b === c ? b : a);   // majority vote
      const P = parts[part], pv = PIVOT[part];
      v.forEach(i => {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        P.pos.push(x - pv[0], y - pv[1], z - pv[2]);
        if (nr) P.nor.push(nr.getX(i), nr.getY(i), nr.getZ(i)); else P.nor.push(0, 1, 0);
        P.reg.push(region(part, x, y, z, tiny));
        P.ys.push(y);
      });
    }
  });

  PART_NAMES.forEach(n => {
    const P = parts[n];
    P.count = P.reg.length;
    P.posAttr = new THREE.BufferAttribute(new Float32Array(P.pos), 3);
    P.norAttr = new THREE.BufferAttribute(new Float32Array(P.nor), 3);
    P.reg = Uint8Array.from(P.reg);
    P.ys = Float32Array.from(P.ys);
    const probe = new THREE.BufferGeometry();
    probe.setAttribute('position', P.posAttr);
    probe.computeBoundingSphere();
    P.sphere = probe.boundingSphere;
    delete P.pos; delete P.nor;
  });
  dude.T = { minY, H, parts };
  dude.mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  dude.eyeGeo = new THREE.BoxGeometry(0.022, 0.024, 0.01);
  dude.eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
};

// ---------------------------------------------------------------- making people
dude.makeFallback = function(look) {
  const o = ACC.get('outfit', look.outfit);
  const per = world.makePerson({ shirt: ACC.shirtOf(look, o), pants: ACC.pantsOf(look, o), skin: ACC.SKINS[look.skin % ACC.SKINS.length], hair: ACC.HAIRS[look.hair % ACC.HAIRS.length] });
  const d = { group: per.group, parts: per.parts, rig: per.parts.inner, look, phase: Math.random() * 6, t: Math.random() * 10, mv: 0 };
  d.dress = l => { d.look = ACC.fix(l); };
  d.animate = (dt, speed) => dude.animate(d, dt, speed);
  return d;
};

dude.make = function(look) {
  look = ACC.fix(look || ACC.randomLook(Math.random));
  if (!dude.ready) return dude.makeFallback(look);
  const T = dude.T, S = DUDE_HEIGHT / T.H;
  const group = new THREE.Group(), model = new THREE.Group(), rig = new THREE.Group(), body = new THREE.Group();
  group.add(model); model.add(rig); rig.add(body);
  model.scale.setScalar(S);
  model.position.y = -T.minY * S;       // feet on the ground
  model.rotation.y = DUDE_FACING;
  const d = { group, rig, body, look, parts: {}, meshes: {}, acc: null, phase: Math.random() * 6, t: Math.random() * 10, mv: 0 };

  function mk(name) {
    const P = T.parts[name];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', P.posAttr);
    geo.setAttribute('normal', P.norAttr);
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(P.count * 3), 3));
    geo.boundingSphere = P.sphere;
    const m = new THREE.Mesh(geo, dude.mat);
    m.castShadow = true; m.frustumCulled = false;
    d.meshes[name] = m;
    return m;
  }
  body.add(mk('body'));
  ['legL', 'legR'].forEach(n => {
    const g = new THREE.Group(); g.position.set(PIVOT[n][0], PIVOT[n][1], PIVOT[n][2]);
    g.add(mk(n)); body.add(g); d.parts[n] = g;
  });
  ['armL', 'armR'].forEach(n => {
    const swing = new THREE.Group(); swing.position.set(PIVOT[n][0], PIVOT[n][1], PIVOT[n][2]);
    const low = new THREE.Group(); low.rotation.z = n === 'armL' ? -ARM_REST : ARM_REST;   // lower the T-pose arm
    low.add(mk(n)); swing.add(low); body.add(swing); d.parts[n] = swing;
  });
  [-1, 1].forEach(s => { const e = new THREE.Mesh(dude.eyeGeo, dude.eyeMat); e.position.set(s * 0.04, 0.035, 0.11); body.add(e); });

  // paint the colours + build hats/glasses/etc.
  d.dress = function(l) {
    l = d.look = ACC.fix(l);
    const o = ACC.get('outfit', l.outfit);
    const shirt = ACC.shirtOf(l, o), pants = ACC.pantsOf(l, o);
    const table = [o.shoes, pants, ACC.SKINS[l.skin % ACC.SKINS.length], shirt, ACC.HAIRS[l.hair % ACC.HAIRS.length], o.long ? shirt : ACC.SKINS[l.skin % ACC.SKINS.length], 0x15151a]
      .map(h => new THREE.Color(h));
    PART_NAMES.forEach(n => {
      const P = T.parts[n], attr = d.meshes[n].geometry.attributes.color, arr = attr.array;
      for (let i = 0; i < P.count; i++) {
        let r = P.reg[i];
        if (r === REG.PANTS && o.shortsY !== undefined && P.ys[i] < o.shortsY) r = REG.SKIN;
        const c = table[r];
        arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
      }
      attr.needsUpdate = true;
    });
    if (d.acc) { body.remove(d.acc); ACC.dispose(d.acc); }
    d.acc = ACC.attach(body, l);
  };
  d.animate = (dt, speed) => dude.animate(d, dt, speed);
  d.dress(look);
  return d;
};

// ---------------------------------------------------------------- animation: STAND (speed ~0) and WALK / RUN
dude.animate = function(d, dt, speed) {
  d.t += dt;
  const want = speed > 0.25 ? 1 : 0;
  d.mv += (want - d.mv) * Math.min(1, 9 * dt);                      // smooth blend stand <-> walk
  const mv = d.mv, idle = 1 - mv;
  const stride = 1.6 + Math.max(0, Math.min(6, speed - 3)) * 0.25;
  d.phase += dt * (Math.PI * 2 * speed / stride);                   // step rate follows the real speed
  const A = 0.4 + 0.5 * Math.min(1, speed / 9);                     // swing size: small walk, big run
  const sw = Math.sin(d.phase) * A * mv;
  const P = d.parts;
  P.legL.rotation.x = sw;  P.legR.rotation.x = -sw;
  const idleArm = Math.sin(d.t * 1.7) * 0.05 * idle;
  P.armL.rotation.x = -sw * 0.85 + idleArm;  P.armR.rotation.x = sw * 0.85 - idleArm;
  // body: bob + twist + lean while moving, gentle breathing / weight-shift while standing
  d.rig.position.y = Math.abs(Math.cos(d.phase)) * 0.03 * mv * (0.6 + A) + Math.sin(d.t * 2.2) * 0.004 * idle;
  d.rig.rotation.y = Math.sin(d.phase) * 0.08 * mv;
  d.rig.rotation.x = (0.04 + 0.12 * Math.max(0, Math.min(1, (speed - 5) / 4))) * mv;
  d.rig.rotation.z = Math.sin(d.t * 1.1) * 0.012 * idle;
};
