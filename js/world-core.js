// js/world-core.js  -  the world object + small helpers every other file uses
const world = {};

world.cur = null;   // the group new objects are added to (a city block, or the scene)
world._matCache = {};

// seeded random: the city is the SAME every time you load it
world.rnd = (function(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
})(20261020);
world.pick = a => a[Math.floor(world.rnd() * a.length)];
world.mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
world.smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

world.getMat = c => world._matCache[c] || (world._matCache[c] = new THREE.MeshLambertMaterial({ color: c }));
world.add = function(geo, color, x, y, z, parent = world.cur) {
  const m = new THREE.Mesh(geo, world.getMat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
};
world.flat = function(w, d, color, x, y, z, h = 0.02) {
  const m = world.add(new THREE.BoxGeometry(w, h, d), color, x, y, z);
  m.castShadow = false;
  return m;
};
world.obstacle = (x, z, hw, hd, h) => world.obstacles.push({ x, z, hw, hd, h });

world.initCore = function() {
  world.scene = new THREE.Scene();
  world.cur = world.scene;
  world.obstacles = [];
  world.traffic = [];
  world.peds = [];
  world.chunks = [];
  world.spinners = [];
  world.facadeMats = [];
  world.mapRects = [];
  world.hour = CONFIG.START_HOUR;
  world.nf = 0;
  world.camYaw = 0;
  world.camPitch = 0.4;

  world.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 320);
  world.renderer = new THREE.WebGLRenderer({ antialias: true });
  world.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  world.renderer.setSize(innerWidth, innerHeight);
  world.renderer.shadowMap.enabled = true;
  world.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(world.renderer.domElement);
};
