// js/config.js  -  SETTINGS. Change numbers/lists here; no other file needs touching.
const CONFIG = {
  DAY_LENGTH: 240,   // seconds for one full 24-hour day
  START_HOUR: 9,     // game starts at 9 AM

  ROADS: [-80, -40, 0, 40, 80],   // road centre lines (used for both x and z)
  ROAD_W: 10,
  BLOCKS: [-60, -20, 20, 60],     // block centres (x and z); each block is 30 x 30

  // MAP: rows go north -> south, columns go west -> east.
  // block types: rowblock (street of houses), tower, park, plaza, parking
  DISTRICTS: [
    ['rowblock', 'rowblock', 'tower',    'parking'],
    ['rowblock', 'tower',    'rowblock', 'rowblock'],
    ['park',     'rowblock', 'tower',    'plaza'],
    ['rowblock', 'rowblock', 'park',     'rowblock']
  ],

  LAKE: { x: 108, z: -108 },

  // ---------- 3D MODELS (.glb files in the assets/ folder) ----------
  // scale: 5  = 5x the size inside the file      height: 7 = make it 7 units tall
  // length: 2 = make its longest side 2 units    rot: turn it (radians) if it faces the wrong way
  // shadow: true = it casts a shadow (costs speed)
  ASSET_DIR: 'assets/',
  MODELS: {
    // buildings (scale 5 = about 5 floors)
    bld_red:        { file: 'building-red.glb',        scale: 5, shadow: true },
    bld_red_corner: { file: 'building-red-corner.glb', scale: 5, shadow: true },
    bld_green:      { file: 'building-green.glb',      scale: 5, shadow: true },
    bld_gb:         { file: 'gb-blank.glb',            scale: 5, shadow: true },
    bld_rb:         { file: 'rb-blank.glb',            scale: 5, shadow: true },
    bld_pizza:      { file: 'pizza-corner.glb',        scale: 5, shadow: true },
    bld_brown:      { file: 'brown-building.glb',      scale: 5, shadow: true },
    bld_big:        { file: 'big-building.glb',        scale: 5, shadow: true },

    // cars (Kenney)
    car_sedan:        { file: 'car-sedan.glb',            scale: 1.3, shadow: true },
    car_sedan_sports: { file: 'car-sedan-sports.glb',     scale: 1.3, shadow: true },
    car_suv:          { file: 'car-suv.glb',              scale: 1.3, shadow: true },
    car_suv_luxury:   { file: 'car-suv-luxury.glb',       scale: 1.3, shadow: true },
    car_taxi:         { file: 'car-taxi.glb',             scale: 1.3, shadow: true },
    car_hatchback:    { file: 'car-hatchback-sports.glb', scale: 1.3, shadow: true },
    car_van:          { file: 'car-van.glb',              scale: 1.3, shadow: true },
    car_truck:        { file: 'car-truck.glb',            scale: 1.3, shadow: true },
    car_police:       { file: 'car-police.glb',           scale: 1.3, shadow: true },
    car_delivery:     { file: 'car-delivery.glb',         scale: 1.3, shadow: true },
    car_ambulance:    { file: 'car-ambulance.glb',        scale: 1.3, shadow: true },
    car_firetruck:    { file: 'car-firetruck.glb',        scale: 1.3, shadow: true },
    car_garbage:      { file: 'car-garbage-truck.glb',    scale: 1.3, shadow: true },

    // props
    tree:        { file: 'tree.glb',            height: 7.5, shadow: true },
    bench:       { file: 'bench.glb',           length: 2.3 },
    bus_stop:    { file: 'bus-stop.glb',        length: 4.2 },
    bus_sign:    { file: 'bus-stop-sign.glb',   height: 3.2 },
    cone:        { file: 'cone.glb',            height: 0.8 },
    dumpster:    { file: 'dumpster.glb',        height: 1.7 },
    hydrant:     { file: 'fire-hydrant.glb',    height: 0.9 },
    flower_pot:  { file: 'flower-pot.glb',      height: 1.3 },
    mailbox:     { file: 'mailbox.glb',         height: 1.3 },
    power_box:   { file: 'power-box.glb',       height: 1.4 },
    trash_can:   { file: 'trash-can.glb',       height: 1.1 },
    traffic_light: { file: 'traffic-light.glb', height: 6.2 },
    stop_sign:   { file: 'stop-sign.glb',       height: 3.0 },
    fence:       { file: 'fence-piece.glb',     length: 2.4 },
    planter:     { file: 'planter-bushes.glb',  length: 2.4 },
    manhole:     { file: 'manhole-cover.glb',   length: 1.4 }
  },

  PARKED_MODELS:  ['car_sedan', 'car_sedan_sports', 'car_suv', 'car_suv_luxury', 'car_taxi', 'car_hatchback', 'car_van', 'car_truck'],
  TRAFFIC_MODELS: ['car_sedan', 'car_sedan_sports', 'car_suv', 'car_taxi', 'car_hatchback', 'car_van', 'car_police', 'car_truck',
                   'car_delivery', 'car_ambulance', 'car_firetruck', 'car_garbage', 'car_suv_luxury'],

  // people colours
  SHIRTS: [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xffffff, 0x8e24aa, 0xff7043, 0x26c6da],
  PANTS: [0x37474f, 0x3b5b92, 0x5d4037, 0x212121],
  SKINS: [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac],

  TRAFFIC_CARS: 18,
  PEDESTRIANS: 26,
  SHADOWS: true     // set false if the game is slow on your phone
};
