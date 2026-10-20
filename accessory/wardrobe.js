// accessory/wardrobe.js  -  the dressing-room screen. Tap the shirt button (top-left) to open it.
// Rows are built automatically from whatever is registered in the other accessory files.
const wardrobe = {};

wardrobe.init = function() {
  const css = document.createElement('style');
  css.textContent = `
    #wardrobe-btn{position:fixed;left:14px;top:58px;width:46px;height:46px;border-radius:50%;border:2px solid rgba(255,255,255,.8);
      background:rgba(0,0,0,.35);color:#fff;font-size:22px;z-index:9;padding:0}
    #wardrobe{position:fixed;left:0;right:0;bottom:0;max-height:50%;overflow-y:auto;background:rgba(18,22,30,.94);color:#fff;
      font:15px sans-serif;z-index:30;display:none;padding:10px 12px 14px;border-radius:18px 18px 0 0;touch-action:pan-y;box-sizing:border-box}
    #wardrobe .row{display:flex;align-items:center;padding:3px 0}
    #wardrobe .lab{width:82px;font-size:13px;opacity:.75}
    #wardrobe .val{flex:1;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #wardrobe .sw{width:18px;height:18px;border-radius:50%;border:1px solid #fff;margin:0 8px}
    #wardrobe button{min-width:44px;height:40px;border-radius:12px;border:0;background:#3a4256;color:#fff;font-size:18px}
    #wardrobe .foot{display:flex;gap:10px;margin-top:8px}
    #wardrobe .foot button{flex:1;font-size:16px;background:#2e7d32}
    #wardrobe .foot button.rnd{background:#5e35b1}`;
  document.head.appendChild(css);

  const btn = document.createElement('button');
  btn.id = 'wardrobe-btn'; btn.textContent = '\uD83D\uDC55';
  document.body.appendChild(btn);
  const panel = document.createElement('div');
  panel.id = 'wardrobe';
  document.body.appendChild(panel);

  const hex = c => '#' + ('000000' + c.toString(16)).slice(-6);
  const outfit = () => ACC.get('outfit', player.look.outfit);
  const cyc = (list, cur, dir) => (cur + dir + list.length * 1000) % list.length;
  const item = (slot, key, ckey) => ({
    text: () => ACC.get(slot, player.look[key]).name,
    sw: () => null,
    step: dir => { const ids = ACC.ids(slot); const L = Object.assign({}, player.look); L[key] = ids[cyc(ids, ids.indexOf(L[key]), dir)]; player.setLook(L); }
  });
  const colour = (label, key, list) => ({
    text: () => label + ' ' + ((player.look[key] % list().length) + 1) + '/' + list().length,
    sw: () => list()[player.look[key] % list().length],
    step: dir => { const L = Object.assign({}, player.look); L[key] = cyc(list(), L[key] % list().length, dir); player.setLook(L); }
  });
  const rows = [
    ['Outfit', item('outfit', 'outfit')],
    ['Shirt', colour('Colour', 'c1', () => outfit().shirts)],
    ['Pants', colour('Colour', 'c2', () => outfit().pantsFollow ? [0] : outfit().pants)],
    ['Hat', item('hat', 'hat')],
    ['Hat colour', colour('Colour', 'hc', () => (ACC.get('hat', player.look.hat).colors || ACC.COLORS))],
    ['Glasses', item('glasses', 'glasses')],
    ['Back', item('back', 'back')],
    ['Back colour', colour('Colour', 'bc', () => (ACC.get('back', player.look.back).colors || ACC.COLORS))],
    ['Vest', item('vest', 'vest')],
    ['Skin', colour('Tone', 'skin', () => ACC.SKINS)],
    ['Hair', colour('Colour', 'hair', () => ACC.HAIRS)]
  ];

  const refreshers = [];
  rows.forEach(r => {
    const row = document.createElement('div'); row.className = 'row';
    const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = r[0];
    const l = document.createElement('button'); l.textContent = '\u25C0';
    const val = document.createElement('div'); val.className = 'val';
    const sw = document.createElement('div'); sw.className = 'sw';
    const n = document.createElement('button'); n.textContent = '\u25B6';
    const refresh = () => { val.textContent = r[1].text(); const c = r[1].sw(); sw.style.display = c === null ? 'none' : 'block'; if (c !== null) sw.style.background = hex(c); };
    l.onclick = () => { r[1].step(-1); refreshers.forEach(f => f()); };
    n.onclick = () => { r[1].step(1); refreshers.forEach(f => f()); };
    row.append(lab, l, val, sw, n);
    panel.appendChild(row);
    refreshers.push(refresh);
  });

  const foot = document.createElement('div'); foot.className = 'foot';
  const rnd = document.createElement('button'); rnd.className = 'rnd'; rnd.textContent = '\uD83C\uDFB2 Random';
  const done = document.createElement('button'); done.textContent = '\u2714 Done';
  foot.append(rnd, done);
  panel.appendChild(foot);
  rnd.onclick = () => { player.setLook(ACC.randomLook(Math.random)); refreshers.forEach(f => f()); };

  let savedPitch = 0.4;
  const open = () => {
    savedPitch = world.camPitch;
    world.camPitch = 0.15;
    player.wardrobeOpen = true;
    panel.style.display = 'block';
    refreshers.forEach(f => f());
  };
  const close = () => { player.wardrobeOpen = false; panel.style.display = 'none'; world.camPitch = savedPitch; };
  btn.onclick = () => (player.wardrobeOpen ? close() : open());
  done.onclick = close;
};
