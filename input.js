import {Vector, pointInPolygon} from './vector.js';
import {Component, System, debug, TransformComponent} from './engine.js';

/*
 *Input system
 */

export class InputComponent extends Component{
  constructor(eventArray){
    super("input");
    this.events = new Map();

    for(const event of eventArray){
      this.events.set(event.event,{event:event.event, value:false,callback:event.callback});

    }
  }
}

export class UIComponent extends Component {
  constructor() {
    super("ui")
    this.clickid = 0;
    this.x = 0;
    this.y = 0;
    this.state = "out";// list of states: out up down drag move
    this.callbacks = {};
  }
  registerCallback(state, callback){
    this.callbacks[state] = callback;
  }
  handleCallbacks() {
    const callback = this.callbacks[this.state];
    if (callback){
      callback(new Vector({x:this.x,y:this.y}),this.state);
    }
  }
}

export class InputSystem extends System{
 constructor() {
   super("input");
    this.runPaused = true;
    this.canvas = document.getElementById("canvas");;
	this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.fire = false;
    this.pointerEvents = [{x: 0,
          y: 0,
          id: 0,
          state: 0,
          binding: false
    }];
    this.leftMouseButtonState = 0;
    this.cursorPosition = new Vector({x:0,y:0})
    this.keyDownHandler = (event) => this.keyDown(event);
    this.keyUpHandler = (event) => this.keyUp(event);
    this.touchStartHandler = (event) => this.touchStart(event);
    this.touchMoveHandler = (event) => this.touchMove(event);
    this.touchEndHandler = (event) => this.touchEnd(event);
    this.mouseDownHandler = (event) => this.mouseDown(event);
    this.mouseUpHandler = (event) => this.mouseUp(event);
    this.mouseMoveHandler = (event) => this.mouseMove(event);
    this.start();
    this.inputs = new Map();
    this.events = new Map();
    this.regesterEvent(37,"left");
    this.regesterEvent(65,"left");
    this.regesterEvent(38,"up");
    this.regesterEvent(87,"up");
    this.regesterEvent(39,"right");
    this.regesterEvent(68,"right");
    this.regesterEvent(83,"down");
    this.regesterEvent(40,"down");
    this.regesterEvent(192,"overlay");
    this.regesterEvent(72,"horn");
    this.regesterEvent(49,"systems");
    this.regesterEvent(50,"components");
    this.regesterEvent(51,"entities");
    this.regesterEvent(52,"particles");
    this.regesterEvent(53,"paths");
    this.regesterEvent(54,"collisions");

  }

  regesterEvent(key, identifier){
    this.inputs.set(key,identifier);
    if(!this.events.has(identifier)){
      this.events.set(identifier,false);
    }
  }

  keyDown(event){
    this.events.set(this.inputs.get(event.keyCode), true);
  }
  keyUp(event){
    this.events.set(this.inputs.get(event.keyCode), false);
  }


  touchStart(event) {
    let touchesOnCanvas = [];
    const canvasRect = this.canvas.getBoundingClientRect();
    for (const touch of event.touches) {
      if (touch.target === this.canvas) {
        touchesOnCanvas.push({
          x: touch.clientX - canvasRect.left,
          y: touch.clientY - canvasRect.top,
          id: touch.identifier,
          state: "start"

        });
      }
    }
    if (touchesOnCanvas.length > 0) {
      event.preventDefault();
      this.pointerEvents = this.pointerEvents.concat(touchesOnCanvas);
    }
  }

  touchMove(event) {
    let touchesOnCanvas = [];
    const canvasRect = this.canvas.getBoundingClientRect();
    for (const touch of event.touches) {
      if (touch.target === this.canvas) {
        touchesOnCanvas.push({
          x: touch.clientX - canvasRect.left,
          y: touch.clientY - canvasRect.top,
          id: touch.identifier,
          state: "move"
        });
      }
    }
    if (touchesOnCanvas.length > 0) {
      event.preventDefault();
      this.pointerEvents = this.pointerEvents.map((touchEvent) => {
        const matchingTouch = touchesOnCanvas.find((touch) => touch.id === touchEvent.id);
        if (matchingTouch) {
          return {
            x: matchingTouch.x,
            y: matchingTouch.y,
            id: touchEvent.id,
            state: "up"
          };
        }
        return touchEvent;
      });
    }
  }

  touchEnd(event) {
    let touchesOnCanvas = [];
    for (const touch of event.touches) {
      const x = touch.clientX - this.canvas.offsetLeft;
      const y = touch.clientY - this.canvas.offsetTop;
      if (touch.target === this.canvas && x >= 0 && x <= this.canvas.offsetWidth && y >= 0 && y <= this.canvas.offsetHeight) {
        touchesOnCanvas.push(touch);
      }
    }
    if (touchesOnCanvas.length > 0) {
      event.preventDefault();
      this.pointerEvents = this.pointerEvents.filter((touchEvent) => {
        return touchesOnCanvas.some((touch) => touch.identifier === touchEvent.identifier);
      });
    } else {
      this.pointerEvents = [];
    }
  }

