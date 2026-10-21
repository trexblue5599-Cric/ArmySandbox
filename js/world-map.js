// js/world-map.js  -  the land AROUND the city, following the dream map:
//   NE  : lake (north shore + east coast) with a sandy beach
//   E   : harbour quay with containers
//   NW  : a river and forest
//   W   : quarry, forest, a road running west out of town
//   S   : farmland with fields, barn and silos, a farm road south
//   SW  : parking lot, diner and a small airport
//   SE  : highway and a little country town
// To move something, change the numbers in this file.

const MAP = {
  WATER: 0x3a9ad0,
  SAND: 0xe3d3a1,
  ROAD: 0x3a3a3d,
  RIVER: [[-236, -150], [-210, -165], [-188, -190], [-168, -216], [-150, -236]]   // runs into the north-west forest
};

// ---------------------------------------------------------------- where is what (used by trees + placing things)
// water: the lake and the sea on the right of the map
MAP.inWater = function(x, z) {
  if (x >= 2 && z <= -124) return true;                 // north lake, above the top road
  if (x >= 132 && z > -126 && z <= -30) return true;    // east lake coast
  if (x >= 152 && z > -30 && z <= 42) return true;      // east sea by the harbour
  return false;
};
// the river: distance from a point to the river line
MAP.riverDist = function(x, z) {
  let best = 1e9;
  const P = MAP.RIVER;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, az] = P[i], [bx, bz] = P[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
};
// anything that is NOT free land: the city, roads, water, the farm, the airport, the town, the river
MAP.blocked = function(x, z) {
  if (Math.abs(x) > CONFIG.LIMIT - 14 || Math.abs(z) > CONFIG.LIMIT - 14) return true;   // the sea
  if (Math.abs(x) < 132 && Math.abs(z) < 132) return true;
  // New outer-region roads stay clear of trees and other free-land props.
  if (Math.abs(z - 280) < 7 || Math.abs(z - 380) < 7) return true;
  if (Math.abs(x - 280) < 7 || Math.abs(x - 390) < 7) return true;          // the city + its farm strip
  if (MAP.inWater(x, z)) return true;
  if (MAP.riverDist(x, z) < 5) return true;
  if (Math.abs(x) < 7 && (z > 120 || z < -120)) return true;        // north and south roads
  if (Math.abs(z) < 7 && (x < -120 || x > 120)) return true;        // west road
  if (Math.abs(z - 160) < 8 && x > -4) return true;                 // highway
  if (x > -132 && x < -24 && z > 118 && z < 178) return true;       // parking, diner, airport
  if (x > 36 && x < 150 && z > 124 && z < 146) return true;         // town
  if (Math.abs(x - -133) < 3) return true;                          // the railway
  if (x > -178 && x < -128 && z > 36 && z < 100) return true;       // quarry
  return false;
};
world.freeLand = (x, z) => !MAP.blocked(x, z);

