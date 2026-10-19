// js/world.js  -  REALISTIC CITY (all built in code, no downloads needed)
// EDIT THE CITY IN "mapData" NEAR THE BOTTOM
const world = {};

world.init = function() {
  world.scene = new THREE.Scene();

  // ---------- SKY (gradient) + FOG ----------
  const skyC = document.createElement('canvas');
  skyC.width = 2; skyC.height = 256;
  const sg = skyC.getContext('2d');
  const grad = sg.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#5b9bd5');
  grad.addColorStop(0.6, '#a9cdea');
  grad.addColorStop(1, '#dbe9f4');
  sg.fillStyle = grad;
  sg.fillRect(0, 0, 2, 256);
  world.scene.background = new THREE.CanvasTexture(skyC);
  world.scene.fog = new THREE.Fog(0xcfe3f1, 45, 115);

  world.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);

  world.renderer = new THREE.WebGLRenderer({ antialias: true });
  world.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  world.renderer.setSize(innerWidth, innerHeight);
  world.renderer.shadowMap.enabled = true;
  world.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(world.renderer.domElement);

  // ---------- LIGHTS ----------
  world.scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x7a776c, 0.75));
  const sun = new THREE.DirectionalLight(0xfff3dd, 0.85);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -38;
  sun.shadow.camera.right = 38;
  sun.shadow.camera.top = 38;
  sun.shadow.camera.bottom = -38;
  sun.shadow.bias = -0.0006;
  world.scene.add(sun);
  world.scene.add(sun.target);
  // sun (and its shadows) follow the player
  (function followSun() {
    requestAnimationFrame(followSun);
    try {
      const p = player.soldier.position;
      sun.target.position.set(p.x, 0, p.z);
      sun.position.set(p.x + 25, 40, p.z + 20);
      sun.target.updateMatrixWorld();
    } catch (e) {}
  })();

  world.obstacles = [];
  world.enemies = [];
  world.particles = [];

  // ---------- HELPERS ----------
  const matCache = {};
  const getMat = c => matCache[c] || (matCache[c] = new THREE.MeshLambertMaterial({ color: c }));

  world.add = function(geo, color, x, y, z, parent = world.scene) {
    const m = new THREE.Mesh(geo, getMat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // window textures for buildings
  const tileCache = {};
  function makeTile(style) {
    if (tileCache[style]) return tileCache[style];
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    if (style === 'glass') {
      g.fillStyle = '#34495e'; g.fillRect(0, 0, 64, 64);
      const wg = g.createLinearGradient(0, 6, 0, 52);
      wg.addColorStop(0, '#9ccbea'); wg.addColorStop(1, '#4f86b0');
      g.fillStyle = wg; g.fillRect(3, 6, 58, 46);
      g.fillStyle = '#2c3e50'; g.fillRect(31, 6, 2, 46);
    } else if (style === 'brick') {
      g.fillStyle = '#8d4b3c'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#6e382c';
      for (let y = 0; y < 64; y += 8) g.fillRect(0, y, 64, 1);
      g.fillStyle = '#e9e4d8'; g.fillRect(16, 10, 32, 40);
      g.fillStyle = '#2f3b48'; g.fillRect(19, 13, 26, 34);
      g.fillStyle = '#e9e4d8'; g.fillRect(31, 13, 2, 34); g.fillRect(14, 50, 36, 3);
    } else if (style === 'concrete') {
      g.fillStyle = '#b9b7b0'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#a29f98'; g.fillRect(0, 0, 64, 3);
      g.fillStyle = '#8f8c85'; g.fillRect(10, 12, 44, 32);
      g.fillStyle = '#38495a'; g.fillRect(12, 14, 40, 28);
    } else {
      g.fillStyle = '#dccfae'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#c2b48f'; g.fillRect(17, 46, 30, 4); g.fillRect(18, 8, 28, 3);
      g.fillStyle = '#4a5d70'; g.fillRect(20, 12, 24, 34);
    }
    tileCache[style] = c;
    return c;
  }
  const facadeCache = {};
  function facade(style, w, h) {
    const rx = Math.max(1, Math.round(w / 3.4));
    const ry = Math.max(1, Math.round(h / 3.4));
    const key = style + '|' + rx + '|' + ry;
    if (facadeCache[key]) return facadeCache[key];
    const t = new THREE.CanvasTexture(makeTile(style));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    return (facadeCache[key] = new THREE.MeshLambertMaterial({ map: t }));
  }

  // ---------- GROUND + ROADS ----------
  const ROADS = [-30, 0, 30];   // road centre lines (used for x and z)
  const ROAD_W = 10;

  const ground = world.add(new THREE.PlaneGeometry(120, 120), 0x9a9c98, 0, 0, 0);
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;

  ROADS.forEach(r => {
    const a = world.add(new THREE.BoxGeometry(112, 0.05, ROAD_W), 0x3a3a3d, 0, 0.03, r);
    const b = world.add(new THREE.BoxGeometry(ROAD_W, 0.05, 112), 0x3a3a3d, r, 0.03, 0);
    a.castShadow = false; b.castShadow = false;
  });

  // road paint (instanced = very cheap)
  (function paint() {
    const dummy = new THREE.Object3D();
    const dashes = [], stripes = [];
    ROADS.forEach(r => {
      for (let t = -54; t <= 54; t += 5) {
        if (ROADS.some(c => Math.abs(t - c) < 8.5)) continue;
        dashes.push([t, r, 0]);   // along x road
        dashes.push([r, t, 1]);   // along z road
      }
    });
    ROADS.forEach(rx => ROADS.forEach(rz => {
      for (let s = -4; s <= 4; s++) {
        stripes.push([rx - 6.6, rz + s, 0]); stripes.push([rx + 6.6, rz + s, 0]);
        stripes.push([rx + s, rz - 6.6, 1]); stripes.push([rx + s, rz + 6.6, 1]);
      }
    }));
    function inst(list, geo, color) {
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color }), list.length);
      list.forEach((d, i) => {
        dummy.position.set(d[0], 0.07, d[1]);
        dummy.rotation.y = d[2] ? Math.PI / 2 : 0;
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.receiveShadow = true;
      world.scene.add(mesh);
    }
    inst(dashes, new THREE.BoxGeometry(2.2, 0.02, 0.22), 0xe0c940);
    inst(stripes, new THREE.BoxGeometry(2.4, 0.02, 0.5), 0xeeeeee);
  })();

  // street lights at intersections
  ROADS.forEach(rx => ROADS.forEach(rz => {
    [[rx + 6.2, rz + 6.2], [rx - 6.2, rz - 6.2]].forEach(([x, z]) => {
      const pole = world.add(new THREE.CylinderGeometry(0.1, 0.12, 6, 6), 0x444444, x, 3, z);
      pole.castShadow = false;
      const arm = world.add(new THREE.BoxGeometry(1.4, 0.1, 0.1), 0x444444, x - 0.6, 6, z);
      arm.castShadow = false;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
      head.position.set(x - 1.2, 5.95, z);
      world.scene.add(head);
      world.obstacles.push({ x, z, hw: 0.2, hd: 0.2, h: 6 });
    });
  }));

  // ---------- OBJECT BUILDERS ----------
  world.building = function(x, z, w, d, h, style) {
    const side = facade(style, d, h);   // faces looking along x
    const front = facade(style, w, h);  // faces looking along z
    const roofMat = getMat(0x4d4d4d);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roofMat, roofMat, front, front]);
    b.position.set(x, h / 2, z);
    b.castShadow = true; b.receiveShadow = true;
    world.scene.add(b);
    const lip = world.add(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), 0x5a5a5a, x, h + 0.25, z);
    lip.castShadow = false;
    world.add(new THREE.BoxGeometry(2, 1.2, 2), 0x8a8a8a, x + w * 0.2, h + 1.1, z - d * 0.2);
    world.obstacles.push({ x, z, hw: w / 2, hd: d / 2, h: h });
  };

  world.tree = function(x, z) {
    world.add(new THREE.CylinderGeometry(0.22, 0.32, 2.6, 6), 0x5d4037, x, 1.3, z);
    world.add(new THREE.IcosahedronGeometry(1.9, 0), 0x3f7d3a, x, 3.9, z);
    world.add(new THREE.IcosahedronGeometry(1.35, 0), 0x4a8f43, x, 5.1, z);
    world.obstacles.push({ x, z, hw: 0.5, hd: 0.5, h: 6 });
  };

  world.park = function(x, z) {
    const g = world.add(new THREE.BoxGeometry(18, 0.04, 18), 0x5a8f3c, x, 0.02, z);
    g.castShadow = false;
    world.parks.push({ x, z });
    [[-5, -5], [5, -4], [-4, 5], [6, 6], [0, 0]].forEach(([dx, dz]) => world.tree(x + dx, z + dz));
  };

  world.car = function(x, z, color, alongZ) {
    const g = new THREE.Group();
    world.add(new THREE.BoxGeometry(1.9, 0.7, 4.2), color, 0, 0.65, 0, g);
    world.add(new THREE.BoxGeometry(1.62, 0.5, 2.0), 0x233140, 0, 1.2, -0.2, g);
    world.add(new THREE.BoxGeometry(1.5, 0.08, 1.7), color, 0, 1.49, -0.2, g);
    const wheel = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 8);
    [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]].forEach(([wx, wz]) => {
      const w = world.add(wheel, 0x111111, wx, 0.38, wz, g);
      w.rotation.z = Math.PI / 2;
      w.castShadow = false;
    });
    g.position.set(x, 0, z);
    g.rotation.y = alongZ ? 0 : Math.PI / 2;
    world.scene.add(g);
    world.obstacles.push(alongZ ? { x, z, hw: 1.1, hd: 2.3, h: 1.7 } : { x, z, hw: 2.3, hd: 1.1, h: 1.7 });
  };

  world.tank = function(x, z, rot) {
    const g = new THREE.Group();
    world.add(new THREE.BoxGeometry(2.8, 1.1, 4.4), 0x5f6b34, 0, 0.9, 0, g);
    world.add(new THREE.BoxGeometry(0.7, 0.8, 4.6), 0x2f3a1a, -1.5, 0.45, 0, g);
    world.add(new THREE.BoxGeometry(0.7, 0.8, 4.6), 0x2f3a1a, 1.5, 0.45, 0, g);
    world.add(new THREE.BoxGeometry(1.9, 0.8, 2.0), 0x6d7a3b, 0, 1.85, -0.2, g);
    const barrel = world.add(new THREE.CylinderGeometry(0.16, 0.16, 2.8, 6), 0x2f3a1a, 0, 1.9, 1.7, g);
    barrel.rotation.x = Math.PI / 2;
    g.position.set(x, 0, z);
    g.rotation.y = rot || 0;
    world.scene.add(g);
    world.obstacles.push({ x, z, hw: 2.3, hd: 2.3, h: 2.4 });
  };

  world.sandbag = function(x, z, vertical) {
    const w = vertical ? 0.9 : 2.4, d = vertical ? 2.4 : 0.9;
    world.add(new THREE.BoxGeometry(w, 0.8, d), 0xb9a572, x, 0.4, z);
    world.obstacles.push({ x, z, hw: w / 2, hd: d / 2, h: 0.8 });
  };

  world.barrier = function(x, z, vertical) {
    const w = vertical ? 0.7 : 2.6, d = vertical ? 2.6 : 0.7;
    world.add(new THREE.BoxGeometry(w, 0.95, d), 0xbdbdbd, x, 0.48, z);
    world.obstacles.push({ x, z, hw: w / 2, hd: d / 2, h: 0.95 });
  };

  world.crate = function(x, z) {
    world.add(new THREE.BoxGeometry(1.6, 1.8, 1.6), 0x6b5b3a, x, 0.9, z);
    world.obstacles.push({ x, z, hw: 0.8, hd: 0.8, h: 1.8 });
  };

  world.wall = function(x, z, len, vertical) {
    const w = vertical ? 0.6 : len, d = vertical ? len : 0.6;
    world.add(new THREE.BoxGeometry(w, 2.2, d), 0x8d8d88, x, 1.1, z);
    world.obstacles.push({ x, z, hw: w / 2, hd: d / 2, h: 2.2 });
  };

  world.roads = ROADS;
  world.parks = [];
  world.spawnPoints = [];
  world.medkits = [];
  world.bullets = [];
  world.camYaw = 0;
  world.camPitch = 0.42;

  // is point (x,z) inside any obstacle (with radius r)?
  world.collides = function(x, z, r) {
    const list = world.obstacles;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (Math.abs(x - o.x) < o.hw + r && Math.abs(z - o.z) < o.hd + r) return o;
    }
    return null;
  };

  // would a bullet / camera at height y hit something here?
  world.hitObstacle = function(x, z, y, pad) {
    pad = pad || 0;
    const list = world.obstacles;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (o.h > y && Math.abs(x - o.x) < o.hw + pad && Math.abs(z - o.z) < o.hd + pad) return o;
    }
    return null;
  };

  // is the line from A to B blocked by anything taller than y?
  world.blocked = function(x1, z1, x2, z2, y) {
    const dx = x2 - x1, dz = z2 - z1;
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 1.2));
    for (let i = 1; i < n; i++) {
      if (world.hitObstacle(x1 + dx * i / n, z1 + dz * i / n, y, 0)) return true;
    }
    return false;
  };

  // bullets (updated in game.js)
  const bulletGeo = new THREE.BoxGeometry(0.09, 0.09, 1.3);
  const bulletMatP = new THREE.MeshBasicMaterial({ color: 0xffe74c });
  const bulletMatE = new THREE.MeshBasicMaterial({ color: 0xff5a2a });
  world.spawnBullet = function(x, y, z, dx, dz, friendly, damage, speed) {
    const b = new THREE.Mesh(bulletGeo, friendly ? bulletMatP : bulletMatE);
    b.position.set(x, y, z);
    b.rotation.y = Math.atan2(dx, dz);
    b.userData = { dx, dz, friendly, damage, speed, life: friendly ? 0.9 : 1.6 };
    world.scene.add(b);
    world.bullets.push(b);
  };

  // health pack
  world.medkit = function(x, z) {
    const g = new THREE.Group();
    world.add(new THREE.BoxGeometry(0.9, 0.55, 0.9), 0xf5f5f5, 0, 0, 0, g);
    world.add(new THREE.BoxGeometry(0.55, 0.57, 0.16), 0xd32f2f, 0, 0, 0, g);
    world.add(new THREE.BoxGeometry(0.16, 0.57, 0.55), 0xd32f2f, 0, 0, 0, g);
    g.position.set(x, 0.8, z);
    world.scene.add(g);
    world.medkits.push({ mesh: g, x, z, active: true, timer: 0 });
  };

  // ---------- SOUND (made with code, no files) ----------
  world.sfx = (function() {
    let ctx = null, noiseBuf = null;
    function start() {
      try {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          ctx = new AC();
          noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
          const d = noiseBuf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        if (ctx.state === 'suspended') ctx.resume();
      } catch (e) {}
    }
    addEventListener('pointerdown', start);
    addEventListener('keydown', start);
    function noise(dur, freq, vol) {
      if (!ctx || ctx.state !== 'running') return;
      const s = ctx.createBufferSource(); s.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      s.connect(f); f.connect(g); g.connect(ctx.destination);
      s.start(); s.stop(ctx.currentTime + dur);
    }
    function tone(f0, f1, dur, vol, type) {
      if (!ctx || ctx.state !== 'running') return;
      const o = ctx.createOscillator(); o.type = type || 'square';
      o.frequency.setValueAtTime(f0, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(f1, ctx.currentTime + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur);
    }
    return {
      shot()      { noise(0.09, 3200, 0.22); },
      enemyShot() { noise(0.1, 1600, 0.1); },
      hit()       { tone(320, 120, 0.07, 0.1, 'square'); },
      hurt()      { tone(170, 60, 0.22, 0.22, 'sawtooth'); },
      die()       { noise(0.3, 700, 0.22); },
      pickup()    { tone(500, 1000, 0.16, 0.16, 'sine'); },
      reload()    { tone(180, 260, 0.06, 0.12, 'square'); setTimeout(() => tone(260, 180, 0.06, 0.12, 'square'), 350); },
      wave()      { tone(300, 600, 0.25, 0.15, 'triangle'); }
    };
  })();

  // ---------- SOLDIER MODEL (used for you AND enemies) ----------
  // returns { group, parts } - parts.legL / legR / inner are used for animation
  world.makeSoldier = function(o) {
    const g = new THREE.Group();
    const m = new THREE.Group();
    g.add(m);
    const P = { root: g, inner: m };

    const legGeo = new THREE.BoxGeometry(0.38, 0.8, 0.4);
    const bootGeo = new THREE.BoxGeometry(0.42, 0.25, 0.55);
    function leg(x) {
      const lg = new THREE.Group();
      lg.position.set(x, 0.9, 0);
      world.add(legGeo, o.pants, 0, -0.4, 0, lg);
      world.add(bootGeo, 0x1a1a1a, 0, -0.82, 0.07, lg);
      m.add(lg);
      return lg;
    }
    P.legL = leg(-0.22);
    P.legR = leg(0.22);

    world.add(new THREE.BoxGeometry(0.95, 1.1, 0.55), o.body, 0, 1.45, 0, m);
    world.add(new THREE.BoxGeometry(1.0, 0.65, 0.62), o.vest, 0, 1.62, 0, m);
    world.add(new THREE.BoxGeometry(0.7, 0.8, 0.3), o.pack, 0, 1.5, -0.42, m);
    world.add(new THREE.SphereGeometry(0.3, 8, 8), o.skin, 0, 2.28, 0, m);
    world.add(new THREE.SphereGeometry(0.38, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), o.helmet, 0, 2.33, 0, m);
    world.add(new THREE.BoxGeometry(0.62, 0.06, 0.5), o.helmet, 0, 2.35, 0.2, m);
    world.add(new THREE.BoxGeometry(0.4, 0.08, 0.05), 0x111111, 0, 2.3, 0.3, m);   // goggles

    // arms (raised, holding the rifle)
    function arm(x, zrot) {
      const a = new THREE.Group();
      a.position.set(x, 1.95, 0);
      world.add(new THREE.BoxGeometry(0.26, 0.8, 0.28), o.body, 0, -0.4, 0, a);
      world.add(new THREE.BoxGeometry(0.22, 0.22, 0.22), o.skin, 0, -0.88, 0, a);
      a.rotation.x = -1.35;
      a.rotation.z = zrot;
      m.add(a);
    }
    arm(0.58, -0.3);
    arm(-0.58, 0.8);

    // rifle
    world.add(new THREE.BoxGeometry(0.12, 0.2, 1.25), 0x222222, 0.28, 1.5, 0.6, m);
    world.add(new THREE.BoxGeometry(0.1, 0.35, 0.15), 0x333333, 0.28, 1.25, 0.5, m);
    world.add(new THREE.BoxGeometry(0.12, 0.25, 0.4), 0x3a2a1a, 0.28, 1.48, -0.1, m);

    // muzzle flash (hidden until shooting)
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd54f }));
    flash.position.set(0.28, 1.5, 1.4);
    flash.visible = false;
    m.add(flash);
    P.flash = flash;

    return { group: g, parts: P };
  };

  // ---------- THE CITY MAP ----------
  // Move anything by changing x and z. Add a line to add an object.
  // Keep numbers between -55 and 55. Player starts at (0, 0).
  // Roads run along x/z = -30, 0, 30. City blocks are centred on -45, -15, 15, 45.
  // building styles: 'glass', 'brick', 'concrete', 'beige'
  const mapData = [
    // outer wall
    { type: 'wall', x: 0,   z: -57, len: 114, vertical: false },
    { type: 'wall', x: 0,   z: 57,  len: 114, vertical: false },
    { type: 'wall', x: -57, z: 0,   len: 114, vertical: true },
    { type: 'wall', x: 57,  z: 0,   len: 114, vertical: true },

    // north row (z = -45)
    { type: 'building', x: -49, z: -45, w: 8, d: 15, h: 14, style: 'brick' },
    { type: 'building', x: -40, z: -45, w: 8, d: 15, h: 10, style: 'beige' },
    { type: 'building', x: -15, z: -45, w: 14, d: 14, h: 16, style: 'concrete' },
    { type: 'building', x: 15,  z: -45, w: 14, d: 14, h: 24, style: 'glass' },

    // military compound (block 45, -45)
    { type: 'building', x: 49, z: -52, w: 8, d: 5, h: 5, style: 'concrete' },
    { type: 'tank', x: 42, z: -42, rot: 0.8 },
    { type: 'tank', x: 50, z: -40, rot: -0.6 },
    { type: 'sandbag', x: 40, z: -48, vertical: false },
    { type: 'sandbag', x: 44, z: -48, vertical: false },
    { type: 'sandbag', x: 38, z: -36, vertical: false },
    { type: 'barrier', x: 46, z: -35.5, vertical: false },
    { type: 'barrier', x: 52, z: -35.5, vertical: false },
    { type: 'crate', x: 53, z: -47 },
    { type: 'crate', x: 53, z: -44.8 },
    { type: 'crate', x: 51.2, z: -47 },

    // middle-north row (z = -15)
    { type: 'building', x: -45, z: -15, w: 15, d: 15, h: 8,  style: 'beige' },
    { type: 'building', x: -15, z: -15, w: 14, d: 14, h: 44, style: 'glass' },
    { type: 'building', x: 15,  z: -15, w: 14, d: 14, h: 36, style: 'concrete' },
    { type: 'building', x: 41,  z: -15, w: 7,  d: 15, h: 12, style: 'brick' },
    { type: 'building', x: 50,  z: -15, w: 7,  d: 15, h: 18, style: 'beige' },

    // middle-south row (z = 15)
    { type: 'park', x: -45, z: 15 },
    { type: 'building', x: -15, z: 15, w: 14, d: 14, h: 38, style: 'glass' },
    { type: 'building', x: 15,  z: 15, w: 14, d: 14, h: 22, style: 'brick' },
    { type: 'building', x: 45,  z: 15, w: 15, d: 15, h: 12, style: 'beige' },

    // south row (z = 45)
    { type: 'building', x: -49, z: 45, w: 7, d: 15, h: 16, style: 'brick' },
    { type: 'building', x: -40, z: 45, w: 7, d: 15, h: 11, style: 'concrete' },
    { type: 'building', x: -15, z: 45, w: 14, d: 14, h: 18, style: 'concrete' },
    { type: 'park', x: 15, z: 45 },
    { type: 'building', x: 45,  z: 45, w: 15, d: 15, h: 14, style: 'brick' },

    // street trees
    { type: 'tree', x: 6.5,   z: -22 }, { type: 'tree', x: -6.5,  z: 22 },
    { type: 'tree', x: 36.5,  z: 22 },  { type: 'tree', x: -36.5, z: -22 },
    { type: 'tree', x: 22,    z: 6.5 }, { type: 'tree', x: -22,   z: -6.5 },
    { type: 'tree', x: -22,   z: 36.5 }, { type: 'tree', x: 22,    z: -36.5 },

    // cars on the roads (alongZ true = driving up/down)
    { type: 'car', x: 2.5,   z: -14, color: 0xc62828, alongZ: true },
    { type: 'car', x: -2.5,  z: 20,  color: 0x1565c0, alongZ: true },
    { type: 'car', x: 32.5,  z: -20, color: 0xeeeeee, alongZ: true },
    { type: 'car', x: 27.5,  z: 10,  color: 0x222222, alongZ: true },
    { type: 'car', x: -32.5, z: -24, color: 0xf9a825, alongZ: true },
    { type: 'car', x: -27.5, z: 22,  color: 0x2e7d32, alongZ: true },
    { type: 'car', x: 12,    z: 2.5, color: 0x6a1b9a, alongZ: false },
    { type: 'car', x: -18,   z: -2.5, color: 0xeeeeee, alongZ: false },
    { type: 'car', x: 20,    z: 32.5, color: 0xc62828, alongZ: false },
    { type: 'car', x: -10,   z: 27.5, color: 0x37474f, alongZ: false },
    { type: 'car', x: 42,    z: -27.5, color: 0x1565c0, alongZ: false },
    { type: 'car', x: -42,   z: 32.5, color: 0xf9a825, alongZ: false },

    // cover near the crossroads
    { type: 'barrier', x: -8, z: -9, vertical: false },
    { type: 'barrier', x: 8,  z: 9,  vertical: false },
    { type: 'sandbag', x: 9,  z: -8, vertical: true },
    { type: 'sandbag', x: -9, z: 8,  vertical: true },

    // medkits (heal you, come back after 30 seconds)
    { type: 'medkit', x: 8,   z: -3 },
    { type: 'medkit', x: -25, z: 3 },
    { type: 'medkit', x: 3,   z: -28 },
    { type: 'medkit', x: -3,  z: 28 },
    { type: 'medkit', x: 30,  z: 15 },
    { type: 'medkit', x: -30, z: -12 },

    // where enemies can appear (on the roads, at the edges)
    { type: 'spawn', x: 0,   z: -50 }, { type: 'spawn', x: 0,   z: 50 },
    { type: 'spawn', x: -50, z: 0 },   { type: 'spawn', x: 50,  z: 0 },
    { type: 'spawn', x: 30,  z: -50 }, { type: 'spawn', x: -30, z: 50 },
    { type: 'spawn', x: 50,  z: 30 },  { type: 'spawn', x: -50, z: -30 },
    { type: 'spawn', x: -30, z: -50 }, { type: 'spawn', x: 30,  z: 50 },
    { type: 'spawn', x: 50,  z: -30 }, { type: 'spawn', x: -50, z: 30 }
  ];

  // ---------- BUILD THE CITY FROM THE LIST ----------
  mapData.forEach(o => {
    switch (o.type) {
      case 'building': world.building(o.x, o.z, o.w, o.d, o.h, o.style); break;
      case 'park':     world.park(o.x, o.z); break;
      case 'tree':     world.tree(o.x, o.z); break;
      case 'car':      world.car(o.x, o.z, o.color, o.alongZ); break;
      case 'tank':     world.tank(o.x, o.z, o.rot); break;
      case 'sandbag':  world.sandbag(o.x, o.z, o.vertical); break;
      case 'barrier':  world.barrier(o.x, o.z, o.vertical); break;
      case 'crate':    world.crate(o.x, o.z); break;
      case 'wall':     world.wall(o.x, o.z, o.len, o.vertical); break;
      case 'medkit':   world.medkit(o.x, o.z); break;
      case 'spawn':    world.spawnPoints.push({ x: o.x, z: o.z }); break;
      default: console.warn('Unknown map object:', o.type);
    }
  });
};

world.init(); // Start the world
