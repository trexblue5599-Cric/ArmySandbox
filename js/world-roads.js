// Plain island ground. The city grid and road markings are intentionally removed.
world.initRoads = function() {
  const groundSize = (CONFIG.LIMIT || 520) * 2 + 360;
  const grass = world.add(new THREE.PlaneGeometry(groundSize, groundSize), 0x78b957, 0, 0, 0);
  grass.rotation.x = -Math.PI / 2;
  grass.castShadow = false;
};
