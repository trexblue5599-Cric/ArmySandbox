// js/world-glow.js  -  street lamps glow at night.
//   * HALO: a bright glow right around each lamp head
//   * POOL: a soft pool of light on the pavement under each lamp
// Both fade in as it gets dark (world.nf goes from 0 in the day to 1 at night).
// To make them stronger or bigger, change HALO / POOL below.
const GLOW = {
  HALO: { size: 3.2, strength: 1.0, y: 6.3 },   // size is in metres: bigger number = bigger glow
  POOL: { size: 17,  strength: 0.42, y: 0.35 }
};

world.initGlow = function() {
  // a soft round sprite used for every glow dot
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0.00, 'rgba(255,250,220,1)');
  grd.addColorStop(0.20, 'rgba(255,226,150,0.85)');
  grd.addColorStop(0.55, 'rgba(255,200,110,0.25)');
  grd.addColorStop(1.00, 'rgba(255,190,90,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);

  // one point per lamp, so the whole city's glow is just two draw calls
  const lamps = world.lampList;
  const positions = (y) => {
    const arr = new Float32Array(lamps.length * 3);
    lamps.forEach((l, i) => { arr[i * 3] = l[0]; arr[i * 3 + 1] = y; arr[i * 3 + 2] = l[1]; });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return geo;
  };
  const make = (cfg, color) => new THREE.Points(positions(cfg.y), new THREE.PointsMaterial({
    map: tex, color, size: cfg.size, sizeAttenuation: true,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0
  }));

  world.haloPts = make(GLOW.HALO, 0xffe2a0);
  world.poolPts = make(GLOW.POOL, 0xffc86a);
  world.haloPts.frustumCulled = false;
  world.poolPts.frustumCulled = false;
  world.scene.add(world.haloPts, world.poolPts);

  // called by world-sky.js whenever the time of day changes
  world.setGlow = function(nf) {
    const k = Math.max(0, Math.min(1, nf));
    world.haloPts.material.opacity = GLOW.HALO.strength * k;
    world.poolPts.material.opacity = GLOW.POOL.strength * k;
    world.haloPts.visible = k > 0.02;
    world.poolPts.visible = k > 0.02;
  };
};
