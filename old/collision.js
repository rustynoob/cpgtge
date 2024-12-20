import {debug, Entity, Component, System, DeleteComponent, TransformComponent, Game} from './engine.js';
import {Vector, pointInPolygon} from './vector.js';
import {Quadtree} from './quadtree.js'


export class CollisionComponent extends Component {
  constructor(polygon) {
    super("collision");
    this.vertices = [];
    for(const vertex of polygon){
      this.vertices.push(new Vector(vertex))
    }
    this.width = this.getWidth();
    this.height = this.getHeight();
      // List of currently active collisions for this entity
    this.activeCollisions = [];
    this.collisionCallbacks = {};
    this.path = [];
    this.timestamp = 0;
    this.collisionType = (polygon.length > 1)?1:0;
    this.lastSweptPolygon = null;
  }

  registerCallback(componentId, callback) {
    this.collisionCallbacks[componentId] = callback;
  }

  handleCollision(entity, collision, normal) {
    this.activeCollisions.push({collision:collision,normal:normal});
    for(const key of Object.keys(this.collisionCallbacks)){
      if(collision.hasComponent(key)){
        const callback = this.collisionCallbacks[key];
        callback(entity, collision);
      }
    }
  }
  hasCallback(entity){
    for(const key of Object.keys(this.collisionCallbacks)){
      if(entity.hasComponent(key)){
        return true;
      }
    }
    return false;
  }

  getWidth() {
    // Find the minimum and maximum x values of the polygon's points
    let minX = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    for (const point of this.vertices) {
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
    }
    return maxX - minX;
  }

