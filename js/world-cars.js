// js/world-cars.js  -  car models built from boxes (no glb needed). Each car = ONE merged mesh, so lots of cars stay fast.
// Types: 'wagon' (cream station wagon with wood side panels), 'sedan', 'hatch'. Front of the car is +z.
world.carTypes = ['wagon', 'wagon', 'sedan', 'hatch'];
world.carMat = new THREE.MeshLambertMaterial({ vertexColors: true });
world.pickCarType = () => world.carTypes[Math.floor(world.rnd() * world.carTypes.length)];

// glue many (geometry, colour, position, rotation) pieces into one geometry with vertex colours
world.mergeParts = function(parts) {
  const pos = [], nor = [], col = [];
  const m4 = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
  parts.forEach(p => {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    m4.compose(new THREE.Vector3(p.x || 0, p.y || 0, p.z || 0), q.setFromEuler(e.set(p.rx || 0, p.ry || 0, p.rz || 0)), one);
    g.applyMatrix4(m4);
    c.set(p.color);
    const P = g.attributes.position.array, N = g.attributes.normal.array;
    for (let i = 0; i < P.length; i++) { pos.push(P[i]); nor.push(N[i]); }
    for (let i = 0; i < P.length / 3; i++) col.push(c.r, c.g, c.b);
    g.dispose(); p.geo.dispose();
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
};

world._carGeo = {};
world.carGeo = (type, color) => world._carGeo[type + color] || (world._carGeo[type + color] = (function() {
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const Cy = (rt, rb, h, s) => new THREE.CylinderGeometry(rt, rb, h, s || 12);
  const P = [];
  const add = (geo, c, x, y, z, rx, ry, rz) => P.push({ geo, color: c, x, y, z, rx, ry, rz });
  const S = {
    wagon: { L: 4.4, H: 0.62, cL: 2.9, cH: 0.62, cZ: -0.45, wood: true, rack: true },
    sedan: { L: 4.5, H: 0.6, cL: 2.1, cH: 0.52, cZ: -0.2 },
    hatch: { L: 3.7, H: 0.6, cL: 2.0, cH: 0.58, cZ: -0.35 }
  }[type];
  const top = 0.45 + S.H;                               // top of the lower body
  add(B(1.8, 0.3, S.L - 0.3), 0x15151a, 0, 0.32, 0);    // underside
  add(B(1.9, S.H, S.L), color, 0, 0.45 + S.H / 2, 0);   // body
  if (S.wood) [-1, 1].forEach(s => add(B(0.04, 0.3, 3.0), 0x8a5a33, s * 0.965, 0.72, -0.2));   // wood panels
  add(B(1.74, S.cH, S.cL), 0x27323c, 0, top + S.cH / 2, S.cZ);                                  // glass
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => add(B(0.09, S.cH, 0.09), color, sx * 0.86, top + S.cH / 2, S.cZ + sz * (S.cL / 2 - 0.045))));
  add(B(1.84, 0.07, S.cL + 0.1), color, 0, top + S.cH + 0.035, S.cZ);                           // roof
  if (S.rack) {
    const ry = top + S.cH + 0.1;
    [-1, 1].forEach(s => add(B(0.05, 0.05, S.cL - 0.2), 0x222222, s * 0.6, ry, S.cZ));
    [-0.9, 0, 0.9].forEach(z => add(B(1.4, 0.04, 0.05), 0x222222, 0, ry + 0.04, S.cZ + z));
  }
  [-1, 1].forEach(s => add(B(1.96, 0.2, 0.22), 0x8f9296, 0, 0.5, s * (S.L / 2 + 0.05)));       // bumpers
  add(B(1.1, 0.22, 0.04), 0x1d1f22, 0, 0.8, S.L / 2 + 0.01);                                    // grille
  [-1, 1].forEach(s => {
    add(Cy(0.15, 0.15, 0.06, 10), 0xf4f4ee, s * 0.62, 0.8, S.L / 2 + 0.01, Math.PI / 2, 0, 0); // headlights
    add(B(0.3, 0.16, 0.04), 0xc62828, s * 0.7, 0.85, -S.L / 2 - 0.01);                          // tail lights
    [-1, 1].forEach(sz => {
      add(Cy(0.38, 0.38, 0.26, 12), 0x121212, s * 0.93, 0.38, sz * S.L * 0.3, 0, 0, Math.PI / 2);   // tyre
      add(Cy(0.2, 0.2, 0.28, 10), 0xdddddd, s * 0.93, 0.38, sz * S.L * 0.3, 0, 0, Math.PI / 2);     // white hub
    });
  });
  return world.mergeParts(P);
})());
