import {debug, Entity, Component, System, DeleteComponent, TransformComponent, Game} from './engine.js';
import {Vector, pointInPolygon} from './vector.js';
import {Quadtree} from './quadtree.js'



class CollisionComponent extends Component {
  constructor(message) {// id,path,vertices,remove
    super("collision");
    this.entityID = message.entityID;
    this.vertices = message.vertices;
    this.xmin = -Number.MAX_VALUE;
    this.xmax = Number.MAX_VALUE;
    this.ymin = -Number.MAX_VALUE;
    this.ymax = Number.MAX_VALUE
    this.transform = message.transform;
    this.lastTransform = new TransformComponent( this.transform.x, this.transform.y, this.transform.z, this.transform.rotation, this.transform.scale);
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

}


class CollisionSystem extends System{
    constructor() {
        super("collision")
        this.quadtree = new Quadtree({x: -500, y: -500, width: 2000, height: 2000}, 16);
        this.entities = new Map();
    }


    update(event) {
        const startTime = Date.now();
        //console.log('worker recieved message');
         //console.log(`worker recieved${JSON.stringify(event.data)}`)
        // update the entities from the message data
        // id,path,vertices,remove
        const messages = event.data;
        for(const message of messages){
            if(message.remove){
                //console.log(`removing ${message.entityID}`);
                this.entities.delete(message.entityID);
            }else{
                if(!this.entities.has(message.entityID)){
                    //console.log(`adding entity ${message.entityID}`)
                    this.entities.set(message.entityID,new CollisionComponent(message));
                }
                const entity = this.entities.get(message.entityID);
                const t = message.transform;

                entity.transform = new TransformComponent(t.x,t.y,t.z,t.rotation,t.scale);
                entity.vertices = message.vertices;
                // update collision polygons
                //console.log(`generating sweep for ${entity.entityID}`)
                entity.vertices = this.sweepPolygon(entity);
                //console.log(`sweep generated`)
            }
        }
        const sortedColliders = [...this.entities.values()].sort(this.sortyx);

        //console.log(`processing collisions`)
        // process collisions
        const activeCollisions = [];
        for(const collider of this.entities.values()){
            let ymin = Number.MAX_VALUE;
            for (const other of sortedColliders){
                ymin = other.ymin;
                if(other === collider || other.ymax < collider.ymin || other.ymin > collider.ymax){// || other.xmax < collider.xmin || other.xmin > collider.xmax ){
                    continue;
                }
                if(collider != other && this.collide(collider.vertices,other.vertices)){
                    activeCollisions.push({collider:collider.entityID, other:other.entityID});
                }
            }
            if(!collider.transform.equals(collider.lastTransform)){
                activeCollisions.push({collider:collider.entityID,polygon:collider.vertices});
            }
            collider.lastTransform = collider.transform;
            if(collider.ymax > ymin){
                continue;
            }
        }
        //console.log(`sending results`);
        const et = Date.now()- startTime;
        if(activeCollisions.length > 0){
            postMessage({status:"done",collisoins:activeCollisions,et:et});
            //console.log(`sent message:${JSON.stringify(activeCollisions)}`)

        }else{
            postMessage({status:"none",collision:[],et:et});
        }
    }
 sweepPolygon(collider){
        const start = collider.lastTransform;
        const end = collider.transform;
        const polygon = collider.vertices;
        let result = [];
        collider.xmin = Number.MAX_VALUE;
        collider.ymin = Number.MAX_VALUE;
        collider.xmax = -Number.MAX_VALUE;
        collider.ymax = -Number.MAX_VALUE;
        //console.log(`calculating min and max values and generating backup polygon`)
        for(const point of polygon){
            collider.xmin = Math.min(collider.xmin,point.x);
            collider.ymin = Math.min(collider.ymin,point.y);
            collider.xmax = Math.max(collider.xmax,point.x);
            collider.ymax = Math.max(collider.ymax,point.y);

            const p = new Vector(point)
            result.push(p.transform(end));
        }
        if(start.equals(end)){
            return result;
        }

        //console.log(`adding edges to map`)
        const edges = new ValueMap();
        for(let i = 0; i < polygon.length; i++){

            const p1 = new Vector(polygon[i]);
            const p2 = new Vector(polygon[(i+1)%polygon.length]);
            let p1s = p1.transform(start);
            let p1e = p1.transform(end);
            let p2s = p2.transform(start);
            let p2e = p2.transform(end);
            p1s = [Math.round(p1s.x),Math.round(p1s.y)];
            p1e = [Math.round(p1e.x),Math.round(p1e.y)];
            p2s = [Math.round(p2s.x),Math.round(p2s.y)];
            p2e = [Math.round(p2e.x),Math.round(p2e.y)];

            if(!edges.has(p1s)){
                edges.set(p1s,new ValueSet());
            }
            if(!edges.has(p2s)){
                edges.set(p2s,new ValueSet());

            }
            if(!edges.has(p1e)){
                edges.set(p1e,new ValueSet());

            }
            if(!edges.has(p2e)){
                edges.set(p2e,new ValueSet());

            }

            if(this.sortyxArray(p1s,p2s)<0){
                edges.get(p1s).add(p2s);
            }
            else{
                edges.get(p2s).add(p1s);
            }
            if(this.sortyxArray(p1e,p2e)<0){
                edges.get(p1e).add(p2e);
            }
            else{
                edges.get(p2e).add(p1e);
            }
            if(this.sortyxArray(p1s,p1e)<0){
                edges.get(p1s).add(p1e);
            }
            else{
                edges.get(p1e).add(p1s);
            }
        }
        //console.log(`finding intersections`)
        // find and add intersections
        for(let i = 0; i < edges.size-1; i++){
            // const points = [...edges.keys()].sort(this.sortyxArray);
            // console.log(`building chains from; ${points} using{`);
            // for (const point of points){
            //     console.log(`${JSON.stringify(point)}:${JSON.stringify([...edges.get(point).values()])}`);
            // }


            let e1a = [...edges.keys()][i];
            let e1bs = [...edges.get(e1a)];
            for(let ib = 0; ib < e1bs.length; ib++){
                const e1b = e1bs[ib];
                let found = false;
                for(let j = i+1; j < edges.size; j++)
                {
                    const e2a = [...edges.keys()][j];
                    const e2bs = [...edges.get(e2a)];
                    for(let jb = 0; jb < e2bs.length; jb++){
                        const e2b = e2bs[jb];
                        if(!((e1a[0] == e2b[0] && e1a[1] == e2b[1])|| (e2a[0] == e1b[0] && e2a[1] == e1b[1] ) || (e1b[0] == e2b[0] && e1b[1] == e2b[1])))
                        {
                             //console.log(`checking lines ${e1a}-${e1b} and ${e2a}-${e2b} for intersections`);
                            let intersection = this.findIntersection({a:{x:e1a[0],y:e1a[1]},b:{x:e1b[0],y:e1b[1]}},{a:{x:e2a[0],y:e2a[1]},b:{x:e2b[0],y:e2b[1]}});

                            if(intersection){

                                intersection = [Math.round(intersection.x),Math.round(intersection.y)];
                                //console.log(`lines ${e1a}-${e1b} and ${e2a}-${e2b} intersect at ${intersection}`);
                                if(!edges.has(intersection)){
                                    edges.set(intersection,new ValueSet());

                                }
                                // add e1a to intersection
                                // add e2a to intersection
                                // add intersection to e1b
                                // add intersection to e2b
                                // remove e1a to e1b
                                // remove e2a to e2b
                                //console.log(`removing edge ${e1a},${e1b}`)
                                edges.get(e2a).delete(e2b);
                                //console.log(`removing edge ${e2a},${e2b}`)
                                edges.get(e1a).delete(e1b);
                                if(!(e1a[0] == intersection[0] && e1a[1] == intersection[1])){
                                  //console.log(`adding edge ${e1a},${intersection}`)
                                  edges.get(e1a).add(intersection);
                                  }
                                if(!(e1b[0] == intersection[0] && e1b[1] == intersection[1])){
                                  //console.log(`adding edge ${intersection},${e1b}`)
                                  edges.get(intersection).add(e1b);
                                  }
                                if(!(e2a[0] == intersection[0] && e2a[1] == intersection[1])){
                                  //console.log(`adding edge ${e2a},${intersection}`)
                                  edges.get(e2a).add(intersection);
                                  }
                                if(!(e2b[0] == intersection[0] && e2b[1] == intersection[1])){
                                  //console.log(`adding edge ${intersection},${e2b}`)
                                  edges.get(intersection).add(e2b);
                                }

                                found = true;
                                break;
                            }
                        }
                    }
                    if(found){
                      break;
                    }
                }
                if(found){

                  i = -1;
                  break;
                }
            }

        }
        //console.log(`forging chains`)
        const points = [...edges.keys()].sort(this.sortyxArray);
        const events = [];
        for(const point of points){
          let found = [];
          for(const chain of events){
            if(!chain.has(point)){
                continue;
            }
            if(chain.add(point,edges.get(point))){
              found.push(chain);
            }
            else{
            }
          }
          if(found.length == 0 && edges.get(point).size > 1){
              events.push(new Chain(point, edges.get(point)));
          }else{
            for(let i = 0; i < found.length-1; i++){
              for(let j = found.length-1; j > i; j--){
                if(found[i].merge(found[j], point)){
                  events.splice(events.indexOf(found[j],1));
                  found = false;
                  if(edges.get(point).size > 1){
                    events.push(new Chain(point, edges.get(point)));
                  }
                  break;
                }
              }
            }
          }
        }
        const results = [...events.values()].sort((a,b)=>{return b.vertices.length - a.vertices.length;});
        //console.log(`looking for result`)
        const target = points[0];
        for(const chain of results){
            let found = false;
            for(const point of chain.vertices){
                if(point[0] == target[0] && point[1] == target[1]){
                    found = true
                    break;
                }
            }
           if(found && chain.vertices.length > 3){
                const r = chain.get();
                result = [];
                for(const point of r){
                    result.push({x:point[0],y:point[1]});
                }
                //console.log(`returning result`)
                return result;

            }
        }
        console.log(`invalid result. returning backup polygon`)
        return result;
    }

