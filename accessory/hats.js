// accessory/hats.js  -  hats and helmets.  Units are the dude model's own units:
// the head is about 0.2 wide, its top is at y = 0.152, its face points to +z, eyebrows are at y = 0.09.
// Round hats are "shells": the same boxy head-shaped shell the haircuts use (see accessory/hair.js), cut at a rim line,
// so they sit ON the head instead of floating or sinking into it. Rim numbers: (front, sides, back) = how high the rim is.
(function() {
  const T = THREE;
  const cyl = (rt, rb, h, c, y, g, z, segs) => ACC.mesh(new T.CylinderGeometry(rt, rb, h, segs || 16), c, 0, y, z || 0, g);
  const box = (w, h, d, c, x, y, z, g) => ACC.mesh(new T.BoxGeometry(w, h, d), c, x, y, z, g);
  // a head-shaped shell. o.band = only a thin ring of that height above the rim (hat bands / folds), o.ymax = flat top
  const shell = (g, c, r, front, side, back, o) => {
    o = o || {};
    const L = ACC.lineY(front, side, back);
    const keep = o.band ? (x, y, z) => { const yc = L(x, z); return y > yc && y < yc + o.band; } : (x, y, z) => y > L(x, z);
    const m = ACC.shellMesh(ACC.hairBlob({ c: [0, 0.02, 0.005], r, e: 0.5, keep, ymax: o.ymax, ws: 14, hs: 9 }), c);
    g.add(m); return m;
  };

  ACC.add('hat', 'none', { name: 'No hat' });

  ACC.add('hat', 'cap', { name: 'Cap', colors: [0xe53935, 0x1e88e5, 0x212121, 0x43a047, 0xffffff, 0xfdd835],
    build(c) {
      const g = new T.Group();
      shell(g, c, [0.129, 0.168, 0.122], 0.098, 0.03, 0.85);               // the crown: sits just above the eyebrows
      const visor = box(0.14, 0.012, 0.09, c, 0, 0.098, 0.16, g); visor.rotation.x = 0.2;
      cyl(0.009, 0.009, 0.012, c, 0.19, g, 0.005, 8);                       // the little button on top
      return g;
    } });

  ACC.add('hat', 'beanie', { name: 'Beanie', colors: [0xe53935, 0x37474f, 0x1e88e5, 0xfdd835, 0x8e24aa],
    build(c) {
      const g = new T.Group();
      shell(g, c, [0.131, 0.175, 0.125], 0.092, 0.05, 0.6);                // the knitted cap
      shell(g, c, [0.137, 0.18, 0.131], 0.092, 0.05, 0.6, { band: 0.034 }); // the folded edge
      ACC.mesh(new T.SphereGeometry(0.03, 8, 6), 0xffffff, 0, 0.205, 0.005, g);   // pom-pom
      return g;
    } });

  ACC.add('hat', 'cowboy', { name: 'Cowboy hat', colors: [0x8d6e63, 0x4e342e, 0xd7c49e, 0x212121],
    build(c) {
      const g = new T.Group();
      const brim = cyl(0.2, 0.2, 0.01, c, 0.094, g, 0.01, 20); brim.scale.z = 1.08;
      cyl(0.108, 0.126, 0.09, c, 0.138, g, 0.005, 16);                      // crown
      cyl(0.124, 0.128, 0.022, 0x3e2723, 0.106, g, 0.005, 16);              // band
      return g;
    } });

  ACC.add('hat', 'tophat', { name: 'Top hat', colors: [0x212121, 0x4a148c, 0xb71c1c],
    build(c) {
      const g = new T.Group();
      cyl(0.172, 0.172, 0.012, c, 0.1, g, 0.005, 20);                       // brim
      cyl(0.116, 0.12, 0.18, c, 0.196, g, 0.005, 16);                       // tall crown
      cyl(0.122, 0.122, 0.03, 0xc62828, 0.122, g, 0.005, 16);               // red band
      return g;
    } });

  ACC.add('hat', 'beret', { name: 'Beret', colors: [0xb71c1c, 0x212121, 0x2e7d32, 0x283593],
    build(c) {
      const g = new T.Group();
      const m = new T.Mesh(new T.SphereGeometry(0.135, 14, 8), ACC.mat(c));
      m.scale.set(1, 0.34, 1.05); m.position.set(0.02, 0.17, 0.005); m.rotation.z = -0.12; m.castShadow = true;
      g.add(m);
      cyl(0.108, 0.11, 0.02, c, 0.128, g, 0.005, 16);                       // headband
      cyl(0.011, 0.011, 0.03, c, 0.2, g, 0.015, 8);                         // stalk
      return g;
    } });

  ACC.add('hat', 'bucket', { name: 'Bucket hat', colors: [0xd7c49e, 0xffffff, 0x4a5d23, 0x1e88e5],
    build(c) {
      const g = new T.Group();
      shell(g, c, [0.129, 0.168, 0.122], 0.098, 0.03, 0.9);                // crown
      const brim = cyl(0.128, 0.19, 0.03, c, 0.094, g, 0.005, 18); brim.scale.z = 1.05;   // brim sloping down all round
      return g;
    } });
})();
