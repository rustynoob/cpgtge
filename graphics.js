 import {debug, Entity, Component, System, DeleteComponent, TransformComponent,  Game} from './engine.js';



export class CameraComponent extends Component {
  constructor(name, x, y, z , width, height, zoom) {
    super("camera");
    this.id = name;
    this.x = x;
    this.y = y;
    this.z = z;
    this.width = width ;
    this.height = height;
    this.zoom = zoom;
    this.buffer = new OffscreenCanvas(width, height);
    this.context = this.buffer.getContext('2d');
    this.mouse = {x:0,y:0};
  }
}

export class RenderComponent extends Component {
  constructor() {
    super("render");
  }

  draw(ctx, transform) {
    // This will be implemented by the specific render components
  }
}


export class CompositeSpriteComponent extends RenderComponent {
  constructor(origin, baseImage,sectionHeight, size) {
    super("render");
    this.origin = origin;
    this.loaded = 0;
    this.image = new Image();
    this.image.src = baseImage;
    this.image.onload = this.imageLoaded.bind(this);
    this.size = size;
    this.preRenderedSprite  = document.createElement('canvas');
    this.preRenderctx = this.preRenderedSprite.getContext('2d');
    this.sectionHeight = sectionHeight;
    this.preRenderctx.drawImage(this.image, 0, 0);
  }

  resize(newSize) {
    this.size = newSize;
      this.createCompositeSprite();
  }
  imageLoaded(){
    this.createCompositeSprite()
  }
  createCompositeSprite() {


    this.preRenderedSprite.width = this.image.width;
    this.preRenderedSprite.height = this.image.height-(2*this.sectionHeight)+(this.sectionHeight*this.size*2);

    //draw center sprite
    //drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    const centerHeight = this.image.height-(this.sectionHeight*4)
    this.preRenderctx.drawImage(this.image, 0,this.sectionHeight*2,this.image.width,centerHeight,0,(this.preRenderedSprite.height - centerHeight) / 2,this.image.width,centerHeight);

    // draw end cap sprite
    this.preRenderctx.drawImage(this.image, 0, 0, this.image.width,this.sectionHeight,0,0,this.image.width,this.sectionHeight);

    // draw extension sprites
    for (let i = 0; i < this.size; i++) {
      //drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
        this.preRenderctx.drawImage(this.image, 0, this.sectionHeight, this.image.width, this.sectionHeight, 0, ((this.sectionHeight*(i+1))), this.image.width, this.sectionHeight);

        this.preRenderctx.drawImage(this.image, 0, this.image.height-(2*this.sectionHeight), this.image.width, this.sectionHeight, 0, this.preRenderedSprite.height -  (this.sectionHeight*(i+2)), this.image.width, this.sectionHeight );
    }

    // draw end cap sprite
    this.preRenderctx.drawImage(this.image, 0, this.image.height-(this.sectionHeight),this.image.width, this.sectionHeight, 0,this.preRenderedSprite.height - this.sectionHeight,this.image.width, this.sectionHeight );
  }



  draw(ctx, transform, dt) {
    // Check if the composite sprite needs to be re-rendered
    //
    // Calculate the position of the origin relative to the center of the center sprite
    if(this.preRenderedSprite.width > 0 && this.preRenderedSprite.height > 0){
      let originX = this.origin.x;
      let originY = this.origin.y-((this.preRenderedSprite.height-this.image.height+(this.sectionHeight*4))/2);

      // Translate and rotate around the origin
      ctx.save();
      ctx.translate(originX, originY);
      ctx.rotate(transform.rotation);
      ctx.translate(transform.x ,  transform.y );

      // Draw the pre-rendered composite sprite
      ctx.drawImage(this.preRenderedSprite, 0, 0);
      ctx.restore();
    }else{
      this.createCompositeSprite()
    }

  }
}
export class SpriteComponent extends Component {
  constructor(url,x = 0,y = 0) {
    super("render");
    this.image = new Image();
    this.image.src = url;
    this.x = x;
    this.y = y;
    this.width = 1;
    this.height = 1;
    this.image.onload = this.setSize.bind(this);
  }
  setSize(){
    this.width = this.image.width;
    this.height = this.image.height;
  }
   draw(ctx, transform, dt) {
    // Draw the image on the canvas at the transform position
    ctx.drawImage(this.image, transform.x-this.x, transform.y-this.y);
  }
}

