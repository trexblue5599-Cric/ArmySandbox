// js/game.js  -  enemies, waves, bullets, HUD, minimap, camera, main loop
const game = { state: 'playing', wave: 0, score: 0, kills: 0, queue: [], spawnTimer: 0, breakTimer: 0, breaking: false };

// ---------- STYLES (added from here so no CSS file changes are needed) ----------
(function() {
  const s = document.createElement('style');
  s.textContent = `
    #look-pad{position:fixed;right:0;top:0;width:60%;height:100%;touch-action:none;z-index:5}
    #auto-btn{position:fixed;right:40px;bottom:160px;width:72px;height:36px;border-radius:18px;background:rgba(0,0,0,.45);
      color:#fff;font:bold 12px sans-serif;display:flex;align-items:center;justify-content:center;touch-action:none;z-index:10}
    #hud{position:fixed;top:50px;left:20px;color:#fff;font:bold 14px sans-serif;line-height:1.5;
      text-shadow:0 1px 3px #000;z-index:8;pointer-events:none}
    #banner{position:fixed;top:20%;left:0;width:100%;text-align:center;color:#fff;font:900 30px sans-serif;
      text-shadow:0 2px 8px #000;opacity:0;transition:opacity .4s;z-index:8;pointer-events:none}
    #vignette{position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:7;opacity:0;
      box-shadow:inset 0 0 110px 40px rgba(255,0,0,.85);transition:opacity .3s}
    #minimap{position:fixed;top:8px;right:8px;width:104px;height:104px;border-radius:8px;
      border:2px solid rgba(255,255,255,.65);z-index:8;pointer-events:none}
    #dead{display:none;position:fixed;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,.7);z-index:30;
      color:#fff;font-family:sans-serif;flex-direction:column;align-items:center;justify-content:center;text-align:center}
    #dead h1{margin:0 0 8px;font-size:38px}
    #dead button{margin-top:18px;padding:14px 34px;font:bold 20px sans-serif;border:0;border-radius:30px;background:#4caf50;color:#fff}
  `;
  document.head.appendChild(s);
})();

// ---------- HUD ----------
const hpWrap = document.createElement('div');
hpWrap.id = 'health-bar-container';
document.body.appendChild(hpWrap);
const hpFill = document.createElement('div');
hpFill.id = 'health-bar-fill';
hpWrap.appendChild(hpFill);

const hud = document.createElement('div'); hud.id = 'hud'; document.body.appendChild(hud);
const banner = document.createElement('div'); banner.id = 'banner'; document.body.appendChild(banner);
const vignette = document.createElement('div'); vignette.id = 'vignette'; document.body.appendChild(vignette);
const deadScreen = document.createElement('div');
deadScreen.id = 'dead';
deadScreen.innerHTML = '<h1>YOU DIED</h1><div id="dead-info"></div><button id="retry">PLAY AGAIN</button>';
document.body.appendChild(deadScreen);
const mini = document.createElement('canvas');
mini.id = 'minimap'; mini.width = 104; mini.height = 104;
document.body.appendChild(mini);

let bannerTimer = null;
function showBanner(text, ms) {
  banner.textContent = text;
  banner.style.opacity = 1;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { banner.style.opacity = 0; }, ms || 2200);
}

let lastHud = '';
function updateHUD() {
  const pct = Math.max(0, player.health) / player.maxHealth * 100;
  hpFill.style.width = pct + '%';
  hpFill.style.background = pct > 50 ? '#4caf50' : pct > 20 ? '#ff9800' : '#f44336';
  const alive = world.enemies.filter(e => e.alive).length + game.queue.length;
  const ammo = player.reloading ? 'RELOADING...' : 'AMMO ' + player.mag + '/' + player.magSize;
  const txt = 'WAVE ' + game.wave + ' &nbsp; SCORE ' + game.score + '<br>ENEMIES ' + alive + ' &nbsp; ' + ammo;
  if (txt !== lastHud) { hud.innerHTML = txt; lastHud = txt; }
}

// ---------- PARTICLES ----------
const partGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
const partMats = {};
function burst(x, y, z, color, count, power) {
  if (world.particles.length > 140) return;
  const mat = partMats[color] || (partMats[color] = new THREE.MeshBasicMaterial({ color }));
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(partGeo, mat);
    p.position.set(x, y, z);
    p.userData = {
      vx: (Math.random() - 0.5) * power, vy: Math.random() * power * 0.8 + 1, vz: (Math.random() - 0.5) * power,
      life: 0.35 + Math.random() * 0.3
    };
    world.scene.add(p);
    world.particles.push(p);
  }
}
function updateParticles(dt) {
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const p = world.particles[i], u = p.userData;
    u.vy -= 14 * dt;
    p.position.x += u.vx * dt; p.position.y += u.vy * dt; p.position.z += u.vz * dt;
    u.life -= dt;
    p.scale.setScalar(Math.max(0.01, u.life * 2.5));
    if (u.life <= 0 || p.position.y < 0) { world.scene.remove(p); world.particles.splice(i, 1); }
  }
}

