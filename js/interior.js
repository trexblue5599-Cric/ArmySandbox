// js/interior.js  -  goes inside / outside the house: yellow markers, 2-second hold, fade, teleport.
// The inside of the house is built far away from the city (so it never overlaps anything).
const interior = {
  active: false, busy: false, ready: false,
  ax: 900, az: 900,     // where the inside of the house is built
  HOLD: 2,              // seconds you must stand still on a marker
  RADIUS: 1.15
};
interior.toWorld = (u, v) => ({ x: interior.ax - u, z: interior.az + v });

interior.makeMarker = function(x, z, label) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const basic = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, side: THREE.DoubleSide, depthWrite: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.0, 28), basic(0xffd600, 0.55)); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.1; g.add(disc);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.13, 32), basic(0xffeb3b, 1)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.14; g.add(ring);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(0.9, 28), basic(0xff9800, 0.85)); fill.rotation.x = -Math.PI / 2; fill.position.y = 0.12; fill.scale.setScalar(0.001); g.add(fill);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 3.2, 18, 1, true), basic(0xffe34d, 0.16)); beam.position.y = 1.7; g.add(beam);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 4), basic(0xffd600, 1)); arrow.rotation.x = Math.PI; arrow.position.y = 3.2; g.add(arrow);
  world.scene.add(g);
  return { group: g, ring, fill, arrow, x, z, t: 0, locked: false, label };
};

interior.init = function() {
  // ---- screen bits: fade + prompt ----
  const css = document.createElement('style');
  css.textContent = `
    #int-fade{position:fixed;left:0;top:0;width:100%;height:100%;background:#000;opacity:0;pointer-events:none;z-index:60;transition:opacity .35s}
    #int-prompt{position:fixed;left:50%;bottom:135px;transform:translateX(-50%);z-index:9;display:none;text-align:center;color:#fff;
      font:bold 15px sans-serif;text-shadow:0 1px 4px #000;background:rgba(0,0,0,.45);padding:8px 16px;border-radius:14px;pointer-events:none}
    #int-bar{width:150px;height:8px;background:rgba(255,255,255,.3);border-radius:4px;margin:6px auto 0;overflow:hidden}
    #int-bar div{height:100%;width:0;background:#ffd600}`;
  document.head.appendChild(css);
  interior.fade = document.createElement('div'); interior.fade.id = 'int-fade'; document.body.appendChild(interior.fade);
  interior.prompt = document.createElement('div'); interior.prompt.id = 'int-prompt';
  interior.prompt.innerHTML = '<span id="int-text"></span><div id="int-bar"><div id="int-fill"></div></div>';
  document.body.appendChild(interior.prompt);
  interior.textEl = document.getElementById('int-text'); interior.fillEl = document.getElementById('int-fill');

  // ---- build the house (from interior-house.js) ----
  HOUSE.build();
  const g = new THREE.Group();
  g.position.set(interior.ax, 0, interior.az);
  world.scene.add(g);
  interior.group = g;
  const solid = new THREE.Mesh(IB.geometry('solid'), new THREE.MeshLambertMaterial({ vertexColors: true }));
  solid.castShadow = true; solid.receiveShadow = true; g.add(solid);
  g.add(new THREE.Mesh(IB.geometry('glow'), new THREE.MeshBasicMaterial({ vertexColors: true })));
  g.add(new THREE.Mesh(IB.geometry('glass'), new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide })));

  // tiled floors (kitchen, bathroom)
  const texCache = {};
  HOUSE.tiled.forEach(f => {
    const key = f.c1 + '-' + f.c2;
    if (!texCache[key]) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d');
      x.fillStyle = '#' + f.c1.toString(16).padStart(6, '0'); x.fillRect(0, 0, 64, 64);
      x.fillStyle = '#' + f.c2.toString(16).padStart(6, '0'); x.fillRect(0, 0, 32, 32); x.fillRect(32, 32, 32, 32);
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; texCache[key] = t;
    }
    const tex = texCache[key].clone ? texCache[key] : texCache[key];
    const w = f.u1 - f.u0, d = f.v1 - f.v0;
    const t2 = new THREE.CanvasTexture(texCache[key].image); t2.wrapS = t2.wrapT = THREE.RepeatWrapping; t2.repeat.set(w / 1.0, d / 1.0);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: t2 }));
    m.rotation.x = -Math.PI / 2; m.position.set(-(f.u0 + f.u1) / 2, 0.062, (f.v0 + f.v1) / 2); m.receiveShadow = true;
    g.add(m);
  });
  // ceiling (only visible from inside - from above you see straight into the rooms)
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(22.4, 16.4), new THREE.MeshLambertMaterial({ color: 0xf6f3ec }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, HOUSE.H, 8); g.add(ceil);
  // grass around the house
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshLambertMaterial({ color: 0x6fae4f }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, -0.03, 8); lawn.receiveShadow = true; g.add(lawn);

  // extra light inside the house
  interior.ambient = new THREE.AmbientLight(0xfff0d8, 0);
  world.scene.add(interior.ambient);

  // walls + furniture you can't walk through
  IB.obstacles.forEach(o => world.obstacle(interior.ax - o.u, interior.az + o.v, o.w / 2, o.d / 2, o.h));

  // ---- markers ----
  const door = world.heroEntrance;
  interior.enterMarker = door ? interior.makeMarker(door.x, door.z, 'Entering house...') : null;
  const ex = interior.toWorld(HOUSE.exit.u, HOUSE.exit.v);
  interior.exitMarker = interior.makeMarker(ex.x, ex.z, 'Leaving house...');
  interior.exitMarker.group.visible = false;
  interior.ready = true;
};