  mouseEvent(X,Y,state) {
    const canvasRect = this.canvas.getBoundingClientRect();
    const x = X;// - this.canvas.offsetLeft;
    const y = Y;// - this.canvas.offsetTop;
    this.pointerEvents[0].state = state;
    this.pointerEvents[0].x = x - canvasRect.left;
    this.pointerEvents[0].y = y - canvasRect.top;
  }
  mouseDown(event) {
    //
     if (event.button === 0) {
       this.leftMouseButtonState = 1;
       this.mouseEvent(event.clientX,event.clientY,"down");
     }
  }

  mouseMove(event) {
    this.mouseEvent(event.clientX,event.clientY,"move");
    if(this.pointerEvents[0].binding){
      this.pointerEvents[0].binding.mouse(new Vector({x:0,y:0}),this.pointerEvents[0]);
    }

  }

  mouseUp(event) {
    if(this.pointerEvents.length <= 0){
      this.pointerEvents.push({x: 0,
          y: 0,
          id: 0,
          state: 0,
          binding: false
      });
    }
    if (event.button === 0) {
      this.leftMouseButtonState = 0;
      this.mouseEvent(event.clientX,event.clientY,"up");
      this.pointerEvents[0].id++;
      if(this.pointerEvents[0].binding){
        this.pointerEvents[0].binding.mouse(new Vector({x:0,y:0}),this.pointerEvents[0]);
        this.pointerEvents[0].binding = false;
      }
    }
  }

  update(entities) {
    // get the camera transforms
    //for each camera
    //put all the camers into a map with the key as the id
    // store the transform of each camera minus half the width or height
    let cameras = [];
    for (const entity of entities) {
      if(entity.hasComponent("camera") && entity.hasComponent("transform")){
        const camera = entity.getComponent("camera");
        const transform = entity.getComponent("transform");
        const tempTransform = new TransformComponent(camera.width/2,camera.height/2);
        cameras.push({
          id: camera.id,
          transform: transform.subtract(tempTransform),
          component: camera
        });
      }
   }

       // sort the cameras
  cameras = [...cameras].sort((a, b) => {
      const transformA = a.transform;
      const transformB = b.transform;
      return transformB.z - transformA.z;
  });
  const sortedEntities = [...entities].filter(entity => entity.hasComponent("transform")).sort((a, b) => {
      const transformA = a.getComponent("transform");
      const transformB = b.getComponent("transform");

      return transformB.z - transformA.z;
  });
   const ctx = this.canvas.getContext("2d");
    // Update the input state of all entities with an InputComponent
    // loop through the touch points here
    for(const input of this.pointerEvents){
      if(!input.binding){
        let used = false;

        for (const entity of sortedEntities) {
          if(entity.hasComponent("gui")){
            if(!entity.hasComponent("transform")&&!entity.hasComponent("collision")){
              console.log(entity.name+"missing transform or collision components for ui");
              continue;
            }else{
              const ui = entity.getComponent("gui");
              const transform = entity.getComponent("transform");
              const collision = entity.getComponent("collision");
              for(const camera of cameras){
                if(entity.hasComponent(camera.id)){
                  const mouse = new Vector(input);
                  const mouseTransformed = mouse.cameraProjection(transform,camera.transform);
                  if(!used){
                    used = ui.mouse(mouseTransformed, input);
                  }
                }
              }
            }
          }
        }
        for (const entity of entities) {
          if(entity.hasComponent("input")){
            const input = entity.getComponent("input");
            for(const e of input.events.values()){

              if(!e.value && this.events.get(e.event)){
                if(e.callback){
                  e.callback(entity);
                }
              }
              e.value = this.events.get(e.event);
            }
          }
          if(entity.hasComponent("ui")){
            const ui = entity.getComponent("ui");
            ui.handleCallbacks();
            ui.state = "out";
          }
        }
      }
    }
  }


  start() {
    // Listen for keydown, keyup, touchstart, touchmove, and touchend events
    window.addEventListener("keydown", this.keyDownHandler);
    window.addEventListener("keyup", this.keyUpHandler);
    window.addEventListener("touchstart", this.touchStartHandler);
    window.addEventListener("touchmove", this.touchMoveHandler);
    window.addEventListener("touchend", this.touchEndHandler);
    window.addEventListener("mousedown", this.mouseDownHandler);
    window.addEventListener("mousemove", this.mouseMoveHandler);
    window.addEventListener("mouseup", this.mouseUpHandler);
    window.addEventListener("mouseout", this.mouseUpHandler);
    document.addEventListener("keydown", (event) => {
      if (event.code === "ArrowUp" || event.code === "ArrowDown" || event.code === "ArrowLeft" || event.code === "ArrowRight") {
        event.preventDefault();
	  }
    });
  }

  stop() {
    // Stop listening for keydown, keyup, touchstart, touchmove, and touchend events
    window.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("keyup", this.keyUpHandler);
    window.removeEventListener("touchstart", this.touchStartHandler);
    window.removeEventListener("touchmove", this.touchMoveHandler);
    window.removeEventListener("touchend", this.touchEndHandler);
  }
}
