// Planning model, not observed player averages. Run from the repository root.
const fs=require('fs'),vm=require('vm');
const context={window:{}};
vm.runInNewContext(fs.readFileSync('festival-config.js','utf8'),context);
const games=context.window.GAMEF;
const html=k=>fs.readFileSync(`fest/${k}/index.html`,'utf8');
const xmas=html('xmas'),children=html('children'),halloween=html('halloween'),newyear=html('newyear');
const modeChances=[...xmas.matchAll(/mChance:([\d.]+)/g)].map(m=>+m[1]);
const completionX=+xmas.match(/completionBonus=(\d+)/)[1];
const completionC=+children.match(/const collected=tickets;tickets\+=(\d+)/)[1];
const goldChance=+halloween.match(/GOLD_CHANCE=([\d.]+)/)[1];
const bigHitMax=+newyear.match(/else\{const n=rint\(0,(\d+)\)/)[1];
let seed=1907;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32}
const int=(lo,hi)=>lo+Math.floor(random()*(hi-lo+1));
function ordinaryBalloon(){const r=random();return r<.45?0:r<.95?1:2}
function rainbow(){const r=random();return r<.6?3:r<.9?4:5}
function sample(k,advanced=false){
 if(k==='halloween')return Array.from({length:12},()=>int(1,5)).reduce((a,b)=>a+b,0)+(random()<goldChance&&random()<.6?10:0);
 if(k==='newyear')return 16+15+Array.from({length:20},()=>int(0,bigHitMax)).reduce((a,b)=>a+b,0)+int(5,10);
 if(k==='xmas'){
   let small=0,medium=0;
   for(let i=0;i<(advanced?10:7);i++)random()<modeChances[advanced?1:0]?medium++:small++;
   small=Math.max(0,small-(advanced?3:0));
   return completionX+small+Array.from({length:medium},()=>int(2,3)).reduce((a,b)=>a+b,0)+int(4,6);
 }
 // Approximate normal balloon spawns from the actual three spawn intervals.
 let normal=0;for(let t=450;t<40000;t+=t<10000?850:t<30000?630:460){normal++;if(random()<(t>10000?.18:.08))normal++}
 let total=completionC;
 for(let i=0;i<normal;i++)if(random()<.65)total+=ordinaryBalloon();
 for(let i=0;i<2;i++)if(random()<.75)total+=rainbow();
 return total;
}
console.log('假設：萬聖找到12隻、出現金色時60%命中；春節首關16紅包且完成第二關；聖誕一般接7份／進階接10份且掉3份小禮物，答對1題；兒童普通命中65%、七彩75%。');
console.log('這是規劃模型，不是試玩實測；完成獎勵僅在正常完成時取得。');
for(const [k,advanced] of [['halloween',false],['xmas',false],['xmas',true],['newyear',false],['children',false]]){
 const g=games[k],n=20000;let total=0;for(let i=0;i<n;i++)total+=sample(k,advanced);
 const mean=total/n,daily=mean*g.runs,cost=g.look*2+g.room;
 console.log(`${g.n}${k==='xmas'?(advanced?'進階':'一般'):''}：每場 ${mean.toFixed(1)}，每日 ${daily.toFixed(1)}，全套 ${cost}，約 ${Math.ceil(cost/daily)} 天`);
}
for(const [label,chances] of [['新手',[.15,.35,.5]],['一般',[.5,.3,.2]],['熟練',[.7,.2,.1]]]){
 const g=games.duanwu,mean=chances.reduce((sum,p,i)=>sum+p*[55,35,25][i],0),daily=mean*g.runs,cost=g.look*2+g.room;
 console.log(`端午${label}（名次機率假設 ${chances.join('/')}，非玩家實測）：每場 ${mean.toFixed(1)}，每日 ${daily.toFixed(1)}，全套 ${cost}，約 ${Math.ceil(cost/daily)} 天`);
}
