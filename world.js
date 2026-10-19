// world.js
const world = {};

world.init = function() {
  world.scene = new THREE.Scene();
  world.scene.background = new THREE.Color(0x87ceeb);
  world.scene.fog = new THREE.Fog(0x87ceeb, 35, 80);

  world.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
  
  world.renderer = new THREE.WebGLRenderer({ antialias: true });
  world.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  world.renderer.setSize(innerWidth, innerHeight);
  world.renderer.shadowMap.enabled = true;
  world.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(world.renderer.domElement);

  // Lighting
  world.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(15, 25, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 50;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  world.scene.add(sun);

  world.obstacles = [];
  world.enemies = [];
  world.particles = [];

  // Helper to add meshes
  world.add = function(geo, color, x, y, z, parent = world.scene) {
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: color }));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // Build Ground
  const ground = world.add(new THREE.PlaneGeometry(120, 120), 0x7ec850, 0, 0, 0);
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;

  // Build Houses
  world.house = function(x, z, wallColor, roofColor) {
    world.add(new THREE.BoxGeometry(6, 4, 6), wallColor, x, 2, z);
    const roof = world.add(new THREE.ConeGeometry(5, 3, 4), roofColor, x, 5.5, z);
    roof.rotation.y = Math.PI / 4;
    world.add(new THREE.BoxGeometry(1.2, 2, 0.2), 0x6d4c41, x, 1, z + 3.05);
    world.obstacles.push({ x, z, hw: 3, hd: 3 });
  };
  world.house(-12, -10, 0xffcc80, 0xd32f2f);
  world.house(10, -14, 0x90caf9, 0x6d4c41);
  world.house(14, 8, 0xf48fb1, 0x37474f);
  world.house(-14, 10, 0xfff59d, 0x2e7d32);

  // Build Fences & Trees
  world.fence = function(x, z, len, vertical) {
    const w = vertical ? 0.3 : len, d = vertical ? len : 0.3;
    world.add(new THREE.BoxGeometry(w, 1, d), 0xbcaaa4, x, 0.5, z);
    world.obstacles.push({ x, z, hw: w / 2, hd: d / 2 });
  };
  world.fence(0, -20, 14, false);
  world.fence(-22, 0, 14, true);
  world.fence(22, 0, 14, true);

  for (let i = 0; i < 25; i++) {
    const x = (Math.random() - 0.5) * 100, z = (Math.random() - 0.5) * 100;
    if (Math.abs(x) < 25 && Math.abs(z) < 25) continue;
    world.add(new THREE.CylinderGeometry(0.3, 0.3, 2, 5), 0x6d4c41, x, 1, z);
    world.add(new THREE.ConeGeometry(1.6, 4, 6), 0x2e7d32, x, 4, z);
  }

  // Spawn Enemies
  world.spawnEnemy = function(x, z) {
    const enemyGroup = new THREE.Group();
    world.add(new THREE.BoxGeometry(1, 1.2, 0.6), 0x555555, 0, 1.1, 0, enemyGroup);
    world.add(new THREE.BoxGeometry(0.35, 0.8, 0.35), 0x333333, -0.2, 0.4, 0, enemyGroup);
    world.add(new THREE.BoxGeometry(0.35, 0.8, 0.35), 0x333333, 0.2, 0.4, 0, enemyGroup);
    world.add(new THREE.SphereGeometry(0.35, 8, 8), 0xffccaa, 0, 1.9, 0, enemyGroup);
    world.add(new THREE.BoxGeometry(0.7, 0.15, 0.7), 0xd32f2f, 0, 1.9, 0, enemyGroup);
    
    enemyGroup.position.set(x, 0, z);
    world.scene.add(enemyGroup);
    world.enemies.push({ mesh: enemyGroup, position: new THREE.Vector3(x, 1, z), alive: true });
  };

  world.spawnEnemy(5, 0);
  world.spawnEnemy(-5, -5);
  world.spawnEnemy(8, 5);
  world.spawnEnemy(0, -12);
  world.spawnEnemy(15, -5);
};

world.init(); // Start the world
