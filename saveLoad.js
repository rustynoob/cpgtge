import {Entity, Component, System} from './engine.js';
import {Corn} from "./../corn.js";
import {Cow, Poop} from './../cow.js'
import {Slim,game} from './../SlimReaper.js'

export class SaveComponent extends Component{
  constructor(){
    super("save");
  }
}



export class SaveLoad {
  constructor() {
    this.saveFileName = "save.json";
    this.entities = [];
    this.entityConstructors = {};
  }
  registerEntityConstructor(type, constructor) {
    if(!constructor){
      console.log("entity type: "+ type +" regestered but missing constructor")
    }
  this.entityConstructors[type] = constructor;
}

  save(saveFileName) {
    // Collect the data to save
    const saveData = [];
    for (const entity of game.entities.values()) {

      if(entity.hasComponent("save")){
        let entery = {};

        if(entity.serialize){
          entery = entity.serialize();
        }
        else{
            console.log("Entity has save componet but no serialize function defined. "+entity.type);
        }
        entery.id = entity.uniqueID;
        if(entity.hasComponent("node")){
          const node = entity.getComponent("node");
          entery.node = {};
          entery.node.parent = node.parent?node.parent.uniqueID:false;
          entery.node.children = [];
          for(const n of node.nodes){
            if(n.child){
              entery.node.children.push({id:n.child.uniqueID,attachment:n.attachment});
            }
            else{
              entery.node.children.push(false);
            }
          }
        }
        saveData.push(entery);
      }
    }

    // Serialize the data
    const serializedData = JSON.stringify(saveData);

    // Save the data to a file

    localStorage.setItem(saveFileName, serializedData);
  }

  createEntityFromSavedData(savedData) {
    let entity = {};//this.entities[savedData.id];
    //if (!entity) {
      const constructor = this.entityConstructors[savedData.name];
      if (!constructor) {
        throw new Error(`No constructor registered for entity type ${savedData.name}`);
      }
      entity = constructor(savedData);
        entity.id = savedData.id;
      if(savedData.componentData){
        for(const componentData of savedData.componentData){
          const component = entity.getComponent(componentData.name);
          const properties = Object.keys(componentData.properties);
          for (const property of properties) {
            component[property] = componentData.properties[property];
          }
        }
      }
    return entity;
  }

  load(saveFileName) {

    // Load the data from the file
    const serializedData = localStorage.getItem(saveFileName);

    this.entities = new Map();
     // Deserialize the data
    if (!serializedData) {
      return;
    }
    const saveData = JSON.parse(serializedData);
    // build all the entities
    for (const entityData of saveData) {
      const entity = this.createEntityFromSavedData(entityData);
       this.entities.set(entityData.id, {entity: entity, node:entityData.node});
    }
    for(const entity of this.entities.values()){
      if(entity.node){
        const node = entity.entity.getComponent("node");
        if(entity.node.parent){
          node.parent = this.entities.get(entity.node.parent).entity;
        }
        for(let i = 0; i < entity.node.children.length; i++){
          const child = entity.node.children[i];
          if(child){
            node.nodes[i].child = this.entities.get(child.id).entity;
            node.nodes[i].attachment = child.attachment;
          }
        }

      }
    }

    // loop through all the entities and add them to the game.
    for (const entity of this.entities.values()){
      game.addEntity(entity.entity);
    }
  }


}
