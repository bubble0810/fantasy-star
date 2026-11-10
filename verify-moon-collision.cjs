const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const C=require('./fest/moon/collision.js'),atlas=require('./fest/moon/collision-masks.js');
const {chromium}=require(path.join(require('os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
for(const [name,hash] of Object.entries(atlas.sources))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'fest/moon/img',name))).digest('hex'),hash,'Rebuild masks when artwork changes');
const rgba=new Uint8Array(4*4*4);rgba[(1*4+1)*4+3]=255;const small=C.mask(rgba,4,4),a={x:0,y:0,w:4,h:4,mask:small};assert(C.overlap(a,a));assert.equal(C.overlap(a,{...a,x:1}),null,'Transparent overlap cannot hit');assert.equal(C.overlap(a,{...a,x:4}),null);
assert.deepEqual([{item:{type:'branch'},at:10},{item:{type:'gold'},at:10}].sort(C.order).map(e=>e.item.type),['gold','branch'],'An exactly simultaneous gold catch grants its shield first');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
  await page.goto('file:///'+path.resolve('fest/moon/index.html').replaceAll('\\','/')+'?debug=1');await page.waitForFunction(()=>window.fsQuestionsReady);await page.locator('#go').click();
  await page.evaluate(()=>{for(let i=0;i<8;i++){ringStart=performance.now()-ringSpec().period*(ringSpec().min+ringSpec().max)*500;judge();update(flight.until+1);}startRabbits();MoonAudio.stop();sound=()=>{};
    window.collisionScene=(config={})=>{
      const base=performance.now();mode='rabbit';deadline=base+30000;physicsAt=base;spawnAt=Infinity;stock=caught=hits=missed=0;effects=[];
      rabbits=lanes.map(p=>({...p,state:'idle',since:base,hideExtra:0,immuneUntil:0,catchUntil:0}));
      const records=(config.items||[]).map((s,i)=>({...s,id:s.id??i+1,lane:s.lane??0,born:base+(s.born||0),travel:s.travel||2000,pace:s.pace||0,target:dropTarget(s.lane??0,s.type),resolved:false}));items=config.reverse?[...records].reverse():[...records];
      const actions=[...(config.actions||[])].sort((a,b)=>a.at-b.at);let index=0;
      for(let elapsed=0;elapsed<=(config.duration||2600);elapsed+=config.frame||16){const until=Math.min(elapsed,config.duration||2600);while(index<actions.length&&actions[index].at<=until){const action=actions[index++];update(base+action.at);const r=rabbits[action.lane??0];if(r.state==='idle'){r.state=action.action;r.since=base+action.at;r.hideExtra=0;}}update(base+until);}
      update(base+(config.duration||2600));
      return {stock,caught,hits,missed,states:rabbits.map(r=>r.state),contacts:records.map(it=>({id:it.id,type:it.type,at:it.contactAt-base,point:it.contactPoint,expiry:it.born+it.travel-base})),hidden:rabbits.map(r=>rabbitPose(r,base+(config.duration||2600)).hidden)};
    };
  });
  const sweep=await page.evaluate(()=>{const out=[];for(let lane=0;lane<3;lane++)for(const type of ['normal','gold']){const samples=[];for(let at=1100;at<=1950;at+=25){const result=collisionScene({items:[{type,lane}],actions:[{at,lane,action:'jump'}]});samples.push({jumpAt:at,caught:result.caught,contact:result.contacts[0]});}out.push({lane,type,samples});}return out;});
  for(const group of sweep){const accepted=group.samples.filter(s=>s.caught);assert(accepted.length>=3,`${group.lane}/${group.type}: raised paws must catch`);assert(group.samples.some(s=>!s.caught),'Late/early jumps must miss');assert(accepted.every(s=>s.contact.at<s.contact.expiry),'Touch catches before expiry');}
  const spatial=await page.evaluate(()=>{const out=[];for(let lane=0;lane<3;lane++)for(const type of ['normal','gold']){const samples=[];for(let dx=-180;dx<=180;dx+=6){const r=collisionScene({items:[{type,lane,x:lanes[lane].x+dx}],actions:[{at:1500,lane,action:'jump'}]});samples.push({dx,caught:r.caught});}out.push({lane,type,samples});}return out;});
  for(const g of spatial){assert.equal(g.samples[0].caught,0);assert.equal(g.samples.at(-1).caught,0);assert(g.samples.some(s=>s.dx===0&&s.caught===1),'Centered drop can be caught by every sprite');const accepted=g.samples.filter(s=>s.caught);assert(accepted.length>0&&accepted.length*6<=232,'Hit region cannot span the full track or adjacent rabbits');}
  const branchSweep=await page.evaluate(()=>{const out=[];for(let lane=0;lane<3;lane++)for(let at=0;at<=2000;at+=50){const r=collisionScene({items:[{type:'branch',lane,travel:2100}],actions:[{at,lane,action:'jump'}],duration:2900});out.push({lane,jumpAt:at,hits:r.hits});}return out;});assert(branchSweep.every(r=>r.hits===1),'Jumping at any tested time cannot grant branch immunity');
  const report={sampling:{scenePixels:1,scanStepMs:4,refineMs:.125,alphaThreshold:96},sweep,spatial,branchSweep};
  const scenarios=await page.evaluate(()=>{
    const jump={at:1500,action:'jump'},normal=collisionScene({items:[{type:'normal'}],actions:[jump]}),gold=collisionScene({items:[{type:'gold'}],actions:[jump]});
    const baseGold=gold.contacts[0].at,baseNormal=normal.contacts[0].at;
    function branchBorn(target){let lo=-500,hi=2000;for(let i=0;i<17;i++){const mid=(lo+hi)/2,r=collisionScene({items:[{type:'branch',born:mid,travel:2100}],actions:[jump],duration:4500}),at=r.contacts[0].at;if(at<target)lo=mid;else hi=mid;}return (lo+hi)/2;}
    const ordinaryAfter=branchBorn(baseNormal+12),goldAfter=branchBorn(baseGold+12),beforeGold=branchBorn(baseGold-12),out={normal,gold};
    for(const [label,type,born] of [['ordinaryThenBranch','normal',ordinaryAfter],['goldThenBranch','gold',goldAfter],['branchThenGold','gold',beforeGold]]){
      out[label]=[false,true].map(reverse=>collisionScene({items:[{type,id:2},{type:'branch',born,travel:2100,id:1}],actions:[jump],reverse,duration:2700}));
    }
    out.double=collisionScene({items:[{type:'normal',born:0},{type:'normal',born:70}],actions:[jump]});
    out.idle=collisionScene({items:[{type:'normal'},{type:'gold'}]});
    out.hide=collisionScene({items:[{type:'branch',travel:2100}],actions:[{at:0,action:'hide'}],duration:2900});
    out.jumpingBranch=collisionScene({items:[{type:'branch',born:goldAfter,travel:2100}],actions:[jump],duration:2200});
    out.frames=[8,16,33,2600].map(frame=>collisionScene({items:[{type:'gold',id:2},{type:'branch',id:1,born:goldAfter,travel:2100}],actions:[jump],frame,duration:2700}));
    out.closeOrder=[-.5,.5].map(delta=>({delta,results:[false,true].map(reverse=>collisionScene({items:[{type:'gold',id:2},{type:'branch',id:1,born:branchBorn(baseGold+delta),travel:2100}],actions:[jump],reverse,duration:2700}))}));
    out.earlyHide=collisionScene({items:[{type:'branch',born:ordinaryAfter,travel:2100}],actions:[{at:1800,action:'hide'}],duration:2700});
    return out;
  });report.scenarios=scenarios;
  fs.mkdirSync('artifacts/festivals',{recursive:true});fs.writeFileSync('artifacts/festivals/moon-collision-report.json',JSON.stringify(report,null,2));
  assert.equal(scenarios.normal.caught,1);assert.equal(scenarios.gold.caught,1);
  for(const r of scenarios.ordinaryThenBranch){assert.equal(r.stock,1);assert.equal(r.hits,1);assert.equal(r.caught,1);}
  for(const r of scenarios.goldThenBranch){assert.equal(r.stock,3);assert.equal(r.hits,0);assert.equal(r.caught,1);}
  for(const r of scenarios.branchThenGold){assert.equal(r.stock,0);assert.equal(r.hits,1);assert.equal(r.caught,0);}
  assert.equal(scenarios.double.caught,2);assert.equal(scenarios.idle.caught,0);assert.equal(scenarios.idle.missed,2);assert.equal(scenarios.hide.hits,0);assert.equal(scenarios.jumpingBranch.hits,1);
  assert(scenarios.frames.every(r=>r.stock===3&&r.hits===0&&r.caught===1),'Frame rate must not change order/outcome');
  for(const group of scenarios.closeOrder)for(const r of group.results){assert.equal(r.hits,group.delta<0?1:0,'Half-millisecond contact order must be preserved');assert.equal(r.stock,group.delta<0?0:3);}
  await page.evaluate(()=>{const base=performance.now();physicsAt=base;spawnAt=Infinity;items=['normal','gold','branch'].map((type,lane)=>({id:lane,lane,type,born:base-1600,travel:2000,pace:0,target:dropTarget(lane,type),resolved:false}));rabbits=lanes.map(p=>({...p,state:'jump',since:base-400,catchUntil:0,immuneUntil:0}));drawRabbits(base);});
  await page.screenshot({path:'artifacts/festivals/moon-collision-ranges.png'});assert.deepEqual(errors,[]);
  console.log('PASS: source-alpha masks; 210 timing + 366 horizontal range simulations; transparent padding excluded; ordinary/gold/branch order independent of array order; simultaneous gold priority; two cakes per jump; idle misses; hide clears slow branch; jumping hits; frame-rate invariance; file:// load.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

