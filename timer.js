import {Component, System} from "./engine.js";

export class TimerComponent extends Component {
  constructor(time, callback) {
    super("timer");
    this.time = time;
    this.callback = callback;
  }
}

export class TimerSystem extends System {
  constructor(){
    super("timer");
  }
  update(entities, dt) {
    for (const entity of entities) {
      if (entity.hasComponent("timer")) {
        const timer = entity.getComponent("timer");
        timer.time -= dt;
        if (timer.time <= 0) {
          timer.callback(entity);
          if(timer.time <=0){
            entity.removeComponent(timer);
          }
        }
      }
    }
  }
}
