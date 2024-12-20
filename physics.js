import {Component, System} from './engine.js';

import {Vector} from './vector.js';

export class PhysicsComponent extends Component {
  constructor(velocity,acceleration,force,mass) {
    super("physics");
    this.velocity = velocity || { x: 0, y: 0 };
    this.acceleration = acceleration || { x: 0, y: 0 };
    this.force = force || {x: 0, y:0};
    this.mass = mass || 1;
    this.momentOfInertia = 1;
    this.angularVelocity = 0;
    this.torque = 0;
    this.elasitc = false;
  }
}

export class  PhysicsSystem extends System{
  constructor(){
    super("physics");
  }
  update(entities, dt) {

      // check for collisions between entities with physics and collision components
    for (const entity1 of entities) {
      if (entity1.hasComponent("collision") && entity1.hasComponent("physics")) {
        const physics1 = entity1.getComponent("physics");
        const collision1 = entity1.getComponent("collision");
        for (const collision of collision1.activeCollisions) {
          const entity2 = collision.collision;
          let physics2 = new PhysicsComponent(
            {x:0,y:0},
            {x:0,y:0},
            {x:0,y:0},
            Number.MAX_SAFE_INTEGER/2
                                            );
          if (entity2.hasComponent("physics")) {
            physics2 = entity2.getComponent("physics");
          }
          const collision2 = entity2.getComponent("collision");

          // calculate the resulting velocities of the two colliding entities
          // using the principles of conservation of momentum and kinetic energy
          const m1 = physics1.mass;
          const m2 = physics2.mass;
          const v1 = new Vector(physics1.velocity);
          const v2 = new Vector(physics2.velocity);
          const normal = new Vector(collision.normal);

          if(normal.length() == 0){
            physics1.velocity = v1.reflect()
          }
          const impulse = (2 * m1 * m2) / (m1 + m2) * (v1.subtract(v2)).dotProduct(normal) / normal.dotProduct(normal);

          physics1.velocity = v1.subtract(normal.multiply(impulse / m1));
        }
      }
    }

    // update physics for each entity with a physics component
    for (const entity of entities) {
      if (entity.hasComponent("physics")) {
        const physics = entity.getComponent("physics");
        physics.velocity.x += physics.acceleration.x * dt*0.001;
        physics.velocity.y += physics.acceleration.y * dt*0.001;
        const transform = entity.getComponent("transform");
        transform.x += physics.velocity.x * dt*0.001;
        transform.y += physics.velocity.y * dt*0.001;
      }
    }
  }
  applyForce(entity, force) {
    const physics = entity.getComponent("physics");
    physics.acceleration.x += force.x / physics.mass;
    physics.acceleration.y += force.y / physics.mass;
    physics.force.x += force.x;
    physics.force.y += force.y;
  }
}
