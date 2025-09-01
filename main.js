function playsound(name, pos, vol=1) { return; game.sounds.push(new Sound(name, pos, 0.1*vol)); }

class Sound {
  constructor(name, pos, vol=1) {
    // this.aud = new Audio("/s/aud/"+name+".wav");
	  this.aud = new Audio("aud/"+name+".wav");
    this.aud.volume = 0;
    this.aud.play();

    this.pos = Point(pos);
    this.vol = vol;
  }

  update(cam, vol) {
    const d = this.pos.dist(cam.rpos);
    if (d > R1) { vol *= 0; }
    else if (d > R1/2) { vol *= (R1-d)/(R1/2); }
    this.aud.volume = vol*this.vol;
    return this.aud.ended;
  }
}
  
class Display {
  constructor(value, elems=[]) {
    this.elems = elems;
    this._value = undefined;
    this.value = value;
  }

  get value() { return this._value; }
  set value(value) {
    this._value = value;
    const context = this;
    this.elems.forEach(function(elem) {
      elem.innerHTML = context.value;
    });
  }
}

function fadein(elem) {
  elem.classList.remove("fadeout");
  elem.classList.add("fadein");
}
function fadeout(elem) {
  elem.classList.remove("fadein");
  elem.classList.add("fadeout");
}

let mode;
function SwitchMode(m) {
  var elem;
  elem = GetById("MODE-" + mode);
  if (elem) { fadeout(elem); }
  mode = m;
  elem = GetById("MODE-" + mode);
  if (elem) { fadein(elem); }
}
SwitchMode("TITLE");
SwitchMode("GAME");
SwitchMode("DEAD");
SwitchMode("LOADING");

const textures = {};
texturenames.forEach(function(name) {
  const image = new Image();
  // image.src = "/s/tex/" + name + ".svg";
  image.src = "tex/" + name + ".svg";
  textures[name] = image;
});

document.body.onload = function() {
  Promise.all(Object.values(textures)).then(function(ltextures) {
    for (var i = 0; i < ltextures.length; i++) {
      var name = Object.keys(textures)[i];
      textures[name] = ltextures[i];
      if (name.length > "enmy_".length) {
        var subname = name.slice("enmy_".length);
        if (!["p1","p2","p3","shield","missile"].includes(subname)) {
          var scale = 5*SCALE;
          var tex = ltextures[i];
          var c = document.createElement("canvas");
          var cctx = c.getContext("2d");
          c.width = tex.width*scale; c.height = tex.height*scale;
          cctx.filter = "hue-rotate(180deg)";
          cctx.drawImage(tex, 0, 0, tex.width*scale, tex.height*scale);
          c.basescale = 1/scale;
          textures[name+"_plyr"] = c;
        }
      }
    }
    fadeout(GetById("TRANSITION"));
    SwitchMode("TITLE");
    
    INIT();
    setInterval(UPDATE, (1/60)*1000);
  });
};

const POLYCOLL = false;

class Entity {
  #hpmax; #hp;
  constructor(pos, rad, hp) {
    this.ADDED = false;
    
    this.invincible = false;
    this.applyborder = true;
    
    this.pos = Point(pos);
    this.vel = Point();
    this.rad = rad/2;
    this.#hpmax = this.#hp = 0;
    this.hpmax = hp;
    this.damagemul = [];
    this.damagedisplay = false;
    this.lastdamaged = undefined;

    this.bar = undefined;

    this.hitbox = [];
    
    this.damaging = 0;

    this.bodydamage = 1;
    this.bodyknockback = 5;

    this.effects = {};
    
    this.layer = undefined;
    this.collayers = [];
    this.dmglayers = [];

    this.dir = 0;
    this.speed = 0;

    this.deathex = 0;
    this.deathexp = 1;
    this.deathexcolor = "#000000";

    this.score = 0;
    this.gainscore = false;
    this.exp = 0;
    this.explvl = 0;

    this.rendertex = undefined;
    this.renderdir = 0;
    this.renderscale = 1;
    this.renderalpha = 1;
    this.renderfilter = "";

    this.playhurtsound = false;
    this.playdeathsound = false;

    this.damagetaken = 0;
    
    this.chunkpos = [];

    this.source = undefined;
  }

  get hitboxpoints() {
    return this.hitbox.map(p => this.pos.add(Point(p).rotate(this.dir+this.renderdir-90)));
  }
  get hitboxshape() { return new CollisionShape(...this.hitboxpoints); }
  collidinghb(hitboxshape) { return this.hitboxshape.collides(hitboxshape); }
  collidinge(e) {
    if (POLYCOLL) { return this.collidinghb(e.hitboxshape); }
    if (this.rad <= 0 || e.rad <= 0) { return false; }
    return this.pos.dist(e.pos) < this.rad+e.rad;
  }

