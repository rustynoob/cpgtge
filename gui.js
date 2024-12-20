import {Vector, pointInPolygon} from './vector.js';
import {Component, debug, TransformComponent} from './engine.js';

/*
 * gui reference
 *
 * import {Deccorator, Widget, Pannel} from "./engine/gui.js";
 *
 * Deccorator(x,y,renderComponent,content)
 *   draw(ctx, transform, dt)
 *
 * Widget(x,y,polygon, callback, deccorators = [], background = "grey", borderColor = "black", borderWidth = 2, visible = true)
 *   addDeccorator(decorator)
 *   mouse(point, event)
 *   draw(ctx, transform, dt)
 * Panel(x=0, y=0, polygon=[], content=[], visible=true)
 *   addContent(content)
 *   draw(ctx, transform, dt)
 *   mouse(point,event)
 *
 */

export class Deccorator{
    constructor(x,y,renderComponent){
      this.position = new Vector({x:x,y:y})
      this.deccoration = renderComponent;
      this.visible = true;
    }
    draw(ctx, transform, dt){
        if(this.visible){
            const position = transform.add(this.position);
            this.deccoration.draw(ctx,position, dt);
        }
    }
}

export class Widget{
    constructor(x,y,polygon, callback, deccorators = [], background = "grey", borderColor = "black", borderWidth = 2, visible = true){
        this.position = new Vector({x:x,y:y});
        this.polygon = polygon;
        this.callback = callback;
        this.content = deccorators;
        this.background = background;
        this.defaultBorder = borderColor;
        this.mouseoverBorder = "white";
        this.clickBorder = "yellow";
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
        this.visible = visible;
        this.width = 0;
        this.height = 0;
        this.getWidth();
        this.getHeight();
        //this.viewportCanvas = new OffscreenCanvas(width, height);
        //this.viewportCtx = this.viewportCanvas.getContext('2d');
    }
    getWidth(){
        let xMin = Number.MAX_VALUE;
        let xMax = -Number.MAX_VALUE;
        for (const vertex of this.polygon) {
            xMin = Math.min(xMin, vertex.x);
            xMax = Math.max(xMax, vertex.x);
        }
        this.width = xMax-xMin;
        return this.width;
    }
    getHeight(){
        let yMin = Number.MAX_VALUE;
        let yMax = -Number.MAX_VALUE;
        for (const vertex of this.polygon) {
        yMin = Math.min(yMin, vertex.y);
        yMax = Math.max(yMax, vertex.y);
        }
        this.height = yMax-yMin;
        return this.height;
    }
    addDeccorator(decorator){
        this.content.push(deccorator);
    }
    mouse(point, event){
        const vector = new Vector(point);
        const p = vector.subtract(this.position);
        if(pointInPolygon(p, this.polygon)){
            this.borderColor = this.mouseoverBorder;
            if(event.state === "move"){
                if(event.binding === this && this.moveCallback){
                    this.moveCallback(p, event);
                    return true;
                }
            }
            if(event.state === "down"){
                this.borderColor = this.clickBorder;
                event.binding = this;

                if(this.downCallback){
                    this.downCallback(p, event);
                }
                 event.state = "move"
                return true;
            }
            if(event.state === "up"){
                this.callback(p, event);
                event.binding = false;
                event.state = "move";
                return true;
            }

        }
        else{
            this.borderColor = this.defaultBorder;
        }
        return false;
    }
    draw(ctx, rootTransform, dt){
        if (!this.visible){
            return;
        }
        const transform = rootTransform.add(this.position);
        //draw the polygon
        ctx.save();
        ctx.translate(transform.x, transform.y);
        //ctx.rotate(transform.rotation);
        //ctx.scale(transform.scale, transform.scale);

        ctx.beginPath();
        ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
        for (let i = 1; i < this.polygon.length; i++) {
            ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = this.background;
        ctx.fill();
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.borderWidth;
        ctx.stroke();
        ctx.restore();

        for(const deccorator of this.content){
            deccorator.draw(ctx, transform, dt);
        }
        this.borderColor = this.defaultBorder;

    }
}

export class FitWidget extends Widget {
    constructor(x, y, callback, deccorators = [], background = "grey", borderColor = "black", borderWidth = 2, visible = true, margin = 8) {
        super(x, y, [{x:0,y:0},{x:10,y:10},{x:0,y:10}], callback, deccorators, background, borderColor, borderWidth, visible);
        this.margin = margin;
        this.updateSize();
    }

