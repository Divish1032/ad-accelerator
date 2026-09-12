const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const sites=require('../sites.js'),core=require('../core.js'),actions=require('../video-actions.js');
const route='/in/sports/tennis/alexander-zverev-vs-alejandro-tabilo-rd-3-highlights/1271703188/video/highlights/watch';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
// Media/container state matches the user's paused Hotstar highlights ad. It is
// a local regression fixture; it does not claim native browser enforcement.
function fixture({path=route,preferSkip=false,live=false,duration=20}={}){
 let now=0,activeAd=true;const intervals=new Map(),reports=[];
 const element=()=>({isConnected:true,parentElement:null,closest:()=>null,getBoundingClientRect:()=>({width:1512,height:707})});
 const ad={...element(),duration,currentTime:3.733117,paused:true,ended:false,playbackRate:1,seekable:{length:1,end:()=>20}};
 const main={...element(),duration:180,currentTime:0,paused:true,ended:false,playbackRate:1.25};
 const container={getAttribute:n=>n==='aria-hidden'?(activeAd?'false':'true'):null,querySelectorAll:()=>[ad]};
 const scope={querySelector:q=>q==='#ad-video-container'?container:null,querySelectorAll:q=>q==='#video-container video'?[main]:q==='[aria-label]'&&live?[{getAttribute:()=> 'Live'}]:[]};
 const doc={querySelector:q=>q==='[data-testid="player-space-container"]'?scope:null};
 const context={window:{top:{}},document:doc,location:{hostname:'www.hotstar.com',pathname:path},performance:{now:()=>now},getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),
 PrimeAdAcceleratorCore:core,AdAcceleratorSites:sites,VideoActions:actions,SiteCompatibility:class{update(){}restore(){}},ElementRules:{HiddenElements:class{update(){}restore(){}}},ElementPicker:class{stop(){}},
 chrome:{runtime:{id:'test',onMessage:{addListener(){},removeListener(){}},sendMessage:async m=>{if(m.type==='video-report'){reports.push(m);return{ok:true};}return{enabled:true,cosmetics:false,videoSettings:{enabled:true,speed:10,preferSkip}};}},storage:{onChanged:{addListener(){},removeListener(){}}}},
 setInterval:(fn,ms)=>{intervals.set(ms,fn);return ms;},clearInterval:id=>intervals.delete(id),addEventListener(){}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../content.js'),'utf8'),context);
 return{ad,main,reports,advance(){now+=250;intervals.get(250)();},endAd(){activeAd=false;}};
}
test('sports route family includes highlights and replays but excludes live/navigation pages',()=>{
 for(const path of [route,route+'/', '/in/sports/cricket/event/123/video/replay/watch','/in/sports/football/event/456/video/clips/watch'])assert.equal(sites.onDemandPath('hotstar',path),true,path);
 for(const path of ['/in/sports','/in/sports/tennis','/in/sports/game/video/live/watch','/in/sports/game/video/LIVE/watch','/in/sports/game/livetv/watch','/in/home','/in/sports/game/video/highlights/watch/trailer'])assert.equal(sites.onDemandPath('hotstar',path),false,path);
});
test('real content pipeline reaches the highlights ad, preserves pause, accelerates only ad and restores',async()=>{
 const f=fixture();await flush();f.advance();assert.equal(f.ad.playbackRate,1);assert.equal(f.ad.currentTime,3.733117);assert.equal(f.reports.at(-1).videoFound,true);assert.equal(f.reports.at(-1).text,'Paused');
 f.ad.paused=false;f.advance();f.advance();assert.equal(f.ad.playbackRate,10);assert.equal(f.main.playbackRate,1.25);assert.equal(f.main.currentTime,0);
 f.endAd();f.advance();assert.equal(f.ad.playbackRate,1);assert.equal(f.main.playbackRate,1.25);assert.equal(f.reports.at(-1).ad,false);
});
test('skip-first seeks only the 20-second ad, then uses speed fallback if the ad remains',async()=>{
 const f=fixture({preferSkip:true});await flush();f.ad.paused=false;f.advance();assert.equal(f.ad.currentTime,19.95);assert.equal(f.main.currentTime,0);
 for(let i=0;i<6;i++)f.advance();assert.equal(f.ad.playbackRate,10);assert.equal(f.main.playbackRate,1.25);
});
test('sports route exclusion and runtime live signals prevent ad seek and speed changes',async()=>{
 for(const opts of [{path:'/in/sports/game/video/live/watch'},{live:true},{duration:Infinity}]){
  const f=fixture({...opts,preferSkip:true});await flush();f.ad.paused=false;f.advance();f.advance();assert.equal(f.ad.playbackRate,1);assert.equal(f.ad.currentTime,3.733117);assert.equal(f.main.currentTime,0);
 }
});
