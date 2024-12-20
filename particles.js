import {debug, Entity, Component, System, DeleteComponent, TransformComponent, Game} from './engine.js';

import {CollisionComponent} from './collision.js';

import { RenderComponent } from './graphics.js';

import {Vector} from './vector.js';

import {KDTree} from './kdtree.js';



export class ParticleTypeComponent extends Component {
  constructor(id, updateFn, render, particle) {
    super("particleType");
    this.id = id;
    this.updateFn = updateFn || this.defaultUpdate;
    this.particles = [];
    this.particle = particle;
    this.render = render;
    this.activeParticles = 0;
    this.rollingAverage = 0;
  }

  update(dt, tree) {
    let active = 0;
	// Iterate over the particles in this type
    for (const particle of this.particles) {
	  if(particle.markedForDeletion){
		
		continue;
	  }
	  active++;
      // Update the particle using the callback function
      this.updateFn(particle, dt);
     
     
      // Check for collisions with the interactors
      const queryMin = [particle.position.x - particle.radius,   particle.position.y - particle.radius];
      const queryMax = [particle.position.x + particle.radius, particle.position.y + particle.radius];
      const interactors = tree.query(queryMin, queryMax);
      for (const entity of interactors) {
        const interactor = entity.getComponent("interactor");
        interactor.process(entity, particle);
      }
      // Decrement the particle's lifetime
      particle.lifetime -= dt;

      // If the particle has reached the end of its lifetime, mark it for removal
      if (particle.lifetime <= 0) {
        particle.markedForDeletion = true;
      }
      this.rollingAverage = (this.rollingAverage*127+active)/128;
      this.activeParticles = active;

      if(this.particles.length > this.rollingAverage*20){
		let i = this.particles.length-1
		for(;this.particles[i].markedForDeletion&& i > this.activeParticles; i--);
		this.particles.splice(i+1);
	  }

    }
  }
  defaultUpdate(particle, dt) {
    // Update the particle's position based on its velocity and acceleration
    particle.position.x += particle.velocity.x * dt;
    particle.position.y += particle.velocity.y * dt;
    particle.velocity.x += particle.acceleration.x * dt;
    particle.velocity.y += particle.acceleration.y * dt;
  }
  draw(ctx, transfom){
    for (let particle of this.particles) {
      if (!particle.markedForDeletion){
         if(!this.render){
          ctx.beginPath();
          ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.color.a})`;
          ctx.arc(particle.position.x, particle.position.y, particle.radius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fill();
        }
        else{
           this.render.draw(ctx, particle.position.add(transfom));
        }
      }
    }
  }
}

function getRandomPointInPolygon(polygon) {
  // Get the bounding box of the polygon
  const minX = Math.min(...polygon.map(point => point.x));
  const maxX = Math.max(...polygon.map(point => point.x));
  const minY = Math.min(...polygon.map(point => point.y));
  const maxY = Math.max(...polygon.map(point => point.y));

  // Generate a random point within the bounding box
  const x = Math.random() * (maxX - minX) + minX;
  const y = Math.random() * (maxY - minY) + minY;

  // Check if the point is inside the polygon
  const isInside = rayCasting(polygon, { x, y });

  // If the point is inside the polygon, return it; otherwise, try again
  return isInside ? { x, y } : getRandomPointInPolygon(polygon);
}

function rayCasting(polygon, point) {
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) isInside = !isInside;
  }
  return isInside;
}

//constructor(position, velocity, acceleration, direction, color, size, lifetime, type, radius)
export class ParticleEmitterComponent extends Component {
  constructor(emissionRate, particleTypeId, origin, particle) {
    super("particleEmitter");
    this.emissionRate = emissionRate;
    this.particleType = particleTypeId;
    this.origin = origin || { x: 0, y: 0 };
    this.lifetime = 1000;
    this.particle = particle;
  }

  emit(dt) {
    const particles = [];

    // Calculate the probability of emitting a particle based on the dt
    // and the emission rate

    const probability = this.emissionRate * dt;
    for (let i = 0; i < probability; i++){
	  if (Math.random() < probability) {
      // Emit a particle
        const particle = new Particle(
          // Position the particle at the origin of the emitter
          new Vector({ x: this.origin.x, y: this.origin.y }),
          // Give the particle a random velocity
           new Vector({ x: (Math.random() * 2 - 1)*.2, y: (Math.random() * 2 - 1)*.2 }),
          // Set the particle's acceleration to 0
           new Vector({ x: 0, y: 0 }),
          // Set the particle's direction to 0
          0,
          // Set the particle's color to white
          { r: 120+Math.random()*50, g: 90+Math.random()*50, b:Math.random()*160, a:.3},
          // Set the particle's size to 1
          .1,
          // Set the particle's lifetime to 1 second
          this.lifetime,
          // Set the particle's type
          this.particleType,
          // Set the particle's radius to 1
          5
        );
        particles.push(particle);
      }
    }

    return particles;
  }
}

function defaultParticleGenerator(origin, polygon, lifetime, particleType){
   const particle = new Particle(
      // Position the particle at the origin of the emitter
      new Vector({ x: origin.x, y: origin.y }),
      // Give the particle a random velocity
        new Vector({ x: (Math.random() * 2 - 1)*.2, y: (Math.random() * 2 - 1)*.2 }),
      // Set the particle's acceleration to 0
        new Vector({ x: 0, y: 0 }),
      // Set the particle's direction to 0
      0,
      // Set the particle's color to white
      { r: 120+Math.random()*50, g: 90+Math.random()*50, b:Math.random()*160, a:.3},
      // Set the particle's size to 1
      .1,
      // Set the particle's lifetime to 1 second
      lifetime,
      // Set the particle's type
      particleType,
      // Set the particle's radius to 1
      5
    );
  return particle;
}



export class ParticleBurstComponent extends Component {
  constructor(quantity, particleTypeId, origin, polygon, particleGenerator) {
    super("particleBurst");
    super("particleEmitter");
    this.emissionRate = emissionRate;
    this.particleType = particleTypeId;
    this.origin = origin || { x: 0, y: 0 };
    this.lifetime = 1000;
    this.particle = particle;
  }

  emit(dt) {
    const particles = [];
    for (let i = 0; i < quantity; i++){
        particles.push(particleGenerator(origin, polygon, lifetime, particleType));

    }
    return particles;
  }
}

export class Particle {
  constructor(position, velocity, acceleration, direction, color, size, lifetime, type, radius) {
    this.position = position ||  new Vector({x:0,y:0});
    this.velocity = velocity ||  new Vector({x:0,y:0})
    this.acceleration = acceleration||  new Vector({x:0,y:0})
    this.direction = direction||  new Vector({x:0,y:0})
    this.color = color || {r: 185, g:128, b:0, a:1};
    this.size = size || 2;
    this.lifetime = lifetime || 151200;
    this.type = type;
    this.radius = radius || 40;
    this.markedForDeletion = false;
  }
}

export class ParticleInteractorComponent extends Component {
  constructor(onCollisionFn, checkCollisionFn) {
    super("particleInteractor");
    this.checkCollision = checkCollisionFn || this.defaultCheckCollision;
    this.onCollision = onCollisionFn;
  }

  process(entity, particle) {
    if (this.checkCollision(entity, particle)) {
      this.onCollision(entity, particle);
    }
  }
  defaultCheckCollision(entity, particle){
    const transform = entity.getComponent("transform");
    const collision = entity.getComponent("collision");

    const minX = transform.x;
    const minY = transform.y;
    const maxX = transform.x + collision.width;
    const maxY = transform.y + collision.height;

    return particle.x >= minX && particle.x <= maxX && particle.y >= minY && particle.y <= maxY;
  };
}

function makeParticleBounce(entity, particle) {
  // Get the collision component of the entity
  const collision = entity.getComponent("collision");
  const transform = entity.getComponent("transform");
  // Calculate the particle's new velocity based on the surface normal
  // of the collision component
  const surfaceNormal = collision.getSurfaceNormal(particle.position);
  particle.velocity = {
    x: -particle.velocity.x,
    y: -particle.velocity.y
  };

  // Move the particle out of the collision
  particle.position = collision.getDisplacement(particle.position);
}

function deleteParticle(entity, particle) {
  // Remove the particle from the particle type's list of particles
  particle.type.particles = particle.type.particles.filter(
    p => p !== particle
  );
}



export class ParticleSystem extends System{
  constructor() {
    super("particle")
    this.particleTypes = [];//we need to get rid of this
    this.interactors = [];
    this.tree = new KDTree();
  }

  update(entities, dt) {
    // Update the arrays of particle types and interactors
    this.particleTypes = [];
    this.interactors = [];
    for (const entity of entities) {
      if (entity.hasComponent("particleType")) {
        this.particleTypes.push(entity.getComponent("particleType"));
      }
      if (entity.hasComponent("interactor")) {
        this.interactors.push(entity);
      }
    }

    // Insert the interactors into the k-d tree
    for (const entity of this.interactors) {
      const interactor = entity.getComponent("interactor");
      const transform = entity.getComponent("transform");
      const collision = entity.getComponent("collision");
      const min = [transform.x, transform.y];
      const max = [transform.x + collision.width, transform.y + collision.height];
      this.tree.insert(interactor, min, max);
    }

     // Process any particle emitters
    for (const entity of entities) {
      if (entity.hasComponent("particleEmitter")) {
        const emitter = entity.getComponent("particleEmitter");
          const transform = entity.getComponent("transform");
          const emittedParticles = emitter.emit(dt);
          const particleType = this.particleTypes.find(type => type.id === emitter.particleType);
          const particlePool = particleType.particles;
          let p = 0;
          for (let particle of emittedParticles) {
            // Offset the particle position by the   transform of the entity
            particle.position.x += transform.x;
            particle.position.y += transform.y;
            
            // Add the particle to the appropriate particle type's particles array
            for(;p<particlePool.length && !particlePool[p].markedForDeletion;p++);
            particlePool[p] = particle;
		 
		 }
      }
    }

    // Update the particle types
    for (const particleType of this.particleTypes) {
      particleType.update(dt, this.tree);
    }
  }
}


