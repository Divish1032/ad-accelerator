const {test}=require('node:test'),assert=require('node:assert/strict');const {Skipper,skipButton}=require('../video-actions.js');
const styleOf=()=>({display:'block',visibility:'visible',opacity:'1'});
function button(label){return{isConnected:true,closest:()=>null,parentElement:null,getBoundingClientRect:()=>({width:100,height:30}),getAttribute:n=>n==='aria-label'?label:null,matches:()=>false,click(){this.clicked=(this.clicked||0)+1;}};}
function fixture(){const video={paused:false,currentTime:0,duration:30,seekable:{length:1,end:()=>30}},skip=new Skipper();let restored=0;return{video,skip,args:{video,ad:true,enabled:true,preferSkip:true,live:false,now:0,styleOf,restore:()=>restored++},restored:()=>restored};}
test('clicks real ad skip once, then falls back when ad remains',()=>{const f=fixture(),b=button('Skip Ad');f.args.player={querySelectorAll:()=>[b]};assert.ok(f.skip.update(f.args));assert.equal(b.clicked,1);assert.equal(f.restored(),1);assert.equal(f.skip.update({...f.args,now:1250}),false);assert.equal(b.clicked,1);});
test('intro and countdown or disabled controls are not clicked',()=>{for(const label of ['Skip Intro','Skip Ad in 5','Buy now'])assert.equal(skipButton({querySelectorAll:()=>[button(label)]},styleOf),null);const b=button('Skip Ad');b.disabled=true;assert.equal(skipButton({querySelectorAll:()=>[b]},styleOf),null);});
test('seeks only explicitly separate ad media',()=>{
 const f=fixture();assert.equal(f.skip.update({...f.args,site:'hotstar'}),false);assert.equal(f.video.currentTime,0);
 const adInfo={kind:'separate-media',media:f.video};assert.ok(f.skip.update({...f.args,adInfo}));assert.equal(f.video.currentTime,29.95);
 assert.equal(f.skip.update({...f.args,adInfo,now:1200}),false);
});
test('live, paused, disabled and skip-off never seek or click',()=>{
 for(const extra of [{live:true},{enabled:false},{preferSkip:false},{ad:false}]){const f=fixture();f.skip.update({...f.args,site:'hotstar',...extra});assert.equal(f.video.currentTime,0);}
 const f=fixture();f.video.paused=true;f.skip.update({...f.args,site:'hotstar'});assert.equal(f.video.currentTime,0);
});
test('unseekable media and rejected seek fall back immediately',()=>{
 const f=fixture();f.video.seekable.length=0;assert.equal(f.skip.update({...f.args,adInfo:{kind:'separate-media',media:f.video}}),false);
 const g=fixture();Object.defineProperty(g.video,'currentTime',{get:()=>0,set:()=>{throw Error('unseekable');}});assert.equal(g.skip.update({...g.args,adInfo:{kind:'separate-media',media:g.video}}),false);
});
