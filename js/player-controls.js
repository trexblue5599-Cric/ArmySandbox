// js/player-controls.js  -  joystick, camera-look (drag right side), RUN button, keyboard
player.initControls = function() {
  // ---------- CONTROLS ----------
  const el = (id, text) => {
    const d = document.createElement('div');
    d.id = id;
    if (text) d.textContent = text;
    document.body.appendChild(d);
    return d;
  };
  player.pad = el('look-pad');
  player.base = el('joystick-base');
  player.knob = el('joystick-knob');
  player.runBtn = el('fire-btn', 'RUN');
  player.runBtn.style.background = 'rgba(40,120,255,.6)';

  let dragging = false;
  function joy(e) {
    const r = player.base.getBoundingClientRect();
    let dx = e.clientX - (r.left + 65), dy = e.clientY - (r.top + 65);
    const len = Math.hypot(dx, dy), max = 55;
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    player.knob.style.left = (60 + dx) + 'px';
    player.knob.style.bottom = (75 - dy) + 'px';
    player.jx = dx / max; player.jz = dy / max;
  }
  const endJoy = () => {
    dragging = false; player.jx = player.jz = 0;
    player.knob.style.left = '60px'; player.knob.style.bottom = '75px';
  };
  player.base.addEventListener('pointerdown', e => { dragging = true; player.base.setPointerCapture(e.pointerId); joy(e); });
  player.base.addEventListener('pointermove', e => { if (dragging) joy(e); });
  player.base.addEventListener('pointerup', endJoy);
  player.base.addEventListener('pointercancel', endJoy);

  let lookId = null, lx = 0, ly = 0;
  player.pad.addEventListener('pointerdown', e => {
    if (lookId !== null) return;
    lookId = e.pointerId; lx = e.clientX; ly = e.clientY;
    player.pad.setPointerCapture(e.pointerId);
  });
  player.pad.addEventListener('pointermove', e => {
    if (e.pointerId !== lookId) return;
    world.camYaw -= (e.clientX - lx) * 0.008;
    world.camPitch = Math.max(0.12, Math.min(1.0, world.camPitch + (e.clientY - ly) * 0.004));
    lx = e.clientX; ly = e.clientY;
  });
  const endLook = e => { if (e.pointerId === lookId) lookId = null; };
  player.pad.addEventListener('pointerup', endLook);
  player.pad.addEventListener('pointercancel', endLook);

  player.runBtn.addEventListener('pointerdown', e => { e.preventDefault(); player.runBtn.setPointerCapture(e.pointerId); player.running = true; });
  const stopRun = () => { player.running = false; };
  player.runBtn.addEventListener('pointerup', stopRun);
  player.runBtn.addEventListener('pointercancel', stopRun);

  player.keys = {};
  addEventListener('keydown', e => { player.keys[e.code] = true; });
  addEventListener('keyup', e => { player.keys[e.code] = false; });
};
