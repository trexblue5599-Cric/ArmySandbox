// js/house-exterior.js  -  YOUR house: the pink house with the green roof, now with a front door and a garage.
// It replaces one of the city's houses (the one at HERO.x, HERO.z). Its yellow entry marker is at the front door.
const HERO = { x: -184.3, z: -144.5 };   // the district house at this spot is your house (it is built as your house)

world.isHeroHouse = (x, z) => Math.abs(x - HERO.x) < 0.01 && Math.abs(z - HERO.z) < 0.01;
// trees that stood in front of the house (removed so they don't block the door)
world.isHeroTree = (x, z) => (Math.abs(x - (HERO.x)) < 0.01 && Math.abs(z - (HERO.z - 7.5)) < 0.01);

world.heroHouse = function(x, z, wall, roof) {
  const add = world.add, flat = world.flat, W = 9, D = 9, Hh = 4.6, hw = W / 2;
  const zf = z - hw;                     // front face (faces the street, -z)
  const xd = x - 2.7;                    // front door  (right side as you look at the house)
  const xg = x + 2.2;                    // garage door (left side)
  const glass = new THREE.MeshLambertMaterial({ color: 0x35506b, emissive: 0xffd98a, emissiveIntensity: world.nf });
  world.facadeMats.push(glass);          // windows glow at night
  const piece = (w, h, d, color, px, py, pz) => add(new THREE.BoxGeometry(w, h, d), color, px, py, pz);
  const pane = (w, h, d, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glass); m.position.set(px, py, pz); world.cur.add(m); };

  piece(W, Hh, D, wall, x, Hh / 2, z);                  // walls
  piece(W + 0.3, 0.35, D + 0.3, 0xcfc9c0, x, 0.175, z); // stone base
  const r = add(new THREE.ConeGeometry(7.2, 3.4, 4), roof, x, 6.3, z); r.rotation.y = Math.PI / 4;
  piece(1.1, 2, 1, 0x8d6e63, x - 2.5, 6.8, z + 1.5);    // chimney

  // window helper: face 'z' (front/back) or 'x' (sides)
  const win = (face, cx, cz, w, h) => {
    const cy = 2.1;
    if (face === 'z') { piece(w + 0.25, h + 0.25, 0.1, 0xffffff, cx, cy, cz); pane(w, h, 0.14, cx, cy, cz); piece(0.06, h, 0.16, 0xffffff, cx, cy, cz); }
    else { piece(0.1, h + 0.25, w + 0.25, 0xffffff, cx, cy, cz); pane(0.14, h, w, cx, cy, cz); piece(0.16, h, 0.06, 0xffffff, cx, cy, cz); }
  };
  win('z', x - 0.95, zf - 0.03, 1.3, 1.3);                       // front: next to the door
  win('z', x - 2.4, z + hw + 0.03, 1.4, 1.3); win('z', x + 2.4, z + hw + 0.03, 1.4, 1.3);   // back
  win('x', x - hw - 0.03, z - 1.8, 1.3, 1.3); win('x', x - hw - 0.03, z + 1.8, 1.3, 1.3);   // right side
  win('x', x + hw + 0.03, z + 1.8, 1.3, 1.3);                    // left side (garage side: no front window)

  // front door + porch
  piece(1.45, 2.45, 0.14, 0xffffff, xd, 1.22, zf - 0.04);
  piece(1.1, 2.2, 0.12, 0x5d3a1a, xd, 1.1, zf - 0.1);
  pane(0.6, 0.4, 0.14, xd, 1.75, zf - 0.17);
  piece(0.08, 0.08, 0.08, 0xd4af37, xd + 0.38, 1.05, zf - 0.18);
  piece(2.6, 0.12, 1.5, roof, xd, 2.85, zf - 0.75);                   // little roof over the door
  piece(0.12, 2.8, 0.12, 0xffffff, xd - 1.15, 1.4, zf - 1.4); piece(0.12, 2.8, 0.12, 0xffffff, xd + 1.15, 1.4, zf - 1.4);
  piece(2.2, 0.15, 0.9, 0xbdb7ac, xd, 0.08, zf - 0.55);               // step

  // GARAGE (replaces the windows on the left half of the front)
  piece(3.6, 2.5, 0.12, 0xf0f0ea, xg, 1.25, zf - 0.06);
  [0.62, 1.24, 1.86].forEach(h => piece(3.6, 0.045, 0.15, 0xb4b4ae, xg, h, zf - 0.06));
  [-1.35, -0.45, 0.45, 1.35].forEach(dx => pane(0.7, 0.3, 0.15, xg + dx, 2.15, zf - 0.07));
  piece(3.95, 0.22, 0.2, 0xffffff, xg, 2.6, zf - 0.08);               // frame above
  [-1, 1].forEach(s => piece(0.18, 2.6, 0.2, 0xffffff, xg + s * 1.9, 1.3, zf - 0.08));
  piece(0.5, 0.2, 0.2, 0x333333, xg, 2.95, zf - 0.2);                 // lamp

  // driveway + path
  flat(3.9, 3.6, 0xb5b5b0, xg, 0.08, zf - 1.8, 0.02);
  flat(1.5, 3.6, 0xc8c2b6, xd, 0.08, zf - 1.8, 0.02);
  // bushes + mailbox
  [[x - 4.0, zf - 0.7], [x - 4.0, zf - 1.7], [x - 3.2, z + hw + 0.7]].forEach(p => add(new THREE.SphereGeometry(0.62, 6, 5), 0x3f7d3a, p[0], 0.5, p[1]));
  piece(0.12, 1.0, 0.12, 0x6d4c41, x - 5.6, 0.5, zf - 2.2); piece(0.5, 0.35, 0.32, 0x2c6fb5, x - 5.6, 1.15, zf - 2.2);

  world.obstacle(x, z, hw, hw, Hh);
  world.mapRects.push({ kind: 'b', x, z, w: W, d: D, h: Hh });

  // where the yellow entry marker is, and where you appear when you come back out
  world.heroEntrance = { x: xd, z: zf - 1.5, outX: xd, outZ: zf - 3.8 };
};

// the ground height at a spot (the island has hills; the old flat city is 0)
world.groundAt = (x, z) => {
  if (typeof MAP === 'undefined' || !MAP.heightAt || Math.abs(x) >= CONFIG.LIMIT || Math.abs(z) >= CONFIG.LIMIT) return 0;
  const y = MAP.heightAt(x, z);
  const lift = world.roadLift ? world.roadLift(x, z) : 0;       // roads / pavements / bridges stand a little above the grass
  if (lift > 0) return y + lift;
  if (world.onDock && world.onDock(x, z)) return Math.max(y, world.DOCK_TOP);   // quay and piers
  return y;
};

// your house: built at HERO (the district house on that spot is skipped, so there is only one)
world.initHeroHouse = function() {
  if (world.heroEntrance) return;
  // the spot from the map overlaps a road: slide the house to the nearest clear ground
  const fit = world.fitBuilding && world.fitBuilding(HERO.x, HERO.z, 9, 9, { scales: [1], maxR: 16, margin: 4, avoidObstacles: true });
  if (fit) { HERO.x = fit.x; HERO.z = fit.z; }
  world.heroHouse(HERO.x, HERO.z, 0xf1b5c4, 0x2e7d32);   // pink walls, green roof
};
