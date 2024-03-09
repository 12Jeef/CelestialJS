const ENEMIES = {
  basic: {
    name: "basic",
    rad: 40, hp: 15, speed: 0.25, reloadmax: 4, deathex: 5, score: 50, exp: 10, dirscroll: 0.25,
    hitbox: [
      [-17,15],
      [10,15],
      [22,0],
      [10,-15],
      [-17,-15],
      [-28,0],
    ]
  },
  glider: {
    name: "glider",
    rad: 40, hp: 15, speed: 0.375, reloadmax: 2, deathex: 7, score: 50, exp: 10, dirscroll: 0.25,
    hitbox: [
      [-14,16],
      [-7,20],
      [11,61],
      [23,57],
      [13,18],
      [26,0],
      [13,-18],
      [23,-57],
      [11,-61],
      [-7,-20],
      [-14,-16],
      [-28,0],
    ]
  },
  overseer: {
    name: "overseer",
    rad: 50, hp: 20, speed: 0.1, reloadmax: 1, deathex: 10, score: 100, exp: 25, dirscroll: 0.1,
    hitbox: [
      [-3,32],
      [29,14],
      [18,0],
      [29,-14],
      [-3,-32],
      [-30,0],
    ]
  },
  drone: {
    name: "drone",
    rad: 20, hp: 1, speed: 0.5, reloadmax: 1, deathex: 1, score: 10, exp: 0.5, dirscroll: 0.1,
    hitbox: CollisionShape.circle(0, 8, 6).points
  },
  tank: {
    name: "tank",
    rad: 230, hp: 100, speed: 0.1, reloadmax: 1, deathex: 25, score: 100, exp: 35, dirscroll: 0.1, dirmaxscroll: 10,
    hitbox: [
      [-76,112],
      [105,87],
      [122,38],
      [114,31],
      [130,10],
      [130,-10],
      [114,-31],
      [122,-38],
      [105,-87],
      [-76,-112],
      [-112,0],
    ]
  },
  serpent: {
    name: "serpent",
    rad: PRECISION, hp: 25, speed: 0, reloadmax: 2, deathex: 10, score: 50, exp: 50, dirscroll: 0.1,
    bar: { createbar: true },
    hitbox: [
      [-11,34],
      [25,26],
      [45,0],
      [25,-26],
      [-11,-34],
      [-30,0],
    ]
  },
  laser: {
    name: "laser",
    rad: 60, hp: 50, speed: 0.1, reloadmax: 1, deathex: 10, score: 50, exp: 25, dirscroll: 0.1, dirmaxscroll: 10,
    hitbox: [
      [-35,12],
      [-26,18],
      [-26,33],
      [25,24],
      [25,-24],
      [-26,-33],
      [-26,-18],
      [-35,-12],
    ]
  },
  warship: {
    name: "warship",
    rad: 280, hp: 500, speed: 0.1, reloadmax: 10, deathex: 50, score: 1000, exp: 150, dirscroll: 0.05, dirmaxscroll: 5,
    bar: { createbar: true },
    hitbox: [
      [-232,10],
      [-138,18],
      [-132,24],
      [-130,50],
      [-160,58],
      [-172,72],
      [-136,116],
      [56,116],
      [90,76],
      [420,46],
      [444,2],
      [330,2],
      [330,-2],
      [444,-2],
      [420,-46],
      [90,-76],
      [56,-116],
      [-136,-116],
      [-172,-72],
      [-160,-58],
      [-130,-50],
      [-132,-24],
      [-138,-18],
      [-232,-10],
      [-242,0],
    ]
  },
  kronos: {
    name: "kronos",
    rad: 160, hp: 450, speed: 0.1, reloadmax: 0, deathex: 25, score: 0, exp: 0, dirscroll: 1,
    bar: { createbar: true, blocksat: [1/6,2/6,3/6,4/6,5/6] },
    hitbox: [
      [-64,0],
      [-80,26],
      [-64,55],
      [-33,55],
      [-19,83],
      [19,83],
      [33,55],
      [64,55],
      [80,26],
      [64,0],
      [80,-26],
      [64,-55],
      [33,-55],
      [19,-83],
      [-19,-83],
      [-33,-55],
      [-64,-55],
      [-80,-26],
    ]
  },
  kronos_shard: {
    name: "kronos shard",
    rad: 50, hp: 75, speed: 0.1, reloadmax: 1, deathex: 15, score: 500, exp: 100, dirscroll: 0.025, dirmaxscroll: 10,
    bar: { createbar: true },
    hitbox: [
      [-9,29],
      [21,29],
      [21,-29],
      [-9,-29],
      [-26,0],
    ]
  },
  kronos_drone: {
    name: "kronos drone",
    rad: 20, hp: 10, speed: 0.5, reloadmax: 1, deathex: 0, score: 0, exp: 0, dirscroll: 0.1,
    hitbox: CollisionShape.circle(0, 10, 6).points
  },
  kronos_ram_drone: {
    name: "kronos rammer drone",
    rad: 20, hp: 3, speed: 0.875, reloadmax: 0, deathex: 5, score: 25, exp: 5, dirscroll: 0.25,
    hitbox: CollisionShape.circle(0, 10, 6).points
  },
  saw_spitter: {
    name: "saw spitter",
    rad: 90, hp: 50, speed: 0.25, reloadmax: 1, deathex: 10, score: 50, exp: 15, dirscroll: 0.25,
    hitbox: [
      [-45,16],
      [-23,28],
      [45,41],
      [45,14],
      [34,13],
      [34,-13],
      [45,-14],
      [45,-41],
      [-23,-28],
      [-45,-16],
    ]
  },
  saw_bullet: {
    name: "saw bullet",
    rad: 50, hp: 10, speed: 1.5, reloadmax: 0, deathex: 5, score: 0, exp: 0, dirscroll: 0, dirmaxscroll: 0,
    hitbox: [
      
    ]
  },
  grinder: {
    name: "grinder",
    rad: 110, hp: 100, speed: 0.5, reloadmax: 0, deathex: 15, score: 100, exp: 15, dirscroll: 0.25,
    hitbox: [
      [-29,12],
      [-48,16],
      [-48,50],
      [31,35],
      [64,40],
      [64,23],
      [49,16],
      [49,-16],
      [64,-23],
      [64,-40],
      [31,-35],
      [-48,-50],
      [-48,-16],
      [-29,-12],
    ]
  },
  saw: {
    name: "saw",
    rad: 50, hp: 1, speed: 0, reloadmax: 0, deathex: 0, score: 0, exp: 0, dirscroll: 0, dirmaxscroll: 0,
    hitbox: [
      
    ]
  },
  cameo_grinder: {
    name: "cameo-grinder",
    rad: 70, hp: 15, speed: 0.25, reloadmax: 0, deathex: 10, score: 25, exp: 15, dirscroll: 0.25,
    hitbox: [
      [-22,24],
      [31,36],
      [31,4],
      [53,9],
      [53,-9],
      [31,-4],
      [31,-36],
      [-22,-24],
    ]
  },
  electro: {
    name: "electro",
    rad: 110, hp: 100, speed: 0.75, reloadmax: 0, deathex: 15, score: 100, exp: 15, dirscroll: 0.25,
    hitbox: [
      
    ]
  },
  asteroid_tanker: {
    name: "asteroid tanker",
    rad: 110, hp: 100, speed: 0.25, reloadmax: 1, deathex: 15, score: 75, exp: 25, dirscroll: 0.25,
    hitbox: [
      [-57,13],
      [-48,20],
      [-49,51],
      [31,35],
      [31,33],
      [66,33],
      [80,18],
      [48,18],
      [48,-18],
      [80,-18],
      [66,-33],
      [31,-33],
      [31,-35],
      [-49,-51],
      [-48,-20],
      [-57,-13],
    ]
  },
  asteroid_tank: {
    name: "asteroid tank",
    rad: 170, hp: 100, speed: 0.25, reloadmax: 0, deathex: 25, score: 75, exp: 25, dirscroll: 0.25,
    hitbox: [
      [-163,50],
      [-80,84],
      [124,84],
      [163,53],
      [163,-53],
      [124,-84],
      [-80,-84],
      [-163,-50],
    ]
  },
  black_hole: {
    name: "black hole",
    rad: 75, hp: 1, speed: 0, reloadmax: 0, deathex: 0, score: 0, exp: 0, dirscroll: 0, dirmaxscroll: 0,
    hitbox: [
      
    ]
  },
  vulcan: {
    name: "vulcan",
    rad: 180, hp: 250, speed: 0.5, reloadmax: 4, deathex: 25, score: 1000, exp: 250, dirscroll: 0.25,
    bar: { createbar: true },
    hitbox: [
      [-86,32],
      [-48,51],
      [-48,85],
      [-21,80],
      [-7,111],
      [37,111],
      [58,67],
      [85,61],
      [85,53],
      [111,53],
      [121,20],
      [121,-20],
      [111,-53],
      [85,-53],
      [85,-61],
      [58,-67],
      [37,-111],
      [-7,-111],
      [-21,-80],
      [-48,-85],
      [-48,-51],
      [-86,-32],
    ]
  },
  vulcan_drone: {
    name: "vulcan drone",
    rad: 90, hp: 25, speed: 0.5, reloadmax: 2, deathex: 15, score: 100, exp: 75, dirscroll: 0.25,
    hitbox: [
      [-19,9],
      [-24,10],
      [-30,36],
      [-13,33],
      [-11,42],
      [4,42],
      [11,28],
      [40,21],
      [43,2],
      [43,-2],
      [40,-21],
      [11,-28],
      [4,-42],
      [-11,-42],
      [-13,-33],
      [-30,-36],
      [-24,-10],
      [-19,-9],
    ]
  },
  healer_drone: {
    name: "healer drone",
    rad: 60, hp: 50, speed: 0.75, reloadmax: 0, deathex: 5, score: 50, exp: 25, dirscroll: 0.5,
    hitbox: [
      [-15,7],
      [-20,8],
      [-23,28],
      [30,16],
      [33,0],
      [30,-16],
      [-23,-28],
      [-20,-8],
      [-15,-7],
    ]
  },
  gunner_serpent: {
    name: "gunner serpent",
    rad: 60, hp: 50, speed: 0, reloadmax: 0, deathex: 10, score: 50, exp: 50, dirscroll: 0.1,
    bar: { createbar: true },
    hitbox: [
      [-26,30],
      [26,30],
      [47,0],
      [26,-30],
      [-26,-30],
      [-11,0],
    ]
  },
  turret_base: {
    name: "turret",
    rad: 60, hp: 15, speed: 0, reloadmax: 0, deathex: 10, score: 25, exp: 25, dirscroll: 0, dirmaxscroll: 0,
    hitbox: [
      
    ]
  },
  turret: {
    name: "turret",
    rad: 50, hp: 1, speed: 0, reloadmax: 0, deathex: 10, score: 0, exp: 0, dirscroll: 1,
    hitbox: [
      
    ]
  },
  bomber: {
    name: "bomber",
    rad: 80, hp: 50, speed: 0.5, reloadmax: 1, deathex: 15, score: 50, exp: 35, dirscroll: 0.25,
    hitbox: [
      [-47,19],
      [-66,25],
      [-38,41],
      [36,36],
      [67,20],
      [47,14],
      [47,-14],
      [67,-20],
      [36,-36],
      [-38,-41],
      [-66,-25],
      [-47,-19],
      [-44,0],
    ]
  },
  bomb: {
    name: "bomb",
    rad: 25, hp: 25, speed: 0, reloadmax: 0, deathex: 0, score: 0, exp: 0, dirscroll: 0, dirmaxscroll: 0,
    hitbox: [
      
    ]
  },
  aries: {
    name: "aries",
    rad: 215, hp: 100, speed: 0.1, reloadmax: 0, deathex: 30, score: 100, exp: 50, dirscroll: 0.25,
    bar: { createbar: true },
    hitbox: [
      [-56,100],
      [56,100],
      [119,0],
      [56,-100],
      [-56,-100],
      [-119,0],
    ]
  },
  celestial_spawn: {
    name: "",
    rad: 500, hp: 60*10, speed: 0, reloadmax: 0, deathex: 25, score: 0, exp: 0, dirscroll: 0, dirmaxscroll: 0,
    bar: { createbar: true },
    hitbox: [
      
    ]
  },
  celestial: {
    name: "celestial",
    rad: 0, hp: 10000, speed: 0, reloadmax: 0, deathex: 0, score: 10000, exp: 10000, dirscroll: 0, dirmaxscroll: 0,
    hitbox: [
      
    ]
  },
  orca: {
    name: "ORCA DESTROYER OF WORLDS",
    rad: 150, hp: 500, speed: 0.5, reloadmax: 4, deathex: 25, score: 1000, dirscroll: 0.25,
    bar: { createbar: true },
    hitbox: [
      
    ]
  },
};