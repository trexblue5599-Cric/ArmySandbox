// Town, suburbs, commercial blocks, and named landmarks from the illustrated map.
world.initDistricts = function() {
  if (!world.scene || !window.THREE || typeof MAP === 'undefined') return;
  if (!world.building && typeof world.initBuildings === 'function') world.initBuildings();

  const THREE = window.THREE;
  const toWorld = ([px, py]) => [(px - 495) * 0.97, (py - 260) * 0.97];
  const material = (color) => {
    const normalized = typeof color === 'string' ? Number.parseInt(color.slice(1), 16) : color;
    return world.getMat ? world.getMat(normalized) : new THREE.MeshLambertMaterial({ color: normalized });
  };
  const locs = [
    { id: 'town', label: 'TOWN', category: 'map', px: 335, py: 126, color: '#55a34b', size: 23 },
    { id: 'gun-shop', label: 'GUN SHOP', category: 'shop', px: 398, py: 240, color: '#d79632', size: 24 },
    { id: 'club', label: 'CLUB', category: 'checkpoint', px: 532, py: 216, color: '#d84cc8', size: 20 },
    { id: 'hospital', label: 'HOSPITAL', category: 'service', px: 649, py: 185, color: '#d95050', size: 21 },
    { id: 'safehouse', label: 'SAFEHOUSE', category: 'checkpoint', px: 792, py: 166, color: '#86ab39', size: 24 },
    { id: 'suburbs', label: 'SUBURBS', category: 'map', px: 216, py: 296, color: '#55a34b', size: 24 },
    { id: 'police-station', label: 'POLICE STATION', category: 'service', px: 643, py: 247, color: '#4e88d2', size: 28 },
    { id: 'casino', label: 'CASINO', category: 'checkpoint', px: 693, py: 279, color: '#d95050', size: 20 },
    { id: 'car-shop', label: 'CAR SHOP', category: 'shop', px: 422, py: 350, color: '#df8b35', size: 22 },
    { id: 'bank', label: 'BANK', category: 'service', px: 590, py: 340, color: '#55a34b', size: 18 },
    { id: 'dockyard', label: 'DOCKYARD', category: 'map', px: 798, py: 393, color: '#d95050', size: 24 }
  ].map((location) => {
    const [x, z] = toWorld([location.px, location.py]);
    return { ...location, x, z };
  });

  world.mapLocations = locs;
  world.districtTypes = {
    downtown: 'central high-rise and retail core',
    town: 'northern coastal town',
    suburbs: 'western residential district',
    safehouse: 'eastern hillside safehouse',
    dockyard: 'southeastern harbor and cargo yards',
    landmarks: 'hospital, police station, casino, bank, and shops'
  };
  world.districtAreas = [
    { id: 'downtown', xMin: -95, xMax: 175, zMin: -75, zMax: 125 },
    { id: 'town', xMin: -205, xMax: -110, zMin: -170, zMax: -105 },
    { id: 'suburbs', xMin: -305, xMax: -225, zMin: 15, zMax: 95 },
    { id: 'safehouse', xMin: 245, xMax: 330, zMin: -125, zMax: -50 },
    { id: 'dockyard', xMin: 260, xMax: 360, zMin: 105, zMax: 170 }
  ];

  const canBuild = (x, z) => MAP.containsLand(x, z) && !MAP.inRiver(x, z);
  const build = (px, py, w, d, h, style, tint) => {
    const [x, z] = toWorld([px, py]);
    if (!canBuild(x, z)) return null;
    world.building(x, z, w, d, h, style, tint);
    return { x, z, w, d, h };
  };
  const house = (px, py, wall, roof) => {
    const [x, z] = toWorld([px, py]);
    if (canBuild(x, z)) world.house(x, z, wall, roof);
  };
  const detailBox = (w, h, d, color, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    world.cur.add(mesh);
    return mesh;
  };

  // Small residential clusters match the clearings around the north town and
  // west-side suburbs, rather than spreading houses across the whole island.
  const walls = [0xffe0b2, 0xc8e6c9, 0xfff9c4, 0xbbdefb, 0xffccbc, 0xd1c4e9];
  const roofs = [0xb23a30, 0x5d4037, 0x37474f, 0x2e6b3a, 0x7b3f7f];
  [[305, 111], [329, 112], [353, 122], [315, 137], [340, 142], [365, 137], [288, 126]].forEach((p, i) => house(p[0], p[1], walls[i % walls.length], roofs[(i + 1) % roofs.length]));
  [[189, 286], [210, 280], [232, 284], [250, 299], [233, 316], [211, 316], [192, 306]].forEach((p, i) => house(p[0], p[1], walls[(i + 2) % walls.length], roofs[i % roofs.length]));
  house(792, 169, 0xffe0b2, 0x2e6b3a);

  // Dense but walkable downtown blocks, kept inside the road grid.
  const columns = [467, 496, 525, 554, 583, 612, 641];
  const rows = [235, 268, 301, 334, 363];
  const landmarkPixels = locs.map((location) => [location.px, location.py]);
  let buildingIndex = 0;
  rows.forEach((py, row) => columns.forEach((px, col) => {
    if (landmarkPixels.some(([lx, ly]) => Math.hypot(px - lx, py - ly) < 19)) return;
    if ((row === 0 && col === 0) || (row === 4 && col > 4)) return;
    const height = 15 + ((row * 19 + col * 23 + buildingIndex * 7) % 38);
    const style = ['glass', 'concrete', 'brick', 'beige'][(row + col) % 4];
    const tint = [0xffffff, 0xe8eef2, 0xf4e4c8, 0xd8e5ea][(row * 2 + col) % 4];
    build(px, py, 11.5 + (col % 3), 13 + (row % 2) * 2, height, style, tint);
    buildingIndex++;
  }));

  // A tight cluster of taller towers creates the unmistakable central skyline.
  build(514, 278, 18, 17, 66, 'glass', 0xd8e8ee);
  build(542, 270, 17, 18, 57, 'concrete', 0xcfd7d8);
  build(568, 278, 16, 17, 61, 'glass', 0xe5edf2);
  build(541, 302, 18, 17, 46, 'brick', 0xe1bd92);

  // Named businesses and public services are intentionally distinct in shape,
  // scale, and color so they read as destinations from a zoomed-out camera.
  const gunShop = build(398, 240, 20, 15, 13, 'brick', 0xb87954);
  if (gunShop) detailBox(11, 0.7, 0.5, 0xc5c7c4, gunShop.x, 13.4, gunShop.z - 7.8);
  const club = build(532, 216, 21, 17, 31, 'concrete', 0x76427d);
  if (club) {
    detailBox(22, 1.2, 18, 0x36283e, club.x, 23, club.z);
    detailBox(13, 1.0, 0.35, 0xe34bd0, club.x, 26, club.z - 9);
  }
  const hospital = build(649, 185, 23, 20, 28, 'beige', 0xe8e3d5);
  if (hospital) {
    detailBox(1.5, 5, 1.1, 0xd94141, hospital.x, 30, hospital.z - 10.6);
    detailBox(5, 1.5, 1.1, 0xd94141, hospital.x, 30, hospital.z - 10.6);
  }
  const police = build(643, 247, 23, 19, 21, 'concrete', 0x8ba6b7);
  if (police) {
    detailBox(15, 0.5, 0.6, 0x4b78b6, police.x, 20.8, police.z - 9.9);
    detailBox(5, 3, 0.55, 0xe3c35f, police.x, 24, police.z - 10.3);
  }
  const casino = build(693, 279, 24, 20, 30, 'brick', 0x9c4c48);
  if (casino) {
    detailBox(26, 1.3, 22, 0xd4a83f, casino.x, 20, casino.z);
    detailBox(18, 1.1, 0.5, 0xffcc55, casino.x, 31.5, casino.z - 10.2);
  }
  const carShop = build(422, 350, 23, 18, 12, 'metal', 0x8d9394);
  if (carShop) detailBox(10, 2.4, 0.55, 0xe58a46, carShop.x, 12.8, carShop.z - 9.3);
  const bank = build(590, 340, 25, 21, 23, 'beige', 0xd7c6a4);
  if (bank) {
    detailBox(29, 1.2, 23, 0x4b6a58, bank.x, 20.5, bank.z);
    [-8, 0, 8].forEach((offset) => detailBox(1, 8, 1, 0xe2d6bd, bank.x + offset, 5, bank.z - 8));
  }

  // Map-style destination pins and readable label cards mirror the reference.
  const makeTagTexture = (location) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const radius = 22;
    ctx.beginPath();
    ctx.roundRect(12, 12, 488, 104, radius);
    ctx.fillStyle = '#f5e8c5';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#403529';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(66, 64, 28, 0, Math.PI * 2);
    ctx.fillStyle = location.color;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#352c24';
    ctx.stroke();
    ctx.fillStyle = '#fff8e8';
    ctx.font = 'bold 31px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(location.label[0], 66, 65);
    ctx.fillStyle = '#20201d';
    ctx.textAlign = 'left';
    const fontSize = location.label.length > 12 ? 27 : location.label.length > 8 ? 32 : 39;
    ctx.font = `900 ${fontSize}px Arial, sans-serif`;
    ctx.fillText(location.label, 112, 70, 370);
    const texture = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  world.poiMarkers = [];
  locs.forEach((location, index) => {
    const pin = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 12, 10),
      material(location.color)
    );
    pin.position.set(location.x, 12 + (MAP.heightAt ? MAP.heightAt(location.x, location.z) : 0), location.z);
    pin.castShadow = true;
    world.scene.add(pin);
    const point = new THREE.Mesh(
      new THREE.ConeGeometry(1.7, 4.7, 8),
      material(location.color)
    );
    point.position.set(location.x, 9.4 + (MAP.heightAt ? MAP.heightAt(location.x, location.z) : 0), location.z);
    point.rotation.x = Math.PI;
    world.scene.add(point);

    const tag = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeTagTexture(location),
      transparent: true,
      depthTest: false,
      depthWrite: false
    }));
    tag.position.set(location.x + (index % 2 ? 8 : -8), 24 + (MAP.heightAt ? MAP.heightAt(location.x, location.z) : 0), location.z - 7);
    tag.scale.set(location.size, location.size * 0.25, 1);
    tag.renderOrder = 20;
    world.scene.add(tag);
    world.poiMarkers.push({ id: location.id, pin, tag });
  });

  world.poiLabelsLoaded = true;
};
