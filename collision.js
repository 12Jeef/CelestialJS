class Side {
  constructor(p1, p2) {
    this.p1 = Point(p1); this.p2 = Point(p2);
  }

  collides(side) {
    const s1 = this;
    const s2 = side;
    const m1 = s1.slope; const m2 = s2.slope;
    const b1 = s1.intercept; const b2 = s2.intercept;
    const ix = (b1 - b2) / (m2 - m1); const iy = ix*m1 + b1;
    const i = Point(ix, iy);
    if (i.dist(s1.p1) < s1.length && i.dist(s1.p2) < s1.length) {
      if (i.dist(s2.p1) < s2.length && i.dist(s2.p2) < s2.length) {
        return true;
      }
    }
    return false;
  }

  get slope() { return (this.p2.y-this.p1.y) / (this.p2.x-this.p1.x); }
  get intercept() { return this.p1.y - (this.slope*this.p1.x); }
  get length() { return this.p1.dist(this.p2); }
}

class CollisionShape {
  constructor(...points) {
    this.points = points.map(p => Point(p));
    const maxx = Math.max(...this.points.map(p => p.x));
    const minx = Math.min(...this.points.map(p => p.x));
    const maxy = Math.max(...this.points.map(p => p.y));
    const miny = Math.min(...this.points.map(p => p.y));
    this.bounding = {pos: Point((maxx+minx)/2, (maxy+miny)/2), size: Point(maxx-minx, maxy-miny)};
    this.sides = [];
    for (var i = 0; i < this.points.length; i++) {
      this.sides.push(new Side(this.points.at(i-1), this.points.at(i)));
    }
  }

  collides(shape) {
    const s1 = this;
    const s2 = shape;
    const rel = s1.bounding.pos.sub(s2.bounding.pos).abs();
    if (
      rel.x > (s1.bounding.size.x + s2.bounding.size.x)/2 ||
      rel.y > (s1.bounding.size.y + s2.bounding.size.y)/2
    ) { return false; }
    for (var i1 = 0; i1 < s1.sides.length; i1++) {
      for (var i2 = 0; i2 < s2.sides.length; i2++) {
        if (s1.sides[i1].collides(s2.sides[i2])) { return true; }
      }
    }
    return false;
  }

  static circle(pos, rad, qual=12, diroff=0) {
    const points = [];
    for (var i = 0; i < qual; i++) {
      points.push(Point.dir(diroff + (360*(i/qual)), rad).add(Point(pos)));
    }
    return new CollisionShape(...points);
  }
}

if (false) {
  const s1sides = [];
  for (var i = 0; i < 9; i++) { s1sides.push(Point.dir(360*(i/9), 50+50*Math.random())); }
  const s2sides = [];
  for (var i = 0; i < 9; i++) { s2sides.push(Point.dir(360*(i/9), 50+50*Math.random())); }
  
  const s1pos = Point(CANVAS.width/2, CANVAS.height/2);
  const s2pos = Point(CANVAS.width/2, CANVAS.height/2);
  
  Array.from(document.body.getElementsByTagName("*")).forEach(function(e) {
    if (e.id == "CANVAS" || e.id == "CANVAS-DIV" || e.id == "body") { return; }
    e.style.opacity = 0;
  });
  
  function UPDATE() {
    ctx.clearRect(0,0,CANVAS.width,CANVAS.height);
    const s1 = new CollisionShape(...s1sides.map(p => p.add(s1pos)));
    const s2 = new CollisionShape(...s2sides.map(p => p.add(s2pos)));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(...s1.points.at(-1).get());
    s1.points.forEach(p => ctx.lineTo(...p.get()));
    ctx.fillStyle = s1.collides(s2) ? "red" : "white"; ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s2.points.at(-1).x, s2.points.at(-1).y);
    s2.points.forEach(p => ctx.lineTo(...p.get()));
    ctx.fillStyle = s2.collides(s1) ? "red" : "white"; ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.restore();
  }
  
  setInterval(UPDATE, (1/30)*1000);
}
