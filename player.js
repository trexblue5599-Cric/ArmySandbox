// player.js
const player = {};

player.init = function() {
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

  // Controls
  const ui = (css) => { const d = document.createElement('div'); d.style.cssText = css; document.body.appendChild(d); return d; };
  player.base = ui('position:fixed;left:25px;bottom:40px;width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,.25);touch-action:none;z-index:10');
  player.knob = ui('position:fixed;left:60px;bottom:75px;width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.6);pointer-events:none;z-index:11');
  player.fireBtn = ui('position:fixed;right:30px;bottom:55px;width:90px;height:90px;border-radius:50%;background:rgba(255,60,60,.6);color:#fff;font:bold 18px sans-serif;display:flex;align-items:center;justify-content:center;touch-action:none;user-select:none;z-index:10;box-shadow: 0 4px 10px rgba(0,0,0,0.3)');
  player.fireBtn.textContent = 'FIRE';

  player.jx = 0;
  player.jz = 0;
  player.dragging = false;

  function joy(e) {
    const r = player.base.getBoundingClientRect();
    let dx = e.clientX - (r.left + 65), dy = e.clientY - (r.top + 65);
    const len = Math.hypot(dx, dy), max = 55;
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    player.knob.style.left = (60 + dx) + 'px';
    player.knob.style.bottom = (75 - dy) + 'px';
    player.jx = dx / max; player.jz = dy / max;
  }
  
  player.base.addEventListener('pointerdown', e => { player.dragging = true; player.base.setPointerCapture(e.pointerId); joy(e); });
  player.base.addEventListener('pointermove', e => { if (player.dragging) joy(e); });
  const endJoy = () => { player.dragging = false; player.jx = player.jz = 0; player.knob.style.left = '60px'; player.knob.style.bottom = '75px'; };
  player.base.addEventListener('pointerup', endJoy);
  player.base.addEventListener('pointercancel', endJoy);

  player.keys = {};
  addEventListener('keydown', e => { player.keys[e.code] = true; if (e.code === 'Space') player.shoot(); });
  addEventListener('keyup', e => player.keys[e.code] = false);

  // Bullets
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
  let mx = player.jx + (player.keys.KeyD ? 1 : 0) - (player.keys.KeyA ? 1 : 0);
  let mz = player.jz + (player.keys.KeyS ? 1 : 0) - (player.keys.KeyW ? 1 : 0);
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }

  if (len > 0.1) {
    const speed = 8 * dt;
    const nx = player.soldier.position.x + mx * speed;
    const nz = player.soldier.position.z + mz * speed;
    
    const hit = (x, z) => world.obstacles.some(o => Math.abs(x - o.x) < o.hw + 0.6 && Math.abs(z - o.z) < o.hd + 0.6);
    if (!hit(nx, player.soldier.position.z)) player.soldier.position.x = nx;
    if (!hit(player.soldier.position.x, nz)) player.soldier.position.z = nz;
    
    player.soldier.position.x = Math.max(-58, Math.min(58, player.soldier.position.x));
    player.soldier.position.z = Math.max(-58, Math.min(58, player.soldier.position.z));
    
    const targetRot = Math.atan2(mx, mz);
    let diff = targetRot - player.soldier.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    player.soldier.rotation.y += diff * 15 * dt;
  }
};

player.init();