    updateSize() {
        let xMin = Number.MAX_VALUE;
        let xMax = -Number.MAX_VALUE
        let yMin = Number.MAX_VALUE;
        let yMax = -Number.MAX_VALUE;
//TODO: this does not take into accout if the deccoration position is not set to 0,0
        for (const deccorator of this.content) {
            switch(deccorator.deccoration.align){

                case "left":
                    xMin = Math.min(xMin, deccorator.position.x - deccorator.deccoration.x);
                    xMax = Math.max(xMax, deccorator.position.x - deccorator.deccoration.x + deccorator.deccoration.width);
                    yMin = Math.min(yMin, deccorator.position.y - deccorator.deccoration.y - deccorator.deccoration.size);
                    yMax = Math.max(yMax, deccorator.position.y + deccorator.deccoration.height - deccorator.deccoration.y - deccorator.deccoration.size);
                    break;
                case "right":
                    xMin = Math.min(xMin, deccorator.position.x - deccorator.deccoration.x - deccorator.deccoration.width);
                    xMax = Math.max(xMax, deccorator.position.x - deccorator.deccoration.x);
                    yMin = Math.min(yMin, deccorator.position.y - deccorator.deccoration.y - deccorator.deccoration.size);
                    yMax = Math.max(yMax, deccorator.position.y + deccorator.deccoration.height - deccorator.deccoration.y - deccorator.deccoration.size);
                    break;
                case "center":
                    xMin = Math.min(xMin, deccorator.position.x - deccorator.deccoration.x - deccorator.deccoration.width / 2);
                    xMax = Math.max(xMax, deccorator.position.x - deccorator.deccoration.x + deccorator.deccoration.width / 2);
                    yMin = Math.min(yMin, deccorator.position.y - deccorator.deccoration.y - deccorator.deccoration.size);
                    yMax = Math.max(yMax, deccorator.position.y + deccorator.deccoration.height - deccorator.deccoration.y - deccorator.deccoration.size);
                    break;
                default:
                    xMin = Math.min(xMin, deccorator.position.x - deccorator.deccoration.x);
                    xMax = Math.max(xMax, deccorator.position.x - deccorator.deccoration.x + deccorator.deccoration.width);
                    yMin = Math.min(yMin, deccorator.position.y - deccorator.deccoration.y);
                    yMax = Math.max(yMax, deccorator.position.y + deccorator.deccoration.height - deccorator.deccoration.y);
                    break;
            }

        }

        this.width = xMax - xMin + this.margin * 2;
        this.height = yMax - yMin + this.margin * 1.5;

        this.polygon = this.buildPolygon(xMin,yMin,xMax,yMax);
        //this.position = new Vector({ x: xMin - this.margin + this.width / 2, y: yMin - this.margin + this.height / 2 });
    }

    buildPolygon(x1,y1,x2,y2) {
/*
    {x:-0,y:10},
    {x:-4,y:8},
    {x:-8,y:4},
    {x:-10,y:0},
*/
        const polygon = [];
        const radius = this.margin;
        // top
        polygon.push(new Vector({ x: x1, y: y1 - radius }));
        polygon.push(new Vector({ x: x2, y: y1 - radius }));
        //top right corner
        polygon.push(new Vector({ x: x2+(radius*0.4), y: y1 - (radius) +(radius*0.2)}));
        polygon.push(new Vector({ x: x2 +(radius*0.8), y: y1-(radius*0.4)  }));
        // right
        polygon.push(new Vector({ x: x2 + radius, y: y1 }));
        polygon.push(new Vector({ x: x2 + radius, y: y2 }));
        //botom right corner
        polygon.push(new Vector({ x: x2 + radius-(radius*0.2), y: y2+(radius*0.4) }));
        polygon.push(new Vector({ x: x2+(radius*0.4), y: y2 + radius -(radius*0.2)}));
        // bottom
        polygon.push(new Vector({ x: x2, y: y2 + radius }));
        polygon.push(new Vector({ x: x1, y: y2 + radius }));
        //bottom left corner
        polygon.push(new Vector({ x: x1-(radius*0.4), y: y2 + radius -(radius*0.2)}));
        polygon.push(new Vector({ x: x1 - radius+(radius*0.2), y: y2 +(radius*0.4)}));
        //left
        polygon.push(new Vector({ x: x1 - radius, y: y2 }));
        polygon.push(new Vector({ x: x1 - radius, y: y1 }));
        //top left corner
        polygon.push(new Vector({ x: x1+(radius*0.2) - radius, y: y1  -(radius*0.4) }));
        polygon.push(new Vector({ x: x1-(radius*0.4), y: y1 - (radius) +(radius*0.2)}));

        return polygon;
    }