// ---------- ENEMY TYPES ----------
const TYPES = {
  rifleman: {
    hp: 40, speed: 3.2, scale: 1, shoots: true, range: 30, min: 9, max: 17, rate: 1.3, dmg: 8, score: 100,
    look: { body: 0x9c8a5a, pants: 0x7a6a45, vest: 0x6e5f3a, pack: 0x4b4230, skin: 0xd2a37a, helmet: 0x6b5c36 }
  },
  rusher: {
    hp: 30, speed: 6.3, scale: 1, shoots: false, melee: true, dmg: 12, rate: 0.9, score: 100,
    look: { body: 0x8a2c2c, pants: 0x4a1a1a, vest: 0x5e1f1f, pack: 0x3a2a2a, skin: 0xd2a37a, helmet: 0x2a2a2a }
  },
  heavy: {
    hp: 130, speed: 2.2, scale: 1.3, shoots: true, range: 26, min: 8, max: 14, rate: 0.55, dmg: 6, score: 300,
    look: { body: 0x3a3f44, pants: 0x2a2e32, vest: 0x1f2326, pack: 0x2a2a2a, skin: 0xc79a73, helmet: 0x15181a }
  }
};

const barGeoBg = new THREE.PlaneGeometry(1.4, 0.17);
const barGeoFg = new THREE.PlaneGeometry(1.4, 0.11);
const barMatBg = new THREE.MeshBasicMaterial({ color: 0x000000 });
const barMatGreen = new THREE.MeshBasicMaterial({ color: 0x4caf50 });
const barMatRed = new THREE.MeshBasicMaterial({ color: 0xf44336 });

function spawnEnemy(typeName) {
  const cfg = TYPES[typeName];
  const pp = player.soldier.position;
  let pts = world.spawnPoints.filter(s => Math.hypot(s.x - pp.x, s.z - pp.z) > 30);
  if (!pts.length) pts = world.spawnPoints;
  const sp = pts[Math.floor(Math.random() * pts.length)];

  const model = world.makeSoldier(cfg.look);
  const g = model.group;
  g.scale.setScalar(cfg.scale);
  g.position.set(sp.x + (Math.random() - 0.5) * 3, 0, sp.z + (Math.random() - 0.5) * 3);
  world.scene.add(g);

  const bar = new THREE.Group();
  const bg = new THREE.Mesh(barGeoBg, barMatBg);
  const fg = new THREE.Mesh(barGeoFg, barMatGreen);
  fg.position.z = 0.01;
  bar.add(bg); bar.add(fg);
  world.scene.add(bar);

  world.enemies.push({
    type: typeName, cfg, hp: cfg.hp, mesh: g, parts: model.parts, bar, barFg: fg,
    alive: true, deathT: 0, phase: Math.random() * 6, cooldown: 0.8 + Math.random(),
    side: Math.random() < 0.5 ? 1 : -1, strafe: Math.random() < 0.5 ? 1 : -1, strafeT: 1 + Math.random() * 2,
    moving: 0
  });
}

function removeEnemy(e) {
  world.scene.remove(e.mesh);
  world.scene.remove(e.bar);
  const i = world.enemies.indexOf(e);
  if (i >= 0) world.enemies.splice(i, 1);
}

// walk toward (dx,dz), sliding around buildings and cars
function stepToward(e, dx, dz, speed, dt) {
  const len = Math.hypot(dx, dz) || 1;
  dx /= len; dz /= len;
  const p = e.mesh.position, step = speed * dt;
  const angles = [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6];
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i] * e.side, c = Math.cos(a), s = Math.sin(a);
    const nx = p.x + (dx * c - dz * s) * step, nz = p.z + (dx * s + dz * c) * step;
    if (Math.abs(nx) < 55 && Math.abs(nz) < 55 && !world.collides(nx, nz, 0.65)) {
      p.x = nx; p.z = nz;
      return true;
    }
  }
  e.side *= -1;
  return false;
}

