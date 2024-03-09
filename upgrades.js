const UPGRADES = {
  bullet_dmg: {
    b: 10, tier: 1,
    name: "Bullet Damage",
    pts: ["+5% bullet damage"],
    onbuy: plyr => plyr.bullet_dmg*=1.05,
  },
  blast: {
    tier: 2, from: ["bullet_dmg"],
    name: "Blast",
    pts: ["When energy full: shoot large blast (5 dmg)"],
  },
  stun: {
    tier: 2, from: ["bullet_dmg"],
    name: "Stunner",
    pts: ["All bullets stun enemies for 1-3 seconds"],
    onbuy: plyr => plyr.addbulleteffect("slowness", [60,180], 1, "ALL"),
  },
  poison: {
    tier: 2, from: ["bullet_dmg"],
    name: "Poison",
    pts: ["All bullets stun enemies for 1-3 seconds"],
    onbuy: plyr => plyr.addbulleteffect("poison", [60,180], 1, "ALL"),
  },
  explode: {
    tier: 3, from: ["blast"],
    name: "Explosive",
    pts: ["When energy full: shoot large blast (5 dmg) that explodes (3 dmg)"],
    onbuy: plyr => plyr.explosiondmg = 3,
  },
  fireball: {
    tier: 3, from: ["blast"],
    name: "Fireball",
    pts: ["When energy full: shoot large blast (5 dmg) that sets enemies on fire"],
    onbuy: plyr => plyr.addbulleteffect("fire", [120,240], 1, "BLAST"),
  },
  disease: {
    tier: 3, from: ["stun", "poison"],
    name: "Diseased",
    pts: ["All bullets stun enemies for 3 seconds", "All bullets poison enemies for 3-5 seconds"],
    onbuy: function(plyr) {
      plyr.addbulleteffect("slowness", [180,180], 2, "ALL");
      plyr.addbulleteffect("poison", [180,300], 2, "ALL");
    },
  },
  missile: {
    tier: 4, from: ["explode", "fireball"],
    name: "Missile",
    pts: ["When energy full: [ RIGHT CLICK ] to shoot missile"],
  },

  bullet_spd: {
    b: 10, tier: 1,
    name: "Bullet Speed",
    pts: ["+10% bullet speed"],
    onbuy: plyr => plyr.bullet_spd*=1.1,
  },
  railgun: {
    b: 5, tier: 2, from: ["bullet_spd"],
    name: "Railgun",
    pts: ["+1 bullet penetration"],
    onbuy: plyr => plyr.bullet_hp++,
  },
  view: {
    tier: 2, from: ["bullet_spd"],
    name: "View",
    pts: ["+50% view distance"],
    onbuy: plyr => plyr.view*=1.5,
  },

  reload: {
    b: 10, tier: 1,
    name: "Reload",
    pts: ["+5% reload speed"],
    onbuy: plyr => plyr.reload_spd*=1.05,
  },
  /*
  twin: {
    tier: 2, from: ["reload"],
    name: "Twin",
    pts: ["Shoot two bullets", "-25% bullet damage"],
    onbuy: plyr => plyr.bullet_dmg*=0.75,
  },
  triplet: {
    tier: 2, from: ["reload"],
    name: "Triplet",
    pts: ["Shoot three bullets at once", "-50% bullet damage"],
    onbuy: plyr => plyr.bullet_dmg*=0.5,
  },
  spread: {
    tier: 2, from: ["reload"],
    name: "Spread",
    pts: ["Shoot five bullets forward", "-60% bullet damage"],
    onbuy: plyr => plyr.bullet_dmg*=0.4,
  },
  */

  hp: {
    b: 25, tier: 1,
    name: "Health",
    pts: ["+10% max health"],
    onbuy: plyr => plyr.hpmax=Math.ceil(plyr.hpmax*1.1),
  },
  heal: {
    b: 10, tier: 2, from: ["hp"],
    name: "Healing",
    pts: ["+10% passive healing"],
    onbuy: plyr => plyr.heal*=1.1,
  },
  immunity: {
    tier: 2, from: ["hp"],
    name: "Bonus Immunity",
    pts: ["10% chance of immunity per hit"],
    onbuy: plyr => plyr.immunity = 0.1,
  },
  sh: {
    b: 10, tier: 2, from: ["hp"],
    name: "Shield Strength",
    pts: ["+10% shield resistance"],
    onbuy: plyr => plyr.shieldres*=0.9,
  },
  sh_x3: {
    tier: 3, from: ["immunity", "sh"],
    name: "Triple Shield",
    pts: ["3 orbiting shields", "Shields have 10 hp", "Shields take 30 seconds to regenerate after being destroyed"],
    onbuy: function(plyr) { plyr.shields=3; plyr.shieldhp=10; plyr.shieldrecharge=30*60; },
  },
  sh_electro: {
    tier: 4, from: ["sh_x3"],
    name: "Electric Shields",
    pts: ["3 orbiting shields", "Shields have 10 hp", "Shields take 30 seconds to regenerate after being destroyed", "Shields electrocute enemies who get too close"],
    onbuy: function(plyr) { plyr.shields=3; plyr.shieldhp=10; plyr.shieldrecharge=30*60; plyr.shieldelectro=true; },
  },

  speed: {
    b: 10, tier: 1,
    name: "Movement Speed",
    pts: ["+5% movement speed"],
    onbuy: plyr => plyr.speed*=1.05,
  },
  aftershock: {
    tier: 2, from: ["speed"],
    name: "Aftershock",
    pts: ["On kill: +50% movement speed for 3 seconds"],
    onbuy: plyr => plyr.addeffect("speed", 3*60),
  },
  menergy: {
    tier: 2, from: ["speed"],
    name: "Moving Energy",
    pts: ["When moving at top speeds: 200% energy increase rate"],
  },
  mresistance: {
    tier: 3, from: ["menergy"],
    name: "Moving Resistance",
    pts: ["When moving at top speeds: 75% damage taken"],
  },
  mheal: {
    tier: 3, from: ["menergy"],
    name: "Moving Heal",
    pts: ["When moving at top speeds: 200% passive healing"],
  },
  dash: {
    tier: 3, from: ["aftershock"],
    name: "Dash",
    pts: ["[ SPACE ] to boost towards mouse"],
  },
  mdmg: {
    tier: 4, from: ["mresistance", "mheal"],
    name: "Moving Damage",
    pts: ["When moving at top speeds: 125% damage done"],
  },

  allies: {
    b: 32, tier: 1,
    name: "Allies",
    pts: ["+1 maximum construction limit"],
    onbuy: plyr => plyr.conlimit++,
  },
  drone: {
    b: 16, tier: 2, from: ["allies"],
    name: "Drones",
    pts: ["+1 maximum drone limit", "[ 1 ] to construct drone"],
    onbuy: plyr => plyr.condronelimit++,
  },
  turret: {
    b: 16, tier: 2, from: ["allies"],
    name: "Turrets",
    pts: ["+1 maximum turret limit", "[ 2 ] to construct turret"],
    onbuy: plyr => plyr.conturretlimit++,
  },
  chp: {
    b: 10, tier: 2, from: ["allies"],
    name: "Construction Health",
    pts: ["+10% construction health"],
    onbuy: plyr => plyr.conhp*=1.1,
  },
  _1: {tier: 3, from: ["drone"]},
  o_drone: {
    tier: 3, from: ["drone"],
    name: "Orbit Drone",
    pts: ["[ 3 ] to construct orbiting drone"],
  },
  ttwin: {
    tier: 3, from: ["turret"],
    name: "Twin Turret",
    pts: ["Turrets have twin gun"],
    onbuy: plyr => plyr.turretbarrels=2,
  },
  tview: {
    tier: 3, from: ["turret"],
    name: "Turret View",
    pts: ["+50% turret view distance"],
    onbuy: plyr => plyr.turretview*=1.5,
  },
  cdmg: {
    b: 10, tier: 3, from: ["chp"],
    name: "Construction Bullet Damage",
    pts: ["+5% construction bullet damage"],
    onbuy: plyr => plyr.condmg*=1.05,
  },
  ttriplet: {
    tier: 4, from: ["ttwin"],
    name: "Triplet Turret",
    pts: ["Turrets have triplet gun"],
    onbuy: plyr => plyr.turretbarrels=3,
  },
}