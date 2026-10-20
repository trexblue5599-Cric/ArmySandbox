// js/world-textures.js  -  window textures for buildings (and the lights that turn on at night)
world.initTextures = function() {
  const { ROADS, ROAD_W, BLOCKS, DISTRICTS, LAKE, CAR_COLORS, DAY_LENGTH, START_HOUR, DOWN_STYLES, MID_STYLES, WALLS, ROOFS, SHIRTS, PANTS, SKINS } = CONFIG;
  const { rnd, pick, mix, smooth, getMat, flat, obstacle } = world;
  // window textures (2 x 2 windows per tile) + matching "lights on" map for night
  const WIN = { glass: [3, 6, 58, 46], brick: [19, 13, 26, 34], concrete: [12, 14, 40, 28], beige: [20, 12, 24, 34], house: [16, 14, 32, 30] };
  function drawCell(g, style) {
    if (style === 'glass') {
      g.fillStyle = '#34495e'; g.fillRect(0, 0, 64, 64);
      const wg = g.createLinearGradient(0, 6, 0, 52);
      wg.addColorStop(0, '#9ccbea'); wg.addColorStop(1, '#4f86b0');
      g.fillStyle = wg; g.fillRect(3, 6, 58, 46);
      g.fillStyle = '#2c3e50'; g.fillRect(31, 6, 2, 46);
    } else if (style === 'brick') {
      g.fillStyle = '#8d4b3c'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#6e382c';
      for (let y = 0; y < 64; y += 8) g.fillRect(0, y, 64, 1);
      g.fillStyle = '#e9e4d8'; g.fillRect(16, 10, 32, 40);
      g.fillStyle = '#2f3b48'; g.fillRect(19, 13, 26, 34);
      g.fillStyle = '#e9e4d8'; g.fillRect(31, 13, 2, 34); g.fillRect(14, 50, 36, 3);
    } else if (style === 'concrete') {
      g.fillStyle = '#b9b7b0'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#a29f98'; g.fillRect(0, 0, 64, 3);
      g.fillStyle = '#8f8c85'; g.fillRect(10, 12, 44, 32);
      g.fillStyle = '#38495a'; g.fillRect(12, 14, 40, 28);
    } else if (style === 'beige') {
      g.fillStyle = '#dccfae'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#c2b48f'; g.fillRect(17, 46, 30, 4); g.fillRect(18, 8, 28, 3);
      g.fillStyle = '#4a5d70'; g.fillRect(20, 12, 24, 34);
    } else if (style === 'house') {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#e8e8e8'; g.fillRect(12, 10, 40, 38);
      g.fillStyle = '#35506b'; g.fillRect(16, 14, 32, 30);
      g.fillStyle = '#ffffff'; g.fillRect(31, 14, 2, 30); g.fillRect(14, 48, 36, 3);
    } else { // metal
      g.fillStyle = '#8a9199'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#7a818b';
      for (let x = 0; x < 64; x += 5) g.fillRect(x, 0, 2, 64);
    }
  }
  const tileCache = {};
  function tiles(style) {
    if (tileCache[style]) return tileCache[style];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const m = document.createElement('canvas'); m.width = m.height = 128;
    const mg = m.getContext('2d');
    mg.fillStyle = '#000'; mg.fillRect(0, 0, 128, 128);
    const lit = [rnd() < 0.65, rnd() < 0.4, rnd() < 0.5, rnd() < 0.7];
    for (let i = 0; i < 4; i++) {
      const ox = (i % 2) * 64, oy = Math.floor(i / 2) * 64;
      g.save(); g.translate(ox, oy); drawCell(g, style); g.restore();
      const w = WIN[style];
      if (w && lit[i]) { mg.fillStyle = '#ffd98a'; mg.fillRect(ox + w[0], oy + w[1], w[2], w[3]); }
    }
    return (tileCache[style] = { c, m });
  }
  const facadeCache = {};
  function facade(style, w, h, tint) {
    const rx = Math.max(1, Math.round(w / 6.8)), ry = Math.max(1, Math.round(h / 6.8));
    const key = style + '|' + rx + '|' + ry + '|' + (tint || 0);
    if (facadeCache[key]) return facadeCache[key];
    const t = tiles(style);
    const map = new THREE.CanvasTexture(t.c), em = new THREE.CanvasTexture(t.m);
    [map, em].forEach(x => { x.wrapS = x.wrapT = THREE.RepeatWrapping; x.repeat.set(rx, ry); });
    const mat = new THREE.MeshLambertMaterial({ map, color: tint || 0xffffff, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: world.nf });
    world.facadeMats.push(mat);
    return (facadeCache[key] = mat);
  }
  world.facade = facade;
};
