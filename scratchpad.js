import {debug, Entity, Component, DeleteComponent, TransformComponent, Game} from './engine/engine.js';
import {ParticleEmitterComponent, ParticleSystem, ParticleInteractorComponent , ParticleTypeComponent} from './engine/particles.js';
import { CollisionSystem, CollisionComponent } from './engine/collision.js';
import {PhysicsComponent, PhysicsSystem} from './engine/physics.js';
import {SoundEffectComponent, SoundEffectSystem } from './engine/soundEffects.js';
import {SpriteComponent,RotatedSpriteComponent, ScaledSpriteComponent, TiledSpriteComponent,AnimatedSpriteComponent, SquareComponent,CircleComponent, RenderSystem, TextComponent, LineComponent, PolygonComponent, CameraComponent} from './engine/graphics.js';
import {MusicComponent, MusicSystem, RequiredTagsComponent,BlacklistedTagsComponent} from './engine/music.js';
import {generatePolygon} from './engine/vector.js';
import {InputComponent, UIComponent, InputSystem} from './engine/input.js';
import {MovementSystem} from './engine/movement.js';
import {TimerSystem, TimerComponent} from "./engine/timer.js";
import {Vector, pointInPolygon} from "./engine/vector.js";
import {fieldCollision,  FieldSystem, FieldComponent, FieldInteractionComponent} from "./engine/field.js"

const fieldWidth = 1400;
const fieldHeight = 900;
export const game = new Game("test",document.getElementById("canvas"));

class Stat{
  constructor(value, min, max){
  this.value = value;
  this.min = min;
  this.max = max;
  }
}

const ses = new SoundEffectSystem();
game.addSystem( new InputSystem());
game.addSystem(new MovementSystem());
game.addSystem(new TimerSystem());
game.addSystem(new RenderSystem(game));

game.addSystem(new CollisionSystem());
game.addSystem(new MusicSystem());
game.addSystem(ses);
game.addSystem(new ParticleSystem());
game.addSystem(new FieldSystem());

//register sound effects; registerSoundEffect(url, id, minSize)
ses.registerSoundEffect("./sound/tractor.mp3","tractor");
ses.registerSoundEffect("./sound/Cow.mp3","cow");
ses.registerSoundEffect("./sound/pooping.mp3","poop");
ses.registerSoundEffect("./sound/harvest.mp3","harvest",5);

// set up the music machine;
const jukeBox = new Entity();
const music = new MusicComponent("./gamemusic/GameMusic.mp3",["happy", "phrase", "high", "F"]);
jukeBox.addComponent(music);
jukeBox.addComponent(new CameraComponent("uiCamera",0,0,10,800,600,1));
jukeBox.addComponent(new TransformComponent(400,300));

game.addEntity(jukeBox);

const field = new Entity();
field.addComponent(new Component("playerCam"));
field.addComponent(new TransformComponent(0,0,-10));
field.addComponent(new TiledSpriteComponent("./graphics/field.bmp",1152,648, fieldWidth,fieldHeight));
game.addEntity(field);

function popcornUpdate(particle, dt) {
  // Update the particle's position based on its velocity and acceleration
  particle.position.x += particle.velocity.x * dt;
  particle.position.y += particle.velocity.y * dt;
  particle.velocity.x += particle.acceleration.x * dt;
  particle.velocity.y += particle.acceleration.y * dt;
}
const popcornParticles = new Entity();
popcornParticles.addComponent(new Component("playerCam"));
popcornParticles.addComponent(new TransformComponent(0,0,90));
popcornParticles.addComponent(new ParticleTypeComponent("popcorn", popcornUpdate, new SpriteComponent("./graphics/popcorn.png",0,0)));
game.addEntity(popcornParticles);


function dustUpdate(particle, dt) {
  // Update the particle's position based on its velocity and acceleration
 particle.position.x += particle.velocity.x * dt/15;
  particle.position.y += particle.velocity.y * dt/15;
  particle.radius += 0.03*dt;
  particle.color.a = particle.lifetime/(1000*3);
}

const dustParticles = new Entity();
dustParticles.addComponent(new Component("playerCam"));
dustParticles.addComponent(new TransformComponent(0,0,90));
dustParticles.addComponent(new ParticleTypeComponent("dust", dustUpdate, ));
game.addEntity(dustParticles);

function particleUpdate(particle, dt) {
  // Update the particle's position based on its velocity and acceleration
  particle.position.x += particle.velocity.x * dt*.5;
  particle.position.y += particle.velocity.y * dt*.5;
  particle.velocity.x += particle.acceleration.x * dt;
  particle.velocity.y += particle.acceleration.y * dt;
}