  get hpmax() { return this.#hpmax; }
  set hpmax(v) { this.#hpmax = Math.max(v, 0); this.hp = this.hpmax; }
  get hp() { return this.#hp; }
  set hp(v) { this.#hp = Math.min(Math.max(v, 0), this.hpmax); }

  get x() { return this.pos.x; }
  set x(v) { this.pos.x = v; }
  get y() { return this.pos.y; }
  set y(v) { this.pos.y = v; }

  addscore(n) {
    if (this.source != undefined) {
      this.source.addscore(n);
      return;
    }
    if (this.gainscore) {
      this.score += n;
    }
  }
  addexp(n) {
    this.exp += n;
    while (this.exp >= this.expoflvl(this.explvl)) {
      this.exp -= this.expoflvl(this.explvl);
      this.explvl++;
    }
  }
  remexp(n) {
    this.exp -= n;
    while (this.exp < 0) {
      this.explvl--;
      if (this.explvl < 0) {
        this.explvl = 0;
        this.exp = 0;
        break;
      }
      this.exp += this.expoflvl(this.explvl);
    }
  }
  addexplvl(l) {
    for (var i = 0; i < l; i++) {
      this.addexp(this.expoflvl(this.explvl));
    }
  }
  remexplvl(l) {
    for (var i = 0; i < l; i++) {
      this.remexp(this.expoflvl(this.explvl-1));
    }
  }
  expoflvl(l) { return 32 + l*16; }
  get texp() {
    var exp = this.exp;
    for (var i = 0; i < this.explvl-1; i++) {
      exp += this.expoflvl(i);
    }
    return exp;
  }

  cancollidewith(layer) {
    return this.collayers.includes(layer) || this.collayers.includes("all");
  }
  candamagewith(layer) {
    return this.dmglayers.includes(layer) || this.dmglayers.includes("all");
  }

  explode(n, color, pos, spread, size, sound=false) {
    const l = [];
    for (var i = 0; i < n; i++) {
      l.push(this.explodeone((i + 1) / n, color, pos, spread, size, sound));
    }
    return l;
  }
  explodeone(d, color, pos, spread, size, sound=false) {
    var e = new PExplosion(color, Point(pos).add(Point.dir(Math.randval(360),spread*(1-d))), Math.randint(1,spread/25), size*d, sound);
    addparticle(e);
    return e;
  }
  deathexplode() {
    this.explode(this.deathex, this.deathexcolor, this.pos, this.rad*this.deathexp*2, this.rad*this.deathexp*3, this.playdeathsound);
  }

  update(others, ...args) {
    if (this.bar != undefined) {
      this.bar.hp = this.hp;
      this.bar.hpmax = this.hpmax;
      this.bar.update();
    }
    for (var i = 0; i < this.chunkpos.length; i++) {
      if (this.chunkpos[i] in game.chunks) {
        var chunk = game.chunks[this.chunkpos[i]];
        var layers = [...this.collayers, ...this.dmglayers];
        for (var i2 = 0; i2 < layers.length; i2++) {
          if (layers[i2] in chunk) {
            var chunkl = chunk[layers[i2]];
            for (var i3 = 0; i3 < chunkl.length; i3++) {
              var e = chunkl[i3];
              if (e == this) { continue; }
              var col = this.cancollidewith(e.layer) && e.cancollidewith(this.layer);
              var dmg = this.candamagewith(e.layer) && e.candamagewith(this.layer);
              if (col || dmg) {
                if (this.collidinge(e)) {
                  if (dmg) { this.damagef(e); }
                  else if (col) { this.knockbackf(e); }
                  this.oncollide(e);
                }
              }
            }
          }
        }
      }
    }
    var effects = this.effects;
    for (var name in effects) {
      var effect = effects[name];
      effect.time = Math.round(effect.time) - 1;
      if (effect.time <= 0) {
        delete effects[name];
        continue;
      }
      switch(name) {
        case "poison":
          if (effect.time % 30 == 0) { this.damage(effect.strength); }
          break;
        case "fire":
          if (effect.time % 10 == 0) { this.damage(effect.strength); }
          break;
      }
    }
    var kill = false;
    if (this.applyborder) {
      if (this.pos.dist(0) > game.size) {
        this.knockbackd(this.pos.toward(0), 0.05*(this.pos.dist(0)-game.size));
      }
    } else if (this.pos.dist(0) > game.size+R1) { kill = true; }
    kill = kill || this.u2(others, ...args);
    if (this.hp <= 0) {
      this.ondeath();
      if (this.hp <= 0) {
        if (this.lastdamaged != undefined) {
          this.lastdamaged.addscore(this.score);
        }
        this.deathexplode();
        while (this.exp > 0) {
          var a = this.exp * 0.25;
          a = Math.min(this.exp, Math.ceil(Math.max(1, Math.min(5, a*Math.randfloat(0.75,1.25)))));
          addentity(new Experience(this.pos.add(Point.dir(Math.randval(360), Math.randfloat(0,this.rad))), a));
          this.exp -= a;
        }
        kill = true;
      }
    }
    return kill;
  }
  u2() {}

  addeffect(name, duration, strength=1) {
    var effect = {};
    if (name in this.effects) { effect = this.effects[name]; }
    else { effect = {time: 0, strength: 0}; }
    effect.time += duration;
    effect.strength = Math.max(effect.strength, strength);
    this.effects[name] = effect;
  }

  oncollide(e) {}

  get slownesseffect() {
    return ("slowness" in this.effects) ? (1 / (this.effects["slowness"].strength+1)) : 1;
  }
  get speedeffect() {
    return ("speed" in this.effects) ? (this.effects["speed"].strength) : 1;
  }

  finish() {
    const p = this.slownesseffect * this.speedeffect;
    if (Math.abs(this.vel.x*p) > 0) {
      if (Math.abs(this.vel.x*p) > PRECISION) {
        this.vel.x *= 0.85;
        this.x += this.vel.x*p;
      } else { this.vel.x = 0; }
    }
    if (Math.abs(this.vel.y*p) > 0) {
      if (Math.abs(this.vel.y*p) > PRECISION) {
        this.vel.y *= 0.85;
        this.y += this.vel.y*p;
      } else { this.vel.y = 0; }
    }
    if (this.damaging > 0) { this.damaging--; }
    this.f2();
  }
  f2() {}

  ondeath() {}

  knockback(v) { this.vel = this.vel.add(v); }
  knockbackd(d, m) { this.knockback(Point.dir(d, m)); }
  knockbackf(e) { this.knockbackd(e.pos.toward(this.pos), e.bodyknockback*(7.5/this.rad)); }
  recoil(d, m) { this.knockbackd(d, m*(15/this.rad)); }
  damage(v) {
    if (this.constructor.name == "Player") {
      if (this.invincible) {
        this.damagetaken += v;
        // log("damage taken:", this.damagetaken);
      }
    }
    this.damagemul.forEach(m => v*=m);
    if ("resistance" in this.effects) { v /= this.effects["resistance"].strength+1; }
    v = Math.round(v * 2) / 2;
    if (this.damagedisplay) {
      addparticle(new PText(this.pos.add(Point.dir(Math.randfloat(-90,90),this.rad*0.5)), -v, 15, "#ff8800"));
    }
    if (this.playhurtsound) { playsound("hit",this.pos); }
    this.hp -= v*(this.invincible?0:1); this.damaging = 4;
  }
  damagef(e) {
    this.lastdamaged = e;
    this.damage(e.bodydamage);
    this.knockbackf(e);
  }

  render() {
    ctx.save();
    this.rb2();
    if (textures[this.rendertex]) {
      if (this.constructor.name == "Shield") {
        // log("rendering");
      }
      ctx.globalAlpha = this.renderalpha;
      ctx.filter = this.renderfilter;
      DrawImage(textures[this.rendertex], this.pos, this.dir+this.renderdir, this.renderscale);
    }
    ctx.restore();
    this.r2();
    ctx.save();
    var pos = camera.w2s(this.pos);
    if (this.damaging > 0) {
      ctx.fillStyle = this.damaging % 2 == 0 ? "#ff0000" : "#ffffff";
      ctx.beginPath();
      if (POLYCOLL) {
        const points = this.hitboxpoints.map(p => camera.w2s(p));
        if (points.length > 0) {
          ctx.moveTo(...points.at(-1).get());
          points.forEach(p => ctx.lineTo(p.x, p.y));
        }
      } else {
        ctx.arc(pos.x, pos.y, camera.w2sl(this.rad), 0, 2*Math.PI);
      }
      ctx.fill();
    }
    if ("poison" in this.effects) {
      var pl = [2, 1.25, 0.75];
      ctx.fillStyle = "#00ff00";
      ctx.globalAlpha = 0.1;
      for (var i = 0; i < pl.length; i++) {
        var p = pl[i];
        var pos_i = pos.add(Point.dir(
          360*(i/pl.length) + 5*this.effects["poison"].time,
          camera.w2sl(0.1*p*this.rad),
        ));
        ctx.beginPath();
        ctx.arc(pos_i.x, pos_i.y, camera.w2sl(p*this.rad), 0, 2*Math.PI);
        ctx.fill();
      }
    }
    if ("fire" in this.effects) {
      if (this.effects["fire"].time % 3 == 0) {
        addparticle(new PExplosion(
          "#ff8800",
          this.pos.add(Point.dir(Math.randval(360),Math.randfloat(0,this.rad))),
          0, Math.randfloat(0.75,1.25)*this.rad,
        ));
      }
    }
    if ("slowness" in this.effects || "speed" in this.effects) {
      var pl = [1.25, 0.75];
      var time = 0;
      if ("slowness" in this.effects) { time = Math.max(time, this.effects["slowness"].time); }
      if ("speed" in this.effects) { time = Math.max(time, this.effects["speed"].time); }
      ctx.fillStyle = "#888888";
      ctx.globalAlpha = 0.25;
      for (var i = 0; i < pl.length; i++) {
        var p = pl[i];
        var pos_i = pos.add(Point.dir(
          360*(i/pl.length) + 5*time,
          camera.w2sl(0.1*p*this.rad),
        ));
        ctx.beginPath();
        ctx.arc(pos_i.x, pos_i.y, camera.w2sl(p*this.rad), 0, 2*Math.PI);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  rb2() {}
  r2() {}

  movedir(d, m) { this.knockbackd(d, m); }
  move(d=0, m=1) { this.movedir(this.dir+d, this.speed*m); }

  onscreen(plyr) {
    return this.pos.dist(plyr.pos) < 1000;
  }
}

class HealthBar {
  constructor(canv, hp, color, size, blocksat=[]) {
    this.hp = 0;
    this.hpmax = hp;
    this.hpl = [];
    this.p = -PRECISION;
    this.p2 = -PRECISION;
    this.color = color;
    this.blocksat = blocksat;

    this.size = Point(size);
    canv.width = this.size.x*SCALE;
    canv.height = this.size.y*SCALE;
    canv.style.transform = "skew(-10deg)";
    this.canv = canv;
    this.ctx = canv.getContext("2d");

    this.pname = undefined;
    this.name = "";
  }

  update() {
    const canv = this.canv;
    const ctx2 = this.ctx;
    
    canv.style.width = (camera.w2sl(this.size.x,false)/SCALE)+"px";
    canv.style.height = (camera.w2sl(this.size.y,false)/SCALE)+"px";
    
    this.hp = Math.max(0, Math.min(this.hpmax, this.hp));
    this.hpl.push(this.hp);
    if (this.hpl.length > 15) { this.hpl.shift(); }
    
    const p_prev = this.p;
    this.p = lerpwp(this.p, this.hp / this.hpmax);
    const p2_prev = this.p2;
    this.p2 = lerpwp(this.p2, this.hpl[0] / this.hpmax);

    if (p_prev != this.p || p2_prev != this.p2 || this.pname != this.name) {
      this.pname = this.name;
      
      const c1 = this.color;
      const c2 = "rgb("+parsecolor(c1).slice(0,3).map(v => v*0.5).join(",")+")";
  
      ctx2.clearRect(0,0,canv.width,canv.height);
      
      ctx2.fillStyle = c2; ctx2.globalAlpha = 0.5;
      ctx2.fillRect(0,0,canv.width,canv.height);

      ctx2.fillStyle = "#ffffff"; ctx2.globalAlpha = 1;
      ctx2.fillRect(0,0,canv.width*this.p2,canv.height);
      ctx2.fillStyle = c1; ctx2.globalAlpha = 1;
      ctx2.fillRect(0,0,canv.width*this.p,canv.height);
  
      ctx2.lineWidth = 5;
      ctx2.strokeStyle = c2; ctx2.globalAlpha = 1;
      ctx2.strokeRect(0,0,canv.width,canv.height);

      ctx2.lineWidth = camera.w2sl(2.5,false);
      ctx2.strokeStyle = c2; ctx2.globalAlpha = 1;
      this.blocksat.forEach(function(p) {
        ctx2.beginPath();
        ctx2.moveTo(canv.width*p, 0);
        ctx2.lineTo(canv.width*p, canv.height);
        ctx2.stroke();
      });

      const name = String(this.name);
      if (name.length > 0) {
        ctx2.textAlign = "center"; ctx2.textBaseline = "middle";
        ctx2.font = "1px Custom";
        const w = ctx2.measureText(name).width;
        const size = this.size.sub(camera.w2sl(2.5,false));
        const p = Math.min(size.x/w, size.y);
        ctx2.font = p + "px Custom";
        ctx2.strokeStyle = c2; ctx2.lineWidth = 0.25*p;
        ctx2.strokeText(name, canv.width/2, (canv.height/2)+(0.1*p));
        ctx2.fillStyle = "#ffffff";
        ctx2.fillText(name, canv.width/2, canv.height/2);
      }
    }
  }

  render() {}
}

const GUI_TM = GetById("GUI-TM");

class BossBar extends HealthBar {
  constructor(name, hp, color, size, blocksat=[]) {
    const canv = document.createElement("canvas");
    super(canv, hp, color, size, blocksat);
    this.br = document.createElement("br");

    this.name = String(name);
  }

  add() {
    fadein(this.canv);
    fadein(this.br);
    GUI_TM.appendChild(this.canv);
    GUI_TM.appendChild(this.br);
  }
  rem() {
    const context = this;
    fadeout(this.canv);
    fadeout(this.br);
    var i = 0;
    const id = setInterval(function() {
      i++;
      if (i > 30) {
        clearInterval(id);
        context.canv.remove();
        context.br.remove();
        return;
      }
      context.update();
    }, (1/60)*1000);
  }
}



const PLYR = "PLYR";
const ENMY = "ENMY";
const PLYR_P = "PLYR_P";
const ENMY_P = "ENMY_P";
const A = "A";
const MISC = "MISC";

class Asteroid extends Entity {
  constructor(pos, dir, type) {
    super(pos, Asteroid.rads[type-1], Asteroid.hps[type-1]);
    this.applyborder = false;
    
    this.damagedisplay = true;

    this.dir = dir;
    this.speed = Asteroid.speeds[type-1]*1.5;

    this.hitbox = Asteroid.hitboxes[type-1];
    
    this.layer = A;
    this.dmglayers = [MISC, PLYR, ENMY, PLYR_P, ENMY_P];
    this.collayers = [A];

    this.deathex = Asteroid.deathexs[type-1];
    this.deathexcolor = "#ff8800";

    this.score = Asteroid.scores[type-1];
    this.exp = Asteroid.exps[type-1];

    this.rendertex = "a_"+type;

    this.playhurtsound = true;
    this.playdeathsound = true;

    this.truedir = Math.randval(360);
    this.spin = Asteroid.spins[type-1];

    this.type = type;
  }

  static rads = [100, 50, 20];
  static hps = [10, 5, 1];
  static speeds = [0.1, 0.25, 0.5];
  static deathexs = [5, 3, 1];
  static scores = [25, 15, 10];
  static exps = [5, 3, 1];
  static spins = [0.1, 1, 2];
  static hitboxes = [
    [
      [-50,38],
      [-41,3],
      [-49,-30],
      [-34,-38],
      [-28,-50],
      [49,-33],
      [46,8],
      [-10,50],
    ],
    [
      [-25,10],
      [-23,-8],
      [2,-20],
      [25,-9],
      [19,18],
      [-5,18],
    ],
    [
      [1,8],
      [-6,-2],
      [5,-8],
    ],
  ];

  u2(_, plyr) {
    this.move();
    this.dir = 180+this.vel.toward(0);
    this.truedir += this.spin; this.truedir = this.truedir.mod(360);
    this.renderdir = this.truedir - this.dir;
    return plyr!=undefined && this.pos.dist(plyr.pos) > R2;
  }

  ondeath() {
    switch(this.type) {
      case 1:
        for (var i = 0; i < Math.randint(1,3); i++) {
          var d = Math.randval(360);
          addentity(new Asteroid(this.pos.add(Point.dir(d,Asteroid.rads[1])), d, 2));
        }
        for (var i = 0; i < Math.randint(3,6); i++) {
          var d = Math.randval(360);
          addentity(new Asteroid(this.pos.add(Point.dir(d,Asteroid.rads[2])), d, 3));
        }
        break;
      case 2:
        for (var i = 0; i < Math.randint(3,6); i++) {
          var d = Math.randval(360);
          addentity(new Asteroid(this.pos.add(Point.dir(d,Asteroid.rads[2])), d, 3));
        }
        break;
    }
  }
}

class Experience extends Entity {
  constructor(pos, amount) {
    super(pos, 0, 1);
    this.layer = "EXP";
    this.collayers = this.dmglayers = [];
    this.amount = amount;
    this.i = Math.randval(360);
    this.color = "rgb(" + randomizecolor("#8800ff", 40).join(",") + ")";
    this.timer = 60*60;
  }

  u2(_, plyr) {
    this.rad = Math.min(25, 5*this.amount);
    this.i = (this.i + 1).mod(360);
    if (plyr != undefined) {
      const d = this.pos.dist(plyr.pos);
      if (d < 100) {
        this.rad *= d / 100;
        this.timer = 60*60;
        this.vel = this.vel.add(Point.dir(this.pos.toward(plyr.pos), 5*(1-(d/100))));
        if (d < plyr.rad) {
          plyr.addexp(this.amount);
          return true;
        }
      }
    }
    this.timer--;
    return this.timer < 0;
  }

  render() {
    const pos = camera.w2s(this.pos.add(Point.dir(360*(this.i/120), 0.25*this.rad)));
    const p1 = lerp(0.5, 1, (1+sin(360*(this.i/180)))/2);
    const p2 = lerp(0.5, 1, (1+sin(360*(this.i/180)+45))/2);
    var alpha = 1;
    if (this.timer < 10*60) { alpha = (1+cos(360*(this.timer / lerp(5,30,this.timer/(10*60))))) / 2; }
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, camera.w2sl(p1*2*this.rad), 0, 2*Math.PI);
    ctx.fillStyle = this.color; ctx.globalAlpha = 0.5*alpha;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, camera.w2sl(p2*this.rad), 0, 2*Math.PI);
    ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 1*alpha;
    ctx.fill();
    ctx.restore();
  }
}

class Shield extends Entity {
  constructor(source, size, poff, duration=Inf) {
    super(source.pos, size, 1);
    this.hitbox = [];

    switch(source.layer) {
      case PLYR:
      case PLYR_P:
        this.layer = PLYR;
        this.dmglayers = [MISC, A, ENMY, ENMY_P];
        this.rendertex = "plyr";
        break;
      case ENMY:
      case ENMY_P:
        this.layer = ENMY;
        this.dmglayers = [MISC, A, PLYR, PLYR_P];
        this.rendertex = "enmy";
        break;
    }
    this.rendertex += "_shield";
    this.renderscale = this.renderalpha = 0;
    
    this.deathex = 5;
    this.deathexp = 1.5;
    this.deathexcolor = source.deathexcolor;

    this.poff = Point(poff);
    this.orbit = 0;
    this.orbitspin = this.orbitdir = 0;

    this.i = 0;
    this.id = duration;

    this.electric = false;
    this.p = undefined;
    this.pr = undefined;

    this.recharge = false;
    this.rechargedelay = 0;
    this.recharging = false;

    this.thpmax = 0;
    this.tdmglayers = [];

    this.source = source;
  }

  u2(others, __) {
    var parent = this.source;
    this.i++;
    var goal = parent.pos.add(Point.dir(this.orbitdir, this.orbit));
    this.dir = this.pos.toward(goal);
    this.speed = Math.max(0.25, 0.05*this.pos.dist(goal));
    if (this.pos.dist(goal) > 2.5) { this.move(); }
    this.renderdir = this.pos.toward(parent.pos)+180 - this.dir;
    this.orbitdir += this.orbitspin;
    if (this.recharging) {
      this.hp--;
      this.renderscale = lerpwp(this.renderscale, 0.75 * (this.rad / (135/2)));
      this.renderalpha = lerpwp(this.renderalpha, 0.5);
    } else {
      this.thpmax = this.hpmax;
      this.tdmglayers = [...this.dmglayers];
      this.renderscale = lerpwp(this.renderscale, 1 * (this.rad / (135/2)));
      this.renderalpha = lerpwp(this.renderalpha, 1);
    }
    if (!parent.ADDED) {
      this.lastdamaged = undefined;
      this.recharge = false;
      this.hp = 0;
    }
    if (this.electric && !this.recharging) {
      if (this.pr == undefined) {
        this.pr = new PLightning(this.pos, this.pos, this.deathexcolor, 10, Inf);
        this.pr.r1 = 0;
        addparticle(this.pr);
      }
      if ((this.i % Math.randint(5,20)) == 0) { this.pr.show = !this.pr.show; }
      this.pr.r2 = 1.5*this.renderscale;
      this.pr.pos1 = this.pos.add(Point(65,30).mul(this.renderscale).rotate(this.renderdir+this.dir));
      this.pr.pos2 = this.pos.add(Point(-65,30).mul(this.renderscale).rotate(this.renderdir+this.dir));
      var n = undefined;
      var nd = Inf;
      for (var i = 0; i < others.length; i++) {
        if (this == others[i]) { continue; }
        if (
          this.candamagewith(others[i].layer) && others[i].candamagewith(this.layer) &&
          ![PLYR_P, ENMY_P].includes(others[i].layer)
        ) {
          var d = this.pos.dist(others[i].pos) - (others[i].rad+this.rad);
          if (d < nd) {
            nd = d;
            n = others[i];
          }
        }
      }
      if (nd < this.rad) {
        if (this.p == undefined) {
          this.p = new PLightning(this.pos, this.pos, this.deathexcolor, 10, Inf);
          addparticle(this.p);
        }
        this.p.pos1 = Point.scaledist2p(this.pos, n.pos, this.rad*0.9);
        this.p.pos2 = Point.scaledist2p(n.pos, this.pos, n.rad);
        if (this.i % 3 == 0) {
          n.lastdamaged = this;
          n.damage(this.bodydamage);
          n.knockbackd(this.pos.toward(n.pos), 2.5);
          var e = this.explodeone(Math.random(), this.deathexcolor, n.pos, 25, 50);
          e.delay = 0;
        }
      } else {
        if (this.p != undefined) {
          this.p.id = 0;
          this.p = undefined;
        }
      }
    } else {
      if (this.p != undefined) {
        this.p.id = 0;
        this.p = undefined;
      }
      if (this.pr != undefined) {
        this.pr.id = 0;
        this.pr = undefined;
      }
    }
    if (this.i > this.id) {
      this.p.id = this.pr.id = 0;
      return true;
    }
    return false;
  }

  ondeath() {
    if (this.recharge) {
      this.recharging = !this.recharging;
      if (this.recharging) {
        this.dmglayers = [];
        this.hpmax = this.rechargedelay;
      } else {
        this.dmglayers = this.tdmglayers;
        this.hpmax = this.thpmax;
      }
    }
  }
}

class Explosion extends Entity {
  constructor(pos, source, rad, damage, duration=5) {
    super(pos, rad, 1);
    this.invincible = true;

    this.hitbox = CollisionShape.circle(0, this.rad, 12).points;
    
    this.bodydamage = damage/duration;
    this.bodyknockback = 0.5;

    switch(source == undefined ? MISC : source.layer) {
      case PLYR:
      case PLYR_P:
        this.layer = PLYR_P;
        this.dmglayers = [MISC, A, ENMY];
        break;
      case ENMY:
      case ENMY_P:
        this.layer = ENMY_P;
        this.dmglayers = [MISC, A, PLYR];
        break;
      case MISC:
        this.layer = MISC;
        this.dmglayers = [A, PLYR, ENMY];
        break;
    }
    this.deathexcolor = source == undefined ? "#000000" : source.deathexcolor;

    this.i = 0;
    this.id = duration;

    this.effects = [];

    this.source = source;
  }

  u2(_, __) {
    this.i++;
    if (this.i == 1) {
      this.explode(Math.ceil(this.rad/30), this.deathexcolor, this.pos, this.rad*2, this.rad*2, true);
    }
    return this.i > this.id;
  }

  oncollide(e) {
    this.effects.forEach(eff => e.addeffect(
      eff.name, ("dur" in eff ? eff.dur : 60)*3, ("stren" in eff ? eff.stren : 1)/3,
    ));
  }

  render() {
    ctx.save();
    const pos = camera.w2s(this.pos);
    const rad = camera.w2sl(this.rad);
    ctx.beginPath();
    ctx.fillStyle = this.i%2 == 0 ? "#ffffff" : this.deathexcolor;
    ctx.arc(pos.x, pos.y, rad, 0, 2*Math.PI);
    ctx.fill();
    ctx.restore();
  }
}

class Laser extends Entity {
  constructor(poff, source, doff, size, damage, delay, duration, color) {
    super(Point(), size, 1);
    this.invincible = true;

    this.hitbox = [];

    this.bodydamage = damage;

    switch(source.layer) {
      case PLYR:
      case PLYR_P:
        this.layer = PLYR_P;
        this.dmglayers = [MISC, A, ENMY];
        break;
      case ENMY:
      case PLYR_P:
        this.layer = ENMY_P;
        this.dmglayers = [MISC, A, PLYR];
        break;
    }

    this.poff = poff;
    this.doff = doff;

    this.endpos = this.pos;
    this.delay = delay;
    this.duration = duration;
    this.trans = 10;
    this.i = 0;
    this.damagei = 0;

    this.size = size;
    this.color = color;

    this.source = source;
  }

  u2(others, _) {
    const context = this;
    if (!this.source.ADDED && this.i < this.delay+this.duration+(2*this.trans)) {
      this.i = this.delay+this.duration+(2*this.trans);
    }
    this.dir = this.source.dir + this.doff;
    this.pos = this.source.pos.add(this.poff.rotate(this.dir));
    this.i++;
    var raycast = this.pos;
    while (1) {
      var dist = undefined;
      var nearest = undefined;
      others.forEach(function(e) {
        if (e == this) { return; }
        if (!context.dmglayers.includes(e.layer)) { return; }
        var d = Math.max(0, raycast.dist(e.pos) - e.rad);
        if (typeof(dist)!="number" || d < dist) { nearest = e; dist = d; }
      });
      raycast = raycast.add(Point.dir(this.dir, typeof(dist)=="number"?dist:100));
      if (raycast.dist(0) > game.size+R1) { this.endpos = raycast; break; }
      if (typeof(dist)=="number") {
        if (dist <= 5) {
          if (
            this.i>this.delay+(2*this.trans) &&
            this.i<this.delay+this.duration+(2*this.trans) &&
            this.damagei <= 0
          ) {
            this.damagei = 5;
            nearest.damagef(this);
          }
          this.endpos = raycast; break;
        }
      }
    }
    if (this.damagei > 0) { this.damagei--; }
    if (this.i>this.delay+(2*this.trans) && this.i<this.delay+this.duration+(2*this.trans)) {
      if (this.i % 5 == 0) {
        var e = this.explodeone(Math.random(), this.color, this.pos, this.rad*2.5, this.rad*5);
        e.delay = 0;
        var e = this.explodeone(Math.random(), this.color, this.endpos, this.rad*2.5, this.rad*5);
        e.delay = 0;
      }
    }
    return this.isover();
  }

  isover() {
    return this.i > this.delay+this.duration+(3*this.trans);
  }

  render() {
    const pos = camera.w2s(this.pos);
    const endpos = camera.w2s(this.endpos);
    ctx.save();
    ctx.lineJoin = ctx.lineCap = "round";
    if (this.i < this.delay+(1*this.trans)) {
      const p = this.i<this.delay ? (this.i/this.delay) : (1-((this.i-this.delay)/this.trans));
      ctx.globalAlpha = lerp(0, 0.5, p); ctx.strokeStyle = this.color;
      ctx.lineWidth = camera.w2sl(lerp(0.75, 1, p)*this.size);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y); ctx.lineTo(endpos.x, endpos.y);
      ctx.stroke();
    } else if (this.i < this.delay+this.duration+(3*this.trans)) {
      var p = 0;
      if (this.i < this.delay+(2*this.trans)) {
        p = (this.i - (this.delay+(2*this.trans))) / this.trans;
      } else if (this.i > this.delay+this.duration+(2*this.trans)) {
        p = 1 - ((this.i - (this.delay+this.duration+(2*this.trans))) / this.trans);
      } else { p = 1; }

      ctx.lineJoin = "round";
      
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y); ctx.lineTo(endpos.x, endpos.y);
      
      ctx.lineCap = "round";
      ctx.lineWidth = camera.w2sl(p*this.size); ctx.strokeStyle = this.color;
      ctx.stroke();
      if (!game.CRISP) {
        ctx.lineCap = "butt";
        ctx.lineWidth = camera.w2sl(p*2.5*this.size);
        ctx.strokeStyle = ctx.linearGradient(
          pos.add(Point.dir(90-this.dir,ctx.lineWidth/2)),
          pos.add(Point.dir(-90-this.dir,ctx.lineWidth/2)),
          {0:"rgba(255,0,0,0)",0.5:"#ff0000",1:"rgba(255,0,0,0)"}
        );
        ctx.stroke();
        PGlow.renderglow(this.pos, "#ff0000", camera.s2wl(ctx.lineWidth), 1);
        PGlow.renderglow(this.endpos, "#ff0000", camera.s2wl(ctx.lineWidth), 1);
      }

      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y); ctx.lineTo(endpos.x, endpos.y);

      ctx.lineCap = "round";
      ctx.lineWidth = camera.w2sl(p*0.5*this.size); ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      if (!game.CRISP) {
        ctx.lineCap = "butt";
        ctx.lineWidth = camera.w2sl(p*1*this.size);
        ctx.strokeStyle = ctx.linearGradient(
          pos.add(Point.dir(90-this.dir,ctx.lineWidth/2)),
          pos.add(Point.dir(-90-this.dir,ctx.lineWidth/2)),
          {0:"rgba(255,255,255,0)",0.5:"#ffffff",1:"rgba(255,255,255,0)"}
        );
        ctx.stroke();
        PGlow.renderglow(this.pos, "#ffffff", camera.s2wl(ctx.lineWidth), 1);
        PGlow.renderglow(this.endpos, "#ffffff", camera.s2wl(ctx.lineWidth), 1);
      }
    }
    ctx.restore();
  }

  onscreen() { return true; }
}

class Projectile extends Entity {
  constructor(pos, source, type, dir, speed) {
    super(pos, Projectile.rads[type-1], 1);
    this.applyborder = false;

    this.hitbox = CollisionShape.circle(0, this.rad, 4).points;

    this.bodydamage = Projectile.dmgs[type-1];

    this.dir = dir;
    this.speed = speed;

    switch(source.layer) {
      case PLYR:
      case PLYR_P:
        this.layer = PLYR_P;
        this.dmglayers = [MISC, A, ENMY];
        break;
      case ENMY:
      case ENMY_P:
        this.layer = ENMY_P;
        this.dmglayers = [MISC, A, PLYR];
        break;
    }

    this.deathex = 1;
    this.deathexp = 2;
    this.deathexcolor = source.deathexcolor;

    this.gainscore = true;
  
    this.rendertex = this.layer.toLowerCase()+type;

    this.type = type;

    switch(this.type) {
      case 1:
      case 3:
        playsound("shoot_1",this.pos,0.5);
        break;
      case 2:
        playsound("shoot_2",this.pos,0.5);
        playsound("explode_1",this.pos);
        break;
    }

    this.i = 0;

    this.effects = [];

    this.explosiondamage = 0;

    this.source = source;
  }

  static rads = [3, 5, 10];
  static dmgs = [1, 3, 5];

  u2(_, plyr) {
    this.move();
    this.dir = 180+this.vel.toward(0);
    switch(this.type) {
      case 3:
        this.renderscale = this.rad / Projectile.rads[this.type-1];
        break;
    }
    if (this.i > 0) { this.i--; }
    else {
      this.i = Math.randint(2,4);
      const context = this;
      var deathexcolor = this.deathexcolor;
      this.effects.forEach(function(eff) {
        var color = {
          poison: "#00ff00",
          fire: "#ff8800",
          slowness: "#888888",
          speed: "#888888",
          resistance: "#8800ff",
        }[eff.name];
        context.deathexcolor = color;
        context.deathexplode();
      });
      this.deathexcolor = deathexcolor;
    }
    return plyr!=undefined && this.pos.dist(plyr.pos) > R1;
  }

  oncollide(e) {
    this.effects.forEach(eff => e.addeffect(
      eff.name, "dur" in eff ? eff.dur : 60*3, "stren" in eff ? eff.stren : 1,
    ));
  }

  ondeath() {
    if (this.explosiondamage > 0) {
      var e = addentity(new Explosion(this.pos, this, this.rad*25, this.explosiondamage));
      e.effects = this.effects;
    }
  }

  rb2() {
    const pos = camera.w2s(this.pos);
    const endpos = pos.add(Point.dir(-this.dir, this.rad*2*this.vel.dist(0)));
    var transcolor = parsecolor(this.deathexcolor);
    transcolor[3] = 0;
    ctx.strokeStyle = ctx.linearGradient(
      pos, endpos,
      {0:this.deathexcolor,1:"rgba("+transcolor.join(",")+")"}
    );
    ctx.lineWidth = camera.w2sl(0.75*this.rad*2);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(endpos.x, endpos.y);
    ctx.stroke();
  }
}

class Missile extends Entity {
  constructor(pos, source, dir, speed) {
    super(pos, 15, 1);
    this.applyborder = false;

    this.hitbox = CollisionShape.circle(0, this.rad, 4).points;

    this.dir = dir;
    this.speed = 0.25;

    switch(source.layer) {
      case PLYR:
      case PLYR_P:
        this.layer = PLYR_P;
        this.dmglayers = [PLYR, MISC, A, ENMY];
        break;
      case ENMY:
      case ENMY_P:
        this.layer = ENMY_P;
        this.dmglayers = [MISC, A, PLYR];
        break;
    }

    this.deathex = 3;
    this.deathexp = 2;
    this.deathexcolor = source.deathexcolor;

    this.gainscore = true;
  
    this.rendertex = this.layer.toLowerCase().replace("_p","")+"_missile";

    this.i = 0;

    this.effects = [];

    this.explosiondamage = 0;

    this.truespeed = speed;
    this.speedi = this.speed;

    this.source = source;
  }

  u2(_, plyr) {
    this.move();
    this.dir = 180+this.vel.toward(0);
    if (this.i > 0) { this.i--; }
    else {
      this.i = Math.randint(2,4);
      const context = this;
      var deathexcolor = this.deathexcolor;
      this.effects.forEach(function(eff) {
        var color = {
          poison: "#00ff00",
          fire: "#ff8800",
          slowness: "#888888",
          speed: "#888888",
          resistance: "#8800ff",
        }[eff.name];
        context.deathexcolor = color;
        context.deathexplode();
      });
      this.deathexcolor = deathexcolor;
    }
    if (this.speedi < 3) { this.speedi *= 1.05; }
    this.speed = this.truespeed * this.speedi;
    return plyr!=undefined && this.pos.dist(plyr.pos) > R1;
  }

  oncollide(e) {
    this.effects.forEach(eff => e.addeffect(
      eff.name, "dur" in eff ? eff.dur : 60*3, "stren" in eff ? eff.stren : 1,
    ));
  }

  ondeath() {
    var e = addentity(new Explosion(this.pos, this, this.rad*25, this.explosiondamage));
    e.effects = this.effects;
  }

  rb2() {
    const pos = camera.w2s(this.pos);
    const endpos = pos.add(Point.dir(-this.dir, this.rad*2*this.vel.dist(0)));
    var transcolor = parsecolor(this.deathexcolor);
    transcolor[3] = 0;
    ctx.strokeStyle = ctx.linearGradient(
      pos, endpos,
      {0:this.deathexcolor,1:"rgba("+transcolor.join(",")+")"}
    );
    ctx.lineWidth = camera.w2sl(0.75*this.rad*2);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(endpos.x, endpos.y);
    ctx.stroke();
  }
}

class Unit extends Entity {
  constructor(pos, rad, hp, team) {
    super(pos, rad, hp);
    this.damagedisplay = true;
    
    switch(team) {
      case PLYR:
        this.layer = PLYR;
        this.collayers = [PLYR];
        this.dmglayers = [MISC, A, ENMY, ENMY_P];
        break;
      case ENMY:
        this.layer = ENMY;
        this.collayers = [ENMY];
        this.dmglayers = [MISC, A, PLYR, PLYR_P];
        break;
    }

    this.deathexp = 1.5;

    this.playhurtsound = true;
    this.playdeathsound = true;

    this.reloadi = 0;
    this.reloadnum = 0;
    this.reloadmax = 0;
    this.shooting = false;
  }

  u2(...args) {
    if (this.shooting) {
      if (this.reloadi > 0) {
        this.reloadi -= this.slownesseffect * this.speedeffect;
      } else {
        this.reloadi = 0;
        this.reloadnum++;
        if (this.reloadnum > this.reloadmax) { this.reloadnum = 1; }
        this.onshoot(this.reloadnum);
      }
    } else {
      if (this.reloadi > 0) { this.reloadi = 0; }
      if (this.reloadnum > 0) { this.reloadnum = 0; }
    }
    this.u3(...args);
  }
  u3() {}

  onshoot(n) {}
  createprojectile(dir, pos, speed, recoil, type) {
    dir += this.dir;
    this.recoil(dir+180, recoil);
    pos = this.pos.add(Point(pos).rotate(dir));
    return addentity(new Projectile(pos, this, type, dir, speed));
  }
  createmissile(dir, pos, speed, recoil) {
    dir += this.dir;
    this.recoil(dir+180, recoil);
    pos = this.pos.add(Point(pos).rotate(dir));
    return addentity(new Missile(pos, this, dir, speed));
  }
  createlaser(dir, pos, recoil, size, damage, delay, duration) {
    this.recoil(dir+180, recoil);
    return addentity(new Laser(Point(pos), this, dir, size, damage, delay, duration, this.deathexcolor));
  }
}

class Player extends Unit {
  constructor(pos) {
    super(pos, 30, 1000, PLYR);

    this.hitbox = [
      [-8,14],
      [-15,0],
      [-8,-14],
      [8,-14],
      [15,0],
      [8,14],
    ];
    
    this.damagemul = [1];
    
    this.speed = 0.5;

    this.reloadmax = 1;

    this.deathex = 10;
    this.deathexcolor = "#00ffff";
    
    this.gainscore = true;

    this.rendertex = "plyr_plyr";

    this.energy = 0;
    
    this.sheild = 0;


    this.bought = [];
    
    this.bullet_dmg = 1;
    this.explosiondmg = 0;
    this.bulleteffects = {};
    
    this.bullet_spd = 1;
    this.view = 0.75;

    this.reload_spd = 1;
    
    this.bullet_hp = 1;
    this.shieldres = 0.5;
    this.immunity = 0;
    this.heal = 0;
    this.shields = 0;
    this.shieldsl = [];
    this.shieldhp = 0;
    this.shieldrecharge = 0;
    this.shieldelectro = false;
    
    this.con = []; this.conlimit = 0;
    this.condrone = []; this.condronelimit = 0;
    this.conturret = []; this.conturretlimit = 0;
    this.conhp = 1;
    this.condmg = 1;
    this.turretbarrels = 1;
    this.turretview = 500;
    this.condelay = 0;
    this.condelaymax = 0;
    fadeout(game.condelaybar.canv);
  }

  u3(_, u, d, r, l, toward, m1, m2, k1, k2, k3, space) {
    if (u) { this.vel.y += this.speed; }
    if (d) { this.vel.y -= this.speed; }
    if (r) { this.vel.x += this.speed; }
    if (l) { this.vel.x -= this.speed; }
    
    this.dir = this.pos.toward(toward);
    this.shooting = m1;
    if (this.energy < 100) { this.energy++; }
    if (this.sheild > 0) { this.sheild--; }
    this.damagemul[0] = lerp(1, this.shieldres, this.sheild / 50);

    if (this.energy >= 100) {
      if (m2) {
        if (this.bought.includes("missile")) {
          this.energy = -100;
          this.reload = 30;
          var p = this.applyupgradesto(this.createmissile(0, Point(0,this.rad), 1.5*this.bullet_spd, 10), true);
          p.hp = 1;
          p.explosiondamage *= 5;
        }
      }
    }

    this.con = this.con.filter(e => e.ADDED);
    this.condrone = this.condrone.filter(e => e.ADDED);
    this.conturret = this.conturret.filter(e => e.ADDED);
    for (var i = 0; i < this.condrone.length; i++) {
      var e = this.condrone[i];
      if (this.pos.dist(e.pos) > 500) {
        e.knockbackd(e.pos.toward(this.pos), 0.001 * (this.pos.dist(e.pos) - 500));
      }
    }
    if (this.condelay > 0) { this.condelay--; }
    else {
      if (this.con.length < this.conlimit) {
        if ((k1 && this.bought.includes("drone")) || (k3 && this.bought.includes("o_drone"))) {
          if (this.condrone.length < this.condronelimit) {
            var e = addentity(new Enemy(this.pos, k3 ? "kronos_drone" : "drone", this.layer));
            e.source = this;
            this.con.push(e);
            this.condrone.push(e);
            this.condelay = 0.25*60;
            if (k3) {
              e.data.parent = this;
            }
            e.hpmax = Math.ceil(e.hpmax*this.conhp);
          }
        } else if (k2 && this.bought.includes("turret")) {
          if (this.conturret.length < this.conturretlimit) {
            var e = addentity(new Enemy(this.pos, "turret_base", this.layer));
            e.source = this;
            this.con.push(e);
            this.condrone.push(e);
            this.condelay = 0.25*60;
            e.hpmax = Math.ceil(e.hpmax*this.conhp);
            var e2 = addentity(new Enemy(e.pos, "turret", this.layer));
            e2.rad = e.rad*0.75;
            e2.bullet = 1;
            e2.data.parent = e; e2.data.offset = Point();
            e2.invincible = true;
            e2.data.reload = 30 * [1,1,1,8,3,0][e2.bullet-1];
            e2.data.speed = 1.5;
            if (this.bought.includes("ttriplet")) {
              e2.data.turrets = 3;
            } else if (this.bought.includes("ttwin")) {
              e2.data.turrets = 2;
            } else {
              e2.data.turrets = 1;
            }
          }
        }
      }
      this.condelaymax = Math.max(this.condelay, 1);
      if (this.condelaymax > 1) {
        fadein(game.condelaybar.canv);
      } else {
        fadeout(game.condelaybar.canv);
      }
    }
    if (this.condrone.length > 0) {
      var o = this.shieldsl.length > 0 ? 60 : 0;
      var o_drones = this.condrone.filter(e => e.type == "kronos_drone");
      var r = 6;
      for (var i = 0; i < Math.min(r,o_drones.length); i++) {
        var drone = o_drones[i];
        if (i > 0) {
          drone.data.orbitdir = o_drones[0].data.orbitdir + 360*((i-0)/Math.min(r,o_drones.length));
        }
        drone.data.orbit = this.rad+o+60; drone.data.orbitspin = 0.1;
      }
      for (var i = r; i < o_drones.length; i++) {
        var drone = o_drones[i];
        if (i > r) {
          drone.data.orbitdir = drone.data.orbitdir + 360*((i-r)/Math.min(16,o_drones.length-r));
        }
        drone.data.orbit = this.rad+o+120; drone.data.orbitspin = -0.2;
      }
    }

    if (this.shields > this.shieldsl.length) {
      this.shieldsl.push(addentity(new Shield(this, this.rad*5, 0)));
    }
    if (this.shieldsl.length > this.shields) {
      rementity(this.shieldsl.pop());
    }
    if (this.shieldsl.length > 0) {
      for (var i = 0; i < this.shieldsl.length; i++) {
        var shield = this.shieldsl[i];
        if (i > 0) {
          shield.orbitdir = this.shieldsl[0].orbitdir + 360*(i/this.shieldsl.length);
        }
        shield.orbit = this.rad+30; shield.orbitspin = -0.2;
        shield.recharge = true; shield.rechargedelay = this.shieldrecharge;
        shield.electric = this.shieldelectro;
        if (!shield.recharging && shield.hpmax != this.shieldhp) {
          shield.hpmax = this.shieldhp;
        }
      }
    }
  }

  applyupgradesto(p, isblast) {
    p.bodydamage *= this.bullet_dmg;
    p.explosiondamage = this.explosiondmg;
    p.hpmax = this.bullet_hp;
    var effects = {};
    for (var to in this.bulleteffects) {
      if (to == "BLAST") { if (!isblast) { continue; } }
      if (to == "NONBLAST") { if (blast) { continue; } }
      for (var name in this.bulleteffects[to]) {
        var eff = this.bulleteffects[to][name];
        if (!(name in effects)) { effects[name] = {dur: [0,0], stren: [0,0]}; }
        effects[name] = {
          dur: [Math.max(eff.dur[0], effects[name].dur[0]), Math.max(eff.dur[1], effects[name].dur[1])],
          stren: [Math.max(eff.stren[0], effects[name].stren[0]), Math.max(eff.stren[1], effects[name].stren[1])],
        };
      }
    }
    p.effects = [];
    for (var name in effects) {
      p.effects.push({
        name: name,
        dur: Math.randfloat(...effects[name].dur),
        stren: Math.randfloat(...effects[name].stren),
      });
    }
    return p;
  }

  onshoot(n) {
    this.reloadi = 7/this.reload_spd;
    var isblast = this.energy >= 100;
    if (isblast) { this.energy = 0; }
    this.sheild = isblast ? 50 : 25;
    const ptype = isblast ? (this.bought.includes("blast")?3:2) : 1;
    var p = this.applyupgradesto(this.createprojectile(0, Point(0,this.rad), 1.5*this.bullet_spd, isblast?8:4, ptype), isblast);

    if (isblast && this.bought.includes("blast")) { p.rad*=1.5; }
  }

  addbulleteffect(name, dur, stren, to) {
    const beff = this.bulleteffects;
    if (!(to in beff)) { beff[to] = {}; }
    const beffto = beff[to];
    if (!(name in beffto)) { beffto[name] = {dur: [0,0], stren: [0,0]}; }
    dur = Point(dur).get();
    stren = Point(stren).get();
    beffto[name].dur = [Math.max(beffto[name].dur[0], dur[0]), Math.max(beffto[name].dur[1], dur[1])];
    beffto[name].stren = [Math.max(beffto[name].stren[0], stren[0]), Math.max(beffto[name].stren[1], stren[1])];
  }

  r2() {
    ctx.save(); ctx.globalAlpha = this.sheild/50;
    DrawImage(textures["plyr_sh"], this.pos, this.dir);
    ctx.restore();
  }
}

class Enemy extends Unit {
  constructor(pos, type, team=ENMY) {
    const enemy = Enemy.enemies[type];
    
    super(pos, "rad" in enemy ? enemy.rad : PRECISION, "hp" in enemy?enemy.hp:0, team);

    this.type = type;

    this.hitbox = "hitbox" in enemy?enemy.hitbox:[];

    this.speed = "speed" in enemy?enemy.speed:0.5;

    this.reloadmax = "reloadmax" in enemy?enemy.reloadmax:0;

    this.deathex = "deathex" in enemy?enemy.deathex:0;

    this.score = "score" in enemy?enemy.score:0;
    this.exp = "exp" in enemy?enemy.exp:0;

    this._trendertex = undefined;
    this.rendertex = this.trendertex;

    this.dir = this.dirgoal = Math.randval(360);
    this.dirscroll = "dirscroll" in enemy ? enemy.dirscroll : 0;
    this.dirmaxscroll = "dirmaxscroll" in enemy ? enemy.dirmaxscroll : Inf;
    this.moving = true;

    if (enemy.bar != undefined) {
      if (enemy.bar.createbar) {
        this.bar = new BossBar(
          enemy.name.toUpperCase(),
          this.hpmax, this.deathexcolor, [400,30],
          "blocksat" in enemy.bar ? enemy.bar.blocksat : [],
        );
        this.bar.add();
      }
    }

    this.dotargeting = true;
    this.target = undefined;

    this.enemy = enemy;

    this.data = {};
    this.enemyinit();
  }

  get trendertex() {
    if (this._trendertex != undefined) { return this._trendertex; }
    return "enmy_" + this.type;
  }
  set trendertex(v) { this._trendertex = v; }
  gettrendertex() { return "enmy_" + this.type; }

  enemyinit() {
    var data = this.data;
    switch(this.type) {
      case "overseer":
        data.drones = [];
        break;
      case "serpent":
        data.g = new PGlow(0,"transparent",0,0);
        data.g.layer = -1;
        data.g.color = this.deathexcolor;
        addparticle(data.g);
        data.index = undefined;
        data.ishead = false;
        data.drones = [];
        break;
      case "laser":
        data.g = new PGlow(0,"transparent",0,0);
        data.g.layer = -1;
        data.g.color = this.deathexcolor;
        addparticle(data.g)
        data.laser = undefined;
        break;
      case "warship":
        data.laser = undefined;
        data.drones1 = [];
        data.drones2 = [];
        break;
      case "kronos":
        data.gl1 = [];
        for (var i = 0; i < 6; i++) {
          var g = new PGlow(0,"transparent",0,0);
          g.layer = -1;
          g.color = this.deathexcolor;
          g.alpha = 0.5;
          addparticle(g);
          data.gl1.push(g);
        }
        data.gl2 = [];
        for (var i = 0; i < 6; i++) {
          var g = new PGlow(0,"transparent",0,0);
          g.layer = 1;
          g.color = "#ffffff";
          g.alpha = 0.5;
          addparticle(g);
          data.gl2.push(g);
        }
        data.i = 0;
        data.dir = 0;
        data.created = false;
        break;
      case "kronos_shard":
        data.created = false;
        break;
      case "kronos_drone":
        data.parent = undefined;
        data.orbit = 0;
        data.orbitdir = data.orbitspin = 0;
        this.dotargeting = false;
        break;
      case "kronos_ram_drone":
        this.bodydamage = 3;
        this.trendertex = "enmy_kronos_drone";
        break;
      case "saw_bullet":
        this.applyborder = false;
        this.bodydamage = 3;
        this.dotargeting = false;
        break;
      case "grinder":
        data.i = 0;
        var e = addentity(new Enemy(this.pos, "saw", this.layer));
        e.data.parent = this; e.data.offset = Point(30,55); e.data.spin = -10;
        var e = addentity(new Enemy(this.pos, "saw", this.layer));
        e.data.parent = this; e.data.offset = Point(-30,55); e.data.spin = 10;
        break;
      case "saw":
        data.parent = undefined;
        data.offset = Point();
        data.spin = 0;
        this.invincible = true;
        this.collayers = this.collayers.filter(l => l!=this.layer);
        this.bodydamage = 5;
        this.trendertex = "enmy_saw_bullet";
        this.dotargeting = false;
        break;
      case "cameo_grinder":
        data.mode = 1;
        data.jump = 0;
        data.saw = undefined;
        break;
      case "electro":
        data.i = 0;
        data.pl = [
          new PLightning(this.pos, this.pos, this.deathexcolor, 10, Inf),
          new PLightning(this.pos, this.pos, this.deathexcolor, 10, Inf),
          new PLightning(this.pos, this.pos, this.deathexcolor, 10, Inf),
        ];
        data.pl.forEach(p => addparticle(p));
        break;
      case "asteroid_tanker":
        var e = addentity(new Enemy(this.pos, "asteroid_tank", this.layer));
        e.data.following = this;
        data.follower = e;
        break;
      case "asteroid_tank":
        data.following = undefined;
        this.dotargeting = false;
        break;
      case "black_hole":
        data.spin = 3;
        data.sucklayers = [A, PLYR, PLYR_P, ENMY, ENMY_P];
        data.lastsfor = Inf;
        this.layer = MISC;
        this.invincible = true;
        this.bodydamage = 5;
        this.dotargeting = false;
        break;
      case "vulcan":
        data.g = new PGlow(0,"transparent",0,0);
        data.g.layer = -1;
        data.g.color = this.deathexcolor;
        data.g.alpha = 0.5;
        addparticle(data.g);
        data.drones = [];
        for (var i = 0; i < 8; i++) {
          var e = addentity(new Enemy(Point.dir(360*(i/8), game.size-250), "healer_drone", this.layer));
          e.data.healing = this;
          e.data.healamount = 0.05;
          e.data.healrad = 2000;
        }
        break;
      case "vulcan_drone":
        data.g = new PGlow(0,"transparent",0,0);
        data.g.layer = -1;
        data.g.color = this.deathexcolor;
        data.g.alpha = 0.5;
        addparticle(data.g);
        break;
      case "healer_drone":
        data.g = new PGlow(0,"transparent",0,0);
        data.g.layer = -1;
        data.g.color = this.deathexcolor;
        data.g.alpha = 0.5;
        addparticle(data.g);
        data.healing = undefined;
        data.i = Math.randval(360);
        data.healamount = 0;
        data.healrad = 0;
        data.healp = 0;
        break;
      case "gunner_serpent":
        data.index = undefined;
        data.ishead = false;
        data.created = false;
        break;
      case "turret_base":
        break;
      case "turret":
        data.dirgoal = undefined;
        data.parent = undefined;
        data.offset = Point();
        data.reload = Inf; data.speed = 0;
        data.turrets = 0;
        data.bullet = 1;
        data.laser = undefined; data.damage = 0;
        data.i = 0;
        this.collayers = this.collayers.filter(l => l!=this.layer);
        break;
      case "bomber":
        data.close = false;
        data.shootr = 25;
        break;
      case "bomb":
        data.i = 0;
        data.damage = 0;
        data.delay = 0;
        data.shootr = 15;
        data.dir = Math.randval(360);
        this.dotargeting = false;
        break;
      case "aries":
        data.hp_prev = 0;
        data.dir = Math.randval(360);
        data.i = 0;
        data.dash = 0;
        data.dash_coll = false;
        for (var i = 0; i < 6; i++) {
          var e = addentity(new Enemy(this.pos, "saw", this.layer));
          e.data.parent = this;
          e.rad = 40;
          e.data.offset = Point.dir(360*((i+0.5)/6), this.rad);
          e.data.spin = 10;
        }
        this.bodydamage = 2;
        break;
      case "celestial":
        data.parent = undefined;
        data.layer = undefined;
        data.created = false;
        break;
    }
    this.data = data;
  }

  static enemies = ENEMIES;

  get olayer() {
    switch(this.layer) {
      case PLYR:
        return ENMY;
      case ENMY:
        return PLYR;
    }
    return MISC;
  }

  get deathexcolor() {
    switch(this.layer) {
      case PLYR:
        return "#00ffff";
      case ENMY:
        return "#ff0000";
    }
    return "#000000";
  }
  set deathexcolor(_) {}

  u3(others, plyr) {
    switch(this.layer) {
      case PLYR:
        this.rendertex = this.trendertex+"_plyr";
        break;
      case ENMY:
        this.rendertex = this.trendertex;
        break;
    }

    var targ = this.target;
    if (this.dotargeting) {
      const layer = this.layer;
      const olayer = this.olayer;
      const pos = this.pos;
      if (game.layers[olayer] != undefined) {
        if (game.layers[olayer].length > Inf) {
          const chunkpos = this.pos.div(game.chunksize).round();
          const chunk = this.chunk;
          var has = false;
          if (chunk != undefined) {
            if ("nearest" in chunk) {
              if (olayer in chunk["nearest"]) {
                targ = chunk["nearest"][olayer];
                has = true;
              }
            }
          }
          if (!has) {
            for (var r = 0; r < (game.size/game.chunksize)+5; r++) {
              const chunkscan = [];
              if (r == 0) { chunkscan.push(chunkpos.x+","+chunkpos.y); }
              else {
                for (var i = -r; i <= r; i++) {
                  chunkscan.push((chunkpos.x+i)+","+(chunkpos.y+r));
                  chunkscan.push((chunkpos.x+i)+","+(chunkpos.y-r));
                  chunkscan.push((chunkpos.x+r)+","+(chunkpos.y+i));
                  chunkscan.push((chunkpos.x-r)+","+(chunkpos.y+i));
                }
              }
              chunkscan.forEach(function(ch) {
                if (ch in game.chunks) {
                  if (olayer in game.chunks[ch]) {
                    var nd = Inf;
                    game.chunks[ch][olayer].forEach(function(e) {
                      if (!e.candamagewith(layer)) { return; }
                      const d = pos.dist(e.pos);
                      if (d < nd) {
                        nd = d;
                        targ = e;
                      }
                    });
                  }
                }
              });
              if (targ != undefined) { break; }
            }
            if (chunk != undefined) {
              if (!("nearest" in chunk)) { chunk["nearest"] = {}; }
              chunk["nearest"][olayer] = targ;
            }
          }
        } else {
          var nd = Inf;
          game.layers[olayer].forEach(function(e) {
            const d = pos.dist(e.pos);
            if (d < nd) {
              nd = d;
              targ = e;
            }
          });
        }
      }
    }
    
    this.moving = targ != undefined;
    this.shooting = this.moving && this.pos.dist(targ.pos) <= R2;
    if (this.moving) { this.dirgoal = this.pos.toward(targ.pos); }

    this.enemyu(others, targ, plyr);

    var rel = anglerel(this.dir, this.dirgoal);
    if (Math.abs(rel) > 0) {
      if (Math.abs(rel) > PRECISION) {
        this.dir += Math.sign(rel)*Math.min(this.dirmaxscroll,Math.abs(rel))*((this.slownesseffect * this.speedeffect) ** 2)*this.dirscroll;
      } else {
        this.dir = this.dirgoal;
      }
    }
    if (this.moving) { this.move(); }
  }

  enemyu(others, targ, plyr) {
    switch(this.type) {
      case "overseer":
        this.data.drones = this.data.drones.filter(e => e.ADDED);
        break;
      case "serpent":
        this.data.drones = this.data.drones.filter(e => e.ADDED);
        var chain = others.filter(e => e!=this && e.layer==this.layer && e.type==this.type);
        if (this.data.index == undefined) {
          var data = this.data;
          data.index = 0;
          chain.forEach(function(e) {
            if (e.data.index > data.index) {
              data.index = e.data.index;
            }
          });
          this.data.index++;
        } else {
          var g = this.data.g;
          var following = chain.find(e => e.data.index == this.data.index-1);
          this.data.ishead = following == undefined;
          this.dirscroll = this.enemy.dirscroll * (this.data.ishead ? 2 : 1);
          if (this.data.ishead) {
            this.speed = 0.5;
            this._trendertex = "h";
            this.rad = 40;
            g.pos = this.pos;
            g.rad = 50;
            g.alpha = 1;
          } else {
            this.dirgoal = this.pos.toward(following.pos);
            this.speed = Math.min(2.5, 0.01*this.pos.dist(following.pos));
            this.moving = this.pos.dist(following.pos) - (25+40) > 0;
            this.rad = 25;
            if (chain.some(e => e.data.index == this.data.index+1)) {
              this._trendertex = "b";
              g.pos = this.pos;
              g.rad = this.rad;
              g.alpha = 0;
            } else {
              this._trendertex = "t";
              g.pos = this.pos.add(Point.dir(this.dir+180, 35));
              g.rad = 30;
              g.alpha = 1;
            }
          }
          this.trendertex = this.gettrendertex() + "_" + this._trendertex;
        }
        break;
      case "laser":
        var g = this.data.g;
        g.pos = this.pos.add(Point.dir(this.dir+180, 30));
        g.rad = 30;
        g.alpha = 0.5;
        var shooting = this.data.laser != undefined;
        this.moving = this.moving && (this.tracking = !shooting);
        this.trendertex = this.gettrendertex() + (shooting ? "_o" : "");
        this.dirscroll = this.enemy.dirscroll * (shooting ? 0.5 : 1);
        if (shooting) {
          if (this.data.laser.isover()) {
            this.data.laser = undefined;
          }
        }
        break;
      case "warship":
        this.data.drones1 = this.data.drones1.filter(e => e.ADDED);
        this.data.drones2 = this.data.drones2.filter(e => e.ADDED);
        var shooting = this.data.laser != undefined;
        this.dirscroll = this.enemy.dirscroll * (shooting ? 0.5 : 1);
        if (shooting) {
          if (this.data.laser.isover()) {
            this.data.laser = undefined;
          }
        }
        break;
      case "kronos":
        if (!this.data.created) {
          this.data.created = true;
          for (var i = 0; i < 20; i++) {
            var e = addentity(new Enemy(this.pos, "kronos_drone", this.layer));
            e.data.parent = this;
            e.data.orbit = this.rad+60+Math.randfloat(-10,10);
            e.data.orbitdir = 360*(i/20); e.data.orbitspin = -0.25;
          }
          for (var i = 0; i < 36; i++) {
            var e = addentity(new Enemy(this.pos, "kronos_drone", this.layer));
            e.data.parent = this;
            e.data.orbit = this.rad+120+Math.randfloat(-10,10);
            e.data.orbitdir = 360*(i/36); e.data.orbitspin = 0.5;
          }
        }
        this.data.dir += 0.1;
        this.renderdir = this.data.dir - this.dir;
        this.data.i++;
        for (var i = 0; i < 6; i++) {
          var p = this.data.gl1[i];
          p.pos = this.pos.add(Point.dir(this.data.dir+(360*((i+0.5)/6)), 55));
          p.rad = 50 * ((1+sin(360*((this.data.i/60)+(i/6))))/2);
        }
        for (var i = 0; i < 6; i++) {
          var p = this.data.gl2[i];
          p.pos = this.pos.add(Point.dir(this.data.dir+(360*((i+0.5)/6)), 55));
          p.rad = 20 * ((1+sin(360*((this.data.i/60)+(i/6))))/2);
        }
        break;
      case "kronos_shard":
        if (!this.data.created) {
          this.data.created = true;
          for (var i = 0; i < 9; i++) {
            var e = addentity(new Enemy(this.pos, "kronos_drone", this.layer));
            e.data.parent = this;
            e.data.orbit = this.rad+60+Math.randfloat(-10,10);
            e.data.orbitdir = 360*(i/9); e.data.orbitspin = 0.25;
          }
        }
        var shooting = this.data.laser != undefined;
        this.dirscroll = this.enemy.dirscroll * (shooting ? 0.5 : 1);
        if (shooting) {
          if (this.data.laser.isover()) {
            this.data.laser = undefined;
          }
        }
        break;
      case "kronos_drone":
        var parent = this.data.parent;
        this.source = parent;
        if (parent == undefined || !parent.ADDED) {
          this.lastdamaged = undefined;
          this.hp = 0;
          break;
        }
        this.shooting = parent.shooting;
        var goal = parent.pos.add(Point.dir(this.data.orbitdir, this.data.orbit));
        this.dirgoal = this.pos.toward(goal);
        this.speed = Math.max(0.25, 0.01*this.pos.dist(goal));
        this.moving = this.pos.dist(goal) > 2.5;
        this.renderdir = this.pos.toward(parent.pos)+180 - this.dir;
        this.data.orbitdir += this.data.orbitspin;
        break;
      case "kronos_ram_drone":
        if (targ == undefined) { this.hp = 0; }
        break;
      case "saw_bullet":
        this.moving = true;
        this.renderscale = this.rad / (this.enemy.rad/2);
        this.renderdir += 5;
        this.hitbox = CollisionShape.circle(0, this.rad, 6).points;
        break;
      case "grinder":
        this.data.i++;
        if (this.data.i > 3) {
          var e = this.explodeone(Math.random(), this.deathexcolor, this.pos.add(Point.dir(this.dir,75)), 25, 50);
          e.delay = 0;
          e.id = Math.randint(10,15);
          this.data.i = 0;
        }
        break;
      case "saw":
        var parent = this.data.parent;
        this.source = parent;
        if (!parent.ADDED) {
          this.lastdamaged = undefined;
          this.hp = 0;
          break;
        }
        this.dirgoal = parent.dirgoal;
        this.renderscale = this.rad / (this.enemy.rad/2);
        this.renderdir += this.data.spin;
        this.pos = parent.pos.add(this.data.offset.rotate(parent.dir+parent.renderdir));
        this.hitbox = CollisionShape.circle(0, this.rad, 6).points;
        break;
      case "cameo_grinder":
        switch(this.data.mode) {
          case 1:
            this.invincible = true;
            if (this.data.saw != undefined) { this.data.saw.hp = 0; }
            this.trendertex = "a_2";
            this.renderdir += Asteroid.spins[1];
            this.speed = 0.05;
            if (targ != undefined && this.pos.dist(targ.pos) < 100) {
              this.data.jump = 60;
              this.renderdir = 0;
              this.data.mode = 2;
              var e = addentity(new Enemy(this.pos, "saw", this.layer));
              e.data.parent = this; e.data.offset = Point(0,50); e.data.spin = 10;
              this.data.saw = e;
            }
            break;
          case 2:
            this.invincible = false;
            this.trendertex = undefined;
            if (this.data.jump > 0) { this.data.jump--; }
            this.speed = this.enemy.speed*lerp(1,5,this.data.jump/60);
            if (targ != undefined && this.pos.dist(targ.pos) > R1) {
              this.data.mode = 1;
            }
            break;
        }
        break;
      case "electro":
        var n = undefined;
        var nd = Inf;
        for (var i = 0; i < others.length; i++) {
          if (this == others[i]) { continue; }
          if (
            this.candamagewith(others[i].layer) && others[i].candamagewith(this.layer) &&
            ![PLYR_P, ENMY_P].includes(others[i].layer)
          ) {
            var d = this.pos.dist(others[i].pos) - (others[i].rad+this.rad);
            if (d < nd) {
              nd = d;
              n = others[i];
            }
          }
        }
        var pos = this.pos.add(Point.dir(this.dir, 75));
        var pos1 = pos.add(Point.dir(this.dir+90, 25));
        var pos2 = pos.add(Point.dir(this.dir-90, 25));
        var pl = this.data.pl;
        if (nd < 100) {
          pl[2].show = false;
          pl[0].show = pl[1].show = true;
          pl[0].pos1 = pos1;
          pl[1].pos2 = pos2;
          pl[0].pos2 = Point.scaledist2p(n.pos, pos1, n.rad);
          pl[1].pos1 = Point.scaledist2p(n.pos, pos2, n.rad);
          if (this.data.i <= 0) {
            n.lastdamaged = this;
            n.damage(1);
            n.knockbackd(pos.toward(n.pos), 2.5);
            this.data.i = 3;
            var e = this.explodeone(Math.random(), this.deathexcolor, n.pos, 25, 50);
            e.delay = 0;
          }
        } else {
          pl[0].show = pl[1].show = false;
          pl[2].show = true;
          pl[2].pos1 = pos1;
          pl[2].pos2 = pos2;
        }
        if (this.data.i > 0) { this.data.i--; }
        break;
      case "asteroid_tanker":
        if (this.data.follower != undefined && !this.data.follower.ADDED) {
          this.data.follower = undefined;
        }
        break;
      case "asteroid_tank":
        if (this.data.following != undefined) {
          this.dirgoal = this.pos.toward(this.data.following.pos);
          const d = this.pos.dist(this.data.following.pos); var p = 0;
          const dgoal = this.rad + this.data.following.rad + 75;
          if (d < dgoal-30) { p = 0; }
          else if (d < dgoal) { p = (d-(dgoal-30)) / 30; }
          else { p = d / dgoal; }
          this.speed = Math.min(1.5, this.enemy.speed*p);
          if (!this.data.following.ADDED) {
            this.data.following = undefined;
          }
        }
        this.moving = this.data.following != undefined;
        if (!this.moving) { this.dirgoal = this.dir; }
        break;
      case "black_hole":
        var context = this;
        this.dirgoal = 0;
        this.renderscale = this.rad / (this.enemy.rad/2);
        this.renderdir += this.data.spin;
        this.dmglayers = this.data.sucklayers;
        others.forEach(function(e) {
          if (e == context) { return; }
          if (context.data.sucklayers.includes(e.layer)) {
            const d = e.pos.dist(context.pos);
            if (d < R1*(context.rad/37.5)) {
              e.knockbackd(e.pos.toward(context.pos), 0.25*Math.min(5, (R1*(context.rad/37.5))/d));
            }
          }
        });
        this.hitbox = CollisionShape.circle(0, this.rad, 12).points;
        break;
      case "vulcan":
        this.data.drones = this.data.drones.filter(e => e.ADDED);
        var g = this.data.g;
        g.pos = this.pos.add(Point.dir(this.dir+180, 85));
        g.rad = 50;
        break;
      case "vulcan_drone":
        var g = this.data.g;
        g.pos = this.pos.add(Point.dir(this.dir+180, 25));
        g.rad = 30;
        break;
      case "healer_drone":
        if (targ != undefined && this.pos.dist(targ.pos)) {
          this.dirgoal += 180;
          this.moving = true;
        } else {
          this.dirgoal = this.dir;
          this.moving = false;
        }
        if (this.data.healing == undefined || !this.data.healing.ADDED) {
          this.lastdamaged = undefined;
          this.hp = 0;
          break;
        }
        var d = this.pos.dist(this.data.healing.pos);
        this.data.healp = 0;
        if (d < this.data.healrad) {
          if (d > this.data.healrad*0.5) {
            this.data.healp = 1 - ((d - (this.data.healrad*0.5)) / (this.data.healrad*0.5));
          } else {
            this.data.healp = 1;
          }
        }
        this.data.healing.hp += this.data.healamount * this.data.healp;
        this.data.i += 0.1;
        var g = this.data.g;
        g.pos = this.pos.add(Point.dir(this.dir+180, 15));
        g.rad = 20;
        break;
      case "gunner_serpent":
        var chain = others.filter(e => e!=this && e.layer==this.layer && e.type==this.type);
        if (this.data.index == undefined) {
          var data = this.data;
          data.index = 0;
          chain.forEach(function(e) {
            if (e.data.index > data.index) {
              data.index = e.data.index;
            }
          });
          this.data.index++;
        } else {
          var following = chain.find(e => e.data.index == this.data.index-1);
          this.data.ishead = following == undefined;
          this.dirscroll = this.enemy.dirscroll * (this.data.ishead ? 0.1 : 1);
          if (this.data.ishead) {
            this.speed = 0.5;
            this._trendertex = "h";
          } else {
            this.dirgoal = this.pos.toward(following.pos);
            this.speed = Math.min(2.5, 0.01*this.pos.dist(following.pos));
            this.moving = this.pos.dist(following.pos) > this.rad*2;
            if (chain.some(e => e.data.index == this.data.index+1)) { this._trendertex = "b";  }
            else { this._trendertex = "t"; }
          }
          this.trendertex = this.gettrendertex() + "_" + this._trendertex;
        }
        if (!this.data.created) {
          this.data.created = true;
          var e = addentity(new Enemy(this.pos, "turret", this.layer));
          e.bullet = 6;
          e.data.parent = this; e.data.offset = Point();
          e.invincible = true; e.data.turrets = 1;
          e.data.reload = 15 * [1,1,1,8,3,0][e.bullet-1];
          e.data.damage = 1; e.data.speed = 1.5;
        }
        break;
      case "turret":
        var parent = this.data.parent;
        this.source = parent;
        if (parent == undefined || !parent.ADDED) {
          this.lastdamaged = undefined;
          this.hp = 0;
          break;
        }
        // this.shooting = false;
        this.bullet = Math.max(1, Math.min(6, this.bullet));
        this.renderscale = this.rad / (this.enemy.rad/2);
        this.reloadmax = Math.max(0, Math.min([4,4,2,1,1,1][this.bullet-1], this.data.turrets));
        this.trendertex = this.gettrendertex() + (this.reloadmax > 0 ? ("_"+this.bullet+"_"+this.reloadmax) : "");
        this.dirgoal = this.data.dirgoal == undefined ? this.dirgoal : (parent.dir+parent.renderdir+this.data.dirgoal);
        this.pos = parent.pos.add(this.data.offset.rotate(parent.dir+parent.renderdir));
        var shooting = this.data.laser != undefined;
        this.dirscroll = this.enemy.dirscroll * (shooting ? 0.01 : 1);
        if (shooting) {
          if (this.data.laser.isover()) {
            this.data.laser = undefined;
          }
        }
        this.hitbox = CollisionShape.circle(0, this.rad, 6).points;
        var pl = this.data.pl;
        if (this.bullet == 6) {
          if (pl == undefined) {
            pl = [
              new PLightning(0, 0, this.deathexcolor, 0, Inf),
              new PLightning(0, 0, this.deathexcolor, 0, Inf),
              new PLightning(0, 0, this.deathexcolor, 0, Inf),
            ];
            pl.forEach(p => addparticle(p));
          }
          var n = undefined;
          var nd = Inf;
          for (var i = 0; i < others.length; i++) {
            if (this == others[i]) { continue; }
            if (
              this.candamagewith(others[i].layer) && others[i].candamagewith(this.layer) &&
              ![PLYR_P, ENMY_P].includes(others[i].layer)
            ) {
              var d = this.pos.dist(others[i].pos) - (others[i].rad+this.rad);
              if (d < nd) {
                nd = d;
                n = others[i];
              }
            }
          }
          var pos = this.pos.add(Point.dir(this.dir, 35));
          var pos1 = pos.add(Point.dir(this.dir-90, 15));
          var pos2 = pos.add(Point.dir(this.dir+90, 15));
          if (nd < this.rad*6) {
            pl[2].show = false;
            pl[0].show = pl[1].show = true;
            pl[0].pos1 = pos1;
            pl[1].pos2 = pos2;
            pl[0].pos2 = Point.scaledist2p(n.pos, pos1, n.rad);
            pl[1].pos1 = Point.scaledist2p(n.pos, pos2, n.rad);
            if (this.data.i <= 0) {
              n.lastdamaged = this;
              n.damage(this.data.damage);
              n.knockbackd(pos.toward(n.pos), 2.5);
              this.data.i = 3;
              var e = this.explodeone(Math.random(), this.deathexcolor, n.pos, 25, 50);
              e.delay = 0;
            }
          } else {
            pl[0].show = pl[1].show = false;
            pl[2].show = true;
            pl[2].pos1 = pos1;
            pl[2].pos2 = pos2;
          }
          var size = this.rad*0.25;
          pl.forEach(p => p.size = size);
        } else {
          if (pl != undefined) {
            pl.forEach(p => p.id = 0);
            pl = undefined;
          }
        }
        this.data.pl = pl;
        if (this.data.i > 0) { this.data.i--; }
        break;
      case "bomber":
        this.data.close = targ != undefined && this.pos.dist(targ.pos) < 200;
        break;
      case "bomb":
        this.renderdir = this.data.dir - this.dir;
        this.renderscale = this.rad / (this.enemy.rad/2);
        this.data.dir += 30*this.vel.dist(0);
        this.data.i++;
        this.trendertex = this.gettrendertex() + "_" + (1+Math.floor(this.data.i / lerp(15,3,this.data.i/this.data.delay)).mod(2));
        if (this.data.i > this.data.delay) {
          this.lastdamaged = undefined;
          this.hp = 0;
        }
        break;
      case "aries":
        const hpchange = this.data.hp_prev != this.hp;
        if (hpchange) { this.data.hp_prev = this.hp; }
        this.data.i++;
        if (this.data.i > 5*60) {
          this.data.i = 0;
          this.data.dash = 60; this.data.dash_coll = false;
        }
        if (this.data.dash > 0) {
          this.data.dash--;
          if (hpchange) { this.data.dash_coll = true; }
          if (this.data.dash <= 0) {
            if (!this.data.dash_coll) {
              for (var i = 0; i < 6; i++) {
                var d = this.dir+this.renderdir+(360*((i+0.5)/6));
                var e = addentity(new Enemy(this.pos.add(Point.dir(d, this.rad+25)), "saw_bullet", this.layer));
                e.source = this;
                e.dir = d;
                e.rad = 40;
              }
            }
          }
        }
        this.speed = this.enemy.speed*lerp(1,25,this.data.dash/60);
        this.data.dir = (this.data.dir + 0.25*(this.vel.dist(0)/(this.enemy.speed*5))).mod(360)
        this.renderdir = this.data.dir - this.dir;
        this.hitbox = CollisionShape.circle(0, this.rad, 12).points;
        break;
      case "celestial_spawn":
        this.pos = Point();
        this.dmglayers = this.collayers = [];
        this.hp--;
        var php = this.hp / this.hpmax;
        var p = lerp(0, 0.25, (1+sin(360*10*php))/2);
        var c1 = [0,0,50];
        var c2 = [255,0,0];
        var c = [lerp(c1[0], c2[0], p), lerp(c1[1], c2[1], p), lerp(c1[2], c2[2], p)];
        CANVASES["BG"].style.background = "rgb(" + c.join(",") + ")";
        this.rad = this.enemy.rad*sin(90*(1-php));
        if (this.hp == 1) {
          var e = addentity(new Enemy(this.pos, "celestial", this.layer));
          e.data.layer = 3;
        }
        break;
      case "celestial":
        var parent = this.data.parent;
        this.source = parent;
        this.dir += 0.05*(this.data.layer % 2 == 0 ? 1 : -1);
        this.trendertex = this.gettrendertex() + "_" + this.data.layer;
        this.rad = [100,175,290,70][this.data.layer-1] / 2;
        this.deathex = [0,0,50,15][this.data.layer-1];
        if (!this.data.created) {
          this.data.created = true;
          if (this.data.layer < 4 && this.data.layer > 1) {
            var e = addentity(new Enemy(this.pos, "celestial", this.layer));
            e.data.layer = this.data.layer - 1;
            e.data.parent = this;
            e.collayers = e.collayers.filter(l => l != ENMY);
            e.invincible = true;
          }
          switch(this.data.layer) {
            case 1:
              this.hitbox = CollisionShape.circle(0, 61, 6).points;
              this.data.turrets = [];
              for (var i = 0; i < 6; i++) {
                var e = addentity(new Enemy(this.pos, "turret", this.layer));
                e.rad = 15;
                e.enemy.dirscroll = 0.1;
                e.dirmaxscroll = 1.5;
                e.data.parent = this; e.data.offset = Point.dir(360*(i/6),this.rad);
                e.invincible = true; e.data.turrets = 4; e.data.reload = 25; e.data.speed = 2;
                e.bullet = 1;
                e.dir = 360*(i/6);
                this.data.turrets.push(e);
              }
              var e = addentity(new Enemy(this.pos, "turret", this.layer));
              e.rad = 35;
              e.enemy.dirscroll = 0.5;
              e.data.parent = this; e.data.offset = Point();
              e.invincible = true; e.data.turrets = 1; e.data.reload = 5*60;
              e.bullet = 4; e.data.damage = 10;
              break;
            case 2:
              this.hitbox = CollisionShape.circle(0, 103, 6).points;
              this.data.turrets = [];
              for (var i = 0; i < 12; i++) {
                var e = addentity(new Enemy(this.pos, "turret", this.layer));
                var on = i % 2 == 0;
                e.rad = on ? 15 : 25;
                e.enemy.dirscroll = 0.1;
                e.dirmaxscroll = 1.5;
                e.data.parent = this;
                e.data.offset = Point.dir(
                  360*(i/12),
                  this.rad*(on ? 1 : Math.sqrt(3)/2) + (on ? 10 : -10)
                );
                e.invincible = true; e.data.turrets = on ? 3 : 2;
                e.data.reload = 15; e.data.speed = on ? 1.5 : 2;
                e.bullet = on ? 1 : 3;
                e.dir = 360*(i/12);
                this.data.turrets.push(e);
              }
              break;
            case 3:
              this.hitbox = CollisionShape.circle(0, 148, 6, 60).points;
              for (var i = 0; i < 12; i++) {
                if (i % 2 == 1) {
                  var e1 = addentity(new Enemy(this.pos, "turret", this.layer));
                  e1.rad = 25;
                  e1.enemy.dirscroll = 0.1;
                  e1.dirmaxscroll = 1;
                  e1.data.parent = this; e1.data.offset = Point.dir(360*(i/12),155);
                  e1.data.turrets = 3; e1.data.reload = 15; e1.data.speed = 3;
                  e1.hpmax = 250;
                  e1.bullet = 2;
                  e1.dir = 360*(i/12);
                  var e2 = addentity(new Enemy(this.pos, "turret", this.layer));
                  e2.rad = 15;
                  e2.enemy.dirscroll = 1;
                  e2.dirmaxscroll = 5;
                  e2.data.parent = e1; e2.data.offset = Point();
                  e2.invincible = true; e2.data.turrets = 3; e2.data.reload = 15; e2.data.speed = 2;
                  e2.bullet = 1;
                  e2.dir = 360*(i/12);
                } else {
                  var e1 = addentity(new Enemy(this.pos, "turret", this.layer));
                  var e2 = addentity(new Enemy(this.pos, "turret", this.layer));
                  e1.rad = e2.rad = 15;
                  e1.enemy.dirscroll = e2.enemy.dirscroll = 1;
                  e1.data.parent = e2.data.parent = this;
                  e1.data.offset = Point(20,105).rotate(360*(i/12));
                  e2.data.offset = Point(-20,105).rotate(360*(i/12));
                  e1.invincible = e2.invincible = true;
                  e1.data.turrets = e2.data.turrets = 4;
                  e1.data.reload = e2.data.reload = 15;
                  e1.data.speed = e2.data.speed = 1.5;
                  e1.bullet = e2.bullet = 1;
                  e1.dir = e2.dir = e1.data.dirgoal = e2.data.dirgoal = 360*(i/12);
                }
              }
              for (var i = 0; i < 15; i++) {
                var e = addentity(new Shield(this, 135, 0));
                e.orbit = 325;
                e.orbitdir = 360*(i/15);
                e.orbitspin = -0.1;
                e.hpmax = 500;
              }
              for (var i = 0; i < 20; i++) {
                var e = addentity(new Shield(this, 135, 0));
                e.orbit = 400;
                e.orbitdir = 360*(i/20);
                e.orbitspin = 0.2;
                e.hpmax = 100;
              }
              for (var i = 0; i < 6; i++) {
                var e = addentity(new Enemy(this.pos, "celestial", this.layer));
                e.invincible = false;
                e.hpmax = 1000;
                e.score = 100;
                e.exp = 0;
                e.data.layer = 4;
                e.data.parent = this;
                e.collayers = e.collayers.filter(l => l != ENMY);
                e.data.orbit = 275;
                e.data.orbitdir = 360*(i/6);
                e.data.orbitspin = 0.1;
              }
              break;
            case 4:
              this.hitbox = CollisionShape.circle(0, 40, 6).points;
              for (var i = -1; i <= 1; i++) {
                var e = addentity(new Enemy(this.pos, "turret", this.layer));
                e.rad = 10;
                e.enemy.dirscroll = 1;
                e.data.parent = this; e.data.offset = Point.dir(60*i,35);
                e.data.turrets = 3; e.data.reload = 20; e.data.speed = 2.5;
                e.hpmax = 100;
                e.bullet = 1;
                e.dir = e.data.dirgoal = 60*i;
              }
              var e = addentity(new Enemy(this.pos, "turret", this.layer));
              e.rad = 25;
              e.enemy.dirscroll = 0.5;
              e.data.parent = this; e.data.offset = Point();
              e.invincible = true; e.data.turrets = 1; e.data.reload = 60*7.5;
              e.bullet = 4; e.data.damage = 5;
              e.dir = this.dir;
              break;
          }
        }
        if (parent == undefined) {
          if (this.pos.dist(0) < 2) {
            this.pos = Point();
          } else {
            this.vel = Point().sub(this.pos).mul(1/this.pos.dist(0));
          }
        } else {
          if (this.data.layer < 4) { this.pos = parent.pos; }
          if (!parent.ADDED) {
            this.lastdamaged = undefined;
            this.hp = 0;
          }
        }
        switch(this.data.layer) {
          case 1:
            for (var i = 0; i < 6; i++) {
              var turr = this.data.turrets[i];
              var dirg = (360*(i/6)) + this.dir + this.renderdir;
              var rel = anglerel(turr.dir, dirg);
              rel = Math.sign(rel)*Math.min(120,Math.abs(rel));
              turr.dir = (dirg - rel).mod(360);
            }
            break;
          case 2:
            for (var i = 0; i < 12; i++) {
              var on = i % 2 == 0;
              var turr = this.data.turrets[i];
              var dirg = (360*(i/12)) + this.dir + this.renderdir;
              var rel = anglerel(turr.dir, dirg);
              rel = Math.sign(rel)*Math.min(on ? 60 : 45,Math.abs(rel));
              turr.dir = (dirg - rel).mod(360);
            }
            break;
          case 4:
            var parent = this.data.parent;
            this.source = parent;
            if (parent == undefined || !parent.ADDED) {
              this.lastdamaged = undefined;
              this.hp = 0;
              break;
            }
            this.shooting = parent.shooting;
            var goal = parent.pos.add(Point.dir(this.data.orbitdir, this.data.orbit));
            this.dir = this.pos.toward(goal);
            this.speed = Math.max(0.25, 0.01*this.pos.dist(goal));
            this.moving = this.pos.dist(goal) > 2.5;
            this.renderdir = this.pos.toward(parent.pos)+180 - this.dir;
            this.data.orbitdir += this.data.orbitspin;
            break;
        }
        break;
    }
  }

  onshoot(n) {
    switch(this.type) {
      case "basic":
        if (n < 4) {
          this.createprojectile(0, Point(0,20), 0.75, 2, 1);
          this.reloadi = 15;
        } else {
          this.createprojectile(0, Point(0,20), 0.75, 4, 2);
          this.reloadi = 30;
        }
        break;
      case "glider":
        this.reloadi = 20;
        if (n == 1) { this.createprojectile(0, Point(50,20), 1, 2, 1); }
        else { this.createprojectile(0, Point(-50,20), 1, 2, 1); }
        break;
      case "overseer":
        this.reloadi = 45;
        if (this.data.drones.length < 8) {
          var e = addentity(new Enemy(this.pos.add(Point.dir(this.dir,5)), "drone", this.layer));
          e.source = this;
          this.data.drones.push(e);
        }
        break;
      case "drone":
        this.reloadi = 30;
        this.createprojectile(0, Point(0,10), 0.75, 1, 1);
        break;
      case "tank":
        this.reloadi = 30;
        this.createprojectile(0, Point(0,150), 0.75, 4, 2);
        break;
      case "serpent":
        var createdrone = !this.data.ishead && this.data.index%5==0;
        if (createdrone) {
          this.reloadi = 45;
          if (this.data.drones.length < 16) {
            var e = addentity(new Enemy(this.pos, "drone", this.layer));
            e.source = this;
            this.data.drones.push(e);
          }
        } else {
          this.reloadi = 15;
          if (n % 2 == 0) {
            this.createprojectile(0, Point(40,20), this.data.ishead?1.5:1, 1, this.data.ishead?2:1);
          } else {
            this.createprojectile(0, Point(-40,20), this.data.ishead?1.5:1, 1, this.data.ishead?2:1);
          }
        }
        break;
      case "laser":
        this.reloadi = 60*6;
        this.data.laser = this.createlaser(0, Point(0,30), 4, 30, 1, 60, 60*3);
        break;
      case "warship":
        this.reloadi = 60;
        if (n == 1) {
          if (this.data.drones1.length < 4) {
            var e = addentity(new Enemy(this.pos.add(Point.dir(this.dir, -140)), "overseer", this.layer));
            e.source = this;
            this.data.drones1.push(e);
          }
          this.data.laser = this.createlaser(0, Point(0,290), 4, 30, 3, 30, 60*3);
        } else {
          if (this.data.drones2.length < 64) {
            var e = addentity(new Enemy(this.pos.add(Point.dir(this.dir, -140)), "drone", this.layer));
            e.source = this;
            this.data.drones2.push(e);
          }
        }
        break;
      case "kronos_shard":
        this.reloadi = 60*6;
        this.data.laser = this.createlaser(0, Point(0,30), 4, 40, 1, 60, 60*3);
        break;
      case "kronos_drone":
        this.reloadi = Math.randint(20,45);
        this.createprojectile(this.renderdir, Point(0,10), 0.75, 1, 1);
        break;
      case "saw_spitter":
        this.reloadi = 60;
        var e = addentity(new Enemy(this.pos.add(Point.dir(this.dir, 10)), "saw_bullet", this.layer));
        e.source = this;
        e.dir = this.dir;
        break;
      case "asteroid_tanker":
        this.reloadi = 30;
        if (this.data.follower != undefined) {
          var pos = this.pos.add(Point.dir(this.dir, 70));
          var e = addentity(new Asteroid(pos, this.dir, Math.randint(1,3)));
          e.speed = [1,1.5,2][e.type-1];
          e.layer = this.layer; e.collayers = [e.layer]; e.dmglayers = [A, this.olayer, this.olayer+"_P"];
          this.explode(10, this.deathexcolor, pos, 45, 45*2);
        }
        break;
      case "vulcan":
        var s = 1.5; var r = 0.25;
        this.reloadi = 2;
        switch(n) {
          case 1:
            this.createprojectile(10*Math.randfloat(-1,1), Point(110,85), s, r, 2);
            this.createprojectile(10*Math.randfloat(-1,1), Point(-30,115), 1.5*s, r, 2);
            break;
          case 2:
            this.createprojectile(10*Math.randfloat(-1,1), Point(-110,85), s, r, 2);
            this.createprojectile(10*Math.randfloat(-1,1), Point(30,115), 1.5*s, r, 2);
            break;
          case 3:
            this.createprojectile(10*Math.randfloat(-1,1), Point(135,55), s, r, 1);
            this.createprojectile(10*Math.randfloat(-1,1), Point(-30,115), 1.5*s, r, 1);
            break;
          case 4:
            this.createprojectile(10*Math.randfloat(-1,1), Point(-135,55), s, r, 1);
            this.createprojectile(10*Math.randfloat(-1,1), Point(30,115), 1.5*s, r, 1);
            break;
        }
        if (n == 1) {
          if (this.data.drones.length < 4) {
            var e = addentity(new Enemy(this.pos.add(Point.dir(this.dir+180, 50)), "vulcan_drone", this.layer));
            e.source = this;
            this.data.drones.push(e);
          }
        }
        break;
      case "vulcan_drone":
        this.reloadi = 10;
        if (n % 2 == 0) { this.createprojectile(5*Math.randfloat(-1,1), Point(40,25), 1.5, 0.25, 1); }
        else { this.createprojectile(5*Math.randfloat(-1,1), Point(-40,25), 1.5, 0.25, 1); }
        break;
      case "turret":
        var s = this.renderscale;
        if (this.reloadmax <= 0) { break; }
        this.reloadi = this.data.reload / this.reloadmax;
        switch(this.bullet) {
          case 1:
          case 2:
            var d = Math.randfloat(-1,1)*5;
            switch(this.reloadmax) {
              case 1:
                this.createprojectile(d, Point(0,40*s), this.data.speed, 0, this.bullet);
                break;
              case 2:
                this.createprojectile(d, Point([-1,1][n-1]*10*s,40*s), this.data.speed, 0, this.bullet);
                break;
              case 3:
                this.createprojectile(d, Point([-1,0,1][n-1]*10*s,40*s), this.data.speed, 0, this.bullet);
                break;
              case 4:
                this.createprojectile(d, Point([-1,-1/3,1/3,1][n-1]*10*s,[35,40,40,35][n-1]*s), this.data.speed, 0, this.bullet);
                break;
            }
            break;
          case 3:
            var d = Math.randfloat(-1,1)*2.5;
            switch(this.reloadmax) {
              case 1:
                this.createprojectile(d, Point(0,35*s), this.data.speed, 0, this.bullet).rad = this.rad/3;
                break;
              case 2:
                this.createprojectile(d, Point([-1,1][n-1]*7.5*s,35*s), this.data.speed, 0, this.bullet).rad = this.rad/3;
                break;
            }
            break;
          case 4:
            this.data.laser = this.createlaser(0, Point(0,20), 0, this.rad*0.75, this.data.damage, this.data.reload/3, this.data.reload/3);
            break;
          case 5:
            var e = addentity(new Enemy(this.pos.add(Point.dir(this.dir, this.rad*0.5)), "bomb", this.layer));
            e.source = this;
            e.data.delay = 60*5;
            e.data.damage = this.data.damage;
            e.vel = Point.dir(this.dir, this.rad*0.5);
            break;
        }
        break;
      case "bomber":
        var dir = this.dir;
        var delay = 60*5;
        if (this.data.close) {
          this.reloadi = 3;
          dir += Math.randfloat(-1,1)*30;
          delay = 60*1;
        } else {
          this.reloadi = 45;
        }
        var e = addentity(new Enemy(this.pos.add(Point.dir(dir,45)), "bomb", this.layer));
        e.source = this;
        e.data.delay = delay;
        e.data.damage = 25;
        e.vel = Point.dir(dir, this.data.shootr);
        break;
      case "orca":
        // ethan told me so
        var s = 1.5; var r = 0.25;
        this.reloadi = 2;
        switch(n) {
          case 1:
            this.createprojectile(10*Math.randfloat(-1,1), Point(105,90), s, r, 2);
            this.createprojectile(10*Math.randfloat(-1,1), Point(-75,115), 1.5*s, r, 2);
            break;
          case 2:
            this.createprojectile(10*Math.randfloat(-1,1), Point(-105,90), s, r, 2);
            this.createprojectile(10*Math.randfloat(-1,1), Point(75,115), 1.5*s, r, 2);
            break;
          case 3:
            this.createprojectile(10*Math.randfloat(-1,1), Point(30,80), s, r, 1);
            this.createprojectile(10*Math.randfloat(-1,1), Point(-75,115), 1.5*s, r, 1);
            break;
          case 4:
            this.createprojectile(10*Math.randfloat(-1,1), Point(-30,80), s, r, 1);
            this.createprojectile(10*Math.randfloat(-1,1), Point(75,115), 1.5*s, r, 1);
            break;
        }
        break;
    }
  }

  ondeath() {
    switch(this.type) {
      case "serpent":
        var n = 36;
        for (var i = 0; i < n; i++) {
          this.createprojectile(360*i/n, 0, i%2==0 ? 2 : 1.75, 0, 2 - i%2);
        }
        this.data.g.remove = true;
        break;
      case "laser":
        this.data.g.remove = true;
        break;
      case "kronos":
        this.data.gl1.forEach(p => p.remove = true);
        this.data.gl2.forEach(p => p.remove = true);
        for (var i = 0; i < 6; i++) {
          addentity(new Enemy(this.pos.add(Point.dir(this.data.dir+(360*(i/6)), 90)), "kronos_shard", this.layer));
        }
        break;
      case "kronos_drone":
        var e = addentity(new Enemy(this.pos, "kronos_ram_drone", this.layer));
        break;
      case "kronos_ram_drone":
        var n = 6;
        for (var i = 0; i < n; i++) {
          this.createprojectile(360*i/n, 0, 1.75, 0, 2);
        }
        break;
      case "electro":
        this.data.pl.forEach(p => p.id = 0);
        break;
      case "asteroid_tank":
        for (var i = 0; i < 10; i++) {
          var dir = Math.randval(360);
          addentity(new Asteroid(this.pos.add(Point.dir(dir, 10)), dir, Math.randint(1,3)));
        }
        break;
      case "vulcan":
        this.data.g.remove = true;
        break;
      case "vulcan_drone":
        this.data.g.remove = true;
        break;
      case "healer_drone":
        this.data.g.remove = true;
        break;
      case "turret":
        if (this.data.pl != undefined) { this.data.pl.forEach(p => p.id = 0); }
        break;
      case "bomber":
        for (var i = 0; i < 10; i++) {
          var d = Math.randval(360);
          var e = addentity(new Enemy(this.pos.add(Point.dir(d,45)), "bomb", this.layer));
          e.data.delay = 60*3 + Math.randint(-15,15);
          e.data.damage = 25;
          e.vel = Point.dir(d, this.data.shootr*Math.randfloat(0.25,1.25));
        }
        break;
      case "bomb":
        addentity(new Explosion(this.pos, this, 150*(this.rad/12.5), this.data.damage));
        break;
    }
    if (this.bar != undefined) {
      this.bar.rem();
    }
  }

  r2() {
    switch(this.type) {
      case "healer_drone":
        if (this.data.healp <= 0) { break; }
        var p1 = camera.w2s(this.pos);
        var p2 = camera.w2s(this.data.healing.pos);
        ctx.save();
        ctx.globalAlpha = this.data.healp*lerp(0.25,0.75,(sin(this.data.i)+1)/2);
        ctx.lineJoin = ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineWidth = camera.w2sl(lerp(0.5,1,this.data.healp)*lerp(0.5,1.5,(sin(this.data.i-15)+1)/2)*20);
        ctx.strokeStyle = this.deathexcolor;
        ctx.stroke();
        ctx.lineWidth = camera.w2sl(lerp(0.5,1,this.data.healp)*lerp(0.5,1.5,(sin(this.data.i+15)+1)/2)*10);
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.restore();
        break;
      case "celestial_spawn":
        var pos = camera.w2s(this.pos);
        var p = (1+sin(360*10*(this.hp / this.hpmax)))/2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, camera.w2sl(this.rad), 0, 2*Math.PI);
        ctx.globalAlpha = lerp(0, 0.25, 1-p);
        ctx.fillStyle = "#ff0000";
        ctx.fill();
        ctx.restore();
        break;
    }
  }
}

class Particle {
  constructor(pos) {
    this.pos = Point(pos);
    this.layer = 0;
  }

