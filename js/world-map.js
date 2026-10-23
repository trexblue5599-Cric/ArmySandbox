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
  // The island has a broad, naturally irregular coastline rather than a square map edge.
  const a = Math.atan2(z, x);
  const ca = Math.cos(a), sa = Math.sin(a);
  const coastRadius = 620 / Math.pow(Math.pow(ca, 4) + Math.pow(sa, 4), 0.25) * (1 + 0.025 * Math.sin(3 * a + 0.6) + 0.018 * Math.sin(7 * a));
  if (Math.hypot(x, z) > coastRadius - 8) return true;   // beach / sea boundary
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

  // ---------- STATIC SEA BASE AROUND THE WHOLE ISLAND ----------
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

  // ---------- AIRPORT SECURITY PERIMETER ----------
  // Solid low barriers/fencing: vehicles cannot drive across the airport boundary.
  const fence = (x1, z1, x2, z2, height = 2.2) => {
    const dx = x2 - x1, dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    const m = world.add(new THREE.BoxGeometry(length, height, 0.45), 0x59636a, (x1+x2)/2, height/2, (z1+z2)/2);
    m.rotation.y = -Math.atan2(dz, dx);
    obstacle((x1+x2)/2, (z1+z2)/2, Math.abs(dx)/2 + (Math.abs(dz) > 0 ? 0.3 : 0), Math.abs(dz)/2 + (Math.abs(dx) > 0 ? 0.3 : 0), height);
    // visible posts give the perimeter a proper fenced-in airport look
    for (let t = 0; t <= 1.001; t += 0.12) {
      const px = x1 + dx*t, pz = z1 + dz*t;
      world.add(new THREE.BoxGeometry(0.35, height + 0.35, 0.35), 0x37474f, px, (height+0.35)/2, pz);
    }
    return m;
  };
  fence(-128, 120, -24, 120); fence(-128, 120, -128, 182);
  fence(-128, 182, -24, 182); fence(-24, 120, -24, 182);

  // ---------- IMPORTANT CITY SERVICES / SHOPPING DISTRICT ----------
  // Shop shells have a deliberately open front doorway (no door panel).
  const storefront = (x, z, w, d, h, wall, roofColor, signColor, name) => {
    const t = 0.65;
    // back and side walls; front wall is split around a wide open entrance
    box(w, h, t, wall, x, 0.05, z + d/2 - t/2);
    box(t, h, d, wall, x - w/2 + t/2, 0.05, z);
    box(t, h, d, wall, x + w/2 - t/2, 0.05, z);
    box((w-3.2)/2, h, t, wall, x - (w+3.2)/4, 0.05, z - d/2 + t/2);
    box((w-3.2)/2, h, t, wall, x + (w+3.2)/4, 0.05, z - d/2 + t/2);
    // Header and roof are visual-only so the open entrance stays passable.
    world.add(new THREE.BoxGeometry(3.2, 0.6, t), wall, x, h - 0.25, z - d/2 + t/2);
    const roofSlab = world.add(new THREE.BoxGeometry(w+1.2, 0.55, d+1.2), roofColor, x, h+0.15, z);
    roofSlab.castShadow = true;
    // brightly coloured sign over the open entrance
    const sign = world.add(new THREE.BoxGeometry(w*0.78, 1.1, 0.18), signColor, x, h-0.2, z-d/2-0.48);
    sign.castShadow = false;
    // Two shallow entrance steps, a small awning and display windows beside the open door.
    world.add(new THREE.BoxGeometry(3.8,0.18,1.1),0xb0aaa0,x,0.18,z-d/2-0.85);
    world.add(new THREE.BoxGeometry(3.4,0.16,0.8),0xd7d4cb,x,0.34,z-d/2-1.65);
    world.add(new THREE.BoxGeometry(0.16,2.0,0.12),0x455a64,x-w/2+1.25,1.5,z-d/2-0.12);
    world.add(new THREE.BoxGeometry(0.16,2.0,0.12),0x455a64,x+w/2-1.25,1.5,z-d/2-0.12);
    // leave the floor clear so the doorway reads as open so pedestrians can approach
    world.mapRects.push({ kind: 'shop', x, z, w, d, name });
  };
  // Small commercial strip east of the highway, connected to the road network.
  patch(174, 260, 72, 146, 0x8b9185, 0.12);
  patch(270, 330, 72, 146, 0x8b9185, 0.12);
  patch(168, 266, 106, 112, MAP.ROAD, 0.11); // access lane
  storefront(188, 88, 16, 12, 5.2, 0xd7c4a1, 0x795548, 0xc62828, 'GUN SHOP');
  storefront(210, 88, 18, 12, 5.2, 0xe0c7a4, 0x37474f, 0x1565c0, 'MARKET');
  storefront(234, 88, 20, 14, 6.0, 0xaaa7b0, 0x37474f, 0x6a1b9a, 'CLUB');
  storefront(190, 128, 20, 14, 5.5, 0xb7c8cc, 0x455a64, 0xf9a825, 'CAR SHOP');
  storefront(216, 128, 18, 14, 5.5, 0xc6c6bd, 0x455a64, 0x2e7d32, 'AUTO REPAIR');
  storefront(242, 128, 18, 14, 5.5, 0xf1e0c5, 0x8d6e63, 0x1565c0, 'PHARMACY');
  // Extra useful landmarks: medical clinic, police post, fuel station and motel.
  storefront(286, 90, 22, 16, 6.2, 0xe8e8e8, 0x607d8b, 0xc62828, 'CLINIC');
  storefront(314, 90, 20, 16, 6.2, 0xb8c6d1, 0x455a64, 0x1565c0, 'POLICE');
  storefront(286, 130, 20, 14, 5.5, 0xf4e6bd, 0x6d4c41, 0xf9a825, 'FUEL');
  storefront(314, 130, 22, 14, 5.5, 0xe3c5a3, 0x6d4c41, 0x2e7d32, 'MOTEL');

  // ---------- CONNECTED TOWN STREET GRID + HIGHWAY ----------
  // Main highway and a set of smaller streets connect the shops, housing and services.
  patch(-4, L, 156, 164, MAP.ROAD, 0.09);
  for (let x = -2; x < L; x += 12) patch(x, x + 5, 159.8, 160.2, 0xe0c940, 0.12);
  // Collector streets form a walkable, drivable loop through the commercial district.
  patch(30, 126, 76, 82, MAP.ROAD, 0.105);  // residential street north
  patch(30, 126, 110, 116, MAP.ROAD, 0.105); // residential street between rows
  patch(30, 126, 148, 154, MAP.ROAD, 0.105); // link to the highway
  patch(61, 65, 78, 154, MAP.ROAD, 0.105);
  patch(91, 95, 78, 154, MAP.ROAD, 0.105);
  patch(160, 342, 68, 75, MAP.ROAD, 0.105);
  patch(160, 342, 150, 157, MAP.ROAD, 0.105);
  patch(164, 171, 70, 155, MAP.ROAD, 0.105);
  patch(258, 265, 70, 155, MAP.ROAD, 0.105);
  patch(338, 345, 70, 155, MAP.ROAD, 0.105);
  // Short access lanes connect each row of shops directly to the street grid.
  patch(174, 266, 102, 108, MAP.ROAD, 0.11);
  patch(174, 266, 142, 148, MAP.ROAD, 0.11);
  patch(272, 334, 102, 108, MAP.ROAD, 0.11);
  patch(272, 334, 142, 148, MAP.ROAD, 0.11);
  // Sidewalks and crosswalks at key junctions.
  [[174,98,266,100],[174,138,266,140],[272,98,334,100],[272,138,334,140]].forEach(a => patch(a[0],a[2],a[1],a[1]+0.7,0xc5c2b9,0.13));
  [168,258,338].forEach(x => {
    for (let i=0;i<6;i++) patch(x-1.5+i*0.6,x-1.1+i*0.6,112,118,0xf5f5f5,0.13);
  });
  // Small parking bays and painted stalls in front of retail buildings.
  patch(178, 254, 78, 86, 0x55575a, 0.11);
  for (let x=180; x<252; x+=6) patch(x,x+0.25,78,85,0xf5f5f5,0.13);

  // Residential lot builder: every detached house gets a private lawn, path,
  // front steps, driveway, garage and a low fence with an open vehicle entrance.
  const residentialLot = (x, z, wall, roofColor, variant=0) => {
    patch(x-13, x+13, z-13, z+13, variant%2 ? 0x79ad58 : 0x83b85e, 0.14); // private lawn
    // Low garden fence, deliberately leaving the driveway/front walk open.
    const fenceColor = 0xe2d8bc;
    box(25, 0.85, 0.35, fenceColor, x, 0.14, z+12.6);
    box(0.35, 0.85, 25, fenceColor, x-12.6, 0.14, z);
    box(0.35, 0.85, 25, fenceColor, x+12.6, 0.14, z);
    box(8, 0.85, 0.35, fenceColor, x-8.5, 0.14, z-12.6);
    box(8, 0.85, 0.35, fenceColor, x+8.5, 0.14, z-12.6);
    // front path and 3 visible steps up to the open front door
    patch(x-1.2, x+1.2, z-12.2, z-5.0, 0xb8b5ad, 0.16);
    [0,1,2].forEach(i => world.add(new THREE.BoxGeometry(2.8,0.22,0.85),0xaaa9a4,x,0.22+i*0.12,z-5.2+i*0.8));
    world.house(x, z, wall, roofColor);
    // garage is beside the house, with an open dark bay facing the driveway.
    const gx=x+(variant%2 ? -8 : 8), gz=z+1;
    patch(Math.min(x,gx)-3,Math.max(x,gx)+3,z-3,z+5,0x777a7c,0.15);
    box(6.2,3.4,5.8,0xd7d7d2,gx,0.15,gz);
    box(4.1,2.7,0.18,0x30363a,gx,0.15,gz-2.92); // open garage bay reads as dark opening
    // flat garage roof and a short driveway to the street side
    world.add(new THREE.BoxGeometry(6.8,0.35,6.4),0x55575a,gx,3.7,gz);
    patch(gx-3.2,gx+3.2,z-12.5,z-5.0,0x9b9c99,0.16);
    // shrubs and a small tree add scale without blocking the front gate.
    [-9,9].forEach(dx => {
      world.add(new THREE.SphereGeometry(0.75,7,6),0x397a35,x+dx,0.65,z+8.8);
    });
    world.tree(x+(variant%2 ? 9.5 : -9.5),z+8,0.7);
  };

  // Main town: homes sit on individual lawns with garages, steps and driveways.
  [[48,130],[78,130],[108,130],[48,94],[78,94],[108,94]].forEach((p,i) => {
    residentialLot(p[0],p[1],CONFIG.WALLS[i%CONFIG.WALLS.length],CONFIG.ROOFS[i%CONFIG.ROOFS.length],i);
  });
  // Lakeside village: two short residential streets, all tied into the collector road.
  patch(300, 470, -224, -128, 0x7fae5c, 0.17);
  patch(315, 455, -185, -177, MAP.ROAD, 0.09);
  patch(340, 348, -215, -145, MAP.ROAD, 0.09);
  [[330,-202],[360,-202],[390,-202],[420,-202],[330,-155],[365,-155],[400,-155],[435,-155]].forEach((p,i) => {
    residentialLot(p[0],p[1],CONFIG.WALLS[(i+2)%CONFIG.WALLS.length],CONFIG.ROOFS[(i+1)%CONFIG.ROOFS.length],i);
  });
  // Rural farm homes retain larger green yards and simple access paths.
  [[16,92],[30,92]].forEach((p,i) => residentialLot(p[0],p[1],0xfff9c4,0x5d4037,i+1));

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
  // Eastern lakeside service station, connected to the village road.
  box(14, 4, 10, 0xf9a825, 445, 0.05, -195);
  world.add(new THREE.BoxGeometry(7,0.25,5),0x455a64,445,4.3,-195); // station canopy
  [442,448].forEach(x => box(0.35,3.2,0.35,0xeeeeee,x,0.15,-195));
  [442,448].forEach(x => box(0.8,1.4,0.8,0xc62828,x,0.15,-192));
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
  // Exactly two distant mountain formations; low-poly layered slopes keep them readable.
  const mountain = (x, z, scale, tint) => {
    const baseRock = world.add(new THREE.ConeGeometry(34 * scale, 44 * scale, 7, 2), tint, x, 22 * scale, z);
    baseRock.rotation.y = 0.35;
    baseRock.scale.set(1.35, 1, 0.9);
    baseRock.castShadow = true;
    const snowCap = world.add(new THREE.ConeGeometry(13 * scale, 17 * scale, 7, 1), 0xb8c0c2, x - 3 * scale, 38 * scale, z - 1 * scale);
    snowCap.rotation.y = 0.35;
    snowCap.scale.set(1.2, 1, 0.9);
  };
  mountain(-500, -250, 1.0, 0x69736f);
  mountain(500, 250, 1.15, 0x737a78);

  // Countryside dressing: scattered shrubs and mixed-size stones. Keep roads, water,
  // airport, dockyard and dense city blocks clear using the existing free-land test.
  for (let i = 0; i < 1150; i++) {
    const x = (rnd() - 0.5) * 2 * (L - 18), z = (rnd() - 0.5) * 2 * (L - 18);
    if (!world.freeLand(x, z)) continue;
    if (Math.abs(x) < 142 && Math.abs(z) < 164) continue;
    if (MAP.riverDist(x, z) < 10) continue;
    if (i % 3 !== 0) {
      const bush = world.add(new THREE.SphereGeometry(0.7 + rnd() * 1.1, 7, 5), [0x2f6e32, 0x3f8138, 0x547f35, 0x698f42][Math.floor(rnd()*4)], x, 0.55, z);
      bush.scale.set(1.25 + rnd(), 0.7 + rnd() * 0.4, 0.9 + rnd() * 0.7);
      bush.castShadow = true;
    } else {
      const size = 0.45 + rnd() * (i % 9 === 0 ? 2.0 : 0.8);
      const rock = world.add(new THREE.DodecahedronGeometry(size, 0), 0x777a76, x, size * 0.55, z);
      rock.scale.set(1.1 + rnd() * 0.8, 0.6 + rnd() * 0.5, 0.8 + rnd() * 0.8);
      rock.castShadow = true;
    }
  }

  // Increase vegetation density to fill the larger exploration area.
  // Reduced by 60% from the previous over-dense version (7200 -> 2880).
  for (let i = 0; i < 2880; i++) {
    const x = (rnd() - 0.5) * 2 * (L - 4), z = (rnd() - 0.5) * 2 * (L - 4);
    if (!world.freeLand(x, z)) continue;
    world.tree(x, z, 0.9 + rnd() * 0.8);
  }
  // a few trees at the farms and town (drawn with the Tree.glb prop later)
  world.mapTreeSpots = [[-120, 120], [-28, 84], [4, 118], [54, 150], [100, 150], [140, 150], [-70, 176], [24, 170]];

  // ---------- CONTINUOUS ISLAND SHORELINE ----------
  // A static ocean ring with a rounded, gently irregular inner coast makes the whole
  // playable region read as one island, with ocean visible on every side. No animation.
  const coastPoints = (radiusOffset = 0) => {
    const pts = [];
    for (let i = 0; i < 144; i++) {
      const a = i / 144 * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const radius = 620 / Math.pow(Math.pow(c, 4) + Math.pow(s, 4), 0.25)
        * (1 + 0.025 * Math.sin(3 * a + 0.6) + 0.018 * Math.sin(7 * a)) + radiusOffset;
      pts.push([Math.cos(a) * radius, Math.sin(a) * radius]);
    }
    return pts;
  };
  const ring = (outerPts, innerPts, color, y) => {
    const shape = new THREE.Shape();
    shape.moveTo(-900, -900); shape.lineTo(900, -900); shape.lineTo(900, 900); shape.lineTo(-900, 900); shape.closePath();
    const hole = new THREE.Path();
    // THREE.Shape holes must wind opposite to the outer contour. Reverse the
    // coastline points so the ocean is drawn outside the island, not over it.
    innerPts.slice().reverse().forEach((p, i) => i ? hole.lineTo(p[0], p[1]) : hole.moveTo(p[0], p[1]));
    hole.closePath(); shape.holes.push(hole);
    const geo = new THREE.ShapeGeometry(shape);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; mesh.frustumCulled = false;
    mesh.castShadow = false; mesh.receiveShadow = false; world.scene.add(mesh);
  };
  // Sand lies just outside the grass edge; ocean fills everything beyond it.
  ring(null, coastPoints(8), MAP.WATER, 0.025);
  const beachShape = new THREE.Shape();
  const beachOuter = coastPoints(7), beachInner = coastPoints(-1);
  beachOuter.forEach((p, i) => i ? beachShape.lineTo(p[0], p[1]) : beachShape.moveTo(p[0], p[1]));
  beachShape.closePath();
  const beachHole = new THREE.Path();
  beachInner.slice().reverse().forEach((p, i) => i ? beachHole.lineTo(p[0], p[1]) : beachHole.moveTo(p[0], p[1]));
  beachHole.closePath(); beachShape.holes.push(beachHole);
  const beachMesh = new THREE.Mesh(new THREE.ShapeGeometry(beachShape), new THREE.MeshLambertMaterial({ color: MAP.SAND, side: THREE.DoubleSide }));
  beachMesh.rotation.x = -Math.PI / 2; beachMesh.position.y = 0.045; beachMesh.frustumCulled = false; world.scene.add(beachMesh);
};
