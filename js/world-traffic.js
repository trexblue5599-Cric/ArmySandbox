// js/world-traffic.js  -  cars that drive round and round the ring roads (uses the .glb files in vehicles/)
// Cars never vanish: each one follows a square loop forever. Every time a car finishes a lap
// while it is out of sight, it comes back as a different random car in a different colour.
world.carModels = [       // the car files to pick from
  'vehicles/sedan.glb',
  'vehicles/hatchback-sports.glb',
  'vehicles/police.glb',
  'vehicles/taxi.glb',
  'vehicles/van.glb',
  'vehicles/suv.glb'
];
world.traffic = world.traffic || [];
const CAR_SCALE = 1.5;    // the glb cars are ~2.6 long; make them bigger/smaller here
const LANE = 1.9;         // how far from the road centre the car drives
const LOOP_HALF = [120, 80, 40];   // the three loops (half-width of each square road loop)
const VIEW = 260;         // cars further than this are hidden (they are inside the fog by then anyway)

// 1x1 picture used when vehicles/Textures/colormap.png is missing (so the cars still load)
const BLANK_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

world.initTraffic = function() {
  const { CAR_COLORS } = CONFIG;
  const rnd = Math.random;                                       // real randomness every time
  const pick = a => a[Math.floor(rnd() * a.length)];
  let hasTexture = false;

  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => (!hasTexture && /colormap\.png/i.test(url)) ? BLANK_PNG : url);
  const loader = new THREE.GLTFLoader(manager);

  const waiting = {};
  world.carCache = world.carCache || {};
  function withModel(path, fn) {
    if (world.carCache[path]) return fn(world.carCache[path]);
    if (waiting[path]) { waiting[path].push(fn); return; }
    waiting[path] = [fn];
    loader.load(path, gltf => {
      gltf.scene.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      world.carCache[path] = gltf.scene;
      waiting[path].forEach(f => f(gltf.scene));
    }, undefined, err => console.warn('car model not loaded:', path, err));
  }

  // ---------- the loops ----------
  // a loop is a square; loopPos gives the x, z and heading of a car at distance s around it
  function loopPos(loop, s) {
    const L = loop.half, side = 2 * L, P = 4 * side;
    s = ((s % P) + P) % P;
    if (s < side)     return [L, -L + s, 0];
    if (s < 2 * side) return [L - (s - side), L, -Math.PI / 2];
    if (s < 3 * side) return [-L, L - (s - 2 * side), Math.PI];
    return [-L + (s - 3 * side), -L, Math.PI / 2];
  }
  const perimeter = loop => 8 * loop.half;
  // where on the loop is this point? (used when the player gets out of a car)
  function nearestS(loop, x, z) {
    let best = 0, bd = Infinity;
    const P = perimeter(loop);
    for (let s = 0; s < P; s += 0.5) {
      const p = loopPos(loop, s);
      const d = (p[0] - x) * (p[0] - x) + (p[1] - z) * (p[1] - z);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  // ---------- cars ----------
  // give a car a random model + colour (swapped in once the model is loaded)
  function dressRandom(c) {
    const path = pick(world.carModels), color = pick(CAR_COLORS);
    withModel(path, base => {
      const car = base.clone();
      car.scale.setScalar(CAR_SCALE);
      if (!hasTexture) car.traverse(o => { if (o.isMesh) o.material = world.getMat(color); });   // no colormap: plain painted car
      while (c.g.children.length) c.g.remove(c.g.children[0]);
      c.g.add(car);
    });
  }
  function place(c) {
    const p = loopPos(c.loop, c.s);
    c.x = p[0]; c.z = p[1]; c.lx = p[0]; c.lz = p[1];
    c.g.position.set(c.x, 0, c.z);
    c.g.rotation.y = p[2];
  }
  function addCar(loop, s) {
    const g = new THREE.Group();
    world.scene.add(g);
    const c = { g, loop, s, speed: 0, base: 7 + rnd() * 5, cruise: 0, x: 0, z: 0, lx: 0, lz: 0, dir: 1, alongZ: true };
    c.cruise = c.base;
    place(c);
    world.traffic.push(c);
    dressRandom(c);
    return c;
  }

  function start() {
    const loops = LOOP_HALF.map(h => ({ half: h - LANE }));
    for (let i = 0; i < CONFIG.TRAFFIC_CARS; i++) {
      const loop = loops[i % loops.length];
      addCar(loop, rnd() * perimeter(loop));
    }
  }

  // called every frame from world-update.js
  world.updateTraffic = function(dt, px, pz) {
    for (const c of world.traffic) {
      // a car the player is driving is moved by vehicle-drive.js, not by this loop
      if (typeof vehicleDrive !== 'undefined' && vehicleDrive.active && vehicleDrive.active.traffic === c) continue;

      // the player just got out of this car somewhere: pick up the loop from where it is now
      if (Math.hypot(c.x - c.lx, c.z - c.lz) > 0.02) {
        c.s = nearestS(c.loop, c.x, c.z);
        c.cruise = c.base;
      }

      // slow down behind a car in the same lane, otherwise cruise
      const P = perimeter(c.loop);
      let gap = Infinity;
      for (const o of world.traffic) {
        if (o === c || o.loop !== c.loop) continue;
        const d = (((o.s - c.s) % P) + P) % P;
        if (d < gap) gap = d;
      }
      const target = gap < 9 ? 0 : c.base;
      c.speed = target < c.speed ? Math.max(target, c.speed - 28 * dt) : Math.min(target, c.speed + 6 * dt);

      c.s += c.speed * dt;
      if (c.s >= P) {                                     // finished a lap
        c.s -= P;
        c.base = 7 + rnd() * 5;                           // a new speed each lap
        if (Math.hypot(px - c.x, pz - c.z) > 110) dressRandom(c);   // out of sight: come back as a different random car
      }
      place(c);
      c.g.visible = Math.hypot(px - c.x, pz - c.z) < VIEW;
    }
  };

  // is the real colour texture there? then use it, else paint the cars plain colours
  if (typeof fetch === 'function') {
    fetch('vehicles/Textures/colormap.png', { method: 'HEAD' }).then(r => r.ok).catch(() => false).then(ok => { hasTexture = ok; start(); });
  } else start();
};
