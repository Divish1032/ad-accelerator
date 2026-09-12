const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=require('../core.js');

const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('Prime metadata survives generic-first detection and rearms a continuous three-ad pod',async()=>{
  let now=0,ordinal=0,remaining=20,primeInspections=0;
  const intervals=new Map();
  const video={paused:false,ended:false,currentTime:0,playbackRate:1,duration:1800};
  const player={querySelectorAll:()=>[]};
  const generic={video,ad:true,player,source:'generic-transition',adInfo:{kind:'shared-timeline',media:video}};
  const runtime={id:'test',onMessage:{addListener(){},removeListener(){}},sendMessage:async message=>{
    if(message.type==='page-config')return{enabled:true,cosmetics:false,custom:false,adaptiveActive:false,adaptiveRules:[],elementRules:[],videoSettings:{enabled:true,speed:10,preferSkip:false}};
    return{ok:true};
  }};
  const context={
    window:{top:{}},location:{hostname:'www.primevideo.com',pathname:'/detail/test',href:'https://www.primevideo.com/detail/test'},
    document:{querySelector:selector=>selector==='[aria-label="Web Player"]'?player:null,querySelectorAll:()=>[]},
    performance:{now:()=>now},getComputedStyle:()=>({}),PrimeAdAcceleratorCore:core,
    AdAcceleratorSites:{siteFor:()=> 'prime',onDemandPath:()=>true},
    VideoActions:{Skipper:class{reset(){}update(){return false;}},TransitionDetector:class{reset(){}inspect(){return generic;}}},
    inspectPrimePlayer:()=>{primeInspections++;return{video,ad:true,adInfo:{ordinal,total:2,remaining}};},
    SiteCompatibility:class{update(){}restore(){}},ElementRules:{HiddenElements:class{update(){}restore(){}}},ElementPicker:class{start(){}stop(){}},
    AdaptiveCore:{},AdaptiveElements:class{update(){}stop(){}},chrome:{runtime,storage:{onChanged:{addListener(){},removeListener(){}}}},
    setInterval:(fn,ms)=>(intervals.set(ms,fn),ms),clearInterval:id=>intervals.delete(id),addEventListener(){}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../content.js'),'utf8'),context);
  await flush();
  const advance=()=>{now+=250;video.currentTime+=1;intervals.get(250)();};
  advance();
  assert.equal(video.playbackRate,10);

  for(const nextRemaining of [18,13]){
    video.playbackRate=1;remaining=nextRemaining;advance();
    remaining--;advance();
    remaining--;advance();
    remaining--;advance();
    assert.equal(video.playbackRate,10);
  }

  assert.equal(video.playbackRate,10);
  assert.ok(primeInspections>=9);
});
