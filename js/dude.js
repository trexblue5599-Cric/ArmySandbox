// js/dude.js  -  loads dude.glb ONCE, cuts it into body / arms / legs, and makes as many animated people as you want.
// Used for the player AND every pedestrian.  dude.make(look) -> person with .group, .animate(dt, speed), .dress(look)
const DUDE_FILE = 'dude.glb';    // must be next to index.html
const DUDE_HEIGHT = 1.9;         // how tall he is in the world
const DUDE_FACING = 0;           // if everyone walks backwards, change 0 to Math.PI
const ARM_REST = 72 * Math.PI / 180;   // the glb is in a T-pose, so arms are lowered by this angle
const DUDE_CLOTH = 0.022;        // how far clothes sit off the skin (model units): raise it for thicker clothes
const CAP = { shoulder: 0.075, elbow: 0.062, hip: 0.1, knee: 0.07 };   // joint caps that hide the gaps when limbs move

const dude = { ready: false, T: null, mat: null };

// colour regions painted on the model
const REG = { SHOE: 0, PANTS: 1, SKIN: 2, SHIRT: 3, HAIR: 4, FOREARM: 5, DARK: 6 };
// where each body part turns (model units)
const PIVOT = {
  armL: [0.16, -0.26, -0.02], armR: [-0.16, -0.26, -0.02],        // shoulders
  foreL: [0.385, -0.28, -0.02], foreR: [-0.385, -0.28, -0.02],    // elbows
  legL: [0.085, -0.84, 0], legR: [-0.085, -0.84, 0],              // hips
  shinL: [0.085, -1.18, 0], shinR: [-0.085, -1.18, 0],            // knees
  body: [0, 0, 0]
};
// which skeleton joint (stored in the glb) belongs to which part
const JOINT_PART = {};
[['armL', [4]], ['foreL', [9, 10, 11, 12, 17, 18, 19, 20]], ['armR', [22]], ['foreR', [23, 24, 25, 26, 27, 32, 33]],
 ['legL', [7]], ['shinL', [14, 15, 16]], ['legR', [13]], ['shinR', [29, 30, 31]]].forEach(e => e[1].forEach(j => { JOINT_PART[j] = e[0]; }));
const PART_NAMES = ['body', 'armL', 'foreL', 'armR', 'foreR', 'legL', 'shinL', 'legR', 'shinR'];

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
    if (part.indexOf('leg') === 0 || part.indexOf('shin') === 0) return h < 0.06 ? REG.SHOE : REG.PANTS;
    if (part.indexOf('arm') === 0 || part.indexOf('fore') === 0) { const ax = Math.abs(x); return ax < 0.5 ? REG.SHIRT : ax < 0.64 ? REG.FOREARM : REG.SKIN; }
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
          const sd = x > 0 ? 'L' : 'R';
          if (y < -0.84) part = (y > -1.18 ? 'leg' : 'shin') + sd;
          else if (Math.abs(x) > 0.17 && y > -0.5) part = (Math.abs(x) < 0.385 ? 'arm' : 'fore') + sd;
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
      // one flat colour + one flat normal per triangle = crisp colours and a faceted low-poly look
      const A = v.map(i => [p.getX(i), p.getY(i), p.getZ(i)]);
      const cx = (A[0][0] + A[1][0] + A[2][0]) / 3, cy = (A[0][1] + A[1][1] + A[2][1]) / 3, cz = (A[0][2] + A[1][2] + A[2][2]) / 3;
      const reg = region(part, cx, cy, cz, tiny);
      const e1 = [A[1][0] - A[0][0], A[1][1] - A[0][1], A[1][2] - A[0][2]], e2 = [A[2][0] - A[0][0], A[2][1] - A[0][1], A[2][2] - A[0][2]];
      let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      A.forEach(a => {
        P.pos.push(a[0] - pv[0], a[1] - pv[1], a[2] - pv[2]);
        P.nor.push(nx, ny, nz);
        P.reg.push(reg);
        P.ys.push(cy);
      });
    }
  });

  PART_NAMES.forEach(n => {
    const P = parts[n];
    P.count = P.reg.length;
    // smooth normal per vertex: average the flat normals of every triangle that shares the same point
    const sum = new Map();
    const keyOf = i => Math.round(P.pos[i * 3] * 1e4) + ',' + Math.round(P.pos[i * 3 + 1] * 1e4) + ',' + Math.round(P.pos[i * 3 + 2] * 1e4);
    for (let i = 0; i < P.count; i++) {
      const k = keyOf(i), a = sum.get(k) || [0, 0, 0];
      a[0] += P.nor[i * 3]; a[1] += P.nor[i * 3 + 1]; a[2] += P.nor[i * 3 + 2];
      sum.set(k, a);
    }
    P.smooth = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      const a = sum.get(keyOf(i)), l = Math.hypot(a[0], a[1], a[2]) || 1;
      P.smooth[i * 3] = a[0] / l; P.smooth[i * 3 + 1] = a[1] / l; P.smooth[i * 3 + 2] = a[2] / l;
    }
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
  dude.eyeWhiteGeo = new THREE.CircleGeometry(0.024, 12);       // the white of the eye
  dude.eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf4f4f4 });
  dude.pupilGeo = new THREE.CircleGeometry(0.011, 10);          // the black pupil
};

