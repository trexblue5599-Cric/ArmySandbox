// js/interior-furniture.js  -  a tiny "furniture factory".
// Every piece of furniture is built from boxes / cylinders / spheres and MERGED into 3 big meshes
// (solid, glow, glass) so a whole house costs only a few draw calls.
//
// Coordinates inside a piece:  x = right/left, y = up, z = FRONT of the piece (it faces +z).
// IB.at(u, v, facing, fn) puts a piece in the house at plan position (u, v) turned to face a direction.
//   plan: u = to your right when you walk in the front door, v = deeper into the house.
const IB = { buckets: null, cur: { x: 0, z: 0, ry: 0, y: 0 }, obstacles: [] };

// which way a piece faces (plan directions)
const FACE = { v: 0, '-v': Math.PI, u: -Math.PI / 2, '-u': Math.PI / 2 };

IB.reset = function() {
  const mk = () => ({ pos: [], nor: [], col: [] });
  IB.buckets = { solid: mk(), glow: mk(), glass: mk() };
  IB.cur = { x: 0, z: 0, ry: 0, y: 0 };
  IB.obstacles = [];
};

// run fn() with everything placed relative to plan spot (u,v), turned to `facing` (a FACE value)
IB.at = function(u, v, facing, fn, y) {
  const save = IB.cur;
  IB.cur = { x: -u, z: v, ry: facing || 0, y: y || 0 };
  fn();
  IB.cur = save;
};

// a rectangle you can't walk through. Plan coordinates: w along u, d along v
IB.block = (u, v, w, d, h) => IB.obstacles.push({ u, v, w, d, h: h || 1 });

const _c = [0, 0, 0];
function hexRGB(c) { _c[0] = ((c >> 16) & 255) / 255; _c[1] = ((c >> 8) & 255) / 255; _c[2] = (c & 255) / 255; return _c; }

IB.tri = function(b, p0, p1, p2, color) {
  const o = IB.cur, cs = Math.cos(o.ry), sn = Math.sin(o.ry);
  const P = [p0, p1, p2].map(p => [p[0] * cs + p[2] * sn + o.x, p[1] + (o.y || 0), -p[0] * sn + p[2] * cs + o.z]);
  const ux = P[1][0] - P[0][0], uy = P[1][1] - P[0][1], uz = P[1][2] - P[0][2];
  const wx = P[2][0] - P[0][0], wy = P[2][1] - P[0][1], wz = P[2][2] - P[0][2];
  let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
  const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
  const rgb = hexRGB(color);
  for (let i = 0; i < 3; i++) {
    b.pos.push(P[i][0], P[i][1], P[i][2]);
    b.nor.push(nx, ny, nz);
    b.col.push(rgb[0], rgb[1], rgb[2]);
  }
};

const FACES = [[0, 1, 1, 2], [0, -1, 2, 1], [1, 1, 2, 0], [1, -1, 0, 2], [2, 1, 0, 1], [2, -1, 1, 0]];   // +x -x +y -y +z -z
// box w x h x d centred at (x,y,z). color = one colour, or an array of 6 (one per face: +x,-x,+y,-y,+z,-z)
IB.box = function(w, h, d, color, x, y, z, bucket) {
  const b = IB.buckets[bucket || 'solid'], hs = [w / 2, h / 2, d / 2], many = Array.isArray(color);
  FACES.forEach((f, i) => {
    const corner = (s1, s2) => {
      const p = [x, y, z];
      p[f[0]] += f[1] * hs[f[0]]; p[f[2]] += s1 * hs[f[2]]; p[f[3]] += s2 * hs[f[3]];
      return p;
    };
    const A = corner(-1, -1), B = corner(1, -1), C = corner(1, 1), D = corner(-1, 1), col = many ? color[i] : color;
    IB.tri(b, A, B, C, col); IB.tri(b, A, C, D, col);
  });
};

// a flat panel facing DOWN (only visible from below - used for ceiling lights)
IB.ceil = function(w, d, color, x, y, z, bucket) {
  const b = IB.buckets[bucket || 'glow'];
  const A = [x - w / 2, y, z - d / 2], B = [x + w / 2, y, z - d / 2], C = [x + w / 2, y, z + d / 2], D = [x - w / 2, y, z + d / 2];
  IB.tri(b, A, B, C, color); IB.tri(b, A, C, D, color);
};

