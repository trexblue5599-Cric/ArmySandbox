// js/config.js  -  SETTINGS. Change the numbers/lists here; no other file needs to be touched.
const CONFIG = {
  DAY_LENGTH: 240,   // seconds for one full 24-hour day
  START_HOUR: 9,     // game starts at 9 AM

  ROADS: [-80, -40, 0, 40, 80],   // road centre lines (used for both x and z)
  ROAD_W: 10,
  BLOCKS: [-60, -20, 20, 60],     // block centres (x and z); each block is 30 x 30

  // MAP: rows go north -> south, columns go west -> east.
  // types: downtown, tower, mid, suburb, park, fair, plaza, industrial
  DISTRICTS: [
    ['suburb', 'mid',      'mid',      'industrial'],
    ['mid',    'tower',    'downtown', 'mid'],
    ['fair',   'downtown', 'downtown', 'plaza'],
    ['suburb', 'suburb',   'park',     'mid']
  ],

  LAKE: { x: 108, z: -108 },

  // palettes
  DOWN_STYLES: ['glass', 'glass', 'concrete'],
  MID_STYLES: ['brick', 'beige', 'concrete'],
  WALLS: [0xffe0b2, 0xbbdefb, 0xf8bbd0, 0xfff9c4, 0xc8e6c9, 0xd1c4e9, 0xffccbc, 0xb2ebf2],
  ROOFS: [0xb23a30, 0x5d4037, 0x37474f, 0x2e6b3a, 0x7b3f7f, 0x1f5fa8],
  CAR_COLORS: [0xc62828, 0x1565c0, 0xeeeeee, 0x222222, 0xf9a825, 0x2e7d32, 0x6a1b9a, 0x546e7a],
  SHIRTS: [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xffffff, 0x8e24aa, 0xff7043, 0x26c6da],
  PANTS: [0x37474f, 0x3b5b92, 0x5d4037, 0x212121],
  SKINS: [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac],

  // counts
  TRAFFIC_CARS: 18,
  PEDESTRIANS: 26
};
