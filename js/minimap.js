// js/minimap.js  -  round minimap that turns with the camera
const PPU = 1.5;   // pixels per world unit in the big map picture
let mctx = null, bigMap = null;

function initMinimap() {
  const mini = document.createElement('canvas');
  mini.id = 'minimap'; mini.width = 104; mini.height = 104;
  document.body.appendChild(mini);
  mctx = mini.getContext('2d');
  bigMap = document.createElement('canvas');
  bigMap.width = bigMap.height = 2 * CONFIG.LIMIT * PPU;
  (function drawBigMap() {
  const g = bigMap.getContext('2d');
  const X = v => (v + CONFIG.LIMIT) * PPU;
  const HF = CONFIG.HALF;
  g.fillStyle = '#3a9ad0'; g.fillRect(0, 0, bigMap.width, bigMap.height);
  g.fillStyle = '#6fae4f'; g.fillRect(X(-(CONFIG.LIMIT - 14)), X(-(CONFIG.LIMIT - 14)), 2 * (CONFIG.LIMIT - 14) * PPU, 2 * (CONFIG.LIMIT - 14) * PPU);
  g.fillStyle = '#9a9c98'; g.fillRect(X(-HF), X(-HF), 2 * HF * PPU, 2 * HF * PPU);
  g.fillStyle = '#45454a';
  CONFIG.ROADS.forEach(r => {
    g.fillRect(X(-HF), X(r) - 5 * PPU, 2 * HF * PPU, 10 * PPU);
    g.fillRect(X(r) - 5 * PPU, X(-HF), 10 * PPU, 2 * HF * PPU);
  });
  world.mapRects.forEach(r => {
    if (r.kind === 'p') g.fillStyle = '#5a9a3c';
    else if (r.kind === 'w') g.fillStyle = '#3a9ad0';
    else if (r.kind === 'plaza') g.fillStyle = '#d2cbbb';
    else g.fillStyle = r.h > 60 ? '#e6edf2' : r.h > 25 ? '#b8b2a8' : '#a39b8e';
    g.fillRect(X(r.x - r.w / 2), X(r.z - r.d / 2), r.w * PPU, r.d * PPU);
  });
})();
}

function drawMinimap() {
  const p = player.soldier.position, yaw = world.camYaw;
  const zs = 104 / 100 / PPU;                    // show 100 world units across
  mctx.clearRect(0, 0, 104, 104);
  mctx.save();
  mctx.beginPath(); mctx.arc(52, 52, 52, 0, 6.3); mctx.clip();
  mctx.fillStyle = '#6fae4f'; mctx.fillRect(0, 0, 104, 104);
  mctx.translate(52, 52);
  mctx.rotate(yaw + Math.PI);
  mctx.scale(zs, zs);
  mctx.translate(-(p.x + CONFIG.LIMIT) * PPU, -(p.z + CONFIG.LIMIT) * PPU);
  mctx.drawImage(bigMap, 0, 0);
  mctx.restore();
  // you (arrow)
  mctx.save();
  mctx.translate(52, 52);
  mctx.rotate(yaw - player.soldier.rotation.y);
  mctx.fillStyle = '#ffeb3b'; mctx.strokeStyle = '#000'; mctx.lineWidth = 1.5;
  mctx.beginPath(); mctx.moveTo(0, -6); mctx.lineTo(4.5, 5); mctx.lineTo(0, 2.5); mctx.lineTo(-4.5, 5); mctx.closePath();
  mctx.fill(); mctx.stroke();
  mctx.restore();
}
