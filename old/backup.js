 constructor() {
    this.requiredTags = new Set();
    this.blacklistedTags = new Set();
    this.currentTags = new Set();
    this.audioElement = null;
  }

    update(entities, dt) {
    if (this.audioElement !== null && this.audioElement.ended) {
      this.stopMusic();
    } else if (this.audioElement !== null && this.audioElement.duration - this.audioElement.currentTime < 2) { // Preload the next track 5 seconds before the current track finishes
      // Update the blacklist and required list
      this.requiredTags.clear();
      this.blacklistedTags.clear();
      for (const entity of entities) {
        if (entity.hasComponent("musiccontrol")) {
          const control = entity.getComponent("musiccontrol");
          if (control.type === "blacklisttags") {
            for (const tag of control.data) {
              this.blacklistedTags.add(tag);
            }
          } else if (control.type === "requiredtags") {
            for (const tag of control.data) {
              this.requiredTags.add(tag);
            }
          }
        }
      }

      // Find the next track to play
      let nextTrackFilePath = null;
      let hasControlComponent = false;
      for (const entity of entities) {
        if (entity.hasComponent("musiccontrol")) {
          hasControlComponent = true;
          const control = entity.getComponent("musiccontrol");
          if (control.type === "play") {
            nextTrackFilePath = control.data;
            break;
          } else if (control.type === "crossfade") {
            nextTrackFilePath = control.data;
            break;
          } else if (control.type === "playtrackswithtags") {
            // Find a track with matching tags
            for (const entity of entities) {
              const musicComponents = entity.getComponents("music");
              if(musicComponents){
               for (const music of musicComponets){
                let hasMatchingTag = false;
                for (const tag of music.tags) {
                  if (control.data.includes(tag)) {
                    hasMatchingTag = true;
                    break;
                  }
                }
                if (hasMatchingTag) {
                  nextTrackFilePath = music.filePath;
                  break;
                }
              }
             }
            }
            break;
          }
        }
      }
      audioElement = document.createElement("audio");
    audioElement.src = nextTrackPath;
    audioElement.setAttribute("type", "audio/mpeg");
    audioElement.setAttribute("autoplay", "true");
    audioElement.setAttribute("controls", "true");
    document.body.appendChild(audioElement);

      // If no explicit control component was found, pick a random track with matching tags
      if (!hasControlComponent) {
        const matchingEntities = [];
        for (const entity of entities) {
          const musicComponents = entity.getComponents("music");
          if(musicComponents){
          for (const music of musicComponets){
            for (const tag of music.tags) {
              if (this.currentTags.has(tag)) {
                hasMatchingTag = true;
                break;
              }
            }
            if (hasMatchingTag) {
              matchingEntities.push(entity);
            }
          }
          }
        }
        if (matchingEntities.length > 0) {
          const entity = matchingEntities[Math.floor(Math.random() * matchingEntities.length)];
          const music = entity.getComponent("music");
          nextTrackFilePath = music.filePath;
        }
      }

      // Preload the next track
      if (nextTrackFilePath !== null) {
        this.preloadTrack(nextTrackFilePath);
      }
    }

    // Update the current tags
    this.currentTags.clear();
    for (const entity of entities) {
      const musicComponents = entity.getComponents("music");
      if(musicComponents){
          for (const music of musicComponents){
        for (const tag of music.tags) {
          this.currentTags.add(tag);
        }
       }
      }
    }

  }


  playMusic(filePath) {
    this.stopMusic();
    this.audioElement = new Audio(filePath);
    this.audioElement.play();
  }

   pauseMusic() {
    if (this.audioElement !== null) {
      this.audioElement.pause();
    }
  }


    crossfadeMusic(filePath) {
    // Fade out the current music
    if (this.audioElement !== null) {
      // Use an audio gain node to control the volume
      // See https://developer.mozilla.org/en-US/docs/Web/API/GainNode
      const gainNode = this.audioContext.createGain();
      this.audioElement.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      const startTime = this.audioContext.currentTime;
      const fadeTime = 1; // Fade out over 1 second
      gainNode.gain.setValueAtTime(1, startTime);
      gainNode.gain.linearRampToValueAtTime(0, startTime + fadeTime);

      // Start the new track after the fade out is complete
      setTimeout(() => {
        this.audioElement.src = filePath;
        this.audioElement.play();
      }, fadeTime * 1000);
    } else {
      this.audioElement = new Audio(filePath);
      this.audioElement.play();
    }
  }

  playTracksWithTags(tags) {
    const matchingEntities = [];
    for (const entity of entities) {
      if (entity.hasComponent("music")) {
        const music = entity.getComponent("music");
        let hasMatchingTag = false;
        for (const tag of music.tags) {
          if (tags.includes(tag)) {
            hasMatchingTag = true;
            break;
          }
        }
        if (hasMatchingTag) {
          matchingEntities.push(entity);
        }
      }
    }

    // Pick a random track from the list of matching entities
    if (matchingEntities.length > 0) {
      const entity = matchingEntities[Math.floor(Math.random() * matchingEntities.length)];
      const music = entity.getComponent("music");
      this.playMusic(music.filePath);
    }
  }

  stopMusic() {
    if (this.audioElement !== null) {
      this.audioElement.pause();
      this.audioElement = null;
    }
  }