  update() { return true; }
  render() {}
}
class PGlow extends Particle {
  constructor(pos, color, rad, alpha) {
    super(pos);
    this.color = color;
    this.rad = rad;
    this.alpha = alpha;
    this.remove = game.CRISP;

    this.show = true;
  }
  update() { return this.remove; }
  render() {
    if (this.show) { PGlow.renderglow(this.pos, this.color, this.rad, this.alpha); }
  }

  static renderglow(pos, color, rad, alpha) {
    const colortrans = parsecolor(color);
    colortrans[3] = 0;
    ctx.save();
    pos = camera.w2s(pos);
    ctx.fillStyle = ctx.circleGradient(
      pos, camera.w2sl(rad),
      {0: color, 1: "rgba("+colortrans.join(",")+")"}
    );
    ctx.globalAlpha = alpha; 
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, camera.w2sl(rad), 0, 2*Math.PI);
    ctx.fill();
    ctx.restore();
  }
}
class PExplosion extends Particle {
  constructor(color, pos, delay, rad, sound=false) {
    super(pos);
    const speed = 0.5*1;
    
    this.color = "rgb(" + randomizecolor(color, 40).join(",") + ")";

    this.dir = Math.randval(360);
    
    this.rad = rad/2;
    this.i = 0;
    this.id = Math.ceil(Math.randint(10,15)/speed);
    this.delay = Math.ceil(delay/speed);
    camera.addshake(pos, this.rad*0.025);
    if (sound) {
      playsound("explode_"+Math.randint(1,2),this.pos,this.rad/200);
    }

    this.g1 = new PGlow(0,"transparent",0,0);
    this.g2 = new PGlow(0,"transparent",0,0);
    this.g1.layer = 1;
    this.g2.layer = -1;
    addparticle(this.g1);
    addparticle(this.g2);
  }

