import {Component, System} from "./engine.js"

export class SoundEffectComponent extends Component {
  constructor(type, instruction,data = 1.0) {
    super("soundEffect");
    this.type = type;
    this.instruction = instruction;
    this.data = data;
  }
}

class SoundEffect {
  constructor(url, type, minSize, volume = 1.0) {
    this.url = url;
    this.type = type;
    this.minSize = minSize;
    this.volume = volume;
    this.pool = [];
    this.inUse = new Set();
    this.initilize();
    this.muted = false;
    this.dirty = false;
  }
  setVolume(value){
    this.volume = value;
    this.dirty = true;
  }
  setMute(value){
    this.muted = value;
    this.dirty = true;
  }
  initilize(){
    for(let i = 0; i < this.minSize*2; i++){
     this.create();
    }
  }
  get(){
    if(this.pool.length < this.minSize){
      for(let i = 0; i < this.minSize; i++){
       this.create();
      }
    }
    const soundEffect = this.pool.pop();
    this.inUse.add(soundEffect);
    soundEffect.volume = this.volume;
    soundEffect.muted = this.muted;
    soundEffect.type = this.type;
    return soundEffect;
  }
  release(audioElement) {
    this.inUse.delete(audioElement);
    this.pool.push(audioElement);
  }

  create() {
    const effect = document.createElement("audio");//new Audio();
    //document.body.appendChild(effect);
    effect.src = this.url;
    effect.preload = "auto";
    effect.controls = true;
    this.pool.push(effect);
    return effect;
  }
}



export class SoundEffectSystem extends System{
  constructor() {
    super("soundEffects");
    this.effects = new Map();
    this.volume = 1.0;
    this.muted = false;
    this.dirty = false;
  }

  registerSoundEffect(url, type, minSize = 1, volume = 1.0) {
    // Create a new sound effect and add it to the map
    this.effects.set(type, new SoundEffect(url, type, minSize, volume));
  }

  releaseAudioElement(audioElement, type) {
    this.effects.get(type).inUse.delete(audioElement);
    this.effects.get(type).pool.push(audioElement);
  }

  playSoundEffect(type) {
    const audioElement = this.effects.get(type).get();
    audioElement.currentTime = 0;
    audioElement.volume *= this.volume;
    audioElement.muted = audioElement.muted || this.muted;
    audioElement.play();
    audioElement.addEventListener('ended', () => {
      audioElement.pause();
      audioElement.currentTime = 0;
      this.effects.get(type).release(audioElement);
      audioElement.removeEventListener('ended', this);
    });
  }

  stopSoundEffect(type) {
    //Stop all audio elements that are in use for this sound effect
    for (const audioElement of this.soundEffectPool.inUse.get(type)) {
      audioElement.pause();
      audioElement.currentTime = 0;
      this.soundEffectPool.release(audioElement);
    }
  }
   update(entities) {
    for (const entity of entities) {
      let soundEffectComponents = entity.getComponents("soundEffect");
      if (soundEffectComponents) {
        for (let soundEffectComponent of soundEffectComponents) {
          if (soundEffectComponent.instruction === "play") {
            this.playSoundEffect(soundEffectComponent.type);
            soundEffectComponent.instruction = "noop";
          } else if (soundEffectComponent.instruction === "stop") {
            this.stopSoundEffect(soundEffectComponent.type);
            soundEffectComponent.instruction = "noop";
          }else if (soundEffectComponent.instruction === "volume") {
            this.setGlobalVolume(soundEffectComponent.type);
            soundEffectComponent.instruction = "noop";
          }
        }
      }
    }
    for(const effect of this.effects.values()){
      for(const element of effect.inUse.values()){
        if(element.dirty || this.dirty){
          element.volume = effect.volume*this.volume;
          element.muted = effect.muted || this.muted;
          this.dirty = false;
        }
      }
    }
  }

  setGlobalVolume(volume) {
    this.volume = volume;
    for(const effect of this.effects){
      for (const audioElements of effect.inUse) {
        for (const audioElement of audioElements) {
          audioElement.volume = volume*audioElements.volume;
        }
      }
    }
  }
}