export class ScaledSpriteComponent extends Component {
  constructor(url,x,y,imageWidth,imageHeight,renderWidth,renderHeight, rotation = 0) {
    super("render");
    this.image = new Image();
    this.image.src = url;
    this.x = x;
    this.y = y;
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;
    this.renderWidth = renderWidth;
    this.renderHeight = renderHeight;
    this.rotation = rotation;
    this.width = renderWidth;
    this.height = renderHeight;
  }
   draw(ctx, transform) {
    // Draw the image on the canvas at the transform position
   ctx.save();
        ctx.translate(transform.x-this.x, transform.y-this.y);
        ctx.rotate(this.rotation);
        ctx.translate(-this.x, -this.y);
        ctx.scale(transform.scale, transform.scale);
     ctx.drawImage(
      this.image,
      0,
      0,
      this.imageWidth,
      this.imageHeight,
      0,//transform.x-this.x,
      0,//transform.y-this.y,
      this.renderWidth,
      this.renderHeight
      );
     ctx.restore();
  }
}

export class AnimatedSpriteComponent extends Component {
  constructor(url, x,y, frameWidth, frameHeight, frameCount, frameRate) {
    super("render");
    this.image = new Image();
    this.image.src = url;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frameCount = frameCount;
    this.frameRate = frameRate;
    this.currentFrame = 0;
    this.elapsedTime = 0;
    this.x = x;
    this.y = y;
  }
  draw(ctx, transform, dt) {
    // Update the animation
    if(this.frameRate != 0){
      this.elapsedTime += dt;
      if (this.elapsedTime >= this.frameRate) {
        this.currentFrame = (this.currentFrame + 1) % this.frameCount;
        this.elapsedTime = 0;
      }
    }
    // Calculate the position of the current frame in the sprite sheet
    const sx = this.currentFrame * this.frameWidth;
    const sy = 0;
    // Draw the current frame on the canvas at the transform position
    ctx.drawImage(this.image, sx, sy, this.frameWidth, this.frameHeight, transform.x-this.x, transform.y-this.y, this.frameWidth, this.frameHeight);
  }
}
function max(a,b){
  return a>b?a:b;
}
function min(a,b){
  return a<b?a:b;
}
export class TiledSpriteComponent extends RenderComponent {
  constructor(url, imageWidth, imageHeight, width, height) {
    super("render");
    this.image = new Image();
    this.image.src = url;
    this.width = width;
    this.height = height;
    this.imagewidth = imageWidth;
    this.imageheight = imageHeight;
    this.cols = Math.floor(this.width/this.imagewidth);
    this.rows = Math.floor(this.height/this.imageheight);
    this.rx = this.width%this.imagewidth;
    this.ry = this.height%this.imageheight
  }

  draw(ctx, transform) {
    for (let i = 0; i < this.width; i+=this.imagewidth-1) {
      for (let j = 0; j < this.height; j+= this.imageheight-1) {
        ctx.drawImage(
          this.image,
          0,
          0,
          (i+this.imagewidth)>this.width?this.rx:this.imagewidth,
          (j+this.imageheight)>this.height?this.ry:this.imageheight,
          transform.x + i,
          transform.y + j,
          (i+this.imagewidth)>this.width?this.rx:this.imagewidth,
          (j+this.imageheight)>this.height?this.ry:this.imageheight
        );
      }
    }
  }
}


export class SquareComponent extends Component {
  constructor(x,y, color, width, height, radius) {
    super("render");
    this.x = x;
    this.y = y;
    this.color = color;
    this.width = width;
    this.height = height;
  }
  draw(ctx, transform) {
    // set the fill style based on the shape color
    ctx.fillStyle = this.color;
    // draw a filled rectangle on the canvas at the transform position and with the specified width and height
    ctx.fillRect(transform.x-this.x, transform.y-this.y, this.width, this.height);

  }
}