function enemyShoot(e) {
  const p = e.mesh.position, pp = player.soldier.position;
  const dx = pp.x - p.x, dz = pp.z - p.z, d = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, dz) + (Math.random() - 0.5) * (0.1 + d * 0.004);
  const sx = Math.sin(ang), sz = Math.cos(ang);
  world.spawnBullet(p.x + sx * 1.5 * e.cfg.scale, 1.5, p.z + sz * 1.5 * e.cfg.scale, sx, sz, false, e.cfg.dmg, 38);
  e.flashUntil = performance.now() + 60;
  if (d < 45) world.sfx.enemyShot();
}

function damageEnemy(e, dmg, x, y, z) {
  e.hp -= dmg;
  burst(x, y, z, 0xffd54f, 4, 5);
  world.sfx.hit();
  const ratio = Math.max(0, e.hp / e.cfg.hp);
  e.barFg.scale.x = Math.max(0.001, ratio);
  e.barFg.position.x = -(1 - ratio) * 0.7;
  e.barFg.material = ratio < 0.35 ? barMatRed : barMatGreen;
  if (e.hp <= 0) {
    e.alive = false;
    e.deathT = 0;
    world.scene.remove(e.bar);
    game.score += e.cfg.score;
    game.kills++;
    burst(e.mesh.position.x, 1.2, e.mesh.position.z, 0xff7043, 12, 7);
    world.sfx.die();
  }
}

function hurtPlayer(n) {
  if (game.state !== 'playing') return;
  player.health -= n;
  vignette.style.opacity = 1;
  setTimeout(() => { vignette.style.opacity = 0; }, 160);
  world.sfx.hurt();
  const pp = player.soldier.position;
  burst(pp.x, 1.6, pp.z, 0xd32f2f, 5, 4);
  if (player.health <= 0) {
    player.health = 0;
    game.state = 'dead';
    player.dead = true;
    player.firing = false;
    document.getElementById('dead-info').textContent = 'Wave ' + game.wave + '  |  Score ' + game.score + '  |  Kills ' + game.kills;
    deadScreen.style.display = 'flex';
  }
}

function updateEnemies(dt) {
  const now = performance.now();
  const pp = player.soldier.position;
  const live = game.state === 'playing';

  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const e = world.enemies[i];
    const p = e.mesh.position, cfg = e.cfg;

    // dead: fall over, then sink away
    if (!e.alive) {
      e.deathT += dt;
      e.parts.inner.rotation.x = -Math.min(1, e.deathT / 0.35) * 1.5;
      if (e.deathT > 2) p.y -= 1.5 * dt;
      if (e.deathT > 3.5) removeEnemy(e);
      continue;
    }

    const dx = pp.x - p.x, dz = pp.z - p.z;
    const dist = Math.hypot(dx, dz);
    let moved = false;

    if (live) {
      // face the player
      let diff = Math.atan2(dx, dz) - e.mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      e.mesh.rotation.y += diff * Math.min(1, 8 * dt);

      if (cfg.melee) {
        if (dist > 1.8) moved = stepToward(e, dx, dz, cfg.speed, dt);
        else {
          e.cooldown -= dt;
          if (e.cooldown <= 0) { e.cooldown = cfg.rate; hurtPlayer(cfg.dmg); }
        }
      } else {
        const sees = dist < cfg.range && !world.blocked(p.x, p.z, pp.x, pp.z, 1.5);
        if (!sees || dist > cfg.max) {
          moved = stepToward(e, dx, dz, cfg.speed, dt);        // come closer
        } else if (dist < cfg.min) {
          moved = stepToward(e, -dx, -dz, cfg.speed * 0.8, dt); // back off
        } else {
          e.strafeT -= dt;
          if (e.strafeT <= 0) { e.strafe *= -1; e.strafeT = 1.5 + Math.random() * 2.5; }
          moved = stepToward(e, -dz * e.strafe, dx * e.strafe, cfg.speed * 0.6, dt); // sidestep
        }
        if (sees) {
          e.cooldown -= dt;
          if (e.cooldown <= 0) { e.cooldown = cfg.rate * (0.8 + Math.random() * 0.5); enemyShoot(e); }
        }
      }

      // don't stack on other enemies
      for (const o of world.enemies) {
        if (o === e || !o.alive) continue;
        const ox = p.x - o.mesh.position.x, oz = p.z - o.mesh.position.z;
        const od = Math.hypot(ox, oz);
        if (od < 1.5 && od > 0.001) {
          const nx = p.x + ox / od * 3 * dt, nz = p.z + oz / od * 3 * dt;
          if (!world.collides(nx, nz, 0.65)) { p.x = nx; p.z = nz; }
        }
      }
    }

    // animation
    e.moving += ((moved ? 1 : 0) - e.moving) * Math.min(1, 10 * dt);
    e.phase += dt * 10 * e.moving * (cfg.speed > 5 ? 1.5 : 1);
    const sw = Math.sin(e.phase) * 0.9 * e.moving;
    e.parts.legL.rotation.x = sw;
    e.parts.legR.rotation.x = -sw;
    e.parts.inner.position.y = Math.abs(Math.sin(e.phase)) * 0.07 * e.moving;
    e.parts.flash.visible = !!e.flashUntil && now < e.flashUntil;

    // health bar floats above, faces the camera
    e.bar.position.set(p.x, 2.9 * cfg.scale + 0.3, p.z);
    e.bar.quaternion.copy(world.camera.quaternion);
  }
}

