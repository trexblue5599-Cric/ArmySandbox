// js/firstperson.js  -  first-person view + your right arm with a wrist watch.
//   * the camera sits in the player's eyes (the body is hidden while you play)
//   * the arm is drawn in a second pass on top of the world, so it never sinks into walls
//   * the watch shows the in-game time (same clock as the HUD)
//   * the wardrobe (shirt button) still switches to the third-person camera so you can see your clothes
//
// Want to move the arm?  Change the numbers in FP.ARM below.
const FP = {
  EYE: 1.75,            // eye height (metres)
  FOV: 68,              // first-person field of view
  THIRD_FOV: 60,        // field of view used by the third-person (wardrobe) camera
  LOOK_X: 0.0055,       // look sensitivity: radians per pixel dragged
  LOOK_Y: 0.0045,
  MAX_PITCH: 1.35,      // how far you can look up / down (radians)

  // the wrist's place in front of the camera (x right, y up, z forward = negative) + how the arm is turned
  ARM: { x: 0.33, y: -0.29, z: -0.55, yaw: 0.22, pitch: 0.2, roll: 0.3 },
  ARM_LEN: 0.42         // forearm length
};

const fp = {
  ready: false,
  pitch: 0,             // look up (+) / down (-)
  phase: 0, mv: 0,      // walking bob
  swayX: 0, swayY: 0,   // arm lag when you turn
  lastYaw: 0, lastPitch: 0,
  watchKey: -1
};

// first person is on all the time, except while the wardrobe is open
fp.active = () => fp.ready && !player.wardrobeOpen;

const fpFlat = g => { g = g.toNonIndexed(); g.computeVertexNormals(); return g; };   // crisp low-poly faces

// ---------------------------------------------------------------- setup
fp.init = function() {
  fp.scene = new THREE.Scene();
  fp.cam = new THREE.PerspectiveCamera(FP.FOV, innerWidth / innerHeight, 0.02, 10);
  fp.scene.add(fp.cam);
  fp.hemi = new THREE.HemisphereLight(0xbfd9ff, 0x7a776c, 0.8);
  fp.sun = new THREE.DirectionalLight(0xfff3dd, 0.9);
  fp.scene.add(fp.hemi);
  fp.scene.add(fp.sun);

  world.camera.rotation.order = 'YXZ';       // yaw first, then pitch (normal look-around)
  world.renderer.autoClear = false;          // we clear by hand so the arm can be drawn in a second pass

  fp.buildArm();
  fp.buildCrosshair();
  fp.ready = true;
  fp.dress(player.look);
};

fp.buildCrosshair = function() {
  const s = document.createElement('style');
  s.textContent = '#crosshair{position:fixed;left:50%;top:50%;width:5px;height:5px;margin:-3px 0 0 -3px;border-radius:50%;' +
    'background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.55);z-index:6;pointer-events:none;opacity:.85}';
  document.head.appendChild(s);
  fp.cross = document.createElement('div');
  fp.cross.id = 'crosshair';
  document.body.appendChild(fp.cross);
};

