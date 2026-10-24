// js/player.js  -  the player: a dude.glb person you control. Look (clothes, hat...) is chosen in the wardrobe.
const player = {
  jx: 0, jz: 0,          // joystick (-1..1); jz > 0 means "pulled down" = backwards
  running: false,
  keys: {},
  walkSpeed: 4.5,
  runSpeed: 9,
  radius: 0.4,
  speed: 0,              // real speed this frame (drives the walk / stand animation)
  wardrobeOpen: false
};
const LOOK_KEY = 'armySandboxLook';

player.init = function() {
  player.soldier = new THREE.Group();     // invisible root that moves around
  player.model = new THREE.Group();
  player.soldier.add(player.model);

  player.look = player.loadLook();
  player.dude = dude.make(player.look);
  player.model.add(player.dude.group);

  player.soldier.position.set(0, 0, 0);   // middle crossroads
  world.scene.add(player.soldier);
  player.initControls();
};

player.loadLook = function() {
  try { const s = localStorage.getItem(LOOK_KEY); if (s) return ACC.fix(JSON.parse(s)); } catch (e) {}
  return ACC.defaultLook();
};
player.setLook = function(look) {
  player.look = ACC.fix(look);
  player.dude.dress(player.look);
  if (typeof fp !== 'undefined' && fp.ready) fp.dress(player.look);
  try { localStorage.setItem(LOOK_KEY, JSON.stringify(player.look)); } catch (e) {}
};

player.update = function(dt) {
  const p = player.soldier.position, k = player.keys;
  const bx = p.x, bz = p.z;

  if (player.wardrobeOpen) {
    // stand still and turn to face the camera so you can see your clothes
    let diff = (world.camYaw + Math.PI) - player.soldier.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    player.soldier.rotation.y += diff * Math.min(1, 8 * dt);
    player.speed = 0;
    player.dude.animate(dt, 0);
    return;
  }

  const fpOn = (typeof fp !== 'undefined') && fp.active();
  let ix = player.jx, iz = -player.jz;                 // iz: + = forward
  if (k.KeyW || k.ArrowUp) iz += 1;
  if (k.KeyS || k.ArrowDown) iz -= 1;
  if (k.KeyD || k.ArrowRight) ix += 1;
  if (k.KeyA || k.ArrowLeft) ix -= 1;
  const mag = Math.min(1, Math.hypot(ix, iz));
  const sprint = player.running || k.ShiftLeft || k.ShiftRight;

  if (mag > 0.05) {
    const yaw = world.camYaw;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);      // camera forward on the ground
    const rx = -Math.cos(yaw), rz = Math.sin(yaw);     // camera right
    let dx = fx * iz + rx * ix, dz = fz * iz + rz * ix;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;

    const speed = (sprint ? player.runSpeed : player.walkSpeed) * mag;
    const r = player.radius;
    const nx = p.x + dx * speed * dt, nz = p.z + dz * speed * dt;
    if (!world.collides(nx, p.z, r) && !world.collidesPeds(nx, p.z, r)) p.x = nx;         // slide along walls: test each axis separately
    if (!world.collides(p.x, nz, r) && !world.collidesPeds(p.x, nz, r)) p.z = nz;
    if (!(typeof interior !== 'undefined' && interior.active)) {
      p.x = Math.max(-CONFIG.LIMIT, Math.min(CONFIG.LIMIT, p.x));
      p.z = Math.max(-CONFIG.LIMIT, Math.min(CONFIG.LIMIT, p.z));
    }

    if (!fpOn) {
      const target = Math.atan2(dx, dz);               // third person: turn smoothly toward the direction of travel
      let diff = target - player.soldier.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.soldier.rotation.y += diff * Math.min(1, 14 * dt);
    }
  }
  if (fpOn) player.soldier.rotation.y = world.camYaw;  // first person: the body always faces where you look
  const moved = dt > 0 ? Math.hypot(p.x - bx, p.z - bz) / dt : 0;
  player.speed += (moved - player.speed) * Math.min(1, 12 * dt);
  if (!fpOn) player.dude.animate(dt, player.speed);   // nobody sees the body in first person
};
