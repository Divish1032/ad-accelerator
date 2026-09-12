const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const sites=require('../sites.js');
const core=require('../core.js');
const actions=require('../video-actions.js');

const AD='video[title="Advertisement"]';
const CONTENT='video:not([title="Advertisement"])';
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function node(style={}) {
  return {
    style:{display:'block',visibility:'visible',opacity:'1',...style},
    isConnected:true,
    parentElement:null,
    closest:()=>null,
    getBoundingClientRect:()=>({width:1134,height:636}),
    querySelectorAll:()=>[]
  };
}

function media({title='',duration,currentTime=0,paused=false,rate=1}={}) {
  return {
    ...node(),title,duration,currentTime,paused,ended:false,playbackRate:rate,
    seekable:{length:1,start:()=>0,end:()=>duration}
  };
}

function plexDom() {
  const body=node(),player=node(),adLayer=node();
  const firstWrap=node(),secondWrap=node({display:'none'});
  const program=media({duration:9944,currentTime:0.39,paused:true,rate:1.25});
  const first=media({title:'Advertisement',duration:6.976,currentTime:0.1});
  const second=media({title:'Advertisement',duration:29.973,paused:true});
  player.parentElement=body;program.parentElement=player;adLayer.parentElement=player;
  firstWrap.parentElement=adLayer;secondWrap.parentElement=adLayer;
  first.parentElement=firstWrap;second.parentElement=secondWrap;
  player.querySelectorAll=q=>q===AD?[first,second]:q===CONTENT?[program]:[];
  const doc={body,querySelectorAll:q=>q===AD?[first,second]:[],querySelector:()=>null};
  function show(index,remaining) {
    firstWrap.style.display=index===0?'block':'none';secondWrap.style.display=index===1?'block':'none';
    first.paused=index!==0;second.paused=index!==1;
    player.innerText=`Ad ${index+1} of 2 0:${String(remaining).padStart(2,'0')} Sindoor`;
  }
  function clear() {
    firstWrap.style.display='none';secondWrap.style.display='none';first.paused=true;second.paused=true;
    player.innerText='Sindoor 0:01 2:45:44';
  }
  show(0,7);
  return {doc,player,program,first,second,show,clear,styleOf:e=>e.style};
}

test('Plex host and on-demand route boundaries are exact',()=>{
  assert.equal(sites.siteFor('watch.plex.tv'),'plex');
  for(const host of ['plex.tv','app.plex.tv','watch.plex.tv.evil.test'])assert.equal(sites.siteFor(host),null);
  for(const path of ['/watch/movie/sindoor','/watch/movie/sindoor/','/watch/show/example/season/1/episode/2'])assert.equal(sites.onDemandPath('plex',path),true,path);
  for(const path of ['/','/on-demand','/live-tv/channel/cricket-gold','/watch/live/channel'])assert.equal(sites.onDemandPath('plex',path),false,path);
});

test('Plex requires one visible finite player-owned ad video',()=>{
  const f=plexDom();
  let result=sites.inspectPlex(f.doc,f.styleOf);
  assert.equal(result.video,f.first);assert.equal(result.ad,true);
  assert.equal(result.adInfo.kind,'separate-media');assert.equal(result.adInfo.media,f.first);
  assert.deepEqual({ordinal:result.adInfo.ordinal,total:result.adInfo.total,remaining:result.adInfo.remaining},{ordinal:1,total:2,remaining:7});assert.equal(result.player,f.player);
  f.show(1,29);result=sites.inspectPlex(f.doc,f.styleOf);
  assert.equal(result.video,f.second);assert.equal(result.adInfo.kind,'separate-media');assert.equal(result.adInfo.media,f.second);
  assert.deepEqual({ordinal:result.adInfo.ordinal,total:result.adInfo.total,remaining:result.adInfo.remaining},{ordinal:2,total:2,remaining:29});
  f.second.duration=Infinity;assert.equal(sites.inspectPlex(f.doc,f.styleOf).ad,false);
  f.second.duration=29.973;f.clear();result=sites.inspectPlex(f.doc,f.styleOf);
  assert.equal(result.video,f.program);assert.equal(result.ad,false);
  assert.deepEqual(sites.inspectPlex({body:f.doc.body,querySelectorAll:()=>[]},f.styleOf),{video:null,ad:false,player:null});
});