// the arm: wrist is the origin, the hand points forward (-z), the elbow is behind (+z)
fp.buildArm = function() {
  const LEN = FP.ARM_LEN;
  const arm = fp.arm = new THREE.Group();
  arm.rotation.order = 'YXZ';
  fp.cam.add(arm);

  fp.skinMat = new THREE.MeshLambertMaterial({ color: 0x8d5524 });
  fp.sleeveMat = new THREE.MeshLambertMaterial({ color: 0x4a5d3a });
  const strapMat = new THREE.MeshLambertMaterial({ color: 0x15151a });
  const caseMat = new THREE.MeshLambertMaterial({ color: 0x23232b });

  const box = (w, h, d, mat, x, y, z, parent) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    (parent || arm).add(m);
    return m;
  };

  // forearm: a square tube that is thin at the wrist and thicker at the elbow
  const tube = (rWrist, rElbow, len, zStart, mat) => {
    const g = new THREE.CylinderGeometry(rWrist, rElbow, len, 4, 1, false);
    g.rotateY(Math.PI / 4);              // square sides line up with the axes
    g.rotateX(-Math.PI / 2);             // wrist end -> forward (-z)
    g.translate(0, 0, zStart + len / 2); // start at zStart
    g.scale(1, 0.85, 1);                 // a bit flatter than wide
    return new THREE.Mesh(fpFlat(g), mat);
  };
  arm.add(tube(0.058, 0.082, LEN, 0, fp.skinMat));

  // long sleeve (only for outfits with long sleeves); it stops just behind the watch
  const sStart = 0.065, rAt = z => 0.058 + (0.082 - 0.058) * (z / LEN) + 0.006;
  fp.sleeve = tube(rAt(sStart), rAt(LEN + 0.02), LEN + 0.02 - sStart, sStart, fp.sleeveMat);
  arm.add(fp.sleeve);

  // hand: palm + two finger blocks + thumb (blocky, like the rest of the game)
  box(0.088, 0.05, 0.09, fp.skinMat, 0, 0, -0.045);                                   // palm
  const fA = box(0.042, 0.036, 0.085, fp.skinMat, -0.024, 0, -0.1325); fA.rotation.x = -0.08;   // index + middle
  const fB = box(0.040, 0.034, 0.068, fp.skinMat, 0.026, -0.001, -0.124); fB.rotation.x = -0.12; // ring + little
  const th = box(0.030, 0.032, 0.065, fp.skinMat, -0.062, -0.002, -0.06); th.rotation.y = 0.45;   // thumb

  // watch: black strap, black case, white face that shows the game time
  const WZ = 0.035;
  box(0.094, 0.08, 0.026, strapMat, 0, 0, WZ);                                        // strap
  const wc = new THREE.Mesh(fpFlat(new THREE.CylinderGeometry(0.037, 0.037, 0.014, 12)), caseMat);
  wc.position.set(0, 0.046, WZ); arm.add(wc);                                         // case

  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  fp.watchCtx = cv.getContext('2d');
  fp.watchTex = new THREE.CanvasTexture(cv);
  fp.faceMat = new THREE.MeshBasicMaterial({ map: fp.watchTex });
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), fp.faceMat);
  face.rotation.x = -Math.PI / 2;                                                     // face up, 12 o'clock points at the fingers
  face.position.set(0, 0.0535, WZ); arm.add(face);
};

// ---------------------------------------------------------------- look + camera
fp.look = function(dx, dy) {          // called by the look-pad: drag to turn / look up and down
  world.camYaw -= dx * FP.LOOK_X;
  fp.pitch = Math.max(-FP.MAX_PITCH, Math.min(FP.MAX_PITCH, fp.pitch - dy * FP.LOOK_Y));
};

fp.setFov = function(v) {
  if (world.camera.fov !== v) { world.camera.fov = v; world.camera.updateProjectionMatrix(); }
};

fp.updateCamera = function(dt) {
  const cam = world.camera, p = player.soldier.position;
  fp.setFov(FP.FOV);
  fp.phase += dt * player.speed * 1.7;
  fp.mv += (Math.min(player.speed / 4.5, 1.5) - fp.mv) * Math.min(1, 8 * dt);
  cam.position.set(p.x, FP.EYE + Math.sin(fp.phase * 2) * 0.022 * fp.mv, p.z);       // head bob
  cam.rotation.set(fp.pitch, world.camYaw + Math.PI, Math.sin(fp.phase) * 0.006 * fp.mv);
  if (fp.cross) fp.cross.style.display = '';
};

fp.leave = function() {               // wardrobe is open: normal third-person view
  fp.setFov(FP.THIRD_FOV);
  if (fp.cross) fp.cross.style.display = 'none';
};

// ---------------------------------------------------------------- the arm
fp.dress = function(look) {           // match skin colour + sleeve to the wardrobe
  if (!fp.ready && !fp.arm) return;
  const o = ACC.get('outfit', look.outfit);
  fp.skinMat.color.setHex(ACC.SKINS[look.skin % ACC.SKINS.length]);
  fp.sleeveMat.color.setHex(ACC.shirtOf(look, o));
  fp.sleeve.visible = !!o.long;
};