// cylinder / cone (rt = top radius, rb = bottom radius). axis: 'y' (default), 'x' or 'z'
IB.cyl = function(rt, rb, h, color, x, y, z, sides, bucket, axis) {
  const b = IB.buckets[bucket || 'solid'], n = sides || 8;
  const tf = axis === 'x' ? (p) => [p[1], -p[0], p[2]] : axis === 'z' ? (p) => [p[0], -p[2], p[1]] : (p) => p;
  const pt = (r, yy, a) => { const q = tf([r * Math.cos(a), yy, r * Math.sin(a)]); return [q[0] + x, q[1] + y, q[2] + z]; };
  const ct = (yy) => { const q = tf([0, yy, 0]); return [q[0] + x, q[1] + y, q[2] + z]; };
  for (let i = 0; i < n; i++) {
    const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
    const b0 = pt(rb, -h / 2, a0), b1 = pt(rb, -h / 2, a1), t0 = pt(rt, h / 2, a0), t1 = pt(rt, h / 2, a1);
    IB.tri(b, b1, b0, t0, color); IB.tri(b, b1, t0, t1, color);
    if (rt > 0) IB.tri(b, ct(h / 2), t1, t0, color);
    if (rb > 0) IB.tri(b, ct(-h / 2), b0, b1, color);
  }
};

IB.sph = function(r, color, x, y, z, lon, lat, bucket) {
  const b = IB.buckets[bucket || 'solid'], LO = lon || 8, LA = lat || 5;
  const pt = (i, j) => { const th = Math.PI * i / LA, ph = Math.PI * 2 * j / LO; return [x + r * Math.sin(th) * Math.cos(ph), y + r * Math.cos(th), z + r * Math.sin(th) * Math.sin(ph)]; };
  for (let i = 0; i < LA; i++) for (let j = 0; j < LO; j++) {
    const a = pt(i, j), bb = pt(i, j + 1), c = pt(i + 1, j + 1), d = pt(i + 1, j);
    if (i > 0) IB.tri(b, a, c, d, color);
    if (i < LA - 1) IB.tri(b, a, bb, c, color);
  }
};

// glue everything collected in a bucket into one THREE geometry
IB.geometry = function(name) {
  const b = IB.buckets[name];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
  g.computeBoundingSphere();
  return g;
};

// ------------------------------------------------------------------------------------------------ colours
const WOOD = 0x9c6b3f, DWOOD = 0x6b4426, LWOOD = 0xc9a26b, WHITE = 0xf4f4ef, STEEL = 0xb9bec4, DARK = 0x23262b, CREAM = 0xf1e4c8;
function shade(c, amt) {
  const r = Math.max(0, Math.min(255, ((c >> 16) & 255) + amt)), g = Math.max(0, Math.min(255, ((c >> 8) & 255) + amt)), bb = Math.max(0, Math.min(255, (c & 255) + amt));
  return (r << 16) | (g << 8) | bb;
}
const BOOKS = [0xc0392b, 0x2980b9, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xe67e22, 0xecf0f1, 0x16a085];

// ------------------------------------------------------------------------------------------------ furniture
const FUR = {};
const bx = (w, h, d, c, x, y, z, bk) => IB.box(w, h, d, c, x, y, z, bk);

