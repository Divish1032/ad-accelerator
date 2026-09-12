const {test}=require('node:test');const assert=require('node:assert/strict');
const {Accelerator}=require('../core.js');const {siteFor,settingsFor,onDemandPath,inspectHotstar}=require('../sites.js');
test('per-site defaults and legacy off preference',()=>{assert.deepEqual(settingsFor({enabled:false},'prime'),{enabled:false,speed:10});assert.deepEqual(settingsFor({enabled:false},'hotstar'),{enabled:true,speed:4});});
test('independent persisted settings and invalid speed fallback',()=>{const d={'site.prime':{enabled:true,speed:8},'site.hotstar':{enabled:false,speed:999}};assert.equal(settingsFor(d,'prime').speed,8);assert.deepEqual(settingsFor(d,'hotstar'),{enabled:false,speed:4});});
test('exact supported host boundaries',()=>{assert.equal(siteFor('www.hotstar.com'),'hotstar');assert.equal(siteFor('hotstar.com.evil.test'),null);assert.equal(siteFor('example.com'),null);});
test('only known on-demand routes eligible',()=>{assert.ok(onDemandPath('hotstar','/in/shows/title/123/episode/456/watch'));assert.equal(onDemandPath('hotstar','/in/sports/game/video/live/watch'),false);assert.equal(onDemandPath('hotstar','/in/home'),false);assert.ok(onDemandPath('prime','/region/eu/detail/123'));assert.equal(onDemandPath('prime','/livetv'),false);});
for(const speed of [2,4,8,10])test(`speed ${speed} applies and restores original`,()=>{const a=new Accelerator(),v={paused:false,ended:false,currentTime:0,playbackRate:1.5,duration:100};a.update({video:v,ad:true,enabled:true,now:0,speed});a.update({video:v,ad:true,enabled:true,now:250,speed});assert.equal(v.playbackRate,speed);a.update({video:v,ad:false,enabled:true,now:500,speed});assert.equal(v.playbackRate,1.5);});
test('changing speed mid-ad retains original restoration target',()=>{const a=new Accelerator(),v={paused:false,currentTime:0,playbackRate:1.25};const u=(now,speed,ad=true)=>a.update({video:v,ad,enabled:true,now,speed});u(0,4);u(250,4);u(500,8);u(750,8);assert.equal(v.playbackRate,8);u(1000,8,false);assert.equal(v.playbackRate,1.25);});
test('live and invalid speed restore active acceleration',()=>{for(const extra of [{live:true},{speed:999}]){const a=new Accelerator(),v={paused:false,currentTime:0,playbackRate:1};for(const now of [0,250])a.update({video:v,ad:true,enabled:true,now});a.update({video:v,ad:true,enabled:true,now:500,...extra});assert.equal(v.playbackRate,1);}});
function hotFixture(active){const style={display:'block',visibility:'visible',opacity:'1'};const el=()=>({isConnected:true,parentElement:null,closest:()=>null,getBoundingClientRect:()=>({width:800,height:450}),style});const ad=el(),main=el();const container={getAttribute:()=>active?'false':'true',querySelectorAll:()=>[ad]};const scope={querySelector:()=>container,querySelectorAll:()=>[main]};return{ad,main,doc:{querySelector:()=>scope},styleOf:e=>e.style};}
test('Hotstar active ad container selects ad video, not episode',()=>{const f=hotFixture(true),r=inspectHotstar(f.doc,f.styleOf);assert.equal(r.video,f.ad);assert.equal(r.ad,true);});
test('Hotstar inactive or visually hidden ad does not accelerate',()=>{const f=hotFixture(false);assert.equal(inspectHotstar(f.doc,f.styleOf).ad,false);const g=hotFixture(true);g.ad.style.display='none';assert.equal(inspectHotstar(g.doc,g.styleOf).ad,false);});
const {inspectYouTube}=require('../sites.js');
test('YouTube host and route boundaries, independent 20x setting',()=>{
 assert.equal(siteFor('www.youtube.com'),'youtube');assert.equal(siteFor('youtube.com.evil.test'),null);
 assert.ok(onDemandPath('youtube','/watch'));
 for(const p of ['/shorts/123','/embed/123','/live/123','/'])assert.equal(onDemandPath('youtube',p),false);
 assert.deepEqual(settingsFor({'site.youtube':{enabled:true,speed:20}},'youtube'),{enabled:true,speed:20});
 assert.equal(settingsFor({'site.youtube':{speed:20}},'hotstar').speed,4);
});
function ytFixture(classes=[]){
 const v={isConnected:true,closest:()=>null,getBoundingClientRect:()=>({width:640,height:360}),parentElement:null};
 const player={classList:{contains:c=>classes.includes(c)},querySelectorAll:()=>[v]};
 return {v,player,doc:{querySelector:()=>player},style:()=>({display:'block',visibility:'visible',opacity:'1'})};
}
test('YouTube ad state selects scoped media and clears for content',()=>{const c=['ad-showing'],f=ytFixture(c);assert.equal(inspectYouTube(f.doc,f.style).ad,true);c.pop();assert.equal(inspectYouTube(f.doc,f.style).ad,false);});
test('YouTube excludes live, hidden and ambiguous players',()=>{
 const live=ytFixture(['ad-showing','ytp-live']);assert.equal(inspectYouTube(live.doc,live.style).ad,false);assert.equal(inspectYouTube(live.doc,live.style).live,true);
 const f=ytFixture(['ad-showing']);assert.equal(inspectYouTube(f.doc,()=>({display:'none'})).video,null);
 f.player.querySelectorAll=()=>[f.v,f.v];assert.equal(inspectYouTube(f.doc,f.style).ad,false);
 assert.equal(inspectYouTube({querySelector:()=>null},f.style).video,null);
});
for(const limit of [20,16])test(`20x request with player limit ${limit} stays stable and restores`,()=>{
 let rate=1.25;const v={paused:false,currentTime:0,get playbackRate(){return rate;},set playbackRate(n){if(n>limit)throw Error('NotSupported');rate=n;}};
 const a=new Accelerator();const u=(now,ad=true,speed=20)=>a.update({video:v,ad,enabled:true,now,speed});
 u(0);u(250);assert.equal(rate,limit);u(500);assert.equal(rate,limit);assert.match(a.status,new RegExp(`${limit}×`));
 if(limit===16)assert.match(a.status,/20× unavailable/);
 u(750,false);assert.equal(rate,1.25);
});
test('20x and fallback both rejected leave original untouched',()=>{
 let rate=1;const v={paused:false,currentTime:0,get playbackRate(){return rate;},set playbackRate(n){if(n>10)throw Error('NotSupported');rate=n;}};
 const a=new Accelerator();for(const now of [0,250,500])a.update({video:v,ad:true,enabled:true,now,speed:20});
 assert.equal(rate,1);assert.equal(a.active,null);assert.match(a.status,/rejected/);
});
test('fallback can be changed mid-ad and disabled without losing original',()=>{
 let rate=1.5;const v={paused:false,currentTime:0,get playbackRate(){return rate;},set playbackRate(n){if(n>16)throw Error('NotSupported');rate=n;}};
 const a=new Accelerator();for(const now of [0,250])a.update({video:v,ad:true,enabled:true,now,speed:20});
 for(const now of [500,750])a.update({video:v,ad:true,enabled:true,now,speed:10});assert.equal(rate,10);
 a.update({video:v,ad:true,enabled:false,now:1000,speed:10});assert.equal(rate,1.5);
});
test('silently clamped speed is reported and restored',()=>{
 let rate=1;const v={paused:false,currentTime:0,get playbackRate(){return rate;},set playbackRate(n){rate=Math.min(n,16);}};
 const a=new Accelerator();for(const now of [0,250,500])a.update({video:v,ad:true,enabled:true,now,speed:20});assert.equal(rate,16);assert.match(a.status,/16×/);
 a.update({video:v,ad:false,enabled:true,now:750,speed:20});assert.equal(rate,1);
});
