// js/hud.js  -  on-screen clock, hint text, and the CSS for the look-pad / minimap
let clockEl = null, lastClock = '';

function initHud() {
  const s = document.createElement('style');
  s.textContent = `
    #look-pad{position:fixed;right:0;top:0;width:60%;height:100%;touch-action:none;z-index:5}
    #clock{position:fixed;top:10px;left:14px;color:#fff;font:bold 18px sans-serif;text-shadow:0 1px 4px #000;
      z-index:8;padding:6px 10px;background:rgba(0,0,0,.28);border-radius:14px}
    #hint{position:fixed;left:0;bottom:8px;width:100%;text-align:center;color:#fff;font:12px sans-serif;
      text-shadow:0 1px 3px #000;z-index:8;pointer-events:none;transition:opacity 1s}
    #minimap{position:fixed;top:8px;right:8px;width:104px;height:104px;border-radius:50%;
      border:2px solid rgba(255,255,255,.75);z-index:8;pointer-events:none}
  `;
  document.head.appendChild(s);

  clockEl = document.createElement('div');
  clockEl.id = 'clock';
  document.body.appendChild(clockEl);
  clockEl.addEventListener('pointerdown', () => { world.hour = (world.hour + 3) % 24; });   // tap the clock = skip 3 hours

  const hint = document.createElement('div');
  hint.id = 'hint';
  hint.textContent = 'Left: move  |  Drag right side: look around  |  Hold RUN: sprint  |  Tap the clock: skip time  |  Tap \uD83D\uDC55: change clothes';
  document.body.appendChild(hint);
  setTimeout(() => { hint.style.opacity = 0; }, 9000);
}

function updateHud() {
  const h = Math.floor(world.hour), m = Math.floor((world.hour - h) * 60);
  const icon = (h >= 6 && h < 18) ? '\u2600\uFE0F' : '\uD83C\uDF19';
  const txt = icon + ' ' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  if (txt !== lastClock) { clockEl.textContent = txt; lastClock = txt; }
}
