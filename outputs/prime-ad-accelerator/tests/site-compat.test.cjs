const {test}=require('node:test'),assert=require('node:assert/strict'),Compat=require('../site-compat.js');
function style(initial){return Object.assign({getPropertyValue(n){return this[n]||'';},getPropertyPriority(n){return this[n+'Priority']||'';},setProperty(n,v,p=''){this[n]=v;this[n+'Priority']=p;}},initial);}
function fixture(host='luciferdonghua.in',label='Please turn off your ad blocker'){
 const box={tagName:'DIV',style:style({display:'flex',displayPriority:'important',position:'fixed',zIndex:'2147483647'}),querySelectorAll:s=>[{textContent:s==='button'?'I turned it off, reload the page':label}]};
 const doc={body:{children:[box]},documentElement:{style:style({overflow:'hidden'})}};
 return{box,doc,c:new Compat(doc,host)};
}
test('observed ad warning hidden without removal and scrolling restored',()=>{const f=fixture();f.c.update(true);assert.equal(f.box.style.display,'none');assert.equal(f.doc.body.children[0],f.box);assert.equal(f.doc.documentElement.style.overflow,'auto');f.c.update(true);f.c.restore();assert.equal(f.box.style.display,'flex');assert.equal(f.box.style.displayPriority,'important');assert.equal(f.doc.documentElement.style.overflow,'hidden');});
test('does not affect other sites, paid-content dialogs or disabled protection',()=>{for(const f of [fixture('example.com'),fixture('luciferdonghua.in.attacker.test'),fixture('luciferdonghua.in','Subscribe to watch this video')]){f.c.update(true);assert.equal(f.box.style.display,'flex');}const f=fixture();f.c.update(false);assert.equal(f.box.style.display,'flex');});
test('turning cosmetics off restores the site dialog',()=>{const f=fixture();f.c.update(true);f.c.update(false);assert.equal(f.box.style.display,'flex');});
test('detached compatibility elements release references and retain their original style',()=>{
 const f=fixture();f.box.isConnected=true;f.c.update(true);
 f.box.isConnected=false;f.doc.body.children=[];f.c.update(true);
 assert.equal(f.c.hidden.size,0);assert.equal(f.box.style.display,'flex');
 f.box.isConnected=true;f.doc.body.children=[f.box];f.c.update(true);f.c.restore();assert.equal(f.box.style.display,'flex');
});
function playerAdFixture(){
 const close={};
 const overlay={tagName:'DIV',style:style({position:'absolute',zIndex:'200'}),children:[{}],parentElement:{matches:s=>s==='.video-content'}};
 const inner={children:[{},{}],parentElement:overlay,matches:()=>false,querySelector:()=>close};
 const banner={children:[{},{}],style:style({display:'block'}),matches:s=>s==='div.kln',querySelector:()=>({})};
 const f=fixture();f.doc.querySelectorAll=s=>{assert.equal(s,'iframe[src="https://t.co/Mi7nP8nOVO"]');return [{parentElement:inner},{parentElement:banner}];};
 return {...f,overlay,inner,banner};
}
test('hides observed banner and overlay without invoking close or hiding player parent',()=>{const f=playerAdFixture();f.c.update(true);assert.equal(f.overlay.style.display,'none');assert.equal(f.banner.style.display,'none');assert.equal(f.overlay.parentElement.style,undefined);f.c.update(false);assert.equal(f.overlay.style.display,'');assert.equal(f.banner.style.display,'block');});
test('leaves containers with additional content and wrong overlay geometry alone',()=>{const f=playerAdFixture();f.inner.children.push({});f.banner.children.push({});f.c.update(true);assert.notEqual(f.overlay.style.display,'none');assert.equal(f.banner.style.display,'block');const g=playerAdFixture();g.overlay.style.position='relative';g.c.update(true);assert.notEqual(g.overlay.style.display,'none');});
test('reapplies overlay hiding after site changes display and restores original style',()=>{const f=playerAdFixture();f.c.update(true);f.overlay.style.display='block';f.c.update(true);assert.equal(f.overlay.style.display,'none');f.c.restore();assert.equal(f.overlay.style.display,'');});