// move the player (used at game start and by the markers)
interior.teleport = function(inside, pos, rotY, yaw) {
  const p = player.soldier.position;
  p.set(pos.x, 0, pos.z);
  player.soldier.rotation.y = rotY;
  player.speed = 0;
  world.camYaw = yaw;
  if (typeof fp !== 'undefined') fp.pitch = 0;
  if (inside && !interior.active) { interior._outPitch = world.camPitch; world.camPitch = Math.max(world.camPitch, 0.55); }
  if (!inside && interior.active && interior._outPitch) world.camPitch = interior._outPitch;
  interior.active = inside;
  interior.ambient.intensity = inside ? 0.55 : 0;
  const mm = document.getElementById('minimap'); if (mm) mm.style.display = inside ? 'none' : '';
  [interior.enterMarker, interior.exitMarker].forEach(m => { if (m) { m.t = 0; m.locked = true; } });
  if (typeof updateCamera === 'function') { updateCamera(1); updateCamera(1); }
};
interior.spawnInside = function() { interior.teleport(true, interior.toWorld(HOUSE.spawn.u, HOUSE.spawn.v), 0, 0); };

// walk through a marker (with a fade)
interior.go = function(inside) {
  if (interior.busy) return;
  interior.busy = true;
  interior.fade.style.opacity = 1;
  setTimeout(() => {
    if (inside) interior.teleport(true, interior.toWorld(HOUSE.entry.u, HOUSE.entry.v), 0, 0);
    else { const d = world.heroEntrance; interior.teleport(false, { x: d.outX, z: d.outZ }, Math.PI, Math.PI); }
    interior.fade.style.opacity = 0;
    setTimeout(() => { interior.busy = false; }, 400);
  }, 400);
};

interior.update = function(dt) {
  if (!interior.ready) return;
  const time = performance.now() / 1000;
  if (interior.enterMarker) interior.enterMarker.group.visible = !interior.active;
  interior.exitMarker.group.visible = interior.active;
  const m = interior.active ? interior.exitMarker : interior.enterMarker;
  if (!m) return;
  m.arrow.rotation.y += dt * 2.2;
  m.arrow.position.y = 3.2 + Math.sin(time * 3) * 0.2;
  m.ring.scale.setScalar(1 + Math.sin(time * 4) * 0.04);

  const p = player.soldier.position, d = Math.hypot(p.x - m.x, p.z - m.z);
  const on = d < interior.RADIUS, near = d < interior.RADIUS + 3;
  const still = player.speed < 0.6 && !player.wardrobeOpen && !interior.busy;
  if (!on) m.locked = false;
  if (on && still && !m.locked) m.t += dt; else m.t = Math.max(0, m.t - dt * 2);
  m.fill.scale.setScalar(Math.max(0.001, Math.min(1, m.t / interior.HOLD)));

  if (near && !interior.busy && !player.wardrobeOpen) {
    interior.prompt.style.display = 'block';
    interior.textEl.textContent = on ? (m.t > 0 ? m.label + ' ' + Math.max(0, interior.HOLD - m.t).toFixed(1) + 's' : 'Stand still here for 2 seconds')
                                     : (interior.active ? 'Yellow marker = exit' : 'Yellow marker = enter your house');
    interior.fillEl.style.width = Math.min(100, m.t / interior.HOLD * 100) + '%';
  } else interior.prompt.style.display = 'none';

  if (m.t >= interior.HOLD && !interior.busy) { m.t = 0; interior.go(!interior.active); }
};
