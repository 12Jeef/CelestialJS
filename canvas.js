function GetById(id) { return document.getElementById(id); }
const log = console.log;
const Inf = Infinity;


Number.prototype.mod = function(n) { return ((this % n) + n) % n; }

Math.randfloat = function(v1, v2) { return lerp(v1,v2,Math.random()); };
Math.randint = function(v1, v2) {
  if (v1 > v2) { t = v1; v1 = v2; v2 = t; }
  return Math.floor(Math.random()*(v2-v1+1))+v1;
};
Math.randsign = function(v1, v2) { return Math.random() > 0.5 ? 1 : -1; };
Math.randval = function(v) { return v * Math.random(); };


function isnum(n) { return typeof(n) == "number"; }

function isint(n) {
  if (isnum(n)) { return parseInt(n) == n; }
  return false;
}
function isfloat(n) {
  if (isnum(n)) { return !isint(n) }
  return false;
}

function numberify(n) {
  if (isnum(n)) {
    if (parseInt(n) == n) { return parseInt(n); }
    return n;
  }
}


function rads(x) { return x * (Math.PI / 180); }
function degs(x) { return x / (Math.PI / 180); }
function sin(x) { return Math.sin(rads(x)); }
function cos(x) { return Math.cos(rads(x)); }


function lerp(v1, v2, p=SCROLL) { return v1 + p*(v2 - v1); }
function lerpwp(v1, v2, p=SCROLL) {
  if (Math.abs(v2 - v1) > 0) {
    if (Math.abs(v2 - v1) > PRECISION) { v1 = lerp(v1, v2, p); }
    else { v1 = v2; }
  }
  return v1;
}
function lerpp(p1, p2, p=SCROLL) {
  p1 = Point(p1); p2 = Point(p2);
  return Point(lerp(p1.x, p2.x, p), lerp(p1.y, p2.y, p));
}
function lerpwpp(p1, p2, p=SCROLL) {
  p1 = Point(p1); p2 = Point(p2);
  return Point(lerpwp(p1.x, p2.x, p), lerpwp(p1.y, p2.y, p));
}
function anglerel(d, dg) {
  var rel = (dg.mod(360) - d.mod(360)).mod(360);
  if (rel > 180) { return rel - 360; }
  return rel;
}
function lerpangle(d, dg, p=SCROLL) {
  return lerp(d, d+anglerel(d, dg), p);
}
function lerpanglewp(d, dg, p=SCROLL) {
  return lerpwp(d, d+anglerel(d, dg), p);
}


const ids = ["BG", "PB", "DEF", "PF", "UPG", "TEST"];
const CANVASES = {};
ids.forEach(function(id, i) {
  CANVASES[id] = GetById("CANVAS-"+id);
  if (i == 0) {
    CANVASES[id].style.background = "rgb(0,0,50)";
  }
});
const ctxs = {};
ids.forEach(id => ctxs[id] = CANVASES[id].getContext("2d"));
var ctx = undefined;
function SetCTX(id) { ctx = ctxs[id]; }
SetCTX("DEF");

const SCALE = 2;


const SCROLL = 1/3;
const PRECISION = 0.01;


class Camera {
  constructor(pos, scroll=SCROLL, fov=1) {
    this.rpos = this.nrpos = undefined;
    this.pos = Point();
    this.snapto(pos);
    this.fov = this.nfov = 1;
    this.snapfovto(fov);

    this.brightness = 0;

    this.scroll = scroll;

    this.shakes = [];

    this.init = 10;
  }

  get x() { return this.rpos.x; }
  set x(x) { this.rpos.x = x; }
  get y() { return this.rpos.y; }
  set y(y) { this.rpos.y = y; }

  scrollto(pos) {
    this.nrpos = Point(pos);
  }
  snapto(pos) {
    this.rpos = this.nrpos = Point(pos);
  }

  scrollfovto(fov) {
    this.nfov = fov;
  }
  snapfovto(fov) {
    this.fov = this.nfov = fov;
  }

  get change() {
    return (
      this.x != this.nrpos.x ||
      this.y != this.nrpos.y ||
      this.fov != this.nfov ||
      this.init > 0
    );
  }

