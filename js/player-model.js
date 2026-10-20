// js/player-model.js  -  loads dude.glb, colours him, lowers his arms
const DUDE_FILE = 'dude.glb';   // must be next to index.html in your repo
const DUDE_HEIGHT = 1.9;        // how tall he is in the world
const DUDE_FACING = 0;          // if he walks backwards, change 0 to Math.PI

player.loadDude = function() {
  if (THREE.GLTFLoader) {
    new THREE.GLTFLoader().load(DUDE_FILE, gltf => {
      player.styleDude(gltf.scene);
      player.model.remove(player.fallback.group);
      player.dude = new THREE.Group();
      player.dude.rotation.y = DUDE_FACING;
      player.dude.add(gltf.scene);
      player.model.add(player.dude);
    }, undefined, err => console.warn('dude.glb not loaded - using the stand-in person', err));
  }

};

// The glb has no colours and is in a T-pose, so: colour it by body height and lower the arms.
player.styleDude = function(root) {
  let minY = 1e9, maxY = -1e9;
  root.traverse(o => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y; }
  });
  const H = maxY - minY || 1;
  const SHIRT = [0.25, 0.5, 0.84], PANTS = [0.23, 0.35, 0.6], SKIN = [0.88, 0.67, 0.5], HAIR = [0.35, 0.22, 0.12], SHOE = [0.1, 0.1, 0.12];
  const PX = 0.21, PY = -0.30, TH = 75 * Math.PI / 180, cs = Math.cos(TH), sn = Math.sin(TH);

  root.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry, p = g.attributes.position, n = p.count, col = new Float32Array(n * 3);
    const tiny = n < 20;   // the little face quad
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const h = (y - minY) / H, ax = Math.abs(x);
      let c;
      if (tiny) c = SHOE;
      else if (h < 0.06) c = SHOE;
      else if (h < 0.40) c = PANTS;
      else if (h < 0.80) c = ax > 0.5 ? SKIN : SHIRT;
      else c = (h > 0.94 || (h > 0.86 && z < -0.03)) ? HAIR : SKIN;
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      if (!tiny && ax > PX && y > -0.5 && y < -0.1) {          // lower the arm about the shoulder
        const vx = ax - PX, vy = y - PY;
        p.setXYZ(i, (x > 0 ? 1 : -1) * (PX + vx * cs + vy * sn), PY - vx * sn + vy * cs, z);
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    p.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
    o.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    o.castShadow = true;
    o.receiveShadow = true;
  });

  // scale to DUDE_HEIGHT and put his feet on the ground
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  const s = DUDE_HEIGHT / (size.y || 1);
  root.scale.setScalar(s);
  root.position.set(-ctr.x * s, -box.min.y * s, -ctr.z * s);
};
