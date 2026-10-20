// js/player.js  -  the player object: holds the soldier, moves him, animates the stand-in person
const player = {
  jx: 0, jz: 0,        // joystick (-1..1); jz > 0 means "pulled down" = backwards
  running: false,
  keys: {},
  walkSpeed: 4.5,
  runSpeed: 9,
  radius: 0.4,
  phase: 0
};

player.init = function() {
  // soldier = the invisible root that moves around; model = what you see
  player.soldier = new THREE.Group();
  player.model = new THREE.Group();
  player.soldier.add(player.model);

  // stand-in person (shown until dude.glb loads, or forever if it fails)
  player.fallback = world.makePerson({ shirt: 0x4a7a3a, pants: 0x3a4a2a, skin: 0xe0ac69, hair: 0x2b1d12 });
  player.model.add(player.fallback.group);

  player.soldier.position.set(0, 0, 0);   // middle crossroads
  world.scene.add(player.soldier);

  player.initControls();
  player.loadDude();
};

player.update = function(dt) {
  const k = player.keys;
  let ix = player.jx, iz = -player.jz;                 // iz: + = forward
  if (k.KeyW || k.ArrowUp) iz += 1;
  if (k.KeyS || k.ArrowDown) iz -= 1;
  if (k.KeyD || k.ArrowRight) ix += 1;
  if (k.KeyA || k.ArrowLeft) ix -= 1;
  const mag = Math.min(1, Math.hypot(ix, iz));
  const sprint = player.running || k.ShiftLeft || k.ShiftRight;
  const parts = player.fallback && player.fallback.parts;

  if (mag > 0.05) {
    const yaw = world.camYaw;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);      // camera forward on the ground
    const rx = -Math.cos(yaw), rz = Math.sin(yaw);     // camera right
    let dx = fx * iz + rx * ix, dz = fz * iz + rz * ix;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;

    const speed = (sprint ? player.runSpeed : player.walkSpeed) * mag;
    const p = player.soldier.position, r = player.radius;
    const nx = p.x + dx * speed * dt, nz = p.z + dz * speed * dt;
    if (!world.collides(nx, p.z, r)) p.x = nx;         // slide along walls: test each axis separately
    if (!world.collides(p.x, nz, r)) p.z = nz;
    p.x = Math.max(-118, Math.min(118, p.x));
    p.z = Math.max(-118, Math.min(118, p.z));

    // turn smoothly toward the direction of travel
    const target = Math.atan2(dx, dz);
    let diff = target - player.soldier.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    player.soldier.rotation.y += diff * Math.min(1, 14 * dt);

    player.phase += dt * (sprint ? 13 : 9) * mag;
    if (parts) {
      const sw = Math.sin(player.phase) * (sprint ? 1.0 : 0.7);
      parts.legL.rotation.x = sw;  parts.legR.rotation.x = -sw;
      parts.armL.rotation.x = -sw; parts.armR.rotation.x = sw;
    }
  } else if (parts) {
    parts.legL.rotation.x = parts.legR.rotation.x = parts.armL.rotation.x = parts.armR.rotation.x = 0;
  }
};
