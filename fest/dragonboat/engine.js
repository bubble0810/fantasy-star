/* Deterministic elapsed-time race model, shared by browser and verification. */
(function (root) {
  'use strict';
  class Race {
    constructor(ammo, random = Math.random) {
      this.random = random; this.time = 0; this.finished = false; this.order = [];
      this.challenge = 25; this.challengeUntil = 0;
      this.events = []; this.nextWater = 3;
      this.boats = ['玩家', '紅龍舟', '藍龍舟'].map((name, id) => ({
        id, name, remaining: 1000, ammo: id ? 3 : ammo, boostUntil: 0,
        hitUntil: 0, protectedUntil: 0, waterUntil: 0, water: 1,
        nextAttack: 4 + id * .7, nextStroke: .6 + id * .13, speed: 25,
        drive: 25, streak: 0, lastGood: -Infinity
      }));
    }
    speed(b) {
      return (this.time < b.boostUntil ? b.drive : 25) *
        (this.time < b.waterUntil ? b.water : 1) * (this.time < b.hitUntil ? .5 : 1);
    }
    stroke() {
      const b = this.boats[0];
      if (this.finished || this.time - b.lastGood < .75) return false;
      b.streak = this.time - b.lastGood <= 2.1 ? Math.min(3, b.streak + 1) : 1;
      b.lastGood = this.time; b.drive = [25, 35, 50, 70][b.streak];
      if (b.drive >= 50) { this.challenge = b.drive; this.challengeUntil = this.time + 4.2; }
      b.boostUntil = this.time + 1.6; return true;
    }
    missStroke() { this.boats[0].streak = 0; }
    attack(from, to) {
      const a = this.boats[from], b = this.boats[to];
      if (this.finished || !a || !b || from === to || a.ammo <= 0 || this.time < b.protectedUntil) return false;
      a.ammo--; b.hitUntil = this.time + 1.5; b.protectedUntil = this.time + 2.5;
      this.events.push({kind: 'attack', from, to, time: this.time}); return true;
    }
    advance(target) {
      while (!this.finished && this.time < target - 1e-9) {
        const dt = Math.min(.01, target - this.time);
        if (this.time >= this.nextWater) {
          for (const b of this.boats) {
            b.water = this.random() < .5 ? 1.4 : .65;
            b.waterUntil = this.time + (b.water > 1 ? 2 : 1.5);
            this.events.push({kind: 'water', to: b.id, water: b.water, time: this.time});
          }
          this.nextWater += 4.5;
        }
        for (const b of this.boats.slice(1)) {
          if (this.time >= b.nextStroke) {
            const chasing = this.time < this.challengeUntil;
            const accuracy = chasing ? (b.id === 1 ? .9 : .82) : .35;
            if (this.random() < accuracy) {
              b.drive = chasing ? this.challenge * (b.id === 1 ? 1.03 : .98) : 32;
              b.boostUntil = this.time + (chasing ? 1.6 : .75);
            }
            b.nextStroke += 1.4;
          }
          if (this.time >= b.nextAttack) {
            const targets = this.boats.filter(v => v !== b && this.time >= v.protectedUntil);
            if (targets.length) this.attack(b.id, targets[Math.floor(this.random() * targets.length)].id);
            b.nextAttack += 3 + this.random() * 2;
          }
        }
        const speeds = this.boats.map(b => this.speed(b));
        let step = dt;
        for (const b of this.boats) step = Math.min(step, b.remaining / speeds[b.id]);
        for (const b of this.boats) {
          b.speed = speeds[b.id]; b.remaining = Math.max(0, b.remaining - b.speed * step);
        }
        this.time += step;
        if (this.boats.some(b => b.remaining < 1e-7)) {
          this.finished = true;
          // Equal distances share sporting rank; stable IDs only order the display.
          this.order = [...this.boats].sort((a, b) => a.remaining - b.remaining || a.id - b.id);
        }
      }
    }
    rank(id) {
      const distance = this.boats[id].remaining;
      return 1 + this.boats.filter(b => b.remaining < distance - 1e-7).length;
    }
  }
  if (typeof module !== 'undefined') module.exports = Race;
  else root.DragonRace = Race;
})(typeof window === 'undefined' ? globalThis : window);
