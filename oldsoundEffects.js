import {debug, Entity, Component, System, DeleteComponent, TransformComponent,  Game} from './engine.js';

import {AudioElementPool} from './music.js';

export class SoundEffectComponent extends Component {
  constructor(url, instruction) {
    super("soundEffect");
    this.url = url;
    this.audioElement = null;
    this.instruction = instruction;
    this.remove = false;
  }


  cleanUp() {
    // Stop the audio element from playing
    if(this.remove){
      this.shouldProcessBeforeDelete = 0;
    }
    if(this.audioElement){
      //this.audioElement.pause();
      this.remove = true;
    }
    else{
      this.shouldProcessBeforeDelete = 0;
    }

  }
}

export class SoundEffectSystem extends System{
  constructor() {
    super("old sounde effects")
    this.audioElementPool = new AudioElementPool(20);
  }

  update(entities, dt) {
    for (const entity of entities) {
      let soundEffects = entity.getComponents("soundEffect");
      if(soundEffects){
        for (let soundEffect of soundEffects){
          if (soundEffect.instruction === "play") {
            if(soundEffect.audioElement === null){
              soundEffect.audioElement = this.audioElementPool.getAudioElement();
            }
            if(soundEffect.audioElement.src != soundEffect.url){
              soundEffect.audioElement.pause();
              soundEffect.audioElement.src = soundEffect.url;
              soundEffect.audioElement.preload = 'auto';
              soundEffect.audioElement.load();
            }

            soundEffect.shouldProcessBeforeDelete =123456789;
          // if(soundEffect.audioElement.readyState >= 4) {
              soundEffect.audioElement.currentTime = 0;
              soundEffect.audioElement.play();
              soundEffect.instruction = "noop";
           // }
          }
          if (soundEffect.instruction === "loop") {
            let audioElement = null;
            if(soundEffect.audioElement == null){
              soundEffect.audioElement = audioElement =  this.audioElementPool.getAudioElement();
              audioElement.src = soundEffect.url;
            }else{
              audioElement = soundEffect.audioElement;
            }
            audioElement.currentTime = 0;
            audioElement.play();
            soundEffect.instruction = "noop";
            audioElement.isPlaying = true;

            // Set processBeforeDeleting to 0
            soundEffect.processBeforeDeleting = 64;
          }
          if (soundEffect.instruction === "preload") {
            if(soundEffect.audioElement == null){
              soundEffect.audioElement = this.audioElementPool.getAudioElement();
            }
            if(soundEffect.audioElement.src != soundEffect.url){
              soundEffect.audioElement.pause();
              soundEffect.audioElement.src = soundEffect.url;
              soundEffect.audioElement.preload = 'auto';
              soundEffect.audioElement.load();
            }else{
              soundEffect.audioElement.currentTime = 0;
            }
              soundEffect.instruction = "noop";
            //soundEffect.audioElement.isPlaying = true;

            // Set processBeforeDeleting to 0
            soundEffect.shouldProcessBeforeDelete =123456789;
          }

          if (soundEffect.audioElement && soundEffect.remove){
            this.audioElementPool.releaseWhenDone(soundEffect.audioElement);
            //soundEffect.audioElement = null;
            soundEffect.shouldProcessBeforeDelete = 0;
          }
        }
      }
    }
  }
}