  update() {
    if (this.delay > 0) { this.delay--; }
    else {
      this.i++;
      if (this.i > this.id) {
        this.g1.remove = this.g2.remove = true;
        return true;
      }
      return false;
    }
  }
  render() {
    if (this.delay == 0) {
      const p = this.i / this.id;
      const pos = camera.w2s(this.pos);

      const points = [];
      for (var i = 0; i < 6; i++) {
        points.push(Point.dir(this.dir + 120*p + 360*(i/6), camera.w2sl(this.rad)));
      }
      const p1 = points.map(pp => pos.add(pp.mul(1*sin(p*180))));
      const p2 = points.map(pp => pos.add(pp.mul(0.5*sin(p*180))));
      const p3 = points.map(pp => pos.add(pp.mul(1.5*sin(p*90))));
      
      ctx.save();

      ctx.lineWidth = camera.w2sl(this.rad*(p<0.5?sin(90*p/0.5):1)*0.25);

      ctx.fillStyle = ctx.strokeStyle = this.color;

      ctx.globalAlpha = 0.5*(p<0.5?1:(1-p)/0.5);
      ctx.beginPath();
      ctx.moveTo(...p3.at(-1).get());
      p3.forEach(pp => ctx.lineTo(pp.x, pp.y));
      ctx.lineTo(...p3.at(0).get());
      ctx.stroke();

      ctx.globalAlpha = p<0.5?1:1.5-p;
      ctx.beginPath();
      ctx.moveTo(...p1.at(-1).get());
      p1.forEach(pp => ctx.lineTo(pp.x, pp.y));
      ctx.fill();
      
      ctx.fillStyle = ctx.strokeStyle = "#ffffff";

      ctx.globalAlpha = p<0.5?1:(1-p)/0.5;
      ctx.beginPath();
      ctx.moveTo(...p2.at(-1).get());
      p2.forEach(pp => ctx.lineTo(pp.x, pp.y));
      ctx.fill();
      
      ctx.globalAlpha = p<0.5?1-(p/0.5):0;
      ctx.beginPath();
      ctx.moveTo(...p1.at(-1).get());
      p1.forEach(pp => ctx.lineTo(pp.x, pp.y));
      ctx.fill();

      ctx.globalAlpha = 0.5*(p<0.5?1-(p/0.5):0);
      ctx.beginPath();
      ctx.moveTo(...p3.at(-1).get());
      p3.forEach(pp => ctx.lineTo(pp.x, pp.y));
      ctx.lineTo(...p3.at(0).get());
      ctx.stroke();

      this.g1.pos = this.pos;
      this.g1.color = "#ffffff";
      this.g1.rad = this.rad*(p<0.5?sin(90*p/0.5):1)*2;
      this.g1.alpha = 0.5*(p<0.5?1:(1-p)/0.5);
      this.g2.pos = this.pos;
      this.g2.color = this.color;
      this.g2.rad = this.rad*(p<0.5?sin(90*p/0.5):1)*3;
      this.g2.alpha = 0.25*(p<0.5?1:(1-p)/0.5);
      
      ctx.restore();
    }
  }
}
class PLightning extends Particle {
  constructor(pos1, pos2, color, size, dur) {
    super(0);
    this.pos1 = Point(pos1);
    this.pos2 = Point(pos2);
    
    this.color = color;
    this.size = size;

    this.r1 = -1;
    this.r2 = 1;

    this.i = 0;
    this.id = dur;

    this.g1 = new PGlow(0,"transparent",0,0);
    this.g2 = new PGlow(0,"transparent",0,0);
    this.g1.layer = this.g2.layer = -1;
    addparticle(this.g1);
    addparticle(this.g2);
    this.g1_f = new PGlow(0,"transparent",0,0);
    this.g2_f = new PGlow(0,"transparent",0,0);
    this.g1_f.layer = this.g2_f.layer = 1;
    addparticle(this.g1_f);
    addparticle(this.g2_f);

    this.show = true;
  }

