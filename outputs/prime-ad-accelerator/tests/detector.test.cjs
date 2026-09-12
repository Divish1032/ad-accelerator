const {test} = require('node:test');
const assert = require('node:assert/strict');
const {inspectPrimePlayer} = require('../detector.js');
const {isAdLabel} = require('../core.js');

function fixture() {
  function element(extra={}) {
    return {isConnected:true, parentElement:null, childElementCount:0, textContent:'',
      style:{display:'block',visibility:'visible',opacity:'1'},
      getBoundingClientRect:()=>({width:1512,height:707}),
      closest:()=>null, ...extra};
  }
  const video=element({closest:selector=>selector.includes('aria-hidden') ? video : null});
  const surface=element(); video.parentElement=surface;
  const labels=[];
  // Sibling controls contain no video, as observed on Prime's real page.
  const controls=element({querySelectorAll:selector=>selector==='video'?[]:labels});
  const doc={querySelectorAll:selector=>selector==='[aria-label="Web Player"]'?[controls]:[video]};
  const inspect=()=>inspectPrimePlayer(doc,e=>e.style,isAdLabel);
  return {video,surface,controls,labels,element,inspect};
}
test('finds sibling media surface even though video is aria-hidden',()=>{
  const f=fixture(); assert.equal(f.inspect().video,f.video); assert.equal(f.inspect().ad,false);
});
test('does not treat a CSS-hidden video as visible',()=>{
  const f=fixture(); f.video.style.display='none'; assert.equal(f.inspect().video,null);
});
test('checks ancestor visibility for media surface',()=>{
  const f=fixture(); f.surface.style.opacity='0'; assert.equal(f.inspect().video,null);
});
test('requires visible controls as well as media',()=>{
  const f=fixture(); f.controls.style.visibility='hidden'; assert.equal(f.inspect().video,null);
});
test('detects an explicit countdown in the controls',()=>{
  const f=fixture(); f.labels.push(f.element({textContent:'Ad 0:30'})); assert.equal(f.inspect().ad,true);
});
test('does not detect hidden or caption countdown text',()=>{
  const f=fixture(); const label=f.element({textContent:'Ad 0:30'}); f.labels.push(label);
  label.style.display='none'; assert.equal(f.inspect().ad,false);
  label.style.display='block'; label.closest=selector=>selector.includes('caption')?label:null;
  assert.equal(f.inspect().ad,false);
});
test('extracts numbered ad evidence without interpreting dialogue',()=>{const f=fixture();f.labels.push(f.element({textContent:'Ad 2 of 3 0:15'}));assert.deepEqual(f.inspect().adInfo,{ordinal:2,total:3,remaining:15});});