    sortyxArray(a,b){
        const difference = a[1]-b[1];
        return difference == 0?a[0]-b[0]:difference;
    }

    sortyx(a,b){
        const difference = a.y-b.y;
        return difference == 0?a.x-b.x:difference;
    }
    collide(collider, other){
        let self = collider;
        let points = other;
        if(self.length < 3){
            self = other;
            points = collider;
        }

        for(const point of points){
            if(pointInPolygon(point,self)){
                return true;
            }
        }
        for(let i = 0; i < self.length; i++){
            for(let j = 0; j< points.length; j++){
                if(this.findIntersection({a:self[i],b:self[(i+1)%self.length]},{a:points[j],b:points[(j+1)%points.length]})){
                    return true;
                }
            }
        }

        return false;
    }
    findIntersection(line1,line2){// lines are object{a:{x:,y:}b:{x:y:}}
        const x1 = line1.a.x, y1 = line1.a.y;
        const x2 = line1.b.x, y2 = line1.b.y;
        const x3 = line2.a.x, y3 = line2.a.y;
        const x4 = line2.b.x, y4 = line2.b.y;

        const dx1 = x2 - x1, dy1 = y2 - y1;
        const dx2 = x4 - x3, dy2 = y4 - y3;

        const denom = dx1 * dy2 - dy1 * dx2;
        if (denom === 0) {
            return null; // Lines are parallel or coincident
        }

        const t1 = (dx2 * (y1 - y3) - dy2 * (x1 - x3)) / denom;
        const t2 = (dx1 * (y1 - y3) - dy1 * (x1 - x3)) / denom;

        if (t1 < 0 || t1 > 1 || t2 < 0 || t2 > 1) {
            return null; // Lines don't intersect within their segments
        }

        return { x: x1 + t1 * dx1, y: y1 + t1 * dy1 };


    }
}

class ValueMap extends Map{
    constructor(){
        super();
    }
    has(test){
        for(const key of this.keys()){
            if(key[0] == test[0] && key[1] == test[1]) return true;

        }
        return false;
    }
    get(test){

        for(const key of this.keys()){
            if(key[0] == test[0] && key[1] == test[1]) return super.get(key);
        }
        return undefined;
    }
}

class ValueSet extends Set{
    constructor(){
        super();
    }
    has(test){
        for(const key of this.keys()){
            if(key[0] == test[0] && key[1] == test[1]) return true;

        }
        return false;
    }
    get(test){
        for(const key of this.keys()){
            if(key[0] == test[0] && key[1] == test[1]) return super.get(key);
        }
        return undefined;
    }
    delete(value){
        for(const key of this.keys()){
            if(key[0] == value[0] && key[1] == value[1]){
                super.delete(key);
                return;
            }
        }
    }
    add(test){
        for(const key of this.keys()){
            if(key[0] == test[0] && key[1] == test[1]) return false;
        }
        return super.add(test);
    }
}

class Chain{
    constructor(vertex,connections){
        this.vertices = [vertex];
        this.connections = new ValueMap();
        this.connections.set(vertex,connections);
    }

