

export class Entity {
  constructor(name = "unnamed") {
    this.name = name;
    this.uniqueID = null;
    this.components = new Map();
  }

  addComponent(component) {
    this.components.set(component.name, component);
  }

  removeComponent(componentName) {
    this.components.delete(componentName);
  }

  hasComponent(componentName) {
    return this.components.has(componentName);
  }

  getComponent(componentName) {
    return this.components.get(componentName);
  }
  getComponents(componentName) {
    let components = [];
    for (const component of this.components.values()) {
      if (component.name === componentName) {
        components.push(component);
      }
    }
    return components;
  }
  delete(){
    this.addComponent(new DeleteComponent());
  }
  destroy(){
    // Call the destroy method on all components that have a processBeforeDelete ttl greater than zero
    for (const component of this.components.values()) {
      if(component.destroy()){
        this.removeComponent(component.name)
      }
    }
    return this.components.size <= 0;
  }
}

class Debug extends Entity{
  constructor(){
    super("System");
    this.overlay = false;
    this.fps =false;
    this.entities = false;
    this.particles = false;
    this.component = false;
    this.collisions = false;
    this.system = false;
    this.paths = false;
  }
}
export const debug = new Debug();

export class Component {
  constructor(name) {
    this.name = name;
    this.shouldProcessBeforeDelete = 0;
  }

  destroy() {
	 // This method should ever be overridden by child classes 
    // use override cleanup() to add additional cleanup logic
	 
    // Decrement the shouldProcessBeforeDelete ttl

    this.shouldProcessBeforeDelete--;

    this.cleanUp();
    return this.shouldProcessBeforeDelete <= 0;
  }

  cleanUp() {
    // Overrode This method in the child classes to add additional cleanup logic
  }

}

export class DeleteComponent extends Component{
	constructor(){
	  super("delete");
	}
}

export class TransformComponent extends Component {
  constructor(x=0, y=0, z = 0, rotation = 0, scale = 1) {
    super("transform");
    this.x = x;
    this.y = y;
    this.z = z;
    this.rotation = rotation;
    this.scale = scale;
  }
  subtract(other){
    return new TransformComponent(
      this.x-other.x,
      this.y-other.y,
      this.z-other.z,
      this.rotation-other.rotation,
      this.scale
    )
  }
  add(other){
    return new TransformComponent(
      this.x+other.x,
      this.y+other.y,
      this.z+other.z,
      this.rotation+other.rotation,
      this.scale//+other.scale
    );
  }
  distanceSquared(other){
    const vector = this.subtract(other);
    return (vector.x*vector.x)+(vector.y*vector.y);

  }
  equals(other){
    return this.x == other.x && this.y == other.y && this.z == other.z && this.rotation == other.rotation && this.scale == other.scale;
  }
}
export class System{
  constructor(name){
    this.name = name;
    this.lastRun = 0;
    this.time = Date.now();
    this.color = `rgb(${Math.random()*255},${Math.random()*255},${Math.random()*255})`;
    this.frame = 0;
  }
}
export class Game {
  constructor(name, canvas, width, height, targetFrameTime = 60) {
    this.entities = new Set();
    this.systems = new Map();
    this.name = name || "untitled";
    this.canvas = canvas || document.getElementById("canvas");
    this.width = width || canvas.width;
    this.height = height || canvas.height;
    this.nextid = 0;
    this.index = 0;
    this.targetFrameTime = targetFrameTime;
  }

  addEntity(entity) {
    if(!entity.uniqueID){
      entity.uniqueID = this.nextid++;
    }
    this.entities.add(entity);
  }

  removeEntity(entity) {
    // Add the delete component to the entity
    entity.addComponent(new DeleteComponent());
  }

  addSystem(system, priority = 0) {
    const queue = this.systems.get(priority);
    if(queue){
      queue.queue.push(system);
    }
    else{
      this.systems.set(priority,{index:0,queue:[system]})
    }
  }

  clearLevel(){
    for(const entity of this.entities){
      if(entity.hasComponent("save") ){
        this.removeEntity(entity);
      }
    }
  }
  clear(){
    for(const entity of this.entities){
      this.removeEntity(entity);
    }
  }

  update(dt) {
    let currentTime = Date.now();
    let startTime = currentTime;
    for(const key of this.systems.keys()){
      if(key == 0){
        continue;
      }
      const systems = this.systems.get(key);
      systems.index = systems.index % systems.queue.length;

      for( ; systems.index < systems.queue.length; systems.index++){
        const system = systems.queue[systems.index];
        const et = startTime - system.time
        system.update(this.entities, et);
        system.time = startTime;
        system.lastRun =  Date.now() - currentTime;
        currentTime = Date.now();
        if(currentTime - (startTime-dt) > this.targetFrameTime){
          break;
        }
      }
      if(currentTime - (startTime-dt) > this.targetFrameTime && (this.frame++ % key != 0)){
        break;
      }
    }

    // Check if any entities have the delete componentwd
    for (const entity of this.entities) {
      if (entity.hasComponent("delete")) {
        if(entity.destroy()){
          this.entities.delete(entity);
        }
      }
    }
  }

  draw(dt){
    let startTime = Date.now();
    const systems = this.systems.get(0);
      for (const system of systems.queue) {
        system.update(this.entities, startTime - system.time);
        system.time = startTime;
        system.lastRun = Date.now() -  startTime;
        startTime = Date.now();
      }
  }

  paused(dt) {
    for (const system of this.systems) {
      if(system.runPaused){
        system.update(this.entities, dt);
      }

    }

    // Check if any entities have the delete component
    for (const entity of this.entities) {
      if (entity.hasComponent("delete")) {
        if(entity.destroy()){
          this.entities.delete(entity);
        }
      }
    }
  }
}