  update() {
    this.i++;
    this.g1.pos = this.g1_f.pos = this.pos1;
    this.g2.pos = this.g2_f.pos = this.pos2;
    this.g1.color = this.g2.color = this.color;
    this.g1_f.color = this.g2_f.color = "#ffffff";
    this.g1.rad = this.g2.rad = this.size*2;
    this.g1_f.rad = this.g2_f.rad = this.size;
    this.g1.alpha = this.g2.alpha = 1;
    this.g1_f.alpha = this.g2_f.alpha = 0.5;
    this.g1.show = this.g2.show = this.g1_f.show = this.g2_f.show = this.show;
    if (this.i > this.id) {
      this.g1.remove = this.g2.remove = this.g1_f.remove = this.g2_f.remove = true;
      return true;
    }
    return false;
  }
  render() {
    if (this.show) {
      ctx.save();
      PLightning.rendlightning(PLightning.genlightning(
        camera.w2s(this.pos1), camera.w2s(this.pos2), this.r1, this.r2,
      ), camera.w2sl(Math.randfloat(0.75,1.25)*this.size), this.color, "round", "round");
      ctx.restore();
    }
  }
  static genlightning(pos1, pos2, r1=-1, r2=1) {
    var pl = [Point(pos1), Point(pos2)];
    for (var r = 0; r < 3; r++) {
      var npl = [];
      for (var i = 1; i < pl.length; i++) {
        var p1 = pl[i-1];
        var p2 = pl[i];
        var pm = p1.add(p2).div(2);
        pm = pm.add(Point.dir(
          p1.mul(Point(1,-1)).toward(p2.mul(Point(1,-1)))+90,
          0.25*Math.randfloat(r1,r2)*p1.dist(p2)
        ).mul(Point(1,-1)));
        npl.push(p1, pm, p2);
      }
      pl = npl;
    }
    return pl;
  }
  static rendlightning(pl, size, color, cap1, cap2) {
    ctx.lineCap = ctx.lineJoin = "round";
    [
      [1.5, color, 0.25],
      [1, color, 0.5],
      [0.75, color, 1],
      [0.5, "#ffffff", 1],
    ].forEach(function(l) {
      const s = l[0];
      const c = l[1];
      const a = l[2];
      ctx.beginPath();
      ctx.moveTo(...pl[0].get());
      pl.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineWidth = size*s; ctx.fillStyle = ctx.strokeStyle = c; ctx.globalAlpha = a;
      ctx.stroke();
      switch(cap1) {
        case "round":
          ctx.beginPath();
          ctx.arc(pl.at(0).x, pl.at(0).y, 1.5*(ctx.lineWidth/2), 0, 2*Math.PI);
          ctx.fill();
          break;
      }
      switch(cap2) {
        case "round":
          ctx.beginPath();
          ctx.arc(pl.at(-1).x, pl.at(-1).y, 1.5*(ctx.lineWidth/2), 0, 2*Math.PI);
          ctx.fill();
          break;
      }
    });
  }
}
class PLightningLoop extends Particle {
  constructor(pos, color, size, rad, dur) {
    super(pos);
    this.color = color;
    this.size = size;
    this.rad = rad;

    this.dir1 = this.dir2 = 0;

    this.i = 0;
    this.id = dur;

    this.g1 = new PGlow(0,"transparent",0,0);
    this.g2 = new PGlow(0,"transparent",0,0);
    this.g1.layer = 1;
    this.g2.layer = -1;
    addparticle(this.g1);
    addparticle(this.g2);

    this.show = true;
  }

