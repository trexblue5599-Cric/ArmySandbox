// Reference-matched island map and terrain surface.
// Coordinates are measured from the supplied 1024 x 576 illustrated map and
// converted to the existing game's X/Z world coordinates.
const MAP_REF_SCALE = 0.97;
const mapPoint = ([px, py]) => [(px - 495) * MAP_REF_SCALE, (py - 260) * MAP_REF_SCALE];
const mapLine = (points) => points.map(mapPoint);

const MAP = {
  WATER: 0x087eb0,
  SAND: 0xf0d49a,
  GRASS: 0x78b957,
  EDGE: 410, // retained for older modules which use this compatibility value
  BEACH: 23,
  SEA: 720,

  // Main coastline follows the reference image's broad east-west silhouette,
  // north mountain headland, western coves, and scalloped southern coast.
  COAST: mapLine([
    [538, 20], [554, 30], [568, 46], [590, 48], [615, 45], [638, 48],
    [660, 57], [680, 69], [691, 83], [688, 98], [704, 91], [722, 75],
    [744, 68], [765, 70], [785, 81], [802, 98], [814, 119], [823, 143],
    [837, 163], [856, 176], [878, 188], [895, 204], [906, 222], [907, 240],
    [899, 256], [893, 270], [899, 286], [906, 301], [900, 319], [891, 335],
    [897, 350], [905, 365], [900, 382], [891, 400], [878, 418], [860, 433],
    [840, 444], [817, 450], [796, 458], [778, 470], [756, 481], [736, 489],
    [716, 492], [700, 480], [686, 465], [666, 456], [645, 451], [623, 451],
    [604, 455], [586, 462], [566, 462], [548, 458], [533, 462], [517, 473],
    [500, 483], [480, 491], [458, 498], [436, 499], [416, 494], [397, 485],
    [379, 478], [357, 477], [334, 481], [312, 482], [292, 477], [273, 469],
    [254, 466], [237, 464], [223, 455], [212, 462], [202, 473], [185, 469],
    [167, 463], [151, 452], [142, 436], [136, 416], [130, 394], [123, 374],
    [111, 355], [98, 338], [88, 320], [83, 301], [84, 282], [92, 264],
    [88, 247], [91, 232], [101, 218], [115, 205], [127, 191], [140, 177],
    [157, 169], [174, 165], [188, 154], [194, 139], [191, 123], [197, 108],
    [211, 96], [230, 87], [252, 80], [277, 75], [301, 69], [324, 63],
    [347, 56], [370, 52], [392, 53], [414, 55], [435, 49], [454, 47],
    [472, 41], [489, 32], [507, 26], [524, 23]
  ]),

  // Small offshore keys visible in the reference (west/south and northeast).
  ISLETS: [
    mapLine([[830, 69], [841, 62], [855, 64], [868, 71], [871, 81], [861, 89], [844, 88], [832, 81]]),
    mapLine([[188, 503], [195, 496], [203, 501], [204, 510], [198, 516], [190, 512]]),
    mapLine([[238, 505], [250, 496], [265, 498], [276, 506], [272, 515], [257, 520], [244, 516]]),
    mapLine([[550, 502], [560, 496], [567, 501], [565, 510], [557, 515], [551, 510]])
  ],

  // Several connected channels reproduce the broad river system and branches.
  RIVERS: [
    mapLine([
      [719, 102], [702, 112], [680, 123], [655, 136], [627, 148], [600, 157],
      [572, 163], [545, 166], [517, 165], [490, 164], [465, 164], [441, 168],
      [416, 174], [391, 181], [365, 185], [343, 193], [324, 204], [307, 217],
      [294, 231], [299, 244], [314, 253], [322, 270], [322, 292], [320, 315],
      [319, 339], [318, 363], [313, 385], [309, 409], [306, 433], [307, 454],
      [309, 472], [319, 483]
    ]),
    mapLine([
      [397, 101], [416, 104], [432, 112], [444, 125], [452, 140], [457, 157],
      [466, 164]
    ]),
    mapLine([
      [307, 416], [331, 407], [354, 399], [377, 390], [401, 382], [425, 373],
      [448, 365], [467, 353], [481, 338], [494, 324], [514, 318], [535, 315],
      [553, 307], [573, 297], [594, 287], [616, 279], [640, 272], [664, 260],
      [685, 244]
    ]),
    mapLine([
      [404, 381], [421, 393], [439, 403], [458, 407], [478, 403], [495, 394],
      [513, 390], [531, 394], [550, 405], [568, 412], [588, 411]
    ])
  ],
  RIVER_WIDTH: 14,

  // Low green ridges in the eastern interior; the large northern peaks are
  // built as detailed geometry by world-fill.js.
  HILLS: [
    { x: 93, z: 4, rx: 43, rz: 20, h: 1.35 },
    { x: 127, z: 19, rx: 34, rz: 18, h: 1.55 },
    { x: 162, z: 31, rx: 39, rz: 20, h: 1.8 },
    { x: 198, z: 48, rx: 35, rz: 19, h: 1.6 },
    { x: 225, z: 70, rx: 30, rz: 17, h: 1.25 },
    { x: 149, z: 84, rx: 34, rz: 19, h: 1.1 },
    { x: -236, z: -31, rx: 25, rz: 18, h: 0.65 },
    { x: -177, z: -124, rx: 28, rz: 17, h: 0.7 },
    { x: 95, z: 173, rx: 35, rz: 19, h: 0.8 },
    { x: -70, z: 182, rx: 29, rz: 16, h: 0.55 }
  ],

  PONDS: [
    { x: 399, y: 103, rx: 25, ry: 12 },
    { x: 552, y: 233, rx: 26, ry: 10 },
    { x: 616, y: 231, rx: 23, ry: 13 },
    { x: 671, y: 229, rx: 28, ry: 16 },
    { x: 205, y: 364, rx: 31, ry: 12 },
    { x: 444, y: 377, rx: 23, ry: 10 },
    { x: 509, y: 389, rx: 22, ry: 9 },
    { x: 574, y: 399, rx: 18, ry: 8 }
  ].map((pond) => {
    const [x, z] = mapPoint([pond.x, pond.y]);
    return { x, z, rx: pond.rx * MAP_REF_SCALE, rz: pond.ry * MAP_REF_SCALE };
  }),

  containsLand(x, z) {
    return [this.COAST, ...this.ISLETS].some((polygon) => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, zi] = polygon[i];
        const [xj, zj] = polygon[j];
        const crosses = (zi > z) !== (zj > z);
        if (crosses && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
      }
      return inside;
    });
  },

  coastDist(x, z) {
    let best = Infinity;
    [this.COAST, ...this.ISLETS].forEach((polygon) => {
      for (let i = 0; i < polygon.length; i++) {
        const [ax, az] = polygon[i];
        const [bx, bz] = polygon[(i + 1) % polygon.length];
        const dx = bx - ax;
        const dz = bz - az;
        const lengthSq = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
        best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
      }
    });
    return best;
  },

  riverDist(x, z) {
    let best = Infinity;
    this.RIVERS.forEach((line) => {
      for (let i = 1; i < line.length; i++) {
        const [ax, az] = line[i - 1];
        const [bx, bz] = line[i];
        const dx = bx - ax;
        const dz = bz - az;
        const lengthSq = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSq));
        best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
      }
    });
    return best;
  },

  inRiver(x, z) {
    if (this.riverDist(x, z) >= this.RIVER_WIDTH * 0.46) return false;
    // a road laid across the river is a bridge: you can walk and drive on it
    if (typeof world !== 'undefined' && world.roadGap && world.roadPaths && world.roadGap(x, z) < 3) return false;
    return true;
  },
  inRiverRaw(x, z) {
    return this.riverDist(x, z) < this.RIVER_WIDTH * 0.46;
  },

  blocked(x, z) {
    return !this.containsLand(x, z) || this.inRiver(x, z);
  },

  inWater(x, z) {
    return this.blocked(x, z);
  },

  // Gentle, deterministic elevation for the island's grassy interior.
  heightAt(x, z) {
    const edge = Math.min(1, this.coastDist(x, z) / 28);
    let height = 0.22
      + 0.13 * Math.sin(x * 0.036 + z * 0.018)
      + 0.1 * Math.cos(z * 0.041 - x * 0.013)
      + 0.06 * Math.sin((x + z) * 0.073);
    this.HILLS.forEach((hill) => {
      const dx = (x - hill.x) / hill.rx;
      const dz = (z - hill.z) / hill.rz;
      height += hill.h * Math.exp(-2.2 * (dx * dx + dz * dz));
    });
    return Math.max(0.08, height * (0.35 + 0.65 * edge));
  }
};

