
class Level {
  constructor(components) {
    this.components = components;
  }
}

class LevelManager {
  constructor() {
    this.levels = [];
    this.currentLevel = null;
  }

  loadLevel(level) {
    // Unload the current level
    if (this.currentLevel) {
      this.unloadLevel(this.currentLevel);
    }
    // Add the components of the new level to the engine
    for (const component of level.components) {
      engine.addComponent(component);
    }
    this.currentLevel = level;
  }

  unloadLevel(level) {
    // Remove the components of the level from the engine
    for (const component of level.components) {
      engine.removeComponent(component);
    }
  }
}

const level1 = new Level([component1, component2, component3]);
const level2 = new Level([component4, component5, component6]);
const levelManager = new LevelManager();
levelManager.levels.push(level1, level2);

// To load level 1:
levelManager.loadLevel(level1);

// To load level 2:
levelManager.loadLevel(level2);
