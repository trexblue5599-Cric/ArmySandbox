// js/world-traffic.js  -  cars that drive around the roads (GLB VERSION)
world.carCache = {}; // Stores the loaded GLB models so we don't load them 50 times

// List of cars to randomly pick from your vehicles folder
world.carModels = [
  'vehicles/sedan.glb',
  'vehicles/hatchback-sports.glb',
  'vehicles/police.glb',
  'vehicles/taxi.glb',
  'vehicles/van.glb',
  'vehicles/suv.glb'
];

world.initTraffic = function() {
  const { ROADS, CAR_COLORS } = CONFIG;
  const { rnd, pick, obstacle } = world;
  const loader = new THREE.GLTFLoader();

  // Function to spawn one car
  function spawnCar(x, z, rotationY, alongZ, dir) {
    // Pick a random car file
    const modelPath = pick(world.carModels);
    
    // If we haven't loaded this car file yet, load it now
    if (!world.carCache[modelPath]) {
      loader.load(modelPath, (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        world.carCache[modelPath] = model;
        createTrafficObject(modelPath, x, z, rotationY, alongZ, dir);
      });
    } else {
      // If we already loaded it, just clone it and spawn it
      createTrafficObject(modelPath, x, z, rotationY, alongZ, dir);
    }
  }

  function createTrafficObject(modelPath, x, z, rotationY, alongZ, dir) {
    const carModel = world.carCache[modelPath].clone();
    
    // Scale might need tweaking depending on the Kenney kit. 
    // If cars are too big/small, change this number.
    carModel.scale.set(1, 1, 1); 
    
    carModel.rotation.y = rotationY;
    
    // Add to scene
    world.scene.add(carModel);
    
    // Create a group to hold it so our traffic logic works
    const g = new THREE.Group();
    g.add(carModel);
    
    // Position the group
    g.position.set(x, 0, z);
    world.cur.add(g);
    
    // Add to traffic array so they move
    world.traffic.push({ g, alongZ, dir, x: x, z: z, speed: 0, cruise: 7 + rnd() * 4 });
    
    // Add collision box (Adjust hw/hd if cars feel too big/small when walking into them)
    obstacle(x, z, alongZ ? 1.5 : 3, alongZ ? 3 : 1.5, 1.8);
  }

  // Spawn the traffic cars
  for (let i = 0; i < CONFIG.TRAFFIC_CARS; i++) {
    const alongZ = i % 2 === 0, dir = rnd() < 0.5 ? 1 : -1;
    const road = pick(ROADS), lane = road + dir * 1.9 * (alongZ ? -1 : 1);
    const t = (rnd() - 0.5) * (CONFIG.HALF * 2 - 10);
    
    // Calculate rotation based on direction
    const rotY = alongZ ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    
    // Determine exact X and Z based on lane
    const px = alongZ ? lane : t;
    const pz = alongZ ? t : lane;
    
    spawnCar(px, pz, rotY, alongZ, dir);
  }
};