  update() {
    this.i++;
    this.g1.pos = this.g2.pos = this.pos;
    this.g1.color = "#ffffff";
    this.g2.color = this.color;
    this.g1.rad = this.size;
    this.g2.rad = this.size*2;
    this.g1.alpha = 0.5;
    this.g2.alpha = 1;
    this.g1.show = this.g2.show = this.show;
    if (this.i > this.id) {
      this.g1.remove = this.g2.remove = true;
      return true;
    }
    return false;
  }
  render() {
    const size = camera.w2sl(Math.randfloat(0.75,1.25)*this.size);
    const p1 = this.pos;
    const p2 = this.pos.add(Point.dir(this.dir1, this.rad));
    const p3 = this.pos.add(Point.dir(this.dir2, this.rad));
    ctx.save();
    const l1 = PLightning.genlightning(
      camera.w2s(p1), camera.w2s(p2),
      -1, 0,
    );
    const l2 = PLightning.genlightning(
      camera.w2s(p2), camera.w2s(p3),
      -2, 0.5,
    );
    const l3 = PLightning.genlightning(
      camera.w2s(p3), camera.w2s(p1),
      -1, 0.5,
    );
    const l = [...l1, ...l2, ...l3];
    PLightning.rendlightning(l, size, this.color, "round", "round");
    ctx.restore();
  }
}
class PText extends Particle {
  constructor(pos, text, size, color, duration=30) {
    super(pos);
    this.text = String(text);
    this.size = size;
    this.color = color;
    this.i = 0;
    this.id = duration;
  }