// ---------- BULLETS ----------
function updateBullets(dt) {
  const pp = player.soldier.position;
  for (let i = world.bullets.length - 1; i >= 0; i--) {
    const b = world.bullets[i], u = b.userData;
    const total = u.speed * dt;
    const n = Math.max(1, Math.ceil(total / 0.7));
    const stepLen = total / n;
    let dead = false;

    for (let k = 0; k < n && !dead; k++) {
      b.position.x += u.dx * stepLen;
      b.position.z += u.dz * stepLen;

      if (world.hitObstacle(b.position.x, b.position.z, b.position.y, 0)) {
        burst(b.position.x, b.position.y, b.position.z, 0xcfcfcf, 3, 4);
        dead = true;
        break;
      }
      if (u.friendly) {
        for (const e of world.enemies) {
          if (!e.alive) continue;
          const dx = b.position.x - e.mesh.position.x, dz = b.position.z - e.mesh.position.z;
          const r = 0.8 * e.cfg.scale;
          if (dx * dx + dz * dz < r * r) {
            damageEnemy(e, u.damage, b.position.x, b.position.y, b.position.z);
            dead = true;
            break;
          }
        }
      } else if (game.state === 'playing') {
        const dx = b.position.x - pp.x, dz = b.position.z - pp.z;
        if (dx * dx + dz * dz < 0.75 * 0.75) { hurtPlayer(u.damage); dead = true; }
      }
    }

    u.life -= dt;
    if (u.life <= 0) dead = true;
    if (dead) { world.scene.remove(b); world.bullets.splice(i, 1); }
  }
}

// ---------- MEDKITS ----------
function updatePickups(dt) {
  const pp = player.soldier.position;
  const t = performance.now() / 1000;
  for (const m of world.medkits) {
    if (m.active) {
      m.mesh.rotation.y = t * 1.5;
      m.mesh.position.y = 0.9 + Math.sin(t * 3 + m.x) * 0.12;
      if (game.state === 'playing' && player.health < player.maxHealth &&
          Math.hypot(pp.x - m.x, pp.z - m.z) < 1.7) {
        player.health = Math.min(player.maxHealth, player.health + 35);
        m.active = false; m.mesh.visible = false; m.timer = 30;
        world.sfx.pickup();
        showBanner('+35 HEALTH', 900);
      }
    } else {
      m.timer -= dt;
      if (m.timer <= 0) { m.active = true; m.mesh.visible = true; }
    }
  }
}

// ---------- WAVES ----------
function startWave() {
  game.wave++;
  const n = game.wave, list = [];
  for (let i = 0; i < 2 + n; i++) list.push('rifleman');
  for (let i = 0; i < 1 + Math.floor(n / 2); i++) list.push('rusher');
  for (let i = 0; i < Math.floor((n - 1) / 3); i++) list.push('heavy');
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  game.queue = list;
  game.spawnTimer = 1.5;
  game.breaking = false;
  showBanner('WAVE ' + n, 2200);
  world.sfx.wave();
}

function updateWaves(dt) {
  if (game.state !== 'playing') return;
  const alive = world.enemies.filter(e => e.alive).length;
  if (game.queue.length) {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0 && alive < 10) {
      spawnEnemy(game.queue.pop());
      game.spawnTimer = 0.9;
    }
  } else if (alive === 0 && !game.breaking) {
    game.breaking = true;
    game.breakTimer = 4;
    game.score += game.wave * 50;
    showBanner('WAVE ' + game.wave + ' CLEARED', 2500);
  }
  if (game.breaking) {
    game.breakTimer -= dt;
    if (game.breakTimer <= 0) startWave();
  }
}

function restart() {
  for (const e of world.enemies.slice()) removeEnemy(e);
  for (const b of world.bullets) world.scene.remove(b);
  world.bullets.length = 0;
  for (const m of world.medkits) { m.active = true; m.mesh.visible = true; }
  player.reset();
  game.state = 'playing';
  game.wave = 0; game.score = 0; game.kills = 0; game.queue = [];
  deadScreen.style.display = 'none';
  startWave();
}
document.getElementById('retry').addEventListener('click', restart);

