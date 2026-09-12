const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isAdLabel, Accelerator } = require('../core.js');
function video(rate = 1) { return { paused: false, ended: false, playbackRate: rate, currentTime: 100 }; }
function begin(v = video()) {
  const a = new Accelerator();
  const update = (overrides = {}) => a.update({ video: v, enabled: true, ad: true, now: 0, ...overrides });
  update(); update({ now: 250 });
  return { a, v, update };
}
test('accept only explicit English ad labels with countdowns', () => {
  for (const label of ['Ad 0:30', 'Ads · 1:02', 'Ad 1 of 2 0:15', 'Advertisement 15 seconds remaining']) assert.ok(isAdLabel(label), label);
  for (const label of ['Go ad free', 'Ad', '0:30', 'The ad is 0:30 long', 'Ads 4:99', 'Supernatural', 'Skip intro', 'Your ad 0:30', 'Ad 1 of 2']) assert.equal(isAdLabel(label), false, label);
});
test('waits for confirmation and restores custom speed on ad exit', () => {
  const { a, v, update } = begin(video(1.5));
  assert.equal(v.playbackRate, 10);
  update({ ad: false, now: 500 });
  assert.equal(v.playbackRate, 1.5);
  assert.equal(a.active, null);
});
test('brief label flashes do not change speed', () => {
  const a = new Accelerator(), v = video();
  a.update({video:v, enabled:true, ad:true, now:0});
  a.update({video:v, enabled:true, ad:false, now:100});
  assert.equal(v.playbackRate, 1);
});
for (const [name, override] of [['disabled', {enabled:false}], ['missing player', {video:null}], ['ad signal lost', {ad:false}]]) {
  test(`restores speed when ${name}`, () => { const {v, update} = begin(); update({...override, now:500}); assert.equal(v.playbackRate, 1); });
}
test('pausing restores speed and resuming requires fresh confirmation', () => {
  const {v, update} = begin(); v.paused=true; update({now:500}); assert.equal(v.playbackRate,1);
  v.paused=false; update({now:750}); assert.equal(v.playbackRate,1); update({now:1000}); assert.equal(v.playbackRate,10);
});
test('Prime restoring speed blocks reacceleration on a stale label', () => {
  const {v,update} = begin(); v.playbackRate=1; update({now:500}); update({now:1000}); assert.equal(v.playbackRate,1);
  update({ad:false,now:1250}); update({now:1500}); update({now:1750}); assert.equal(v.playbackRate,10);
});
test('video replacement restores old video and leaves new video alone', () => {
  const {v,update}=begin(video(1.25)), next=video(); update({video:next,now:500});
  assert.equal(v.playbackRate,1.25); assert.equal(next.playbackRate,1);
});
test('seeking across content boundaries restores speed', () => {
  const {v,update}=begin(); v.currentTime=300; update({now:500}); assert.equal(v.playbackRate,1);
});
test('safety deadline restores speed without repeatedly accelerating', () => {
  const {v,update}=begin(); update({now:120251}); update({now:120501}); assert.equal(v.playbackRate,1);
});
test('does not overwrite a viewer speed change', () => {
  const {v,update}=begin(); v.playbackRate=2; update({ad:false,now:500}); assert.equal(v.playbackRate,2);
});
test('normal playback progresses at 10x without tripping seek protection', () => {
  const {v,update}=begin(); for(let n=1;n<=8;n++){v.currentTime+=2.5;update({now:250+n*250});} assert.equal(v.playbackRate,10);
});
test('handles player rejecting the setter', () => {
  const v=video(); Object.defineProperty(v,'playbackRate',{get:()=>1,set:()=>{throw Error('rejected');}});
  const {a}=begin(v); assert.equal(a.active,null); assert.match(a.status,/rejected/);
});
test('consecutive Prime ad requires new ordinal plus countdown and media progress',()=>{
 const a=new Accelerator(),v=video();const run=(now,remaining,ordinal)=>a.update({video:v,ad:true,enabled:true,now,adInfo:{remaining,ordinal,total:2}});
 run(0,20,1);run(250,20,1);assert.equal(v.playbackRate,10);
 v.playbackRate=1;run(500,15,2);run(750,15,2);assert.equal(v.playbackRate,1);
 v.currentTime+=1;run(1750,14,2);run(2000,14,2);assert.equal(v.playbackRate,10);
});
test('new countdown can rearm unnumbered ads, but frozen label cannot',()=>{
 const a=new Accelerator(),v=video();const run=(now,remaining)=>a.update({video:v,ad:true,enabled:true,now,adInfo:{remaining,ordinal:0,total:0}});
 run(0,5);run(250,5);v.playbackRate=1;run(500,30);run(750,30);v.currentTime++;run(1500,30);assert.equal(v.playbackRate,1);run(1750,29);run(2000,29);assert.equal(v.playbackRate,10);
});
test('continuing same-ad countdown does not override user or player speed reset',()=>{
 const a=new Accelerator(),v=video();for(const now of [0,250])a.update({video:v,ad:true,enabled:true,now,adInfo:{remaining:20,ordinal:1,total:2}});
 v.playbackRate=1;for(const now of [500,1000,1500]){v.currentTime++;a.update({video:v,ad:true,enabled:true,now,adInfo:{remaining:19-now/500,ordinal:1,total:2}});}assert.equal(v.playbackRate,1);
});
test('Prime pod countdown rearms second and third creatives after exact rate restoration',()=>{
 const a=new Accelerator(),v=video();
 const run=(now,remaining)=>a.update({video:v,ad:true,enabled:true,site:'prime',now,adInfo:{remaining,ordinal:0,total:0}});
 run(0,40);run(250,40);assert.equal(v.playbackRate,10);
 for(const [base,remaining] of [[500,37],[1500,32]]){
   v.currentTime+=2.5;v.playbackRate=1;run(base,remaining);assert.equal(v.playbackRate,1);
   v.currentTime+=1;run(base+250,remaining-1);
   v.currentTime+=1;run(base+500,remaining-2);
   v.currentTime+=1;run(base+750,remaining-3);assert.equal(v.playbackRate,10);
 }
});
test('Prime does not override a different viewer-selected speed during an ad',()=>{
 const a=new Accelerator(),v=video();
 const run=(now,remaining)=>a.update({video:v,ad:true,enabled:true,site:'prime',now,adInfo:{remaining,ordinal:0,total:0}});
 run(0,20);run(250,20);v.currentTime+=2.5;v.playbackRate=2;run(500,18);
 for(const [now,remaining] of [[750,17],[1000,16],[1250,15]]){v.currentTime++;run(now,remaining);}
 assert.equal(v.playbackRate,2);
});
