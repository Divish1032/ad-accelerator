const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const core=require('../filter-core.js'),strict=require('../strict-core.js');
test('strict exceptions match exact hosts and cannot override listed threats',()=>{const rules=strict.rules(22,'site.example',['accounts.example'],10000),allow=rules[1],regex=new RegExp(allow.condition.regexFilter);for(const url of ['https://site.example/path','https://accounts.example/login'])assert.ok(regex.test(url));for(const url of ['https://accounts.example.evil.test/','https://other.example/?url=https://accounts.example/','https://sub.accounts.example/','https://accountsXexample/'])assert.equal(regex.test(url),false);assert.ok(allow.priority<core.compile([['accounts.example']])[0].priority);assert.deepEqual(rules[0].condition.resourceTypes,['main_frame']);});
test('strict controls respect network and site recovery',()=>{const base={strict:{'site.example':[]}};assert.ok(strict.active(core.config(base),'site.example',core));for(const patch of [{network:false},{enabled:false},{disabledSites:['site.example']},{recovery:{'site.example':{strict:Date.now()+10000}}}])assert.equal(strict.active(core.config({...base,...patch}),'site.example',core),false);});
test('early hook refuses unknown scripted windows but releases on explicit recovery',()=>{
 let calls=0;const listeners={};const window={open:()=>{calls++;return 'opened';},addEventListener:(n,f)=>listeners[n]=f};const c=vm.createContext({window,location:{hostname:'site.example',href:'https://site.example/'},URL,Set,JSON,Reflect});vm.runInContext(fs.readFileSync(require.resolve('../strict-open.js'),'utf8'),c);
 assert.equal(window.open('https://unknown.example/'),null);assert.equal(window.open(),null);assert.equal(calls,0);assert.equal(window.open('/episode'),'opened');
 listeners['ad-accelerator-strict-config']({detail:JSON.stringify({active:true,allowed:['login.example']})});assert.equal(window.open('https://login.example/'),'opened');assert.equal(window.open('https://sub.login.example/'),null);
 listeners['ad-accelerator-strict-config']({detail:JSON.stringify({active:false})});assert.equal(window.open('https://unknown.example/'),'opened');
});
const StrictNavigation=require('../strict-navigation.js');
test('unsupported strict regex is rejected before replacing working rules',async()=>{
 const f=navigationFixture(),c=core.config({strict:{'site.example':[]}});await f.n.sync(c);const before=structuredClone(f.rules);
 f.n.chrome.declarativeNetRequest.isRegexSupported=async()=>({isSupported:false,reason:'memoryLimitExceeded'});
 await assert.rejects(f.n.apply(1,'site.example',core.config({strict:{'site.example':['long.example']}})),/fewer or shorter/);
 assert.deepEqual(f.rules,before);assert.equal(await f.n.source(1),'site.example');
});
function navigationFixture(){let rules=[],stored={},fail=false;const tabs=new Map([[1,{id:1,url:'https://site.example/episode'}],[2,{id:2,url:'https://unlisted.example/'}]]),closed=[];
 const chrome={tabs:{query:async()=>[...tabs.values()],get:async id=>tabs.get(id),remove:async id=>closed.push(id)},storage:{session:{get:async()=>structuredClone(stored),set:async v=>{if(fail){fail=false;throw Error('session storage failed');}Object.assign(stored,structuredClone(v));}}},declarativeNetRequest:{isRegexSupported:async()=>({isSupported:true}),getSessionRules:async()=>structuredClone(rules),updateSessionRules:async({removeRuleIds=[],addRules=[]})=>{rules=rules.filter(r=>!removeRuleIds.includes(r.id)).concat(structuredClone(addRules));}}};
 return {n:new StrictNavigation(chrome,core,strict),tabs,closed,get rules(){return rules;},fail:()=>fail=true};}
