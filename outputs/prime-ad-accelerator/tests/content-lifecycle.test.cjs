const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(top=false,options={}){
 const pageWindow={};if(top)pageWindow.top=pageWindow;let adaptiveStops=0;
 let mode='ok',now=0,calls=0,removed=0,listener,messageListener;
 const intervals=new Map(),events={};
 const video={paused:false,ended:false,currentTime:0,playbackRate:1.25,duration:100};
 const core=require('../core.js');
 const style={isConnected:false,remove(){this.isConnected=false;removed++;}};
 const runtime={onMessage:{addListener:f=>messageListener=f,removeListener:f=>{if(f===messageListener)messageListener=null;}},get id(){if(mode==='getter')throw Error('Extension context invalidated');return mode==='missing'?undefined:'test';},sendMessage(m){calls++;
  if(mode==='sync')throw Error('Extension context invalidated');if(mode==='async')return Promise.reject(Error('Extension context invalidated'));
  if(m.type==='page-config'&&Object.hasOwn(options,'configReply'))return Promise.resolve(options.configReply);
  return Promise.resolve(m.type==='page-config'?{enabled:true,cosmetics:true,videoSettings:{enabled:true,speed:10,preferSkip:false}}:m.type==='cosmetic-rules'?{selectors:[]}:{});
 }};
 const c=vm.createContext({window:pageWindow,AdaptiveCore:{},AdaptiveElements:class{update(){}stop(){adaptiveStops++;}},ElementRules:{HiddenElements:class{update(){}restore(){}}},ElementPicker:class{stop(){}},SiteCompatibility:class{update(){}restore(){}},PrimeAdAcceleratorCore:core,AdAcceleratorSites:{siteFor:()=> 'prime',onDemandPath:()=>true},VideoActions:{Skipper:class{reset(){}update(){return false;}},TransitionDetector:class{reset(){}inspect(){return{video:null,ad:false,player:null};}}},inspectPrimePlayer:()=>({video,ad:true}),
  location:{hostname:'www.primevideo.com',pathname:'/detail/test'},document:{querySelector:()=>null,createElement:()=>style,head:{append(s){s.isConnected=true;}}},CSS:{supports:()=>true},getComputedStyle:()=>({}),performance:{now:()=>now},
  chrome:{runtime,storage:{onChanged:{addListener:f=>listener=f,removeListener:f=>{if(f===listener)listener=null;}}}},
  setInterval:(f,ms)=>{intervals.set(ms,f);return ms;},clearInterval:id=>intervals.delete(id),addEventListener:(e,f)=>events[e]=f});
 vm.runInContext(fs.readFileSync(require.resolve('../content.js'),'utf8'),c);
 return{video,style,events,intervals,get adaptiveStops(){return adaptiveStops;},get calls(){return calls;},get removed(){return removed;},get listenersRemoved(){return !listener&&!messageListener;},setConfigReply:value=>options.configReply=value,refresh:()=>listener?.({},'local'),setMode:m=>mode=m,advance:()=>{now+=250;intervals.get(250)?.();}};
}
for(const reply of [undefined,null,{},[],true,42,'invalid',{enabled:true,cosmetics:true},{enabled:true,cosmetics:true,videoSettings:null},{enabled:'true',cosmetics:true,videoSettings:{enabled:true}},{enabled:true,cosmetics:true,videoSettings:{enabled:'true'}}]){
 test(`invalid startup config (${JSON.stringify(reply)}) disconnects without an unhandled rejection`,async()=>{
  const f=fixture(true,{configReply:reply});await flush();
  assert.equal(f.video.playbackRate,1.25);assert.equal(f.style.isConnected,false);assert.equal(f.intervals.size,0);assert.equal(f.adaptiveStops,1);assert.equal(f.listenersRemoved,true);
  const calls=f.calls;f.events.pageshow();f.refresh();f.advance();await flush();assert.equal(f.calls,calls);assert.equal(f.adaptiveStops,1);
 });
}
test('missing config after acceleration restores speed, styling and listeners',async()=>{
 const f=fixture(true);await flush();f.advance();await flush();assert.equal(f.video.playbackRate,10);assert.equal(f.style.isConnected,true);
 f.setConfigReply(undefined);f.refresh();await flush();
 assert.equal(f.video.playbackRate,1.25);assert.equal(f.style.isConnected,false);assert.equal(f.intervals.size,0);assert.equal(f.adaptiveStops,1);assert.equal(f.listenersRemoved,true);
});
test('disabled background fallback is a valid config and can refresh later',async()=>{
 const f=fixture(true,{configReply:{enabled:false,cosmetics:false,videoSettings:{enabled:false}}});await flush();
 assert.equal(f.video.playbackRate,1.25);assert.equal(f.intervals.size,2);assert.equal(f.adaptiveStops,0);
 f.setConfigReply({enabled:true,cosmetics:true,videoSettings:{enabled:true,speed:10,preferSkip:false}});f.refresh();await flush();f.advance();await flush();
 assert.equal(f.video.playbackRate,10);assert.equal(f.style.isConnected,true);
});
test('stale empty reply cannot disconnect a newer valid config',async()=>{
 let resolve;const f=fixture(true,{configReply:new Promise(r=>resolve=r)});
 f.setConfigReply({enabled:true,cosmetics:true,videoSettings:{enabled:true,speed:10,preferSkip:false}});f.refresh();await flush();f.advance();await flush();
 resolve(undefined);await flush();assert.equal(f.video.playbackRate,10);assert.equal(f.style.isConnected,true);assert.equal(f.intervals.size,2);assert.equal(f.adaptiveStops,0);
});
test('late valid config cannot reactivate a disconnected script',async()=>{
 const f=fixture(true);await flush();f.advance();await flush();assert.equal(f.video.playbackRate,10);
 let resolve;f.setConfigReply(new Promise(r=>resolve=r));f.refresh();f.setMode('sync');f.intervals.get(5000)();f.advance();await flush();
 resolve({enabled:true,cosmetics:true,videoSettings:{enabled:true,speed:10,preferSkip:false}});await flush();
 assert.equal(f.video.playbackRate,1.25);assert.equal(f.style.isConnected,false);assert.equal(f.intervals.size,0);assert.equal(f.adaptiveStops,1);assert.equal(f.listenersRemoved,true);
});
for(const mode of ['sync','async','getter','missing'])test(`invalidated context (${mode}) stops timers and restores speed without throwing`,async()=>{
 const f=fixture();await flush();f.advance();await flush();assert.equal(f.video.playbackRate,10);assert.ok(f.style.isConnected);
 f.setMode(mode);f.intervals.get(5000)();assert.doesNotThrow(()=>f.advance());await flush();
 assert.equal(f.video.playbackRate,1.25);assert.equal(f.intervals.size,0);assert.equal(f.style.isConnected,false);
 const calls=f.calls;f.events.pageshow();await flush();assert.equal(f.calls,calls);assert.equal(f.video.playbackRate,1.25);
});
test('ordinary pagehide/pageshow resumes a valid content script',async()=>{
 const f=fixture();await flush();f.advance();await flush();assert.equal(f.video.playbackRate,10);
 f.events.pagehide();assert.equal(f.video.playbackRate,1.25);f.events.pageshow();await flush();f.advance();await flush();assert.equal(f.video.playbackRate,10);
});

test('top-page adaptive listener cleanup runs on extension invalidation',async()=>{const f=fixture(true);await flush();f.setMode('sync');f.intervals.get(5000)();f.advance();await flush();assert.equal(f.adaptiveStops,1);assert.equal(f.intervals.size,0);f.events.pageshow();assert.equal(f.adaptiveStops,1);});
