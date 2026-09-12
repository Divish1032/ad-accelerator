const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const sites=require('../sites.js');
const core=require('../core.js');
const actions=require('../video-actions.js');

const AD='video[title="Advertisement"]';
const PROGRAM='video.vjs-tech:not([title="Advertisement"])';
const ROUTE='/tv-shows/details/brahmagantu/0-6-4z5546033/soundharya-gifts-chirag-a-car/0-1-6z5577222';
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function node(style={}){return{style:{display:'block',visibility:'visible',opacity:'1',...style},isConnected:true,parentElement:null,
  closest:()=>null,getBoundingClientRect:()=>({width:920,height:518}),querySelector:()=>null,querySelectorAll:()=>[]};}
function media({title='',duration,currentTime=0,paused=false,rate=1}={}){return{...node(),title,duration,currentTime,paused,ended:false,playbackRate:rate,
  seekable:{length:1,start:()=>0,end:()=>duration}};}
function zeeDom(){
  const body=node(),player=node(),adContainer=node(),firstWrap=node(),secondWrap=node({display:'none'});
  const program=media({duration:1932.32,currentTime:0,paused:true,rate:1.25});
  const first=media({title:'Advertisement',duration:20.010667,currentTime:0.2});
  const second=media({title:'Advertisement',duration:15,currentTime:0,paused:true});
  let active=true;player.parentElement=body;program.parentElement=player;adContainer.parentElement=player;
  firstWrap.parentElement=adContainer;secondWrap.parentElement=adContainer;first.parentElement=firstWrap;second.parentElement=secondWrap;
  player.classList={contains:name=>name==='vjs-ad-playing'&&active};
  player.querySelector=q=>q==='.video-tag_ima-ad-container.ima-ad-container'?adContainer:null;
  player.querySelectorAll=q=>q===PROGRAM?[program]:[];adContainer.querySelectorAll=q=>q===AD?[first,second]:[];
  const doc={querySelector:q=>q==='.playerContainer .video-js'?player:null};
  function show(index){active=true;firstWrap.style.display=index===0?'block':'none';secondWrap.style.display=index===1?'block':'none';first.paused=index!==0;second.paused=index!==1;}
  function clear(){active=false;firstWrap.style.display='none';secondWrap.style.display='none';first.paused=true;second.paused=true;}
  show(0);return{doc,player,adContainer,program,first,second,show,clear,styleOf:e=>e.style};
}

test('ZEE5 host and observed episode-route boundaries are exact',()=>{
  for(const host of ['zee5.com','www.zee5.com'])assert.equal(sites.siteFor(host),'zee5');
  for(const host of ['api.zee5.com','zee5.com.evil.test'])assert.equal(sites.siteFor(host),null);
  for(const path of [ROUTE,ROUTE+'/'])assert.equal(sites.onDemandPath('zee5',path),true,path);
  for(const path of ['/free5','/tv-shows/details/brahmagantu/0-6-4z5546033','/movies/details/example/0-0-123','/live-tv/channel/0-9-1'])assert.equal(sites.onDemandPath('zee5',path),false,path);
});

test('ZEE5 requires one visible finite ad in its active IMA container',()=>{
  const f=zeeDom();let result=sites.inspectZee5(f.doc,f.styleOf);
  assert.equal(result.video,f.first);assert.equal(result.ad,true);assert.equal(result.player,f.player);
  assert.equal(result.adInfo.kind,'separate-media');assert.equal(result.adInfo.media,f.first);
  f.show(1);result=sites.inspectZee5(f.doc,f.styleOf);assert.equal(result.video,f.second);assert.equal(result.ad,true);
  f.second.duration=Infinity;assert.equal(sites.inspectZee5(f.doc,f.styleOf).ad,false);
  f.second.duration=15;f.clear();result=sites.inspectZee5(f.doc,f.styleOf);
  assert.equal(result.video,f.program);assert.equal(result.ad,false);
  assert.deepEqual(sites.inspectZee5({querySelector:()=>null},f.styleOf),{video:null,ad:false,player:null});
});

