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
  if (player.health > 50) healthBarFill.style.background = '#4caf50'; // Green
  else if (player.health > 20) healthBarFill.style.background = '#ff9800'; // Orange
  else healthBarFill.style.background = '#f44336'; // Red
}

// Particle explosion effect
function createExplosion(pos) {
  for(let i=0; i<8; i++) {
    const pGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.copy(pos);
    
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 2,
      (Math.random() - 0.5) * 2
    ).normalize();
    
    p.userData = { dir, life: 0.5 };
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

  // Update Player
  player.update(dt);

  // --- NEW: ENEMY AI ---
  for (let e of world.enemies) {
    if (!e.alive) continue;

    // Calculate direction to player
    const dx = player.soldier.position.x - e.mesh.position.x;
    const dz = player.soldier.position.z - e.mesh.position.z;
    const distance = Math.hypot(dx, dz);

    // If player is within 20 units, chase them!
    if (distance < 20 && distance > 1.5) {
      const moveX = (dx / distance) * e.speed * dt;
      const moveZ = (dz / distance) * e.speed * dt;
      e.mesh.position.x += moveX;
      e.mesh.position.z += moveZ;
      
      // Make enemy face the player
      e.mesh.rotation.y = Math.atan2(dx, dz);
      
      // Update the position vector used for bullet collision
      e.position.set(e.mesh.position.x, 1, e.mesh.position.z);
    }

    // If close enough, attack!
    if (distance <= 1.5) {
      e.attackCooldown -= dt;
      if (e.attackCooldown <= 0) {
        player.health -= 10; // Deal 10 damage
        e.attackCooldown = 1.0; // Wait 1 second before hitting again
        updateHealthUI();
        
        // Flash screen red
        document.body.style.backgroundColor = '#ffcccc';
        setTimeout(() => { document.body.style.backgroundColor = '#87ceeb'; }, 100);
        
        if (player.health <= 0) {
          alert("You were defeated by the toy army!");
          player.health = 100;
          player.soldier.position.set(0, 0, 0);
          updateHealthUI();
        }
      }
    }
  }

  // Update Bullets & Hit Detection
  for (let i = player.bullets.length - 1; i >= 0; i--) {
    const b = player.bullets[i];
    b.position.addScaledVector(b.userData.dir, 30 * dt);
    b.userData.life -= dt;
    
    let bulletRemoved = false;
    
    for (let e of world.enemies) {
      if (!e.alive) continue;
      const dist = b.position.distanceTo(e.position);
      if (dist < 1.0) { 
        e.alive = false;
        world.scene.remove(e.mesh);
        createExplosion(e.position);
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

  // Update Particles
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const p = world.particles[i];
    p.position.addScaledVector(p.userData.dir, 5 * dt);
    p.userData.dir.y -= 10 * dt; 
    p.userData.life -= dt;
    p.scale.setScalar(p.userData.life * 2);
    
    if (p.userData.life <= 0) {
      world.scene.remove(p);
      world.particles.splice(i, 1);
    }
  }

  // Camera
  cameraPositionTarget.set(player.soldier.position.x, 12, player.soldier.position.z + 14);
  cameraTarget.set(player.soldier.position.x, 1, player.soldier.position.z);
  world.camera.position.lerp(cameraPositionTarget, 5 * dt);
  world.camera.lookAt(cameraTarget);

  world.renderer.render(world.scene, world.camera);
}

// Handle window resize
addEventListener('resize', () => {
  world.camera.aspect = innerWidth / innerHeight;
  world.camera.updateProjectionMatrix();
  world.renderer.setSize(innerWidth, innerHeight);
});

// Start the game loop
updateHealthUI();
loop();
