// js/player.js  -  YOU: soldier, joystick, camera-look, fire, auto-aim, ammo
const player = {};

player.init = function() {
  player.maxHealth = 100;
  player.health = 100;
  player.dead = false;
  player.magSize = 30;
  player.mag = 30;
  player.reloading = false;
  player.reloadEnd = 0;
  player.lastShot = 0;
  player.aimUntil = 0;
  player.flashUntil = 0;
  player.firing = false;
  player.auto = false;
  player.target = null;
  player.phase = 0;
  player.jx = 0; player.jz = 0;

  // ---------- SOLDIER ----------
  const model = world.makeSoldier({
    body: 0x4a6b35, pants: 0x3d5a2b, vest: 0x2f4a22, pack: 0x3b3b2a,
    skin: 0xd9a77c, helmet: 0x2e4a1f
  });
  player.soldier = model.group;
  player.parts = model.parts;
  world.scene.add(player.soldier);

  // ---------- CONTROLS (HTML elements) ----------
  const el = (id, text) => {
    const d = document.createElement('div');
    d.id = id;
    if (text) d.textContent = text;
    document.body.appendChild(d);
    return d;
  };
  player.pad = el('look-pad');                 // drag on the right side to turn the camera
  player.base = el('joystick-base');
  player.knob = el('joystick-knob');
  player.fireBtn = el('fire-btn', 'FIRE');
  player.autoBtn = el('auto-btn', 'AUTO OFF');

  // joystick
  let dragging = false;
  function joy(e) {
    const r = player.base.getBoundingClientRect();
    let dx = e.clientX - (r.left + 65), dy = e.clientY - (r.top + 65);
    const len = Math.hypot(dx, dy), max = 55;
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    player.knob.style.left = (60 + dx) + 'px';
    player.knob.style.bottom = (75 - dy) + 'px';
    player.jx = dx / max;
    player.jz = dy / max;
  }
  const endJoy = () => {
    dragging = false; player.jx = player.jz = 0;
    player.knob.style.left = '60px'; player.knob.style.bottom = '75px';
  };
  player.base.addEventListener('pointerdown', e => { dragging = true; player.base.setPointerCapture(e.pointerId); joy(e); });
  player.base.addEventListener('pointermove', e => { if (dragging) joy(e); });
  player.base.addEventListener('pointerup', endJoy);
  player.base.addEventListener('pointercancel', endJoy);

  // camera look (drag the right side of the screen)
  let lookId = null, lx = 0, ly = 0;
  player.pad.addEventListener('pointerdown', e => {
    if (lookId !== null) return;
    lookId = e.pointerId; lx = e.clientX; ly = e.clientY;
    player.pad.setPointerCapture(e.pointerId);
  });
  player.pad.addEventListener('pointermove', e => {
    if (e.pointerId !== lookId) return;
    world.camYaw -= (e.clientX - lx) * 0.008;
    world.camPitch = Math.max(0.15, Math.min(0.95, world.camPitch + (e.clientY - ly) * 0.004));
    lx = e.clientX; ly = e.clientY;
  });
  const endLook = e => { if (e.pointerId === lookId) lookId = null; };
  player.pad.addEventListener('pointerup', endLook);
  player.pad.addEventListener('pointercancel', endLook);

  // fire (hold to keep shooting)
  player.fireBtn.addEventListener('pointerdown', e => {
    e.preventDefault();
    player.fireBtn.setPointerCapture(e.pointerId);
    player.firing = true;
  });
  const stopFire = () => { player.firing = false; };
  player.fireBtn.addEventListener('pointerup', stopFire);
  player.fireBtn.addEventListener('pointercancel', stopFire);

  // auto-fire toggle
  player.autoBtn.addEventListener('pointerdown', e => {
    e.preventDefault();
    player.auto = !player.auto;
    player.autoBtn.textContent = player.auto ? 'AUTO ON' : 'AUTO OFF';
    player.autoBtn.style.background = player.auto ? 'rgba(76,175,80,.75)' : 'rgba(0,0,0,.45)';
  });

  // keyboard (PC): WASD move, Space fire, R reload, arrows turn camera
  player.keys = {};
  addEventListener('keydown', e => {
    player.keys[e.code] = true;
    if (e.code === 'Space') player.firing = true;
    if (e.code === 'KeyR') player.reload();
  });
  addEventListener('keyup', e => {
    player.keys[e.code] = false;
    if (e.code === 'Space') player.firing = false;
  });
};

