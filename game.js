// game.js

// 1. Create Health UI
const healthBarContainer = document.createElement('div');
healthBarContainer.style.cssText = 'position:fixed; top:20px; left:20px; width:200px; height:20px; background:rgba(0,0,0,0.5); border:2px solid white; border-radius:10px; z-index:10; overflow:hidden;';
document.body.appendChild(healthBarContainer);

const healthBarFill = document.createElement('div');
healthBarFill.style.cssText = 'width:100%; height:100%; background:#4caf50; transition: width 0.2s;';
healthBarContainer.appendChild(healthBarFill);

function updateHealthUI() {
  healthBarFill.style.width = Math.max(0, player.health) + '%';
  if (player.health > 50) healthBarFill.style.background = '#4caf50';
  else if (player.health > 20) healthBarFill.style.background = '#ff9800';
  else healthBarFill.style.background = '#f44336';
}

// Particle explosion effect
function createExplosion(pos, color = 0xff5500, scale = 1) {
  for(let i=0; i<10; i++) {
    const pGeo = new THREE.BoxGeometry(0.2 * scale, 0.2 * scale, 0.2 * scale);
    const pMat = new THREE.MeshBasicMaterial({ color: color });
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.copy(pos);
    
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 2,
      (Math.random() - 0.5) * 2
    ).normalize();
    
    p.userData = { dir, life: 0.5, scale: scale };
    world.scene.add(p);
    world.particles.push(p);
  }
}

const clock = new THREE.Clock();
const cameraTarget = new THREE.Vector3();
const cameraPositionTarget = new THREE.Vector3();

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Update Player (Soldier moves)
  player.update(dt);

  // --- ENEMY AI (UPDATED) ---
  for (let e of world.enemies) {
    if (!e.alive) continue;

    const targetPos = player.isDriving ? world.tank.position : player.soldier.position;
    const dx = targetPos.x - e.mesh.position.x;
    const dz = targetPos.z - e.mesh.position.z;
    const distance = Math.hypot(dx, dz);

    // CHASE LOGIC: If distance is less than 100 (basically the whole map), they chase!
    if (distance < 100 && distance > 1.8) {
      const moveX = (dx / distance) * e.speed * dt;
      const moveZ = (dz / distance) * e.speed * dt;
      e.mesh.position.x += moveX;
      e.mesh.position.z += moveZ;
      e.mesh.rotation.y = Math.atan2(dx, dz);
      
      // Update collision position
      e.position.set(e.mesh.position.x, 1, e.mesh.position.z);
      
      // Reset scale if they were just attacking
      e.mesh.scale.set(1, 1, 1);
    }

    // ATTACK LOGIC: If they reach you
    if (distance <= 1.8 && !player.isDriving) {
      e.attackCooldown -= dt;
      if (e.attackCooldown <= 0) {
        player.health -= 10;
        e.attackCooldown = 1.0; // 1 second between hits
        updateHealthUI();
        
        // Visual Feedback: Punch effect and Red Explosion
        e.mesh.scale.set(1.2, 1.2, 1.2); // Enemy lunges
        createExplosion(targetPos, 0xff0000, 1.5); // Red sparks at player
        
        // Flash screen red
        document.body.style.backgroundColor = '#ffaaaa';
        setTimeout(() => { document.body.style.backgroundColor = '#87ceeb'; }, 100);
        
        if (player.health <= 0) {
          alert("You were defeated by the Toy Army!");
          player.health = 100;
          player.soldier.position.set(0, 0, 0);
          updateHealthUI();
        }
      }
    }
  }

  // --- BULLETS & HIT DETECTION ---
  for (let i = player.bullets.length - 1; i >= 0; i--) {
    const b = player.bullets[i];
    b.position.addScaledVector(b.userData.dir, 30 * dt);
    b.userData.life -= dt;
    
    let bulletRemoved = false;
    
    for (let e of world.enemies) {
      if (!e.alive) continue;
      const dist = b.position.distanceTo(e.position);
      
      const hitRadius = b.userData.isShell ? 2.5 : 1.0;
      
      if (dist < hitRadius) { 
        if (b.userData.isShell) {
          createExplosion(e.position, 0xff0000, 2);
          world.enemies.forEach(otherE => {
            if (otherE.alive && otherE.position.distanceTo(e.position) < 4) {
              otherE.alive = false;
              world.scene.remove(otherE.mesh);
            }
          });
        } else {
          e.alive = false;
          world.scene.remove(e.mesh);
          createExplosion(e.position, 0xff5500, 1);
        }
        
        world.scene.remove(b);
        player.bullets.splice(i, 1);
        bulletRemoved = true;
        break; 
      }
    }
    
    if (bulletRemoved) continue;
    if (b.userData.life <= 0) {
      world.scene.remove(b);
      player.bullets.splice(i, 1);
    }
  }

  // --- PARTICLES ---
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const p = world.particles[i];
    p.position.addScaledVector(p.userData.dir, 5 * dt);
    p.userData.dir.y -= 10 * dt; 
    p.userData.life -= dt;
    p.scale.setScalar(p.userData.life * 2 * p.userData.scale);
    if (p.userData.life <= 0) {
      world.scene.remove(p);
      world.particles.splice(i, 1);
    }
  }

  // --- CAMERA (Pulled back slightly to see enemies coming) ---
  const targetX = player.isDriving ? world.tank.position.x : player.soldier.position.x;
  const targetZ = player.isDriving ? world.tank.position.z : player.soldier.position.z;
  
  // Changed 12 to 15 to raise the camera, and 14 to 16 to zoom out
  const camHeight = player.isDriving ? 16 : 15; 
  const camDistance = player.isDriving ? 18 : 16;

  cameraPositionTarget.set(targetX, camHeight, targetZ + camDistance);
  cameraTarget.set(targetX, 1, targetZ);
  
  world.camera.position.lerp(cameraPositionTarget, 5 * dt);
  world.camera.lookAt(cameraTarget);

  world.renderer.render(world.scene, world.camera);
}

addEventListener('resize', () => {
  world.camera.aspect = innerWidth / innerHeight;
  world.camera.updateProjectionMatrix();
  world.renderer.setSize(innerWidth, innerHeight);
});

updateHealthUI();
loop();