  update() {
    if (this.init > 0) { this.init--; }
    ctx.canvas.style.filter = "brightness("+(this.brightness+1)+")";
    this.x = lerpwp(this.x, this.nrpos.x, this.scroll);
    this.y = lerpwp(this.y, this.nrpos.y, this.scroll);
    this.fov = lerpwp(this.fov, this.nfov, this.scroll);
    var shakerel = Point();
    const context = this;
    this.shakes.forEach(function(s) {
      var rel = Point.dir(s.pos.toward(context.rpos)+Math.randfloat(-60,60), s.mag);
      const d = s.pos.dist(context.rpos);
      if (d < 500) { shakerel = shakerel.add(rel.mul(d < 250 ? 1 : (d-250)/250)); }
      s.mag *= -0.85;
    });
    this.shakes = this.shakes.filter(s => Math.abs(s.mag)>PRECISION);
    var mag = shakerel.dist(0);
    this.pos = this.rpos.add(Point.dir(shakerel.toward(0)+180, Math.min(mag,25)));
  }

  addshake(pos, mag) {
    this.shakes.push({pos: Point(pos), mag: mag});
  }

  w2s(p, far=1, applycam=true) {
    p = Point(p).sub(this.pos.mul(far*(applycam?1:0))).mul(Point(1,-1)).mul(GLOBALSCALE*SCALE/(applycam?this.fov:1));
    p = p.add(Point(ctx.canvas.w,ctx.canvas.h).div(2));
    return p;
  }
  s2w(p, far=1, applycam=true) {
    p = Point(p).sub(Point(ctx.canvas.w,ctx.canvas.h).div(2));
    p = p.div(GLOBALSCALE*SCALE/(applycam?this.fov:1)).div(Point(1,-1)).add(this.pos.mul(far*(applycam?1:0)));
    return p;
  }

  w2sl(l, applycam=true) {
    return l*(GLOBALSCALE*SCALE/(applycam?this.fov:1));
  }
  s2wl(l, applycam=true) {
    return l/(GLOBALSCALE*SCALE/(applycam?this.fov:1));
  }
}

var cameras = [new Camera(0), new Camera(0)];
var camera = undefined;
function SetCamera(i) {
  camera = cameras[i];
}
SetCamera(0);


function RESIZE() {
  var w = window.innerWidth;
  var h = window.innerHeight;
  Object.values(CANVASES).forEach(function(CANVAS) {
    CANVAS.width = CANVAS.w = w * SCALE;
    CANVAS.style.width = w + "px";
    CANVAS.height = CANVAS.h = h * SCALE;
    CANVAS.style.height = h + "px";
  });
  cameras.forEach(cam => cam.init = 10);
}
RESIZE();
window.addEventListener("resize", RESIZE);
window.addEventListener("visibilitychange", RESIZE);


