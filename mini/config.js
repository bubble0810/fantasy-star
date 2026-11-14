/* 三個競賽小遊戲的共用設定：主頁 index.html 與 mini/ 內的遊戲頁都載入這一份。
   改關卡、門檻、秒數、配色只要改這裡。 */

/* ---------- 電流急急棒 ---------- */
function serp(){const pts=[[30,290],[60,280]];const rows=[280,200,120,40];
  rows.forEach((y,r)=>{const ltr=r%2===0;for(let k=0;k<=24;k++){const t=k/24,x=ltr?60+200*t:260-200*t;pts.push([x,y+12*Math.sin(Math.PI*4*t)])}
    if(r<3){const cx=ltr?260:60;for(let k=1;k<12;k++){const a=Math.PI/2+(ltr?-1:1)*Math.PI*k/12;pts.push([cx+40*Math.cos(a),y-40+40*Math.sin(a)])}}});
  pts.push([30,40]);return pts}
/* 五條路線，由易到難；只有第 5 關（MAZE_COMP）列入排行。座標以 320×320 為準。 */
const MAZES=[
  {n:'第 1 關',d:'練習大道',w:46,time:40,exp:8,candy:8,pts:[[30,290],[30,160],[290,160],[290,40]]},
  {n:'第 2 關',d:'彎彎小路',w:40,time:40,exp:10,candy:10,pts:[[30,290],[160,290],[160,200],[60,200],[60,110],[260,110],[260,40],[290,40]]},
  {n:'第 3 關',d:'寬軌道',w:34,time:40,exp:15,candy:15,pts:[[30,290],[30,200],[120,200],[120,80],[220,80],[220,240],[290,240],[290,40]]},
  {n:'第 4 關',d:'鋸齒山路',w:24,time:40,exp:25,candy:25,pts:[[30,290],[80,230],[130,290],[180,230],[230,290],[290,230],[290,160],[230,110],[170,160],[110,110],[50,160],[50,40],[290,40]]},
  {n:'第 5 關',d:'波浪迷宮・競賽關',w:19,time:50,exp:40,candy:40,pts:serp()}
];
const MAZE_COMP=MAZES.length-1;
/* 五套配色，依關卡 L1～L5：晨光綠、天空藍、青綠、星紫、夕陽 */
const MAZE_SKINS=[
  {name:'晨光綠',page:'#0f2622',bg:['#123326','#0f2130'],edge:['#b8f5a0','#5fd08a','#3fa7a0'],road:['#2a5a45','#1a3a33'],ring:'#d9ffd0'},
  {name:'天空藍',page:'#101a33',bg:['#14284a','#101834'],edge:['#a9d8ff','#5fa8f0','#7a86e8'],road:['#2c4a75','#1c2e52'],ring:'#d4ecff'},
  {name:'青綠',page:'#0d1d2a',bg:['#102737','#11182f'],edge:['#73f2dc','#42bcd5','#738de8'],road:['#245061','#183449'],ring:'#adffef'},
  {name:'星紫',page:'#171430',bg:['#25213f','#13172f'],edge:['#dab5ff','#9c7ae8','#6f9de6'],road:['#49416a','#292d4e'],ring:'#e6cbff'},
  {name:'夕陽',page:'#1d1426',bg:['#331e35','#171a32'],edge:['#ffca9b','#ef82ae','#a68bea'],road:['#5c354f','#332b4a'],ring:'#ffe2ce'}
];

/* ---------- 記憶翻牌 ---------- */
/* L1～L5；L3～L5 是競賽區，只有 L5（12 對）列入排行。 */
const MEMORY_TIERS=[{pairs:4,maxCandy:20,full:6,name:'星光初探'},{pairs:6,maxCandy:40,full:9,name:'月影試煉'},{pairs:8,maxCandy:60,full:12,name:'極光挑戰'},{pairs:10,maxCandy:80,full:15,name:'星河競技'},{pairs:12,maxCandy:100,full:18,name:'銀河決賽'}];
const MEMORY_COMP=5;

/* ---------- 顏色陷阱 ---------- */
const COLORS=[['紅','#e53950'],['藍','#2f6bff'],['綠','#1f9d55'],['黃','#e0a800'],['紫','#8e44d6']];
/* 主線與競賽共用：顏色數、是否有反轉題、秒數 */
const STROOP_TIERS=[{n:3,rev:false,sec:10,name:'三色暖身'},{n:3,rev:true,sec:15,name:'三色反轉'},{n:4,rev:false,sec:20,name:'四色挑戰'},{n:4,rev:true,sec:25,name:'四色反轉'},{n:5,rev:true,sec:30,name:'五色決賽'}];
const STROOP_COMP=5,STROOP_UNLOCK=10,STROOP_REV=.18;   /* 排行關、舊存檔最佳達此分數就全開、反轉題機率 */
/* 五套底色（字卡固定白底）：淺藍、薄荷、蜜桃、薰衣草、深夜金 */
const STROOP_SKINS=[
  {name:'淺藍',page:'#e3f1ff',card:'#ffffff',ink:'#24406b',muted:'#5a7398',edge:'#b9d6f5'},
  {name:'薄荷',page:'#dcf6ef',card:'#ffffff',ink:'#1f5a4c',muted:'#4f8577',edge:'#a8e2d2'},
  {name:'蜜桃',page:'#ffe6d6',card:'#ffffff',ink:'#7a3b22',muted:'#a0644a',edge:'#f6c3a5'},
  {name:'薰衣草',page:'#ece3ff',card:'#ffffff',ink:'#4b2f8a',muted:'#7562a8',edge:'#cdbcf2'},
  {name:'深夜金',page:'#1d1a3a',card:'#ffffff',ink:'#f6dc8c',muted:'#cbbf96',edge:'#e7b23f'}
];

/* ---------- 星數門檻 ---------- */
/* 急急棒秒數、顏色陷阱分數是 [3 星, 2 星]；翻牌次數是 [3 星, 2 星, 上限]。
   翻牌：3 星 ≤ 對數×2、2 星 ≤ 對數×3−1，其餘 1 星，沒有次數上限，只有沒翻完才算失敗。 */
const MAZE_STAR=t=>[2+2*(t-1),3+2*(t-1)];          /* 待試玩校正 */
const STROOP_STAR=t=>[6+3*(t-1),4+3*(t-1)];        /* 1 星＝0 分以上 */
const MEMORY_STAR=p=>[p*2,p*3-1,Infinity];
