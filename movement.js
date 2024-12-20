import {moveCow} from './../cow.js';
import {Component, System,TransformComponent} from './engine.js';
import {Vector} from './vector.js';


export class NodeComponent extends Component{
  constructor(nodes = [],attachment = {x:0,y:0,z:0,rotation:0,scale:1},rigid = false, chainRender = false){
    super("node");
      this.nodes = nodes;
      this.parent = false;
      this.attachment = new TransformComponent(attachment.x,attachment.y,attachment.z||0,attachment.rotation||0,attachment.scale||1);
      this.attached = false;
      this.rigid = rigid;
      this.dirty = true;
      this.chainRender = chainRender;
  }

  /*node.attachNode(Parent, nodeNumber)
   * attaches the node to the parent's node nodeNumber
   * returns true if the node was attached
   * returns false if the nodeNumber is invalid
   *
   */
  attach(child,parent,nodeNumber){
    const parentNodes = parent.getComponent("node");
    if(nodeNumber < parentNodes.nodes.length && nodeNumber >= 0){
      const node = parentNodes.nodes[nodeNumber];
      if(node){
          parentNodes.detach(nodeNumber);
      }
      node.child = child;
      node.attachment = this.attachment;
      this.parent = parent;
      return true;
    }
    console.log(`cannot attach, invalid node number{${nodeNumber}}`);
    return false;

  }
  /*detach(nodeNumber)
   * detaches the node nodenumber
   * returns the node that was attached if there was one
   * returns true if the node is now free
   * returns false if the node is invalid
   */
  detach(nodeNumber){
    if(nodeNumber < this.nodes.length && nodeNumber >= 0){
      //get the node
      const node = this.nodes[nodeNumber];
      // if something is attached to the node remove it
      const child = node.child;
      if(child){
        const childNode = child.getComponent("node");
        childNode.parent = false;
        node.child = false;
      }
      return child;
    }
    console.log(`cannot detach, invalid node number{${nodeNumber}}`);
    return false;
  }
}
//{position{x,y},child:false,attachmentx:45,attachmenty:0}
export class NodeRenderComponent extends Component{
  constructor(renderComponent, baseNode){
    super("render");
    this.render = renderComponent;
    this.baseNode = baseNode;
    this.renderStack = [];
  }
  draw(ctx,transform,dt){
    if(!this.baseNode.chainRender){}
    // travers the node tree and add push each node into a stack
    if(this.baseNode.dirty){
      this.renderStack = [];
      this.buildRenderStack(this.baseNode,this.renderStack);
      this.baseNode.dirty = false;
    }
    // sort the stack by z,y,x
    const sortedEntities = [...this.renderStack].sort((a, b) => {
      const attachmentA = a.getComponent("node").attachment;
      const attachmentB = b.getComponent("node").attachment;
      if(attachmentA.z == attachmentB.z){
        if(attachmentA.y == attachmentB.y){
          return attachmentA.x - attachmentB.x
        }
        return attachmentA.y - attachmentB.y;
      }
      return attachmentA.z - attachmentB.z;
    });
    // draw the nodes to a context
    this.render.draw(ctx,transform,dt);
    for(const entity of this.renderStack){
        const trans = entity.getComponent("transform");
        entity.getComponent("render").render.draw(ctx,trans,dt);
    }

  }
  buildRenderStack(baseNode, stack){

    for(const node of baseNode.nodes){
      if(node.child){
        const childNode = node.child.getComponent("node");
        if(childNode.chainRender){
          stack.push(node.child);
          this.buildRenderStack(childNode,stack);
        }
      }
    }
  }

}


export class MovementSystem extends System{
  constructor() {
    super("movement")
    this.speed = 100; // pixels per second
    this.turnmode = "relitive"
  }

