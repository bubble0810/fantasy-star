// Timing estimates only: seeded simulation, not human playtest measurements.
const Race = require('./fest/dragonboat/engine.js');
console.log('1000 m 競速時間模擬，含水流、AI 划船與互相攻擊；玩家不使用攻擊。非真人實測。');
for (const [label, chance] of [['不額外划船', 0], ['偶爾抓準節奏', .2], ['持續抓準節奏', 1]]) {
  const times = []; let wins = 0;
  for (let run = 1; run <= 300; run++) {
    let seed = run;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const race = new Race(5, random);
    for (let beat = .7; !race.finished && beat < 90; beat += 1.4) {
      race.advance(beat);
      if (!race.finished && random() < chance) race.stroke();
    }
    if (!race.finished) throw new Error('Race did not finish');
    times.push(race.time);
    if (race.rank(0) === 1) wins++;
  }
  times.sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`${label}（300局）：平均 ${mean.toFixed(1)} 秒，P10–P90 ${times[30].toFixed(1)}～${times[270].toFixed(1)} 秒，玩家第一名 ${(wins/3).toFixed(1)}%`);
}
