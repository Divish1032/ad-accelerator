const {test}=require('node:test'),assert=require('node:assert/strict');
const {closeListedTarget}=require('../popup-guard.js'),core=require('../filter-core.js');
function setup({url='https://ads.example/afu.php',source='https://site.example/watch',target,protection={},rules=core.compile([['ads.example']]),fail=false,moved=false}={}){
 const removed=[];let sourceReads=0;
 const details={sourceTabId:1,tabId:2,url};
 const chrome={tabs:{get:async id=>{if(fail)throw Error('No tab');if(id===1)return {url:moved&&++sourceReads>1?'https://other.example/':source};return target||{url};},remove:async id=>removed.push(id)},storage:{local:{get:async()=>({protection})}},declarativeNetRequest:{getDynamicRules:async()=>rules}};
 return {details,removed,run:()=>closeListedTarget(details,chrome,core)};
}
test('closes only newly opened listed destination and leaves source intact',async()=>{const r=setup();assert.equal(await r.run(),true);assert.deepEqual(r.removed,[2]);});
test('matches listed subdomains',async()=>{const r=setup({url:'https://sub.ads.example/popup'});assert.equal(await r.run(),true);});
test('preserves unlisted links and similar domain names',async()=>{for(const url of ['https://login.example/','https://notads.example/','https://ads.example.safe.test/','about:blank']){const r=setup({url});assert.equal(await r.run(),false);}});
test('global pause and opener or destination exceptions prevent closing',async()=>{for(const protection of [{enabled:false},{disabledSites:['site.example']},{disabledSites:['ads.example']}]){const r=setup({protection});assert.equal(await r.run(),false);}});
test('never closes source tab or same-host new links',async()=>{const r=setup();r.details.tabId=1;assert.equal(await r.run(),false);assert.equal(await setup({source:'https://ads.example/page'}).run(),false);});
test('tab moved to ordinary page during inspection is preserved',async()=>{assert.equal(await setup({target:{url:'https://safe.example/'}}).run(),false);assert.equal(await setup({target:{url:'https://ads.example/afu.php',pendingUrl:'https://safe.example/'}}).run(),false);});
test('pending listed navigation is closed while committed URL is blank',async()=>{assert.equal(await setup({target:{url:'about:blank',pendingUrl:'https://ads.example/afu.php'}}).run(),true);});
test('source navigation, missing tabs and missing rules fail open',async()=>{for(const opts of [{moved:true},{fail:true},{rules:[]}])assert.equal(await setup(opts).run(),false);});
test('subresource-only legacy rules do not authorize popup closure',async()=>{const rules=core.compile([['ads.example']]);rules[0].condition.resourceTypes=['script'];assert.equal(await setup({rules}).run(),false);});
test('popup and network switches each disable popup cleanup',async()=>{for(const protection of [{popups:false},{network:false}])assert.equal(await setup({protection}).run(),false);});
test('recovery pauses popup closure without changing global switches',async()=>{for(const feature of ['network','popups'])assert.equal(await setup({protection:{recovery:{'site.example':{[feature]:Date.now()+600000}}}}).run(),false);});
const {Tracker}=require('../popup-guard.js');
function trackerFixture(){let now=1000;const tabs=new Map([[1,{url:'https://site.example/'}],[2,{url:'about:blank'}]]),closed=[],events=[];
 const chrome={tabs:{get:async id=>{if(!tabs.has(id))throw Error('missing');return {...tabs.get(id)};},remove:async id=>{closed.push(id);tabs.delete(id);}},storage:{local:{get:async()=>({})}},declarativeNetRequest:{getDynamicRules:async()=>core.compile([['ads.example']])}};
 return {tabs,closed,events,tracker:new Tracker(chrome,core,e=>events.push(e),()=>now),advance:()=>now+=10001};}
test('tracks blank popup then closes its listed first navigation',async()=>{const f=trackerFixture();await f.tracker.created({tabId:2,sourceTabId:1,url:'about:blank'});f.tabs.set(2,{url:'about:blank',pendingUrl:'https://ads.example/x'});await f.tracker.navigate({tabId:2,frameId:0,url:'https://ads.example/x'});assert.deepEqual(f.closed,[2]);assert.equal(f.events[0].sourceTabId,1);});
test('does not chase an ordinary committed page or expired popup',async()=>{for(const expire of [false,true]){const f=trackerFixture();await f.tracker.created({tabId:2,sourceTabId:1,url:'about:blank'});if(expire)f.advance();else f.tracker.committed({tabId:2,frameId:0,url:'https://login.example/'});f.tabs.set(2,{url:'https://ads.example/x'});await f.tracker.navigate({tabId:2,frameId:0,url:'https://ads.example/x'});assert.deepEqual(f.closed,[]);}});
test('ignores subframe navigation and changed source',async()=>{const f=trackerFixture();await f.tracker.created({tabId:2,sourceTabId:1,url:'about:blank'});f.tabs.set(2,{url:'https://ads.example/x'});await f.tracker.navigate({tabId:2,frameId:3,url:'https://ads.example/x'});f.tabs.set(1,{url:'https://site.example/elsewhere'});await f.tracker.navigate({tabId:2,frameId:0,url:'https://ads.example/x'});assert.deepEqual(f.closed,[]);});
