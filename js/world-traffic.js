// js/world-traffic.js  -  cars that drive around the roads (uses the .glb files in vehicles/)
world.carCache = {};      // model path -> loaded model
world.carModels = [       // the car files to pick from
  'vehicles/sedan.glb',
  'vehicles/hatchback-sports.glb',
  'vehicles/police.glb',
  'vehicles/taxi.glb',
  'vehicles/van.glb',
  'vehicles/suv.glb'
];
const CAR_SCALE = 1.5;    // the glb cars are ~2.6 long; make them bigger/smaller here

// 1x1 picture used when vehicles/Textures/colormap.png is missing (so the cars still load)
const BLANK_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

world.initTraffic = function() {
  const { ROADS, CAR_COLORS } = CONFIG;
  const { rnd, pick } = world;
  let hasTexture = false;

  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => (!hasTexture && /colormap\.png/i.test(url)) ? BLANK_PNG : url);
  const loader = new THREE.GLTFLoader(manager);

  const waiting = {};
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

  function spawn(x, z, rotY, alongZ, dir, path, color) {
    withModel(path, base => {
      const car = base.clone();
      car.scale.setScalar(CAR_SCALE);
      car.rotation.y = rotY;
      if (!hasTexture) car.traverse(c => { if (c.isMesh) c.material = world.getMat(color); });   // no colormap: plain painted car
      const g = new THREE.Group();
      g.add(car);
      g.position.set(x, 0, z);
      world.scene.add(g);
      world.traffic.push({ g, alongZ, dir, x, z, speed: 0, cruise: 7 + rnd() * 4 });
    });
  }

  function start() {
    for (let i = 0; i < CONFIG.TRAFFIC_CARS; i++) {
      const alongZ = i % 2 === 0, dir = rnd() < 0.5 ? 1 : -1;
      const road = pick(ROADS), lane = road + dir * 1.9 * (alongZ ? -1 : 1);
      const t = (rnd() - 0.5) * (CONFIG.HALF * 2 - 10);
      const rotY = alongZ ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      spawn(alongZ ? lane : t, alongZ ? t : lane, rotY, alongZ, dir, pick(world.carModels), pick(CAR_COLORS));
    }
  }

  // is the real colour texture there? then use it, else paint the cars plain colours
  if (typeof fetch === 'function') {
    fetch('vehicles/Textures/colormap.png', { method: 'HEAD' }).then(r => r.ok).catch(() => false).then(ok => { hasTexture = ok; start(); });
  } else start();
};
