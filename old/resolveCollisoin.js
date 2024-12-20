function resolveCollision(entity1, entity2, collisionNormal) {
  // Calculate the projection of the velocity vectors of the two entities onto the collision normal
  const projection1 = entity1.physics.velocity.dotProduct(collisionNormal);
  const projection2 = entity2.physics.velocity.dotProduct(collisionNormal);

  // Calculate the distance to move back along the velocity vector of each entity
  const distance1 = projection1 / collisionNormal.length();
  const distance2 = projection2 / collisionNormal.length();

  // Move the entities back along their velocity vectors until they no longer collide
  let position1 = entity1.transform.position;
  let position2 = entity2.transform.position;
  while (collides(position1, entity1.collision.vertices, position2, entity2.collision.vertices)) {
    position1 = position1.subtract(entity1.physics.velocity.multiply(0.01));
    position2 = position2.subtract(entity2.physics.velocity.multiply(0.01));
  }
  entity1.transform.position = position1;
  entity2.transform.position = position2;



   // Calculate the amount of time that the object should move back along its velocity vector
  // to clear the collision. This is equal to the dot product of the velocity and normal vectors
  // divided by the length of the normal vector squared.
  const timeToClear = velocity.dotProduct(normal) / normal.lengthSquared();
  // Calculate the amount of time remaining after clearing the collision.
  const dtRemaining = dt - timeToClear;
  // Calculate the new position by moving back along the velocity vector and then applying
  // the remaining time to the velocity vector.
  const newPosition = position.subtract(velocity.multiply(timeToClear)).add(velocity.multiply(dtRemaining));


  return newPosition;
}