const particleSystem = new Entity();
particleSystem.addComponent(new Component("playerCam"));
particleSystem.addComponent(new TransformComponent(0,0,90));
particleSystem.addComponent(new ParticleTypeComponent("red",particleUpdate,new CircleComponent(0,0,4,"red")));
game.addEntity(particleSystem);

function poopUpdate(particle, dt) {
  // Update the particle's position based on its velocity and acceleration
  particle.position.x += (1-(Math.random()*2))*dt;
  particle.position.y -= (Math.random()* dt);
}

const poopParticles = new Entity();
poopParticles.addComponent(new Component("playerCam"));
poopParticles.addComponent(new TransformComponent(0,0,90));
poopParticles.addComponent(new ParticleTypeComponent("poop"),poopUpdate);
game.addEntity(poopParticles);

function sparkleUpdate(particle, dt) {
  // Update the particle's position based on its velocity and acceleration
  particle.position.x += (1-(Math.random()*2))*dt*.04;
  particle.position.y -= (Math.random()* dt*.05);
}

const sparkleParticles = new Entity();
sparkleParticles.addComponent(new Component("playerCam"));
sparkleParticles.addComponent(new TransformComponent(0,0,90));
sparkleParticles.addComponent(new ParticleTypeComponent("sparkle",sparkleUpdate,new CircleComponent(0,0,1.5,"limegreen")));
game.addEntity(sparkleParticles);


function makeSlim(x,y,direction=Math.PI/2){
  const slim = new Entity();
  slim.addComponent(new Component("slim"));
  const slimCollision = new CollisionComponent([
    { x: 20, y: -21 },
    { x: 42, y: -26 },
    { x: 42, y: 28 },
    { x: 20, y: 23 }
  ]);

  slim.addComponent(slimCollision);
  slim.addComponent(new InputComponent());
  slim.addComponent(new CameraComponent("playerCam", 0, 0, 0, 800, 600, 1));
  slim.addComponent(new Component("playerCam"));
  slim.addComponent(new RotatedSpriteComponent("./graphics/redTractorR.png",50,50));
  slim.addComponent(new TransformComponent(x,y,direction));
  slim.addComponent(new SoundEffectComponent("tractor","loop"));
  slim.fuel = new Stat(75,0,100);
  slim.money = new Stat(100,0,1000);
  slim.damage = new Stat(0,0,100);
  slim.effeciency = new Stat(1,0,10);
  game.addEntity(slim);
  return slim;
}

function getRandomColor() {
  var r = Math.floor(Math.random() * 256);
  var g = Math.floor(Math.random() * 256);
  var b = Math.floor(Math.random() * 256);
  return "rgb(" + r + ", " + g + ", " + b + ")";
}

function makeCow(x = Math.floor(Math.random()*fieldWidth),y = Math.floor(Math.random()*fieldHeight)){
  const cow = new Entity();
  cow.addComponent(new Component("playerCam"));
  cow.addComponent(new Component("cow"));
   cow.home = new Vector({x:Math.floor(Math.random()*fieldWidth),y:Math.floor(Math.random()*fieldHeight)});
  cow.color = getRandomColor();
  cow.trail = [cow.home,new Vector({x:x,y:y})];

  cow.addComponent(new TransformComponent(x,y,0,Math.atan2(cow.home.y - y, cow.home.x - x)));
  cow.addComponent(new SoundEffectComponent("cow","preload"));
  cow.addComponent(new RotatedSpriteComponent("./graphics/cowr.png",37,37));
  const collision = new CollisionComponent(
  [{x:-32,y:-16},{x:32,y:-16},
    {x:32,y:16},{x:-32,y:16}]);
  collision.registerCallback("slim",hitTractor);
  cow.addComponent(collision);
  cow.addComponent(new TimerComponent(Math.random()*50+50,moveCow));
  game.addEntity(cow);

  cow.draw = function(ctx, transform){
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.translate(transform.x, transform.y);
    ctx.beginPath();
    ctx.moveTo(this.trail[0].x, this.trail[0].y);
    for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }
}
function hitTractor(self, other){
  //damage tractora
  other.damage.value += 10+Math.random()*10;
  self.addComponent(new ParticleEmitterComponent(.5,"red"));
  self.removeComponent("collision");
  self.getComponent("timer").time = 30+Math.random()*30;
  self.getComponent("timer").callback = remove;
 // explode
}

