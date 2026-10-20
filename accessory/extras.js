// accessory/extras.js  -  glasses, backpacks / capes and vests.
// Torso is about 0.34 wide, 0.27 deep, back surface at z = -0.14, chest surface at z = +0.12.
(function() {
  const T = THREE, PI = Math.PI;
  const box = (w, h, d, c, x, y, z, g) => ACC.mesh(new T.BoxGeometry(w, h, d), c, x, y, z, g);

  // ---------- GLASSES ----------
  ACC.add('glasses', 'none', { name: 'No glasses' });

  ACC.add('glasses', 'sunglasses', { name: 'Sunglasses',
    build() {
      const g = new T.Group();
      box(0.075, 0.04, 0.012, 0x111111, 0.05, 0.04, 0.113, g);
      box(0.075, 0.04, 0.012, 0x111111, -0.05, 0.04, 0.113, g);
      box(0.03, 0.01, 0.012, 0x111111, 0, 0.048, 0.113, g);
      box(0.008, 0.01, 0.2, 0x111111, 0.1, 0.045, 0.015, g);
      box(0.008, 0.01, 0.2, 0x111111, -0.1, 0.045, 0.015, g);
      return g;
    } });

  ACC.add('glasses', 'round', { name: 'Round glasses', colors: [0xc9a227, 0x212121, 0xe53935],
    build(c) {
      const g = new T.Group();
      [-1, 1].forEach(s => { const r = new T.Mesh(new T.TorusGeometry(0.028, 0.005, 6, 12), ACC.mat(c)); r.position.set(s * 0.048, 0.04, 0.113); g.add(r); });
      box(0.03, 0.006, 0.006, c, 0, 0.045, 0.113, g);
      box(0.006, 0.006, 0.2, c, 0.1, 0.045, 0.015, g);
      box(0.006, 0.006, 0.2, c, -0.1, 0.045, 0.015, g);
      return g;
    } });

  ACC.add('glasses', 'goggles', { name: 'Goggles', colors: [0xffb300, 0x29b6f6, 0xef5350],
    build(c) {
      const g = new T.Group();
      [-1, 1].forEach(s => { const l = new T.Mesh(new T.CylinderGeometry(0.036, 0.036, 0.02, 10), ACC.mat(c)); l.rotation.x = PI / 2; l.position.set(s * 0.05, 0.04, 0.113); g.add(l); });
      const strap = new T.Mesh(new T.CylinderGeometry(0.108, 0.108, 0.03, 14, 1, true), ACC.mat(0x222222, true));
      strap.position.set(0, 0.04, 0.002); g.add(strap);
      return g;
    } });

  // ---------- BACK ----------
  ACC.add('back', 'none', { name: 'Nothing' });

  ACC.add('back', 'backpack', { name: 'Backpack', colors: [0xe53935, 0x1e88e5, 0x212121, 0x43a047, 0xff7043],
    build(c) {
      const g = new T.Group();
      box(0.22, 0.28, 0.1, c, 0, -0.4, -0.2, g);
      box(0.16, 0.1, 0.04, 0x222222, 0, -0.5, -0.26, g);
      box(0.03, 0.26, 0.012, 0x222222, 0.07, -0.34, 0.134, g);
      box(0.03, 0.26, 0.012, 0x222222, -0.07, -0.34, 0.134, g);
      return g;
    } });

  ACC.add('back', 'ruck', { name: 'Army rucksack', colors: [0x4a5d23, 0x8a7a54, 0x2b2b2b],
    build(c) {
      const g = new T.Group();
      box(0.27, 0.38, 0.15, c, 0, -0.42, -0.22, g);
      box(0.25, 0.06, 0.16, c, 0, -0.2, -0.22, g);
      const roll = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.28, 10), ACC.mat(0x3b3b3b));
      roll.rotation.z = PI / 2; roll.position.set(0, -0.66, -0.24); roll.castShadow = true; g.add(roll);
      return g;
    } });

  ACC.add('back', 'cape', { name: 'Cape', colors: [0xc62828, 0x1565c0, 0x6a1b9a, 0x212121],
    build(c) {
      const g = new T.Group();
      box(0.36, 0.62, 0.014, c, 0, -0.48, -0.17, g);
      box(0.2, 0.04, 0.17, c, 0, -0.17, -0.04, g);
      return g;
    } });

  // ---------- VEST ----------
  ACC.add('vest', 'none', { name: 'No vest' });

  ACC.add('vest', 'tactical', { name: 'Tactical vest', colors: [0x3b4430, 0x2b2b2b, 0x6b5b3a],
    build(c) {
      const g = new T.Group();
      box(0.35, 0.3, 0.3, c, 0, -0.36, -0.02, g);
      [-0.09, 0, 0.09].forEach(x => box(0.07, 0.075, 0.04, 0x1f2418, x, -0.43, 0.145, g));
      return g;
    } });

  ACC.add('vest', 'hivis', { name: 'Hi-vis vest', colors: [0xff6f00, 0xc6ff00],
    build(c) {
      const g = new T.Group();
      box(0.35, 0.3, 0.3, c, 0, -0.36, -0.02, g);
      box(0.352, 0.03, 0.302, 0xe0e0e0, 0, -0.32, -0.02, g);
      box(0.352, 0.03, 0.302, 0xe0e0e0, 0, -0.44, -0.02, g);
      return g;
    } });
})();