// ---------------------------------------------------------------- clothes as a layer over the skin
// The clothes are copies of the body surface pushed out a little (DUDE_CLOTH), so the skin
// still shows where there is no cloth (hands, neck, bare arms). Built once and shared by everyone.
dude.ovCache = {};
dude.capCache = {};
dude.overlayGeo = function(part, regs, minY) {               // the part's triangles that belong to these colour regions
  const key = part + '|' + regs.join(',') + '|' + minY;
  if (dude.ovCache[key]) return dude.ovCache[key];
  const P = dude.T.parts[part], pa = P.posAttr.array, sn = P.smooth, pos = [], nor = [];
  for (let v = 0; v < P.count; v++) {
    if (regs.indexOf(P.reg[v]) < 0 || P.ys[v] < minY) continue;
    for (let k = 0; k < 3; k++) {
      pos.push(pa[v * 3 + k] + sn[v * 3 + k] * DUDE_CLOTH);
      nor.push(sn[v * 3 + k]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return (dude.ovCache[key] = g);
};
dude.capGeo = function(r) {
  return dude.capCache[r] || (dude.capCache[r] = new THREE.SphereGeometry(r, 10, 8));
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
  const hips = new THREE.Group();
  group.add(model); model.add(rig); rig.add(hips); rig.add(body);
  model.scale.setScalar(S);
  model.position.y = -T.minY * S;       // feet on the ground
  model.rotation.y = DUDE_FACING;
  const d = { group, rig, hips, body, look, parts: {}, knees: {}, elbows: {}, meshes: {}, cloth: {}, caps: {}, acc: null, phase: Math.random() * 6, t: Math.random() * 10, mv: 0 };
  d.mats = {
    shirt: new THREE.MeshLambertMaterial(), pants: new THREE.MeshLambertMaterial(),
    skin: new THREE.MeshLambertMaterial()
  };

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
    const grp = new THREE.Group(); grp.add(m);
    const arm = name.indexOf('arm') === 0 || name.indexOf('fore') === 0;
    const layer = (regs, mat) => {
      const mesh = new THREE.Mesh(dude.overlayGeo(name, regs, -Infinity), mat);
      mesh.castShadow = true; mesh.frustumCulled = false; grp.add(mesh); return mesh;
    };
    d.cloth[name] = { shirt: layer([REG.SHIRT], d.mats.shirt), pants: layer([REG.PANTS], d.mats.pants) };
    if (arm) d.cloth[name].band = layer([REG.FOREARM], d.mats.shirt);   // the sleeve end: shown only for long sleeves
    return grp;
  }
  body.add(mk('body'));
  ['L', 'R'].forEach(sd => {
    // leg = thigh (turns at the hip) + shin (turns at the knee)
    const hip = new THREE.Group(); hip.position.set(PIVOT['leg' + sd][0], PIVOT['leg' + sd][1], PIVOT['leg' + sd][2]);
    hip.add(mk('leg' + sd));
    const knee = new THREE.Group();
    knee.position.set(PIVOT['shin' + sd][0] - PIVOT['leg' + sd][0], PIVOT['shin' + sd][1] - PIVOT['leg' + sd][1], PIVOT['shin' + sd][2] - PIVOT['leg' + sd][2]);
    knee.add(mk('shin' + sd)); hip.add(knee); hips.add(hip);
    d.parts['leg' + sd] = hip; d.knees[sd] = knee;
    // arm = upper arm (turns at the shoulder) + forearm and hand (turn at the elbow)
    const swing = new THREE.Group(); swing.position.set(PIVOT['arm' + sd][0], PIVOT['arm' + sd][1], PIVOT['arm' + sd][2]);
    const low = new THREE.Group(); low.rotation.z = sd === 'L' ? -ARM_REST : ARM_REST;   // lower the T-pose arm
    low.add(mk('arm' + sd));
    const elbow = new THREE.Group();
    elbow.position.set(PIVOT['fore' + sd][0] - PIVOT['arm' + sd][0], PIVOT['fore' + sd][1] - PIVOT['arm' + sd][1], PIVOT['fore' + sd][2] - PIVOT['arm' + sd][2]);
    elbow.add(mk('fore' + sd)); low.add(elbow); swing.add(low); body.add(swing);
    d.parts['arm' + sd] = swing; d.elbows[sd] = elbow;
  });
  [-1, 1].forEach(s => {                       // eyes: a white disc with a black pupil
    const w = new THREE.Mesh(dude.eyeWhiteGeo, dude.eyeWhiteMat); w.position.set(s * 0.042, 0.035, 0.112); body.add(w);
    const p = new THREE.Mesh(dude.pupilGeo, dude.eyeMat); p.position.set(s * 0.042, 0.033, 0.1135); body.add(p);
  });
  // joint caps: hide the gaps when an arm or leg bends
  ['L', 'R'].forEach(sd => {
    const cap = (r, mat, parent, key) => { const m = new THREE.Mesh(dude.capGeo(r), mat); m.castShadow = true; parent.add(m); d.caps[key] = m; };
    cap(CAP.shoulder, d.mats.shirt, d.parts['arm' + sd], 'shoulder' + sd);
    cap(CAP.elbow, d.mats.shirt, d.elbows[sd], 'elbow' + sd);
    cap(CAP.hip, d.mats.pants, d.parts['leg' + sd], 'hip' + sd);
    cap(CAP.knee, d.mats.pants, d.knees[sd], 'knee' + sd);
  });

  // paint the colours + build hats/glasses/etc.
  d.dress = function(l) {
    l = d.look = ACC.fix(l);
    const o = ACC.get('outfit', l.outfit);
    const shirt = ACC.shirtOf(l, o), pants = ACC.pantsOf(l, o);
    const skin = ACC.SKINS[l.skin % ACC.SKINS.length];
    const shorts = o.shortsY !== undefined;
    // the skin mesh: skin everywhere under the clothes, so gaps show a dark shade of the cloth not a bright patch
    const shade = c => new THREE.Color(c).multiplyScalar(0.7).getHex();
    const table = [o.shoes, shade(pants), skin, shade(shirt), ACC.HAIRS[l.hair % ACC.HAIRS.length], skin, 0x15151a]
      .map(h => new THREE.Color(h));
    PART_NAMES.forEach(n => {
      const P = T.parts[n], attr = d.meshes[n].geometry.attributes.color, arr = attr.array;
      for (let i = 0; i < P.count; i++) {
        let r = P.reg[i];
        if (r === REG.PANTS && shorts && P.ys[i] < o.shortsY) r = REG.SKIN;
        const c = table[r];
        arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
      }
      attr.needsUpdate = true;
    });
    // the clothes themselves
    d.mats.shirt.color.setHex(shirt);
    d.mats.pants.color.setHex(pants);
    d.mats.skin.color.setHex(skin);
    PART_NAMES.forEach(n => {
      const c = d.cloth[n]; if (!c) return;
      c.shirt.geometry = dude.overlayGeo(n, [REG.SHIRT], -Infinity);
      c.pants.geometry = dude.overlayGeo(n, [REG.PANTS], shorts ? o.shortsY : -Infinity);
      c.pants.visible = c.pants.geometry.attributes.position.count > 0;
      if (c.band) c.band.visible = !!o.long;
    });
    const sleeves = !!o.long;
    ['L', 'R'].forEach(sd => {
      d.caps['shoulder' + sd].material = d.mats.shirt;
      d.caps['elbow' + sd].material = sleeves ? d.mats.shirt : d.mats.skin;   // bare elbows for short sleeves
      d.caps['elbow' + sd].visible = true;
      d.caps['hip' + sd].material = shorts ? d.mats.skin : d.mats.pants;      // bare knees for shorts / dresses
      d.caps['knee' + sd].material = shorts ? d.mats.skin : d.mats.pants;
      d.caps['hip' + sd].visible = true; d.caps['knee' + sd].visible = true;
    });
    if (d.acc) { body.remove(d.acc); ACC.dispose(d.acc); }
    d.acc = ACC.attach(body, l);
  };
  d.animate = (dt, speed) => dude.animate(d, dt, speed);
  d.dress(look);
  return d;
};

// ---------------------------------------------------------------- animation: STAND (speed ~0) and WALK / RUN
// alive = shoulders roll, chest twists against the hips, elbows and knees bend, body bobs and leans
dude.animate = function(d, dt, speed) {
  d.t += dt;
  const want = speed > 0.25 ? 1 : 0;
  d.mv += (want - d.mv) * Math.min(1, 9 * dt);                      // smooth blend stand <-> walk
  const mv = d.mv, idle = 1 - mv;
  const stride = 1.6 + Math.max(0, Math.min(6, speed - 3)) * 0.25;
  d.phase += dt * (Math.PI * 2 * speed / stride);                   // step rate follows the real speed
  const A = 0.4 + 0.5 * Math.min(1, speed / 9);                     // swing size: small walk, big run
  const run = Math.max(0, Math.min(1, (speed - 5) / 4));
  const s = Math.sin(d.phase), c = Math.cos(d.phase), P = d.parts;
  const sw = s * A * mv;

  // legs: swing at the hip, bend at the knee while the leg passes forward
  P.legL.rotation.x = sw;  P.legR.rotation.x = -sw;
  if (d.knees) {
    const kb = (0.55 + 0.7 * run) * (0.5 + A) * mv;
    d.knees.L.rotation.x = Math.max(0, c) * kb + 0.05 * mv;
    d.knees.R.rotation.x = Math.max(0, -c) * kb + 0.05 * mv;
  }
  // arms: swing at the shoulder (opposite to the legs), roll the shoulder, bend the elbow on the forward swing
  const idleArm = Math.sin(d.t * 1.7) * 0.05 * idle;
  const aL = -sw * 0.9 + idleArm, aR = sw * 0.9 - idleArm;
  P.armL.rotation.x = aL;  P.armR.rotation.x = aR;
  const out = 0.05 + 0.05 * mv + Math.sin(d.t * 1.3) * 0.015 * idle;     // arms hang slightly away from the body
  P.armL.rotation.z = out + c * 0.05 * mv;                               // shoulder roll
  P.armR.rotation.z = -out - c * 0.05 * mv;
  if (d.elbows) {
    const bend = side => 0.15 + 0.12 * idle + (0.75 + 0.4 * run) * Math.max(0, -side) * mv + 0.3 * run * mv;
    d.elbows.L.rotation.y = -bend(aL);      // forearm swings forward
    d.elbows.R.rotation.y = bend(aR);
  }
  // body: chest twists against the hips, bob, lean, sway
  if (d.body) d.body.rotation.y = -s * 0.15 * mv;
  if (d.hips) d.hips.rotation.y = s * 0.07 * mv;
  d.rig.position.y = Math.abs(c) * 0.03 * mv * (0.6 + A) + Math.sin(d.t * 2.2) * 0.004 * idle;
  d.rig.rotation.x = (0.04 + 0.12 * run) * mv;
  d.rig.rotation.z = s * 0.03 * mv + Math.sin(d.t * 1.1) * 0.012 * idle;
};