function pipeline({preferSkip=false,path='/watch/movie/sindoor'}={}) {
  const dom=plexDom(),intervals=new Map(),reports=[],location={hostname:'watch.plex.tv',pathname:path};
  let now=0,enabled=true,storageListener=()=>{};
  const context={
    window:{top:{}},document:dom.doc,location,performance:{now:()=>now},getComputedStyle:dom.styleOf,
    PrimeAdAcceleratorCore:core,AdAcceleratorSites:sites,VideoActions:actions,
    SiteCompatibility:class{update(){}restore(){}},
    ElementRules:{HiddenElements:class{update(){}restore(){}}},
    ElementPicker:class{start(){}stop(){}},AdaptiveCore:{},AdaptiveElements:class{update(){}stop(){}},
    chrome:{runtime:{id:'test',onMessage:{addListener(){},removeListener(){}},sendMessage:async m=>{
      if(m.type==='video-report'){reports.push(m);return{ok:true};}
      if(m.type==='page-config')return{enabled,cosmetics:false,custom:false,adaptiveActive:false,adaptiveRules:[],elementRules:[],videoSettings:{enabled:true,speed:10,preferSkip}};
      return{selectors:[]};
    }},storage:{onChanged:{addListener(fn){storageListener=fn;},removeListener(){}}}},
    setInterval:(fn,ms)=>{intervals.set(ms,fn);return ms;},clearInterval:id=>intervals.delete(id),addEventListener(){}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../content.js'),'utf8'),context);
  return {
    ...dom,reports,location,
    advance(){now+=250;intervals.get(250)();},
    setEnabled(value){enabled=value;storageListener({},'local');}
  };
}

test('Plex content pipeline skips only ad media, then falls back and restores program state',async()=>{
  const f=pipeline({preferSkip:true});await flush();
  assert.equal(f.first.currentTime,6.926);assert.equal(f.program.currentTime,0.39);assert.equal(f.program.playbackRate,1.25);
  for(let i=0;i<6;i++)f.advance();
  assert.equal(f.first.playbackRate,10);assert.equal(f.program.playbackRate,1.25);
  f.clear();f.program.paused=false;f.program.currentTime=1.39;f.advance();
  assert.equal(f.first.playbackRate,1);assert.equal(f.program.playbackRate,1.25);assert.equal(f.reports.at(-1).ad,false);
});

test('Plex consecutive ads rearm from ordinal and countdown evidence',async()=>{
  const f=pipeline();await flush();f.advance();assert.equal(f.first.playbackRate,10);
  f.show(1,30);f.second.currentTime=0.1;f.advance();
  assert.equal(f.first.playbackRate,1);assert.equal(f.second.playbackRate,1);
  f.show(1,29);f.second.currentTime=1.1;f.advance();
  f.show(1,28);f.second.currentTime=2.1;f.advance();
  f.show(1,27);f.second.currentTime=3.1;f.advance();
  assert.equal(f.second.playbackRate,10);
  f.clear();f.program.paused=false;f.advance();
  assert.equal(f.second.playbackRate,1);assert.equal(f.program.playbackRate,1.25);
});

test('disabling or navigating away during a Plex ad restores its original speed',async()=>{
  const disabled=pipeline();await flush();disabled.advance();assert.equal(disabled.first.playbackRate,10);
  disabled.setEnabled(false);await flush();assert.equal(disabled.first.playbackRate,1);
  disabled.setEnabled(true);await flush();assert.equal(disabled.first.playbackRate,1);
  disabled.advance();assert.equal(disabled.first.playbackRate,10);
  const navigated=pipeline();await flush();navigated.advance();assert.equal(navigated.first.playbackRate,10);
  navigated.location.pathname='/live-tv/channel/cricket-gold';navigated.advance();
  assert.equal(navigated.first.playbackRate,1);assert.equal(navigated.program.playbackRate,1.25);
});

test('a paused Plex ad stays paused and resumes only after fresh confirmation',async()=>{
  const f=pipeline();f.first.paused=true;await flush();
  assert.equal(f.first.currentTime,0.1);assert.equal(f.first.playbackRate,1);
  f.first.paused=false;f.advance();assert.equal(f.first.playbackRate,1);
  f.advance();assert.equal(f.first.playbackRate,10);
});
