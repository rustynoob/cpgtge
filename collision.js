import {debug, Entity, Component, System, DeleteComponent, TransformComponent, Game} from './engine.js';
import {Vector, pointInPolygon} from './vector.js';
import {Quadtree} from './quadtree.js';

export class CollisionComponent extends Component {
  constructor(polygon) {
    super("collision");
    this.vertices = [];
    for(const vertex of polygon){
      this.vertices.push(new Vector(vertex))
    }
    this.collisionCallbacks = new Map();
    this.lastTransform = new TransformComponent();
    this.uniqueID = false;
    this.polygon = [];
  }

  registerCallback(componentId, callback) {
    this.collisionCallbacks.set(componentId,callback);
  }

  handleCollision(entity, collision) {
    for(const key of this.collisionCallbacks.keys()){
      if(collision.hasComponent(key)){
        const callback = this.collisionCallbacks.get(key);
        callback(entity, collision);
      }
    }
  }
  hasCallback(entity){
    for(const key of this.collisionCallbacks.keys()){
      if(entity.hasComponent(key)){
        return true;
      }
    }
    return false;
  }

  draw(ctx, transform) {

   let c = 0;
    for(const polygon of this.polygon){
      if(polygon){c++;
        ctx.strokeStyle = `rgba(0,0,${c*2},${(c)*0.008})`;
        ctx.beginPath();
        ctx.moveTo(polygon[0].x, polygon[0].y);
        for (let i = 1; i < polygon.length; i++) {
            ctx.lineTo(polygon[i].x, polygon[i].y);
        }
        ctx.closePath();
        ctx.stroke();

      }
      if(c > 254) {this.polygon.shift()};
    }
    ctx.strokeStyle = "black";
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.rotate(transform.rotation);
    ctx.scale(transform.scale, transform.scale);

    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
        ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

export  class CollisionSystem extends System{
  constructor() {
    super("collision")
    this.quadtree = new Quadtree({x: -500, y: -500, width: 2000, height: 2000}, 16);
    this.next = false;
    // Create a new worker thread and pass it the name of a JavaScript file to execute
    this.worker = new Worker('./engine/collisionWorker.js',{type:'module'});
    // Listen for messages sent back from the worker thread
    this.worker.addEventListener('message', this.processCollisions.bind(this));
    this.entities = new Map();
    this.workerReady = true;
    this.workerlate = 0;
    this.workerET = 0;
  }

  update(entities, dt) {
    if(this.workerReady){
      const message = [];
      for(const entity of entities){
        if(this.entities.has(entity.uniqueID)){
          this.entities.get(entity.uniqueID)
        }
        if(entity.hasComponent("collision")){
          if(!this.entities.has(entity.uniqueID)){
            this.entities.set(entity.uniqueID,entity);
            this.entities.get(entity.uniqueID)
          }
          const collision = entity.getComponent("collision");
          const transform = entity.getComponent("transform");
          if(!transform.equals(collision.lastTransform)){
            message.push({entityID:entity.uniqueID,transform:transform,vertices:collision.vertices,remove:false});
            collision.lastTransform = new TransformComponent(transform.x,transform.y,transform.z,transform.rotation,transform.scale);
          }
        }
      }
      for(const entity of this.entities.values()){

        if(!entities.has(entity)){
          message.push({entityID:entity.uniqueID, remove: true});
          this.entities.delete(entity.uniqueID);
        }else{
          entity.active = false;
        }
      }

      this.worker.postMessage(message);
      //console.log("sent Message from main thread")
      this.workerReady = false;
      this.workerlate = 0;
    }
    else
    this.workerlate++;
  }
  processCollisions(event){
    if(event.data.status == "done"){
      //console.log("Main thread recieved")
      const activeCollisions = event.data.collisoins;
      for(const collision of activeCollisions){
        const collider = this.entities.get(collision.collider);
        const other = this.entities.get(collision.other);
        //collider:collider,other:potentialCollider.entity
        //console.log(`collider:${JSON.stringify(collider)},other:${JSON.stringify(other)}`)
        if(collider.hasComponent("collision")){
          const polygon = collider.getComponent("collision").polygon;
          polygon.push(collision.polygon);
          if(polygon.length > 120){
            polygon.shift();
          }
          if(other){
            collider.getComponent("collision").handleCollision(collider,other);
          }

        }
      }
    }
    this.workerReady = true;
    this.workerET = event.data.et;
  }
}



