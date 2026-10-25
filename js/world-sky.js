// js/world-sky.js  -  sky, sun, stars, fog and the day/night colours
world.initSky = function() {
  const { ROADS, ROAD_W, BLOCKS, DISTRICTS, LAKE, CAR_COLORS, DAY_LENGTH, START_HOUR, DOWN_STYLES, MID_STYLES, WALLS, ROOFS, SHIRTS, PANTS, SKINS } = CONFIG;
  const { rnd, pick, mix, smooth, getMat, flat, obstacle } = world;
  // ---------- SKY, FOG, LIGHTS ----------
  const skyC = document.createElement('canvas');
  skyC.width = 2; skyC.height = 256;
  const skyG = skyC.getContext('2d');
  const skyTex = new THREE.CanvasTexture(skyC);
  world.scene.background = skyTex;
  world.scene.fog = new THREE.Fog(0xdbe9f4, 110, 250);


  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x7a776c, 0.75);
  world.scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3dd, 0.9);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 170;
  sun.shadow.camera.left = -36; sun.shadow.camera.right = 36;
  sun.shadow.camera.top = 36;   sun.shadow.camera.bottom = -36;
  sun.shadow.bias = -0.0006;
  world.sun = sun;
  world.scene.add(sun);
  world.scene.add(sun.target);

  // stars (only visible at night)
  const starPos = [];
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2, e = 0.12 + rnd() * 1.3, r = 230;
    starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  world.stars = stars;
  world.scene.add(stars);

  const lampMat = world.lampMat = new THREE.MeshBasicMaterial({ color: 0x8a8a80 });
  world.sunDir = { x: 0.5, y: 0.8, z: 0.35 };

  function applyTime() {
    const ang = (world.hour - 6) / 24 * Math.PI * 2;
    const sunH = Math.sin(ang);
    const dayF = smooth(-0.12, 0.22, sunH);
    const duskF = Math.max(0, 1 - Math.abs(sunH) / 0.28);
    world.nf = 1 - dayF;

    const top = mix(0x070b1f, 0x5b9bd5, dayF).lerp(new THREE.Color(0x4a4a8a), duskF * 0.45);
    const hor = mix(0x141c38, 0xdbe9f4, dayF).lerp(new THREE.Color(0xff9a5a), duskF * 0.75);
    const mid = top.clone().lerp(hor, 0.6);
    const grad = skyG.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#' + top.getHexString());
    grad.addColorStop(0.55, '#' + mid.getHexString());
    grad.addColorStop(1, '#' + hor.getHexString());
    skyG.fillStyle = grad;
    skyG.fillRect(0, 0, 2, 256);
    skyTex.needsUpdate = true;
    world.scene.fog.color.copy(hor);

    hemi.color.copy(mix(0x2a3558, 0xbfd9ff, dayF));
    hemi.groundColor.copy(mix(0x15151c, 0x7a776c, dayF));
    hemi.intensity = 0.38 + 0.42 * dayF;

    let dx, dy, dz;
    if (sunH >= -0.05) { dx = Math.cos(ang); dy = sunH; dz = 0.35; }
    else { dx = -Math.cos(ang); dy = -sunH; dz = -0.35; }
    dy = Math.max(0.3, dy);
    const l = Math.hypot(dx, dy, dz);
    world.sunDir.x = dx / l; world.sunDir.y = dy / l; world.sunDir.z = dz / l;
    sun.intensity = Math.max(0.95 * dayF, 0.32 * (1 - dayF));
    sun.color.copy(mix(0x9db4ff, 0xfff3dd, dayF).lerp(new THREE.Color(0xffb070), duskF * 0.6));

    starMat.opacity = Math.max(0, world.nf * 1.2 - 0.2);
    lampMat.color.copy(mix(0x8a8a80, 0xfff8d0, world.nf));
    if (world.setGlow) world.setGlow(world.nf);
    world.facadeMats.forEach(m => { m.emissiveIntensity = world.nf * 0.95; });
  }
  world.applyTime = applyTime;
};
