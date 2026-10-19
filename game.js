const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 35, 80);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const sun = new THREE.DirectionalLight(0xffffff, 0.7);
sun.position.set(10, 20, 10);
scene.add(sun);

const mat = c => new THREE.MeshLambertMaterial({ color: c });
function add(geo, color, x, y, z, parent = scene) {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// ground
const ground = add(new THREE.PlaneGeometry(120, 120), 0x7ec850, 0, 0, 0);
ground.rotation.x = -Math.PI / 2;

// obstacles (for simple collision)
const obstacles = [];
function house(x, z, wallColor, roofColor) {
  add(new THREE.BoxGeometry(6, 4, 6), wallColor, x, 2, z);
  const roof = add(new THREE.ConeGeometry(5, 3, 4), roofColor, x, 5.5, z);
  roof.rotation.y = Math.PI / 4;
  add(new THREE.BoxGeometry(1.2, 2, 0.2), 0x6d4c41, x, 1, z + 3.05);
  obstacles.push({ x, z, hw: 3, hd: 3 });
}
house(-12, -10, 0xffcc80, 0xd32f2f);
house(10, -14, 0x90caf9, 0x6d4c41);
house(14, 8, 0xf48fb1, 0x37474f);
house(-14, 10, 0xfff59d, 0x2e7d32);

function fence(x, z, len, vertical) {
  const w = vertical ? 0.3 : len, d = vertical ? len : 0.3;
  add(new THREE.BoxGeometry(w, 1, d), 0xbcaaa4, x, 0.5, z);
  obstacles.push({ x, z, hw: w / 2, hd: d / 2 });
}
fence(0, -20, 14, false);
fence(-22, 0, 14, true);
fence(22, 0, 14, true);

// toy blocks and trees
[[-4, 6, 0xe53935], [-2.2, 6, 0x1e88e5], [-3.1, 6, 0xfdd835]].forEach(([x, z, c], i) => {
  add(new THREE.BoxGeometry(1.5, 1.5, 1.5), c, x, 0.75 + (i === 2 ? 1.5 : 0), z);
});
obstacles.push({ x: -3.1, z: 6, hw: 2.5, hd: 1 });
for (let i = 0; i < 25; i++) {
  const x = (Math.random() - 0.5) * 100, z = (Math.random() - 0.5) * 100;
  if (Math.abs(x) < 25 && Math.abs(z) < 25) continue;
  add(new THREE.CylinderGeometry(0.3, 0.3, 2, 5), 0x6d4c41, x, 1, z);
  add(new THREE.ConeGeometry(1.6, 4, 6), 0x2e7d32, x, 4, z);
}

// soldier
const soldier = new THREE.Group();
add(new THREE.BoxGeometry(1, 1.4, 0.6), 0x2e7d32, 0, 1.3, 0, soldier);
add(new THREE.BoxGeometry(0.4, 0.9, 0.4), 0x1b5e20, -0.25, 0.45, 0, soldier);
add(new THREE.BoxGeometry(0.4, 0.9, 0.4), 0x1b5e20, 0.25, 0.45, 0, soldier);
add(new THREE.SphereGeometry(0.4, 8, 8), 0x388e3c, 0, 2.3, 0, soldier);
add(new THREE.SphereGeometry(0.45, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0x1b5e20, 0, 2.4, 0, soldier);
add(new THREE.BoxGeometry(0.2, 0.25, 1.2), 0x212121, 0.5, 1.5, 0.6, soldier);
scene.add(soldier);

// controls: joystick + fire button
const ui = (css) => { const d = document.createElement('div'); d.style.cssText = css; document.body.appendChild(d); return d; };
const base = ui('position:fixed;left:25px;bottom:40px;width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,.25);touch-action:none');
const knob = ui('position:fixed;left:60px;bottom:75px;width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.6);pointer-events:none');
const fireBtn = ui('position:fixed;right:30px;bottom:55px;width:90px;height:90px;border-radius:50%;background:rgba(255,60,60,.6);color:#fff;font:bold 18px sans-serif;display:flex;align-items:center;justify-content:center;touch-action:none;user-select:none');
fireBtn.textContent = 'FIRE';

let jx = 0, jz = 0, dragging = false;
function joy(e) {
  const r = base.getBoundingClientRect();
  let dx = e.clientX - (r.left + 65), dy = e.clientY - (r.top + 65);
  const len = Math.hypot(dx, dy), max = 55;
  if (len > max) { dx = dx / len * max; dy = dy / len * max; }
  knob.style.left = (60 + dx) + 'px';
  knob.style.bottom = (75 - dy) + 'px';
  jx = dx / max; jz = dy / max;
}
base.addEventListener('pointerdown', e => { dragging = true; base.setPointerCapture(e.pointerId); joy(e); });
base.addEventListener('pointermove', e => { if (dragging) joy(e); });
const endJoy = () => { dragging = false; jx = jz = 0; knob.style.left = '60px'; knob.style.bottom = '75px'; };
base.addEventListener('pointerup', endJoy);
base.addEventListener('pointercancel', endJoy);

const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Space') shoot(); });
addEventListener('keyup', e => keys[e.code] = false);

// shooting
const bullets = [];
const bulletGeo = new THREE.SphereGeometry(0.15, 6, 6);
const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
let lastShot = 0;
function shoot() {
  const now = performance.now();
  if (now - lastShot < 200) return;
  lastShot = now;
  const b = new THREE.Mesh(bulletGeo, bulletMat);
  const dir = new THREE.Vector3(Math.sin(soldier.rotation.y), 0, Math.cos(soldier.rotation.y));
  b.position.copy(soldier.position).add(new THREE.Vector3(0, 1.5, 0)).addScaledVector(dir, 1.3);
  b.userData = { dir, life: 1.5 };
  scene.add(b);
  bullets.push(b);
}
fireBtn.addEventListener('pointerdown', e => { e.preventDefault(); shoot(); });

// game loop
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);

  let mx = jx + (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  let mz = jz + (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }

  if (len > 0.1) {
    const speed = 8 * dt;
    const nx = soldier.position.x + mx * speed;
    const nz = soldier.position.z + mz * speed;
    const hit = (x, z) => obstacles.some(o => Math.abs(x - o.x) < o.hw + 0.6 && Math.abs(z - o.z) < o.hd + 0.6);
    if (!hit(nx, soldier.position.z)) soldier.position.x = nx;
    if (!hit(soldier.position.x, nz)) soldier.position.z = nz;
    soldier.position.x = Math.max(-58, Math.min(58, soldier.position.x));
    soldier.position.z = Math.max(-58, Math.min(58, soldier.position.z));
    soldier.rotation.y = Math.atan2(mx, mz);
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.position.addScaledVector(b.userData.dir, 30 * dt);
    b.userData.life -= dt;
    if (b.userData.life <= 0) { scene.remove(b); bullets.splice(i, 1); }
  }

  camera.position.set(soldier.position.x, 12, soldier.position.z + 14);
  camera.lookAt(soldier.position.x, 1, soldier.position.z);
  renderer.render(scene, camera);
}
loop();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
