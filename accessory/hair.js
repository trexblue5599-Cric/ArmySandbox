// accessory/hair.js  -  men's haircuts (short to medium, nothing long). Pick one in the wardrobe: "Hairstyle" + "Hair colour".
// Units are the dude model's own units (same as the hats): head top y = 0.152, face points to +z, head is ~0.2 wide.
// To add a haircut: copy one ACC.add('hairstyle', ...) block below and change the numbers.
(function() {
  const T = THREE;
  // colour options for EVERY style (natural shades first, then a few fun ones)
  ACC.HAIR_COLORS = [0x111111, 0x2b1d12, 0x5a3820, 0x8a5a2b, 0xd4a64a, 0x8a3b1c, 0xb0b0b0, 0xf2f2f2, 0x1e88e5, 0xe53935];

  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // a lumpy low-poly ellipsoid shell around the head, keeping only the part above a "hairline".
  //   c = centre, r = radii, ws/hs = segments, keep(x,y,z) = true where hair grows, ymax = flat top (optional)
  function blob(o) {
    const ws = o.ws || 12, hs = o.hs || 8, c = o.c, r = o.r, out = [];
    const e = o.e || 1;                                    // e < 1 = a boxier, squarer ellipsoid (the head is boxy)
    const sp = v => Math.sign(v) * Math.pow(Math.abs(v), e);
    const P = (iy, ix) => {
      const th = iy / hs * Math.PI, ph = ix / ws * Math.PI * 2, st = sp(Math.sin(th));
      let x = c[0] + r[0] * sp(Math.cos(ph)) * st, y = c[1] + r[1] * sp(Math.cos(th)), z = c[2] + r[2] * sp(Math.sin(ph)) * st;
      if (o.ymax !== undefined && y > o.ymax) y = o.ymax;
      return [x, y, z];
    };
    const tri = (a, b, d) => {
      const m = [(a[0] + b[0] + d[0]) / 3, (a[1] + b[1] + d[1]) / 3, (a[2] + b[2] + d[2]) / 3];
      if (!o.keep(m[0], m[1], m[2])) return;
      const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const len = Math.hypot(n[0], n[1], n[2]); if (len < 1e-9) return;     // skip flat/degenerate bits at the poles
      const away = n[0] * (m[0] - c[0]) + n[1] * (m[1] - c[1]) + n[2] * (m[2] - c[2]);
      if (away >= 0) out.push(a, b, d); else out.push(a, d, b);              // normals point outwards
    };
    for (let iy = 0; iy < hs; iy++) for (let ix = 0; ix < ws; ix++) {
      const a = P(iy, ix), b = P(iy + 1, ix), d = P(iy + 1, ix + 1), e = P(iy, ix + 1);
      tri(a, b, e); tri(b, d, e);
    }
    return out;
  }
  ACC.hairBlob = blob;
  function meshOf(tris, color) {
    const arr = new Float32Array(tris.length * 3);
    tris.forEach((p, i) => { arr[i * 3] = p[0]; arr[i * 3 + 1] = p[1]; arr[i * 3 + 2] = p[2]; });
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(arr, 3));
    g.computeVertexNormals();                              // not indexed -> flat faces = the low-poly look
    const m = new T.Mesh(g, ACC.mat(color, true));         // two-sided: no see-through gaps
    m.castShadow = true;
    return m;
  }
  const box = (w, h, d, c, x, y, z, g, rx, ry, rz) => {
    const m = ACC.mesh(new T.BoxGeometry(w, h, d), c, x, y, z, g);
    m.rotation.set(rx || 0, ry || 0, rz || 0); return m;
  };

  // where hair grows: above a hairline that is high at the front, drops at the sideburns and at the back of the neck
  const hairline = (front, side, back) => (x, y, z) => {
    let yc = front - smooth(0.055, 0.095, Math.abs(x)) * side;
    if (z < -0.02) yc -= (-0.02 - z) * back;
    return y > Math.max(yc, -0.06);
  };
  const cap = (g, color, r, front, side, back, ymax) =>
    g.add(meshOf(blob({ c: [0, 0.02, 0.005], r, e: 0.5, keep: hairline(front, side, back), ymax }), color));

  ACC.add('hairstyle', 'none', { name: 'Bald' });

  // 1. Buzz cut - a thin skin-tight layer
  ACC.add('hairstyle', 'buzz', { name: 'Buzz cut', colors: ACC.HAIR_COLORS, hatSafe: true,
    build(c) { const g = new T.Group(); cap(g, c, [0.118, 0.152, 0.111], 0.100, 0.07, 2.4); return g; } });

  // 2. Short crop - a bit of volume on top
  ACC.add('hairstyle', 'short', { name: 'Short crop', colors: ACC.HAIR_COLORS, hatSafe: true,
    build(c) { const g = new T.Group(); cap(g, c, [0.125, 0.168, 0.122], 0.100, 0.065, 2.3); return g; } });

  // 3. Flat top - tall, squared off
  ACC.add('hairstyle', 'flattop', { name: 'Flat top', colors: ACC.HAIR_COLORS,
    build(c) { const g = new T.Group(); cap(g, c, [0.125, 0.205, 0.122], 0.100, 0.06, 2.2, 0.185); return g; } });

  // 4. Side part - short with a swept fringe
  ACC.add('hairstyle', 'sidepart', { name: 'Side part', colors: ACC.HAIR_COLORS,
    build(c) {
      const g = new T.Group();
      cap(g, c, [0.124, 0.166, 0.121], 0.100, 0.065, 2.3);
      box(0.11, 0.03, 0.12, c, -0.03, 0.172, 0.03, g, 0, 0, 0.12);          // the swept side
      box(0.13, 0.034, 0.05, c, -0.015, 0.112, 0.118, g, 0.25, 0, 0.1);     // fringe over the forehead
      return g;
    } });

  // 5. Quiff - swept up and forwards
  ACC.add('hairstyle', 'quiff', { name: 'Quiff', colors: ACC.HAIR_COLORS,
    build(c) {
      const g = new T.Group();
      cap(g, c, [0.124, 0.166, 0.121], 0.100, 0.06, 2.3);
      box(0.15, 0.05, 0.10, c, 0, 0.175, 0.02, g, -0.1);
      box(0.15, 0.06, 0.10, c, 0, 0.19, 0.085, g, -0.3);
      return g;
    } });

  // 6. Spiky
  ACC.add('hairstyle', 'spiky', { name: 'Spiky', colors: ACC.HAIR_COLORS,
    build(c) {
      const g = new T.Group();
      cap(g, c, [0.120, 0.155, 0.113], 0.100, 0.065, 2.4);
      [[0, 0.158, 0.06, -0.2, 0], [0.055, 0.15, 0.03, -0.1, -0.5], [-0.055, 0.15, 0.03, -0.1, 0.5], [0.03, 0.16, -0.025, 0.1, -0.2],
       [-0.03, 0.16, -0.025, 0.1, 0.2], [0, 0.145, -0.07, 0.4, 0], [0.075, 0.12, -0.02, 0, -0.9], [-0.075, 0.12, -0.02, 0, 0.9]]
        .forEach(s => { const m = ACC.mesh(new T.ConeGeometry(0.026, 0.085, 5), c, s[0], s[1] + 0.03, s[2], g); m.rotation.set(s[3], 0, s[4]); });
      return g;
    } });

  // 7. Mohawk - a tall strip, bare sides
  ACC.add('hairstyle', 'mohawk', { name: 'Mohawk', colors: ACC.HAIR_COLORS,
    build(c) {
      const g = new T.Group();
      [[0.085, 0.05], [0.05, 0.085], [0.015, 0.1], [-0.02, 0.1], [-0.055, 0.08], [-0.088, 0.05]]
        .forEach(s => box(0.036, s[1], 0.04, c, 0, 0.14 + s[1] / 2, s[0], g));
      return g;
    } });

  // 8. Short afro - round and fluffy
  ACC.add('hairstyle', 'afro', { name: 'Afro', colors: ACC.HAIR_COLORS,
    build(c) {
      const g = new T.Group();
      g.add(meshOf(blob({ c: [0, 0.072, -0.004], r: [0.152, 0.158, 0.152], ws: 11, hs: 8, keep: hairline(0.100, 0.05, 0.9) }), c));
      return g;
    } });

  // when a hat is worn the registry passes underHat=true: every cut becomes the same short cut trimmed flat,
  // so tall hair (afro, quiff, spikes...) never pokes through the hat
  ACC.ids('hairstyle').filter(id => id !== 'none').forEach(id => {
    const d = ACC.get('hairstyle', id), full = d.build;
    d.build = (c, underHat) => {
      if (!underHat) return full(c);
      const g = new T.Group(); cap(g, c, [0.118, 0.152, 0.111], 0.100, 0.07, 2.4, 0.115); return g;
    };
  });
})();