function moveCow(self){
  const speed = 1;
  self.getComponent("timer").time = Math.random()*50+50;
  const transform = self.getComponent("transform");

   // Get the vector pointing towards the cow's home
  var homeVector = self.home.subtract(transform);

  if(debug.overlay && self.trail[self.trail.length-1].subtract(transform).length()>30){
    self.trail.push(new Vector({x:transform.x,y:transform.y}));
  }
  // Get the angle between the cow's current heading and the home vector
  var angle = Math.atan2(homeVector.y, homeVector.x) - transform.rotation;

  // Normalize the angle to be between -180 and 180 degrees
  angle = ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;

  if(Math.random() > 0.005 + Math.abs(angle) * 0.02){
    //transform.rotation += (Math.random()-0.5)*0.3;
    transform.rotation += angle * 0.003+ (Math.random() - 0.5) * 0.20;
  }
  transform.x += Math.cos(transform.rotation) * speed;
  transform.y += Math.sin(transform.rotation) * speed;
  if(Math.random()<.01){
    makePoop(transform.x,transform.y);
  }
  if(Math.random()<.001){
    self.getComponent("soundEffect").instruction = "play";
  }
}
function hitCow(){
  const a = 0;
}

function calculateRepair(self){
  let cost = 0;
  for(let i = slim.damage.value; i > 0; i--){
    cost += i;
  }
  return cost;
}
function repair(self){
  if(slim.money.value <=0)return;
  let cost = calculateRepair(self);
  slim.money.value -= cost;
  slim.damage.value = 0;
}
function upgrade(self)
{
  if(slim.money.value < 0)return;
  slim.money.value -= upgradecost;

  upgradecost *= 17;
  slim.effeciency.value *= 1.1;
}

function buyFuel(){
  if(slim.money.value < 0)return;
  slim.money.value -= (slim.fuel.max-slim.fuel.value)*6;
  slim.fuel.value = slim.fuel.max;
}

function makeBar(x,y,title,imageurl,swidth,sheight,width,height,needlesize, padding,target,minvalue,maxvalue){
   const bar = new Entity();
     bar.addComponent(new Component("uiCamera"));
     bar.addComponent(new TransformComponent (x,y,101));
     bar.addComponent(new PolygonComponent([{x:0,y:0},{x:0,y:-height},{x:width,y:-height},{x:width,y:0}],"grey"));
  const needle = new Entity();
     needle.target = target;
     needle.height = height;
     needle.padding = padding;
     needle.y = y;
     needle.addComponent(new Component("uiCamera"));
     needle.addComponent(new TransformComponent (x,y-padding,102));
     calculateNeedlePosition
     needle.addComponent(new PolygonComponent([{x:-needlesize,y:0},{x:needlesize,y:-needlesize},{x:width+needlesize,y:-needlesize},{x:width+needlesize,y:needlesize},{x:-needlesize,y:needlesize}],"red"));
     needle.addComponent(new TimerComponent(10,updateNeedle));
  const text = new Entity();
     text.addComponent(new Component("uiCamera"));
     text.addComponent(new TextComponent(title,"Arial", 12, "black", "center"));
     text.addComponent(new TransformComponent(x+(width/2),y+1+width+(padding*4),103));
   const image = new Entity();
     image.addComponent(new Component("uiCamera"));
     image.addComponent(new TransformComponent(x-padding,y, 102));
     image.addComponent(new ScaledSpriteComponent(imageurl,0,0,swidth,sheight,width+(padding*2),width+(padding*2)));

   game.addEntity(bar);
   game.addEntity(needle);
   game.addEntity(text);
   game.addEntity(image);
}

function calculateNeedlePosition(height, padding,min,max, value){
  const scale = (height-(2*padding))/(max-min);
  const scaledValue = value-min;
  return (scaledValue*scale)+padding;
}

function updateNeedle(self){
    self.getComponent("transform").y = self.y-calculateNeedlePosition(
      self.height,self.padding,self.target.min,self.target.max,self.target.value
    )+(Math.random()*3-2);
}

function makeCorn(x,y){
  const corn = new Entity();
  corn.addComponent(new Component("playerCam"));
  corn.addComponent(new Component("corn"));
  corn.addComponent(new TransformComponent(x,y));
  corn.addComponent(new AnimatedSpriteComponent("./graphics/corn.png",25,50,50, 50, 6, 0));
  const collision = new CollisionComponent([{x:-2,y:-2},{x:2,y:-2},{x:2,y:2},{x:-2,y:2}]);
  corn.addComponent(collision);
  corn.addComponent(new TimerComponent(5000+Math.random()*1000,growCorn));
  corn.age = 0;
  corn.yield = 1;
  game.addEntity(corn);
  collision.registerCallback("slim", harvestCorn);
  collision.registerCallback("pop",damageCorn);
  collision.registerCallback("poop",fertalized);
  corn.addComponent(new SoundEffectComponent("harvest","preload"));
  return corn;
}