// ---------- AIM RING (shows who you will shoot) ----------
const aimRing = new THREE.Mesh(
  new THREE.RingGeometry(0.8, 1.05, 20),
  new THREE.MeshBasicMaterial({ color: 0xff3b30, side: THREE.DoubleSide })
);
aimRing.rotation.x = -Math.PI / 2;
aimRing.visible = false;
world.scene.add(aimRing);

// ---------- MINIMAP ----------
const MS = 104 / 120;
const mctx = mini.getContext('2d');
const miniBg = document.createElement('canvas');
miniBg.width = 104; miniBg.height = 104;
(function drawMiniBg() {
  const g = miniBg.getContext('2d');
  const X = v => (v + 60) * MS;
  g.fillStyle = '#8c8e8a'; g.fillRect(0, 0, 104, 104);
  g.fillStyle = '#45454a';
  world.roads.forEach(r => {
    g.fillRect(0, X(r) - 5 * MS, 104, 10 * MS);
    g.fillRect(X(r) - 5 * MS, 0, 10 * MS, 104);
  });
  g.fillStyle = '#5a8f3c';
  world.parks.forEach(p => g.fillRect(X(p.x) - 9 * MS, X(p.z) - 9 * MS, 18 * MS, 18 * MS));
  world.obstacles.forEach(o => {
    if (o.h >= 4 && o.hw >= 2) {
      g.fillStyle = o.h > 30 ? '#cfd8dc' : o.h > 15 ? '#b0a8a0' : '#9c9488';
      g.fillRect(X(o.x - o.hw), X(o.z - o.hd), o.hw * 2 * MS, o.hd * 2 * MS);
    }
  });
})();

function drawMinimap() {
  const X = v => (v + 60) * MS;
  mctx.drawImage(miniBg, 0, 0);
  mctx.fillStyle = '#ffffff';
  world.medkits.forEach(m => { if (m.active) mctx.fillRect(X(m.x) - 2, X(m.z) - 2, 4, 4); });
  mctx.fillStyle = '#ff3b30';
  world.enemies.forEach(e => {
    if (e.alive) { mctx.beginPath(); mctx.arc(X(e.mesh.position.x), X(e.mesh.position.z), 2.4, 0, 6.3); mctx.fill(); }
  });
  const p = player.soldier.position;
  mctx.save();
  mctx.translate(X(p.x), X(p.z));
  mctx.rotate(Math.PI - player.soldier.rotation.y);
  mctx.fillStyle = '#00e676';
  mctx.beginPath(); mctx.moveTo(0, -5); mctx.lineTo(3.5, 4); mctx.lineTo(-3.5, 4); mctx.closePath(); mctx.fill();
  mctx.restore();
}

// ---------- CAMERA (orbits you, never goes inside buildings) ----------
const camTarget = new THREE.Vector3();
let camDist = 9;
function updateCamera(dt) {
  const p = player.soldier.position;
  const yaw = world.camYaw, pit = world.camPitch;
  const dirX = -Math.sin(yaw) * Math.cos(pit), dirZ = -Math.cos(yaw) * Math.cos(pit), dirY = Math.sin(pit);
  let d = 9;
  for (let t = 1; t <= 9; t += 0.5) {
    if (world.hitObstacle(p.x + dirX * t, p.z + dirZ * t, 2 + dirY * t, 0.5)) { d = Math.max(2.2, t - 1); break; }
  }
  camDist += (d - camDist) * Math.min(1, 8 * dt);
  camTarget.set(p.x + dirX * camDist, 2.2 + dirY * camDist, p.z + dirZ * camDist);
  world.camera.position.lerp(camTarget, Math.min(1, 12 * dt));
  world.camera.lookAt(p.x, 1.9, p.z);
}

// ---------- MAIN LOOP ----------
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (game.state === 'playing') player.update(dt); else player.updateDead(dt);
  updateWaves(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateParticles(dt);
  updatePickups(dt);

  // aim ring under the enemy you will shoot
  const t = game.state === 'playing' ? player.target : null;
  aimRing.visible = !!t;
  if (t) aimRing.position.set(t.mesh.position.x, 0.12, t.mesh.position.z);

  updateCamera(dt);
  drawMinimap();
  updateHUD();
  world.renderer.render(world.scene, world.camera);
}

addEventListener('resize', () => {
  world.camera.aspect = innerWidth / innerHeight;
  world.camera.updateProjectionMatrix();
  world.renderer.setSize(innerWidth, innerHeight);
});

world.camera.position.set(0, 6, -9);
startWave();
loop();
