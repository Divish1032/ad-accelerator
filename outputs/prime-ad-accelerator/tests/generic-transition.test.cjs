const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {TransitionDetector}=require('../video-actions.js');
const actions=require('../video-actions.js'),core=require('../core.js'),sites=require('../sites.js');

function node({id='',className='',display='block',width=960,height=540,text='',title='',paused=false,duration=1200,tag='div'}={}){
  const attributes={title};
  return {id,className,tagName:tag.toUpperCase(),title,textContent:text,paused,ended:false,duration,currentTime:0,playbackRate:1,seekable:{length:1,end:()=>duration},isConnected:true,parentElement:null,
    style:{display,visibility:'visible',opacity:'1'},classList:{contains(token){return String(this.owner?.className||'').split(/\s+/).includes(token);}},
    closest(selector){if(selector==='[hidden]')return null;return null;},
    getAttribute(name){if(name==='class')return this.className;if(name==='id')return this.id;if(name==='aria-label')return this.ariaLabel||null;return attributes[name]||null;},
    matches(selector){return selector.includes('input[type="range"]')&&this.tagName==='INPUT'||selector.includes('[role="slider"]')&&this.role==='slider';},
    getBoundingClientRect(){return{width,height};},querySelectorAll(){return[];},
    contains(child){for(let n=child;n;n=n.parentElement)if(n===this)return true;return false;}};
}
function fixture(){
  const player=node({className:'video-player'});player.classList.owner=player;
  const program=node({tag:'video',title:'Program',duration:1800});program.parentElement=player;
  const overlay=node({className:'ad-container',display:'none',text:'Ad 0:15'});overlay.parentElement=player;
  const ad=node({tag:'video',title:'Advertisement',duration:15,display:'none'});ad.parentElement=overlay;
  const play=node({tag:'button',width:40,height:30});play.ariaLabel='Play';play.parentElement=player;
  const forward=node({tag:'button',width:40,height:30});forward.ariaLabel='Forward 10 seconds';forward.parentElement=player;
  const range=node({tag:'input',width:400,height:20});range.role='slider';range.parentElement=player;
  const skip=node({tag:'button',display:'none',width:100,height:30,text:'Skip Ad'});skip.ariaLabel='Skip Ad';skip.parentElement=overlay;
  const controls=[play,forward,range,skip],nodes=[overlay],texts=[overlay,skip],videos=[program,ad];
  player.querySelectorAll=selector=>selector==='video'?videos:selector.startsWith('[class]')?nodes:selector.startsWith('button,')?controls:selector==='[aria-label],span,div,p'?texts:selector==='[aria-label]'?controls:[];
  const doc={querySelectorAll:selector=>selector==='video'?videos:[]};
  function startSeparate(){overlay.style.display='block';ad.style.display='block';ad.paused=false;program.style.display='none';program.paused=true;forward.style.display='none';range.style.display='none';skip.style.display='block';}
  function startShared(){overlay.style.display='block';program.paused=false;forward.style.display='none';range.style.display='none';skip.style.display='block';}
  return{doc,player,program,overlay,ad,play,forward,range,skip,startSeparate,startShared,styleOf:e=>e.style};
}

test('ordinary control auto-hide never becomes an ad',()=>{
  const f=fixture(),detector=new TransitionDetector();detector.inspect(f.doc,f.styleOf,0,'/watch/one');
  f.play.style.display=f.forward.style.display=f.range.style.display='none';
  const result=detector.inspect(f.doc,f.styleOf,300,'/watch/one');assert.equal(result.ad,false);assert.equal(result.video,f.program);
});

test('a stable player-owned overlay plus separate media transition is detected',()=>{
  const f=fixture(),detector=new TransitionDetector();detector.inspect(f.doc,f.styleOf,0,'/watch/one');f.startSeparate();
  assert.equal(detector.inspect(f.doc,f.styleOf,250,'/watch/one').ad,false);
  const result=detector.inspect(f.doc,f.styleOf,550,'/watch/one');assert.equal(result.ad,true);assert.equal(result.video,f.ad);
  assert.equal(result.source,'generic-transition');assert.equal(result.adInfo.kind,'separate-media');assert.equal(result.adInfo.media,f.ad);
});

