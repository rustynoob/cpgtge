 import {debug, Entity, Component, DeleteComponent, TransformComponent,  Game} from './engine.js';

class CameraComponent extends Component {
  constructor(x, y, width, height) {
    super("camera");
    this.width = width;
    this.height = height;
  }
}

export class SpriteComponent extends Component {
  constructor(url) {
    super("sprite");
    this.url = url;
  }
}

export class AnimatedSpriteComponent extends Component {
  constructor(url, frameWidth, frameHeight, frameCount, frameRate) {
    super("animatedSprite");
    this.url = url;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frameCount = frameCount;
    this.frameRate = frameRate;
    this.currentFrame = 0;
    this.elapsedTime = 0;
  }
}

export class ShapeComponent extends Component {
  constructor(type, color, x, y, width, height, radius) {
    super("shape");
    this.type = type;
    this.color = color;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.radius = radius;
  }
}

export class LineComponent extends Component {
  constructor(color, width, x1, y1, x2, y2) {
    super("line");
    this.color = color;
    this.width = width;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }
}

export class TextComponent extends Component {
  constructor(content, font, size, color, align) {
    super("text");
    this.content = content;
    this.font = font;
    this.size = size;
    this.color = color;
    this.align = align;
  }
}

export class PolygonComponent extends Component {
  constructor(points, color) {
    super('polygon');
    this.points = points;
    this.color = color;
  }
}

export class CameraComponent extends Component {
  constructor(name, x, y, zoom) {
    super("camera");
    this.name = name;
    this.x = x;
    this.y = y;
    this.zoom = zoom;
  }
}

export class RenderSystem {
  constructor() {
    this.fpsValues = [];
    this.maxFpsValues = 100;
    this.canvas = document.getElementById("canvas");
    this.buffer = document.createElement("canvas");
    this.buffer.width = canvas.width;
    this.buffer.height = canvas.height;
  }
  update(entities, dt) {

    

    const backBuffer = this.buffer;
    backBuffer.style.background = "linear-gradient(to top, white, black)";
     
    
    let ctx = backBuffer.getContext("2d");
    ctx.clearRect(0, 0, backBuffer.width, backBuffer.height);
    let particlePoolSize = 0;
	let particleCount = 0;
    // Set the background color to black
 //   ctx.fillStyle = "black";
 //   ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sort the entities by their z-index
    const sortedEntities = [...entities].filter(entity => entity.hasComponent("transform")).sort((a, b) => {
      const transformA = a.getComponent("transform");
      const transformB = b.getComponent("transform");
      return transformA.z - transformB.z;
    });

    for (const entity of sortedEntities) {
      if (entity.hasComponent("sprite") && entity.hasComponent("transform")) {
        const sprite = entity.getComponent("sprite");
        const transform = entity.getComponent("transform");
        // Create image object for the sprite
        const image = new Image();
        image.src = sprite.url;
        // Draw the image on the canvas at the transform position
        ctx.drawImage(image, transform.x, transform.y);
      }
      if (entity.hasComponent("animatedSprite") && entity.hasComponent("transform")) {
        const sprite = entity.getComponent("animatedSprite");
        const transform = entity.getComponent("transform");
        // Update the animation
        sprite.elapsedTime += dt;
        if (sprite.elapsedTime >= sprite.frameRate) {
          sprite.currentFrame = (sprite.currentFrame + 1) % sprite.frameCount;
          sprite.elapsedTime = 0;
        }
        // Create image object for the sprite sheet
        const image = new Image();
        image.src = sprite.url;
        // Calculate the position of the current frame in the sprite sheet
        const sx = sprite.currentFrame * sprite.frameWidth;
        const sy = 0;
        // Draw the current frame on the canvas at the transform position
        ctx.drawImage(image, sx, sy, sprite.frameWidth, sprite.frameHeight, transform.x, transform.y, sprite.frameWidth, sprite.frameHeight);
          } else if (entity.hasComponent("line") && entity.hasComponent("transform")) {
        const line = entity.getComponent("line");
        const transform = entity.getComponent("transform");
        ctx.save();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        ctx.beginPath();
        ctx.moveTo(transform.x1, transform.y1);
        ctx.lineTo(transform.x2, transform.y2);
        ctx.stroke();
        ctx.restore();
      }
      if (entity.hasComponent("text") && entity.hasComponent("transform")) {
        const text = entity.getComponent("text");
        const transform = entity.getComponent("transform");
        ctx.save();
        ctx.fillStyle = text.color;
        ctx.font = `${text.size}px ${text.font}`;
        ctx.textAlign = text.align;
        ctx.fillText(text.content, transform.x, transform.y);
        ctx.restore();
      }
      if (entity.hasComponent("shape") && entity.hasComponent("transform")) {
        const shape = entity.getComponent("shape");
        const transform = entity.getComponent("transform");
        // set the fill style based on the shape color
        ctx.fillStyle = shape.color;
        if (shape.type === "square") {
          // draw a filled rectangle on the canvas at the transform position and with the specified width and height
          ctx.fillRect(transform.x, transform.y, shape.width, shape.height);
        } else if (shape.type === "circle") {
          // draw a filled circle on the canvas at the transform position and with the specified radius
          ctx.beginPath();
          ctx.arc(transform.x, transform.y, shape.radius, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
       if (entity.hasComponent('polygon') && entity.hasComponent('transform')) {
    const polygon = entity.getComponent('polygon');
    const transform = entity.getComponent('transform');
    ctx.beginPath();
    ctx.moveTo(polygon.points[0].x + transform.x, polygon.points[0].y + transform.y);
    for (let i = 1; i < polygon.points.length; i++) {
      ctx.lineTo(polygon.points[i].x + transform.x, polygon.points[i].y + transform.y);
    }
    ctx.closePath();
    ctx.fillStyle = polygon.color;
    ctx.fill();
  }
      //constructor(position, velocity, acceleration, direction, color, size, lifetime, type, radius) {
  
      if (entity.hasComponent("particleType")){
		const particleType = entity.getComponent("particleType");
        for (let particle of particleType.particles) {
			if (!particle.markedForDeletion){
		      ctx.beginPath();
		      ctx.fillStyle = `rgb(${particle.color.r}, ${particle.color.g}, ${particle.color.b})`;
		      ctx.arc(particle.position.x, particle.position.y, particle.radius, 0, Math.PI * 2);
              ctx.closePath();
              ctx.fill();
              particleCount++;
	      }
        }
        particlePoolSize += particleType.particles.length;
      }
    }
    // start debug overlay
    if(debug){
      const fps = 1.0 / (dt/1000);
      this.fpsValues.push(fps);
      if (this.fpsValues.length > this.maxFpsValues) {
        this.fpsValues.shift();
      }

      ctx.strokeStyle = "magenta";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < this.fpsValues.length; i++) {
        const x = i / this.maxFpsValues * canvas.width;
        const y = canvas.height - this.fpsValues[i] / 100 * canvas.height;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.font = "16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "magenta";
      ctx.fillText(`FPS: ${fps}`, 10, 20);
      ctx.fillText(`Entity Count: ${entities.size}`, 10, 36);
      ctx.fillText(`Particles: ${particleCount}/${particlePoolSize}`, 10, 52);
      //end debug overlay
    }
     ctx = this.canvas.getContext("2d");
     this.canvas.style.background = "linear-gradient(to top, white, black)";
     ctx.clearRect(0, 0, canvas.width, canvas.height);
     ctx.drawImage(backBuffer, 0, 0);

  }
}
