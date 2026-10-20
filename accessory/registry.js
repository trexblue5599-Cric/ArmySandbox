// accessory/registry.js  -  the wardrobe "database". Every hat / glasses / backpack / vest / outfit is registered here.
// Other files in this folder just call ACC.add(slot, id, definition). To add your own item, copy one and change it.
//
// A "look" is a small object that describes what one person wears:
//   { outfit, c1, c2, hat, hc, glasses, back, bc, vest, skin, hair }
//   c1 / c2 = shirt / pants colour index (into the outfit's colour lists), hc / bc = hat / back colour index
const ACC = { slots: {}, order: {}, _mats: {} };

ACC.SKINS = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0x5c3a21];
ACC.HAIRS = [0x2b1d12, 0x5a3820, 0x111111, 0xd4a64a, 0x8a3b1c, 0xb0b0b0];
ACC.COLORS = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0x212121, 0xffffff, 0x8e24aa, 0xff7043];

// cached material, so hundreds of hats share a few materials
ACC.mat = function(color, twoSided) {
  const k = color + (twoSided ? 'd' : '');
  return ACC._mats[k] || (ACC._mats[k] = new THREE.MeshLambertMaterial({ color, side: twoSided ? THREE.DoubleSide : THREE.FrontSide }));
};
ACC.mesh = function(geo, color, x, y, z, parent) {
  const m = new THREE.Mesh(geo, ACC.mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  if (parent) parent.add(m);
  return m;
};

// register / look up items
ACC.add = function(slot, id, def) {
  (ACC.slots[slot] = ACC.slots[slot] || {})[id] = def;
  def.id = id;
  (ACC.order[slot] = ACC.order[slot] || []).push(id);
};
ACC.ids = slot => ACC.order[slot] || [];
ACC.get = (slot, id) => (ACC.slots[slot] || {})[id];

// make sure a look only uses things that exist (old saved looks, typos...)
ACC.fix = function(look) {
  const L = Object.assign({}, ACC.defaultLook(), look || {});
  ['outfit', 'hat', 'glasses', 'back', 'vest', 'face'].forEach(s => { if (!ACC.get(s, L[s])) L[s] = s === 'outfit' ? ACC.ids('outfit')[0] : 'none'; });
  ['c1', 'c2', 'hc', 'bc', 'fc', 'skin', 'hair'].forEach(k => { L[k] = Math.abs(Math.floor(+L[k] || 0)); });
  return L;
};

ACC.defaultLook = () => ({ outfit: 'army', c1: 0, c2: 0, hat: 'helmet', hc: 0, glasses: 'none', back: 'none', bc: 0, vest: 'tactical', face: 'none', fc: 0, skin: 2, hair: 0 });

// a random person (used for every pedestrian). rnd = a function returning 0..1
ACC.randomLook = function(rnd) {
  const pick = a => a[Math.floor(rnd() * a.length)];
  const non = slot => ACC.ids(slot).filter(i => i !== 'none');
  return ACC.fix({
    outfit: rnd() < 0.4 ? 'casual' : pick(ACC.ids('outfit')),
    c1: Math.floor(rnd() * 50), c2: Math.floor(rnd() * 50),
    hat: rnd() < 0.5 ? pick(non('hat')) : 'none', hc: Math.floor(rnd() * 50),
    glasses: rnd() < 0.25 ? pick(non('glasses')) : 'none',
    back: rnd() < 0.22 ? pick(non('back')) : 'none', bc: Math.floor(rnd() * 50),
    vest: rnd() < 0.07 ? pick(non('vest')) : 'none',
    face: rnd() < 0.3 ? pick(non('face')) : 'none', fc: Math.floor(rnd() * 50),
    skin: Math.floor(rnd() * ACC.SKINS.length), hair: Math.floor(rnd() * ACC.HAIRS.length)
  });
};

// colour helpers used by the wardrobe + dude.js
ACC.shirtOf = (look, o) => o.shirts[look.c1 % o.shirts.length];
ACC.pantsOf = (look, o) => o.pantsFollow ? ACC.shirtOf(look, o) : o.pants[look.c2 % o.pants.length];

// builds all the extra pieces for a look and adds them to `parent` (the dude's body). Returns the group.
ACC.attach = function(parent, look) {
  const g = new THREE.Group();
  const o = ACC.get('outfit', look.outfit);
  const pick = (slot, id, idx) => {
    const d = ACC.get(slot, id);
    if (!d || !d.build) return;
    const cols = d.colors || ACC.COLORS;
    g.add(d.build(cols[idx % cols.length]));
  };
  pick('hat', look.hat, look.hc);
  pick('glasses', look.glasses, 0);
  pick('back', look.back, look.bc);
  pick('vest', look.vest, 0);
  pick('face', look.face, look.fc);
  if (o && o.build) g.add(o.build(ACC.shirtOf(look, o), ACC.pantsOf(look, o)));
  parent.add(g);
  return g;
};
ACC.dispose = function(g) { g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); };
