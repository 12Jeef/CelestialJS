function MACRO() {
  const plyr = game.player;
  if (plyr.hp > 0) {
    var n = undefined;
    var nd = Inf;
    game.entities.forEach(function(e) {
      if (e == plyr) { return; }
      if (![plyr.layer, PLYR_P, ENMY_P].includes(e.layer)) {
        if (e.pos.dist(0) > game.size) { return; }
        const d = plyr.pos.dist(e.pos);
        if (n == undefined) {
          if (d < nd) {
            n = e;
            nd = d;
          }
        } else if (n.layer == A) {
          if (e.layer != A) {
            n = e;
            nd = d;
          } else {
            if (d < nd) {
              n = e;
              nd = d;
            }
          }
        } else {
          if (e.layer != A) {
            if (d < nd) {
              n = e;
              nd = d;
            }
          }
        }
      }
    });
    const move = {u: 0, r: 0};
    var shooting = false;
    if (n != undefined) {
      var dist = 250;
      const goal = n.pos.add(Point.dir(n.pos.toward(plyr.pos)+15, lerp(n.pos.dist(plyr.pos), dist)));
      shooting = nd < 750;
      if (goal.y > plyr.y) { move.u = 1; }
      if (goal.y < plyr.y) { move.u = -1; }
      if (goal.x > plyr.x) { move.r = 1; }
      if (goal.x < plyr.x) { move.r = -1; }
      var lookpos = n.pos;
      if (nd > 500) {
        lookpos = plyr.pos.add(Point.dir(n.pos.toward(plyr.pos), 5));
      } else if (plyr.pos.dist(goal) > 100) {
        lookpos = plyr.pos.add(Point.dir(goal.toward(plyr.pos), 5));
      }
      mouse.set(lookpos.sub(camera.pos).div(camera.fov/GLOBALSCALE).div(Point(1,-1)).add(
        Point(window.innerWidth,window.innerHeight).div(2)
      ));
    }
    const move2 = {
      "w": move.u == 1, "s": move.u == -1,
      "d": move.r == 1, "a": move.u == -1,
    };
    for (var key in move2) {
      if (move2[key]) { keysdown.add(key.toUpperCase()); }
      else { keysdown.delete(key.toUpperCase()); }
    }
    if (shooting) { keysdown.add(MOUSEDOWN); }
    else { keysdown.delete(MOUSEDOWN); }
  }
}