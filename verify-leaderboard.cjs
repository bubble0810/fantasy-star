'use strict';
const assert=require('node:assert/strict');
const L=require('./leaderboard.js');
const players=['a','b','c','d'].map(uid=>({uid,name:uid,level:10}));
const rec=(uid,type,value,at,id=uid+':'+type+':'+at)=>({id,uid,type,value,achievedAt:at,recordedAt:at});
const calc=(records,extra={})=>L.calculate({players,records,config:{enabled:true},...extra},10000);
let result=calc([
  rec('a','stroop',{score:20},100),rec('b','stroop',{score:20},90),
  rec('c','stroop',{score:10},80),rec('d','stroop',{score:5},70),
  rec('a','stroop',{score:20},200)
]);
assert.deepEqual(result.boards.stroop.map(r=>r.uid),['b','a','c']);
assert.equal(result.boards.stroop[1].achievedAt,100,'equal replay must not replace first achievement');
assert.equal(result.boards.total[0].score,6);
assert(!result.boards.total.some(r=>r.uid==='d'),'fourth place earns no points');
result=calc([
  rec('a','memory',{completed:true,pairs:8,tries:9},100),
  rec('b','memory',{completed:true,pairs:8,tries:8},200),
  rec('c','memory',{completed:true,pairs:10,tries:8},50),
  rec('d','memory',{completed:true,pairs:8,tries:7},50),
  rec('a','maze',{completed:true,stage:2,durationMs:1},50),
  rec('b','maze',{completed:true,stage:3,durationMs:10000},200),
  rec('c','maze',{completed:false,stage:3,durationMs:100},50),
  rec('d','maze',{completed:true,stage:3,durationMs:9000},300)
]);
assert.deepEqual(result.boards.memory.map(r=>r.uid),['b','a']);
assert.deepEqual(result.boards.maze.map(r=>r.uid),['d','b']);
result=calc([
  rec('a','quest',{cleared:4,stars:12},10),rec('b','quest',{cleared:5,stars:5},20),
  rec('c','quest',{cleared:5,stars:6},30),rec('d','quest',{cleared:5,stars:6},40)
]);
assert.deepEqual(result.boards.quest.map(r=>r.uid),['c','d','b']);
const legacy={id:'old',uid:'a',type:'stroop',value:{score:100},legacy:true,achievedAt:null,recordedAt:200};
result=calc([legacy,rec('b','stroop',{score:50},50),rec('c','stroop',{score:40},200)],{
  config:{enabled:true,startsAt:100},players:players.map(p=>({...p,resetAt:p.uid==='c'?{stroop:200}:{}}))
});
assert.deepEqual(result.boards.stroop.map(r=>r.uid),['a']);
assert.equal(result.boards.stroop[0].achievedAt,200);
assert.equal(calc([legacy],{players:players.map(p=>({...p,excluded:p.uid==='a'}))}).boards.total.length,0);
assert.equal(calc([rec('a','stroop',{score:2},11000)]).boards.total.length,0);
assert.throws(()=>calc([legacy,legacy]),/Unique record/);
const catalog={lookIds:['L-M01','L-F01'],roomIds:['R00','R01']};
assert.deepEqual(L.collectionValue({items:['L-M01','L-M01','L-F01','fake'],homes:['R00','R01','R01']},catalog),{
  count:4,lookIds:['L-M01','L-F01'],roomIds:['R00','R01']
});
const imported=L.legacyRecords('a',{best:{maze:3,memory:8,stroop:10},maxLv:99,lvStars:{0:3,1:2,108:3}},200,catalog);
assert(!imported.some(r=>r.type==='maze'));
assert.deepEqual(imported.find(r=>r.type==='quest').value,{cleared:2,stars:5});
// Total-score ties: use when the current score was attained, not oldest account/record.
const ties=[rec('a','stroop',{score:10},100),rec('b','memory',{completed:true,pairs:8,tries:8},200)];
assert.deepEqual(calc(ties).boards.total.map(r=>r.uid),['a','b']);
assert.deepEqual(calc([...ties].reverse()).boards.total.map(r=>r.uid),['a','b']);
const all=Object.keys(L.types).map((type,i)=>rec('a',type,{
  stroop:{score:10},memory:{completed:true,pairs:8,tries:8},maze:{completed:true,stage:3,durationMs:1000},
  quest:{cleared:108,stars:324},looks:{count:3}
}[type],100+i));
assert.equal(calc(all).boards.total[0].score,30,'all five wins: maximum weighted score 30');
console.log('Leaderboard checks passed: five boards, ties, weights, history, reset, exclusions and legacy import.');
