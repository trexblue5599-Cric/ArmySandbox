// js/world-grass.js  -  puts a grass texture (bright lime, with blades) on every grass ground:
// the big ground, the farm and park patches, and the lawn around the house.
// The texture is drawn in the game itself, so there are no extra image files to download.
// The COLOUR of each patch is kept (fields stay different greens); the lime grass is the ground.
const GRASS = {
  TILE: 4,            // one texture picture covers this many metres
  GROUND: 0x7ed63c   // the main ground colour (matches the reference grass)
};

world.initGrass = function() {
  // one greyscale picture of grass; the colour of each ground is multiplied onto it
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) {                       // soft speckles
    const v = 190 + Math.random() * 65 | 0;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  g.lineCap = 'round';
  for (let i = 0; i < 520; i++) {                        // blades: short dark and light strokes
    const v = 120 + Math.random() * 70 | 0, x = Math.random() * 128, y = Math.random() * 128;
    g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 0.8 + Math.random();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 3, y - 2 - Math.random() * 3); g.stroke();
  }
  const base = new THREE.CanvasTexture(cv);
  base.wrapS = base.wrapT = THREE.RepeatWrapping;
  base.anisotropy = 4;

  // the colours that mean "grass" on the map (the ground, farm and park patches, lawns)
  const GREENS = [0x6fae4f, 0x7fb35a, 0x7cb342, 0x558b2f, 0x8bb653, 0x6e9b43, 0x456b3c, 0x6f8d4b, 0x7fae5c, 0x7ed63c];
  const seen = new Map();   // one material per colour + size, so the scene keeps few materials

  world.scene.traverse(obj => {
    if (!obj.isMesh || !obj.material || obj.material.isMeshBasicMaterial) return;
    const hex = obj.material.color ? obj.material.color.getHex() : -1;
    if (GREENS.indexOf(hex) < 0) return;
    const geo = obj.geometry, p = geo.parameters || {};
    const w = p.width || 1, d = p.depth || p.height || 1;      // the ground's size in metres
    const isGround = obj.geometry.type === 'PlaneGeometry' || (w > 30 && d > 30);
    const tint = (hex === 0x6fae4f) ? GRASS.GROUND : hex;      // the big ground and lawns go lime
    const key = tint + ':' + Math.round(w) + ':' + Math.round(d);
    let mat = seen.get(key);
    if (!mat) {
      const t = base.clone();
      t.needsUpdate = true;
      t.repeat.set(Math.max(1, w / GRASS.TILE), Math.max(1, d / GRASS.TILE));
      mat = new THREE.MeshLambertMaterial({ map: t, color: tint });
      seen.set(key, mat);
    }
    obj.material = mat;
    if (isGround) obj.receiveShadow = true;
  });
};