  update(entities, dt) {
    for (const entity of entities) {
      if (entity.hasComponent("input") && entity.hasComponent("transform")) {
        const input = entity.getComponent("input");
        const transform = entity.getComponent("transform");
        if(entity.hasComponent("slim")){
          let distance = this.speed * dt * 0.001;
          const effeciency = (0.5+entity.damage.value)/ entity.effeciency.value;
          let moved = false;
          if(input.events.has("up") && entity.fuel.value > entity.fuel.min && entity.damage.value < entity.damage.max){
            if(this.turnmode == "absolute"){
              let targetDirection = {x:0,y:0}
              if (input.events.get("up").value) {
                targetDirection.y-=1;
                moved = true;
              }
              if (input.events.get("down").value) {
                targetDirection.y += 1;
                moved = true;
              }
              if (input.events.get("left").value) {
                targetDirection.x -= 1;
                moved = true;
              }
              if (input.events.get("right").value) {
                targetDirection.x += 1;
                moved = true;
              }
              if(moved){
                entity.fuel.value-=distance*effeciency;
                let targetRadians = vectorToRadians(targetDirection);
                if(autoRotate(transform.rotation, targetRadians, 1.8)){
                  targetDirection.x *= -1;
                  targetDirection.y *= -1;
                  targetRadians = vectorToRadians(targetDirection);
                   distance = -distance;
                }
                transform.rotation = rotateTowards(transform.rotation,targetRadians,3,dt*0.001);
                transform.x += Math.cos(transform.rotation) * distance;
                transform.y += Math.sin(transform.rotation) * distance;
              }
            }else{
              let targetDirection = transform.rotation;
              let targetSpeed = 0;
              if (input.events.get("up").value) {
                targetSpeed = 1;
                moved = true;
              }
              if (input.events.get("down").value) {
                targetSpeed = -1;
                moved = true;
              }
              if (input.events.get("left").value) {
                targetDirection -= targetSpeed;
              }
              if (input.events.get("right").value) {
                targetDirection += targetSpeed;
              }
              if(moved){
                entity.fuel.value-=distance*effeciency;
                transform.rotation = rotateTowards(transform.rotation,targetDirection,3,dt*0.001);
                transform.x += Math.cos(transform.rotation) * distance * targetSpeed;
                transform.y += Math.sin(transform.rotation) * distance * targetSpeed;

              }
            }
          }
        }
      }
      if(entity.hasComponent("cow")){
        moveCow(entity, dt);
      }
      if(entity.hasComponent("node")){
        const nodes = entity.getComponent("node").nodes;
        const parentTransform = entity.getComponent("transform");
        for(const node of nodes){
         if(node.child){
            const childTransform = node.child.getComponent("transform");
            // node {nodex:,nodey:,child:,attachment{x:,y:}}
            // upcoming versin{node:{x,y,z,rotation,scale},child,attachment{x,y,z,rotation,scale}}
            // get the node location
            let nodePos = new Vector({x: node.position.x, y: node.position.y});
            nodePos = nodePos.transform(parentTransform);
            const childPosition = new Vector(childTransform);

            // find angle to parent node
             const angleToParent = childPosition.angle(nodePos);

            // find angle to attachment point
             const attachmentPoint = new Vector({x:node.attachment.x,y:node.attachment.y});
             const burnervariable = new Vector({x:0,y:0});
             const attachmentAngle = burnervariable.angle(attachmentPoint);

            // rotate the child so that the attachment point is in line with the node and the origin

            if(node.child.getComponent("node").rigid){
              childTransform.rotation = parentTransform.rotation+node.attachment.rotation;
            }else{
              const angle = Math.atan2(nodePos.y - childPosition.y, nodePos.x - childPosition.x);
              childTransform.rotation = angle;

            }


            // recalculate attachment point
            const attachmentPos = attachmentPoint.transform({x:0,y:0,z:0,rotation:childTransform.rotation,scale: childTransform.scale})

            // move the child so that the attachment point is on the node
            const position = nodePos.subtract(attachmentPos);
            childTransform.x = position.x;
            childTransform.y = position.y

          }
        }
      }
    }
  }
}
function autoRotate(currentDirection, targetDirection, reverseAngle){
  let rotation = targetDirection - currentDirection;
    while (rotation > Math.PI) rotation -= 2 * Math.PI;
    while (rotation <= -Math.PI) rotation += 2 * Math.PI;
    if (rotation > reverseAngle) {
        return true;
    }
    return false;
}
function rotateTowards(currentDirection, targetDirection, maxRotationRate, dt) {
    let rotation = targetDirection - currentDirection;
    while (rotation > Math.PI) rotation -= 2 * Math.PI;
    while (rotation <= -Math.PI) rotation += 2 * Math.PI;
    if (rotation > maxRotationRate * dt) {
        rotation = maxRotationRate * dt;
    } else if (rotation < -maxRotationRate * dt) {
        rotation = -maxRotationRate * dt;
    }
    return currentDirection + rotation;
}

function vectorToRadians(vector) {
  return Math.atan2(vector.y, vector.x);
}

