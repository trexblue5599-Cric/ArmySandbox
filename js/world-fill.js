// Dense, reproducible island scenery. Trees are instanced so forest groves
// stay detailed without creating hundreds of separate draw calls.
world.initFill = function() {
  const THREE = window.THREE;
  if (!world.scene || !THREE || typeof MAP === 'undefined') return;

  let seed = 0x1a51a7;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const bounds = MAP.COAST.reduce((box, point) => ({
    minX: Math.min(box.minX, point[0]),
    maxX: Math.max(box.maxX, point[0]),
    minZ: Math.min(box.minZ, point[1]),
    maxZ: Math.max(box.maxZ, point[1])
  }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
  const groundY = (x, z) => (MAP.heightAt ? MAP.heightAt(x, z) : 0.18) + 0.055;
  const safeGround = (x, z, shoreMargin = 17, riverMargin = 13) =>
    MAP.containsLand(x, z) &&
    MAP.coastDist(x, z) > shoreMargin &&
    MAP.riverDist(x, z) > riverMargin;

  const randomLandPoint = (shoreMargin = 16, riverMargin = 12) => {
    for (let attempt = 0; attempt < 180; attempt++) {
      const x = bounds.minX + random() * (bounds.maxX - bounds.minX);
      const z = bounds.minZ + random() * (bounds.maxZ - bounds.minZ);
      if (safeGround(x, z, shoreMargin, riverMargin)) return { x, z };
    }
    return null;
  };

  const makeInstances = (geometry, material, items, place) => {
    if (!items.length) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, items.length);
    const object = new THREE.Object3D();
    items.forEach((item, index) => {
      place(object, item);
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    world.scene.add(mesh);
    return mesh;
  };

  // The northern mountain chain sits on the same ridge as the reference.
  // Each main peak has a dark body, a broken secondary shoulder, and a few
  // lighter stone faces to keep the silhouette readable from above.
  const rockMats = [
    new THREE.MeshLambertMaterial({ color: 0x686a66, flatShading: true }),
    new THREE.MeshLambertMaterial({ color: 0x85847d, flatShading: true }),
    new THREE.MeshLambertMaterial({ color: 0xa7a398, flatShading: true }),
    new THREE.MeshLambertMaterial({ color: 0x555a58, flatShading: true })
  ];
  const peakSpecs = [
    [-35, -198, 19, 35],
    [-13, -208, 25, 49],
    [13, -214, 29, 60],
    [40, -205, 23, 47],
    [66, -198, 19, 39],
    [91, -187, 15, 29],
    [4, -184, 16, 29]
  ];
  peakSpecs.forEach((peak, index) => {
    const [x, z, radius, height] = peak;
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 7, 1),
      rockMats[index % 2]
    );
    base.position.set(0, height * 0.5 + groundY(x, z), 0);
    base.rotation.y = index * 0.71;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const shoulder = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 0.53, height * 0.68, 6, 1),
      rockMats[(index + 1) % 2]
    );
    shoulder.position.set(radius * 0.43, height * 0.34 + groundY(x, z), radius * 0.08);
    shoulder.rotation.y = index * 0.43 + 0.7;
    shoulder.castShadow = true;
    shoulder.receiveShadow = true;
    group.add(shoulder);

    const paleFace = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 0.27, height * 0.47, 5, 1),
      rockMats[2]
    );
    paleFace.position.set(-radius * 0.24, height * 0.7 + groundY(x, z), radius * 0.14);
    paleFace.rotation.set(0.1, index * 0.52, 0.24);
    paleFace.castShadow = true;
    paleFace.receiveShadow = true;
    group.add(paleFace);

    group.position.set(x, 0, z);
    group.rotation.y = index * 0.17;
    world.scene.add(group);
  });

  // Clustered forests echo the reference's strong western, northern, and
  // southeast tree masses while keeping the central meadow and waterways open.
  const groves = [
    { x: -280, z: -4, rx: 88, rz: 72, pines: 126, broadleaf: 38 },
    { x: -263, z: 126, rx: 66, rz: 38, pines: 78, broadleaf: 28 },
    { x: -184, z: -112, rx: 64, rz: 42, pines: 74, broadleaf: 27 },
    { x: 230, z: -111, rx: 70, rz: 67, pines: 142, broadleaf: 35 },
    { x: 176, z: 145, rx: 84, rz: 47, pines: 132, broadleaf: 47 },
    { x: -86, z: 172, rx: 65, rz: 28, pines: 62, broadleaf: 29 },
    { x: 104, z: -159, rx: 39, rz: 31, pines: 48, broadleaf: 16 },
    { x: -12, z: 198, rx: 39, rz: 19, pines: 27, broadleaf: 16 }
  ];
  const pines = [];
  const broadleaf = [];

  const addGroveTrees = (grove, kind, count, target) => {
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < count * 18) {
      attempts++;
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random());
      const x = grove.x + Math.cos(angle) * grove.rx * radius;
      const z = grove.z + Math.sin(angle) * grove.rz * radius;
      if (!safeGround(x, z, 18, 16)) continue;
      const scale = kind === 'pine' ? 0.72 + random() * 0.5 : 0.82 + random() * 0.58;
      target.push({
        x,
        z,
        y: groundY(x, z),
        scale,
        height: kind === 'pine' ? 5.7 + random() * 2.7 : 4.3 + random() * 2.0,
        rot: random() * Math.PI * 2,
        tone: Math.floor(random() * 4)
      });
      placed++;
    }
  };
  groves.forEach((grove) => {
    addGroveTrees(grove, 'pine', grove.pines, pines);
    addGroveTrees(grove, 'broadleaf', grove.broadleaf, broadleaf);
  });

  // Scattered single trees soften the edges of each grove without filling the
  // central open grassland or placing trunks on the beach or river banks.
  for (let i = 0; i < 72; i++) {
    const point = randomLandPoint(20, 18);
    if (!point || (Math.abs(point.x) < 70 && Math.abs(point.z) < 75)) continue;
    const target = random() < 0.67 ? pines : broadleaf;
    target.push({
      x: point.x,
      z: point.z,
      y: groundY(point.x, point.z),
      scale: 0.74 + random() * 0.45,
      height: 4.6 + random() * 2.5,
      rot: random() * Math.PI * 2,
      tone: Math.floor(random() * 4)
    });
  }

  // Layered evergreen canopies with visible trunks.
  const pineTrunkMat = new THREE.MeshLambertMaterial({ color: 0x71503a });
  const pineLeafMats = [
    new THREE.MeshLambertMaterial({ color: 0x255331 }),
    new THREE.MeshLambertMaterial({ color: 0x32663a }),
    new THREE.MeshLambertMaterial({ color: 0x427747 }),
    new THREE.MeshLambertMaterial({ color: 0x2c5c36 })
  ];
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.23, 2.35, 6);
  makeInstances(trunkGeo, pineTrunkMat, pines, (object, tree) => {
    object.position.set(tree.x, tree.y + 1.175 * tree.scale, tree.z);
    object.rotation.y = tree.rot;
    object.scale.setScalar(tree.scale);
  });

  const pineTierSpecs = [
    { radius: 1.58, height: 2.9, fraction: 0.32 },
    { radius: 1.34, height: 2.7, fraction: 0.51 },
    { radius: 1.05, height: 2.35, fraction: 0.69 }
  ];
  pineTierSpecs.forEach((tier, tierIndex) => {
    const geometry = new THREE.ConeGeometry(tier.radius, tier.height, 7, 1);
    makeInstances(geometry, pineLeafMats[tierIndex], pines, (object, tree) => {
      object.position.set(tree.x, tree.y + tree.height * tier.fraction, tree.z);
      object.rotation.y = tree.rot + tierIndex * 0.35;
      object.scale.set(tree.scale, tree.scale * (tree.height / 6.5), tree.scale);
    });
  });

  // Rounded, multi-lobed deciduous trees add lighter leafy patches between
  // the darker conifer stands.
  const broadTrunkMat = new THREE.MeshLambertMaterial({ color: 0x76543a });
  const broadLeafMats = [
    new THREE.MeshLambertMaterial({ color: 0x3e7838 }),
    new THREE.MeshLambertMaterial({ color: 0x4d8940 }),
    new THREE.MeshLambertMaterial({ color: 0x659849 }),
    new THREE.MeshLambertMaterial({ color: 0x326a35 })
  ];
  makeInstances(new THREE.CylinderGeometry(0.18, 0.29, 2.45, 6), broadTrunkMat, broadleaf, (object, tree) => {
    object.position.set(tree.x, tree.y + 1.225 * tree.scale, tree.z);
    object.rotation.y = tree.rot;
    object.scale.setScalar(tree.scale);
  });
  const broadleafLobes = broadLeafMats.map(() => []);
  broadleaf.forEach((tree) => {
    const lobes = [
      [0, 0, 0, 1.18],
      [-0.85, 0.08, 0, 0.8],
      [0.82, 0.12, 0.06, 0.84],
      [0.04, 0.08, -0.8, 0.79],
      [-0.04, 0.18, 0.78, 0.82]
    ];
    lobes.forEach(([dx, dy, dz, size]) => {
      broadleafLobes[tree.tone].push({
        x: tree.x + dx * tree.scale,
        y: tree.y + tree.height * 0.72 + dy * tree.scale,
        z: tree.z + dz * tree.scale,
        scale: size * tree.scale,
        rot: tree.rot
      });
    });
  });
  const leafGeo = new THREE.IcosahedronGeometry(1, 1);
  broadleafLobes.forEach((items, tone) => {
    makeInstances(leafGeo, broadLeafMats[tone], items, (object, lobe) => {
      object.position.set(lobe.x, lobe.y, lobe.z);
      object.rotation.set(0.08, lobe.rot, 0.04);
      object.scale.set(lobe.scale * 1.12, lobe.scale * 0.92, lobe.scale);
    });
  });

  // Small undergrowth marks are drawn into one reusable texture, then
  // scattered as lightweight transparent decals on safe inland grass.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    context.clearRect(0, 0, 128, 128);
    for (let n = 0; n < 18; n++) {
      const x = 9 + random() * 110;
      const y = 9 + random() * 110;
      const rx = 4 + random() * 8;
      const ry = 3 + random() * 6;
      context.fillStyle = ['rgba(34,82,34,.34)', 'rgba(45,104,39,.31)', 'rgba(52,116,46,.24)'][n % 3];
      context.beginPath();
      for (let i = 0; i <= 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const wobble = 0.78 + random() * 0.34;
        const px = x + Math.cos(angle) * rx * wobble;
        const py = y + Math.sin(angle) * ry * wobble;
        if (i === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      context.fillStyle = 'rgba(155,190,92,.44)';
      for (let k = 0; k < 5; k++) {
        context.beginPath();
        context.arc(x + (random() - 0.5) * rx, y + (random() - 0.5) * ry, 0.7 + random() * 1.1, 0, Math.PI * 2);
        context.fill();
      }
    }
    const decalTexture = new THREE.CanvasTexture(canvas);
    decalTexture.colorSpace = THREE.SRGBColorSpace || decalTexture.colorSpace;
    const decalMaterial = new THREE.MeshBasicMaterial({
      map: decalTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1
    });
    const decalGeometry = new THREE.PlaneGeometry(5.8, 4.5);
    const decals = new THREE.InstancedMesh(decalGeometry, decalMaterial, 760);
    const object = new THREE.Object3D();
    let count = 0;
    for (let i = 0; i < 760; i++) {
      const point = randomLandPoint(15, 9);
      if (!point || (Math.abs(point.x) < 34 && Math.abs(point.z) < 32)) continue;
      object.position.set(point.x, groundY(point.x, point.z) + 0.025, point.z);
      object.rotation.set(-Math.PI / 2, 0, random() * Math.PI * 2);
      const scale = 0.62 + random() * 1.28;
      object.scale.set(scale, scale, scale);
      object.updateMatrix();
      decals.setMatrixAt(count++, object.matrix);
    }
    decals.count = count;
    decals.instanceMatrix.needsUpdate = true;
    decals.frustumCulled = false;
    world.scene.add(decals);
  }

  // Low, rounded shrubs fill the margins of clearings and tree-grove edges.
  const bushColors = [0x356b32, 0x427b37, 0x518b40, 0x2e602d, 0x679548];
  const bushMats = bushColors.map((color) => new THREE.MeshLambertMaterial({ color }));
  const bushInstances = bushMats.map(() => []);
  for (let i = 0; i < 280; i++) {
    const point = randomLandPoint(15, 10);
    if (!point || (Math.abs(point.x) < 30 && Math.abs(point.z) < 30)) continue;
    const scale = 0.72 + random() * 1.25;
    const tone = Math.floor(random() * bushMats.length);
    for (let lobe = 0; lobe < 3; lobe++) {
      bushInstances[tone].push({
        x: point.x + (lobe - 1) * scale * 0.46,
        y: groundY(point.x, point.z) + (0.48 + (lobe === 1 ? 0.18 : 0)) * scale,
        z: point.z + (lobe - 1) * scale * 0.12,
        scale: scale * (lobe === 1 ? 0.58 : 0.47),
        rot: random() * Math.PI * 2
      });
    }
  }
  const bushGeo = new THREE.IcosahedronGeometry(1, 1);
  bushInstances.forEach((items, tone) => {
    makeInstances(bushGeo, bushMats[tone], items, (object, bush) => {
      object.position.set(bush.x, bush.y, bush.z);
      object.rotation.y = bush.rot;
      object.scale.set(bush.scale * 1.18, bush.scale * 0.76, bush.scale);
    });
  });

  // Varied stone scatter: mostly pebbles, with larger rocks concentrated by
  // the northern ridge and the island's exposed shore-facing hills.
  const stoneColors = [0x777972, 0x999487, 0x5d605d, 0xb0a68e];
  const stoneMats = stoneColors.map((color) => new THREE.MeshLambertMaterial({ color, flatShading: true }));
  const stoneInstances = stoneMats.map(() => []);
  for (let i = 0; i < 210; i++) {
    const point = randomLandPoint(13, 10);
    if (!point) continue;
    const roll = random();
    const size = roll < 0.62 ? 0.2 + random() * 0.34 : roll < 0.93 ? 0.44 + random() * 0.58 : 0.9 + random() * 0.9;
    const tone = Math.floor(random() * stoneMats.length);
    stoneInstances[tone].push({
      x: point.x,
      y: groundY(point.x, point.z) + size * 0.34,
      z: point.z,
      size,
      rot: random() * Math.PI * 2,
      tiltX: (random() - 0.5) * 0.36,
      tiltZ: (random() - 0.5) * 0.3
    });
  }
  const stoneGeo = new THREE.IcosahedronGeometry(1, 1);
  stoneInstances.forEach((items, tone) => {
    makeInstances(stoneGeo, stoneMats[tone], items, (object, stone) => {
      object.position.set(stone.x, stone.y, stone.z);
      object.rotation.set(stone.tiltX, stone.rot, stone.tiltZ);
      object.scale.set(stone.size * 1.18, stone.size * 0.7, stone.size);
    });
  });

  // Keep the legacy GLB tree list empty: the forest above is already rendered
  // in batches, so populating this list would load a duplicate model per tree.
  world.mapTreeSpots = [];
};
