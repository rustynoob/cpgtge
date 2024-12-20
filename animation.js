import {Component, System, TransformComponent} from './engine.js';

export class AnimationComponent extends Component {
  constructor(startTransform, endTransform, duration, tweeningFn = AnimationComponent.lerp) {
    super("animation");
    this.startTransform = startTransform;
    this.endTransform = endTransform;
    this.duration = duration;
    this.tweeningFn = tweeningFn;
    this.elapsedTime = 0;
  }
  static lerp(start, end, t) {
    return new TransformComponent(
      start.x + (end.x - start.x) * t,
      start.y + (end.y - start.y) * t,
      start.z + (end.z - start.z) * t,
      start.rotation + (end.rotation - start.rotation) * t,
      start.scale + (end.scale - start.scale) * t
    );
  }
}
export class AnimationSystem extends System{
  constructor(){
    super("animation")
    this.runPaused = true;

  }

  update(entities, dt) {
    if(dt > 0)
    {
      for (const entity of entities){
        if(entity.hasComponent("animation")){
          const animation = entity.getComponent("animation");
          animation.elapsedTime += dt;

          if (animation.elapsedTime >= animation.duration) {
          animation.elapsedTime = animation.duration;
          }

          const t = animation.elapsedTime / animation.duration;
          const tweenedTransform = animation.tweeningFn(animation.startTransform, animation.endTransform, t);

          const transformComponent = entity.getComponent("transform");
          transformComponent.x = tweenedTransform.x;
          transformComponent.y = tweenedTransform.y;
          transformComponent.z = tweenedTransform.z;
          transformComponent.rotation = tweenedTransform.rotation;
          transformComponent.scale = tweenedTransform.scale;

          if (animation.elapsedTime >= animation.duration) {
          entity.removeComponent(animation.name);
          }
        }
      }
    }
  }

}
//function lerp(start, end, t) {
//    return start + (end - start) * t;
//}
function coserp(start, end, t) {
    const t2 = (1 - Math.cos(t * Math.PI)) / 2;
    return start + (end - start) * t2;
}
function cuberp(start, end, t) {
    t = t * t * (3 - 2 * t);
    return start + (end - start) * t;
}
function smoothstep(start, end, t) {
    t = Math.max(0, Math.min(1, (t - start) / (end - start)));
    return t * t * (3 - 2 * t);
}
function hermite(start, end, t, tension = 0, bias = 0) {
    const t2 = t * t;
    const t3 = t2 * t;
    const m0 = (end - start) * (1 + bias) * (1 - tension) / 2;
    const m1 = (end - start) * (1 - bias) * (1 - tension) / 2;
    return (2 * t3 - 3 * t2 + 1) * start + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * end + (t3 - t2) * m1;
}