function Point(...args) {
  if (args.length <= 0) { args = [0]; }
  else if (args.length > 2) { args = [0]; }

  if (args.length == 1) {
    args = args[0];
    if (isnum(args)) { args = [args, args]; }
    else if (args.__proto__.constructor.name == "Array") {}
    else if (args.__proto__.constructor.name == "Object") {
      var nargs = [0, 0];
      if ("x" in args && isnum(args.x)) { nargs[0] = args.x; }
      if ("y" in args && isnum(args.y)) { nargs[1] = args.y; }
      args = nargs;
    } else { args = [0, 0]; }
  }
  var success = false;
  if (args.length == 2) {
    if (args.__proto__.constructor.name == "Array") {
      if (!isnum(args[0])) { args[0] = 0; }
      if (!isnum(args[1])) { args[1] = 0; }
      success = true;
    }
  }
  if (!success) { args = [0, 0]; }
  
  point = {x: args[0], y: args[1]};
  try { definepoint(point); } catch {}
  return point;
}
Point.dir = function(d, mag=1) {
  return Point(sin(d), cos(d)).mul(mag);
};
Point.scaledist = function(p, d) {
  return Point(p).mul(d/Point(p).dist(0));
};
Point.scaledist2p = function(p, pg, d) {
  return Point(p).add(Point.scaledist(Point(pg).sub(Point(p)), d));
};
function definepoint(point) {
  point.mutable = false;
  var proto = point;
  proto.get = function() {
    return [this.x, this.y];
  };
  proto.set = function(...args) {
    const p = Point(...args);
    this.x = p.x;
    this.y = p.y;
  };
  proto.add = function(o) {
    o = Point(o);
    if (this.mutable) {
      this.x += o.x; this.y += o.y;
      return this;
    }
    return Point(this.x + o.x, this.y + o.y);
  };
  proto.sub = function(o) {
    o = Point(o);
    if (this.mutable) {
      this.x -= o.x; this.y -= o.y;
      return this;
    }
    return Point(this.x - o.x, this.y - o.y);
  };
  proto.mul = function(o) {
    o = Point(o);
    if (this.mutable) {
      this.x *= o.x; this.y *= o.y;
      return this;
    }
    return Point(this.x * o.x, this.y * o.y);
  };
  proto.div = function(o) {
    o = Point(o);
    if (this.mutable) {
      this.x /= o.x; this.y /= o.y;
      return this;
    }
    return Point(this.x / o.x, this.y / o.y);
  };
  proto.pow = function(o) {
    o = Point(o);
    if (this.mutable) {
      this.x **= o.x; this.y **= o.y;
      return this;
    }
    return Point(this.x ** o.x, this.y ** o.y);
  };
  proto.neg = function() {
    if (this.mutable) {
      this.x *= -1; this.y *= -1;
      return this;
    }
    return Point(-this.x, -this.y);
  };
  proto.map = function(f) {
    if (this.mutable) {
      this.set(f(this.x), f(this.y));
      return this;
    }
    return Point(f(this.x), f(this.y));
  };
  proto.abs = function() {
    return this.map(Math.abs);
  };
  proto.round = function() {
    return this.map(Math.round);
  };
  proto.floor = function() {
    return this.map(Math.floor);
  };
  proto.ceil = function() {
    return this.map(Math.ceil);
  };
  proto.dist = function(p) {
    p = Point(p);
    return Math.sqrt((this.x-p.x)**2 + (this.y-p.y)**2);
  };
  proto.toward = function(p, ifsame=undefined) {
    p = Point(p);
    if (p.x == this.x && p.y == this.y) {
      return typeof(ifsame) == "number" ? ifsame : 360*Math.random();
    }
    return 90-degs(Math.atan2(p.y-this.y, p.x-this.x));
  };
  proto.rotate = function(d) {
    const p = Point.dir(d+90, this.x).add(Point.dir(d, this.y));
    if (this.mutable) {
      this.set(p);
      return this;
    }
    return p;
  };
  proto.rotatearound = function(d, a=0) {
    const p = Point(this).sub(Point(a)).rotate(d).add(Point(a));
    if (this.mutable) {
      this.set(p);
      return this;
    }
    return p;
  }
}

function ClearCanv() {
  ctx.clearRect(0, 0, ctx.canvas.w, ctx.canvas.h);
}

function DrawImage(image, pos, dir=90, scale=1, flexx=1, flexy=1, style={}) {
  var applycam = true;
  if ("applycam" in style) { applycam = style.applycam; }
  pos = camera.w2s(pos, 1, applycam);
  scale *= camera.w2sl(1) * ("basescale" in image ? image.basescale : 1);
  ctx.save();
  ctx.translate(Math.round(pos.x), Math.round(pos.y));
  ctx.rotate((dir-90)*(Math.PI/180));
  ctx.scale(scale*flexx, scale*flexy);
  ctx.drawImage(image, Math.round(-image.width/2), Math.round(-image.height/2));
  ctx.restore();
}
function blurimage(image, blur) {
  const small = document.createElement("canvas");
  const smallctx = small.getContext("2d");
  small.width = image.width / blur;
  small.height = image.height / blur;
  smallctx.drawImage(image, 0, 0, small.width, small.height);
  const regular = document.createElement("canvas");
  const regularctx = regular.getContext("2d");
  regular.width = image.width;
  regular.height = image.height;
  regularctx.drawImage(small, 0, 0, regular.width, regular.height);
  return regular;
}