fp.drawWatch = function() {
  const key = Math.floor(world.hour * 60);
  if (key === fp.watchKey) return;
  fp.watchKey = key;
  const g = fp.watchCtx, S = 128, c = S / 2, TAU = Math.PI * 2;
  g.clearRect(0, 0, S, S);
  g.fillStyle = '#f5f3ec'; g.beginPath(); g.arc(c, c, c, 0, TAU); g.fill();
  g.strokeStyle = '#202026'; g.lineCap = 'round';
  for (let i = 0; i < 12; i++) {                                   // hour marks
    const a = i / 12 * TAU, big = i % 3 === 0, r1 = c - 6, r2 = c - (big ? 20 : 14);
    g.lineWidth = big ? 6 : 3.5;
    g.beginPath(); g.moveTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1); g.lineTo(c + Math.sin(a) * r2, c - Math.cos(a) * r2); g.stroke();
  }
  const hand = (a, len, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(a) * len, c - Math.cos(a) * len); g.stroke(); };
  hand((world.hour % 12) / 12 * TAU, 30, 8);                       // hour hand
  hand(((world.hour * 60) % 60) / 60 * TAU, 46, 5);                // minute hand
  g.fillStyle = '#202026'; g.beginPath(); g.arc(c, c, 6, 0, TAU); g.fill();
  fp.watchTex.needsUpdate = true;
};

fp.updateArm = function(dt) {
  const w = world.camera, c = fp.cam, A = FP.ARM;
  dt = Math.max(dt || 0.016, 0.001);

  // second camera = same view as the world camera
  if (c.aspect !== w.aspect || c.fov !== w.fov) { c.aspect = w.aspect; c.fov = w.fov; c.updateProjectionMatrix(); }
  c.quaternion.copy(w.quaternion);

  // lights follow the time of day (and the house lamps when you are inside)
  const day = 1 - (world.nf || 0), inside = (typeof interior !== 'undefined') && interior.active;
  fp.hemi.color.copy(world.mix(0x2a3558, 0xbfd9ff, day));
  fp.hemi.groundColor.copy(world.mix(0x15151c, 0x7a776c, day));
  fp.hemi.intensity = 0.4 + 0.42 * day + (inside ? 0.45 : 0);
  fp.sun.color.copy(world.sun.color);
  fp.sun.intensity = world.sun.intensity * (inside ? 0.5 : 1);
  fp.sun.position.set(world.sunDir.x * 10, world.sunDir.y * 10, world.sunDir.z * 10);

  // watch
  fp.drawWatch();
  fp.faceMat.color.setScalar(inside ? 0.92 : 0.5 + 0.5 * day);

  // the arm lags a little behind when you turn, and swings when you walk
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const yawRate = (world.camYaw - fp.lastYaw) / dt, pitRate = (fp.pitch - fp.lastPitch) / dt;
  fp.lastYaw = world.camYaw; fp.lastPitch = fp.pitch;
  const k = Math.min(1, 9 * dt);
  fp.swayX += (clamp(yawRate * 0.012, -0.05, 0.05) - fp.swayX) * k;
  fp.swayY += (clamp(-pitRate * 0.01, -0.035, 0.035) - fp.swayY) * k;

  const mv = fp.mv, t = performance.now() / 1000;
  const run = clamp((player.speed - 5) / 4, 0, 1);
  const bx = clamp(w.aspect * 0.15, 0.2, 0.34);                    // keep the arm in the same screen spot on any phone shape
  fp.arm.position.set(
    bx + Math.sin(fp.phase) * 0.010 * mv + fp.swayX,
    A.y - Math.abs(Math.sin(fp.phase)) * 0.016 * mv + Math.sin(t * 1.5) * 0.0025 + fp.swayY - run * 0.02,
    A.z + run * 0.03
  );
  fp.arm.rotation.set(
    A.pitch - fp.swayY * 1.5 + Math.sin(fp.phase) * 0.02 * mv,
    A.yaw + fp.swayX * 2,
    A.roll + Math.sin(fp.phase) * 0.03 * mv
  );
};

// ---------------------------------------------------------------- draw the frame (world first, then the arm on top)
fp.render = function(dt) {
  const r = world.renderer;
  r.clear();
  r.render(world.scene, world.camera);
  if (!fp.active() || (typeof vehicleDrive !== 'undefined' && vehicleDrive.active)) return;
  fp.updateArm(dt);
  r.clearDepth();
  r.render(fp.scene, fp.cam);
};
