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

})();