world.freeLand = (x, z) => MAP.containsLand(x, z) && !MAP.inRiver(x, z);

world.initMap = function() {
  const THREE = window.THREE;
  if (!world.scene || !THREE) return;

  const { flat, obstacle } = world;
  flat(2400, 2400, MAP.WATER, 0, -0.08, 0, 0.02);
  world.mapRects.push({ kind: 'w', x: 0, z: 0, w: 2400, d: 2400 });

  const shapeFrom = (points, scale = 1) => {
    const shape = new THREE.Shape();
    const cx = points.reduce((sum, point) => sum + point[0], 0) / points.length;
    const cz = points.reduce((sum, point) => sum + point[1], 0) / points.length;
    points.forEach((point, index) => {
      const x = cx + (point[0] - cx) * scale;
      const z = cz + (point[1] - cz) * scale;
      if (index === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    return shape;
  };

  const addPolygon = (points, color, y, scale = 1, opacity = 1) => {
    const geometry = new THREE.ShapeGeometry(shapeFrom(points, scale), 2);
    const material = new THREE.MeshLambertMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    mesh.receiveShadow = true;
    world.scene.add(mesh);
    return mesh;
  };

  const addCoastLine = (points, scale, y, color, opacity) => {
    const center = points.reduce(
      (sum, point) => [sum[0] + point[0] / points.length, sum[1] + point[1] / points.length],
      [0, 0]
    );
    const positions = [];
    points.forEach(([x, z]) => {
      positions.push(
        center[0] + (x - center[0]) * scale,
        y,
        center[1] + (z - center[1]) * scale
      );
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const line = new THREE.LineLoop(
      geometry,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
    );
    line.frustumCulled = false;
    world.scene.add(line);
  };

  // Pale beach wraps the land; a shallow turquoise shelf and two fine surf
  // lines make the island visibly separate from the open ocean.
  addPolygon(MAP.COAST, 0x1594b8, -0.055, 1.105, 0.68);
  addPolygon(MAP.COAST, MAP.SAND, 0.005, 1.052);
  addPolygon(MAP.COAST, MAP.GRASS, 0.025, 1);
  MAP.ISLETS.forEach((islet) => {
    addPolygon(islet, 0x1594b8, -0.052, 1.22, 0.62);
    addPolygon(islet, MAP.SAND, 0.006, 1.11);
    addPolygon(islet, MAP.GRASS, 0.026, 1);
  });
  addCoastLine(MAP.COAST, 1.061, 0.016, 0xc9fff1, 0.86);
  addCoastLine(MAP.COAST, 1.086, -0.018, 0x57d5e3, 0.56);
  MAP.ISLETS.forEach((islet) => {
    addCoastLine(islet, 1.125, 0.014, 0xc9fff1, 0.75);
  });

  const buildTerrain = () => {
    const xs = MAP.COAST.map((point) => point[0]);
    const zs = MAP.COAST.map((point) => point[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const step = 8;
    const columns = Math.ceil((maxX - minX) / step) + 1;
    const rows = Math.ceil((maxZ - minZ) / step) + 1;
    const positions = new Float32Array(columns * rows * 3);
    const colors = new Float32Array(columns * rows * 3);
    const baseColor = new THREE.Color(0x77b653);
    const ridgeColor = new THREE.Color(0x598c42);
    const vertex = (column, row) => row * columns + column;

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const index = vertex(column, row);
        const x = Math.min(maxX, minX + column * step);
        const z = Math.min(maxZ, minZ + row * step);
        const y = MAP.heightAt(x, z) + 0.045;
        positions[index * 3] = x;
        positions[index * 3 + 1] = y;
        positions[index * 3 + 2] = z;

        const tint = THREE.MathUtils.clamp((y - 0.28) / 2.8, 0, 0.48);
        const color = baseColor.clone().lerp(ridgeColor, tint);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }
    }

    const indices = [];
    for (let row = 0; row < rows - 1; row++) {
      for (let column = 0; column < columns - 1; column++) {
        const x = Math.min(maxX, minX + (column + 0.5) * step);
        const z = Math.min(maxZ, minZ + (row + 0.5) * step);
        const corners = [
          [Math.min(maxX, minX + column * step), Math.min(maxZ, minZ + row * step)],
          [Math.min(maxX, minX + (column + 1) * step), Math.min(maxZ, minZ + row * step)],
          [Math.min(maxX, minX + column * step), Math.min(maxZ, minZ + (row + 1) * step)],
          [Math.min(maxX, minX + (column + 1) * step), Math.min(maxZ, minZ + (row + 1) * step)]
        ];
        if (!MAP.containsLand(x, z) || MAP.riverDist(x, z) < 10.5) continue;
        if (corners.some(([cx, cz]) => !MAP.containsLand(cx, cz) || MAP.riverDist(cx, cz) < 9)) continue;

        const a = vertex(column, row);
        const b = vertex(column + 1, row);
        const c = vertex(column, row + 1);
        const d = vertex(column + 1, row + 1);
        indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const terrain = new THREE.Mesh(
      geometry,
      new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })
    );
    terrain.receiveShadow = true;
    terrain.castShadow = false;
    terrain.frustumCulled = false;
    world.scene.add(terrain);
  };
  buildTerrain();

  const ribbon = (points, width) => {
    const left = [];
    const right = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[Math.max(0, i - 1)];
      const b = points[Math.min(points.length - 1, i + 1)];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const length = Math.hypot(dx, dz) || 1;
      const nx = (-dz / length) * width * 0.5;
      const nz = (dx / length) * width * 0.5;
      left.push([points[i][0] + nx, points[i][1] + nz]);
      right.push([points[i][0] - nx, points[i][1] - nz]);
    }
    return left.concat(right.reverse());
  };

  MAP.RIVERS.forEach((river, index) => {
    const width = index === 0 ? MAP.RIVER_WIDTH : 8.5;
    addPolygon(ribbon(river, width + 5), 0x52c2d8, 0.08, 1);
    addPolygon(ribbon(river, width), 0x148dbb, 0.095, 1);
    addPolygon(ribbon(river, width * 0.68), 0x137da9, 0.101, 1);
  });

  MAP.PONDS.forEach((pond, index) => {
    const points = [];
    const count = 22;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const wobble = 0.9 + 0.08 * Math.sin(i * 2.4 + index) + 0.04 * Math.cos(i * 1.7);
      points.push([
        pond.x + Math.cos(angle) * pond.rx * wobble,
        pond.z + Math.sin(angle) * pond.rz * wobble
      ]);
    }
    addPolygon(points, 0x55bfd4, 0.08);
    addPolygon(points, 0x178bb5, 0.092, 0.78);
    addPolygon(points, 0x167da8, 0.099, 0.58);
  });

  // Fine, quiet wavelets keep the wide sea from reading as a flat blue slab.
  let seed = 0x4a17d3;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const wavePositions = [];
  for (let i = 0; i < 620; i++) {
    const x = (random() * 2 - 1) * 720;
    const z = (random() * 2 - 1) * 520;
    if (MAP.containsLand(x, z) || MAP.coastDist(x, z) < 17) continue;
    const length = 3.5 + random() * 11;
    const bend = (random() - 0.5) * 2.4;
    for (let segment = 0; segment < 2; segment++) {
      const x0 = x - length / 2 + segment * length / 2;
      const x1 = x0 + length / 2;
      const z0 = z + (segment === 0 ? 0 : bend);
      const z1 = z + (segment === 0 ? bend : 0);
      wavePositions.push(x0, -0.018, z0, x1, -0.018, z1);
    }
  }
  const waves = new THREE.BufferGeometry();
  waves.setAttribute('position', new THREE.Float32BufferAttribute(wavePositions, 3));
  world.scene.add(new THREE.LineSegments(
    waves,
    new THREE.LineBasicMaterial({ color: 0x73d6df, transparent: true, opacity: 0.36, depthWrite: false })
  ));

  const bounds = MAP.COAST.reduce((box, point) => ({
    minX: Math.min(box.minX, point[0]),
    maxX: Math.max(box.maxX, point[0]),
    minZ: Math.min(box.minZ, point[1]),
    maxZ: Math.max(box.maxZ, point[1])
  }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
  // (no island-wide obstacle: collision ignores heights, so it blocked ALL walking. Water is handled by world.inWaterSpot.)
  world.mapRects.push({
    kind: 'p',
    x: (bounds.minX + bounds.maxX) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
    w: bounds.maxX - bounds.minX,
    d: bounds.maxZ - bounds.minZ
  });
  world.mapTreeSpots = [];
};