export class CircleComponent extends Component {
  constructor(x, y, radius ,color) {
    super("render");
    this.color = color;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.width = radius*2;
    this.height = radius*2;
    this.align = "center";
    this.size = radius;
  }
   draw(ctx, transform) {
    // set the fill style based on the shape color
    ctx.fillStyle = this.color;
    // draw a filled circle on the canvas at the transform position and with the specified radius
    ctx.beginPath();
    ctx.arc(transform.x-this.x, transform.y-this.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();
  }
}


export class LineComponent extends Component {
  constructor(color, width, x, y, x1, y1, x2, y2) {
    super("render");
    this.color = color;
    this.width = width;
    this.x = x;
    this.y = y;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }
   draw(ctx, transform) {
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width;
    ctx.beginPath();
    ctx.moveTo(transform.x + this.x1-this.x, transform.y + this.y1-this.y);
    ctx.lineTo(transform.x + this.x2-this.x, transform.y + this.y2-this.y);
    ctx.stroke();
    ctx.restore();
  }
}

export class TextComponent extends Component {
  constructor(content, font, size, color, align, x = 0, y = 0) {
    super("render");
    this.content = content;
    this.font = font;
    this.size = size;
    this.color = color;
    this.align = align;
    this.x = x;
    this.y = y;
  }
   draw(ctx, transform) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.font = `${this.size}px ${this.font}`;
    ctx.textAlign = this.align;
    ctx.fillText(this.content, transform.x-this.x, transform.y-this.y);
      ctx.restore();
  }
}

export class WordWrappedTextComponent extends Component {
  constructor(content, font, size, color, align, x = 0, y = 0, width) {
    super("render");
    this.content = content;
    this.font = font;
    this.size = size;
    this.color = color;
    this.align = align;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = 0;

  }

  draw(ctx, transform) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.font = `${this.size}px ${this.font}`;
    ctx.textAlign = this.align;

    // Split the content into an array of words
    const words = this.content.split(" ");
    let line = "";
    let lineY = transform.y - this.y;
    this.height = 0;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > this.width) {
        ctx.fillText(line, transform.x - this.x, lineY);
        line = words[i] + " ";
        lineY += this.size;
        this.height += this.size;
      } else {
        line = testLine;
      }
    }

    ctx.fillText(line, transform.x - this.x, lineY);
    this.height += this.size;
    ctx.restore();
  }
}


export class PolygonComponent extends Component {
  constructor(points, color, linecolor = "transparent", lineweight = 2) {
    super("render");
    this.points = points;
    this.color = color;
    this.linecolor = linecolor;
    this.lineweight = lineweight;
  }
   draw(ctx, transform) {
    ctx.strokeStyle = this.linecolor;
    ctx.lineWidth = this.lineweight;
    ctx.fillStyle = this.color;
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.rotate(transform.rotation);
    ctx.scale(transform.scale, transform.scale);

    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.closePath()
        ctx.fill();
    ctx.stroke();
    ctx.restore();


  }
}

export class RotatedSpriteComponent extends RenderComponent {
  constructor(url, x, y, rotation = 0) {
    super("render");
    this.image = new Image();
    this.image.src = url;
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.buffer = document.createElement('canvas');
    this.bufferCtx = this.buffer.getContext('2d');
    this.image.onload = () => {
      this.buffer.width = this.image.width;
      this.buffer.height = this.image.height;
       this.bufferCtx.save();
        this.bufferCtx.clearRect(0, 0, this.buffer.width, this.buffer.height);
        this.bufferCtx.translate(this.buffer.width / 2, this.buffer.height / 2);
        this.bufferCtx.rotate(rotation);
        this.bufferCtx.translate(-this.buffer.width / 2, -this.buffer.height / 2);
        this.bufferCtx.drawImage(this.image, 0, 0);
        this.bufferCtx.restore();
    }

  }