// closest enemy you can see and are roughly facing (camera direction)
player.findTarget = function() {
  const p = player.soldier.position;
  const fx = Math.sin(world.camYaw), fz = Math.cos(world.camYaw);
  let best = null, bestScore = 1e9;
  for (const e of world.enemies) {
    if (!e.alive) continue;
    const dx = e.mesh.position.x - p.x, dz = e.mesh.position.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > 38 || d < 0.01) continue;
    const dot = (dx * fx + dz * fz) / d;           // 1 = straight ahead
    if (dot < 0.35) continue;                      // not in front of camera
    if (world.blocked(p.x, p.z, e.mesh.position.x, e.mesh.position.z, 1.5)) continue;
    const score = d * (2 - dot);
    if (score < bestScore) { bestScore = score; best = e; }
  }
  return best;
};

player.reload = function() {
  if (player.reloading || player.dead || player.mag === player.magSize) return;
  player.reloading = true;
  player.reloadEnd = performance.now() + 1300;
  world.sfx.reload();
};

player.shoot = function() {
  const now = performance.now();
  if (player.dead || player.reloading) return;
  if (now - player.lastShot < 110) return;
  if (player.mag <= 0) { player.reload(); return; }
  player.lastShot = now;
  player.mag--;

  const p = player.soldier.position;
  let dx, dz;
  const t = player.target;
  if (t) { dx = t.mesh.position.x - p.x; dz = t.mesh.position.z - p.z; }
  else   { dx = Math.sin(world.camYaw); dz = Math.cos(world.camYaw); }
  const ang = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.06;
  dx = Math.sin(ang); dz = Math.cos(ang);

  player.soldier.rotation.y = ang;
  player.aimUntil = now + 350;
  player.flashUntil = now + 50;
  world.spawnBullet(p.x + dx * 1.5, 1.5, p.z + dz * 1.5, dx, dz, true, 18, 75);
  world.sfx.shot();
  if (player.mag <= 0) player.reload();
};

player.update = function(dt) {
  const now = performance.now();
  const p = player.soldier.position;
  const k = player.keys;

  if (player.reloading && now >= player.reloadEnd) { player.reloading = false; player.mag = player.magSize; }
  if (k.ArrowLeft)  world.camYaw += 2 * dt;
  if (k.ArrowRight) world.camYaw -= 2 * dt;

  player.target = player.findTarget();

  // movement is relative to where the camera looks
  let rawX = player.jx + (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
  let rawZ = player.jz + (k.KeyS ? 1 : 0) - (k.KeyW ? 1 : 0);
  const len = Math.min(1, Math.hypot(rawX, rawZ));
  if (len > 0.08) {
    const n = Math.hypot(rawX, rawZ);
    rawX /= n; rawZ /= n;
    const a = world.camYaw;
    const mx = -rawZ * Math.sin(a) - rawX * Math.cos(a);
    const mz = -rawZ * Math.cos(a) + rawX * Math.sin(a);
    const step = 7.5 * len * dt;
    const nx = p.x + mx * step, nz = p.z + mz * step;
    if (!world.collides(nx, p.z, 0.55)) p.x = nx;
    if (!world.collides(p.x, nz, 0.55)) p.z = nz;
    p.x = Math.max(-55, Math.min(55, p.x));
    p.z = Math.max(-55, Math.min(55, p.z));

    if (now > player.aimUntil) {
      let diff = Math.atan2(mx, mz) - player.soldier.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      player.soldier.rotation.y += diff * Math.min(1, 14 * dt);
    }
    player.phase += dt * 11 * len;
  }

  // walking animation
  const swing = len > 0.08 ? Math.sin(player.phase) * 0.9 * len : 0;
  player.parts.legL.rotation.x = swing;
  player.parts.legR.rotation.x = -swing;
  player.parts.inner.position.y = len > 0.08 ? Math.abs(Math.sin(player.phase)) * 0.07 : 0;
  player.parts.flash.visible = now < player.flashUntil;

  if (player.firing || (player.auto && player.target)) player.shoot();
};

player.updateDead = function(dt) {
  player.parts.flash.visible = false;
  const r = player.parts.inner.rotation;
  r.x = Math.max(-1.5, r.x - 4 * dt);
};

player.reset = function() {
  player.health = player.maxHealth;
  player.dead = false;
  player.mag = player.magSize;
  player.reloading = false;
  player.firing = false;
  player.soldier.position.set(0, 0, 0);
  player.soldier.rotation.set(0, 0, 0);
  player.parts.inner.rotation.x = 0;
  world.camYaw = 0;
};

player.init();
