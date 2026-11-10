// Main UI and actual qixi/moon frames. Firebase interactions use disposable fixtures.
const {spawnSync}=require('child_process'),path=require('path');
for(const file of ['verify-home-ui.cjs','verify-qixi-host.cjs','verify-moon-host.cjs']){
 const result=spawnSync(process.execPath,[path.join(__dirname,file)],{cwd:__dirname,stdio:'inherit'});
 if(result.error)throw result.error;if(result.status!==0){process.exitCode=result.status||1;break;}
}