function pipeline({preferSkip=false,path=ROUTE}={}){
  const dom=zeeDom(),intervals=new Map(),reports=[],location={hostname:'www.zee5.com',pathname:path};
  let now=0,enabled=true,storageListener=()=>{};
  const context={window:{top:{}},document:dom.doc,location,performance:{now:()=>now},getComputedStyle:dom.styleOf,
    PrimeAdAcceleratorCore:core,AdAcceleratorSites:sites,VideoActions:actions,SiteCompatibility:class{update(){}restore(){}},
    ElementRules:{HiddenElements:class{update(){}restore(){}}},ElementPicker:class{start(){}stop(){}},AdaptiveCore:{},AdaptiveElements:class{update(){}stop(){}},
    chrome:{runtime:{id:'test',onMessage:{addListener(){},removeListener(){}},sendMessage:async m=>{if(m.type==='video-report'){reports.push(m);return{ok:true};}
      if(m.type==='page-config')return{enabled,cosmetics:false,custom:false,adaptiveActive:false,adaptiveRules:[],elementRules:[],videoSettings:{enabled:true,speed:10,preferSkip}};return{selectors:[]};}},storage:{onChanged:{addListener(fn){storageListener=fn;},removeListener(){}}}},
    setInterval:(fn,ms)=>{intervals.set(ms,fn);return ms;},clearInterval:id=>intervals.delete(id),addEventListener(){}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../content.js'),'utf8'),context);
  return{...dom,reports,location,advance(delta=0.25){now+=250;for(const v of [dom.first,dom.second])if(!v.paused)v.currentTime+=delta;intervals.get(250)();},setEnabled(value){enabled=value;storageListener({},'local');}};
}

test('ZEE5 skip-first changes only separate ad media, then restores program state',async()=>{
  const f=pipeline({preferSkip:true});await flush();assert.equal(f.first.currentTime,19.960667);assert.equal(f.program.currentTime,0);assert.equal(f.program.playbackRate,1.25);
  for(let i=0;i<6;i++)f.advance();assert.equal(f.first.playbackRate,10);assert.equal(f.program.playbackRate,1.25);
  f.clear();f.program.paused=false;f.advance();assert.equal(f.first.playbackRate,1);assert.equal(f.program.playbackRate,1.25);assert.equal(f.reports.at(-1).ad,false);
});

test('ZEE5 distinct consecutive ad media requires fresh progression',async()=>{
  const f=pipeline();await flush();f.advance();assert.equal(f.first.playbackRate,10);
  f.show(1);f.advance();assert.equal(f.first.playbackRate,1);assert.equal(f.second.playbackRate,1);
  f.advance();f.advance();f.advance();assert.equal(f.second.playbackRate,10);
  f.clear();f.program.paused=false;f.advance();assert.equal(f.second.playbackRate,1);assert.equal(f.program.playbackRate,1.25);
});

test('disabling or leaving a ZEE5 episode restores speed without touching program media',async()=>{
  const disabled=pipeline();await flush();disabled.advance();assert.equal(disabled.first.playbackRate,10);disabled.setEnabled(false);await flush();assert.equal(disabled.first.playbackRate,1);
  const navigated=pipeline();await flush();navigated.advance();assert.equal(navigated.first.playbackRate,10);navigated.location.pathname='/live-tv/channel/0-9-1';navigated.advance();
  assert.equal(navigated.first.playbackRate,1);assert.equal(navigated.program.currentTime,0);assert.equal(navigated.program.playbackRate,1.25);
});

test('a paused ZEE5 ad stays paused until fresh confirmation',async()=>{
  const f=pipeline();f.first.paused=true;await flush();f.advance();assert.equal(f.first.playbackRate,1);assert.equal(f.first.currentTime,0.2);
  f.first.paused=false;f.advance();assert.equal(f.first.playbackRate,1);f.advance();assert.equal(f.first.playbackRate,10);
});