function parsecolor(s) {
  const def = [0,0,0,255];
  s = String(s).toUpperCase();
  if (s.length <= 0) { return def; }
  if (s[0] == "#") {
    if (s.length == 3+1) {
      return [
        parseInt(s[1]+s[1],16),
        parseInt(s[2]+s[2],16),
        parseInt(s[3]+s[3],16),
        255,
      ];
    } else if (s.length == 4+1) {
      return [
        parseInt(s[1]+s[1],16),
        parseInt(s[2]+s[2],16),
        parseInt(s[3]+s[3],16),
        parseInt(s[4]+s[4],16),
      ];
    } else if (s.length == 6+1) {
      return [
        parseInt(s[1]+s[2],16),
        parseInt(s[3]+s[4],16),
        parseInt(s[5]+s[6],16),
        255,
      ];
    } else if (s.length == 8+1) {
      return [
        parseInt(s[1]+s[2],16),
        parseInt(s[3]+s[4],16),
        parseInt(s[5]+s[6],16),
        parseInt(s[7]+s[8],16),
      ];
    } else { return def; }
  } else if (s.includes("RGB")) {
    s = s.replace("R","").replace("G","").replace("B","").replace("A","");
    s = s.replace("(","[").replace(")","]");
    try {
      s = eval(s);
      if (s.constructor.name == "Array") {
        var res = [...def];
        for (var i = 0; i < Math.min(s.length,4); i++) {
          var v = parseInt(s[i])
          if (typeof(v) == "number") {
            if (!Number.isNaN(v) && Number.isFinite(v)) {
              res[i] = Math.max(0, Math.min(255, v));
            }
          }
        }
        return res;
      }
    } catch { return def; }
  }
  return def;
}
function colortohsv(c) {
  c = parsecolor(c);
  const R = c[0]; const G = c[1]; const B = c[2];
  const max = Math.max(...c); const min = Math.min(...c);
  const V = max / 255;
  const S = max > 0 ? (1-(min/max)) : 0;
  var H = degs(Math.acos((R-(G/2)-(B/2))/Math.sqrt((R**2)+(G**2)+(B**2)-(R*G)-(R*B)-(G*B))));
  if (B > G) { H = 360 - H; }
  return [H, S, V, c[3]];
}
function hsvtocolor(hsv) {
  const H = hsv[0]; const S = hsv[1]; const V = hsv[2];
  const max = 255*V; const min = max*(1-S);
  const z = (max-min)*(1-Math.abs((H/60).mod(2)-1))
  var R = 0; var G = 0; var B = 0; var A = hsv[3];
  switch(Math.floor(H/60)+1) {
    case 1:
      R = max; G = z+min; B = min; break;
    case 2:
      R = z+min; G = max; B = min; break;
    case 3:
      R = min; G = max; B = z+min; break;
    case 4:
      R = min; G = z+min; B = max; break;
    case 5:
      R = z+min; G = min; B = max; break;
    case 6:
      R = max; G = min; B = z+min; break;
  }
  return [R, G, B, A];
}
function randomizecolor(color, d) {
  color = parsecolor(color);
  const a = color.pop();
  if (color[0] == color[1] && color[0] == color[2]) {
    color = color[0]+(Math.randfloat(-1,1)*d);
    color = [color,color,color];
  } else {
    color = color.map(v => v+(Math.randfloat(-1,1)*d));
  }
  color = color.map(v => Math.max(0, Math.min(255, v)));
  return [...color, a];
}

Object.values(ctxs).forEach(function(c) {
  c.circleGradient = function(pos, rad, stops={}) {
    pos = Point(pos);
    const grad = c.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, rad);
    return c.applyStopsToGrad(grad, stops);
  };
  c.linearGradient = function(pos1, pos2, stops={}) {
    pos1 = Point(pos1); pos2 = Point(pos2);
    const grad = c.createLinearGradient(pos1.x, pos1.y, pos2.x, pos2.y);
    return c.applyStopsToGrad(grad, stops);
  };
  c.applyStopsToGrad = function(grad, stops={}) {
    for (var p in stops) {
      grad.addColorStop(parseFloat(p), stops[p]);
    }
    return grad;
  };
});

const mouse = Point();

document.body.addEventListener("mousemove", function(ev) {
  mouse.set(ev.pageX, ev.pageY);
});
function mousepos() {
  return mouse.sub(
    Point(window.innerWidth,window.innerHeight).div(2)
  ).mul(Point(1,-1)).mul(camera.fov/GLOBALSCALE).add(camera.pos);
}

const keysdown = new Set();
document.body.addEventListener("keydown", function(ev) {
  var key = ev.key.toUpperCase();
  keysdown.add(key);
});
document.body.addEventListener("keyup", function(ev) {
  var key = ev.key.toUpperCase();
  keysdown.delete(key);
});
const MOUSEDOWN = "MOUSEDOWN";
const MOUSE = "MOUSE";
document.body.addEventListener("mousedown", function(ev) {
  keysdown.add(MOUSEDOWN);
  keysdown.add(MOUSE+ev.button);
});
document.body.addEventListener("mouseup", function(ev) {
  keysdown.delete(MOUSEDOWN);
  keysdown.delete(MOUSE+ev.button);
});
function keydown(...keys) {
  for (var i = 0; i < keys.length; i++) {
    if (keysdown.has(String(keys[i]).toUpperCase())) { return true; }
  }
  return false;
}
function mousedown(button=undefined) {
  if (typeof(button) == "number") { return keydown(MOUSE+button); }
  return keydown(MOUSEDOWN);
}