  getHeight() {
    // Find the minimum and maximum y values of the polygon's points
    let minY = Number.MAX_VALUE;
    let maxY = Number.MIN_VALUE;
    for (const point of this.vertices) {
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    }
    return maxY - minY;
  }
  collisionDetected() {
    return this.activeCollisions.length > 0;
  }
   draw(ctx, transform) {


    ctx.strokeStyle = "yellow";
    if(this.path.length > 0){
      ctx.beginPath();
      ctx.moveTo(this.path[0].x, this.path[0].y);
      for (let i = 1; i < this.path.length; i++) {
        ctx.lineTo(this.path[i].x, this.path[i].y);
      }
      ctx.stroke();

    }

    ctx.strokeStyle = "blue";
    if(this.lastSweptPolygon){

      //console.log(`polygon:${JSON.stringify(this.lastSweptPolygon)}`)
      ctx.beginPath();
      ctx.moveTo(this.lastSweptPolygon[0].x, this.lastSweptPolygon[0].y);
      for (let i = 1; i < this.lastSweptPolygon.length; i++) {
        ctx.lineTo(this.lastSweptPolygon[i].x, this.lastSweptPolygon[i].y);

      }

      ctx.closePath();
      ctx.stroke();

    }
    ctx.strokeStyle = "black";
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.rotate(transform.rotation);
    ctx.scale(transform.scale, transform.scale);

    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
        ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

export  class CollisionSystem extends System{
  constructor() {
    super("collision")
    this.quadtree = new Quadtree({x: -500, y: -500, width: 2000, height: 2000}, 16);
    this.next = false;


    // Create a new worker thread and pass it the name of a JavaScript file to execute
    this.worker = new Worker('./engine/collisionWorker.js');

    // Send a message to the worker thread
    this.worker.postMessage('Hello, worker!');

    // Listen for messages sent back from the worker thread
    this.worker.addEventListener('message', (event) => {
      console.log(`Received message from worker: ${event.data}`);
    });

  }

  update(entities, dt) {
    // Send a message to the worker thread
    const message = [];
    for(const entity of entities){
      if(entity.hasComponent("collision")){
        message.push([entity.uniqueID,entity.getComponent("collision").path]);
      }
    }
    this.worker.postMessage(message);


    const now = Date.now();
    // Get an array of entities with collision components
    const colliders = Array.from(entities.values()).filter(entity => entity.hasComponent('collision')).sort((a,b)=>{
      const aTime = a.getComponent("collision").timestamp;
      const bTime = b.getComponent("collision").timestamp;
      return aTime - bTime;
    });
    let activeCollisions = [];
    // Clear the quadtree
    this.quadtree.clear();
    for (const collider of colliders) {
      if(this.next && this.next !== collider){
        break;
      }
      const collision = collider.getComponent("collision");
      const transform = collider.getComponent("transform");
      // Clear the active collisions list for all entities
      collision.activeCollisions = [];

      // Insert all colliders into the quadtree
      const boundingBox = this.getBoundingBox(collision.vertices, transform);
      this.quadtree.insert({
        x: boundingBox.x,
        y: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height,
        entity: collider
      });
    }
    // Iterate over all colliders and check for collisions
    for (const collider of colliders) {
      const transform = collider.getComponent("transform");
      const collision = collider.getComponent("collision");
      let p1;

      if(Date.now() - now < 1000){
        let p1t;
//        console.log(`collider:${collider.name} - ${collision.collisionType}`)
        if(collision.collisionType == 0){
          p1t = this.transform(transform,collision.vertices);

        }else{
          if(collision.path.length == 0){
            collision.path.push(new TransformComponent(transform.x,transform.y,transform.z,transform.rotation,transform.scale));
          }else if(!transform.equals(collision.path[collision.path.length-1])){
            collision.path.push(new TransformComponent(transform.x,transform.y,transform.z,transform.rotation,transform.scale));
          }
          p1t = sweepPolygonAlongPath(collision.path,collision.vertices);

          collision.path = [];
          collision.lastSweptPolygon = p1t
          p1 = new Polygon(p1t);
        }
        collision.timestamp = now;

    //    console.log(`collisionType:${collision.collisionType}, p1t:${JSON.stringify(p1t)}`)
        const boundingBox = this.getBoundingBox(p1t);
        // Retrieve all colliders in the same cell or neighboring cells
        const potentialColliders = this.quadtree.retrieve({
          x: boundingBox.x,
          y: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height
        });

        // Check for collisions between the collider and all potential colliders
        for (const potentialCollider of potentialColliders) {
          if (collider === potentialCollider.entity) continue;

          const transform2 = potentialCollider.entity.getComponent("transform");
          const collision2 = potentialCollider.entity.getComponent("collision");
          let p2t = this.transform(transform2,collision2.vertices);

          // p1t is a ploygon
          let collisionType = collision.collisionType;
          // p2t is a polygon
          if(p2t.length > 1){
            collisionType += 2;
          }
          if(collider.name == 'player'){
  //          console.log(`${collider.name}-${JSON.stringify(p1t)},${potentialCollider.entity.name}-${JSON.stringify(p2t)}`);

          }

          //both are points
          if(collisionType === 0){
            if(p1t[0].x == p2t[0].x && p1t[0].y == p2t[0].y){
              activeCollisions.push([collider,potentialCollider.entity, new Vector({x:0,y:0})]);
            }
          }
          // p1t is a polygon and p2t is a point
          if(collisionType === 1){
            if(pointInPolygon(p2t[0],p1t)){
              activeCollisions.push([collider,potentialCollider.entity, new Vector({x:0,y:0})]);
            }
          }
          // p2t is a polygon and p1t is a point
          if(collisionType === 2){
            if(pointInPolygon(p1t[0],p2t)){
              activeCollisions.push([collider,potentialCollider.entity, new Vector({x:0,y:0})]);
            }
          }
          // collision is polygon on polygon
          if(collisionType >= 3){
            // we don't need any polygon on polygon collisions'

            const p2 = new Polygon(p2t);
            //console.log(`p1:${JSON.stringify(p1)}, p2:${JSON.stringify(p2)}`)
            if(p1.testWith(p2)){
              const normal = this.getCollisionNormal( p1,p2);
              activeCollisions.push([collider,potentialCollider.entity, normal]);
            }
          }
        }
      }
      if(collision.vertices.length > 1){
        if(collision.path.length == 0){
          collision.path.push(new TransformComponent(transform.x,transform.y,transform.z,transform.rotation, transform.scale));
        }else{
          const last = collision.path[collision.path.length-1];
          if( transform.x == last.x &&
            transform.y == last.y &&
            transform.z == last.z &&
            transform.rotation == last.rotation &&
            transform.scale == last.scale
          ){
            // don't do anything
          }else{
            if(collision.path.length >= 2 &&
              collision.path[collision.path.length-2].rotation == transform.rotation &&
              last.rotation == transform.rotation){
              last.x = transform.x;
              last.y = transform.y;
            }else{
              collision.path.push(new TransformComponent(transform.x,transform.y,transform.z,transform.rotation, transform.scale));
            }

          }

        }

      }
    }
    for(const collision of activeCollisions){
      if(collision[0].hasComponent("collision")){
        collision[0].getComponent('collision').handleCollision(collision[0],collision[1],collision[2]);
      }
      //this.handleCollision(collision[0],collision[1],collision[2]);
    }
  }

  getBoundingBox(vertices) {
   // console.log(`vertices: ${JSON.stringify(vertices)}`);
    let xMin = Number.MAX_VALUE;
    let yMin = Number.MAX_VALUE;
    let xMax = Number.MIN_VALUE;
    let yMax = Number.MIN_VALUE;
    for (const vertex of vertices) {
      xMin = Math.min(xMin, vertex.x);
      yMin = Math.min(yMin, vertex.y);
      xMax = Math.max(xMax, vertex.x);
      yMax = Math.max(yMax, vertex.y);
    }
    return { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
  }

  getCollisionNormal(polygon1, polygon2) {
  // Find the axis with the smallest overlap
  let overlap = Infinity;
  let normal = new Vector({ x: 0, y: 0 });
  // Test polygon1's sides
  for (const vertex of polygon1.vertices) {
    if(vertex !== polygon1.vertices[0]){
      const axis = new Vector({ x: vertex.y - polygon1.vertices[0].y, y: -(vertex.x - polygon1.vertices[0].x) });
      const projection1 = this.getMinMaxProjection(polygon1.vertices,axis);
      const projection2 = this.getMinMaxProjection(polygon2.vertices,axis);
      // Check if the projections overlap
      if (projection1.max < projection2.min || projection2.max < projection1.min) {
        // There is no overlap on this axis, so there is no collision
        return null;
      }
      // Calculate the overlap on this axis
      const o = Math.min(projection1.max, projection2.max) - Math.max(projection1.min, projection2.min);
      // Check if the overlap is less than the current minimum overlap
      if (o < overlap) {
        overlap = o;
        normal = axis;
      }
    }
  }
  // Test polygon2's sides
  for (const vertex of polygon2.vertices) {
    if(vertex !== polygon2.vertices[0]){
      const axis = new Vector({ x: vertex.y - polygon2.vertices[0].y, y: -(vertex.x - polygon2.vertices[0].x) });
      const projection1 = this.getMinMaxProjection(polygon1.vertices,axis);
      const projection2 = this.getMinMaxProjection(polygon2.vertices,axis);
      // Check if the projections overlap
      if (projection1.max < projection2.min || projection2.max < projection1.min) {
        // There is no overlap on this axis, so there is no collision
        return null;
      }
      // Calculate the overlap on this axis
      const o = Math.min(projection1.max, projection2.max) - Math.max(projection1.min, projection2.min);
      // Check if the overlap is less than the current minimum overlap
      if (o < overlap) {
        overlap = o;
        normal = axis;
      }
    }
  }
  // Normalize the normal
  const n = normal.length();
  if(n!=0){
    normal.x /= n;
    normal.y /= n;
  }
  return normal;
  }

  checkCollision(polygon1, polygon2) {
    // Check for collision using the Separating Axis Theorem
    // Get the list of normals for each polygon
    const normals1 = this.getNormals(polygon1);
    const normals2 = this.getNormals(polygon2);

    // Check for a collision along each normal
    for (const normal of normals1) {
      if (!this.overlapOnAxis(polygon1, polygon2, normal)) {
        return false;
      }
    }
    for (const normal of normals2) {
      if (!this.overlapOnAxis(polygon1, polygon2, normal)) {
        return false;
      }
    }

    // If all normals have been checked and there was no separation,
    // the polygons must be colliding
    return true;
  }

  getNormals(polygon) {
    const normals = [];
    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % polygon.length];
      const normal = {
        x: p2.y - p1.y,
        y: p1.x - p2.x,
      };
      normals.push(normal);
    }
    return normals;
  }
  overlapOnAxis(polygon1, polygon2, axis) {
    // Find the minimum and maximum points of projection for each polygon
    const minMax1 = this.getMinMaxProjection(polygon1,axis);
    const minMax2 = this.getMinMaxProjection(polygon2,axis);

    // Check if there is overlap between the projections
   if (minMax1.max >= minMax2.min && minMax2.max >= minMax1.min) {
      return true;
    }
    return false;
  }


  handleCollision(collider, collidee,normal) {
    // Add the collision to the activeCollisions list of both collider and collidee
    if(collidee.hasComponent("collision")){
      collidee.getComponent('collision').handleCollision(collidee,collider, {x:-normal.x,y:-normal.y});
    }
    if(collider.hasComponent("collision")){
      collider.getComponent('collision').handleCollision(collider,collidee, normal);
    }
  }


  getMinMaxProjection(vertices, axis) {
  let min = new Vector(vertices[0]).dotProduct(axis);
  let max = min;
  for (let i = 1; i < vertices.length; i++) {
    const projection = new Vector(vertices[i]).dotProduct(axis);
      if (projection < min) {
        min = projection;
      } else if (projection > max) {
        max = projection;
      }
    }
    return { min, max };
  }
  transform(transform,vertices) {
    const transformedVertices = [];
    for (const vertex of vertices) {
      const x = vertex.x * Math.cos(transform.rotation) - vertex.y * Math.sin(transform.rotation) + transform.x;
      const y = vertex.x * Math.sin(transform.rotation) + vertex.y * Math.cos(transform.rotation) + transform.y;
      transformedVertices.push(new Vector({x:x, y:y}));
    }
    return transformedVertices;
  }
}


class Polygon{
  constructor(vertices) {
    const polygon = {};
    this.vertices = vertices;
    this.edges = this.buildEdges(vertices);
  }
  buildEdges(vertices) {
      const edges = [];
      if (vertices.length < 3) {
          console.error(`Only polygons supported. :${JSON.stringify(vertices)}`);
          return edges;
      }
      for (let i = 0; i < vertices.length; i++) {
          const a = vertices[i];
          let b = vertices[0];
          if (i + 1 < vertices.length) {
              b = vertices[i + 1];
          }
          edges.push({
              x: (b.x - a.x),
              y: (b.y - a.y),
          });
      }
      return edges;
  }
  intervalDistance(minA, maxA, minB, maxB) {
    if (minA < minB) {
        return (minB - maxA);
    }
    return (minA - maxB);
  }

