const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(top=false){
 const pageWindow={};if(top)pageWindow.top=pageWindow;let adaptiveStops=0;
 let mode='ok',now=0,calls=0,removed=0,listener;
 const intervals=new Map(),events={};
 const video={paused:false,ended:false,currentTime:0,playbackRate:1.25,duration:100};
 const core=require('../core.js');
 const style={isConnected:false,remove(){this.isConnected=false;removed++;}};
 const runtime={onMessage:{addListener(){},removeListener(){}},get id(){if(mode==='getter')throw Error('Extension context invalidated');return mode==='missing'?undefined:'test';},sendMessage(m){calls++;
  if(mode==='sync')throw Error('Extension context invalidated');if(mode==='async')return Promise.reject(Error('Extension context invalidated'));
  return Promise.resolve(m.type==='page-config'?{enabled:true,cosmetics:true,videoSettings:{enabled:true,speed:10,preferSkip:false}}:m.type==='cosmetic-rules'?{selectors:[]}:{});
 }};
 const c=vm.createContext({window:pageWindow,AdaptiveCore:{},AdaptiveElements:class{update(){}stop(){adaptiveStops++;}},ElementRules:{HiddenElements:class{update(){}restore(){}}},ElementPicker:class{stop(){}},SiteCompatibility:class{update(){}restore(){}},PrimeAdAcceleratorCore:core,AdAcceleratorSites:{siteFor:()=> 'prime',onDemandPath:()=>true},VideoActions:{Skipper:class{reset(){}update(){return false;}},TransitionDetector:class{reset(){}inspect(){return{video:null,ad:false,player:null};}}},inspectPrimePlayer:()=>({video,ad:true}),
  location:{hostname:'www.primevideo.com',pathname:'/detail/test'},document:{querySelector:()=>null,createElement:()=>style,head:{append(s){s.isConnected=true;}}},CSS:{supports:()=>true},getComputedStyle:()=>({}),performance:{now:()=>now},
  chrome:{runtime,storage:{onChanged:{addListener:f=>listener=f,removeListener:f=>{if(f===listener)listener=null;}}}},
  setInterval:(f,ms)=>{intervals.set(ms,f);return ms;},clearInterval:id=>intervals.delete(id),addEventListener:(e,f)=>events[e]=f});
 vm.runInContext(fs.readFileSync(require.resolve('../content.js'),'utf8'),c);
 return{video,style,events,intervals,get adaptiveStops(){return adaptiveStops;},get calls(){return calls;},get removed(){return removed;},setMode:m=>mode=m,advance:()=>{now+=250;intervals.get(250)?.();}};
}
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
