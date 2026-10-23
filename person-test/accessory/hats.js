// accessory/hats.js  -  hats and helmets.  Units are the dude model's own units:
// the head is about 0.2 wide, its top is at y = 0.155, its face points to +z.
(function() {
  const T = THREE, PI = Math.PI;
  const dome = (r, c, y, sy, sz) => {
    const m = new T.Mesh(new T.SphereGeometry(r, 12, 8, 0, PI * 2, 0, PI / 2), ACC.mat(c));
    m.position.set(0, y, 0.005); m.scale.set(1, sy || 1, sz || 1); m.castShadow = true;
    return m;
  };
  const cyl = (rt, rb, h, c, y, g, z) => ACC.mesh(new T.CylinderGeometry(rt, rb, h, 14), c, 0, y, z || 0, g);
  const box = (w, h, d, c, x, y, z, g) => ACC.mesh(new T.BoxGeometry(w, h, d), c, x, y, z, g);

  ACC.add('hat', 'none', { name: 'No hat' });

  ACC.add('hat', 'cap', { name: 'Cap', colors: [0xe53935, 0x1e88e5, 0x212121, 0x43a047, 0xffffff, 0xfdd835],
    build(c) {
      const g = new T.Group();
      g.add(dome(0.118, c, 0.045, 0.95, 1.05));
      const brim = box(0.15, 0.01, 0.1, c, 0, 0.055, 0.15, g); brim.rotation.x = 0.12;
      return g;
    } });

  ACC.add('hat', 'beanie', { name: 'Beanie', colors: [0xe53935, 0x37474f, 0x1e88e5, 0xfdd835, 0x8e24aa],
    build(c) {
      const g = new T.Group();
      g.add(dome(0.12, c, 0.04, 1.1, 1.04));
      cyl(0.124, 0.124, 0.035, c, 0.04, g);
      ACC.mesh(new T.SphereGeometry(0.03, 8, 6), 0xffffff, 0, 0.175, 0, g);
      return g;
    } });

  ACC.add('hat', 'cowboy', { name: 'Cowboy hat', colors: [0x8d6e63, 0x4e342e, 0xd7c49e, 0x212121],
    build(c) {
      const g = new T.Group();
      cyl(0.2, 0.2, 0.008, c, 0.085, g);
      cyl(0.085, 0.1, 0.1, c, 0.135, g);
      cyl(0.102, 0.102, 0.02, 0x3e2723, 0.103, g);
      return g;
    } });

  ACC.add('hat', 'tophat', { name: 'Top hat', colors: [0x212121, 0x4a148c, 0xb71c1c],
    build(c) {
      const g = new T.Group();
      cyl(0.15, 0.15, 0.012, c, 0.07, g);
      cyl(0.09, 0.09, 0.17, c, 0.155, g);
      cyl(0.092, 0.092, 0.03, 0xc62828, 0.09, g);
      return g;
    } });

  ACC.add('hat', 'beret', { name: 'Beret', colors: [0xb71c1c, 0x212121, 0x2e7d32, 0x283593],
    build(c) {
      const g = new T.Group();
      const m = new T.Mesh(new T.SphereGeometry(0.125, 12, 8), ACC.mat(c));
      m.scale.set(1, 0.35, 1); m.position.set(0.025, 0.145, 0); m.rotation.z = -0.15; m.castShadow = true;
      g.add(m);
      cyl(0.012, 0.012, 0.03, c, 0.185, g, 0.025);
      return g;
    } });

  ACC.add('hat', 'bucket', { name: 'Bucket hat', colors: [0xd7c49e, 0xffffff, 0x4a5d23, 0x1e88e5],
    build(c) {
      const g = new T.Group();
      cyl(0.17, 0.17, 0.01, c, 0.06, g);
      cyl(0.105, 0.116, 0.1, c, 0.11, g);
      return g;
    } });
})();
