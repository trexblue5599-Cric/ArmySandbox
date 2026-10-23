// accessory/mouth.js  -  a simple hand-drawn PENCIL mouth drawn on the face. Pick it in the wardrobe: "Mouth" + "Mouth colour".
// Each drawing is made on a little canvas with several wobbly, slightly different strokes (like pencil on paper),
// then stuck onto the face as a transparent sticker. To add a drawing, add a function to DRAW and an ACC.add line.
(function() {
  const T = THREE;
  const PENCILS = [0x2b2b2b, 0x8b1a1a, 0x1a3f8b, 0x1b5e20];     // graphite, red, blue, green pencil
  const cache = {};

  const DRAW = {
    smile(p, ctx) {
      p(j => { ctx.moveTo(48 + j(), 50 + j()); ctx.quadraticCurveTo(128 + j(), 112 + j(), 208 + j(), 48 + j()); });
      p(j => { ctx.moveTo(44 + j(), 42 + j()); ctx.lineTo(51 + j(), 58 + j()); }, 0.7, 4);        // little cheek marks
      p(j => { ctx.moveTo(212 + j(), 40 + j()); ctx.lineTo(205 + j(), 56 + j()); }, 0.7, 4);
    },
    grin(p, ctx) {
      p(j => { ctx.moveTo(46 + j(), 46 + j()); ctx.quadraticCurveTo(128 + j(), 52 + j(), 210 + j(), 46 + j()); });     // top lip
      p(j => { ctx.moveTo(46 + j(), 46 + j()); ctx.quadraticCurveTo(128 + j(), 124 + j(), 210 + j(), 46 + j()); });    // bottom curve
      [88, 128, 168].forEach(x => p(j => { ctx.moveTo(x + j(), 50 + j()); ctx.lineTo(x + j(), 70 + j() - Math.abs(x - 128) * 0.12); }, 0.6, 3));   // teeth
    },
    smirk(p, ctx) {
      p(j => { ctx.moveTo(60 + j(), 74 + j()); ctx.quadraticCurveTo(122 + j(), 90 + j(), 164 + j(), 66 + j()); ctx.quadraticCurveTo(186 + j(), 52 + j(), 204 + j(), 38 + j()); });
      p(j => { ctx.moveTo(208 + j(), 46 + j()); ctx.lineTo(198 + j(), 52 + j()); }, 0.7, 4);
    }
  };

  function texture(kind, color) {
    const key = kind + '|' + color;
    if (cache[key]) return cache[key];
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    const ctx = cv.getContext('2d');
    const hex = '#' + ('000000' + color.toString(16)).slice(-6);
    let seed = 11 + kind.length * 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // one stroke is drawn 3 times with a little wobble, thick+dark then thin+light = graphite pencil look
    const p = (draw, alpha, width) => {
      [[0.9, 6, 2.2], [0.5, 4, 3.2], [0.35, 2.5, 4.2]].forEach(pass => {
        ctx.save();
        ctx.globalAlpha = (alpha || 1) * pass[0]; ctx.strokeStyle = hex; ctx.lineWidth = (width || 1) * pass[1] / (width ? 6 : 1) * (width ? 1.5 : 1);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); draw(() => (rnd() - 0.5) * 2 * pass[2]); ctx.stroke();
        ctx.restore();
      });
    };
    DRAW[kind](p, ctx);
    const tex = new T.CanvasTexture(cv);
    return (cache[key] = tex);
  }

  function mouth(kind, color) {
    const m = new T.Mesh(new T.PlaneGeometry(0.092, 0.046), new T.MeshBasicMaterial({
      map: texture(kind, color), transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4
    }));
    m.position.set(0, -0.066, 0.1055);          // on the lower face (face points to +z)
    m.rotation.x = 0.2;                         // the lower face leans back a little
    const g = new T.Group(); g.add(m);
    return g;
  }

  ACC.add('mouth', 'none', { name: 'No mouth drawing' });
  ACC.add('mouth', 'smile', { name: 'Pencil smile', colors: PENCILS, build(c) { return mouth('smile', c); } });
  ACC.add('mouth', 'grin', { name: 'Pencil grin', colors: PENCILS, build(c) { return mouth('grin', c); } });
  ACC.add('mouth', 'smirk', { name: 'Pencil smirk', colors: PENCILS, build(c) { return mouth('smirk', c); } });
})();
