// js/world-props.js  -  street furniture + props, placed RELATIVE TO THE REAL ROADS AND BUILDINGS.
// (The old version used fixed coordinates from an older square city grid, so everything landed in the wrong place.)
//
//   world.planLamps()  - street lamps along the roads (instanced; runs BEFORE initBatches)
//   world.initProps()  - loads the .glb props from props/ and puts them:
//        * lamps / bins / hydrants / benches along the pavement edge of the roads
//        * traffic lights + stop signs at every junction
//        * mailboxes + washing lines at houses, ATMs / flower pots / fire exits / power boxes at buildings
//        * billboards beside the highways, cones on a road verge, boxes on the harbour quay
// Every spot is checked: land only, not in a river, not on a road, not inside a building, not on top of another prop.

(function() {
  const KERB = 2.3;                    // how far past the road edge furniture stands (road edge -> pavement/kerb strip)
  const taken = [];                    // every prop/lamp position already used: [x, z]
  world._propsTaken = taken;
  world._spotOk = spotOk;   // (kept for testing)

  const bldRects = () => world.mapRects.filter(r => r.kind === 'b');
  const rng = (function(a) { return function() { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })(777);

  // ---------- spot checks ----------
  function crowded(x, z, r) { for (let i = 0; i < taken.length; i++) if (Math.abs(taken[i][0] - x) < r && Math.abs(taken[i][1] - z) < r && Math.hypot(taken[i][0] - x, taken[i][1] - z) < r) return true; return false; }
  // opts: minRoad (min distance from any road edge), wall (allow standing right against a building), dock (quay is fine)
  function spotOk(x, z, opts) {
    opts = opts || {};
    const onDock = world.onDock && world.onDock(x, z);
    if (!onDock) {
      if (!MAP.containsLand(x, z) || MAP.coastDist(x, z) < 3) return false;
      if (MAP.riverDist(x, z) < MAP.RIVER_WIDTH * 0.46 + 2) return false;
    }
    if (world.roadGap(x, z) < (opts.minRoad === undefined ? 1.6 : opts.minRoad)) return false;
    if (crowded(x, z, opts.space || 2.2)) return false;
    const pad = opts.wall ? -0.1 : 0.8;
    for (const o of world.obstacles) {
      if (o.h > 1.2 && Math.abs(x - o.x) < o.hw + pad && Math.abs(z - o.z) < o.hd + pad) return false;
    }
    return true;
  }

  // ---------- walking along the roads ----------
  // returns samples {x, z, tx, tz (unit tangent), nx, nz (unit left normal), road, s} every 'step' metres
  function sampleRoad(road, step, start) {
    const out = [], pts = road.points;
    let carry = start || 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1];
      const L = Math.hypot(bx - ax, bz - az); if (L < 0.01) continue;
      const tx = (bx - ax) / L, tz = (bz - az) / L;
      while (carry <= L) { out.push({ x: ax + tx * carry, z: az + tz * carry, tx, tz, nx: -tz, nz: tx, road }); carry += step; }
      carry -= L;
    }
    return out;
  }
  const nearBuilding = (x, z, r) => { for (const b of bldRects()) if (Math.abs(x - b.x) < b.w / 2 + r && Math.abs(z - b.z) < b.d / 2 + r) return true; return false; };
  // nearest point on any road centre-line: {x, z, tx, tz, d, road}
  function nearestRoadPoint(x, z) {
    let best = null;
    for (const road of world.roadPaths) {
      const p = road.points;
      for (let i = 0; i < p.length - 1; i++) {
        const ax = p[i][0], az = p[i][1], dx = p[i + 1][0] - ax, dz = p[i + 1][1] - az, L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
        const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
        if (!best || d < best.d) { const L = Math.sqrt(L2); best = { x: px, z: pz, tx: dx / L, tz: dz / L, d, road }; }
      }
    }
    return best;
  }

  // ---------- junctions ----------
  function findJunctions() {
    const roads = world.roadPaths, list = [];
    const add = (x, z, a, b) => { if (!list.some(j => Math.hypot(j.x - x, j.z - z) < 14)) list.push({ x, z, a, b }); };
    const segDir = (road, x, z) => {   // direction of the road at a point
      const p = road.points; let best = 1e9, dir = [1, 0];
      for (let i = 0; i < p.length - 1; i++) {
        const dx = p[i + 1][0] - p[i][0], dz = p[i + 1][1] - p[i][1], L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - p[i][0]) * dx + (z - p[i][1]) * dz) / L2));
        const d = Math.hypot(x - (p[i][0] + dx * t), z - (p[i][1] + dz * t));
        if (d < best) { best = d; const L = Math.sqrt(L2); dir = [dx / L, dz / L]; }
      }
      return dir;
    };
    for (let i = 0; i < roads.length; i++) for (let j = i + 1; j < roads.length; j++) {
      const A = roads[i].points, B = roads[j].points;
      for (let a = 0; a < A.length - 1; a++) for (let b = 0; b < B.length - 1; b++) {
        const r = [A[a + 1][0] - A[a][0], A[a + 1][1] - A[a][1]], s = [B[b + 1][0] - B[b][0], B[b + 1][1] - B[b][1]];
        const den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-6) continue;
        const qp = [B[b][0] - A[a][0], B[b][1] - A[a][1]];
        const t = (qp[0] * s[1] - qp[1] * s[0]) / den, u = (qp[0] * r[1] - qp[1] * r[0]) / den;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) add(A[a][0] + r[0] * t, A[a][1] + r[1] * t, { road: roads[i], dir: segDir(roads[i], A[a][0] + r[0] * t, A[a][1] + r[1] * t) }, { road: roads[j], dir: segDir(roads[j], A[a][0] + r[0] * t, A[a][1] + r[1] * t) });
      }
    }
    // roads that END on another road (T junctions)
    roads.forEach((road, i) => [road.points[0], road.points[road.points.length - 1]].forEach(e => {
      roads.forEach((o, j) => {
        if (j === i) return;
        let best = null;
        for (let k = 0; k < o.points.length - 1; k++) {
          const dx = o.points[k + 1][0] - o.points[k][0], dz = o.points[k + 1][1] - o.points[k][1], L2 = dx * dx + dz * dz || 1;
          const t = Math.max(0, Math.min(1, ((e[0] - o.points[k][0]) * dx + (e[1] - o.points[k][1]) * dz) / L2));
          const d = Math.hypot(e[0] - (o.points[k][0] + dx * t), e[1] - (o.points[k][1] + dz * t));
          if (!best || d < best.d) best = { d, x: o.points[k][0] + dx * t, z: o.points[k][1] + dz * t };
        }
        if (best && best.d < 6) add(best.x, best.z, { road, dir: segDir(road, e[0], e[1]) }, { road: o, dir: segDir(o, best.x, best.z) });
      });
    }));
    return list;
  }

  // ---------- STREET LAMPS (instanced, drawn by world-batches.js) ----------
  world.planLamps = function() {
    world.lampList = world.lampList || [];
    // the lamps the harbour already added count as taken
    world.lampList.forEach(l => taken.push([l[0], l[1]]));
    world.roadPaths.forEach((road, ri) => {
      const urbanStep = road.width >= 10 ? 30 : 36;
      const samples = sampleRoad(road, urbanStep, 12 + (ri % 5) * 5);
      samples.forEach((sm, k) => {
        const urban = nearBuilding(sm.x, sm.z, 30);
        if (!urban && !(road.width >= 10 && k % 2 === 0)) return;   // open country: only the big roads, every other spot
        const side = k % 2 ? 1 : -1, off = road.width / 2 + KERB;
        const x = sm.x + sm.nx * off * side, z = sm.z + sm.nz * off * side;
        if (!spotOk(x, z, { space: 7 })) return;
        taken.push([x, z]);
        world.lampList.push([x, z]);
        world.obstacle(x, z, 0.2, 0.2, 6);
      });
    });
  };

  // ---------- GLB PROPS ----------
  world.initProps = function() {
    const want = [];
    // P: a prop at x,z. rot is the way it faces (radians). opts see spotOk.
    const P = (name, h, x, z, rot, solid, opts) => want.push({ name, h, x, z, rot: rot || 0, solid: !!solid, opts: opts || {} });
    // facing helpers: 'toward' is a direction (dx, dz) the front of the prop should look at
    const faceZ = (dx, dz) => Math.atan2(dx, dz);          // models whose front is +z (bin, mailbox, ATM, bench...)
    const faceX = (dx, dz) => Math.atan2(-dz, dx);         // models whose front is +x (stop sign, billboard)
    const faceArm = (dx, dz) => Math.atan2(dz, -dx);       // traffic light: its arm points along local -x, over the road

    const bl = bldRects();
    const roads = world.roadPaths;

    // --- 1. along the roads: bins, hydrants, benches in town ---
    roads.forEach((road, ri) => {
      if (road.width < 8) return;
      sampleRoad(road, 42, 20 + ri * 7).forEach((sm, k) => {
        if (!nearBuilding(sm.x, sm.z, 16)) return;
        const side = (k % 2) ? 1 : -1, off = road.width / 2 + KERB + 0.4;
        const x = sm.x + sm.nx * off * side, z = sm.z + sm.nz * off * side;
        const look = [-sm.nx * side, -sm.nz * side];           // faces the road
        const kind = k % 3;
        if (kind === 0) P('Fire hydrant', 0.85, x, z, faceZ(look[0], look[1]), true);
        else if (kind === 1) P('Trash Can', 1.0, x, z, faceZ(look[0], look[1]), true);
        else P('Bench', 0.9, x, z, faceZ(look[0], look[1]), true, { space: 3 });
      });
    });

    // --- 2. junctions: traffic lights on two corners, stop signs where a small road meets a big one ---
    findJunctions().forEach(j => {
      const wA = j.a.road.width, wB = j.b.road.width;
      if (Math.min(wA, wB) < 7) return;
      const big = Math.min(wA, wB) >= 9;
      const dA = j.a.dir, dB = j.b.dir;
      [[1, 1], [-1, -1]].forEach(([sa, sb]) => {
        if (!big) return;
        // the corner: out along road A and across road B (and the other way round)
        const nA = [-dA[1], dA[0]], nB = [-dB[1], dB[0]];
        for (let push = 0; push < 5; push += 1) {
          const ox = dA[0] * sa * (wB / 2 + KERB + push * 0.8) + nB[0] * sb * (wA / 2 + KERB + push * 0.8);
          const oz = dA[1] * sa * (wB / 2 + KERB + push * 0.8) + nB[1] * sb * (wA / 2 + KERB + push * 0.8);
          const x = j.x + ox, z = j.z + oz;
          if (!spotOk(x, z, { space: 3 })) continue;
          const len = Math.hypot(ox, oz) || 1;
          P('Traffic Light', 4.2, x, z, faceArm(-ox / len, -oz / len), true, { space: 3, pivotPole: true });
          break;
        }
      });
      if (!big) {
        // stop signs on the small road, one per approach, standing on the right-hand verge
        const small = wA < wB ? j.a : j.b, wide = wA < wB ? j.b : j.a;
        const dd = small.dir, nn = [-dd[1], dd[0]];
        [-1, 1].forEach(s => {
          const x = j.x + dd[0] * s * (wide.road.width / 2 + KERB + 1) + nn[0] * -s * (small.road.width / 2 + 1.2);
          const z = j.z + dd[1] * s * (wide.road.width / 2 + KERB + 1) + nn[1] * -s * (small.road.width / 2 + 1.2);
          if (spotOk(x, z, { space: 3 })) P('Stop sign', 2.6, x, z, faceX(dd[0] * s, dd[1] * s), true, { space: 3 });
        });
      }
    });

    // --- 3. buildings ---
    const houses = bl.filter(b => b.h < 5 && Math.abs(b.w - 9) < 0.01);
    const towns = bl.filter(b => b.h >= 5);
    houses.forEach((b, i) => {
      const np = nearestRoadPoint(b.x, b.z);
      if (np && np.d < 30) {
        // mailbox: on the verge in front of the house (between house and road), a little to one side
        const dx = np.x - b.x, dz = np.z - b.z, len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len;
        const off = np.road.width / 2 + KERB + 0.2;
        const x = np.x - ux * off + np.tx * 3.5, z = np.z - uz * off + np.tz * 3.5;
        P('Mailbox', 1.1, x, z, faceZ(ux, uz), true);
      }
      if (i % 2 === 0) P('Washing Line', 2.2, b.x, b.z - 7.2, 0, false);                       // back yard (front door faces +z)
    });
    // ATMs: the bank + a few tall downtown blocks, on the wall that faces the nearest road
    const bank = (world.mapLocations || []).find(l => l.id === 'bank');
    const atmBlds = towns.filter(b => b.h > 14).sort((a, b) => {
      const da = bank ? Math.hypot(a.x - bank.x, a.z - bank.z) : 0, db = bank ? Math.hypot(b.x - bank.x, b.z - bank.z) : 0;
      return da - db;
    }).filter((b, i) => i < 2 || i % 4 === 0).slice(0, 8);
    atmBlds.forEach(b => {
      const np = nearestRoadPoint(b.x, b.z); if (!np) return;
      let dx = np.x - b.x, dz = np.z - b.z; const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
      const t = Math.min((b.w / 2) / Math.max(1e-6, Math.abs(dx)), (b.d / 2) / Math.max(1e-6, Math.abs(dz)));
      // snap to the nearest wall face so the ATM sits flat against it
      let wx = b.x, wz = b.z, fx = 0, fz = 0;
      if (Math.abs(dx) * b.d > Math.abs(dz) * b.w) { fx = Math.sign(dx); wx = b.x + fx * (b.w / 2 + 0.5); wz = b.z + Math.max(-b.d / 2 + 2, Math.min(b.d / 2 - 2, dz * t)); }
      else { fz = Math.sign(dz); wz = b.z + fz * (b.d / 2 + 0.5); wx = b.x + Math.max(-b.w / 2 + 2, Math.min(b.w / 2 - 2, dx * t)); }
      P('ATM', 2.1, wx, wz, faceZ(fx, fz), true, { wall: true });
    });
    // landmarks: flower pots either side of the front (the front faces -z)
    (world.mapLocations || []).forEach(l => {
      if (l.category === 'map') return;
      const b = bl.reduce((best, r) => (!best || Math.hypot(r.x - l.x, r.z - l.z) < Math.hypot(best.x - l.x, best.z - l.z)) ? r : best, null);
      if (!b || Math.hypot(b.x - l.x, b.z - l.z) > 20) return;
      [-1, 1].forEach(s => P('Flower Pot', 0.9, b.x + s * (b.w / 2 - 1.6), b.z - b.d / 2 - 1.1, 0, true));
    });
    // fire exits and power boxes on the sides of mid-size blocks
    towns.filter(b => b.h >= 10 && b.h < 45).forEach((b, i) => {
      if (i % 3 === 0) P('Fire Exit', 2.6, b.x + b.w / 2 + 0.4, b.z + (i % 2 ? 2 : -2), Math.PI / 2, false, { wall: true });
      if (i % 4 === 1) P('Power Box', 1.8, b.x - b.w / 2 - 0.9, b.z + b.d / 4, -Math.PI / 2, true, { wall: true });
    });

    // --- 4. highway: billboards set well back from the road, cones on a verge ---
    ['west-arterial', 'dock-connector', 'safehouse-connector'].forEach((name, i) => {
      const road = roads.find(r => r.name === name); if (!road) return;
      const smp = sampleRoad(road, 6, 0), at = smp[Math.floor(smp.length * (0.42 + i * 0.08))]; if (!at) return;
      for (const side of [1, -1]) {
        const off = road.width / 2 + 13;
        const x = at.x + at.nx * off * side, z = at.z + at.nz * off * side;
        if (spotOk(x, z, { space: 6, minRoad: 6 }) && !nearBuilding(x, z, 8)) { P('Billboard', 9, x, z, faceX(-at.nx * side, -at.nz * side), false, { space: 6, minRoad: 6 }); break; }
      }
    });
    const arterial = roads.find(r => r.name === 'west-arterial');
    if (arterial) {
      const smp = sampleRoad(arterial, 3, 0), from = Math.floor(smp.length * 0.62);
      for (let k = 0; k < 6; k++) {
        const sm = smp[from + k]; if (!sm) break;
        const off = arterial.width / 2 + 0.9;
        P('Cone', 0.9, sm.x + sm.nx * off, sm.z + sm.nz * off, 0, false, { minRoad: 0.6, space: 1.5 });
      }
    }

    // --- 5. the harbour docks: crates and bags on whatever deck is clear of the quay road, containers and posts ---
    let crates = 0, bags = 0;
    (world.docks || []).forEach(dk => {
      const c = Math.cos(dk.rot), s = Math.sin(dk.rot);
      for (let lx = -dk.w / 2 + 2; lx <= dk.w / 2 - 2; lx += 2.5) for (const lz of [-dk.d / 2 + 1.2, dk.d / 2 - 1.2]) {
        const x = dk.x + lx * c + lz * s, z = dk.z - lx * s + lz * c;
        if (!(crates < 7 || bags < 4)) return;
        if (!spotOk(x, z, { minRoad: 1.6, space: 5 })) continue;
        if (crates < 7 && (crates + bags) % 3 !== 2) { P('Box', 1.6, x, z, dk.rot, true, { minRoad: 1.6, space: 3 }); crates++; }
        else if (bags < 4) { P('trah bag grey', 0.9, x, z, 0, false, { minRoad: 1.6, space: 3 }); bags++; }
        taken.push([x, z]);       // (planning only: stops two crates being planned on the same spot)
      }
    });
    // the spots planned above were only reserved for planning: free them so placement can use them
    taken.length = taken.length - (crates + bags);

    world._propWant = want;   // (kept for testing)
    // ---------- LOAD + PLACE ----------
    const loader = new THREE.GLTFLoader();
    const names = [...new Set(want.map(w => w.name))];
    const models = {};
    let left = names.length;
    const cells = {};       // props are grouped in 80 m cells so far-away ones are hidden (world.chunks)
    const done = () => { if (--left === 0) placeAll(); };
    if (!names.length) { world.propsLoaded = true; return; }

    names.forEach(name => {
      loader.load('props/' + name + '.glb', gltf => {
        try {
          const root = gltf.scene;
          root.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(root);
          const size = box.getSize(new THREE.Vector3());
          if (size.y > 0.0001) models[name] = { root, box, size };
          else console.warn('prop has no size, skipped:', name);
        } catch (e) { console.warn('prop could not be read:', name, e); }
        done();
      }, undefined, err => { console.warn('prop not found:', name, err); done(); });
    });

    function cellFor(x, z) {
      const key = Math.floor(x / 80) + ',' + Math.floor(z / 80);
      if (!cells[key]) {
        const g = new THREE.Group();
        world.scene.add(g);
        const chunk = { g, x: (Math.floor(x / 80) + 0.5) * 80, z: (Math.floor(z / 80) + 0.5) * 80 };
        world.chunks.push(chunk);
        cells[key] = g;
      }
      return cells[key];
    }
    function place(w, m) {
      const o = w.opts;
      if (!spotOk(w.x, w.z, o)) return;
      const s = w.h / m.size.y;
      const holder = new THREE.Group();
      const obj = m.root.clone(true);
      obj.scale.setScalar(s);
      const c = m.box.getCenter(new THREE.Vector3());
      // the traffic light's pole is at its x=0, the rest of its width is the arm: pivot on the pole, not the middle
      obj.position.set((o.pivotPole ? 0 : -c.x * s), -m.box.min.y * s, -c.z * s);
      holder.add(obj);
      holder.position.set(w.x, world.groundAt(w.x, w.z), w.z);
      holder.rotation.y = w.rot;
      obj.traverse(n => { if (n.isMesh) { n.castShadow = false; n.receiveShadow = false; } });
      cellFor(w.x, w.z).add(holder);
      taken.push([w.x, w.z]);
      if (w.solid) world.obstacle(w.x, w.z, Math.max(0.3, m.size.x * s * 0.35), Math.max(0.3, m.size.z * s * 0.35), w.h);
    }
    function placeAll() {
      want.forEach(w => { const m = models[w.name]; if (m) place(w, m); });
      world.propsLoaded = true;
    }
  };
})();
