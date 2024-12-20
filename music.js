import {debug, Entity, Component, System, DeleteComponent, TransformComponent, Game} from './engine.js';

export class MusicComponent extends Component {
  constructor(url, tags, crossfadeTime = 0.1) {
    super('music');
    this.url = url;
    this.tags = tags;
    this.crossfadeTime = 0.1;
  }
}

export class RequiredTagsComponent extends Component {
  constructor(tags) {
    super('requiredTags');
    this.tags = tags;
  }
}

export class BlacklistedTagsComponent extends Component {
  constructor(tags) {
    super('blacklistedTags');
    this.tags = tags;
  }
}

export class MusicData {
  constructor(url, tags) {
    this.url = url;
    this.tags = tags;
  }
}

export class AudioElementPool {
  constructor(minSize) {
    this.minSize = minSize;
    this.pool = [];
    this.inUse = new Set();
    this.init();
  }

  init() {
    // Initialize the pool by adding the minimum number of audio elements to the DOM
    for (let i = 0; i < this.minSize; i++) {
      const audioElement = this.createAudioElement();
      this.pool.push(audioElement);
    }
  }

  createAudioElement() {
    const audioElement = document.createElement('audio');
    document.body.appendChild(audioElement);
    return audioElement;
  }

  getAudioElement() {
    let audioElement;
    if (this.pool.length > 0) {
      // Get an audio element from the pool
      audioElement = this.pool.pop();
    } else {
      // Create a new audio element if the pool is empty
      audioElement = this.createAudioElement();
    }
    this.inUse.add(audioElement);
    return audioElement;
  }

  releaseAudioElement(audioElement) {
    this.inUse.delete(audioElement);
    this.pool.push(audioElement);
  }
  releaseWhenDone(audioElement) {
    // Attach an event listener to the audio element's 'ended' event
    if(audioElement.paused){
       this.releaseAudioElement(audioElement);
       return;
    }
    audioElement.addEventListener('ended', () => {
      // Set the audio element's src to null
      audioElement.pause();
      // Release the audio element back to the pool
      this.releaseAudioElement(audioElement);
      // Remove the event listener
      audioElement.removeEventListener('ended', this);
    });
  }
}

export class MusicSystem extends System{
  constructor() {
    super("music")
    this.audioElementPool = new AudioElementPool(3);
    this.currentTrack = null;
    this.nextTrack = null;
    this.volume = 1;
    this.muted = false;
    this.dirty = false;
  }

  update(entities, dt) {
  // Check if a new track needs to be started
  if (this.currentTrack == null || this.currentTrack.hasComponent('delete')) {
    this.startTrack(this.nextTrack);
    this.nextTrack = null;
  }

  // If there is no track loaded yet, select a track to start playing
  if (this.currentTrack == null && this.nextTrack == null) {
    for (const entity of entities) {
      if (entity.hasComponent('music')) {
        this.startTrack(entity);
        break;
      }
    }
  }
  const trackLength = this.currentTrack.audioElement.duration;
  const crossfadeLength = this.currentTrack.getComponent('music').crossfadeTime;
  const crossfadeStart = trackLength - crossfadeLength;
  const currentTime = this.currentTrack.audioElement.currentTime;
  // Preload the next track if it's time to start the crossfade
  if (this.nextTrack == null && this.currentTrack && crossfadeStart - 1 <= currentTime) {
    this.preloadNextTrack(entities);
  }

  // Handle crossfading between tracks if necessary
  if (this.currentTrack && this.nextTrack) {
    const currentMusicComponent = this.currentTrack.getComponent('music');
    const nextMusicComponent = this.nextTrack.getComponent('music');
    if (crossfadeStart <= currentTime) {

      if(this.nextTrack.audioElement.paused){
          this.nextTrack.audioElement.volume = this.volume;
        this.nextTrack.audioElement.play();

      }
      let crossfadePoint = (currentTime - crossfadeStart)/crossfadeLength;
      if (crossfadePoint > 1){crossfadePoint = 1;}
      this.currentTrack.audioElement.volume = 1-crossfadePoint;
     // this.nextTrack.audioElement.volume = 0+crossfadePoint;

    }

    // If the crossfade is complete, set the current track to the next track
    // and reset the next track to null
    if (this.currentTrack.audioElement.ended) {
        this.audioElementPool.releaseAudioElement(this.currentTrack.audioElement);

      this.currentTrack = this.nextTrack;
      this.nextTrack = null;
    }
  }
  if(this.currentTrack.audioElement.paused){
    this.currentTrack.audioElement.volume = this.volume;
    this.currentTrack.audioElement.muted = this.muted;
    this.currentTrack.audioElement.play();
  }
  if(this.dirty){
    this.dirty = false;
    this.currentTrack.audioElement.muted = this.muted;
    this.currentTrack.audioElement.volume = this.volume;
  }
}


  startTrack(entity) {
    if (entity) {
      const musicComponent = entity.getComponent('music');
      const audioElement = this.audioElementPool.getAudioElement();
      audioElement.load();
      audioElement.src = musicComponent.url;
      audioElement.play();
      entity.audioElement = audioElement;
      this.currentTrack = entity;

    }
  }

