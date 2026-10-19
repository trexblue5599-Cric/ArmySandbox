// game.js

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
loop();