  projectInAxis(x, y) {
      let min = Math.MAX_VALUE;
      let max = -Math.MAX_VALUE;
      for (let i = 0; i < this.vertices.length; i++) {
          let px = this.vertices[i].x;
          let py = this.vertices[i].y;
          var projection = (px * x + py * y) / (Math.sqrt(x * x + y * y));
          if (projection > max) {
              max = projection;
          }
          if (projection < min) {
              min = projection;
          }
      }
      return { min, max };
  }
  testWith(otherPolygon) {
    // get all edges
    const edges = [];
    for (let i = 0; i < this.edges.length; i++) {
        edges.push(this.edges[i]);
    }
    for (let i = 0; i < otherPolygon.edges.length; i++) {
        edges.push(otherPolygon.edges[i]);
    }
    // build all axis and project
    for (let i = 0; i < edges.length; i++) {
        // get axis
        const length = Math.sqrt(edges[i].y * edges[i].y + edges[i].x * edges[i].x);
        const axis = {
            x: -edges[i].y / length,
            y: edges[i].x / length,
        };
        // project polygon under axis
        const { min: minA, max: maxA } = this.projectInAxis(axis.x, axis.y);
        const { min: minB, max: maxB } = otherPolygon.projectInAxis(axis.x, axis.y);
        if (this.intervalDistance(minA, maxA, minB, maxB) > 0) {
            return false;
        }
    }
    return true;
  }
}

function sweepPolygonAlongPath(path, polygon){

  // if there is no path return the polygon
  if(!path || path.length == 0){
    console.warn("No valid path. original polygon returned");
    return polygon;
  }
  const merged = [];
  for(let i = 0; i < polygon.length; i++){
    merged.push(polygon[i].transform(path[0]))
  }
  let lastPolygon = merged.slice();
  // for each point on the path
  for(let i = 1; i < path.length; i++){
    // check each line in the polyogn to see if it crosses a line in the other polygon
    const nextPolygon = []
    for(let j = 0; j < polygon.length; j++){
      nextPolygon.push(polygon[j].transform(path[i]))
    }
    const intersections = [];
    for(let j = 0; j < nextPolygon.length; j++){
      for(let k = 0; k < merged.length; k++){
        const intersection = getIntersection(nextPolygon[j],nextPolygon[(j+1)%nextPolygon.length],merged[k],merged[(k+1)%merged.length]);
        if(intersection){
          intersections.push({point:intersection,nextPolygon:j, merged:k});
        }
      }
    }
    lastPolygon = nextPolygon;

  }




 // console.log(`merged:${JSON.stringify(merged)}`)
  return merged;
}

// Returns 1 if the lines intersect, otherwise 0. In addition, if the lines
// intersect the intersection point may be stored in the floats i_x and i_y.
function getIntersection(line1start, line1end, line2start, line2end) {
  let x1 = line1start.x, y1 = line1start.y;
  let x2 = line1end.x, y2 = line1end.y;
  let x3 = line2start.x, y3 = line2start.y;
  let x4 = line2end.x, y4 = line2end.y;

  let ua_num = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
  let ub_num = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);
  let den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  if (den == 0) {
    return false; // parallel or coincident lines
  }

  let ua = ua_num / den;
  let ub = ub_num / den;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    // intersection within line segments
    let x = x1 + ua * (x2 - x1);
    let y = y1 + ua * (y2 - y1);
    return [x, y];
  } else {
    return false; // intersection outside line segments
  }
}