// ---------------------------------------------------------------- helpers
world.initMap = function() {
  const { obstacle, flat, rnd } = world;

  // a block of water, with a sandy beach around it. The player can't walk into water.
  const water = (x0, x1, z0, z1) => {
    const sand = world.add(new THREE.BoxGeometry(x1 - x0 + 4, 0.02, z1 - z0 + 4), MAP.SAND, (x0 + x1) / 2, 0.06, (z0 + z1) / 2);
    sand.castShadow = false;
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    flat(w, d, MAP.WATER, cx, 0.13, cz, 0.02);
    obstacle(cx, cz, w / 2, d / 2, 0.1);
    world.mapRects.push({ kind: 'w', x: cx, z: cz, w, d });
  };
  // a flat coloured patch on the ground (fields, dirt, tarmac)
  const patch = (x0, x1, z0, z1, color, y) => {
    flat(x1 - x0, z1 - z0, color, (x0 + x1) / 2, y || 0.17, (z0 + z1) / 2, 0.02);
    world.mapRects.push({ kind: 'p', x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 });
  };
  // a solid box (buildings, sheds, containers)
  const box = (w, h, d, color, x, y, z) => {
    const m = world.add(new THREE.BoxGeometry(w, h, d), color, x, y + h / 2, z);
    obstacle(x, z, w / 2, d / 2, h);
    return m;
  };
  const roof = (w, d, color, x, y, z) => {
    const r = world.add(new THREE.ConeGeometry(Math.hypot(w, d) / 2, 2.4, 4), color, x, y, z);
    r.rotation.y = Math.PI / 4;
    r.scale.set(w / Math.hypot(w, d) * 1.4, 1, d / Math.hypot(w, d) * 1.4);
    return r;
  };

  // ---------- ground base for the farm strip (south of the city) ----------
  patch(-126, 126, 86, 116, 0x7fb35a, 0.13);

  // ---------- THE SEA AROUND THE WHOLE MAP (replaces the mountains at the edges) ----------
  const S = CONFIG.LIMIT - 14, B = CONFIG.LIMIT + 120;
  const sea = (x0, x1, z0, z1) => {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    flat(w, d, MAP.WATER, cx, 0.03, cz, 0.02);
    obstacle(cx, cz, w / 2, d / 2, 0.1);
    world.mapRects.push({ kind: 'w', x: cx, z: cz, w, d });
  };
  sea(-B, B, -B, -S);     // north sea
  sea(-B, B, S, B);       // south sea
  sea(-B, -S, -S, S);     // west sea
  sea(S, B, -S, S);       // east sea
  // beach strip just inside the shoreline
  const beach = (x0, x1, z0, z1) => flat(x1 - x0, z1 - z0, MAP.SAND, (x0 + x1) / 2, 0.06, (z0 + z1) / 2, 0.02);
  beach(-S, S, -S, -S + 5); beach(-S, S, S - 5, S);
  beach(-S, -S + 5, -S + 5, S - 5); beach(S - 5, S, -S + 5, S - 5);

  // ---------- NORTH + EAST WATER ----------
  const L = 246;    // keep the original coast and landmarks in place; expansion is added beyond them
  water(4, L, -L, -124);          // north lake
  water(132, L, -124, -30);       // east lake coast
  water(152, L, -30, 42);         // east sea by the harbour

  // ---------- HARBOUR QUAY (east of the city, on the coast) ----------
  patch(126, 152, -30, 30, 0x9e9a92, 0.09);
  for (let i = 0; i < 6; i++) {               // containers
    const x = 130 + (i % 3) * 7, z = -22 + Math.floor(i / 3) * 14 + (i % 2) * 2;
    world.add(new THREE.BoxGeometry(5, 2.6, 2.4), [0xc62828, 0x1565c0, 0xef6c00, 0x2e7d32, 0xf9a825, 0x6a1b9a][i], x, 1.3, z);
    obstacle(x, z, 2.5, 1.2, 2.6);
  }
  box(8, 4, 5, 0x78909c, 142, 0.05, 4);       // harbour shed
  // a small ship in the sea
  const hull = world.add(new THREE.BoxGeometry(12, 2.2, 4.4), 0x37474f, 166, 0.8, -6);
  world.add(new THREE.BoxGeometry(4, 2.4, 3.2), 0xeeeeee, 164, 3.1, -6);
  hull.castShadow = false;

  // ---------- NORTH-WEST: river ----------
  // river: a series of short water blocks that follow the river line
  MAP.RIVER.forEach((p, i) => {
    if (i === MAP.RIVER.length - 1) return;
    const [ax, az] = p, [bx, bz] = MAP.RIVER[i + 1];
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 3);
    for (let s = 0; s <= steps; s++) {
      const x = ax + (bx - ax) * s / steps, z = az + (bz - az) * s / steps;
      const m = world.add(new THREE.BoxGeometry(6, 0.02, 6), MAP.WATER, x, 0.13, z);
      m.castShadow = false;
      obstacle(x, z, 2.5, 2.5, 0.1);
    }
  });
  // ---------- FAR SOUTH: more farms and fields out to the south edge ----------
  const far = L - 6;
  const cols = [0x7cb342, 0xe0b84f, 0x6d4c2e, 0x558b2f, 0xc9a85c];
  for (let r = 0; r < 4; r++) {
    for (let c = -5; c < 5; c++) {
      if (Math.abs(c) < 1 && r === 0) continue;                     // leave the farm road clear
      const x0 = c * 26 + 2, z0 = 130 + r * 30;
      if (z0 + 24 > far) continue;
      patch(x0, x0 + 24, z0, z0 + 24, cols[(r + c + 10) % cols.length], 0.17);
    }
  }
  // a second, bigger farm in the south-west corner with its own barn
  box(12, 6, 8, 0xb23a30, -150, 0.05, 210);
  roof(12, 8, 0x37474f, -150, 6.2, 210);

  // ---------- WEST: quarry (dirt pit), a road out of town, the railway ----------
  patch(-172, -134, 40, 96, 0x9c7a52, 0.10);              // dirt
  patch(-160, -146, 52, 84, 0x6d4c2e, 0.14);              // the pit
  [[-168, 50], [-140, 92], [-158, 92]].forEach(p => {
    const r = world.add(new THREE.DodecahedronGeometry(3, 0), 0x8d8d88, p[0], 1.2, p[1]);
    obstacle(p[0], p[1], 2, 2, 2);
  });
  // road west out of town (flat strip)
  patch(-L, -126, -5, 5, MAP.ROAD, 0.09);
  // railway along the west side of town
  patch(-134, -132, -L, 100, 0x6d4c41, 0.03);

  // ---------- SOUTH: farmland with fields, barn, silos, farm road ----------
  const fields = [
    [-124, -98, 88, 112, 0x6d4c2e], [-96, -70, 88, 112, 0x7cb342], [-68, -40, 88, 112, 0xe0b84f],
    [-38, -14, 88, 112, 0x558b2f], [8, 40, 88, 112, 0x7cb342], [44, 80, 88, 112, 0xc9a85c],
    [84, 122, 88, 112, 0x6d4c2e]
  ];
  fields.forEach(f => patch(f[0], f[1], f[2], f[3], f[4], 0.07));
  // barn (red walls, dark roof) and two silos
  box(10, 6, 7, 0xb23a30, -92, 0.05, 98);
  roof(10, 7, 0x37474f, -92, 6.2, 98);
  [[-40, 104], [-34, 104]].forEach(p => {
    world.add(new THREE.CylinderGeometry(1.7, 1.7, 7.5, 12), 0xcfd8dc, p[0], 3.8, p[1]);
    obstacle(p[0], p[1], 1.7, 1.7, 7.5);
  });
  // a small pond in the south fields
  world.add(new THREE.CylinderGeometry(4, 4, 0.03, 16), MAP.WATER, 60, 0.13, 102).castShadow = false;
  // farm road going south from the town
  patch(-4, 4, 116, 268, MAP.ROAD, 0.105);

  // ---------- SOUTH-WEST: parking lot, diner, airport ----------
  patch(-66, -40, 126, 152, 0x4a4a4e, 0.09);              // parking lot
  [-62, -56, -50, -44].forEach(x => patch(x, x + 0.4, 128, 150, 0xeeeeee, 0.06));   // parking lines
  box(12, 5, 7, 0xf5f5f5, -54, 0.05, 160);                // diner
  roof(12, 7, 0xc62828, -54, 5.2, 160);
  patch(-120, -30, 168, 175, 0x4a4a4e, 0.09);             // runway
  for (let x = -116; x < -34; x += 12) patch(x, x + 5, 171.5, 172.1, 0xeeeeee, 0.12);   // runway centre line
  box(14, 7, 10, 0x9e9e9e, -104, 0.05, 150);             // hangar
  world.add(new THREE.BoxGeometry(9, 1.4, 1.4), 0xf5f5f5, -84, 0.9, 150);                  // plane body
  world.add(new THREE.BoxGeometry(2, 0.15, 13), 0xf5f5f5, -84, 1.2, 150);                  // plane wings

  // ---------- SOUTH-EAST: highway and small town ----------
  patch(-4, L, 156, 164, MAP.ROAD, 0.09);               // highway
  for (let x = 0; x < L; x += 7) patch(x, x + 3.5, 159.8, 160.2, 0xe0c940, 0.12);   // highway centre dashes
  // town houses
  [[46, 132], [66, 130], [88, 134], [112, 130], [132, 132]].forEach((p, i) => {
    world.house(p[0], p[1], CONFIG.WALLS[i % CONFIG.WALLS.length], CONFIG.ROOFS[i % CONFIG.ROOFS.length]);
  });
  // farm houses in the south-east fields
  [[16, 92], [30, 92]].forEach(p => world.house(p[0], p[1], 0xfff9c4, 0x5d4037));

  // ---------- EXPANDED OUTER WORLD: new countryside beyond the original map ----------
  // A network of long rural roads makes the playable world feel substantially larger.
  patch(-L, L, 276, 284, MAP.ROAD, 0.105);
  patch(-L, L, 376, 384, MAP.ROAD, 0.105);
  patch(276, 284, -L, L, MAP.ROAD, 0.09);
  patch(386, 394, -L, L, MAP.ROAD, 0.09);
  // road markings on the two east-west routes
  for (let x = -240; x < 245; x += 18) {
    patch(x, x + 7, 279.7, 280.3, 0xe0c940, 0.12);
    patch(x, x + 7, 379.7, 380.3, 0xe0c940, 0.12);
  }
  // A northern forest reserve with clearings and a ranger station
  patch(-220, -145, -430, -345, 0x456b3c, 0.17);
  patch(-205, -160, -415, -360, 0x6f8d4b, 0.17);
  box(12, 5, 9, 0x8d6e63, -180, 0.05, -385);
  roof(12, 9, 0x37474f, -180, 5.2, -385);
  // Eastern lakeside village: roads, homes and a small service station
  patch(300, 470, -220, -130, 0x7fae5c, 0.17);
  patch(315, 455, -185, -177, MAP.ROAD, 0.09);
  patch(340, 348, -215, -145, MAP.ROAD, 0.09);
  [[330,-202],[360,-202],[390,-202],[420,-202],[330,-155],[365,-155],[400,-155],[435,-155]].forEach((p,i) => {
    world.house(p[0], p[1], CONFIG.WALLS[(i+2)%CONFIG.WALLS.length], CONFIG.ROOFS[(i+1)%CONFIG.ROOFS.length]);
  });
  box(14, 4, 10, 0xf9a825, 445, 0.05, -195); // roadside service station
  // South-west orchards and a rural campsite with paths and shelters
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
    const x = -450 + c * 24, z = 285 + r * 24;
    patch(x, x + 20, z, z + 20, (r+c)%2 ? 0x6e9b43 : 0x8bb653, 0.17);
    for (let k = 0; k < 5; k++) {
      const tx = x + 3 + (k%3)*6, tz = z + 4 + Math.floor(k/3)*8;
      world.tree(tx, tz, 0.65);
    }
  }
  patch(-420, -330, 420, 465, 0x9c7a52, 0.17); // campsite clearing
  [[-400,432],[-370,432],[-400,452],[-370,452]].forEach((p,i) => {
    box(6, 2.8, 5, 0xbca58a, p[0], 0.05, p[1]);
    roof(6, 5, 0x5d4037, p[0], 3.0, p[1]);
  });
  // South-east agricultural district with a farmhouse, silo and large fields
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const x0 = 300 + c * 32, z0 = 290 + r * 30;
    patch(x0, x0 + 28, z0, z0 + 26, [0x7cb342,0xe0b84f,0x6d4c2e,0x558b2f,0xc9a85c][(r*2+c)%5], 0.17);
  }
  box(14, 7, 10, 0xb23a30, 350, 0.05, 340);
  roof(14, 10, 0x37474f, 350, 7.2, 340);
  world.add(new THREE.CylinderGeometry(2, 2, 9, 12), 0xcfd8dc, 370, 4.6, 342);
  obstacle(370, 342, 2, 2, 9);
  // West ridge road and a lookout tower on a rocky hill
  patch(-460, -280, 180, 188, MAP.ROAD, 0.09);
  for (let i = 0; i < 9; i++) {
    const x = -450 + i * 18, z = 130 + (i%3)*13;
    const rock = world.add(new THREE.DodecahedronGeometry(5 + (i%3), 1), 0x777b78, x, 2.2, z);
    rock.scale.y = 0.8;
  }
  box(3, 16, 3, 0x795548, -350, 0.05, 150);
  box(9, 1, 9, 0xeeeeee, -350, 14, 150);
  // Increase vegetation density to fill the larger exploration area.
  for (let i = 0; i < 6500; i++) {
    const x = (rnd() - 0.5) * 2 * (L - 4), z = (rnd() - 0.5) * 2 * (L - 4);
    if (!world.freeLand(x, z)) continue;
    world.tree(x, z, 0.9 + rnd() * 0.8);
  }
  // a few trees at the farms and town (drawn with the Tree.glb prop later)
  world.mapTreeSpots = [[-120, 120], [-28, 84], [4, 118], [54, 150], [100, 150], [140, 150], [-70, 176], [24, 170]];
};
