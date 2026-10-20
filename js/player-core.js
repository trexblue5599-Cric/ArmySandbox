// js/player-core.js  -  the player object: creates him and moves him every frame
const player = {};

player.init = function() {
  player.phase = 0;
  player.jx = 0; player.jz = 0;
  player.running = false;
  player.dude = null;

  player.soldier = new THREE.Group();          // (name kept: camera + minimap use it)
  player.model = new THREE.Group();
  player.soldier.add(player.model);
  world.scene.add(player.soldier);

  // stand-in person until dude.glb has loaded (or if it fails to load)
  player.fallback = world.makePerson({ shirt: 0x3f7fd6, pants: 0x3b5b92, skin: 0xe0ac82, hair: 0x5a3820 });
  player.model.add(player.fallback.group);

  player.loadDude();       // player-model.js
  player.initControls();   // player-controls.js
};

player.update = function(dt) {
  const p = player.soldier.position, k = player.keys;
  if (k.ArrowLeft)  world.camYaw += 2 * dt;
  if (k.ArrowRight) world.camYaw -= 2 * dt;

  let rawX = player.jx + (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
  let rawZ = player.jz + (k.KeyS ? 1 : 0) - (k.KeyW ? 1 : 0);
  const len = Math.min(1, Math.hypot(rawX, rawZ));
  let moving = false;

  if (len > 0.08) {
    const n = Math.hypot(rawX, rawZ);
    rawX /= n; rawZ /= n;
    const a = world.camYaw;
    const mx = -rawZ * Math.sin(a) - rawX * Math.cos(a);
    const mz = -rawZ * Math.cos(a) + rawX * Math.sin(a);
    const run = player.running || k.ShiftLeft || k.ShiftRight;
    const speed = (run ? 11 : 5.5) * len;
    const step = speed * dt;
    const nx = p.x + mx * step, nz = p.z + mz * step;
    const free = !!world.collides(p.x, p.z, 0.5);   // already touching something (e.g. a car)? let him walk out
    if (free || !world.collides(nx, p.z, 0.5)) p.x = nx;
    if (free || !world.collides(p.x, nz, 0.5)) p.z = nz;
    p.x = Math.max(-118, Math.min(118, p.x));
    p.z = Math.max(-118, Math.min(118, p.z));

    let diff = Math.atan2(mx, mz) - player.soldier.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    player.soldier.rotation.y += diff * Math.min(1, 14 * dt);
    player.phase += dt * (run ? 15 : 9) * len;
    moving = true;
  }

  // animation
  const amp = moving ? 1 : 0;
  const sw = Math.sin(player.phase);
  if (player.dude) {
    // the glb has no skeleton, so bob + lean + sway instead of swinging legs
    player.dude.position.y = moving ? Math.abs(sw) * 0.07 : Math.sin(performance.now() / 600) * 0.01;
    player.dude.rotation.x = moving ? (player.running ? 0.16 : 0.07) : 0;
    player.dude.rotation.z = moving ? sw * 0.05 : 0;
  } else if (player.fallback) {
    const P = player.fallback.parts;
    P.legL.rotation.x = sw * 0.9 * amp; P.legR.rotation.x = -sw * 0.9 * amp;
    P.armL.rotation.x = -sw * 0.8 * amp; P.armR.rotation.x = sw * 0.8 * amp;
  }
};