    addDeccorator(deccorator) {
        this.content.push(deccorator);
        this.updateSize();
    }
    draw(ctx, rootTransform, dt){
        this.updateSize();
        super.draw(ctx, rootTransform, dt)
    }
}

function transform(transform,vertices) {
    const transformedVertices = [];
    for (const vertex of vertices) {
      const x = vertex.x * Math.cos(transform.rotation) - vertex.y * Math.sin(transform.rotation) + transform.x;
      const y = vertex.x * Math.sin(transform.rotation) + vertex.y * Math.cos(transform.rotation) + transform.y;
      transformedVertices.push(new Vector({x:x, y:y}));
    }
    return transformedVertices;
  }

export class ScrollingPanel{
  constructor(x, y, width, height, content = []) {
        this.position ={x:x,y:y};
        this.width = width;
        this.height = height;
        this.content = content;
        this.scroll = new Vector({x:0, y:0});
        this.polygon = [{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}];

        this.viewportCanvas = new OffscreenCanvas(width, height);
        this.viewportCtx = this.viewportCanvas.getContext('2d');
  }
  setScroll(x, y) {
    // Update the scroll position, making sure it stays within the bounds
    this.scroll.x = Math.max(0, Math.min(x, this.content[this.content.length-1].width - this.width));
    this.scroll.y = Math.max(0, Math.min(y, this.content[this.content.length-1].height - this.height));
  }

  Scroll(dx, dy) {
    // Update the scroll position, making sure it stays within the bounds
    this.scroll.x = Math.max(0, Math.min(this.scroll.x + dx, this.content[this.content.length-1].width - this.width));
    this.scroll.y = Math.max(0, Math.min(this.scroll.y + dy, this.content[this.content.length-1].height - this.height));
  }
    update(transform,dt) {
        this.scroll.x = Math.max(0, Math.min(this.scroll.x, this.content[this.content.length-1].width - this.width));
        this.scroll.y = Math.max(0, Math.min(this.scroll.y, this.content[this.content.length-1].height - this.height));
        // clear the viewport canvas
        this.viewportCtx.clearRect(0, 0, this.width, this.height);

        // draw the content, offset by the scroll position
        this.viewportCtx.save();
        this.viewportCtx.translate(-this.scroll.x, -this.scroll.y);
        this.content.forEach(widget => {
       //      draw(ctx, rootTransform, dt){
            widget.draw(this.viewportCtx,transform,dt);
        });
        this.viewportCtx.restore();
    }

    draw(ctx,transform,dt) {
        this.update(transform,dt);
        // draw the viewport canvas onto the main canvas
        ctx.drawImage(this.viewportCanvas, this.position.x, this.position.y);
    }

    mouse(point, event){

        if (event.binding == this){
            this.bindScroll(point, event);
            return true;
        }
        else{
            const relativePoint = point.subtract(this.position);
            if(pointInPolygon(relativePoint, this.polygon)){
                const p = this.scroll.add(point);
                p.x -= this.position.x;
                p.y -= this.position.y;
                for(let i = this.content.length-1; i >= 0; i--){
                    const content = this.content[i];
                    if(content.mouse){
                        if(content.mouse(p,event)){
                            return true;
                        }
                    }
                }
                this.bindScroll(point, event);
                return true;
            }


        }

        return false;
    }
    bindScroll(point, event){
        if(event.state == "move" && event.binding == this){
            let s = this.lastPoint.subtract(event);
            this.Scroll(s.x,s.y);

        }
        if(event.state === "down"){
            event.binding = this;
            event.state = "move"
        }
        if(event.state === "up"){
            event.binding = false;
            event.state = "move";

        }
        this.lastPoint = new Vector(event);
        return true;
    }


}

export class ScrollBarWidget {
  constructor(x, y, width, height, minValue, maxValue, value, onChange) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.value = value;
    this.onChange = onChange;
  }