  draw(ctx, transform) {
    if (transform.rotation !== this.rotation) {
        this.bufferCtx.save();
        this.bufferCtx.clearRect(0, 0, this.buffer.width, this.buffer.height);
        this.bufferCtx.translate(this.buffer.width / 2, this.buffer.height / 2);
        this.bufferCtx.rotate(transform.rotation);
        this.bufferCtx.translate(-this.buffer.width / 2, -this.buffer.height / 2);
        this.bufferCtx.drawImage(this.image, 0, 0);
        this.bufferCtx.restore();
        this.rotation = transform.rotation;
    }
    // Save the current canvas state
    if (this.buffer.width > 0 && this.buffer.height > 0) {
      ctx.drawImage(this.buffer, transform.x-this.x, transform.y-this.y);
    }
  }
}

class InfinArray{
  constructor(name = "unnamed", size = 200){
    this.max = 0;
    this.data = [];
    this.color = `rgb(${Math.random()*123},${Math.random()*123},${Math.random()*123})`;
    this.name = name;
    for(let i = 0; i < size; i++){
      this.data.push(0);
    }
    this.count = 0;
  }
  push(value){
    this.max = value;
    const scale = 1;//8
    const h = 2*this.count/this.data.length;
    this.count++;
    for(let i = 0; i < this.data.length-1; i++){
      const bucketSize = h*(this.data.length-i)/this.data.length;
      const d = ((this.data[i]*bucketSize)+this.data[i+1])/(bucketSize+1);
      this.data[i] = d;
      this.max = Math.max(this.data[i],this.max);
    }
    this.data[this.data.length-1] = value;
  }
  draw(ctx,x,y,width,height){
        ctx.strokeStyle = this.color;
        ctx.font = "10px sans-serif";
        ctx.lineWidth = 1;
        ctx.fillStyle = "rgba(200,200,200,.2)";
        ctx.strokeRect(x,y, width, height);
        ctx.fillStyle = "rgba(200,200,200,.4)";
        ctx.fillRect(x,y, width, height);
        ctx.beginPath();
        let v = 0;
        for (let i = 0; i < this.data.length; i++) {

          v = Math.max(this.max,(this.data[0]*2));
          const X = x + (i / (this.data.length-1) * width);
          let Y = y + height - ((this.data[i]/v) * height);

          if (i === 0) {
            ctx.moveTo(X, Y);
          } else {
            ctx.lineTo(X, Y);
          }
        }
        ctx.lineTo(x+width, height+y);
        ctx.lineTo(x, height+y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = this.data[this.data.length-1] == 0 ? 4:1;
        ctx.strokeStyle = this.data[this.data.length-2] == 0 ? "rgba(200,0,0,.5)":(this.data[this.data.length-1] == 0?"rgba(200,200,0,1)":"rgba(0,0,0,1)");
        ctx.beginPath();
        ctx.moveTo(x, y + height - ((this.data[this.data.length-1]/v) * height));
        ctx.lineTo(x+width, y + height - ((this.data[this.data.length-1]/v) * height));
        ctx.stroke();
        ctx.fillStyle = this.color;
        ctx.textAlign = "left";
        ctx.fillText(`${this.data[this.data.length-1]}/${this.max.toFixed(1)}`, x+3, y+10);
         ctx.textAlign = "left";
        ctx.fillText(`${this.name}`, x+3, y + height - 2);
  }
}
export class RenderSystem extends System{
  constructor(game) {
    super("render");
    this.particles = new InfinArray("Active Particles");
    this.particleBufferSize = new InfinArray("Particle Buffer Size");
    this.entityCount = new InfinArray("Entity Count");
    this.runPaused = true;
    this.frameTimes = new Map();
    this.frameTimes.set("Frame Time",new InfinArray("Frame Time"));
    this.frameTimes.set("External", new InfinArray("External"));
    this.components = new Map();
    this.entityTypes = new Map();
    this.entityTypes.set("Entity Count",{count:0, data:new InfinArray("Entity Count")});
    this.maxFpsValues = Number.min_VALUE;
    this.ctx = game.canvas.getContext("2d");
    this.game = game;
    this.lastTime = Date.now();
  }

