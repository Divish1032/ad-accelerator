const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture(){
 const listeners={},nodes={},sent=[];let shadowMode,removed=false;
 const node=()=>({style:{},disabled:false,focus(){},addEventListener(type,fn){(this.listeners||={})[type]=fn;}});
 const shadow={querySelector:s=>nodes[s]||=(node())};
 const host={style:{},attachShadow:({mode})=>{shadowMode=mode;return shadow;},contains:()=>false,remove:()=>removed=true};
 const selected={tagName:'DIV',isConnected:true,getBoundingClientRect:()=>({x:0,y:0,left:0,top:0,width:100,height:100})};
 const doc={defaultView:{addEventListener:(type,fn)=>listeners[type]=fn,removeEventListener:type=>delete listeners[type]},createElement:()=>host,documentElement:{append(){}},activeElement:null,elementsFromPoint:()=>[host,selected]};
 const context=vm.createContext({module:{exports:{}},ElementRules:{describe:()=>({selector:'#advert',tag:'div',classes:[]})}});
 vm.runInContext(fs.readFileSync(require.resolve('../element-picker.js'),'utf8'),context);
 const picker=new context.module.exports(doc,async m=>{sent.push(m);return {ok:true};});picker.start();
 const event=trusted=>({isTrusted:trusted,type:'click',clientX:50,clientY:50,composedPath:()=>[],preventDefault(){},stopImmediatePropagation(){}});
 return {nodes,sent,event,listeners,get removed(){return removed;},get shadowMode(){return shadowMode;}};
}
test('page scripts cannot select or save a hidden-element rule with synthetic events',async()=>{
 const f=fixture();assert.equal(f.shadowMode,'closed');
 f.listeners.click(f.event(false));await f.nodes['#save'].onclick(f.event(false));assert.equal(f.sent.length,0);
 f.nodes['.shield'].listeners.click(f.event(true));
 await f.nodes['#save'].onclick(f.event(false));assert.equal(f.sent.length,0);
 await f.nodes['#save'].onclick(f.event(true));assert.equal(f.sent.length,1);assert.equal(f.removed,true);
});
test('Escape only cancels for a trusted keyboard event',()=>{
 const f=fixture();f.listeners.keydown({...f.event(false),key:'Escape'});assert.equal(f.removed,false);
 f.listeners.keydown({...f.event(true),key:'Escape'});assert.equal(f.removed,true);
});
