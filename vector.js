export class Vector {
  constructor(tuple) {
    this.x = tuple.x;
    this.y = tuple.y;
  }

  equals(other){
    return this.x == other.x && this.y == other.y;
  }
  add(other) {
    return new Vector({x:this.x + other.x, y:this.y + other.y});
  }

  subtract(other) {
    return new Vector({x:this.x - other.x, y:this.y - other.y});
  }

  multiply(scalar) {
    return new Vector({x:this.x * scalar, y:this.y * scalar});
  }

  divide(scalar) {
    return new Vector({x:this.x / scalar, y:this.y / scalar});
  }

  normalize() {
    const length = this.length();
    return new Vector({x:this.x / length, y:this.y / length});
  }

  length() {
    if (this.x === Infinity || this.y === Infinity) {
      return Infinity;
    }
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
   dotProduct(vector) {
    return this.x * vector.x + this.y * vector.y;
  }

  crossProduct(vector) {
    return this.x * vector.y - this.y * vector.x;
  }

  angle(vector) {
    return Math.atan2(this.crossProduct(vector), this.dotProduct(vector));
  }

  rotate(angle) {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    this.x = this.x * cos - this.y * sin;
    this.y = this.x * sin + this.y * cos;
  }

  project(vector) {
    const scalar = this.dotProduct(vector) / vector.dotProduct(vector);
    return new Vector({x:vector.x * scalar, y:vector.y * scalar});
  }

  reflect(normal) {
    const projection = this.project(normal);
    return new Vector({x:this.x - 2 * projection.x, y:this.y - 2 * projection.y});
  }

  distanceTo(vector) {
    return Math.sqrt(Math.pow(vector.x - this.x, 2) + Math.pow(vector.y - this.y, 2));
  }
  transform(transform) {
    // Rotate the vector by the rotation values in the transform object
    let x = this.x * Math.cos(transform.rotation) - this.y * Math.sin(transform.rotation);
    let y = this.x * Math.sin(transform.rotation) + this.y * Math.cos(transform.rotation);
    // Scale the vector by the scale values in the transform object
    x *= transform.scale;
    y *= transform.scale;
    // Translate the vector by the position values in the transform object
    x += transform.x;
    y += transform.y;
    return new Vector({x, y});
  }
  cameraProjection(cameraTransform, entityTransform) {
    const cameraX = this.x - cameraTransform.x;
    const cameraY = this.y - cameraTransform.y;

    //const transformedX = cameraX * Math.cos(-cameraTransform.rotation) - cameraY * Math.sin(-cameraTransform.rotation);
    //const transformedY = cameraX * Math.sin(-cameraTransform.rotation) + cameraY * Math.cos(-cameraTransform.rotation);

    const entityX = cameraX + entityTransform.x;
    const entityY = cameraY + entityTransform.y;

    //const entityX = transformedX + entityTransform.x;
    //const entityY = transformedY + entityTransform.y;

    let entityTransformedX = entityX * Math.cos(-cameraTransform.rotation) - entityY * Math.sin(-cameraTransform.rotation);
    let entityTransformedY = entityX * Math.sin(-cameraTransform.rotation) + entityY * Math.cos(-cameraTransform.rotation);

    entityTransformedX /= cameraTransform.scale;
    entityTransformedY /= cameraTransform.scale;
    return new Vector({x: entityTransformedX, y: entityTransformedY});
  }

}
export function generatePolygon(sides, radius) {
  const angleIncrement = (2 * Math.PI) / sides;
  let currentAngle = 0;
  const vertices = [];
  for (let i = 0; i < sides; i++) {
    const x = Math.cos(currentAngle)*radius;
    const y = Math.sin(currentAngle)*radius;
    vertices.push({ x, y });
    currentAngle += angleIncrement;
  }
  return vertices;
}

export function pointInPolygon(point, polygon) {
  const x = point.x;
  const y = point.y;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = ((yi > y) !== (yj > y))
      && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}