  update(entities, dt) {

    const sortedEntities = [...entities].filter(entity => entity.hasComponent("transform")).sort((a, b) => {
      const transformA = a.getComponent("transform");
      const transformB = b.getComponent("transform");
      if(transformA.z == transformB.z){
        return transformA.y - transformB.y;
      }
      return transformA.z - transformB.z;
    });

    // sort the cameras
    const sortedCameras = [...entities].filter(entity => entity.hasComponent("camera")).sort((a, b) => {
      const transformA = a.getComponent("camera");
      const transformB = b.getComponent("camera");
      return transformA.z - transformB.z;
    });

    // set the camera transforms
    for (const entity of sortedCameras) {
      if(entity.hasComponent("camera")){
        const camera = entity.getComponent("camera");
        const transform = entity.getComponent("transform");
        const ctx = camera.context;
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(camera.width / 2, camera.height / 2);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-transform.x, -transform.y);
      }
    }

    // draw RenderComponents to the correct cameras
    for (const entity of sortedEntities) {
      const components = [];
      if( entity.getComponent("gui") ){
        components.push (entity.getComponent("gui"));
      }
      if( entity.hasComponent("particleType")  ){

        components.push (entity.getComponent("particleType"));
      }
      if( entity.hasComponent("render") ){

        components.push (entity.getComponent("render"));
      }

      const transform = entity.getComponent("transform");
      //  const graphics =  entity.getComponent("gui") || entity.getComponent("particleType") || entity.getComponent("render");
      for (const graphics of components){
        for (const cameraEntity of sortedCameras) {
          if (cameraEntity.hasComponent("camera")) {
            const camera = cameraEntity.getComponent("camera");
            if(entity.hasComponent(camera.id)){
              const ctx = camera.context;
              graphics.draw(ctx, transform, dt);
              if(debug.overlay){

                if(debug.collisions && entity.hasComponent("collision")){
                  entity.getComponent("collision").draw(ctx,transform);
                }
                if(debug.paths && entity.hasComponent("cow")){
                  entity.draw(ctx,{x:0,y:0});
                }
                if(false){//(entity.hasComponent("corn")){
                  ctx.stroke();
                  ctx.font = "8px sans-serif";
                  ctx.textAlign = "center";
                  ctx.fillText(`${entity.age},${entity.yield.toFixed(2)}`, transform.x,transform.y+10);
                  ctx.fillText(`${entity.getComponent("timer").time.toFixed(2)}`, transform.x,transform.y+20);
                }
              }


            }
          }
        }
      }
    }

