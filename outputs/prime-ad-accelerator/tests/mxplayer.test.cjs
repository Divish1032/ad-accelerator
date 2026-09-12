const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const sites=require('../sites.js');
const core=require('../core.js');
const actions=require('../video-actions.js');

const AD='video[title="Advertisement"]';
const PROGRAM='video.vjs-tech:not([title="Advertisement"])';
const ROUTE='/show/watch-taarak-mehta-ka-ooltah-chashmah/season-1/example-episode-online-123';
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function node(style={}) {
  return {style:{display:'block',visibility:'visible',opacity:'1',...style},isConnected:true,parentElement:null,
    closest:()=>null,getBoundingClientRect:()=>({width:1512,height:853}),querySelector:()=>null,querySelectorAll:()=>[]};
}
function media({title='',duration,currentTime=0,paused=false,rate=1}={}) {
  return {...node(),title,duration,currentTime,paused,ended:false,playbackRate:rate,
    seekable:{length:1,start:()=>0,end:()=>duration}};
}
function mxDom() {
  const body=node(),player=node(),adContainer=node(),firstWrap=node(),secondWrap=node({display:'none'});
  const program=media({duration:1247,currentTime:0.18,paused:true,rate:1.25});
  const first=media({title:'Advertisement',duration:20.1,currentTime:2.8});
  const second=media({title:'Advertisement',duration:45.1,currentTime:0,paused:true});
  player.parentElement=body;program.parentElement=player;adContainer.parentElement=player;
  firstWrap.parentElement=adContainer;secondWrap.parentElement=adContainer;
  first.parentElement=firstWrap;second.parentElement=secondWrap;
  let active=true;
  player.querySelector=q=>q==='.mx-ad-container.ad-playing'&&active?adContainer:null;
  player.querySelectorAll=q=>q===PROGRAM?[program]:[];
  adContainer.querySelectorAll=q=>q===AD?[first,second]:[];
  const doc={querySelector:q=>q==='.mx-player-container'?player:null};
  function show(index) {
    active=true;firstWrap.style.display=index===0?'block':'none';secondWrap.style.display=index===1?'block':'none';
    first.paused=index!==0;second.paused=index!==1;
  }
  function clear(){active=false;firstWrap.style.display='none';secondWrap.style.display='none';first.paused=true;second.paused=true;}
  show(0);
  return {doc,player,adContainer,program,first,second,show,clear,styleOf:e=>e.style};
}

test('MX Player host and observed episode-route boundaries are exact',()=>{
  for(const host of ['mxplayer.in','www.mxplayer.in'])assert.equal(sites.siteFor(host),'mxplayer');
  for(const host of ['api.mxplayer.in','mxplayer.in.evil.test'])assert.equal(sites.siteFor(host),null);
  for(const path of [ROUTE,ROUTE+'/'])assert.equal(sites.onDemandPath('mxplayer',path),true,path);
  for(const path of ['/','/show/watch-series-online-123','/movie/watch-film-online-123','/live-tv/channel/news'])assert.equal(sites.onDemandPath('mxplayer',path),false,path);
});

test('MX Player requires one visible finite ad in the active player-owned container',()=>{
  const f=mxDom();let result=sites.inspectMxPlayer(f.doc,f.styleOf);
  assert.equal(result.video,f.first);assert.equal(result.ad,true);assert.equal(result.player,f.player);
  assert.equal(result.adInfo.kind,'separate-media');assert.equal(result.adInfo.media,f.first);
  f.show(1);result=sites.inspectMxPlayer(f.doc,f.styleOf);assert.equal(result.video,f.second);assert.equal(result.ad,true);
  f.second.duration=Infinity;assert.equal(sites.inspectMxPlayer(f.doc,f.styleOf).ad,false);
  f.second.duration=45.1;f.clear();result=sites.inspectMxPlayer(f.doc,f.styleOf);
  assert.equal(result.video,f.program);assert.equal(result.ad,false);
  assert.deepEqual(sites.inspectMxPlayer({querySelector:()=>null},f.styleOf),{video:null,ad:false,player:null});
});

