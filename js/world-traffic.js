// js/world-traffic.js  -  cars that drive ONLY on the road network (world.roadPaths from world-roads.js).
// A car follows a road's centre-line, turns at junctions onto a connected road, and turns round at dead ends.
// Cars never leave the road. When a car is out of sight and finishes a road, it comes back as a random car.
world.carModels = [
  'vehicles/sedan.glb', 'vehicles/hatchback-sports.glb', 'vehicles/police.glb',
  'vehicles/taxi.glb', 'vehicles/van.glb', 'vehicles/suv.glb'
];
world.traffic = world.traffic || [];
const CAR_SCALE = 1.5;     // the glb cars are ~2.6 long; make them bigger/smaller here
const VIEW = 260;          // cars further than this are hidden
const JOIN = 7;            // roads whose ends are this close (m) are joined at a junction
const BLANK_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

world.initTraffic = function() {
  const { CAR_COLORS } = CONFIG;
  const rnd = Math.random;
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

  // ---------- the road graph ----------
  const roads = (world.roadPaths || []).filter(r => r.points && r.points.length > 1);
  roads.forEach(r => {
    r.cum = [0];
    for (let i = 0; i < r.points.length - 1; i++) {
      const a = r.points[i], b = r.points[i + 1];
      r.cum.push(r.cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    r.len = r.cum[r.cum.length - 1];
  });
  const endOf = (r, end) => (end === 0 ? r.points[0] : r.points[r.points.length - 1]);
  // which roads continue from this road's start (end 0) or finish (end 1)
  const joins = roads.map((r, i) => {
    const out = { 0: [], 1: [] };
    [0, 1].forEach(end => {
      const p = endOf(r, end);
      roads.forEach((o, j) => {
        if (j === i) return;
        [0, 1].forEach(oe => {
          const q = endOf(o, oe);
          if (Math.hypot(p[0] - q[0], p[1] - q[1]) < JOIN) out[end].push({ road: j, end: oe });
        });
      });
    });
    return out;
  });
  // a car at distance s on road r, going dir (1 = start to end)
  function place(c) {
    const r = roads[c.road], s = Math.max(0, Math.min(r.len, c.s));
    let i = 0; while (i < r.cum.length - 2 && r.cum[i + 1] < s) i++;
    const a = r.points[i], b = r.points[i + 1], seg = r.cum[i + 1] - r.cum[i] || 1;
    const t = (s - r.cum[i]) / seg;
    const dx = (b[0] - a[0]) * c.dir, dz = (b[1] - a[1]) * c.dir;
    c.x = a[0] + (b[0] - a[0]) * t; c.z = a[1] + (b[1] - a[1]) * t;
    c.lx = c.x; c.lz = c.z;
    c.g.position.set(c.x, 0, c.z);
    c.g.rotation.y = Math.atan2(dx, dz);
  }
  // the nearest point on any road (used when the player has got out of a car)
  function nearestRoad(x, z) {
    let best = null, bd = Infinity;
    roads.forEach((r, ri) => {
      for (let i = 0; i < r.points.length - 1; i++) {
        const a = r.points[i], b = r.points[i + 1];
        const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
        const px = a[0] + dx * t, pz = a[1] + dz * t, d = Math.hypot(x - px, z - pz);
        if (d < bd) { bd = d; best = { road: ri, s: r.cum[i] + Math.hypot(px - a[0], pz - a[1]) }; }
      }
    });
    return best;
  }

  function dressRandom(c) {
    const path = pick(world.carModels), color = pick(CAR_COLORS);
    withModel(path, base => {
      const car = base.clone();
      car.scale.setScalar(CAR_SCALE);
      if (!hasTexture) car.traverse(o => { if (o.isMesh) o.material = world.getMat(color); });
      while (c.g.children.length) c.g.remove(c.g.children[0]);
      c.g.add(car);
    });
  }

  function addCar(road, s, dir) {
    const g = new THREE.Group(); world.scene.add(g);
    const c = { g, road, s, dir, speed: 0, base: 8 + rnd() * 5, x: 0, z: 0, lx: 0, lz: 0 };
    place(c);
    world.traffic.push(c);
    dressRandom(c);
    return c;
  }

  function start() {
    if (!roads.length) { console.warn('no road network: no cars'); return; }
    for (let i = 0; i < CONFIG.TRAFFIC_CARS; i++) {
      const road = Math.floor(rnd() * roads.length);
      addCar(road, rnd() * roads[road].len, rnd() < 0.5 ? 1 : -1);
    }
  }

  // every frame (called from world-update.js)
  world.updateTraffic = function(dt, px, pz) {
    for (const c of world.traffic) {
      if (typeof vehicleDrive !== 'undefined' && vehicleDrive.active && vehicleDrive.active.traffic === c) continue;
      // the player got out of this car: put it back on the nearest road
      if (Math.hypot(c.x - c.lx, c.z - c.lz) > 0.02) {
        const n = nearestRoad(c.x, c.z);
        if (n) { c.road = n.road; c.s = n.s; c.dir = 1; }
        c.base = 8 + rnd() * 5;
      }
      // slow down behind a car on the same road and heading the same way
      let gap = Infinity;
      for (const o of world.traffic) {
        if (o === c || o.road !== c.road || o.dir !== c.dir) continue;
        const d = (o.s - c.s) * c.dir;
        if (d > 0 && d < gap) gap = d;
      }
      const target = gap < 9 ? 0 : c.base;
      c.speed = target < c.speed ? Math.max(target, c.speed - 28 * dt) : Math.min(target, c.speed + 6 * dt);
      c.s += c.dir * c.speed * dt;

      // reached the end of this road: follow a junction, or turn round at a dead end
      const r = roads[c.road];
      if (c.s >= r.len || c.s <= 0) {
        const end = c.dir > 0 ? 1 : 0;
        const options = joins[c.road][end];
        if (options.length) {
          const pick2 = options[Math.floor(rnd() * options.length)];
          c.road = pick2.road;
          // arriving at the start of the new road (end 0) means driving forward; at its end, backward
          c.dir = pick2.end === 0 ? 1 : -1;
          c.s = c.dir > 0 ? 0 : roads[c.road].len;
        } else {
          c.dir = -c.dir;                                  // dead end: turn round
          c.s = Math.max(0, Math.min(r.len, c.s));
        }
        // a new road: if this car is out of sight, come back as a different random car
        if (Math.hypot(px - c.x, pz - c.z) > 110) dressRandom(c);
      }
      place(c);
      c.g.visible = Math.hypot(px - c.x, pz - c.z) < VIEW;
    }
  };

  if (typeof fetch === 'function') {
    fetch('vehicles/Textures/colormap.png', { method: 'HEAD' }).then(r => r.ok).catch(() => false).then(ok => { hasTexture = ok; start(); });
  } else start();
};
