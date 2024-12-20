import {debug, Entity, Component, System, DeleteComponent, TransformComponent, Game} from './engine.js';
import {Vector, pointInPolygon} from './vector.js';
import {Quadtree} from './quadtree.js'


export class CollisionComponent extends Component {
  constructor(polygon) {
    super("collision");
    this.vertices = [];
    for(const vertex of polygon){
      this.vertices.push(new Vector(vertex))
    }
    this.activeCollisions = [];
    this.collisionCallbacks = {};
    this.path = [];
    this.lastSweptPolygon = null;
  }

  registerCallback(componentId, callback) {
    this.collisionCallbacks[componentId] = callback;
  }

  handleCollision(entity, collision, normal) {
    this.activeCollisions.push({collision:collision,normal:normal});
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

  draw(ctx, transform) {


    ctx.strokeStyle = "yellow";
    if(this.path.length > 0){
      ctx.beginPath();
      ctx.moveTo(this.path[0].x, this.path[0].y);
      for (let i = 1; i < this.path.length; i++) {
        ctx.lineTo(this.path[i].x, this.path[i].y);
      }
      ctx.stroke();

    }

    ctx.strokeStyle = "blue";
    if(this.lastSweptPolygon){

      //console.log(`polygon:${JSON.stringify(this.lastSweptPolygon)}`)
      ctx.beginPath();
      ctx.moveTo(this.lastSweptPolygon[0].x, this.lastSweptPolygon[0].y);
      for (let i = 1; i < this.lastSweptPolygon.length; i++) {
        ctx.lineTo(this.lastSweptPolygon[i].x, this.lastSweptPolygon[i].y);

      }

      ctx.closePath();
      ctx.stroke();

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
    this.worker = new Worker('./engine/collisionWorker.js');


    // Listen for messages sent back from the worker thread
    this.worker.addEventListener('message', (event) => {




      console.log(`Received message from worker: ${event.data}`);
    });

  }

  update(entities, dt) {
    for(const entity of entities){
      if(entity.hasComponent("collision")){
        const collision = entity.getComponent("collision");
        const transform = entity.getComponent("transform");
      }
    }





    const message = [];
    for(const entity of entities){
      if(entity.hasComponent("collision")){
        const collision = entity.getComponent("collision")
        message.push([entity.uniqueID,,collision.verteces,collision.path,]);
      }
    }
    this.worker.postMessage(message);


