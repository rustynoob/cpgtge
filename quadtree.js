export class Quadtree {
  constructor(bounds, capacity) {
    this.bounds = bounds;
    this.capacity = capacity;
    this.points = [];
    this.divided = false;
  }

  subdivide() {
    const x = this.bounds.x;
    const y = this.bounds.y;
    const w = this.bounds.width / 2;
    const h = this.bounds.height / 2;
    this.northeast = new Quadtree({ x: x + w, y: y, width: w, height: h }, this.capacity);
    this.northwest = new Quadtree({ x, y, width: w, height: h }, this.capacity);
    this.southeast = new Quadtree({ x: x + w, y: y + h, width: w, height: h }, this.capacity);
    this.southwest = new Quadtree({ x, y: y + h, width: w, height: h }, this.capacity);
    this.divided = true;
  }

  insert(point) {
    if(point.x < this.bounds.x || point.x > this.bounds.x + this.bounds.width || point.y < this.bounds.y || point.y > this.bounds.y + this.bounds.height) {
      return false;
    }
    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }
    if (!this.divided) {
      this.subdivide();
    }
    if (this.northeast.insert(point) || this.northwest.insert(point) ||
        this.southeast.insert(point) || this.southwest.insert(point)) {
      return true;
    }
  }

  query(range, found) {
    if (!found) {
      found = [];
    }
    if (!range.intersects(this.bounds)) {
      return found;
    }
    for (const point of this.points) {
      if (range.contains(point)) {
      found.push(point);
      }
    }
    if (this.divided) {
      this.northwest.query(range, found);
      this.northeast.query(range, found);
      this.southwest.query(range, found);
      this.southeast.query(range, found);
    }
    return found;
  }

  clear() {
    this.points = [];
    this.divided = false;
    this.northeast = null;
    this.northwest = null;
    this.southeast = null;
    this.southwest = null;
  }
  retrieve(range) {
    let found = [];
    if (!this.intersects(range)) {
        return found;
    }
    for (const point of this.points) {
        if (this.contains(range, point)) {
            found.push(point);
        }
    }
    if (this.divided) {
        found = found.concat(this.northeast.retrieve(range));
        found = found.concat(this.northwest.retrieve(range));
        found = found.concat(this.southeast.retrieve(range));
        found = found.concat(this.southwest.retrieve(range));
    }
    return found;
  }
  intersects (range) {
    return !(range.x > this.bounds.x + this.bounds.width || range.x + range.width < this.bounds.x || range.y > this.bounds.y + this.bounds.height || range.y + range.height < this.bounds.y);
  }

  contains(range, point) {
  return point.x >= this.bounds.x && point.x <= this.bounds.x + this.bounds.width &&
    point.y >= this.bounds.y && point.y <= this.bounds.y + this.bounds.height;
}

}