test('shared timeline detection never labels the media as separately seekable',()=>{
  const f=fixture(),detector=new TransitionDetector();detector.inspect(f.doc,f.styleOf,0,'/watch/one');f.startShared();
  detector.inspect(f.doc,f.styleOf,250,'/watch/one');const result=detector.inspect(f.doc,f.styleOf,550,'/watch/one');
  assert.equal(result.ad,true);assert.equal(result.video,f.program);assert.equal(result.adInfo.kind,'shared-timeline');
});

test('ad-like substrings and missing controls are insufficient',()=>{
  const f=fixture(),detector=new TransitionDetector();f.overlay.className='adaptive-layout';detector.inspect(f.doc,f.styleOf,0,'/watch/one');
  f.overlay.style.display='block';f.forward.style.display=f.range.style.display='none';
  assert.equal(detector.inspect(f.doc,f.styleOf,300,'/watch/one').ad,false);
});

test('explicit active player state can qualify an initial separate ad safely',()=>{
  const f=fixture(),detector=new TransitionDetector();f.player.className='video-js vjs-ad-playing';f.player.classList.owner=f.player;f.startSeparate();
  const result=detector.inspect(f.doc,f.styleOf,0,'/watch/one');assert.equal(result.ad,true);assert.equal(result.video,f.ad);assert.equal(result.adInfo.kind,'separate-media');
});

test('live state and navigation reset transition evidence',()=>{
  const live=fixture(),liveDetector=new TransitionDetector();live.player.className='video-player vjs-ad-playing vjs-live';live.player.classList.owner=live.player;live.startSeparate();
  assert.equal(liveDetector.inspect(live.doc,live.styleOf,0,'/live').ad,false);
  const f=fixture(),detector=new TransitionDetector();detector.inspect(f.doc,f.styleOf,0,'/watch/one');f.startSeparate();detector.inspect(f.doc,f.styleOf,250,'/watch/one');
  assert.equal(detector.inspect(f.doc,f.styleOf,550,'/watch/two').ad,false);
});

test('content selects the generic detector before named fallbacks',()=>{
  const source=fs.readFileSync(require.resolve('../content.js'),'utf8');
  assert.ok(source.indexOf('genericDetector.inspect')<source.indexOf("if(site==='prime')"));
  assert.match(source,/if\(!result\.ad\)\{/);
});

test('generic transition runs through the shared accelerator and restores on exit',async()=>{
  const f=fixture(),intervals=new Map(),reports=[];let now=0;
  const runtime={id:'test',onMessage:{addListener(){},removeListener(){}},sendMessage:async message=>{
    if(message.type==='page-config')return{enabled:true,cosmetics:false,custom:false,videoSettings:{enabled:true,speed:10,preferSkip:false}};
    if(message.type==='video-report'){reports.push(message);return{ok:true};}return{};
  }};
  const context={window:{top:{}},document:f.doc,location:{hostname:'generic.test',pathname:'/watch/one'},performance:{now:()=>now},getComputedStyle:f.styleOf,
    PrimeAdAcceleratorCore:core,AdAcceleratorSites:sites,VideoActions:actions,SiteCompatibility:class{update(){}restore(){}},
    ElementRules:{HiddenElements:class{update(){}restore(){}}},ElementPicker:class{start(){}stop(){}},AdaptiveCore:{},AdaptiveElements:class{update(){}stop(){}},
    chrome:{runtime,storage:{onChanged:{addListener(){},removeListener(){}}}},setInterval:(fn,ms)=>(intervals.set(ms,fn),ms),clearInterval:id=>intervals.delete(id),addEventListener(){}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../content.js'),'utf8'),context);await new Promise(resolve=>setImmediate(resolve));
  f.startSeparate();for(const delta of [250,300,250]){now+=delta;intervals.get(250)();}
  assert.equal(f.ad.playbackRate,10);assert.equal(f.program.playbackRate,1);assert.ok(reports.some(report=>report.ad));
  f.overlay.style.display=f.ad.style.display=f.skip.style.display='none';f.program.style.display='block';f.program.paused=false;now+=250;intervals.get(250)();
  assert.equal(f.ad.playbackRate,1);assert.equal(f.program.playbackRate,1);
});
