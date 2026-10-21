// js/interior-house.js  -  the FLOOR PLAN of the house + where every piece of furniture goes.
// Plan coordinates:  u = to your right when you walk in the front door,  v = deeper into the house.
//   u: -11 ... 11   (22 wide)      v: 0 (front wall) ... 16 (back wall)
//
//   GARAGE | HALL (front door) | BATHROOM
//   GARAGE | LIVING ROOM       | CORRIDOR | BEDROOM 2
//   KITCHEN| DINING ROOM       | CORRIDOR | MASTER BEDROOM
//
// To move a piece of furniture just change its numbers.  IB.at(u, v, FACE.x, () => FUR.something(...))
const HOUSE = {
  T: 0.2,            // wall thickness
  H: 3.0,            // ceiling height
  spawn: { u: 7.2, v: 12.9 },   // where you start the game (master bedroom)
  entry: { u: 0, v: 2.6 },      // where you arrive when you walk in the front door
  exit:  { u: 0, v: 1.35 },     // the yellow EXIT marker
  tiled: []                     // floors with a tile pattern (made in interior.js)
};

HOUSE.build = function() {
  IB.reset();
  HOUSE.tiled = [];
  const T = HOUSE.T, H = HOUSE.H;
  const OUT = 0xf8bbd0;
  const C = { garage: 0xb9bcc1, hall: 0xf1e4c8, living: 0xcde0cf, dining: 0xf2d8c3, kitchen: 0xfff0b8, corr: 0xece6da, bed2: 0xc4dcf2, master: 0xe1cfe8, bath: 0xc9eef0 };
  const FRAME = 0xffffff;

  // ---------- walls ----------
  // wall(axis, fixed, from, to, colourLow, colourHigh, openings, opts)
  //   axis 'u': the wall runs along u at v = fixed   (colourLow = side with smaller v)
  //   axis 'v': the wall runs along v at u = fixed   (colourLow = side with smaller u)
  // openings: { type: 'door' | 'arch' (walk through) | 'window' | 'fdoor' (front door) | 'garage', a, b, y0, y1, curtain }
  function seg(axis, fixed, a, b, y0, y1, cLow, cHigh, collide) {
    if (b - a < 0.001 || y1 - y0 < 0.001) return;
    const len = b - a, mid = (a + b) / 2, hh = y1 - y0, yc = (y0 + y1) / 2, top = 0xf4f4ef, side = 0xe9e4da;
    if (axis === 'u') {
      IB.box(len, hh, T, [side, side, top, side, cHigh, cLow], -mid, yc, fixed);
      if (collide) IB.block(mid, fixed, len, T, H);
    } else {
      IB.box(T, hh, len, [cLow, cHigh, top, side, side, side], -fixed, yc, mid);
      if (collide) IB.block(fixed, mid, T, len, H);
    }
  }
  function bar(axis, fixed, a, b, y0, y1, thick) {       // a thin white bar (window frame, door casing)
    const len = b - a, mid = (a + b) / 2, hh = y1 - y0, yc = (y0 + y1) / 2;
    if (axis === 'u') IB.box(len, hh, T + thick, FRAME, -mid, yc, fixed); else IB.box(T + thick, hh, len, FRAME, -fixed, yc, mid);
  }
  function wall(axis, fixed, from, to, cLow, cHigh, openings, opts) {
    opts = opts || {};
    const ext = T / 2;
    let a0 = from - (opts.extA ? ext : 0), b1 = to + (opts.extB ? ext : 0);
    const ops = (openings || []).slice().sort((p, q) => p.a - q.a);
    let cur = a0;
    ops.forEach(o => {
      seg(axis, fixed, cur, o.a, 0, H, cLow, cHigh, true);               // solid wall before the opening
      const len = o.b - o.a, mid = (o.a + o.b) / 2;
      if (o.type === 'door' || o.type === 'arch') {
        const top = o.type === 'arch' ? 2.35 : 2.2;
        seg(axis, fixed, o.a, o.b, top, H, cLow, cHigh, false);          // wall above the doorway
        bar(axis, fixed, o.a - 0.05, o.b + 0.05, top - 0.07, top, 0.04);
        if (o.type === 'door') { bar(axis, fixed, o.a - 0.05, o.a, 0, top, 0.04); bar(axis, fixed, o.b, o.b + 0.05, 0, top, 0.04); }
      } else if (o.type === 'window') {
        seg(axis, fixed, o.a, o.b, 0, o.y0, cLow, cHigh, true);
        seg(axis, fixed, o.a, o.b, o.y1, H, cLow, cHigh, false);
        // glass + frame + sill
        if (axis === 'u') IB.box(len, o.y1 - o.y0, 0.03, 0xaed6f1, -mid, (o.y0 + o.y1) / 2, fixed, 'glass'); else IB.box(0.03, o.y1 - o.y0, len, 0xaed6f1, -fixed, (o.y0 + o.y1) / 2, mid, 'glass');
        bar(axis, fixed, o.a - 0.05, o.b + 0.05, o.y1, o.y1 + 0.06, 0.03); bar(axis, fixed, o.a - 0.05, o.b + 0.05, o.y0 - 0.06, o.y0, 0.1);
        bar(axis, fixed, o.a - 0.05, o.a + 0.02, o.y0, o.y1, 0.03); bar(axis, fixed, o.b - 0.02, o.b + 0.05, o.y0, o.y1, 0.03); bar(axis, fixed, mid - 0.02, mid + 0.02, o.y0, o.y1, 0.03);
        if (o.curtain) {                                                  // curtains on the inside
          const side = opts.inner || '+v';
          const cu = axis === 'u' ? mid : fixed + (side === '+u' ? 0.16 : -0.16), cv = axis === 'u' ? fixed + (side === '+v' ? 0.16 : -0.16) : mid;
          const horiz = axis === 'u';
          [-1, 1].forEach(s => {
            const off = s * (len / 2 + 0.05), cw = 0.45, ch = o.y1 - o.y0 + 0.5;
            if (horiz) IB.box(cw, ch, 0.1, o.curtain, -(cu + off), (o.y0 + o.y1) / 2 + 0.1, cv); else IB.box(0.1, ch, cw, o.curtain, -cu, (o.y0 + o.y1) / 2 + 0.1, cv + off);
          });
        }
      } else if (o.type === 'fdoor' || o.type === 'garage') {
        seg(axis, fixed, o.a, o.b, 2.4, H, cLow, cHigh, true);           // wall above (and the door area is solid)
        if (axis === 'u') IB.block(mid, fixed, len, T, H);
        const inward = opts.inner === '-v' ? -1 : 1;                     // doors are on the front wall (v = 0)
        if (o.type === 'fdoor') {
          bar(axis, fixed, o.a - 0.08, o.b + 0.08, 2.2, 2.4, 0.05); bar(axis, fixed, o.a - 0.08, o.a, 0, 2.2, 0.05); bar(axis, fixed, o.b, o.b + 0.08, 0, 2.2, 0.05);
          IB.at(mid, fixed + 0.03, 0, () => FUR.door(len, 2.2, 0x5d3a1a));
          IB.at(mid, fixed + 0.03, 0, () => { IB.box(0.5, 0.4, 0.1, 0x9ccbea, -0.0, 1.6, 0, 'glass'); });
        } else {
          IB.at(mid, fixed + 0.05, 0, () => FUR.garageDoor(len, 2.4));
        }
      }
      cur = o.b;
    });
    seg(axis, fixed, cur, b1, 0, H, cLow, cHigh, true);
  }

  // ---------- floors ----------
  function floor(u0, u1, v0, v1, color) { IB.box(u1 - u0, 0.05, v1 - v0, color, -(u0 + u1) / 2, 0.025, (v0 + v1) / 2); }
  function tiles(u0, u1, v0, v1, c1, c2) { HOUSE.tiled.push({ u0, u1, v0, v1, c1, c2 }); }
  floor(-11, -3.5, 0, 8, 0x8d9096);            // garage
  floor(-3.5, 3.5, 0, 3.5, 0xc09566);          // hall
  floor(-3.5, 3.5, 3.5, 9.5, 0xb48a58);        // living
  floor(-3.5, 3.5, 9.5, 16, 0xb48a58);         // dining
  floor(3.5, 5.7, 3.5, 16, 0xc09566);          // corridor
  floor(5.7, 11, 3.5, 9.8, 0x7fa8d6);          // bedroom 2 (blue carpet)
  floor(5.7, 11, 9.8, 16, 0xd8c4a8);           // master (beige carpet)
  tiles(-11, -3.5, 8, 16, 0xf5f5f0, 0xb0463a); // kitchen
  tiles(3.5, 11, 0, 3.5, 0xf5fbfb, 0x7fc7d9);  // bathroom

  // ---------- OUTER WALLS ----------
  wall('u', 0, -11, -3.5, OUT, C.garage, [{ type: 'garage', a: -9.4, b: -5.4 }], { extA: true });
  wall('u', 0, -3.5, 3.5, OUT, C.hall, [{ type: 'fdoor', a: -0.6, b: 0.6 }]);
  wall('u', 0, 3.5, 11, OUT, C.bath, [{ type: 'window', a: 5.6, b: 6.8, y0: 1.3, y1: 2.2 }], { extB: true });
  wall('u', 16, -11, -3.5, C.kitchen, OUT, [{ type: 'window', a: -8.4, b: -5.6, y0: 0.95, y1: 2.2 }], { extA: true, inner: '-v' });
  wall('u', 16, -3.5, 3.5, C.dining, OUT, [{ type: 'window', a: -2.1, b: 2.1, y0: 0.95, y1: 2.2, curtain: 0xd98880 }], { inner: '-v' });
  wall('u', 16, 3.5, 5.7, C.corr, OUT, []);
  wall('u', 16, 5.7, 11, C.master, OUT, [{ type: 'window', a: 8.0, b: 10.4, y0: 0.95, y1: 2.2, curtain: 0x8e6bb0 }], { extB: true, inner: '-v' });
  wall('v', -11, 0, 8, OUT, C.garage, [{ type: 'window', a: 3.0, b: 5.0, y0: 1.2, y1: 2.2 }]);
  wall('v', -11, 8, 16, OUT, C.kitchen, [{ type: 'window', a: 11, b: 13, y0: 0.95, y1: 2.2 }], { inner: '+u' });
  wall('v', 11, 0, 3.5, C.bath, OUT, []);
  wall('v', 11, 3.5, 9.8, C.bed2, OUT, [{ type: 'window', a: 5.6, b: 8.0, y0: 0.9, y1: 2.2, curtain: 0x5dade2 }], { inner: '-u' });
  wall('v', 11, 9.8, 16, C.master, OUT, [{ type: 'window', a: 11.4, b: 14.4, y0: 1.4, y1: 2.2, curtain: 0x8e6bb0 }], { inner: '-u' });

  // ---------- INNER WALLS ----------
  wall('v', -3.5, 0, 3.5, C.garage, C.hall, [{ type: 'door', a: 1.2, b: 2.5 }]);       // hall <-> garage
  wall('v', -3.5, 3.5, 8, C.garage, C.living, []);
  wall('u', 8, -11, -3.5, C.garage, C.kitchen, []);
  wall('v', -3.5, 8, 9.6, C.kitchen, C.living, []);
  wall('v', -3.5, 9.6, 16, C.kitchen, C.dining, [{ type: 'arch', a: 10.2, b: 15.2 }]);  // kitchen <-> dining (wide opening)
  wall('u', 3.5, -3.5, -1.6, C.hall, C.living, []);                                      // hall <-> living (open in the middle)
  wall('u', 3.5, 1.6, 3.5, C.hall, C.living, []);
  wall('v', 3.5, 0, 3.5, C.hall, C.bath, [{ type: 'door', a: 1.2, b: 2.5 }]);          // hall <-> bathroom
  wall('v', 3.5, 3.5, 9.5, C.living, C.corr, [{ type: 'door', a: 5.0, b: 6.4 }]);      // living <-> corridor
  wall('v', 3.5, 9.5, 16, C.dining, C.corr, []);
  wall('u', 3.5, 3.5, 5.7, C.bath, C.corr, []);
  wall('u', 3.5, 5.7, 11, C.bath, C.bed2, []);
  wall('v', 5.7, 3.5, 9.8, C.corr, C.bed2, [{ type: 'door', a: 6.6, b: 7.9 }]);        // corridor <-> bedroom 2
  wall('v', 5.7, 9.8, 16, C.corr, C.master, [{ type: 'door', a: 12.0, b: 13.3 }]);     // corridor <-> master bedroom
  wall('u', 9.8, 5.7, 11, C.bed2, C.master, []);

  // ---------- FURNITURE ----------
  const F = FACE, at = IB.at, blk = IB.block;
  const light = (u, v, w, d) => at(u, v, 0, () => FUR.ceilingLight(w, d));

  // ===== GARAGE =====
  at(-7.4, 4.1, F['-v'], () => FUR.car(0x2e86c1));            blk(-7.4, 4.1, 2.0, 4.6, 1.7);
  at(-10.5, 6.0, F.u, () => FUR.workbench(1.8));              blk(-10.5, 6.0, 0.8, 1.8, 1.0);
  at(-9.2, 7.7, F['-v'], () => FUR.shelves(2.0));             blk(-9.2, 7.7, 2.0, 0.45, 2.0);
  at(-6.0, 7.7, F['-v'], () => FUR.shelves(2.0));             blk(-6.0, 7.7, 2.0, 0.45, 2.0);
  at(-4.2, 7.0, 0, () => FUR.tires());                        blk(-4.2, 7.0, 0.8, 0.8, 0.8);
  at(-3.9, 5.5, F['-u'], () => FUR.washer());                 blk(-3.9, 5.5, 0.6, 0.62, 0.9);
  at(-3.9, 6.2, F['-u'], () => FUR.washer());                 blk(-3.9, 6.2, 0.6, 0.62, 0.9);
  at(-4.1, 3.3, 0, () => FUR.heater());                       blk(-4.1, 3.3, 0.6, 0.6, 1.5);
  at(-10.3, 1.9, F.u, () => FUR.bicycle());                   blk(-10.3, 1.9, 0.5, 1.5, 1.0);
  at(-10.6, 6.0, 0, () => FUR.toolbox(), 0.96);
  at(-8.2, 7.4, 0, () => FUR.paint(), 0.0);
  light(-7.4, 4.0, 1.4, 0.3); light(-7.4, 1.2, 1.4, 0.3);

  // ===== HALL =====
  at(2.6, 0.45, 0, () => FUR.coatRack());                     blk(2.6, 0.45, 0.4, 0.4, 1.8);
  at(1.5, 0.35, F.v, () => FUR.shoeRack());                   blk(1.5, 0.35, 0.9, 0.34, 0.5);
  at(-2.3, 0.3, F.v, () => FUR.console(1.2));                 blk(-2.3, 0.3, 1.2, 0.36, 0.9);
  at(-2.3, 0.14, F.v, () => FUR.mirror(0.8, 1.0), 1.6);
  at(0, 2.0, 0, () => FUR.rug(1.6, 2.6, 0x8e2b2b, 0xe5c07b));
  at(-3.0, 3.0, 0, () => FUR.plant(1.0));                     blk(-3.0, 3.0, 0.5, 0.5, 1.2);
  at(2.4, 0.14, F.v, () => FUR.art(0.8, 0.6, 0xf5e6c8, 0x3b7ea1), 1.7);
  light(0, 1.8, 0.9, 0.5);

  // ===== LIVING ROOM =====
  at(-3.25, 6.0, F.u, () => FUR.tvUnit(2.2));                 blk(-3.25, 6.0, 0.5, 2.2, 1.45);
  at(1.6, 6.0, F['-u'], () => FUR.sofa(2.6, 0x4b6a88));       blk(1.6, 6.0, 1.0, 2.6, 0.9);
  at(0.6, 4.2, F['-u'], () => FUR.armchair(0xb5651d));        blk(0.6, 4.2, 0.9, 0.9, 0.9);
  at(0.8, 8.2, F['-u'], () => FUR.armchair(0xb5651d));        blk(0.8, 8.2, 0.9, 0.9, 0.9);
  at(-0.4, 6.0, F.v, () => FUR.coffeeTable(0.7, 1.3));        blk(-0.4, 6.0, 0.7, 1.3, 0.45);
  at(-0.2, 6.0, 0, () => FUR.rug(3.2, 3.6, 0x2c3e50, 0xbdc3c7));
  at(-3.2, 8.8, F.u, () => FUR.bookshelf(1.2, 2.1));          blk(-3.2, 8.8, 0.4, 1.2, 2.1);
  at(2.9, 4.0, 0, () => FUR.floorLamp());
  at(3.0, 9.0, 0, () => FUR.plant(1.2));                      blk(3.0, 9.0, 0.5, 0.5, 1.4);
  at(-2.4, 3.6, F.v, () => FUR.art(1.0, 0.7, 0xe8d9b5, 0xc0392b), 1.7);
  at(2.5, 3.6, F.v, () => FUR.art(0.7, 0.9, 0xd6eaf8, 0x27ae60), 1.7);
  light(0, 6.5, 1.2, 0.6);

  // ===== DINING ROOM =====
  at(0, 12.6, 0, () => FUR.table(2.4, 1.1, 0.76, 0xc9a26b, 0x6b4426));   blk(0, 12.6, 2.4, 1.1, 0.8);
  [-0.8, 0, 0.8].forEach(u => { at(u, 11.8, F.v, () => FUR.chair(0x8e6bb0)); at(u, 13.4, F['-v'], () => FUR.chair(0x8e6bb0)); });
  at(-1.7, 12.6, F.u, () => FUR.chair(0x8e6bb0)); at(1.7, 12.6, F['-u'], () => FUR.chair(0x8e6bb0));
  at(0, 12.6, 0, () => FUR.rug(3.4, 2.4, 0x7f8c8d, 0xe8d8b0));
  at(0, 15.65, F['-v'], () => FUR.dresser(2.2));              blk(0, 15.65, 2.2, 0.5, 0.9);
  at(0, 12.6, 0, () => FUR.pendant(0xffe2a0));
  at(3.4, 11.5, F['-u'], () => FUR.art(0.9, 0.6, 0xf9e79f, 0xaf601a), 1.7);
  at(3.4, 14.0, F['-u'], () => FUR.mirror(0.8, 1.1), 1.6);
  at(3.0, 15.2, 0, () => FUR.plant(1.1));                     blk(3.0, 15.2, 0.5, 0.5, 1.3);
  at(-3.0, 15.2, 0, () => FUR.plant(1.1));                    blk(-3.0, 15.2, 0.5, 0.5, 1.3);
  light(0, 11.0, 1.0, 0.4); light(0, 14.3, 1.0, 0.4);

  // ===== KITCHEN =====
  const K = -10.65;                                               // counters along the left wall
  at(K, 8.95, F.u, () => FUR.fridge());                       blk(K, 8.95, 0.8, 0.84, 1.95);
  at(K, 10.05, F.u, () => FUR.counter(1.2));                  blk(K, 10.05, 0.65, 1.2, 0.9);
  at(K, 11.3, F.u, () => FUR.stove());                        blk(K, 11.3, 0.65, 0.9, 0.9);
  at(K, 12.6, F.u, () => FUR.sink(1.5));                      blk(K, 12.6, 0.65, 1.5, 0.9);
  at(K, 14.1, F.u, () => FUR.counter(1.5));                   blk(K, 14.1, 0.65, 1.5, 0.9);
  at(K, 15.3, F.u, () => FUR.counter(0.8));                   blk(K, 15.3, 0.65, 0.8, 0.9);
  at(-10.8, 10.05, F.u, () => FUR.upper(1.2));
  at(-10.8, 14.1, F.u, () => FUR.upper(1.5));
  at(-10.8, 15.3, F.u, () => FUR.upper(0.8));
  at(-7.2, 12.0, F.u, () => FUR.counter(2.2, 0.9));           blk(-7.2, 12.0, 0.9, 2.2, 0.9);
  [11.3, 12.0, 12.7].forEach(v => at(-6.3, v, 0, () => FUR.stool(0xc0392b)));
  at(-9.5, 15.65, F['-v'], () => FUR.counter(1.4));           blk(-9.5, 15.65, 1.4, 0.65, 0.9);
  at(-4.6, 15.5, 0, () => FUR.bin());                         blk(-4.6, 15.5, 0.4, 0.4, 0.6);
  at(-8.6, 14.2, 0, () => FUR.rug(1.0, 2.6, 0x5d6d7e, 0xd5d8dc));
  light(-7.2, 10.0, 1.2, 0.4); light(-7.2, 14.0, 1.2, 0.4);

  // ===== CORRIDOR =====
  at(4.6, 9.7, 0, () => FUR.rug(1.0, 11, 0x884ea0, 0xf0b27a));
  at(3.75, 11.5, F.u, () => FUR.console(1.2));                blk(3.75, 11.5, 0.36, 1.2, 0.9);
  at(4.6, 15.4, 0, () => FUR.plant(1.0));                     blk(4.6, 15.4, 0.5, 0.5, 1.2);
  at(3.58, 8.0, F.u, () => FUR.art(0.8, 0.6, 0xfdebd0, 0x2874a6), 1.6);
  at(3.58, 13.8, F.u, () => FUR.art(0.6, 0.8, 0xe8f6f3, 0xc0392b), 1.6);
  at(5.62, 10.9, F['-u'], () => FUR.art(0.7, 0.5, 0xfcf3cf, 0x239b56), 1.6);
  light(4.6, 6.0, 0.5, 0.5); light(4.6, 11.0, 0.5, 0.5); light(4.6, 15.0, 0.5, 0.5);

  // ===== BEDROOM 2 =====
  at(10.1, 4.65, F.v, () => FUR.bed(1.0, 2.0, 0x48c9b0, 0xb98b5a));   blk(10.1, 4.65, 1.05, 2.05, 0.8);
  at(8.9, 3.9, F.v, () => FUR.nightstand(0xffe08a));          blk(8.9, 3.9, 0.5, 0.42, 0.5);
  at(7.2, 3.8, F.v, () => FUR.wardrobe(2.0));                 blk(7.2, 3.8, 2.0, 0.6, 2.2);
  at(10.5, 7.3, F['-u'], () => FUR.desk(1.4));                blk(10.5, 7.3, 0.62, 1.4, 1.0);
  at(9.7, 7.3, F.u, () => FUR.chair(0xe67e22));
  at(8.0, 9.55, F['-v'], () => FUR.bookshelf(1.2, 1.7));      blk(8.0, 9.55, 1.2, 0.36, 1.7);
  at(8.4, 6.6, 0, () => FUR.rug(2.6, 2.4, 0xf5cba7, 0x5dade2));
  [[7.2, 8.8, 0xe74c3c], [7.65, 8.8, 0xf1c40f], [7.4, 8.8, 0x3498db]].forEach((c, i) => at(c[0], c[1], 0, () => IB.box(0.3, 0.3, 0.3, c[2], 0, 0.15 + (i === 2 ? 0.3 : 0), 0)));
  at(10.1, 3.6, F.v, () => FUR.art(0.9, 0.6, 0xaed6f1, 0xe67e22), 1.7);
  light(8.4, 6.6, 0.9, 0.5);

  // ===== MASTER BEDROOM =====
  at(9.8, 12.9, F['-u'], () => FUR.bed(1.8, 2.1, 0x8e6bb0, 0x6b4426));  blk(9.8, 12.9, 2.15, 1.85, 0.8);
  at(10.6, 11.55, F['-u'], () => FUR.nightstand(0xfff0c0));   blk(10.6, 11.55, 0.42, 0.5, 0.5);
  at(10.6, 14.25, F['-u'], () => FUR.nightstand(0xfff0c0));   blk(10.6, 14.25, 0.42, 0.5, 0.5);
  at(8.4, 10.1, F.v, () => FUR.wardrobe(3.0));                blk(8.4, 10.1, 3.0, 0.6, 2.25);
  at(6.7, 15.7, F['-v'], () => FUR.dresser(1.4));             blk(6.7, 15.7, 1.4, 0.5, 0.9);
  at(8.4, 12.9, 0, () => IB.box(0.45, 0.4, 1.4, 0xd7bde2, 0, 0.2, 0));   blk(8.4, 12.9, 0.45, 1.4, 0.4);
  at(6.5, 14.4, F.u, () => FUR.armchair(0x1abc9c));           blk(6.5, 14.4, 0.9, 0.9, 0.9);
  at(8.3, 12.9, 0, () => FUR.rug(3.2, 2.6, 0xd2b4de, 0xfdf2e9));
  at(10.88, 12.9, F['-u'], () => FUR.art(1.2, 0.7, 0xf5eef8, 0x8e44ad), 1.7);
  at(6.7, 15.88, F['-v'], () => FUR.art(0.5, 0.5, 0xfdebd0, 0x5d6d7e), 1.6);
  light(8.3, 12.9, 1.0, 0.6);

  // ===== BATHROOM =====
  at(10.4, 0.55, F.v, () => FUR.toilet());                    blk(10.4, 0.55, 0.45, 0.7, 0.9);
  at(8.4, 0.4, F.v, () => FUR.vanity(1.2));                   blk(8.4, 0.4, 1.2, 0.5, 0.9);
  at(8.4, 0.14, F.v, () => FUR.mirror(0.9, 0.8), 1.5);
  at(8.9, 3.0, F['-v'], () => FUR.bathtub(1.5));              blk(8.9, 3.0, 1.5, 0.8, 0.6);
  at(10.3, 2.9, 0, () => FUR.shower());                       blk(10.3, 2.9, 0.95, 0.95, 2.1);
  at(4.2, 3.0, 0, () => FUR.basket());                        blk(4.2, 3.0, 0.45, 0.45, 0.5);
  at(5.0, 0.14, F.v, () => FUR.towelRack(), 0.0);
  at(7.2, 1.9, 0, () => FUR.rug(1.2, 0.8, 0x3498db, 0xd6eaf8));
  at(6.0, 0.9, 0, () => FUR.plant(0.8));
  light(7.5, 1.8, 0.9, 0.5);
};