  draw(ctx) {
    const thumbHeight = (this.height / (this.maxValue - this.minValue)) * (this.value - this.minValue);
    const thumbY = this.y + (this.height - thumbHeight);

    // Draw the scroll bar track
    ctx.fillStyle = "gray";
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Draw the scroll bar thumb
    ctx.fillStyle = "black";
    ctx.fillRect(this.x, thumbY, this.width, thumbHeight);
  }
  mouse(point, event){
        if(event.state == "down"){
            this.mouseDown(point);
        }
        if(event.state == "move"){
            this.mouseMove(point);
        }
        if(event.state == "up"){
            this.mouseUp();
        }
  }
  mouseDown(point) {
    this.dragging = true;
    this.dragOffset = point.y - (this.y + (this.height - (this.value / (this.maxValue - this.minValue)) * this.height));
  }

  mouseMove(point) {
    if (this.dragging) {
      const newValue = ((point.y - this.dragOffset) / this.height) * (this.maxValue - this.minValue);
      this.value = Math.max(this.minValue, Math.min(this.maxValue, newValue));
      this.onChange(this.value);
    }
  }

  mouseUp() {
    this.dragging = false;
  }
}

export class WidgetList {
    constructor(x, y, width, height, spacing, widgets) {
        this.position = new Vector({x:x,y:y});
        this.width = width;
        this.height = height;
        this.spacing = spacing;
        this.widgets = widgets;
        this.polygon = [{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}];
    }

    draw(ctx, transform, dt) {
        const t = transform.add(this.position);
        for (const widget of this.widgets) {
            if (widget.visible) {
                widget.draw(ctx, t, dt);
                t.y += widget.height + this.spacing;
            }
        }
    }

    mouse(point, event){
        const t = point.subtract(this.position);
        if(pointInPolygon(point, this.polygon)){
            this.borderColor = "yellow";
            for (const widget of this.widgets) {
                if (widget.visible) {
                    if(widget.mouse(t,event)){
                        return true;
                    }
                    t.y -= widget.height + this.spacing;
                }
            }
        }
        else{this.borderColor = "black";}
        return false;
    }
}

export class FitWidgetList {
    constructor(x, y, spacing, widgets) {
        this.position = new Vector({x:x,y:y});
        this.spacing = spacing;
        this.widgets = widgets;
        this.polygon = [];
        this.width= 0;
        this.height = 0;
        this.refresh();
    }
    addWidget(widget){
        if(widget){
            this.widgets.push(widget);
        }
        else{
            console.log("no widget passed to fitWidgetList")
        }
    }
    refresh(){
        let xMax = -Number.MAX_VALUE;
        let xMin = Number.MAX_VALUE;
        let y = this.spacing;
        for(const widget of this.widgets){
            let minY = Number.MAX_VALUE;
            for(const point of widget.polygon){
                minY = Math.min(minY,point.y);
                xMax = Math.max(xMax,point.x+widget.position.x);
                xMin = Math.min(xMin,point.x+widget.position.x);
            }
            widget.position.y = y - minY;
            y = y + widget.height + this.spacing;
        }
        this.polygon = [{x:xMin-this.spacing,y:0},{x:xMax+this.spacing,y:0},{x:xMax+this.spacing,y:y},{x:xMin-this.spacing,y:y}]
        this.height = y;
        this.width = xMax-xMin;
    }

    draw(ctx, transform, dt) {
        this.refresh();
        const t = transform.subtract(this.position);
        if(false){
        //draw the polygon
            ctx.save();
            ctx.translate(t.x, t.y);
            //ctx.rotate(transform.rotation);
            //ctx.scale(transform.scale, transform.scale);

            ctx.beginPath();
            ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
            for (let i = 1; i < this.polygon.length; i++) {
                ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
            }
            ctx.closePath();
            ctx.strokeStyle = this.borderColor;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }
        for (const widget of this.widgets) {
            if (widget.visible) {
                widget.draw(ctx, t, dt);
                //t.y += widget.height + this.spacing;
            }
        }
    }

