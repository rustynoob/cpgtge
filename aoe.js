import {Component, System} from "./engine.js";

export class AOEComponent extends Component{
    constructor(tag, radius, callback){
        super("aoe");
        this.tag = tag;
        this.radius = radius;
        this.callback = callback;
    }
}

export class AOESystem extends System{
    constructor(){
        super("AoE");
        // put any innitilization code here
    }
    update(entities, dt){
        let effects = [];
        for(const entity of entities){
            if(entity.hasComponent("aoe")){
                effects.push(entity);
            }
        }
        for(const entity of entities){
            for(const effect of effects){
                if (entity == effect){
                    continue;
                }
                const aoe = effect.getComponent("aoe");
                const effectTransform = effect.getComponent("transform");
                if(entity.hasComponent(aoe.tag)){
                    const entityTransform = entity.getComponent("transform");
                    if(entityTransform.distanceSquared(effectTransform)<aoe.radius*aoe.radius){
                        aoe.callback(entity,effect,dt);
                    }
                }
            }
        }
    }
}