test('strict newly-created unknown popup is closed; original tab is preserved',async()=>{const f=navigationFixture(),c=core.config({strict:{'site.example':[]}});await f.n.sync(c);await f.n.created({sourceTabId:1,tabId:2,url:'https://unlisted.example/'},c);assert.deepEqual(f.closed,[2]);});
test('blocked-page recovery keeps source context while removing enforcement',async()=>{const f=navigationFixture(),c=core.config({strict:{'site.example':[]}});await f.n.sync(c);f.tabs.set(1,{id:1,url:'https://unlisted.example/'});await f.n.sync(core.config({...c,recovery:{'site.example':{strict:Date.now()+600000}}}));assert.equal(f.rules.length,0);assert.equal(await f.n.source(1),'site.example');});
test('strict session persistence failure restores previous network rules',async()=>{const f=navigationFixture(),c=core.config({strict:{'site.example':[]}});f.fail();await assert.rejects(f.n.apply(1,'site.example',c));assert.deepEqual(f.rules,[]);});
test('strict config validates hostnames and preserves international ASCII domains',()=>{const c=core.config({strict:{'localhost':[],'127.0.0.1':[],'example.xn--p1ai':['accounts.example']}});assert.deepEqual(Object.keys(c.strict),['example.xn--p1ai']);});

test('strict rules are source-initiated; no blanket tab block or browser-wide allow',()=>{
 const rules=strict.rules(22,'site.example',['accounts.example'],10000);
 for(const r of rules){assert.deepEqual(r.condition.initiatorDomains,['site.example']);assert.deepEqual(r.condition.tabIds,[22]);}
 // With no request initiator (address bar/bookmark), neither scoped condition
 // is eligible. Both rules must be scoped so exceptions cannot override other
 // protection on a browser-initiated request.
 assert.ok(rules.every(r=>r.condition.initiatorDomains.length>0));
 assert.ok(rules.every(r=>r.priority<core.compile([['accounts.example']])[0].priority));
});
test('successful address-bar search releases old source and stays released after sync',async()=>{
 const f=navigationFixture(),c=core.config({strict:{'site.example':[]}});await f.n.sync(c);
 f.tabs.set(1,{id:1,url:'https://search.example/search?q=hello'});
 await f.n.committed({tabId:1,frameId:0,url:f.tabs.get(1).url,transitionType:'generated',transitionQualifiers:['from_address_bar']},c);
 assert.equal(await f.n.source(1),undefined);assert.equal(f.rules.length,0);
 await f.n.sync(c);assert.equal(await f.n.source(1),undefined);assert.equal(f.rules.length,0);
});
test('leaving for another protected site installs only its own source guard',async()=>{
 const f=navigationFixture(),c=core.config({strict:{'site.example':[],'second.example':[]}});await f.n.sync(c);
 await f.n.committed({tabId:1,frameId:0,url:'https://second.example/',transitionQualifiers:['from_address_bar']},c);
 assert.equal(await f.n.source(1),'second.example');assert.ok(f.rules.every(r=>r.condition.initiatorDomains[0]==='second.example'));
});
test('browser internal pages clear stale strict context while inherited blank popups remain guarded',async()=>{
 for(const url of ['chrome://newtab/','chrome://settings/','about:blank']){
  const f=navigationFixture(),c=core.config({strict:{'site.example':[]}});await f.n.sync(c);
  await f.n.committed({tabId:1,frameId:0,url:'about:blank'},c);assert.equal(await f.n.source(1),'site.example');
  await f.n.committed({tabId:1,frameId:1,url:'https://frame.example/'},c);assert.equal(await f.n.source(1),'site.example');
  await f.n.committed({tabId:1,frameId:0,url,transitionQualifiers:['from_address_bar']},c);assert.equal(await f.n.source(1),undefined);assert.equal(f.rules.length,0);
 }
});
test('startup sync replaces old blanket tab rules with source-initiated rules',async()=>{
 const f=navigationFixture(),c=core.config({strict:{'site.example':[]}});await f.n.sync(c);
 const legacy=f.rules.map(r=>{const copy=structuredClone(r);delete copy.condition.initiatorDomains;return copy;});
 await f.n.chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:legacy.map(r=>r.id),addRules:legacy});
 await f.n.sync(c);assert.ok(f.rules.every(r=>r.condition.initiatorDomains?.[0]==='site.example'));assert.equal(await f.n.source(1),'site.example');
});
