const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const sites=require('../sites.js'),core=require('../core.js'),actions=require('../video-actions.js');
const AD='video[title="Advertisement"]',PROGRAM='video:not([title="Advertisement"])';
const ROUTE='/en/play/glld8qlwhya0pf0/y0032m61lp6-EP1%3AA_little_thing_called_first_love';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function node(style={}){return{style:{display:'block',visibility:'visible',opacity:'1',...style},classList:{contains:n=>n==='wetv-player__none'&&style.display==='none'},isConnected:true,parentElement:null,closest:()=>null,getBoundingClientRect:()=>({width:920,height:518}),querySelector:()=>null,querySelectorAll:()=>[]};}
function media({title='',duration,currentTime=0,paused=false,rate=1}={}){return{...node(),title,duration,currentTime,paused,ended:false,playbackRate:rate,seekable:{length:1,start:()=>0,end:()=>duration}};}
function wetvDom(){
 const player=node(),scope=node(),program=media({duration:2688.554,currentTime:4.416,paused:true,rate:1.25}),first=media({title:'Advertisement',duration:15.069,currentTime:3}),second=media({title:'Advertisement',duration:30.058,currentTime:0,paused:true}),firstWrap=node(),secondWrap=node({display:'none'});
 scope.parentElement=player;program.parentElement=player;firstWrap.parentElement=scope;secondWrap.parentElement=scope;first.parentElement=firstWrap;second.parentElement=secondWrap;
 player.querySelector=q=>q==='#wetv-ads-container'?scope:null;player.querySelectorAll=q=>q===PROGRAM?[program]:[];scope.querySelectorAll=q=>q===AD?[first,second]:[];
 const doc={querySelector:q=>q==='#player--playback_background'?player:null};
 function show(index){scope.style.display='block';firstWrap.style.display=index===0?'block':'none';secondWrap.style.display=index===1?'block':'none';first.paused=index!==0;second.paused=index!==1;}
 function clear(){scope.style.display='none';firstWrap.style.display='none';secondWrap.style.display='none';first.paused=true;second.paused=true;program.paused=false;}
 show(0);return{doc,player,scope,program,first,second,show,clear,styleOf:e=>e.style};
}
test('WeTV host and observed English episode route boundaries are exact',()=>{
 for(const host of ['wetv.vip','www.wetv.vip'])assert.equal(sites.siteFor(host),'wetv');for(const host of ['api.wetv.vip','wetv.vip.evil.test'])assert.equal(sites.siteFor(host),null);
 for(const path of [ROUTE,ROUTE+'/'])assert.equal(sites.onDemandPath('wetv',path),true,path);for(const path of ['/','/en','/en/play/glld8qlwhya0pf0','/th/play/a/b','/en/live/channel'])assert.equal(sites.onDemandPath('wetv',path),false,path);
});
test('WeTV requires one visible finite ad in its active player-owned container',()=>{
 const f=wetvDom();let result=sites.inspectWeTv(f.doc,f.styleOf);assert.equal(result.video,f.first);assert.equal(result.ad,true);assert.equal(result.adInfo.kind,'separate-media');assert.equal(result.player,f.player);
 f.show(1);result=sites.inspectWeTv(f.doc,f.styleOf);assert.equal(result.video,f.second);f.second.duration=Infinity;assert.equal(sites.inspectWeTv(f.doc,f.styleOf).ad,false);f.second.duration=30.058;f.clear();result=sites.inspectWeTv(f.doc,f.styleOf);assert.equal(result.video,f.program);assert.equal(result.ad,false);
});
function pipeline({preferSkip=false,path=ROUTE}={}){
 const dom=wetvDom(),intervals=new Map(),reports=[],location={hostname:'wetv.vip',pathname:path};let now=0,enabled=true,storageListener=()=>{};
 const context={window:{top:{}},document:dom.doc,location,performance:{now:()=>now},getComputedStyle:dom.styleOf,PrimeAdAcceleratorCore:core,AdAcceleratorSites:sites,VideoActions:actions,SiteCompatibility:class{update(){}restore(){}},ElementRules:{HiddenElements:class{update(){}restore(){}}},ElementPicker:class{start(){}stop(){}},AdaptiveCore:{},AdaptiveElements:class{update(){}stop(){}},chrome:{runtime:{id:'test',onMessage:{addListener(){},removeListener(){}},sendMessage:async m=>{if(m.type==='video-report'){reports.push(m);return{ok:true};}if(m.type==='page-config')return{enabled,cosmetics:false,custom:false,adaptiveActive:false,adaptiveRules:[],elementRules:[],videoSettings:{enabled:true,speed:10,preferSkip}};return{selectors:[]};}},storage:{onChanged:{addListener(fn){storageListener=fn;},removeListener(){}}}},setInterval:(fn,ms)=>{intervals.set(ms,fn);return ms;},clearInterval:id=>intervals.delete(id),addEventListener(){}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../content.js'),'utf8'),context);return{...dom,reports,location,advance(delta=.25){now+=250;for(const v of [dom.first,dom.second])if(!v.paused)v.currentTime+=delta;intervals.get(250)();},setEnabled(value){enabled=value;storageListener({},'local');}};
}
test('WeTV skip-first changes only ad media and restores program state',async()=>{const f=pipeline({preferSkip:true});await flush();assert.equal(f.first.currentTime,15.019);assert.equal(f.program.currentTime,4.416);assert.equal(f.program.playbackRate,1.25);for(let i=0;i<6;i++)f.advance();assert.equal(f.first.playbackRate,10);f.clear();f.advance();assert.equal(f.first.playbackRate,1);assert.equal(f.program.playbackRate,1.25);});
test('WeTV consecutive ad media requires fresh progression',async()=>{const f=pipeline();await flush();f.advance();assert.equal(f.first.playbackRate,10);f.show(1);f.advance();assert.equal(f.first.playbackRate,1);assert.equal(f.second.playbackRate,1);f.advance();f.advance();f.advance();assert.equal(f.second.playbackRate,10);f.clear();f.advance();assert.equal(f.second.playbackRate,1);assert.equal(f.program.playbackRate,1.25);});
test('disabling or leaving WeTV VOD restores ad speed only',async()=>{const disabled=pipeline();await flush();disabled.advance();assert.equal(disabled.first.playbackRate,10);disabled.setEnabled(false);await flush();assert.equal(disabled.first.playbackRate,1);const nav=pipeline();await flush();nav.advance();nav.location.pathname='/en/live/channel';nav.advance();assert.equal(nav.first.playbackRate,1);assert.equal(nav.program.currentTime,4.416);assert.equal(nav.program.playbackRate,1.25);});
test('a paused WeTV ad remains paused until fresh confirmation',async()=>{const f=pipeline();f.first.paused=true;await flush();f.advance();assert.equal(f.first.playbackRate,1);f.first.paused=false;f.advance();assert.equal(f.first.playbackRate,1);f.advance();assert.equal(f.first.playbackRate,10);});