function damageCorn(self){
  self.yield *= (Math.random()*.3)+.7;
}

function growCorn(self){
  self.age++;
  if(self.age > 5){
    popCorn(self);
  }
  else{
    self.yield *= self.age;
    self.getComponent("timer").time = 5000+Math.random()*1000;
    self.getComponent("render").currentFrame = self.age;
  }
}

function harvestCornTimerAction(self){
  const timer = self.getComponent("timer");
  timer.time = 0;
   timer.time = Math.random()*0.5+.1;
  timer.callback = remove(self);
}

function fertalized(self, other){
    self.yield*=1.001;
    self.addComponent(new ParticleEmitterComponent(.0005,"sparkle"));
}

function fertalize(self, other){
    self.neutrients -=0.1;
    if (self.neutrients < 0){
      self.addComponent(new DeleteComponent());
    }
}

function remove(self){
  self.addComponent(new DeleteComponent());
}

function harvestCorn(self, other){
  slim.money.value += self.age * self.yield * slim.effeciency.value / (slim.damage.value+1);
  self.removeComponent("collision");
  self.addComponent(new ParticleEmitterComponent(.04, "dust"));
  self.addComponent(new TimerComponent(100,harvestCornTimerAction));
  self.getComponent("soundEffect").instruction = "play";
}

function popCorn(self){
  const transform = self.getComponent("transform");
  self.addComponent(new DeleteComponent());
  const pop = new Entity();
  pop.addComponent(new Component("pop"));
  pop.addComponent(transform);
  const polygon = generatePolygon(10,100);
  const collision = new CollisionComponent(polygon);
  pop.addComponent(collision);
  pop.addComponent(new ParticleEmitterComponent(.1, "popcorn"));
  pop.addComponent(new TimerComponent(50,remove));
  game.addEntity(pop);
  collision.registerCallback("slim",movieTime);
}

function movieTime(self,other){
  slim.damage.value+=1;
}

function makeCollision(x,y,radius){
  const cpc = new Entity();
  cpc.addComponent(new Component("playerCam"));
  cpc.addComponent(new Component("corn"));
  cpc.addComponent(new TransformComponent(x,y,radius,0));
  cpc.addComponent(new CircleComponent(0,0,2,"black"));
  cpc.addComponent(new TimerComponent(1000,resetColor));
  const collision = new CollisionComponent(generatePolygon(4,radius));
  cpc.addComponent(collision);
  collision.registerCallback("slim",hit);
  game.addEntity(cpc);
}
function hit(self,other){
  self.getComponent("render").color = "white";
}
function resetColor(self){
  self.getComponent("render").color = "black";
  self.getComponent("timer").time = 500;
}

let upgradecost = 19.95;
let slim = makeSlim(600,1200);
let cowCost = 100;

makeBar(30,500,"FUEL","./graphics/fuelcan.png",75,75,20,150,2, 5,slim.fuel,0,100);
makeBar(90,500,"DAMAGE","./graphics/redTractorU.png",100,100,20,150,2, 5,slim.damage,0,100);


function loadGame(){
  for(let i = 0; i < 100; i++){
    const corn = makeCorn(Math.random()*fieldWidth,Math.random()*fieldHeight);
    corn.age = Math.floor(Math.random()*5);
    corn.getComponent("render").currentFrame = corn.age;
  }
  slim = makeSlim(600,1200);
  cowCost = 100;
  makeCow(200,100);

}
function pauseGame() {
  gamePaused = true;
  // Code to pause the game here
}

function resumeGame() {
  gamePaused = false;
  // Code to resume the game here
  lastFrameTimeMs = 0;
  requestAnimationFrame(update);
}

function collisionGrid(x,y,r,width,height){
  for(let i = 0;i<width;i++){
    for(let j = 0; j< height; j++){
      makeCollision(x+(i*r*4),y+(j*r*4),r);
    }
  }
}
//collisionGrid(-30,-30,1,30,30);
let gamePaused = false;
window.addEventListener("blur", pauseGame);

window.addEventListener("focus", resumeGame);

let lastFrameTimeMs = 0;
function update(timeStamp) {
  if(gamePaused){
    return;
  }
  let timeDelta = timeStamp - lastFrameTimeMs;
  lastFrameTimeMs = timeStamp;
  if (timeDelta > 1000) timeDelta = 1000;
  game.update(timeDelta);
  if(slim.fuel.value < slim.money.min && slim.money.value<slim.money.min){
    return;
  }
  while(Math.random()<0.3){
    makeCorn(Math.random()*fieldWidth,Math.random()*fieldHeight);
  }
  requestAnimationFrame(update);
}

requestAnimationFrame(update);
