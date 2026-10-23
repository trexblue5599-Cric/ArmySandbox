// accessory/hair.js  -  men's haircuts. Each style has its own colour list (look.hair = index into it).
// Units are the dude model's own units (same as hats.js): head is 0.206 wide, top is y = 0.152, face points to +z.
// build(colour, underHat): when a hat is worn the cut shrinks to just the bits that peek out below the hat.
// To add a style: copy one ACC.add('hairstyle', ...) block, change the pieces and the colours.
(function() {
  const T = THREE, HX = 0.103;
  const NAT = [0x111111, 0x2b1d12, 0x5a3820, 0xd4a64a, 0x8a3b1c, 0xb0b0b0];   // black, dark brown, brown, blond, ginger, grey

  // ---- tiny helpers: a "part" is a geometry + where it sits; all parts of a style get merged into ONE mesh (cheap for crowds)
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const taper = (w, h, d, tx, tz) => {                 // a box whose top is narrower: tx / tz = how much of the width / depth is left at the top
    const g = new T.BoxGeometry(w, h, d), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * tx); p.setZ(i, p.getZ(i) * tz); }
    p.needsUpdate = true; g.computeVertexNormals(); return g;
  };
  const P = (geo, x, y, z, rx, ry, rz) => ({ geo, x, y, z, rx: rx || 0, ry: ry || 0, rz: rz || 0 });
  const merge = parts => {
    const pos = [], nor = [], m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), one = new T.Vector3(1, 1, 1), v = new T.Vector3();
    parts.forEach(pt => {
      m.compose(v.set(pt.x, pt.y, pt.z), q.setFromEuler(e.set(pt.rx, pt.ry, pt.rz)), one);
      const g = pt.geo.clone().applyMatrix4(m).toNonIndexed();
      const a = g.attributes.position.array, b = g.attributes.normal.array;
      for (let i = 0; i < a.length; i++) { pos.push(a[i]); nor.push(b[i]); }
    });
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    return g;
  };
  const mats = {};
  const hmat = c => mats[c] || (mats[c] = new T.MeshLambertMaterial({ color: c, flatShading: true }));
  const cache = {};
  // define a style from a function (underHat) -> list of parts. The merged geometry is built once and shared.
  const style = (id, name, colors, fn) => ACC.add('hairstyle', id, { name, colors,
    build(c, underHat) {
      const key = id + (underHat ? '|hat' : '');
      const geo = cache[key] || (cache[key] = merge(fn(!!underHat)));
      const m = new T.Mesh(geo, hmat(c));
      const g = new T.Group(); g.add(m); return g;
    } });

  // ---- reusable pieces
  const sides = (yb, yt, th, zf) => [                  // the two sides of the head + the back, from height yb to yt (th = thickness)
    P(box(th, yt - yb, zf + 0.1), HX + th / 2 - 0.003, (yb + yt) / 2, (zf - 0.1) / 2),
    P(box(th, yt - yb, zf + 0.1), -HX - th / 2 + 0.003, (yb + yt) / 2, (zf - 0.1) / 2),
    P(box(2 * HX + 2 * th - 0.006, yt - yb, th), 0, (yb + yt) / 2, -0.092 - th / 2)
  ];
  const top = (yb, yt, tx, tz) => P(taper(0.222, yt - yb, 0.212, tx, tz), 0, (yb + yt) / 2, 0.002);   // the crown
  const peek = () => sides(0.0, 0.05, 0.009, 0.01);    // what shows under any hat

  ACC.add('hairstyle', 'none', { name: 'Bald' });

  style('buzz', 'Buzz cut', NAT.concat([0xffffff]), h => h ? peek() :
    sides(0.04, 0.118, 0.006, 0.02).concat([top(0.104, 0.158, 0.82, 0.86)]));

  style('short', 'Short crop', NAT, h => h ? peek() :
    sides(0.04, 0.118, 0.01, 0.025).concat([top(0.102, 0.172, 0.8, 0.84), P(box(0.2, 0.024, 0.018), 0, 0.106, 0.108)]));

  style('crew', 'Flat top', NAT.concat([0xffffff]), h => h ? peek() :
    sides(0.06, 0.118, 0.005, 0.015).concat([top(0.102, 0.19, 0.97, 0.97)]));

  style('fade', 'Fade + volume', NAT.concat([0xe0e0e0]), h => h ? peek() :
    sides(0.07, 0.118, 0.004, 0.015).concat([top(0.1, 0.188, 0.78, 0.8), P(box(0.17, 0.034, 0.05), 0, 0.185, 0.085, -0.15)]));

  style('quiff', 'Quiff', NAT.concat([0x26c6da]), h => h ? peek() :
    sides(0.05, 0.118, 0.008, 0.02).concat([top(0.102, 0.17, 0.8, 0.8), P(box(0.18, 0.05, 0.1), 0, 0.192, 0.07, -0.35)]));

  style('slick', 'Slick back', [0x111111, 0x2b1d12, 0x5a3820, 0x8a3b1c, 0xb0b0b0, 0xf5f5f5, 0xd4a64a], h => h ? peek().concat([P(box(0.2, 0.06, 0.012), 0, -0.01, -0.1)]) :
    sides(0.03, 0.118, 0.008, 0.0).concat([top(0.102, 0.165, 0.84, 0.88), P(box(0.21, 0.15, 0.014), 0, 0.04, -0.1)]));

  style('spiky', 'Spiky', [0xfdd835, 0x111111, 0x2b1d12, 0x26c6da, 0xe53935, 0xffffff, 0x8e24aa], h => {
    if (h) return peek();
    const spike = (x, z, hgt, rx, rz) => P(new T.ConeGeometry(0.03, hgt, 4), x, 0.152 + hgt / 2 - 0.01, z, rx, 0.78, rz);
    return sides(0.05, 0.118, 0.008, 0.02).concat([top(0.104, 0.158, 0.8, 0.82),
      spike(0, 0, 0.09), spike(0.06, 0, 0.07, 0, -0.4), spike(-0.06, 0, 0.07, 0, 0.4),
      spike(0, 0.06, 0.07, 0.4, 0), spike(0, -0.06, 0.07, -0.4, 0),
      spike(0.055, 0.055, 0.055, 0.3, -0.3), spike(-0.055, 0.055, 0.055, 0.3, 0.3),
      spike(0.055, -0.055, 0.055, -0.3, -0.3), spike(-0.055, -0.055, 0.055, -0.3, 0.3)]);
  });

  style('mohawk', 'Mohawk', [0xe53935, 0x1e88e5, 0x43a047, 0xff7043, 0x8e24aa, 0x111111, 0xfdd835], h => {
    if (h) return [];
    const hs = [0.06, 0.085, 0.1, 0.105, 0.098, 0.085, 0.06], parts = [];
    hs.forEach((hh, i) => parts.push(P(box(0.036, hh, 0.034), 0, 0.13 + hh / 2, 0.085 - i * 0.03)));
    return parts;
  });

  style('afro', 'Afro', [0x111111, 0x2b1d12, 0x5a3820, 0x8a3b1c, 0xb0b0b0, 0xffffff], h => h ?
    [P(new T.IcosahedronGeometry(0.055, 0), 0.098, 0.03, -0.04), P(new T.IcosahedronGeometry(0.055, 0), -0.098, 0.03, -0.04), P(new T.IcosahedronGeometry(0.075, 0), 0, 0.03, -0.1)] :
    [P(new T.IcosahedronGeometry(0.14, 1), 0, 0.12, -0.035)]);

  style('curly', 'Curly top', [0x111111, 0x2b1d12, 0x5a3820, 0xd4a64a, 0x8a3b1c, 0x6d4c41], h => {
    if (h) return peek();
    const curl = (x, y, z, r) => P(new T.IcosahedronGeometry(r, 0), x, y, z), parts = sides(0.05, 0.118, 0.008, 0.02);
    parts.push(top(0.104, 0.152, 0.84, 0.88));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; parts.push(curl(Math.cos(a) * 0.085, 0.15, Math.sin(a) * 0.085 - 0.005, 0.036)); }
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; parts.push(curl(Math.cos(a) * 0.04, 0.172, Math.sin(a) * 0.04, 0.036)); }
    parts.push(curl(0, 0.19, 0, 0.034));
    return parts;
  });
})();