    add(vertex,connections){
        const left = this.connections.get(this.vertices[0]);
        const right = this.connections.get(this.vertices[this.vertices.length-1]);
        let outsideLeft = true;
        let outsideRight = true;



        if(left.has(vertex)){
            for(const point of left.values()){
            const xaty = this.xaty(this.vertices[0],vertex[1],point)
            //console.log(`xaty for ${point} is ${xaty}`)
                if(xaty < vertex[0]){
                    outsideLeft = false;
                    continue;
                }
            }
        }
        else{
            outsideLeft = false;
        }

        if(right.has(vertex)){
            for(const point of right.values()){
                if(this.xaty(this.vertices[this.vertices.length-1],vertex[1],point) > vertex[0]){
                    outsideRight = false;
                    continue;
                }
            }
        }
        else{
            outsideRight = false;
        }
        if(outsideLeft){
            this.vertices.unshift(vertex);
            this.connections.set(vertex,connections);
        }
        if(outsideRight){
            this.vertices.push(vertex);
            this.connections.set(vertex,connections);
        }

        return outsideLeft || outsideRight;

    }
    xaty(origin,y,point){
        const c = (y - origin[1]);
        const a = (point[1] - origin[1]);
        const b = (point[0]- origin[0]);
        const d = (c*b)/a;
        //console.log(`a:${a},b:${b},c:${c},d:${d}`)
        return origin[0] + d;
    }
    has(point){
        if(this.vertices.length < 1){
            return false;
        }
        const left = this.connections.get(this.vertices[0]);
        const right = this.connections.get(this.vertices[this.vertices.length-1]);
       // console.log(`point:${JSON.stringify(point)}, left:${JSON.stringify([...left.values()])}, right:${JSON.stringify([...right.values()])}`)
        return (left.has(point) || right.has(point));
    }
    get(){
        if(this.connections.get(this.vertices[0]).size > 0){
        }
        if(this.connections.get(this.vertices[this.vertices.length-1]).size > 0){
        }
        if(this.vertices[0] == this.vertices[this.vertices.length-1]){
            this.vertices.pop();
        }
        return this.vertices;
    }
    merge(chain, point){
        const thisLeft = this.vertices[0];
        const thisRight = this.vertices[this.vertices.length-1];
        const chainLeft = chain.vertices[0];
        const chainRight = chain.vertices[chain.vertices.length-1];

        if(thisLeft[0] == thisRight[0] && thisLeft[1] == thisRight[1]){
          return false;
        }

        if(chainLeft[0] == chainRight[0] && chainLeft[1] == chainRight[1]){
          return false;
        }


        if(thisLeft[0] == point[0] && thisLeft[1] == point[1]){
            if(chainRight[0] == point[0] && chainRight[1] == point[1]){
                for(chain.vertices.pop(); 0 < chain.vertices.length; this.vertices.unshift(chain.vertices.pop()));
                 this.connections.set(this.vertices[0],chain.connections.get(chainLeft));
                return true;
            }
            else if(chainLeft[0] == point[0] && chainLeft[1] == point[1]){

                if(this.connections.get(point).size > 0){
                  chain.vertices.shift();
                  return false;
                }
                for(chain.vertices.shift(); 0 < chain.vertices.length; this.vertices.unshift(chain.vertices.shift()));
                this.connections.set(this.vertices[0],chain.connections.get(chainRight));
                return true;
            }
        }else if(thisRight[0] == point[0] && thisRight[1] == point[1]){
            if(chainLeft[0] == point[0] && chainLeft[1] == point[1]){
                for(chain.vertices.shift(); 0 < chain.vertices.length; this.vertices.push(chain.vertices.shift()));
                this.connections.set(this.vertices[this.vertices.length-1],chain.connections.get(chainRight));
                return true;
            }
            else if(chainRight[0] == point[0] && chainRight[1] == point[1]){
                if(this.connections.get(point).size > 0){
                  chain.vertices.pop();
                  return false;
                }
                for(chain.vertices.pop(); 0 < chain.vertices.length; this.vertices.push(chain.vertices.pop()));
                this.connections.set(this.vertices[this.vertices.length-1],chain.connections.get(chainLeft));
                return true;
            }
        }
        return false;
    }
}

const collisionSystem = new CollisionSystem();

addEventListener('message', (event) => {
    collisionSystem.update(event);
});
