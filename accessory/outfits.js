// accessory/outfits.js  -  clothes. Each outfit has colour lists the player (or the random generator) picks from.
//   shirts / pants : colour lists          shoes : shoe colour
//   long           : true = long sleeves    shortsY : legs are bare skin below this height (shorts / dress)
//   pantsFollow    : pants colour = shirt colour (dress)     build(shirt, pants) : optional extra pieces (skirt, tie, hood...)
(function() {
  const T = THREE;
  const box = (w, h, d, c, x, y, z, g) => ACC.mesh(new T.BoxGeometry(w, h, d), c, x, y, z, g);

  ACC.add('outfit', 'casual', { name: 'Casual', long: false, shoes: 0xf2f2f2,
    shirts: [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xffffff, 0x8e24aa, 0xff7043, 0x26c6da],
    pants: [0x37474f, 0x3b5b92, 0x5d4037, 0x212121, 0x2e9e4a] });

  ACC.add('outfit', 'army', { name: 'Army fatigues', long: true, shoes: 0x1a1a1a,
    shirts: [0x4b5320, 0x6b6f3f, 0x3d4a2c, 0x8a7a54],
    pants: [0x3c3f2a, 0x55583a, 0x2f3a22] });

  ACC.add('outfit', 'hoodie', { name: 'Hoodie', long: true, shoes: 0xf2f2f2,
    shirts: [0xc62828, 0x1565c0, 0x37474f, 0x6a1b9a, 0x2e7d32],
    pants: [0x263238, 0x3b5b92, 0x424242],
    build(shirt) {
      const g = new T.Group();
      box(0.26, 0.12, 0.1, shirt, 0, -0.14, -0.13, g);
      return g;
    } });

  ACC.add('outfit', 'suit', { name: 'Business suit', long: true, shoes: 0x111111,
    shirts: [0x1c2a44, 0x222222, 0x4a3b32, 0x5b5b5b],
    pants: [0x1c2a44, 0x222222, 0x4a3b32, 0x5b5b5b],
    build() {
      const g = new T.Group();
      box(0.035, 0.2, 0.012, 0xc62828, 0, -0.3, 0.137, g);      // tie
      box(0.1, 0.03, 0.012, 0xffffff, 0, -0.17, 0.133, g);       // collar
      return g;
    } });

  ACC.add('outfit', 'doctor', { name: 'Doctor', long: true, shoes: 0xffffff,
    shirts: [0xffffff, 0xe3f2fd, 0xe8f5e9],
    pants: [0x26a69a, 0x1e88e5, 0xffffff] });

  ACC.add('outfit', 'worker', { name: 'Work clothes', long: true, shoes: 0x5d4037,
    shirts: [0xef6c00, 0xf9a825, 0x607d8b, 0x8d6e63],
    pants: [0x3b5b92, 0x37474f, 0x5d4037] });

  ACC.add('outfit', 'sporty', { name: 'Sports kit', long: false, shoes: 0xffffff, shortsY: -1.12,
    shirts: [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xff7043],
    pants: [0x212121, 0x1565c0, 0xe53935, 0xffffff] });

  ACC.add('outfit', 'dress', { name: 'Summer dress', long: false, shoes: 0xf2f2f2, shortsY: -0.84, pantsFollow: true,
    shirts: [0xf48fb1, 0xce93d8, 0x80deea, 0xfff59d, 0xef5350, 0xa5d6a7],
    pants: [0xffffff],
    build(shirt) {
      const g = new T.Group();
      const skirt = new T.Mesh(new T.CylinderGeometry(0.19, 0.28, 0.36, 14, 1, true), ACC.mat(shirt, true));
      skirt.position.set(0, -0.9, 0); skirt.castShadow = true;
      g.add(skirt);
      return g;
    } });
})();
