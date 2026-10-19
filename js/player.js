// js/player.js
const player = {};

player.init = function() {
  player.health = 100;

  // --- SOLDIER MODEL ---
  player.soldier = new THREE.Group();
  world.add(new THREE.BoxGeometry(1, 1.4, 0.6), 0x2e7d32, 0, 1.3, 0, player.soldier);
  world.add(new THREE.BoxGeometry(0.4, 0.9, 0.4), 0x1b5e20, -0.25, 0.45, 0, player.soldier);
  world.add(new THREE.BoxGeometry(0.4, 0.9, 0.4), 0x1b5e20, 0.25, 0.45, 0, player.soldier);
  world.add(new THREE.SphereGeometry(0.4, 8, 8), 0x388e3c, 0, 2.3, 0, player.soldier);
  world.add(new THREE.SphereGeometry(0.45, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0x1b5e20, 0, 2.4, 0, player.soldier);
  world.add(new THREE.BoxGeometry(0.2, 0.25, 1.2), 0x212121, 0.5, 1.5, 0.6, player.soldier);
  world.scene.add(player.soldier);

  player.muzzleFlash = new THREE.PointLight(0xffaa00, 0, 5);
  player.muzzleFlash.position.set(0.5, 1.5, 1.5);
  player.soldier.add(player.muzzleFlash);

  // --- CONTROLS ---
  player.base = document.createElement('div');
  player.base.id = 'joystick-base';
  document.body.appendChild(player.base);

  player.knob = document.createElement('div');
  player.knob.id = 'joystick-knob';
  document.body.appendChild(player.knob);

  player.fireBtn = document.createElement('div');
  player.fireBtn.id = 'fire-btn';
  player.fireBtn.textContent = 'FIRE';
  document.body.appendChild(player.fireBtn);

  player.jx = 0; player.jz = 0; player.dragging = false;

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
  
  player.base.addEventListener('pointerdown', e => { player.dragging = true; player.base.setPointerCapture(e.pointerId); joy(e); });
  player.base.addEventListener('pointermove', e => { if (player.dragging) joy(e); });
  const endJoy = () => { player.dragging = false; player.jx = player.jz = 0; player.knob.style.left = '60px'; player.knob.style.bottom = '75px'; };
  player.base.addEventListener('pointerup', endJoy);
  player.base.addEventListener('pointercancel', endJoy);

  player.keys = {};
  addEventListener('keydown', e => { player.keys[e.code] = true; if (e.code === 'Space') player.shoot(); });
  addEventListener('keyup', e => player.keys[e.code] = false);

  player.bullets = [];
  player.bulletGeo = new THREE.SphereGeometry(0.2, 8, 8);
  player.bulletMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
  player.lastShot = 0;

  player.fireBtn.addEventListener('pointerdown', e => { e.preventDefault(); player.shoot(); });
};

player.shoot = function() {
  const now = performance.now();
  if (now - player.lastShot < 200) return;
  player.lastShot = now;
  
  player.muzzleFlash.intensity = 2;
  setTimeout(() => { player.muzzleFlash.intensity = 0; }, 50);

  const b = new THREE.Mesh(player.bulletGeo, player.bulletMat);
  const dir = new THREE.Vector3(Math.sin(player.soldier.rotation.y), 0, Math.cos(player.soldier.rotation.y));
  b.position.copy(player.soldier.position).add(new THREE.Vector3(0, 1.5, 0)).addScaledVector(dir, 1.3);
  b.userData = { dir, life: 1.5 };
  world.scene.add(b);
  player.bullets.push(b);
};

player.update = function(dt) {
  // Get raw input
  let rawX = player.jx + (player.keys.KeyD ? 1 : 0) - (player.keys.KeyA ? 1 : 0);
  let rawZ = player.jz + (player.keys.KeyS ? 1 : 0) - (player.keys.KeyW ? 1 : 0);
  
  const len = Math.hypot(rawX, rawZ);
  if (len > 1) { 
    rawX /= len; 
    rawZ /= len; 
  }

  if (len > 0.1) {
    // --- CAMERA RELATIVE MOVEMENT MATH ---
    // We use the camera's current angle to figure out which way is "forward"
    const camAngle = world.cameraAngle || 0; 
    
    // Rotate the joystick input by the camera angle
    const moveX = rawX * Math.cos(camAngle) - rawZ * Math.sin(camAngle);
    const moveZ = rawX * Math.sin(camAngle) + rawZ * Math.cos(camAngle);

    const speed = 8 * dt;
    const nx = player.soldier.position.x + moveX * speed;
    const nz = player.soldier.position.z + moveZ * speed;
    
    const hit = (x, z) => world.obstacles.some(o => Math.abs(x - o.x) < o.hw + 0.6 && Math.abs(z - o.z) < o.hd + 0.6);
    if (!hit(nx, player.soldier.position.z)) player.soldier.position.x = nx;
    if (!hit(player.soldier.position.x, nz)) player.soldier.position.z = nz;
    
    player.soldier.position.x = Math.max(-58, Math.min(58, player.soldier.position.x));
    player.soldier.position.z = Math.max(-58, Math.min(58, player.soldier.position.z));
    
    // Rotate the soldier to face the direction he is actually moving
    const targetRot = Math.atan2(moveX, moveZ);
    let diff = targetRot - player.soldier.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    player.soldier.rotation.y += diff * 15 * dt;
  }
};

player.init();