  update() {
    this.i++;
    return this.i > this.id;
  }
  render() {
    const p = this.i / this.id;
    var y = 0;
    if (p > 0.75) { y = 1; }
    else { y = sin(90*(p/0.75)); }
    const pos = camera.w2s(this.pos.add(Point(0,y).mul(this.size*2)));
    ctx.font = camera.w2sl(this.size) + "px Custom";
    ctx.fillStyle = this.color;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(this.text, pos.x, pos.y);
  }
}

function addparticle(p) {
  switch(p.layer) {
    case 1:
      game.particlesF.push(p);
      break;
    case 0:
      game.particles.push(p);
      break;
    case -1:
      game.particlesB.push(p);
      break;
  }
  return p;
}

class Wave {
  constructor(spawns, spawnspeed=1) {
    this.spawns = spawns;
    this.tspawns = [];
    this.spawnspeed = spawnspeed;
    this.i = 0;
    this.checki = 30;
    this.noenmy = false;
  }

  reset() {
    this.checki = 30;
    this.noenmy = false;
    this.tspawns = [];
    for (var type in this.spawns) {
      this.tspawns.push(...Array(this.spawns[type]).fill(type));
    }
    game.grace = 60*10;
  }
  
  update(others, plyr) {
    if (this.i > 0) { this.i--; }
    else {
      this.i = (60*Math.randfloat(2,5))/this.spawnspeed;
      const chosen = Math.randint(0,this.tspawns.length-1);
      const ntspawns = [];
      for (var i = 0; i < this.tspawns.length; i++) {
        if (i == chosen) {
          var pos = Point();
          do {
            pos = plyr == undefined ? Point() : plyr.pos;
            pos = pos.add(Point.dir(Math.randval(360),Math.min(game.size,R1)));
          }
          while (pos.dist(0) > game.size)
          addentity(new Enemy(pos, this.tspawns[i]));
        } else { ntspawns.push(this.tspawns[i]); }
      }
      this.tspawns = ntspawns;
    }
    if (others.some(e => e.layer==ENMY)) {
      this.checki = 30;
    } else {
      if (this.checki > 0) { this.checki--; }
      else { this.noenmy = true; }
    }
    return this.noenmy && this.tspawns.length == 0;
  }
}

class UpgradeNode {
  constructor(id) {
    const upgrade = UpgradeNode.upgrades[id];

    this.HEX = 60;
    
    this.id = id;
    this.tier = upgrade.tier;
    this.b = "b" in upgrade ? upgrade.b : 1;
    this.bi = 0; this.locked = true;
    this.from = "from" in upgrade ? upgrade.from : [];
    this.to = [];

    this.name = String(upgrade.name);
    this.pts = "pts" in upgrade ? upgrade.pts : [];
    this.onbuy = "onbuy" in upgrade ? upgrade.onbuy : function(){};

    this.pos = Point();

    this.iconp = 0.75;
    this.p = 0;

    this.renderdir = 90;
    this.renderalpha = 0;
    this.renderscale = 0;
    this.renderbrightness = 0;
    this.renderfilter = "";
    this.grayscale = 0;
    this.selalpha = 0;

    this.root = undefined;

    UpgradeNode.upgradeobjs[this.id] = this;
  }

  static upgrades = UPGRADES;
  static upgradeobjs = {};

  get x() { return this.pos.x; }
  set x(v) { this.pos.x = v; }
  get y() { return this.pos.y; }
  set y(v) { this.pos.y = v; }

  get cost() { return 1+(2*(this.tier-1)); }

  init1() {
    this.from = this.from.map(id => UpgradeNode.upgradeobjs[id]);
    this.from.forEach(n => n.to.push(this));
  }
  init2() {
    this.from = Array.from(new Set(this.from));
    this.to = Array.from(new Set(this.to));
    
    const context = this;
    this.to.forEach(function(n) {
      n.root = context.root == undefined ? context : context.root;
      n.init2();
    });
    if (this.root == undefined) {
      const all = this.getall();
      const allt = {};
      all.forEach(function(n) {
        if (!(n.tier in allt)) { allt[n.tier] = []; }
        if (!allt[n.tier].map(n2 => n2.id).includes(n.id)) { allt[n.tier].push(n); }
      });
      for (var tier in allt) {
        tier = parseInt(tier);
        for (var i = 0; i < allt[tier].length; i++) {
          allt[tier][i].pos = game.upgrades.postohexpos(
            [Math.ceil(i - (allt[tier].length/2)), tier],
            this.HEX,
          );
        }
      }
      this.all = all;
      this.allt = allt;
    }
  }

  getall() {
    const arr = [this];
    this.to.forEach(n => arr.push(...n.getall()))
    return Array.from(new Set(arr));
  }

  update(mousepos, mousedown, selected) {
    if (this.id.length > 0 && this.id[0] == "_") { return false; }
    
    var sel = false;
    
    this.locked = false;
    this.from.forEach(n => this.locked=this.locked||n.bi==0);
    
    var scale = 1; var bright = 0; var gray = 0;
    if (mousepos.dist(this.pos) < this.HEX*this.iconp) {
      if (this.bi < this.b) { scale = 1.1; }
      if (mousedown) { sel = true; }
      if (this.bi < this.b && mousedown) {
        
      }
    }
    if (this.locked) {
      scale *= 0.9;
      bright -= 0.25;
      gray = 0.5;
    }

    this.renderalpha = lerpwp(this.renderalpha, 1, SCROLL**2);
    this.renderscale = lerpwp(this.renderscale, scale, SCROLL**2);
    this.renderbrightness = lerpwp(this.renderbrightness, bright, SCROLL**2);
    this.grayscale = lerpwp(this.grayscale, gray, SCROLL**2);
    this.selalpha = lerpwp(this.selalpha, selected ? 1 : 0, SCROLL**2);
    
    this.renderfilter = "brightness("+(this.renderbrightness+1)+") grayscale("+this.grayscale+")";

    return sel;
  }

