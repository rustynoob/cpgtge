import {debug, Entity, Component, DeleteComponent, TransformComponent, CollisionComponent, Game} from './engine.js';
export class ParticleComponent extends Component {
  constructor(numParticles) {
    super("particles");
    this.numParticles = numParticles;
    this.particles = [];
    this.initParticles();
initParticles() {
  // Initialize the particle objects and add them to the particles array
  for (let i = 0; i < this.numParticles; i++) {
    let particle = {
      x: Math.random() * 800,  // Random initial x position
      y: Math.random() * 600-10,  // Initial y position off the top of the canvas
      vx: Math.random() * 3 - 1.5,  // Random initial x velocity
      vy: Math.random() * 5 + 1,  // Random initial y velocity
      radius: Math.random() * 3 + 1,  // Random initial radius
      alpha: Math.random(),  // Random initial alpha value
      ttl: Math.random() * 5000 + 1  // Random initial TTL value between 1 and 5 seconds
    };
    this.particles.push(particle);
  }
}

}

export class ParticleSystem {
  update(entities, dt) {
  // update physics for each entity with a physics component
    for (const entity of entities) {
      if (entity.hasComponent("particles")) {
		const particles = entity.getComponent("particles");
	    for (let i = 0; i < particles.numParticles; i++) {
          let particle = particles.particles[i];
          particle.x += particle.vx * dt * 0.001;
          particle.y += particle.vy * dt * 0.001;
          if (particle.y > 600+particle.radius){
			particle.y = -particle.radius;
			particle.x = Math.random()*800;
			particle.vx = Math.random() * 3 - 1.5;  // Random initial x velocity
            particle.vy = Math.random() * 5 + 1;  // Random initial y velocity
		  }
          //particle.alpha -= dt *0.001;  // Fade out over time

          // Decrement the particle's TTL
          particle.ttl -= dt * 0.001;

          // If the particle's TTL has reached zero, remove it
          if (particle.ttl <= 0) {
            particles.particles.splice(i, 1);  // Remove the particle from the array
            particles.numParticles--;  // Decrement the number of particles
            i--;  // Decrement the loop index to account for the removed element
          }
        }
      }
    }
  }
}

