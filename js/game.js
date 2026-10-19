// js/game.js

// 1. Create Health UI
const healthBarContainer = document.createElement('div');
healthBarContainer.id = 'health-bar-container';
document.body.appendChild(healthBarContainer);

const healthBarFill = document.createElement('div');
healthBarFill.id = 'health-bar-fill';
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

// Camera variables
const cameraTarget = new THREE.Vector3();
const cameraPositionTarget = new THREE.Vector3();
world.cameraAngle = 0; 

const clock = new THREE.Clock();

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);

  player.update(dt);

  // --- ENEMY AI ---
  for (let e of world.enemies) {
    if (!e.alive) continue;
    const dx = player.soldier.position.x - e.mesh.position.x;
    const dz = player.soldier.position.z - e.mesh.position.z;
    const distance = Math.hypot(dx, dz);

    if (distance < 100 && distance > 1.8) {
      const moveX = (dx / distance) * e.speed * dt;
      const moveZ = (dz / distance) * e.speed * dt;
      e.mesh.position.x += moveX;
      e.mesh.position.z += moveZ;
      e.mesh.rotation.y = Math.atan2(dx, dz);
      e.position.set(e.mesh.position.x, 1, e.mesh.position.z);
      e.mesh.scale.set(1, 1, 1);
    }

    if (distance <= 1.8) {
      e.attackCooldown -= dt;
      if (e.attackCooldown <= 0) {
        player.health -= 10;
        e.attackCooldown = 1.0;
        updateHealthUI();
        createExplosion(player.soldier.position, 0xff0000, 1.5);
        document.body.style.backgroundColor = '#ffaaaa';
        setTimeout(() => { document.body.style.backgroundColor = '#87ceeb'; }, 100);
        if (player.health <= 0) {
          alert("You were defeated!");
          player.health = 100;
          player.soldier.position.set(0, 0, 0);
          updateHealthUI();
        }
      }
    }
  }

  // --- BULLETS ---
  for (let i = player.bullets.length - 1; i >= 0; i--) {
    const b = player.bullets[i];
    b.position.addScaledVector(b.userData.dir, 30 * dt);
    b.userData.life -= dt;
    
    let bulletRemoved = false;
    for (let e of world.enemies) {
      if (!e.alive) continue;
      if (b.position.distanceTo(e.position) < 1.0) { 
        e.alive = false;
        world.scene.remove(e.mesh);
        createExplosion(e.position, 0xff5500, 1);
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

  // --- 3RD PERSON CAMERA ---
  // Follow the player's rotation
  let targetAngle = player.soldier.rotation.y;
  let angleDiff = targetAngle - world.cameraAngle;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  
  // Smoothly update the global camera angle
  world.cameraAngle += angleDiff * 3 * dt; 

  const camDistance = 8;
  const camHeight = 5;

  // Calculate camera position BEHIND the player based on the angle
  const camX = player.soldier.position.x - Math.sin(world.cameraAngle) * camDistance;
  const camZ = player.soldier.position.z - Math.cos(world.cameraAngle) * camDistance;

  cameraPositionTarget.set(camX, camHeight, camZ);
  cameraTarget.set(player.soldier.position.x, 2, player.soldier.position.z);
  
  world.camera.position.lerp(cameraPositionTarget, 10 * dt);
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