FUR.bed = function(w, l, sheet, frame) {            // head at the back (-z)
  bx(w + 0.1, 0.3, l + 0.1, frame, 0, 0.15, 0);
  bx(w, 0.22, l, WHITE, 0, 0.41, 0);
  bx(w + 0.04, 0.12, l * 0.62, sheet, 0, 0.55, l * 0.18);
  bx(w + 0.1, 1.05, 0.12, frame, 0, 0.55, -l / 2 - 0.02);
  bx(w * 0.4, 0.14, 0.4, 0xffffff, -w * 0.24, 0.58, -l / 2 + 0.4);
  bx(w * 0.4, 0.14, 0.4, 0xffffff, w * 0.24, 0.58, -l / 2 + 0.4);
};
FUR.sofa = function(len, c) {
  const dk = shade(c, -28), lt = shade(c, 18);
  bx(len, 0.42, 0.95, c, 0, 0.27, 0);
  bx(len, 0.6, 0.26, c, 0, 0.78, -0.35);
  bx(0.26, 0.55, 0.95, dk, -len / 2 + 0.13, 0.5, 0);
  bx(0.26, 0.55, 0.95, dk, len / 2 - 0.13, 0.5, 0);
  const n = Math.max(1, Math.round(len / 0.8));
  for (let i = 0; i < n; i++) bx((len - 0.5) / n - 0.04, 0.2, 0.62, lt, -(len - 0.5) / 2 + (i + 0.5) * (len - 0.5) / n, 0.58, 0.12);
  bx(0.4, 0.4, 0.14, 0xe5b84b, len / 2 - 0.55, 0.85, -0.12);   // cushion
};
FUR.armchair = function(c) {
  bx(0.9, 0.4, 0.9, c, 0, 0.26, 0);
  bx(0.9, 0.55, 0.22, c, 0, 0.72, -0.34);
  bx(0.2, 0.5, 0.9, shade(c, -25), -0.45, 0.5, 0); bx(0.2, 0.5, 0.9, shade(c, -25), 0.45, 0.5, 0);
  bx(0.55, 0.16, 0.6, shade(c, 18), 0, 0.5, 0.1);
};
FUR.table = function(w, d, h, top, leg) {
  bx(w, 0.06, d, top, 0, h, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(s => bx(0.07, h, 0.07, leg, s[0] * (w / 2 - 0.08), h / 2, s[1] * (d / 2 - 0.08)));
};
FUR.chair = function(c) {
  bx(0.44, 0.05, 0.44, c, 0, 0.45, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(s => bx(0.04, 0.45, 0.04, DWOOD, s[0] * 0.19, 0.225, s[1] * 0.19));
  bx(0.44, 0.5, 0.05, c, 0, 0.73, -0.2);
};
FUR.stool = function(c) { IB.cyl(0.2, 0.2, 0.07, c, 0, 0.68, 0, 8); IB.cyl(0.04, 0.04, 0.66, STEEL, 0, 0.33, 0, 6); IB.cyl(0.18, 0.18, 0.04, STEEL, 0, 0.02, 0, 8); };
FUR.coffeeTable = function(w, d) { FUR.table(w, d, 0.4, LWOOD, DWOOD); bx(w - 0.2, 0.04, d - 0.2, WOOD, 0, 0.14, 0); bx(0.3, 0.04, 0.2, 0xc0392b, 0.1, 0.45, 0); };
FUR.tvUnit = function(len) {
  bx(len, 0.5, 0.45, DWOOD, 0, 0.25, 0);
  bx(len - 0.1, 0.03, 0.4, WOOD, 0, 0.5, 0);
  bx(1.5, 0.84, 0.06, 0x111111, 0, 1.0, -0.08);
  bx(1.4, 0.74, 0.02, 0x20344f, 0, 1.0, -0.045, 'glow');
  bx(0.3, 0.08, 0.2, DARK, 0, 0.58, -0.08);
  bx(0.4, 0.2, 0.2, 0x333333, len / 2 - 0.3, 0.6, 0.05);   // speaker
};
FUR.bookshelf = function(w, h) {
  bx(w, h, 0.03, DWOOD, 0, h / 2, -0.16);
  bx(0.04, h, 0.35, DWOOD, -w / 2 + 0.02, h / 2, 0); bx(0.04, h, 0.35, DWOOD, w / 2 - 0.02, h / 2, 0);
  const rows = Math.max(3, Math.round(h / 0.4));
  for (let r = 0; r <= rows; r++) {
    const y = 0.03 + r * (h - 0.06) / rows;
    bx(w, 0.04, 0.35, WOOD, 0, y, 0);
    if (r < rows) {
      let x = -w / 2 + 0.1; let k = r * 3;
      while (x < w / 2 - 0.15) { const bw = 0.05 + (k % 3) * 0.02, bh = 0.22 + (k % 4) * 0.04; bx(bw, bh, 0.22, BOOKS[k % BOOKS.length], x + bw / 2, y + 0.02 + bh / 2, 0); x += bw + 0.012; k++; }
    }
  }
};
FUR.wardrobe = function(w) {
  bx(w, 2.25, 0.6, 0xd8c3a5, 0, 1.125, 0);
  const n = Math.max(2, Math.round(w / 0.9));
  for (let i = 1; i < n; i++) bx(0.02, 2.1, 0.02, DWOOD, -w / 2 + i * w / n, 1.12, 0.31);
  for (let i = 0; i < n; i++) bx(0.03, 0.3, 0.03, 0x6d6d6d, -w / 2 + (i + 0.5) * w / n + 0.12, 1.1, 0.32);
};
FUR.dresser = function(w) {
  bx(w, 0.85, 0.5, WOOD, 0, 0.425, 0);
  for (let i = 0; i < 3; i++) { bx(w - 0.1, 0.02, 0.02, DWOOD, 0, 0.2 + i * 0.27, 0.26); bx(0.2, 0.03, 0.03, 0x6d6d6d, 0, 0.3 + i * 0.27 - 0.08, 0.27); }
  bx(w * 0.7, 0.9, 0.04, 0xcfe6f2, 0, 1.55, -0.2, 'glass');
  bx(w * 0.7 + 0.08, 0.98, 0.03, WHITE, 0, 1.55, -0.22);
};
FUR.nightstand = function(lampColor) {
  bx(0.5, 0.5, 0.42, WOOD, 0, 0.25, 0); bx(0.44, 0.02, 0.02, DWOOD, 0, 0.3, 0.22);
  IB.cyl(0.08, 0.1, 0.2, 0x8a8a8a, 0, 0.6, 0, 8); IB.cyl(0.13, 0.19, 0.24, lampColor || 0xfff0c0, 0, 0.82, 0, 8, 'glow');
};
FUR.desk = function(w) {
  bx(w, 0.05, 0.62, LWOOD, 0, 0.74, 0);
  bx(0.05, 0.72, 0.6, WOOD, -w / 2 + 0.05, 0.36, 0); bx(0.05, 0.72, 0.6, WOOD, w / 2 - 0.05, 0.36, 0);
  bx(0.5, 0.32, 0.04, 0x111111, 0.2, 1.0, -0.2); bx(0.4, 0.24, 0.02, 0x2e5d8c, 0.2, 1.0, -0.17, 'glow'); bx(0.06, 0.25, 0.06, DARK, 0.2, 0.85, -0.2);
  IB.cyl(0.05, 0.08, 0.3, 0xc0392b, -0.5, 0.92, 0.1, 6); bx(0.3, 0.05, 0.22, 0x2980b9, -0.3, 0.79, 0.12);
};
FUR.rug = function(w, d, c1, c2) { bx(w, 0.025, d, c1, 0, 0.03, 0); bx(w * 0.82, 0.03, d * 0.82, c2, 0, 0.035, 0); bx(w * 0.6, 0.032, d * 0.6, c1, 0, 0.04, 0); };
FUR.plant = function(s) {
  s = s || 1;
  IB.cyl(0.22 * s, 0.16 * s, 0.4 * s, 0xb5651d, 0, 0.2 * s, 0, 8);
  IB.sph(0.34 * s, 0x2e7d32, 0, 0.75 * s, 0, 7, 5); IB.sph(0.26 * s, 0x43a047, 0.12 * s, 1.05 * s, 0.05 * s, 7, 5); IB.sph(0.22 * s, 0x388e3c, -0.15 * s, 0.95 * s, -0.05 * s, 6, 4);
};
FUR.floorLamp = function() { IB.cyl(0.18, 0.18, 0.04, DARK, 0, 0.02, 0, 8); IB.cyl(0.025, 0.025, 1.45, DARK, 0, 0.75, 0, 6); IB.cyl(0.2, 0.28, 0.3, 0xfff0c0, 0, 1.6, 0, 8, 'glow'); };
FUR.pendant = function(c) { IB.cyl(0.01, 0.01, 0.55, DARK, 0, 2.72, 0, 4); IB.cyl(0.12, 0.34, 0.26, c || 0xffe2a0, 0, 2.35, 0, 10, 'glow'); };
FUR.art = function(w, h, c1, c2) { bx(w + 0.08, h + 0.08, 0.04, DWOOD, 0, 0, 0); bx(w, h, 0.045, c1, 0, 0, 0.002); bx(w * 0.6, h * 0.55, 0.05, c2, 0, 0, 0.004); };
FUR.mirror = function(w, h) { bx(w + 0.08, h + 0.08, 0.04, WOOD, 0, 0, 0); bx(w, h, 0.05, 0xcfe6f2, 0, 0, 0.002, 'glass'); };
FUR.curtain = function(w, h, c) { bx(w, h, 0.1, c, 0, 0, 0); bx(w + 0.2, 0.05, 0.12, DARK, 0, h / 2 + 0.05, 0); };
FUR.coatRack = function() {
  IB.cyl(0.025, 0.025, 1.8, DWOOD, 0, 0.9, 0, 6); IB.cyl(0.15, 0.15, 0.04, DWOOD, 0, 0.02, 0, 8);
  [0, 1, 2, 3].forEach(i => bx(0.04, 0.04, 0.2, DWOOD, Math.cos(i * 1.57) * 0.1, 1.75, Math.sin(i * 1.57) * 0.1));
  bx(0.34, 0.8, 0.12, 0x34495e, 0.12, 1.3, 0.05); bx(0.3, 0.6, 0.1, 0xc0392b, -0.1, 1.4, -0.08);
};
FUR.shoeRack = function() { bx(0.9, 0.4, 0.32, WOOD, 0, 0.2, 0); [-0.25, 0, 0.25].forEach(x => { bx(0.15, 0.1, 0.28, 0x222222, x, 0.45, 0); bx(0.14, 0.1, 0.26, 0xe74c3c, x, 0.22, 0); }); };
FUR.console = function(len) { FUR.table(len, 0.36, 0.8, WOOD, DWOOD); IB.cyl(0.08, 0.1, 0.35, 0x8e44ad, -len / 4, 1.0, 0, 8); IB.cyl(0.1, 0.16, 0.2, 0xfff0c0, len / 4, 1.0, 0, 8, 'glow'); };

// ---- kitchen
FUR.counter = function(len, depth) {
  depth = depth || 0.62;
  bx(len, 0.86, depth, 0xf1efe6, 0, 0.43, 0); bx(len + 0.02, 0.05, depth + 0.04, 0x3e3e44, 0, 0.885, 0.01);
  const n = Math.max(1, Math.round(len / 0.55));
  for (let i = 0; i <= n; i++) bx(0.015, 0.7, 0.02, 0x9a9a92, -len / 2 + i * len / n, 0.45, depth / 2 + 0.002);
  for (let i = 0; i < n; i++) bx(0.14, 0.025, 0.03, STEEL, -len / 2 + (i + 0.5) * len / n, 0.75, depth / 2 + 0.02);
};
FUR.sink = function(len) { FUR.counter(len); bx(0.7, 0.04, 0.4, 0x9aa5ad, 0, 0.9, 0.02); bx(0.64, 0.02, 0.34, 0x6f7a82, 0, 0.915, 0.02); IB.cyl(0.02, 0.02, 0.3, STEEL, 0, 1.05, -0.2, 6); bx(0.02, 0.02, 0.18, STEEL, 0, 1.19, -0.12); };
FUR.stove = function() {
  bx(0.9, 0.9, 0.64, STEEL, 0, 0.45, 0); bx(0.8, 0.5, 0.02, DARK, 0, 0.42, 0.33); bx(0.7, 0.03, 0.03, 0x6d6d6d, 0, 0.7, 0.35);
  [[-0.22, -0.12], [0.22, -0.12], [-0.22, 0.15], [0.22, 0.15]].forEach(p => IB.cyl(0.11, 0.11, 0.02, DARK, p[0], 0.91, p[1], 10));
  bx(0.9, 0.3, 0.5, STEEL, 0, 1.95, -0.05); bx(0.3, 0.55, 0.3, STEEL, 0, 2.4, -0.15);
};
FUR.fridge = function() { bx(0.82, 1.95, 0.75, 0xe8eaed, 0, 0.975, 0); bx(0.8, 0.02, 0.02, 0x8a8f94, 0, 1.3, 0.38); bx(0.04, 0.5, 0.04, 0x6d6d6d, 0.3, 1.6, 0.4); bx(0.04, 0.5, 0.04, 0x6d6d6d, 0.3, 0.95, 0.4); };
FUR.upper = function(len) { bx(len, 0.72, 0.36, WOOD, 0, 1.85, 0); const n = Math.max(1, Math.round(len / 0.6)); for (let i = 1; i < n; i++) bx(0.015, 0.68, 0.02, DWOOD, -len / 2 + i * len / n, 1.85, 0.19); };
FUR.bin = function() { IB.cyl(0.2, 0.17, 0.55, 0x7f8c8d, 0, 0.28, 0, 8); IB.cyl(0.21, 0.21, 0.04, 0x566063, 0, 0.57, 0, 8); };

// ---- bathroom
FUR.toilet = function() { bx(0.4, 0.4, 0.5, WHITE, 0, 0.2, 0.08); bx(0.4, 0.45, 0.18, WHITE, 0, 0.65, -0.2); bx(0.36, 0.04, 0.4, 0xe9e9e4, 0, 0.42, 0.1); bx(0.1, 0.03, 0.04, STEEL, 0, 0.9, -0.2); };
FUR.vanity = function(len) { FUR.counter(len, 0.5); bx(0.5, 0.05, 0.36, WHITE, 0, 0.92, 0.02); IB.cyl(0.02, 0.02, 0.2, STEEL, 0, 1.02, -0.12, 6); };
FUR.bathtub = function(len) {
  bx(len, 0.58, 0.8, WHITE, 0, 0.29, 0); bx(len - 0.2, 0.02, 0.6, 0x9fd3ea, 0, 0.59, 0, 'glass');
  IB.cyl(0.02, 0.02, 0.3, STEEL, len / 2 - 0.15, 0.75, -0.3, 6); bx(0.02, 0.02, 0.12, STEEL, len / 2 - 0.15, 0.9, -0.25);
};
FUR.shower = function() {
  bx(0.95, 0.08, 0.95, WHITE, 0, 0.04, 0);
  bx(0.02, 2.1, 0.95, 0xbfe4f2, 0.47, 1.1, 0, 'glass'); bx(0.95, 2.1, 0.02, 0xbfe4f2, 0, 1.1, 0.47, 'glass');
  IB.cyl(0.02, 0.02, 1.0, STEEL, -0.4, 1.4, -0.4, 6); IB.cyl(0.12, 0.12, 0.03, STEEL, -0.25, 2.0, -0.4, 8);
};
FUR.basket = function() { IB.cyl(0.22, 0.18, 0.5, 0xd7b98a, 0, 0.25, 0, 8); bx(0.3, 0.04, 0.2, 0xe74c3c, 0, 0.5, 0); };
FUR.towelRack = function() { bx(0.6, 0.03, 0.06, STEEL, 0, 1.2, 0); bx(0.5, 0.5, 0.04, 0x2980b9, 0, 0.95, 0.04); };

// ---- garage
FUR.car = function(color) {
  bx(1.9, 0.38, 4.5, 0x15151a, 0, 0.34, 0);
  bx(1.95, 0.62, 4.5, color, 0, 0.78, 0);
  bx(1.7, 0.55, 2.3, 0x27323c, 0, 1.38, -0.2);
  bx(1.78, 0.08, 2.1, color, 0, 1.69, -0.2);
  bx(1.1, 0.2, 0.05, DARK, 0, 0.8, 2.27);
  [-1, 1].forEach(s => {
    bx(0.4, 0.16, 0.06, 0xfff4c0, s * 0.68, 0.9, 2.27, 'glow'); bx(0.4, 0.14, 0.06, 0xc62828, s * 0.68, 0.9, -2.27);
    [-1, 1].forEach(t => IB.cyl(0.38, 0.38, 0.26, 0x121212, s * 0.98, 0.38, t * 1.4, 10, 'solid', 'x'));
  });
};
FUR.workbench = function(len) {
  bx(len, 0.06, 0.7, LWOOD, 0, 0.9, 0);
  [-1, 1].forEach(s => { bx(0.06, 0.9, 0.62, WOOD, s * (len / 2 - 0.06), 0.45, 0); });
  bx(len, 0.04, 0.6, WOOD, 0, 0.3, 0);
  bx(len, 1.0, 0.04, 0xb08a5a, 0, 1.55, -0.33);
  bx(0.5, 0.2, 0.25, 0xc0392b, -0.4, 1.03, 0); bx(0.3, 0.05, 0.12, DARK, 0.2, 0.95, 0.1);
  [-0.6, -0.2, 0.2, 0.6].forEach((x, i) => bx(0.06, 0.3 + (i % 2) * 0.1, 0.03, STEEL, x, 1.7, -0.3));
};
FUR.shelves = function(len) {
  [-1, 1].forEach(s => bx(0.05, 2.0, 0.4, 0x6f7d8c, s * (len / 2 - 0.03), 1.0, 0));
  for (let i = 0; i < 4; i++) {
    bx(len, 0.04, 0.4, 0x8b99a8, 0, 0.1 + i * 0.6, 0);
    for (let k = 0; k < 3; k++) bx(0.35, 0.28, 0.3, [0xc0392b, 0x2980b9, 0xe67e22, 0x7f8c8d][(i + k) % 4], -len / 2 + 0.4 + k * (len - 0.7) / 2, 0.28 + i * 0.6, 0);
  }
};
FUR.tires = function() { [0, 1, 2].forEach(i => IB.cyl(0.36, 0.36, 0.24, 0x1b1b1b, 0, 0.12 + i * 0.25, 0, 12)); };
FUR.washer = function() { bx(0.62, 0.88, 0.6, WHITE, 0, 0.44, 0); IB.cyl(0.22, 0.22, 0.04, 0x39454f, 0, 0.45, 0.31, 12, 'solid', 'z'); bx(0.5, 0.06, 0.02, 0x9aa5ad, 0, 0.8, 0.31); };
FUR.heater = function() { IB.cyl(0.3, 0.3, 1.5, 0xbfc5cb, 0, 0.75, 0, 12); IB.cyl(0.04, 0.04, 0.3, 0x8a6d3b, 0.1, 1.65, 0, 6); };
FUR.bicycle = function() {
  [-0.55, 0.55].forEach(z => IB.cyl(0.32, 0.32, 0.05, 0x222222, 0, 0.32, z, 12, 'solid', 'x'));
  bx(0.05, 0.05, 1.0, 0xc0392b, 0, 0.62, 0); bx(0.05, 0.35, 0.05, 0xc0392b, 0, 0.5, -0.2); bx(0.4, 0.04, 0.04, DARK, 0, 0.95, 0.52); bx(0.12, 0.04, 0.3, DARK, 0, 0.85, -0.3);
};
FUR.garageDoor = function(w, h) {
  bx(w, h, 0.1, 0xe9e9e4, 0, h / 2, 0);
  for (let i = 1; i < 4; i++) bx(w, 0.04, 0.12, 0xb8b8b2, 0, i * h / 4, 0.01);
  for (let i = 0; i < 4; i++) bx(w / 5, 0.22, 0.12, 0x9ccbea, -w / 2 + (i + 0.5) * w / 4, h - 0.3, 0.01, 'glass');
};
FUR.toolbox = function() { bx(0.5, 0.25, 0.25, 0xc0392b, 0, 0.125, 0); bx(0.5, 0.03, 0.06, DARK, 0, 0.27, 0); };
FUR.paint = function() { [0, 1, 2].forEach(i => IB.cyl(0.11, 0.11, 0.24, [0x2e86c1, 0xf4d03f, 0xe74c3c][i], -0.3 + i * 0.3, 0.12, 0, 8)); };
FUR.ceilingLight = function(w, d) { IB.ceil(w || 0.9, d || 0.5, 0xfffbe6, 0, 2.96, 0, 'glow'); };
FUR.door = function(w, h, c) { bx(w, h, 0.08, c, 0, h / 2, 0); bx(0.07, 0.07, 0.12, 0xd4af37, w / 2 - 0.12, h * 0.48, 0); };
