// Reference-matched road network: a compact central street grid connects the
// northern town, western suburbs, eastern safehouse, and southeast dockyard.
world.initRoads = function() {
  const THREE = window.THREE;
  if (!world.scene || !THREE || typeof MAP === 'undefined') return;

  const toWorld = ([px, py]) => [(px - 495) * 0.97, (py - 260) * 0.97];
  const paths = [
    { name: 'city-loop', width: 14, points: [[377, 278], [395, 289], [416, 306], [439, 323], [458, 342], [478, 364], [501, 382], [524, 394], [550, 397], [578, 392], [605, 382], [631, 366], [656, 348], [680, 330], [703, 312], [721, 292], [730, 274], [716, 258], [696, 244], [674, 228], [651, 211], [628, 198], [605, 192], [583, 196], [561, 208], [540, 223], [519, 239], [497, 254], [474, 265], [451, 273], [428, 280], [402, 286], [377, 278]] },
    { name: 'north-arterial', width: 12, points: [[607, 171], [594, 188], [578, 204], [559, 219], [540, 235], [519, 251], [498, 267], [478, 284], [458, 302], [438, 321]] },
    { name: 'west-arterial', width: 11, points: [[438, 321], [411, 316], [383, 307], [354, 300], [326, 297], [299, 296], [275, 299]] },
    { name: 'town-connector', width: 10, points: [[474, 265], [455, 244], [437, 221], [419, 198], [402, 177], [384, 157], [365, 141]] },
    { name: 'safehouse-connector', width: 10, points: [[696, 244], [715, 228], [734, 210], [753, 193], [773, 178], [792, 169]] },
    { name: 'dock-connector', width: 12, points: [[703, 312], [727, 328], [749, 345], [771, 363], [792, 382], [814, 397], [838, 408]] },
    { name: 'grid-west-1', width: 9, points: [[451, 246], [455, 271], [461, 298], [469, 326], [481, 353], [501, 382]] },
    { name: 'grid-west-2', width: 9, points: [[491, 225], [494, 250], [499, 276], [507, 302], [519, 329], [535, 357], [550, 397]] },
    { name: 'grid-center', width: 9, points: [[535, 207], [537, 233], [540, 259], [545, 286], [553, 313], [564, 340], [578, 392]] },
    { name: 'grid-east-1', width: 9, points: [[580, 194], [583, 220], [589, 247], [596, 275], [604, 302], [615, 329], [631, 366]] },
    { name: 'grid-east-2', width: 9, points: [[626, 198], [631, 224], [638, 250], [647, 276], [658, 302], [680, 330]] },
    { name: 'cross-street-north', width: 9, points: [[440, 251], [466, 243], [493, 236], [520, 231], [547, 226], [575, 220], [603, 214], [631, 211], [654, 216]] },
    { name: 'cross-street-mid', width: 10, points: [[421, 285], [446, 281], [471, 278], [498, 276], [526, 276], [554, 278], [583, 281], [611, 285], [639, 291], [668, 300], [693, 309]] },
    { name: 'cross-street-south', width: 9, points: [[455, 330], [482, 324], [509, 320], [537, 319], [565, 320], [593, 322], [621, 326], [649, 332], [672, 340]] },
    { name: 'suburb-loop', width: 8, points: [[185, 284], [204, 271], [228, 269], [250, 279], [263, 298], [257, 318], [237, 329], [213, 324], [196, 307], [185, 284]] },
    { name: 'town-street', width: 7, points: [[298, 103], [319, 112], [341, 122], [360, 135], [376, 151]] },
    { name: 'harbour-quay-road', width: 8, points: [[758, 378], [781, 388], [804, 397], [829, 404]] }
  ].map((road) => ({ ...road, points: road.points.map(toWorld) }));

  world.roadPaths = paths;
  world.roadCenterlines = paths.map(({ name, points, width }) => ({ name, points, width }));

  const roadMaterial = new THREE.MeshLambertMaterial({
    color: 0x464b4d,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  const curbMaterial = new THREE.MeshLambertMaterial({ color: 0x777b76, side: THREE.DoubleSide });
  const sidewalkMaterial = new THREE.MeshLambertMaterial({ color: 0xb9b6a8, side: THREE.DoubleSide });

  // add a point every ~3 m so the road hugs the hills (a point every 25 m let the grass poke through)
  const densify = (pts, step = 3) => {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
    }
    return out;
  };
  const ribbonMesh = (points, width, material, yOffset) => {
    points = densify(points);
    const positions = [];
    const indices = [];
    points.forEach((point, index) => {
      const previous = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      const dx = next[0] - previous[0];
      const dz = next[1] - previous[1];
      const length = Math.hypot(dx, dz) || 1;
      const nx = (-dz / length) * width * 0.5;
      const nz = (dx / length) * width * 0.5;
      const y = (MAP.heightAt ? MAP.heightAt(point[0], point[1]) : 0.2) + yOffset;
      positions.push(point[0] + nx, y, point[1] + nz);
      positions.push(point[0] - nx, y, point[1] - nz);
    });
    for (let i = 0; i < points.length - 1; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    world.scene.add(mesh);
    return mesh;
  };

  const addLaneDashes = (points) => {
    const vertices = [];
    const dashLength = 4.8;
    const gapLength = 5.8;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const length = Math.hypot(dx, dz);
      const ux = dx / (length || 1);
      const uz = dz / (length || 1);
      for (let distance = 0; distance < length; distance += dashLength + gapLength) {
        const end = Math.min(length, distance + dashLength);
        const x0 = a[0] + ux * distance;
        const z0 = a[1] + uz * distance;
        const x1 = a[0] + ux * end;
        const z1 = a[1] + uz * end;
        const y0 = (MAP.heightAt ? MAP.heightAt(x0, z0) : 0.2) + 0.47;
        const y1 = (MAP.heightAt ? MAP.heightAt(x1, z1) : 0.2) + 0.47;
        vertices.push(x0, y0, z0, x1, y1, z1);
      }
    }
    return vertices;
  };

  const allDashes = [];
  paths.forEach((road) => {
    ribbonMesh(road.points, road.width + 6, curbMaterial, 0.28);
    ribbonMesh(road.points, road.width + 3, sidewalkMaterial, 0.33);
    ribbonMesh(road.points, road.width, roadMaterial, 0.43);
    if (road.width >= 10) allDashes.push(...addLaneDashes(road.points));
  });
  if (allDashes.length) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(allDashes, 3));
    const markings = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xe2c86b, transparent: true, opacity: 0.82 })
    );
    markings.frustumCulled = false;
    world.scene.add(markings);
  }

  world.roadNetworkBuilt = true;
};
