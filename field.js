import {debug, Entity, Component, DeleteComponent, TransformComponent, Game} from './engine.js';
import {Vector} from './vector.js';

export class FieldInteractionComponent extends Component {
  constructor(type) {
    super("field_interactor");
    this.type = type;
  }
}

class CropComponent extends Component{
  constructor(){
    this.age = 0;
    this.yield = 1;
    this.growTime =  10000+(Math.random()*1500);;
  }
}

export class FieldComponent extends Component{
  constructor(width, height, rowSpacing, colspacig, plantSprite, backgroundSprite) {
    super ("field");
    // set up any necessary data structures or variables here
    this.crops = Array.from({length: height}, () => Array.from({length: width}, () => new Crop()));
    this.rowspacing = 20;
    this.colspacomg = 15;
    this.plantSprite = plantSprite;
    this.backgroundSprite = backgroundSprite;
  }
}

export class FieldSystem {
  constructor() {
    this.callbacks = {};
  }

  update(entities, dt) {
    // grow corn
    for(const entity of entities){
      if(entity.hasComponent("field")){
        const field = entity.getComponent("field")
        for(const row of field.crops){
          for(const plant of row){
            if(plant.growTime > 0){
              plant.growTime -=dt;
            }else if (plant.age < 6) {
              plant.age++;
              plant.growTime = 10000+(Math.random()*1500);
            }else{
              // replant
              plant.age = 0;
              plant.growTime = 10000+(Math.random()*1500);
            }
          }
        }
      }
    }
  }
  regesterCallback(type, callback){
    this.callbacks.set(type, callback);
  }
  drawBelowPlayer(ctx, transform, dt){
    // draw the background
    ctx.fillStyle = "green";
    ctx.fillRect(transform.x, transform.y, transform.width, transform.height);
    // draw the corn back to front;
    for (let row = this.crops.length - 1; row >= 0; row--) {
      for (let col = this.crops[row].length - 1; col >= 0; col--) {
        const plant = this.crops[row][col];
        if (plant.age < 6) {
          // draw the corn plant
          ctx.drawImage(cornSprite, transform.x + col * this.colspacing, transform.y + row * this.rowspacing, 20, 20);
        }
      }
    }
  }
  drawAbovePlayer(ctx, transform, dt){
    // draw all corn above the player;
    for (let row = 0; row < this.crops.length; row++) {
      for (let col = 0; col < this.crops[row].length; col++) {
        const plant = this.crops[row][col];
        if (plant.age >= 6) {
          // draw the corn plant
          ctx.drawImage(cornSprite, transform.x + col * this.colspacing, transform.y + row * this.rowspacing, 20, 20);
        }
      }
    }
  }
}
export function fieldCollision(self, other) {
  // Get the offset position of the other entity's collision polygon
  const collision = other.getComponent("collision");
  const offsetX = collision.offset.x;
  const offsetY = collision.offset.y;

  // Calculate the relative position of the collision polygon
  const relX = other.transform.x + offsetX - self.transform.x;
  const relY = other.transform.y + offsetY - self.transform.y;

  // Get the min and max values for the collision polygon
  const minX = relX + collision.minX;
  const minY = relY + collision.minY;
  const maxX = relX + collision.maxX;
  const maxY = relY + collision.maxY;

  // Iterate through the crops in the field
  for (let row = minY; row < maxY; row++) {
    for (let col = minX; col < maxX; col++) {
      const crop = self.crops[row][col];

      // Check if the point is inside the collision polygon
      if (pointInPolygon(collision.vertices, relX, relY)) {
        // Call the callback function for the other entity's field_interactor type on the affected crop
        const interactorType = other.getComponent("field_interactor").type;
        this.callbacks.get(interactorType)(crop);
      }
    }
  }
}

function pointInPolygon(vertices, x, y) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/*a field will need the following components
 * field component
 * transform component
 * graphics component (TiledSpriteComponent)
 * a collision component
 * it will need the fieldCollision function added as a callback to the field collision component regestered to "field_interactor"
 *
 * */