  preloadTrackIgnoreCurrent(entities) {
    // Select the next track based on the tags of the current track
    const currentMusicComponent = this.currentTrack.getComponent('music');
    const currentTrackDuration = this.currentTrack.audioElement.duration;
    const potentialNextTracks = [];
    for (const entity of entities) {
      const musicComponents = entity.getComponents("music");
      if(musicComponents){
        for (const musicComponent of musicComponents){
          // Check if the entity has the required and blacklisted tags components
          const requiredTagsComponent = entity.getComponent('requiredTags');
          const blacklistedTagsComponent = entity.getComponent('blacklistedTags');
          let shouldAdd = true;
          // Check if the entity has all the required tags
          if (requiredTagsComponent) {
            for (const requiredTag of requiredTagsComponent.tags) {
              if (!currentMusicComponent.tags.includes(requiredTag)) {
                shouldAdd = false;
                break;
              }
            }
          }
          // Check if the entity has any blacklisted tags
          if (shouldAdd && blacklistedTagsComponent) {
            for (const blacklistedTag of blacklistedTagsComponent.tags) {
              if (currentMusicComponent.tags.includes(blacklistedTag)) {
                shouldAdd = false;
                break;
              }
            }
          }
          if (shouldAdd) {
            potentialNextTracks.push(entity);
          }
        }
      }
    }
    if (potentialNextTracks.length > 0) {
      this.nextTrack = potentialNextTracks[Math.floor(Math.random() * potentialNextTracks.length)];
      this.nextTrack.audioElement = this.audioElementPool.getAudioElement();
      this.nextTrack.audioElement.load();
      this.nextTrack.audioElement.src = this.nextTrack.getComponent('music').url;
      this.nextTrack.audioElement.preload = 'auto';
    }else{
        preloadTrackIgnoreLists(entities);
    }
  }

  preloadNextTrack(entities) {
 // Select the next track based on the tags of the current track
    const currentMusicComponent = this.currentTrack.getComponent('music');
    const currentTrackDuration = this.currentTrack.audioElement.duration;
    const potentialNextTracks = [];
    for (const entity of entities) {
      const musicComponents = entity.getComponents("music");
      if(musicComponents){
        for (const musicComponent of musicComponents){
          // Check if the entity has the required and blacklisted tags components
          const requiredTagsComponent = entity.getComponent('requiredTags');
          const blacklistedTagsComponent = entity.getComponent('blacklistedTags');
          let shouldAdd = true;
          // Check if the entity has all the required tags
          if (requiredTagsComponent) {
            for (const requiredTag of requiredTagsComponent.tags) {
              if (!currentMusicComponent.tags.includes(requiredTag)) {
                shouldAdd = false;
                break;
              }
            }
          }
          // Check if the entity has any blacklisted tags
          if (shouldAdd && blacklistedTagsComponent) {
            for (const blacklistedTag of blacklistedTagsComponent.tags) {
              if (currentMusicComponent.tags.includes(blacklistedTag)) {
                shouldAdd = false;
                break;
              }
            }
          }
          if (shouldAdd) {
            for (const tag of musicComponent.tags) {
              if (currentMusicComponent.tags.includes(tag)) {
                potentialNextTracks.push(entity);
                break;
              }
            }
          }
        }
      }
    }
    if (potentialNextTracks.length > 0) {
      this.nextTrack = potentialNextTracks[Math.floor(Math.random() * potentialNextTracks.length)];
      this.nextTrack.audioElement = this.audioElementPool.getAudioElement();
      this.nextTrack.audioElement.load();
      this.nextTrack.audioElement.src = this.nextTrack.getComponent('music').url;
      this.nextTrack.audioElement.preload = 'auto';
    }else{
        PreloadTrackIgnore(entities);
    }
  }

  preloadTrackIgnoreLists(entities) {
    // Select the next track based on the tags of the current track
    const currentMusicComponent = this.currentTrack.getComponent('music');
    const currentTrackDuration = this.currentTrack.audioElement.duration;
    const potentialNextTracks = [];
    for (const entity of entities) {
      //get the list of music components and loop through them
      const musicComponents = entity.getComponents("music");
      if(musicComponents){
        for (const musicComponent of musicComponents){
          for (const tag of musicComponent.tags) {
            if (currentMusicComponent.tags.includes(tag)) {
              potentialNextTracks.push(entity);
              break;
            }
          }
        }
      }
    }
    if (potentialNextTracks.length > 0) {
      this.nextTrack = potentialNextTracks[Math.floor(Math.random() * potentialNextTracks.length)];
      this.nextTrack.audioElement = this.audioElementPool.getAudioElement();
      this.nextTrack.audioElement.load();
      this.nextTrack.audioElement.src = this.nextTrack.getComponent('music').url;
      this.nextTrack.audioElement.preload = 'auto';
    }
    else{
        this.nextTrack = this.currentTrack;
    }
  }
  preloadRandomTrack(entities) {
    // Select the next track based on the tags of the current track
    const currentMusicComponent = this.currentTrack.getComponent('music');
    const currentTrackDuration = this.currentTrack.audioElement.duration;
    const potentialNextTracks = [];
    for (const entity of entities) {
      //get the list of music components and loop through them
      const musicComponents = entity.getComponents("music");
      if(musicComponents){
        for (const musicComponent of musicComponents){
          potentialNextTracks.push(entity);
        }
      }
    }
    if (potentialNextTracks.length > 0) {
      this.nextTrack = potentialNextTracks[Math.floor(Math.random() * potentialNextTracks.length)];
      this.nextTrack.audioElement = this.audioElementPool.getAudioElement();
      this.nextTrack.audioElement.load();
      this.nextTrack.audioElement.src = this.nextTrack.getComponent('music').url;
      this.nextTrack.audioElement.preload = 'auto';
    }
    else{
        this.nextTrack = this.currentTrack;
    }
  }
}
