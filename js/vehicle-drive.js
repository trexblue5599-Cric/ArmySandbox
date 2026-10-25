// Driveable parked cars. Keyboard: E enter/exit, W/S throttle/reverse, A/D steer.
// Touch users get matching on-screen controls.
const vehicleDrive = {
  cars: [], active: null, speed: 0, steer: 0,
  maxSpeed: 24, reverseSpeed: 9, accel: 13, brake: 20, turnRate: 1.65,
  keys: {},
  init() {
    const paths = [
      'vehicles/sedan.glb', 'vehicles/hatchback-sports.glb', 'vehicles/police.glb',
      'vehicles/taxi.glb', 'vehicles/van.glb', 'vehicles/suv.glb'
    ];
    const loader = new THREE.GLTFLoader();
    const colors = CONFIG.CAR_COLORS || [0xe8dcc0, 0xc62828, 0x1565c0, 0xeeeeee];
    // Park along the central roads, away from the exact crossroads.
    const spots = [
      {x: 4.0, z: 13, rot: 0}, {x: -4.0, z: -13, rot: Math.PI},
      {x: 13, z: -4, rot: Math.PI / 2}, {x: -13, z: 4, rot: -Math.PI / 2},
      {x: 44, z: 3.8, rot: 0}, {x: -44, z: -3.8, rot: Math.PI}
    ];
    paths.forEach((path, i) => loader.load(path, gltf => {
      const root = new THREE.Group();
      const model = gltf.scene;
      model.scale.setScalar(1.5);
      model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      root.add(model);
      const s = spots[i]; root.position.set(s.x, (world.groundAt?world.groundAt(s.x,s.z):0), s.z); root.rotation.y = s.rot;
      root.userData.driveable = true;
      world.scene.add(root);
      this.cars.push({ root, x:s.x, z:s.z, yaw:s.rot, path, speed:0 });
    }, undefined, err => console.warn('Driveable car failed to load:', path, err)));
    this.makeControls();
    addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE' && !e.repeat) { e.preventDefault(); this.toggle(); }
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
  },
  makeControls() {
    const style = (el, css) => Object.assign(el.style, css);
    const panel = document.createElement('div'); panel.id = 'drive-controls';
    style(panel, {position:'fixed', right:'14px', bottom:'18px', zIndex:'50', display:'none', gap:'8px', alignItems:'center', userSelect:'none', touchAction:'none', font:'bold 16px sans-serif'});
    const releases = [];   // the car keys the buttons press
    const make = (label, key, css={}) => {
      const b = document.createElement('button'); b.textContent = label; b.setAttribute('aria-label', label);
      style(b, Object.assign({width:'58px',height:'58px',border:'2px solid rgba(255,255,255,.8)',borderRadius:'14px',background:'rgba(20,30,40,.78)',color:'#fff',fontSize:'20px',fontWeight:'bold',touchAction:'none'}, css));
      const down = e => { e.preventDefault(); this.keys[key] = true; };
      const up = e => { if(e) e.preventDefault(); this.keys[key] = false; };
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
      b.addEventListener('touchstart', down, {passive:false}); b.addEventListener('touchend', up); b.addEventListener('touchcancel', up);
      releases.push(key);
      panel.appendChild(b); return b;
    };
    // if a finger lifts anywhere (even off the button), let go of every car key
    const letGo = () => { releases.forEach(k => { this.keys[k] = false; }); };
    ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'blur'].forEach(ev => addEventListener(ev, letGo));
    const steer = document.createElement('div'); style(steer,{display:'flex',gap:'6px'});
    const left = make('◀','KeyA'), right = make('▶','KeyD'); steer.append(left,right);
    const steerPanel = document.createElement('div'); steerPanel.id = 'steer-controls';
    style(steerPanel, {position:'fixed', left:'14px', bottom:'18px', zIndex:'50', display:'none', userSelect:'none', touchAction:'none'});
    steerPanel.appendChild(steer);
    document.body.appendChild(steerPanel); this.steerPanel = steerPanel;
    const pedals = document.createElement('div'); style(pedals,{display:'flex',gap:'6px'});
    const back = make('▼','KeyS'), forward = make('▲','KeyW'); pedals.append(back,forward);
    panel.append(pedals);
    const exit = make('EXIT','KeyE',{width:'56px',fontSize:'12px',background:'rgba(150,35,25,.85)'});
    exit.addEventListener('pointerdown', e => { e.preventDefault(); this.toggle(true); });
    document.body.appendChild(panel); this.panel = panel;
    const enter = document.createElement('button'); enter.id='enter-car-btn'; enter.textContent='DRIVE  [E]';
    style(enter,{position:'fixed',left:'50%',bottom:'24px',transform:'translateX(-50%)',zIndex:'50',display:'none',padding:'13px 20px',border:'2px solid white',borderRadius:'12px',background:'rgba(20,110,45,.9)',color:'white',font:'bold 16px sans-serif'});
    enter.addEventListener('click', () => this.toggle()); document.body.appendChild(enter); this.enterButton=enter;
    const help = document.createElement('div'); help.textContent='E: enter / exit car';
    style(help,{position:'fixed',left:'50%',top:'12px',transform:'translateX(-50%)',zIndex:'25',display:'none',padding:'7px 10px',borderRadius:'8px',background:'rgba(0,0,0,.6)',color:'white',font:'13px sans-serif',pointerEvents:'none'});
    document.body.appendChild(help); this.help=help;
  },
  setWalkControls(on) {
    const d = on ? '' : 'none';
    ['joystick-base','joystick-knob','fire-btn'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = d; });
  },
  allCars() {
    // Include every spawned traffic car as well as the extra parked vehicles.
    const traffic = (world.traffic || []).map(t => ({
      root: t.g, traffic: t, get yaw() { return t.g.rotation.y; },
      set yaw(v) { t.g.rotation.y = v; }, path: t.path || 'traffic car'
    }));
    return [...this.cars, ...traffic];
  },
  nearest() {
    if (!player || !player.soldier) return null;
    const p = player.soldier.position; let best=null, dist=Infinity;
    for (const c of this.allCars()) { if (!c.root || !c.root.visible) continue; const d=Math.hypot(p.x-c.root.position.x,p.z-c.root.position.z); if(d<dist){dist=d;best=c;} }
    return dist < 5.5 ? best : null;
  },
  toggle(forceExit=false) {
    if (this.active) {
      const c=this.active, p=player.soldier.position;
      const yaw = c.traffic ? c.root.rotation.y : c.yaw;
      const sideX=Math.cos(yaw)*1.8, sideZ=-Math.sin(yaw)*1.8;
      p.set(c.root.position.x+sideX,0,c.root.position.z+sideZ);
      if (world.collides(p.x,p.z,0.4)) {   // never step out into a wall / the water
        out: for (let r=0.6;r<=8;r+=0.6) for (let k=0;k<16;k++) { const a=k/16*Math.PI*2, tx=c.root.position.x+Math.cos(a)*(1.8+r), tz=c.root.position.z+Math.sin(a)*(1.8+r); if(!world.collides(tx,tz,0.4)){ p.x=tx; p.z=tz; break out; } }
      }
      player.soldier.visible=true; player.model.visible=true;
      this.active=null; this.speed=0; this.keys={}; this.panel.style.display='none'; this.steerPanel.style.display='none'; this.help.style.display='none';
      this.setWalkControls(true);
      return;
    }
    const c=this.nearest(); if(!c) return;
    if (c.traffic) { c.yaw = c.root.rotation.y; c.x = c.root.position.x; c.z = c.root.position.z; }
    this.active=c; this.speed=0; this.keys={}; player.soldier.visible=false;
    this.panel.style.display='flex'; this.steerPanel.style.display='flex'; this.enterButton.style.display='none'; this.help.style.display='block';
    this.setWalkControls(false);
    if (typeof fp!=='undefined' && fp.ready) fp.leave();
  },
  update(dt) {
    if (!this.active) {
      const near=this.nearest();
      if (this.enterButton) this.enterButton.style.display=near?'block':'none';
      return;
    }
    const c=this.active, k=this.keys;
    const forward=!!(k.KeyW||k.ArrowUp), reverse=!!(k.KeyS||k.ArrowDown);
    const left=!!(k.KeyA||k.ArrowLeft), right=!!(k.KeyD||k.ArrowRight);
    if(forward) this.speed=Math.min(this.maxSpeed,this.speed+this.accel*dt);
    else if(reverse) this.speed=Math.max(-this.reverseSpeed,this.speed-this.accel*dt);
    else this.speed += (this.speed>0?-1:1)*Math.min(Math.abs(this.speed),this.brake*dt);
    const steering=(left?1:0)-(right?1:0);   // left button = turn left, right button = turn right
    if(Math.abs(this.speed)>0.15) c.yaw += steering*this.turnRate*dt*Math.sign(this.speed)*Math.min(1,Math.abs(this.speed)/4);
    const yaw = c.traffic ? c.root.rotation.y : c.yaw;
    const nx=c.root.position.x+Math.sin(yaw)*this.speed*dt;
    const nz=c.root.position.z+Math.cos(yaw)*this.speed*dt;
    const blocked=world.collides(nx,nz,1.35);
    if(!blocked && Math.abs(nx)<CONFIG.LIMIT-2 && Math.abs(nz)<CONFIG.LIMIT-2) {
      c.root.position.set(nx,(world.groundAt?world.groundAt(nx,nz):0),nz);
      if (c.traffic) { c.traffic.x=nx; c.traffic.z=nz; c.traffic.dir=1; c.traffic.speed=0; c.traffic.cruise=0; c.traffic.alongZ=false; c.yaw = yaw + steering*this.turnRate*dt*Math.sign(this.speed)*Math.min(1,Math.abs(this.speed)/4); c.root.rotation.y=c.yaw; }
      else c.yaw = yaw + steering*this.turnRate*dt*Math.sign(this.speed)*Math.min(1,Math.abs(this.speed)/4);
    } else this.speed=0;
    c.root.rotation.y=c.traffic ? c.root.rotation.y : c.yaw;
    // Keep the car as the update/camera reference while occupied.
    this.help.textContent=`DRIVING  ${Math.round(Math.abs(this.speed)*3.6)} km/h  ·  E to exit`;
  },
  updateCamera(dt) {
    if(!this.active) return;
    const c=this.active, x=c.root.position.x, z=c.root.position.z, yaw=c.yaw;
    const target=new THREE.Vector3(x-Math.sin(yaw)*7, 4.0, z-Math.cos(yaw)*7);
    world.camera.position.lerp(target,Math.min(1,5*dt));
    world.camera.lookAt(x,1.0,z);
  }
};
