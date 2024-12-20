import {debug, Entities, Component, System, DeleteComponent, TransformComponent, Game} from './engine.js';
import {Vector} from './vector.js';
import {Quadtree} from './quadtree.js';

export class CollisionComponent extends Component {
  constructor(x,y) {
    super("collision");
    this.x = x;
    this.y = y;
    this.collisionCallbacks = {};
  }

  registerCallback(componentId, callback) {
    this.collisionCallbacks[componentId] = callback;
  }

  handleCollision(entity, collision, normal) {
    for(const key of Object.keys(this.collisionCallbacks)){
      if(collision.hasComponent(key)){
        const callback = this.collisionCallbacks[key];
        callback(entity, collision);
      }
    }
  }
  hasCallback(entity){
    for(const key of Object.keys(this.collisionCallbacks)){
      if(entity.hasComponent(key)){
        return true;
      }
    }
    return false;
  }
}

export class CollisionSystem extends System {
  constructor() {
    super("collisoin")
    this.quadtree = new Quadtree(0,0,800,600);
  }

  update(entities, dt) {
    // clear the quadtree
    this.quadtree.clear();
    // Get an array of entities with collision components
    const colliders = Array.from(entities.values()).filter(entity => entity.hasComponent('collision'));
    for (const collider of colliders) {
      const transform = collider.getComponent("transform");
      const collision = collider.getComponent("collision");
      collision.x = transform.x;
      collision.y = transform.y;
      this.quadtree.insert(collision);
    }
    for (const collider of colliders) {
      const collision = collider.getComponent("collision");
      const potentialColliders = this.quadtree.retrieve(collision);
      for (const potentialCollider of potentialColliders) {
        if (potentialCollider === collision) continue;
          const transform1 = collider.getComponent("transform");
          const transform2 = potentialCollider.getComponent("transform");
          if (collision.hasCallback(potentialCollider) || potentialCollider.hasCallback(collision)) {
            if (this.checkCollision(collision.x, collision.y, transform2.x, transform2.y)) {
              collision.handleCollision(collider, potentialCollider);
              potentialCollider.handleCollision(potentialCollider, collider);
            }
          }
        }
      }
    }

    checkCollision(x, y, polygon) {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        if (polygon[i].y > y !== polygon[j].y > y && x < (polygon[j].x - polygon[i].x) * (y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x) {
            isInside = !isInside;
        }
    }
    return isInside;
    }

}