  render1() {
    if (this.id[0] == "_") { return; }
    const allt = this.root == undefined ? this.allt : this.root.allt;
    ctx.save();
    var pos = camera.w2s(this.pos);
    ctx.strokeStyle = "#ffffff"; ctx.globalAlpha = 0.75*this.renderalpha;
    ctx.lineWidth = camera.w2sl(this.renderscale*this.HEX*(1/3));
    for (var i = 0; i < this.to.length; i++) {
      var n = this.to[i];
      if (n.id[0] == "_") { continue; }
      var p = camera.w2s(n.pos);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      if (pos.dist(p) > camera.w2sl(this.HEX*2) + 10) {
        if (allt[n.tier].length >= allt[this.tier].length) { ctx.lineTo(p.x, pos.y); }
        else { ctx.lineTo(pos.x, p.y); }
      }
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.restore();
  }
  render2() {
    if (this.id[0] == "_") { return; }
    ctx.save();
    const name = "upgrades/u_" + this.id;
    ctx.globalAlpha = 1*this.renderalpha;
    ctx.filter = this.renderfilter;
    DrawImage(
      name in textures ? textures[name] : textures["upgrades/u"],
      this.pos, this.renderdir, this.renderscale*(this.HEX*this.iconp)/98,
    );
    var pos = camera.w2s(this.pos);
    if (!(name in textures)) {
      ctx.fillStyle = "#000000";
      ctx.font = camera.w2sl(this.HEX*this.iconp) + "px Custom";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(this.name, pos.x, pos.y, camera.w2sl(this.HEX*2));
    }
    ctx.restore();
    ctx.globalAlpha = 1*this.renderalpha;
    const p = this.bi / this.b;
    this.p = lerpwp(this.p, p, SCROLL);
    if (this.p > 0) {
      ctx.lineCap = "butt"; ctx.lineJoin = "miter";
      const HEX = this.renderscale*(this.HEX*this.iconp);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = camera.w2sl(12.5 * (this.renderscale*(this.HEX*this.iconp)/98));
      if (this.p < 1) {
        const poslist = [];
        for (var i = 0; i < 3; i++) {
          var p1 = Point.dir(180 - i*60, HEX);
          var p2 = Point.dir(180 - (i+1)*60, HEX);
          if (p1.y < -HEX + (HEX*2*this.p)) {
            if (p2.y > -HEX + (HEX*2*this.p)) {
              var y = p2.y;
              p2.y = Math.min(p2.y, -HEX + (HEX*2*this.p));
              p2.x -= (p2.x - p1.x) * ((y - p2.y) / (y - p1.y));
            }
            poslist.push(p1, p2);
          }
        }
        ctx.beginPath();
        for (var i = -poslist.length; i <= poslist.length; i++) {
          var pos = Point();
          if (i == 0) { pos = Point.dir(180, HEX); }
          else { pos = poslist[Math.abs(i)-1].mul(Point(Math.sign(i),1)); }
          pos = camera.w2s(this.pos.add(pos));
          if (i + poslist.length == 0) { ctx.moveTo(...pos.get()); }
          else { ctx.lineTo(...pos.get()); }
        }
      } else {
        ctx.beginPath();
        for (var i = 0; i < 8; i++) {
          var pos = camera.w2s(this.pos.add(Point.dir(360*(i/6), HEX)));
          if (i == 0) { ctx.moveTo(...pos.get()); }
          else { ctx.lineTo(...pos.get()); }
        }
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1*this.selalpha*this.renderalpha;
    if (ctx.globalAlpha > 0) {
      DrawImage(
        textures["upgrades/u_bord"],
        this.pos, this.renderdir, 1.1*(this.HEX*this.iconp)/98,
      );
    }
    ctx.restore();
  }
}

class Timer {
  constructor() {
    this.starttime = 0;
    this.endtime = 0;
    this.report = {};
  }

  start() { this.starttime = Timer.gettime(); }
  end() { this.endtime = Timer.gettime(); }
  duration() { this.end(); const d = this.endtime-this.starttime; this.start(); return d; }
  log(n) { const d = this.duration(); this.report[n] = d; return d; }
  print() {
    const rep = this.report;
    var l = "";
    var longest = undefined;
    for (var i = 0; i < Object.keys(rep).length; i++) {
      var key = Object.keys(rep)[i]; var val = rep[key];
      if (val > rep[longest] || longest == undefined) { longest = key; }
      l += key + " : " + val + "ms\n";
    }
    l += "LONGEST : " + longest + "\n";
    log(l);
    this.report = {};
  }

  static gettime() { const d = new Date(); return d.getTime(); }
}

function rementity(e) {
  e.ADDED = false;
  game.entityremqueue.push(e);
  return e;
}
function addentity(e) {
  e.ADDED = true;
  game.entityaddqueue.push(e);
  return e;
}
let stars;
let game, R1, R2;
let waves;
let timer;
function INIT() {
  timer = new Timer();
  
  stars = [];
  for (var i2 = 0; i2 < 25; i2++) {
    stars.push({
      pos: Point(Math.randfloat(-1000,1000),Math.randfloat(-1000,1000)),
      far: Math.randfloat(0.25,0.75)
    });
  }

  R1 = 600;
  R2 = R1*1.5;
  waves = [
    // new Wave({orca:1}, 10),
    new Wave({basic:1}, 10),
    new Wave({glider:1}, 10),
    new Wave({overseer:1}, 10),
    new Wave({tank:1}, 10),
    new Wave({serpent:5}, 10), // 5
    new Wave({laser:1}, 10),
    new Wave({warship:1}, 10),
    new Wave({kronos:1}, 10),
    new Wave({saw_spitter:1}, 10),
    new Wave({grinder:1}, 10), // 10
    new Wave({cameo_grinder:1}, 10),
    new Wave({electro:1}, 10),
    new Wave({asteroid_tanker:1}, 10),
    new Wave({vulcan:1}, 10),
    new Wave({gunner_serpent:10}, 10), // 15
    new Wave({bomber:1}, 10),
    new Wave({aries:1}, 10),
    new Wave({celestial_spawn:1}, 10),
  ];

  RESETGAME();

  fadeout(GetById("MENU"));
  fadeout(GetById("UPG-DIV-1"));
  fadeout(GetById("UPG-DIV-2"));
}
function RESETGAME() {
  game = {
    CRISP: true, PAUSED: false,
    chunks: {}, chunksize: 250,
    layers: {},
    entities: [], entityaddqueue: [], entityaddqueue: [],
    player: undefined,
    hpbar: new HealthBar(GetById("PLYR-HP"), this.hpmax, "#00ffff", [150,20]),
    energybar: new HealthBar(GetById("PLYR-ENERGY"), 100, "#00ff88", [75,15]),
    condelaybar: new HealthBar(GetById("PLYR-CONDELAY"), 100, "#ff8800", [75,15]),
    expbar: new HealthBar(GetById("PLYR-EXP"), 0, "#8800ff", [400,30]),
    expbar_menu: new HealthBar(GetById("PLYR-EXP-MENU"), 0, "#8800ff", [400,30]),
    particles: [], particlesF: [], particlesB: [],
    aspawn: 0,
    grace: 0,
    size: 1000,
    health: 0, healthl: [],
    score: 0, scoredisp: new Display(0,Array.from(document.getElementsByClassName("score"))),
    fpsdisp: new Display(0,Array.from(document.getElementsByClassName("fps"))),
    wavedisp: new Display("",Array.from(document.getElementsByClassName("wave"))),
    waves: waves, wave: 1,
    sounds: [],
    upgrades: {
      techtree: undefined, selected: undefined,
      dir: 0, dirg: 0,
      i: 0,
      postohexpos: function(pos, r) {
        pos = Point(pos);
        const pos2 = Point();
        pos2.x = (pos.x - (0.5*(pos.y % 2)) + 0.5) * r*Math.sqrt(3);
        pos2.y = pos.y * r*(3/2);
        return pos2;
      },
      nodes: {},
    },
  };

  const nodes = [];
  for (var id in UPGRADES) {
    nodes.push(new UpgradeNode(id));
  }
  nodes.forEach(n => n.init1());
  nodes.forEach(n => n.init2());
  nodes.forEach(function(n) {
    if (n.tier == 1) { game.upgrades.nodes[n.id] = n; }
  });

  game.player = addentity(new Player(0, Math.randval(game.size)));

  game.waves.forEach(w => w.reset());

  camera.snapfovto(0.75);
}
function PAUSEGAME() {
  game.PAUSED = true;
  fadein(GetById("MENU"));
}
function UNPAUSEGAME() {
  game.PAUSED = false;
  fadeout(GetById("MENU"));
}
function TOGGLEGAME() {
  if (game.PAUSED) {
    UNPAUSEGAME();
  } else {
    PAUSEGAME();
  }
}
let escape = false;
document.body.addEventListener("keydown", function(e) {
  if (e.key == "Escape") { escape = true; }
});
let click = false;
document.body.addEventListener("mousedown", function(e) {
  if (e.button == 0) { click = true; }
});
const scroll = Point(); scroll.mutable = true;
document.addEventListener("wheel", e => scroll.add(Point(e.deltaX, e.deltaY)));
let prevtime = 0;
function UPDATE() {
  timer.start();

  const dorender = document.visibilityState == "visible";

  GLOBALSCALE = (Point(ctx.canvas.width,ctx.canvas.height).div(SCALE).dist(0))/Point(1440,745).dist(0);

  SetCamera(0);
  
  SetCTX("BG");
  if (dorender && camera.change) {
    ClearCanv();
    ctx.save();
    stars.forEach(function(s) {
      var far = s.far;
      var pos = camera.w2s(s.pos, far);
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = far;
      ctx.beginPath();
      ctx.arc(
        pos.x.mod(ctx.canvas.w), pos.y.mod(ctx.canvas.h),
        camera.w2sl(lerp(0.5,5,far)), 0, 2*Math.PI
      );
      ctx.fill();
    });
    ctx.restore();
    timer.log("rndr_stars");
  }
  SetCTX("DEF");

  if (mode == "GAME") {
    var player = game.player;
    game.hpbar.hp = player.hp; game.hpbar.hpmax = player.hpmax; game.hpbar.name = player.hp;
    game.energybar.hp = player.energy;
    game.condelaybar.hp = player.condelay; game.condelaybar.hpmax = player.condelaymax;
    game.expbar.hp = player.exp; game.expbar.hpmax = player.expoflvl(player.explvl); game.expbar.name = player.explvl > 0 ? player.explvl : "";
    game.expbar_menu.hp = game.expbar.hp; game.expbar_menu.hpmax = game.expbar.hpmax; game.expbar_menu.name = game.expbar.name;
    game.hpbar.update();
    game.energybar.update();
    game.condelaybar.update();
    game.expbar.update();
    game.expbar_menu.update();
    if (game.PAUSED) { fadein(game.expbar_menu.canv); fadeout(game.expbar.canv) }
    else { fadein(game.expbar.canv); fadeout(game.expbar_menu.canv); }
    camera.scrollto(player.pos);
    camera.scrollfovto(player.view);
    timer.log("upt_player");
    
    if (!game.PAUSED) {
      ["DEF","PF","PB","UPG"].forEach(function(id) {
        SetCTX(id);
        ClearCanv();
      });
      SetCTX("DEF");
      SetCamera(0);
      timer.log("rndr_clear");

      if (game.aspawn > 0) { game.aspawn--; }
      else {
        var dir = 0; var pos = Point();
        do {
          dir = Math.randval(360);
          pos = game.player.pos.add(Point.dir(dir+180,Math.min(game.size, R1)));
        }
        while (pos.dist(0) > game.size)
        addentity(new Asteroid(pos, dir, Math.randint(1,3)));
        game.aspawn = 60*Math.randfloat(1,2.5);
      }
      timer.log("spawn_asteroid");
      if (game.grace > 0) {
        game.grace--;
        game.wavedisp.value = "WAVE " + game.wave + " IN " + Math.ceil(game.grace/60);
      } else if (game.wave <= waves.length && game.player.ADDED) {
        game.wavedisp.value = "WAVE " + game.wave;
        var w = waves[game.wave-1];
        if (w.update(game.entities, game.player)) { game.wave++; w.reset(); }
      }
      timer.log("upt_wave");
  
      const borderpos = camera.w2s(0);
      const borderr = 20;
      const borderp = 3;
      const stops1 = {0: "transparent"};
      stops1[(game.size-(borderr*borderp))/(game.size+(borderr*borderp))] = "rgba(255,0,0,0)";
      stops1[game.size/(game.size+(borderr*borderp))] = "#ff0000";
      stops1[(game.size+(borderr*borderp))/(game.size+(borderr*borderp))] = "rgba(255,0,0,0)";
      const stops2 = {0: "transparent"};
      stops2[(game.size-borderr)/(game.size+borderr)] = "rgba(255,255,255,0)";
      stops2[game.size/(game.size+borderr)] = "#ffffff";
      stops2[(game.size+borderr)/(game.size+borderr)] = "rgba(255,255,255,0)";
  
      if (dorender) {
        ctx.save();
        ctx.beginPath(); ctx.arc(borderpos.x, borderpos.y, camera.w2sl(game.size), 0, 2*Math.PI);
        ctx.strokeStyle = game.CRISP ? "#ff0000" : ctx.circleGradient(borderpos, camera.w2sl(game.size+(borderr*borderp)), stops1);
        ctx.globalAlpha = 0.5; ctx.lineWidth = camera.w2sl((game.CRISP ? 0.5 : 1) * borderr*borderp*2);
        ctx.stroke();
        ctx.restore();
        timer.log("rndr_border_1");
      }
  
      SetCTX("PB");
      var nparticlesB = [];
      game.particlesB.forEach(function(p) { if (!p.update()) { nparticlesB.push(p); } });
      game.particlesB = nparticlesB;
      game.particlesB.forEach(p => p.render());
      timer.log("upt_particlesB");
      SetCTX("DEF");
  
      game.entities.forEach(function(e) {
        var args = [];
        switch(e.constructor.name) {
          case "Player":
            args = [
              keydown("w"), keydown("s"), keydown("d"), keydown("a"),
              mousepos(), mousedown(0), mousedown(2),
              keydown("1"), keydown("2"), keydown("3"), keydown(" "),
            ];
            break;
          case "Asteroid":
          case "Experience":
          case "Shield":
          case "Projectile":
          case "Enemy":
            args = [game.player.hp>0 ? game.player : undefined];
            break;
        }
        if (e.update(game.entities, ...args)) { rementity(e); }
      });
      timer.log("upt_entities");
      game.entities = game.entities.filter(e => !game.entityremqueue.includes(e));
      timer.log("ENTITY_rem");
      game.chunks = {}; game.layers = {};
      game.entities.forEach(function(e) {
        e.finish();
        const maxx = Math.round((e.pos.x + e.rad) / game.chunksize);
        const minx = Math.round((e.pos.x - e.rad) / game.chunksize);
        const maxy = Math.round((e.pos.y + e.rad) / game.chunksize);
        const miny = Math.round((e.pos.y - e.rad) / game.chunksize);
        e.chunkpos = [];
        for (var x = minx; x <= maxx; x++) {
          for (var y = miny; y <= maxy; y++) {
            var name = x+","+y;
            e.chunkpos.push(name);
            if (!(name in game.chunks)) { game.chunks[name] = []; }
            if (!(e.layer in game.chunks[name])) { game.chunks[name][e.layer] = []; }
            game.chunks[name][e.layer].push(e);
            if (!(e.layer in game.layers)) { game.layers[e.layer] = []; }
            game.layers[e.layer].push(e);
          }
        }
        e.chunk = game.chunks[Math.round(e.pos.x/game.chunksize)+","+Math.round(e.pos.y/game.chunksize)];
        if (dorender && e.onscreen(game.player)) { e.render(); }
      });
      timer.log("ENTITY_finish&chunk&render");
      game.entities.push(...game.entityaddqueue);
      game.entityremqueue = []; game.entityaddqueue = [];
      timer.log("ENTITY_add");
      
      SetCTX("PF");
      var nparticles = [];
      game.particles.forEach(function(p) { if (!p.update()) { nparticles.push(p); } });
      game.particles = nparticles;
      if (dorender) { game.particles.forEach(p => p.render()); }
      timer.log("upt_particles");
      var nparticlesF = [];
      game.particlesF.forEach(function(p) { if (!p.update()) { nparticlesF.push(p); } });
      game.particlesF = nparticlesF;
      if (dorender) { game.particlesF.forEach(p => p.render()); }
      timer.log("upt_particlesF");
      SetCTX("DEF");
  
      if (dorender) {
        ctx.save();
        ctx.beginPath(); ctx.arc(borderpos.x, borderpos.y, camera.w2sl(game.size), 0, 2*Math.PI);
        if (!game.CRISP) {
          ctx.strokeStyle = ctx.circleGradient(borderpos, camera.w2sl(game.size+borderr), stops2);
          ctx.globalAlpha = 1; ctx.lineWidth = camera.w2sl(borderr*2);
          ctx.stroke();
        }
        ctx.strokeStyle = "#ffffff";
        ctx.globalAlpha = 1; ctx.lineWidth = camera.w2sl(borderr/2);
        ctx.stroke();
        ctx.restore();
        timer.log("rndr_border_2");
    
        if (game.debug) {
          ctx.strokeStyle = "#00ff00"; ctx.lineWidth = camera.w2sl(2.5,false);
          var r = camera.w2sl(game.chunksize/2);
          for (var pos in game.chunks) {
            pos = Point(parseInt(pos.split(",")[0]), parseInt(pos.split(",")[1])).mul(game.chunksize);
            pos = camera.w2s(pos);
            ctx.beginPath();
            ctx.moveTo(pos.x+r, pos.y+r);
            ctx.lineTo(pos.x-r, pos.y+r);
            ctx.lineTo(pos.x-r, pos.y-r);
            ctx.lineTo(pos.x+r, pos.y-r);
            ctx.lineTo(pos.x+r, pos.y+r);
            ctx.stroke();
          }
          timer.log("rndr_chunks");
        }
      }
  
      game.score += Math.round(SCROLL * (game.player.score - game.score));
      if (Math.abs(game.player.score - game.score)) { game.score = game.player.score; }
      game.scoredisp.value = game.score;
      timer.log("upt_score");
      if (dorender) {
        var r = camera.w2sl(37.5,false); var b = camera.w2sl(2.5,false);
        var pos = Point(-r,-r).add(camera.w2sl(-20,false)-b).add(Point(ctx.canvas.w,ctx.canvas.h));
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, 2*Math.PI);
        ctx.lineWidth = b;
        ctx.fillStyle = "#000000"; ctx.globalAlpha = 0.25; ctx.fill();
        ctx.strokeStyle = "#ffffff"; ctx.globalAlpha = 1; ctx.stroke();
        ctx.restore();
        game.entities.forEach(function(e) {
          var s = 0;
          if (e.layer == A) { s = 1; ctx.fillStyle = "#ffffff"; }
          else if (e.layer == PLYR) { s = 1; ctx.fillStyle = "#00ffff"; }
          else if (e.layer == ENMY) { s = 0.5 + 0.5*(e.rad/20); ctx.fillStyle = "#ff0000"; }
          else if (e.layer == MISC) { s = 0.5 + 0.5*(e.rad/20); ctx.fillStyle = "#8800ff"; }
          else if (e.layer == "EXP") { s = 1; ctx.fillStyle = "#8800ff"; }
          else { return; }
          ctx.beginPath();
          const npos = pos.add(e.pos.mul(Point(1,-1)).mul(r/game.size));
          ctx.arc(npos.x, npos.y, s*b/2, 0, 2*Math.PI);
          ctx.fill();
        });
        timer.log("rndr_minimap");
      }

      if (escape) { PAUSEGAME(); }
    } else {
      SetCTX("UPG");
      ClearCanv();
      SetCamera(1);
      
      const upgrades = game.upgrades;
  
      if (upgrades.techtree == undefined) {
        if (upgrades.i > 0) { upgrades.i -= 0.1; }
        else { upgrades.i = 0; }
        camera.scrollto(0);
      } else {
        if (upgrades.i < 1) { upgrades.i += 0.1; }
        else { upgrades.i = 1; }
        camera.scrollto(camera.pos.sub(Point(0,scroll.y)));
      }
      
      var upgraden = Object.keys(upgrades.nodes);
      upgrades.dir = lerpanglewp(upgrades.dir, upgrades.dirg*60, SCROLL**2);
      if (upgrades.techtree == undefined) {
        if (Math.abs(anglerel(upgrades.dir, upgrades.dirg*60)) < 10) {
          if (keydown("arrowright")) { upgrades.dirg = (upgrades.dirg+1).mod(6); }
          if (keydown("arrowleft")) { upgrades.dirg = (upgrades.dirg-1).mod(6); }
        }
        if (keydown("enter") || keydown(" ") || click) {
          upgrades.techtree = upgraden[upgrades.dirg];
          upgrades.nodes[upgrades.techtree].getall().forEach(function(n) {
            n.renderalpha = 0;
            n.renderscale = 0;
          });
        }
      }
  
      if (upgrades.i < 1) {
        const homepos = Point(0, -50).add(camera.pos);
        const home = [];
        const homer = 100 * lerp(1, 0.9, upgrades.i);
        for (var i = 0; i < 6; i++) {
          var sel = Math.max(0, Math.min(1, 1-(Math.abs(anglerel(360*(i/6)-upgrades.dir, 0))/30)));
          var p = camera.w2s(homepos.add(Point.dir(360*((i+0.5)/6) - upgrades.dir, homer)));
          var p0 = homepos.add(Point.dir(360*(i/6) - upgrades.dir, homer*(1 + 0.2*sel)));
          var p1 = p0.add(Point.dir(360*(i/6)-90 - upgrades.dir, homer/2));
          var p2 = p0.add(Point.dir(360*(i/6)+90 - upgrades.dir, homer/2));
          p1 = camera.w2s(p1); p2 = camera.w2s(p2);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = camera.w2sl(10);
          ctx.globalAlpha = 0.75 * (1-upgrades.i);
          ctx.stroke();
          if (sel > 0) {
            ctx.save();
            var p0_2 = camera.w2s(homepos.add(Point.dir(360*(i/6) - upgrades.dir, homer)));
            ctx.translate(p0_2.x, p0_2.y);
            ctx.rotate(rads(360*(i/6) - upgrades.dir));
            ctx.fillStyle = "#ffffff"; ctx.globalAlpha = sel * (1-upgrades.i);
            ctx.font = camera.w2sl(homer*0.125) + "px Custom";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(upgrades.nodes[upgraden[i]].name, 0, 0);
            ctx.restore();
          }
          home.push(p);
        }
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(...home.at(-1).get());
        home.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 0.5 * (1-upgrades.i);
        ctx.fill();
        ctx.restore();
      }
      if (upgrades.i > 0) {
        if (upgrades.techtree != undefined) {
          const root = upgrades.nodes[upgrades.techtree];
          const nodes = root.getall();
  
          miny = Inf;
          maxy = -Inf;
          nodes.forEach(function(n) {
            if (n.y-n.HEX < miny) { miny = n.y-n.HEX; }
            if (n.x+n.HEX > maxy) { maxy = n.y+n.HEX; }
          });
          if (maxy - miny < camera.s2wl(ctx.canvas.height-40)) {
            miny = maxy = camera.s2wl(ctx.canvas.height-40)/2;
          } else {
            miny += camera.s2wl(ctx.canvas.height-40)/2;
            maxy -= camera.s2wl(ctx.canvas.height-40)/2;
          }
          camera.nrpos.y = Math.max(miny, Math.min(maxy, camera.nrpos.y));
          camera.y = Math.max(miny, Math.min(maxy, camera.y));
  
          var selected = undefined;
          nodes.forEach(function(n) {
            if (n.update(mousepos(), click, upgrades.selected == n.id)) {
              selected = n.id;
            }
          });
          nodes.forEach(n => n.render1());
          nodes.forEach(n => n.render2());
  
          if (click && Math.abs(mouse.x - ((ctx.canvas.width/SCALE)/2)) < (ctx.canvas.width/SCALE)/6) {
            upgrades.selected = selected;
            if (upgrades.selected == undefined) {
              fadeout(GetById("UPG-DIV-2"));
            } else {
              var node = UpgradeNode.upgradeobjs[upgrades.selected];
              fadein(GetById("UPG-DIV-2"));
              GetById("UPG-NAME").innerText = String(node.name);
              GetById("UPG-DESC").innerHTML = "";
              node.pts.forEach(function(text) {
                const li = document.createElement("li");
                li.innerText = text;
                GetById("UPG-DESC").appendChild(li);
              });
              GetById("UPG-COST").innerText = "Cost: "+node.cost+" level"+(node.cost==1?"":"s");
              function updatebought() {
                const bought = GetById("UPG-BOUGHT");
                if (node.bi >= node.b) {
                  bought.innerText = "Maxed out";
                } else {
                  bought.innerText = "Can be bought "+(node.b-node.bi)+" more time"+((node.b-node.bi)==1?"":"s");
                }
              }
              updatebought();
              if (node.bi < node.b) {
                fadein(GetById("UPG-BUY"));
                function recheck() {
                  const buyable = !node.locked && game.player.explvl >= node.cost;
                  GetById("UPG-BUY").style.opacity = GetById("UPG-BOUGHT").style.opacity = (buyable ? 1 : 0.5);
                  return buyable;
                }
                recheck();
                GetById("UPG-BUY").onclick = function() {
                  if (!recheck()) { return; }
                  if (node.bi < node.b) {
                    node.bi++;
                    game.player.bought.push(node.id);
                    node.onbuy(game.player);
                    game.player.remexplvl(node.cost);
                    updatebought();
                    if (node.bi >= node.b) { fadeout(this); }
                  }
                  recheck();
                };
              } else {
                fadeout(GetById("UPG-BUY"));
              }
            }
          }
        }
      }
      
      SetCTX("DEF");
  
      if (escape) {
        if (upgrades.techtree == undefined) {
          UNPAUSEGAME();
        } else if (upgrades.selected == undefined) {
          upgrades.techtree = undefined;
        } else {
          upgrades.selected = undefined;
          fadeout(GetById("UPG-DIV-2"));
        }
      }
    }
  }

  cameras.forEach(cam => cam.update());
  timer.log("upt_cameras");

  if (escape) { escape = false; }
  if (click) { click = false; }
  scroll.set(0);
  
  const nsounds = [];
  game.sounds.forEach(function(s) { if (!s.update(camera,0)) { nsounds.push(s); } });
  game.sounds = nsounds;
  timer.log("upt_sounds");

  if (timer.doprint) { timer.print(); }

  time = Timer.gettime();
  game.fpsdisp.value = Math.ceil(1000 / (time - prevtime));
  prevtime = time;
}