    // Get the main canvas and its context
    const mainCtx = this.ctx;
    // Clear the canvas
    mainCtx.fillStyle = '#00D01F';
    mainCtx.fillRect(0, 0, canvas.width, canvas.height);
   // Draw the back buffers to the main canvas
    for (const entity of sortedCameras) {
      const camera = entity.getComponent("camera");
      const ctx = camera.context;




      ctx.restore();
      mainCtx.drawImage(camera.buffer, camera.x, camera.y, camera.width, camera.height);
    }
    // start debug overlay
    //if(debug.overlay)
    {
      let particlePoolSize = 0;
      let activeParticles = 0;
      for(const entity of entities){
        if(debug.component){
          //const component = component.name;
          for(const component of entity.components.values()){
            if(!this.components.has(component.name)){
              this.components.set(component.name,{count: 0, data: new InfinArray(component.name)})
            }
            this.components.get(component.name).count++;
          }
        }
        if(debug.entities){
          if(!this.entityTypes.has(entity.name)){
            this.entityTypes.set(entity.name,{count: 0, data: new InfinArray(entity.name)})
          }
          this.entityTypes.get(entity.name).count++;
        }
        if(debug.particles){
          if (entity.hasComponent("particleType")){
            particlePoolSize+= entity.getComponent("particleType").particles.length;
            activeParticles += entity.getComponent("particleType").activeParticles;
          }
        }
      }
      if(debug.particles){
        this.particleBufferSize.push(particlePoolSize);
        this.particles.push(activeParticles);

      }
      if(debug.entities){
        this.entityTypes.get("Entity Count").count = (entities.size);
      }
      const ctx = this.ctx;
      let frameTime = 0;
      if(debug.system){
        const keys = this.game.systems.keys();
        for(const key of keys){
          if(!this.frameTimes.has(key)){
            this.frameTimes.set(key,new InfinArray(key));
          }
          let prioGroupTime = 0;
          const systems = this.game.systems.get(key).queue;
          for(const system of systems){
            if(system.worker){
                if(!this.frameTimes.has(`${system.name} Worker`)){
                  this.frameTimes.set(`${system.name} Worker`,new InfinArray(`${system.name} Worker`))
                }
                this.frameTimes.get(`${system.name} Worker`).push(system.workerlate > 0? 0:system.workerET);
            }
            if(!this.frameTimes.has(system.name)){
              this.frameTimes.set(system.name,new InfinArray(`${key}:${system.name}`));
            }

            if(system.time >= this.time){
              this.frameTimes.get(system.name).push(system.lastRun);
              prioGroupTime += system.lastRun;
            }
            else{
              this.frameTimes.get(system.name).push(0);
            }
          }
          this.frameTimes.get(key).push(prioGroupTime);
          frameTime += prioGroupTime;
        }
        this.frameTimes.get("Frame Time").push(Date.now() - this.lastTime);
        this.frameTimes.get("External").push(Math.max(0,Date.now() - this.lastTime-frameTime));
        this.lastTime = Date.now();
      }




      // innitilize for drawing
      let y = 0;
      let x = 0;
      const width = 200;
      const padding = 1;
      let height;
      // draw system data
      if(debug.system){
        height = (600-(this.frameTimes.size*padding))/(this.frameTimes.size);
        const names = this.frameTimes.keys();
        for(const name of names){
          const system = this.frameTimes.get(name);
          if(debug.overlay)   system.draw(ctx,0,y,width,height);
          y += height+padding;
        }

        // draw entity data
        y = 0;
        x += width+padding;
      }
      if(debug.component){
        const componentNames = this.components.keys();
        height = (600-(this.components.size*padding))/(this.components.size);
        for(const name of componentNames){
          const type = this.components.get(name);
          type.data.push(type.count);
          type.count = 0;
        if(debug.overlay)   type.data.draw(ctx,x,y,width,height);
          y += height+padding;
        }

        y = 0;
        x += width+padding;
      }
      if(debug.entities){
        const entityNames = this.entityTypes.keys();
        height = (600-(this.entityTypes.size*padding))/(this.entityTypes.size);
        for(const name of entityNames){
          const type = this.entityTypes.get(name);
          type.data.push(type.count);
          type.count = 0;
          if(debug.overlay)     type.data.draw(ctx,x,y,width,height);
          y += height+padding;
        }

        y = 0;
        x += width+padding;
      }
      if(debug.particles){
        height = 600/2;
        if(debug.overlay)     this.particleBufferSize.draw(ctx,x,y,width,height);
        y+= height;
        if(debug.overlay)     this.particles.draw(ctx,x,y,width,height);
        x += width + padding;
        y = 0;
      }
      if(debug.overlay){
        const size = 12;
        ctx.fillStyle = "rgba(200,200,200,.2)";
        ctx.fillRect(x,y, size * 12, size*7);
        ctx.fillStyle = "rgba(20,20,20,1)";
        ctx.font = `${12}px sans-serif`;
        ctx.textAlign = "left";
        ctx.fillText("Systems[1]", x+padding, y+padding + size);
        ctx.fillText("Components[2]", x+padding, y+padding+size*2);
        ctx.fillText("Entities[3]", x+padding, y+padding + size*3);
        ctx.fillText("Particles[4]", x+padding, y+padding + size*4);
        ctx.fillText("Paths[5]", x+padding, y+padding + size*5);
        ctx.fillText("Collisions[6]", x+padding, y+padding + size*6);
      }
      //end debug overlay
    }
  }
}