    mouse(point, event){
        const t = point.add(this.position);
        if(pointInPolygon(t, this.polygon)){
           // this.borderColor = "yellow";
            for (const widget of this.widgets) {
                if (widget.visible) {
                    if(widget.mouse(t,event)){
                        return true;
                    }
                   // t.y -= widget.height + this.spacing;
                }
            }
        }
       // else{this.borderColor = "black";}
        return false;
    }
}


export class Panel {
    constructor(position = {x:0,y:0},polygon=[], content=[],  background = "grey", borderColor = "black", borderWidth = 2,visible=true){
        this.position = new Vector(position);
        this.content = content;
        this.polygon = polygon;
        this.background = background;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
        this.visible = visible;
        this.width = 0;
        this.height = 0;
        this.getWidth();
        this.getHeight();
        //this.viewportCanvas = new OffscreenCanvas(width, height);
        //this.viewportCtx = this.viewportCanvas.getContext('2d');
    }
    getWidth(){
        let xMin = Number.MAX_VALUE;
        let xMax = Number.MIN_VALUE;
        for (const vertex of this.polygon) {
            xMin = Math.min(xMin, vertex.x);
            xMax = Math.max(xMax, vertex.x);
        }
        this.width = xMax-xMin;
        return this.width;
    }
    getHeight(){
        let yMin = Number.MAX_VALUE;
        let yMax = Number.MIN_VALUE;
        for (const vertex of this.polygon) {
        yMin = Math.min(yMin, vertex.y);
        yMax = Math.max(yMax, vertex.y);
        }
        this.height = yMax-yMin;
        return this.height;
    }

    addContent(content){
        this.content.push(content);
    }
    draw(ctx, transform, dt){
        if (!this.visible){
            return;
        }

        //draw the polygon
        ctx.save();
        ctx.translate(transform.x+this.position.x, transform.y+this.position.y);
        ctx.rotate(transform.rotation);
        ctx.scale(transform.scale, transform.scale);

        ctx.beginPath();
        ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
        for (let i = 1; i < this.polygon.length; i++) {
            ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = this.background;
        ctx.fill();
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.borderWidth;
        ctx.stroke();


        for(const content of this.content){
            content.draw(ctx,new TransformComponent(0,0), dt);
        }
        ctx.restore();
    }
    mouse(point, event){
        const p = point.subtract(this.position);
        if(pointInPolygon(p, this.polygon)){
           // this.borderColor = "yellow";
            for(let i = this.content.length-1; i >= 0; i--){
                const content = this.content[i];
                if(content.mouse)if(content.mouse(p,event)){
                    return true;
                }
            }
        }
       // else{
        //    this.borderColor = "black";
        //}
        return false;
    }
}

export class GUIComponent extends Component{
    constructor(polygon=[], content=[],  background = "transparent", borderColor = "transparent", borderWidth = 2,visible=true){
        super("gui");
        this.content = content;
        this.polygon = polygon;
        this.background = background;
        this.borderColor = borderColor;
        this.borderWidth = borderWidth;
        this.visible = visible;
        this.cursor = {x:0,y:0};

        //this.viewportCanvas = new OffscreenCanvas(width, height);
        //this.viewportCtx = this.viewportCanvas.getContext('2d');
    }
    addContent(content){
        this.content.push(content);
    }
    draw(ctx, transform, dt){
        if (!this.visible){
            return;
        }
        //draw the polygon
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.rotate(transform.rotation);
        ctx.scale(transform.scale, transform.scale);

        ctx.beginPath();
        ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
        for (let i = 1; i < this.polygon.length; i++) {
            ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = this.background;
        ctx.fill();
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.borderWidth;
        ctx.stroke();


        for(const content of this.content){
            content.draw(ctx,new TransformComponent(0,0), dt);
        }

       ctx.restore();
    }
    mouse(point, event){
        // translate point to match transform
        if(pointInPolygon(point, this.polygon)){
         //  this.borderColor = "yellow";
            for(let i = this.content.length-1; i >= 0; i--){
                const content = this.content[i];
                if(content.mouse(point,event)){
                    return true;
                }
            }
            return true;
        }
         //   this.borderColor = "black";

        return false;
    }
}