function pipeline({preferSkip=false,path=ROUTE}={}) {
  const dom=mxDom(),intervals=new Map(),reports=[],location={hostname:'www.mxplayer.in',pathname:path};
  let now=0,enabled=true,storageListener=()=>{};
  const context={window:{top:{}},document:dom.doc,location,performance:{now:()=>now},getComputedStyle:dom.styleOf,
    PrimeAdAcceleratorCore:core,AdAcceleratorSites:sites,VideoActions:actions,
    SiteCompatibility:class{update(){}restore(){}},ElementRules:{HiddenElements:class{update(){}restore(){}}},
    ElementPicker:class{start(){}stop(){}},AdaptiveCore:{},AdaptiveElements:class{update(){}stop(){}},
    chrome:{runtime:{id:'test',onMessage:{addListener(){},removeListener(){}},sendMessage:async m=>{
      if(m.type==='video-report'){reports.push(m);return{ok:true};}
      if(m.type==='page-config')return{enabled,cosmetics:false,custom:false,adaptiveActive:false,adaptiveRules:[],elementRules:[],videoSettings:{enabled:true,speed:10,preferSkip}};
      return{selectors:[]};
    }},storage:{onChanged:{addListener(fn){storageListener=fn;},removeListener(){}}}},
    setInterval:(fn,ms)=>{intervals.set(ms,fn);return ms;},clearInterval:id=>intervals.delete(id),addEventListener(){}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../content.js'),'utf8'),context);
  return {...dom,reports,location,advance(delta=0.25){now+=250;for(const v of [dom.first,dom.second])if(!v.paused)v.currentTime+=delta;intervals.get(250)();},
    setEnabled(value){enabled=value;storageListener({},'local');}};
}

test('MX Player skip-first changes only the separate ad, then restores program state',async()=>{
  const f=pipeline({preferSkip:true});await flush();
  assert.equal(f.first.currentTime,20.05);assert.equal(f.program.currentTime,0.18);assert.equal(f.program.playbackRate,1.25);
  for(let i=0;i<6;i++)f.advance();assert.equal(f.first.playbackRate,10);assert.equal(f.program.playbackRate,1.25);
  f.clear();f.program.paused=false;f.advance();assert.equal(f.first.playbackRate,1);assert.equal(f.program.playbackRate,1.25);
  assert.equal(f.reports.at(-1).ad,false);
});

test('MX Player consecutive separate ad media rearm only after new-media progression',async()=>{
  const f=pipeline();await flush();f.advance();assert.equal(f.first.playbackRate,10);
  f.show(1);f.advance();assert.equal(f.first.playbackRate,1);assert.equal(f.second.playbackRate,1);
  f.advance();assert.equal(f.second.playbackRate,1);
  f.advance();assert.equal(f.second.playbackRate,1);
  f.advance();assert.equal(f.second.playbackRate,10);
  f.clear();f.program.paused=false;f.advance();assert.equal(f.second.playbackRate,1);assert.equal(f.program.playbackRate,1.25);
});

test('disabling or leaving the MX Player episode route restores original speed',async()=>{
  const disabled=pipeline();await flush();disabled.advance();assert.equal(disabled.first.playbackRate,10);
  disabled.setEnabled(false);await flush();assert.equal(disabled.first.playbackRate,1);
  const navigated=pipeline();await flush();navigated.advance();assert.equal(navigated.first.playbackRate,10);
  navigated.location.pathname='/live-tv/channel/news';navigated.advance();assert.equal(navigated.first.playbackRate,1);
  assert.equal(navigated.program.currentTime,0.18);assert.equal(navigated.program.playbackRate,1.25);
});

test('a paused MX Player ad stays paused until fresh confirmation',async()=>{
  const f=pipeline();f.first.paused=true;await flush();f.advance();
  assert.equal(f.first.playbackRate,1);assert.equal(f.first.currentTime,2.8);
  f.first.paused=false;f.advance();assert.equal(f.first.playbackRate,1);
  f.advance();assert.equal(f.first.playbackRate,10);
});
