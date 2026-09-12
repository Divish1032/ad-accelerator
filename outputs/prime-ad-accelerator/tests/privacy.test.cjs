const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../privacy-core.js'),ChromePrivacy=require('../privacy-chrome.js');
function setup(){
 const local={},session={},permissions=new Set(),rules=[],calls=[],locations=new Map();
 let cookie={value:true,levelOfControl:'controllable_by_this_extension'},tab={url:'https://shop.example.com/cart',incognito:false},failStorage=false,failLocation=false,failDelete=false;
 const setting={get:async()=>({...cookie}),set:async v=>{calls.push(['cookie-set',v]);cookie={value:v.value,levelOfControl:'controlled_by_this_extension'};},clear:async v=>{calls.push(['cookie-clear',v]);cookie={value:true,levelOfControl:'controllable_by_this_extension'};}};
 const api={permissions:{contains:async v=>v.permissions.every(p=>permissions.has(p))},privacy:{websites:{thirdPartyCookiesAllowed:setting}},contentSettings:{location:{get:async v=>({setting:locations.has(v.primaryUrl)&&v.primaryUrl===v.secondaryUrl?'block':'ask'}),clear:async()=>{calls.push(['location-clear']);locations.clear();},set:async v=>{if(failLocation){failLocation=false;throw Error('set failed');}if(v.secondaryPattern&&v.primaryPattern!==v.secondaryPattern)throw Error('Embedded patterns are not supported for this setting.');calls.push(['location-set',v]);locations.set(new URL(v.primaryPattern).origin,v.setting);}}},tabs:{get:async()=>({...tab})},storage:{local:{get:async k=>({[k]:structuredClone(local[k])}),set:async v=>{if(failStorage){failStorage=false;throw Error('storage failed');}Object.assign(local,structuredClone(v));}},session:{get:async k=>({[k]:structuredClone(session[k])}),set:async v=>Object.assign(session,structuredClone(v))}},declarativeNetRequest:{isRegexSupported:async()=>({isSupported:true}),getDynamicRules:async()=>structuredClone(rules),updateDynamicRules:async v=>{calls.push(['rules',v]);for(let i=rules.length-1;i>=0;i--)if(v.removeRuleIds.includes(rules[i].id))rules.splice(i,1);rules.push(...structuredClone(v.addRules));}},browsingData:{remove:async(...v)=>{calls.push(['remove',...v]);if(failDelete)throw Error('failed');}}};
 return {p:new ChromePrivacy(api,P,require('../filter-core.js')),api,local,session,permissions,rules,calls,locations,setCookie:v=>cookie=v,setTab:v=>tab=v,failStorage:()=>failStorage=true,failLocation:()=>failLocation=true,failDelete:()=>failDelete=true};
}
const protection={enabled:true,network:true};
test('privacy defaults do not alter browser settings or rewrite links',()=>{assert.deepEqual(P.config(),{blockCookies:null,cleanLinks:false,linkExceptions:[],locationOrigins:[]});assert.deepEqual(P.linkRules({},protection),[]);});
test('configuration rejects unsafe origins and wildcard exceptions',()=>{const p=P.config({locationOrigins:['https://a.test','https://u:p@a.test','file:///tmp','https://a.test/path'],linkExceptions:['*.a.test','a.test','<all_urls>']});assert.deepEqual(p.locationOrigins,['https://a.test']);assert.deepEqual(p.linkExceptions,['a.test']);});
test('link rules only rewrite GET page navigations and preserve list/strict priorities',()=>{
 const [r,guard]=P.linkRules({cleanLinks:true},protection);assert.equal(r.priority,2);assert.equal(guard.priority,3);assert.ok(guard.priority<5&&guard.priority<10);assert.deepEqual(r.condition.resourceTypes,['main_frame']);assert.deepEqual(r.condition.requestMethods,['get']);assert.deepEqual(r.action.redirect.transform.queryTransform.removeParams,P.PARAMETERS);
 const re=new RegExp(r.condition.regexFilter);assert.ok(re.test('https://example.com/?q=abc&utm_source=mail'));assert.ok(re.test('https://example.com/?fbclid=123'));assert.ok(!re.test('https://example.com/?ref=chapter'));assert.ok(!re.test('https://example.com/?q=utm_source'));assert.ok(!re.test('https://example.com/?UTM_SOURCE=x'));
});
test('signed and login guard covers sensitive parameters case-insensitively',()=>{const re=new RegExp(P.SIGNED,'i');for(const key of ['X-Amz-Signature','X-Goog-Credential','state','code','token','redirect_uri','SAMLResponse','signature'])assert.ok(re.test('https://a.test/?utm_source=x&'+key+'=secret'),key);assert.ok(!re.test('https://a.test/?utm_source=x&q=sig'));});
test('disabled network/global protection removes only owned cleanup rules',()=>{assert.deepEqual(P.linkRules({cleanLinks:true},{...protection,enabled:false}),[]);assert.deepEqual(P.linkRules({cleanLinks:true},{...protection,network:false}),[]);});
test('link exceptions cover source and destination without broad high-priority allow',()=>{const rules=P.linkRules({cleanLinks:true,linkExceptions:['example.com']},protection);assert.deepEqual(rules.find(r=>r.id===22).condition.requestDomains,['example.com']);assert.deepEqual(rules.find(r=>r.id===23).condition.topDomains,['example.com']);assert.ok(rules.every(r=>r.priority<5));});
test('optional capabilities unavailable until permission is granted',async()=>{const s=setup(),state=await s.p.status(1);assert.equal(state.cookies.available,false);assert.equal(state.location.available,false);assert.equal(state.cleanupAvailable,false);assert.deepEqual(s.calls,[]);});
test('cookie disable only clears our override and never forces allow',async()=>{const s=setup();s.permissions.add('privacy');await s.p.cookies(true);await s.p.cookies(false);assert.deepEqual(s.calls.map(x=>x[0]),['cookie-set','cookie-clear']);assert.equal(s.calls[0][1].value,false);});
test('managed cookie setting is accurately reported and cannot be overridden',async()=>{const s=setup();s.permissions.add('privacy');s.setCookie({value:false,levelOfControl:'controlled_by_other_extensions'});assert.equal((await s.p.cookieState()).blocked,true);await assert.rejects(s.p.cookies(true),/another extension/);assert.deepEqual(s.calls,[]);});
test('cookie setting is read back and rejected if Chrome ignores it',async()=>{const s=setup();s.permissions.add('privacy');s.api.privacy.websites.thirdPartyCookiesAllowed.set=async()=>{};await assert.rejects(s.p.cookies(true),/did not apply/);assert.ok(s.calls.some(x=>x[0]==='cookie-clear'));});
test('location restriction uses supported equal requesting and top-origin patterns',async()=>{const s=setup();s.permissions.add('contentSettings');await s.p.location('https://shop.example.com',true);assert.deepEqual(s.calls.find(x=>x[0]==='location-set')[1],{primaryPattern:'https://shop.example.com:443/*',secondaryPattern:'https://shop.example.com:443/*',setting:'block',scope:'regular'});await s.p.location('https://shop.example.com',false);assert.equal(s.locations.size,0);assert.deepEqual(s.local.privacyPreferences.locationOrigins,[]);});
test('location rules for other origins survive removal of one origin',async()=>{const s=setup();s.permissions.add('contentSettings');await s.p.location('https://one.example',true);await s.p.location('https://two.example',true);await s.p.location('https://one.example',false);assert.deepEqual([...s.locations.keys()],['https://two.example']);});
test('failed location persistence or application restores old restrictions',async()=>{for(const failure of ['failStorage','failLocation']){const s=setup();s.permissions.add('contentSettings');await s.p.location('https://one.example',true);s[failure]();await assert.rejects(s.p.location('https://two.example',true));assert.deepEqual([...s.locations.keys()],['https://one.example']);assert.deepEqual(s.local.privacyPreferences.locationOrigins,['https://one.example']);}});
test('link persistence failure restores previously installed cleanup rules',async()=>{const s=setup();await s.p.links({cleanLinks:true},protection);s.failStorage();await assert.rejects(s.p.links({cleanLinks:false},protection));assert.ok(s.rules.some(x=>x.id===20));assert.equal(s.local.privacyPreferences.cleanLinks,true);});
test('cleanup preview is non-destructive and reveals only origin',async()=>{const s=setup();const preview=await s.p.prepare(1);assert.equal(preview.origin,'https://shop.example.com');assert.ok(preview.token);assert.deepEqual(s.calls,[]);assert.ok(!JSON.stringify(s.session).includes('/cart'));});
test('cleanup requires permission, explicit selection and live confirmation',async()=>{const s=setup(),token=(await s.p.prepare(1)).token;await assert.rejects(s.p.cleanup({tabId:1,token,confirm:true,cookies:true,siteStorage:false}),/permission/);s.permissions.add('browsingData');await assert.rejects(s.p.cleanup({tabId:1,token,confirm:false,cookies:true,siteStorage:false}),/confirm/);await assert.rejects(s.p.cleanup({tabId:1,token,confirm:true,cookies:false,siteStorage:false}),/Choose/);assert.ok(!s.calls.some(x=>x[0]==='remove'));});
test('cleanup cannot follow a tab to another origin or run in incognito',async()=>{for(const tab of [{url:'https://other.test/'},{url:'https://shop.example.com/cart',incognito:true},{url:'chrome://settings'}]){const s=setup();s.permissions.add('browsingData');const token=(await s.p.prepare(1)).token;s.setTab(tab);await assert.rejects(s.p.cleanup({tabId:1,token,confirm:true,cookies:true,siteStorage:false}));assert.ok(!s.calls.some(x=>x[0]==='remove'));}});
test('cleanup is origin-bounded and never requests passwords/history/downloads',async()=>{const s=setup();s.permissions.add('browsingData');const token=(await s.p.prepare(1)).token;await s.p.cleanup({tabId:1,token,confirm:true,cookies:false,siteStorage:true});const call=s.calls.find(x=>x[0]==='remove');assert.deepEqual(call[1],{origins:['https://shop.example.com'],since:0,originTypes:{unprotectedWeb:true,protectedWeb:false,extension:false}});assert.deepEqual(call[2],{localStorage:true,indexedDB:true,cacheStorage:true,serviceWorkers:true});assert.equal(s.session.privacyCleanup[token],undefined);});
test('cookie-only cleanup stays explicit and cannot replay confirmation',async()=>{const s=setup();s.permissions.add('browsingData');const token=(await s.p.prepare(1)).token,m={tabId:1,token,confirm:true,cookies:true,siteStorage:false};await s.p.cleanup(m);assert.deepEqual(s.calls.find(x=>x[0]==='remove')[2],{cookies:true});await assert.rejects(s.p.cleanup(m),/expired/);});
test('expired confirmation and wrong tab are rejected',async()=>{const s=setup();s.permissions.add('browsingData');const token=(await s.p.prepare(1)).token;await assert.rejects(s.p.cleanup({tabId:2,token,confirm:true,cookies:true,siteStorage:false}),/expired/);s.session.privacyCleanup[token].until=0;await assert.rejects(s.p.cleanup({tabId:1,token,confirm:true,cookies:true,siteStorage:false}),/expired/);});
test('partial cleanup failure consumes token and reports irreversible partial outcome',async()=>{const s=setup();s.permissions.add('browsingData');const token=(await s.p.prepare(1)).token;s.failDelete();await assert.rejects(s.p.cleanup({tabId:1,token,confirm:true,cookies:true,siteStorage:false}),/Some selected data may already be removed/);assert.equal(s.session.privacyCleanup[token],undefined);});
test('cookie override can be cleared even while another extension takes precedence',async()=>{const s=setup();s.permissions.add('privacy');s.setCookie({value:false,levelOfControl:'controlled_by_other_extensions'});await s.p.cookies(false);assert.deepEqual(s.calls.map(x=>x[0]),['cookie-clear']);});
test('site pause removes only matching location restrictions and preserves saved choices',async()=>{
 const s=setup();s.permissions.add('contentSettings');
 await s.p.location('https://shop.example.com',true);await s.p.location('https://other.test',true);
 const before=structuredClone(s.local.privacyPreferences),c={enabled:true,disabledSites:[],pauses:{'example.com':Date.now()+600000}};
 await s.p.syncLocation(await s.p.preferences(),c);
 assert.deepEqual([...s.locations.keys()],['https://other.test']);assert.deepEqual(s.local.privacyPreferences,before);
 const status=await s.p.status(1,c);assert.equal(status.location.owned,true);assert.equal(status.location.active,false);assert.equal(status.location.setting,'ask');
 await s.p.syncLocation(await s.p.preferences(),{...c,pauses:{}});assert.equal(s.locations.size,2);
});
test('edits made during pause are saved without enforcing location until resume',async()=>{
 const s=setup();s.permissions.add('contentSettings');const c={enabled:false};
 await s.p.location('https://shop.example.com',true,c);assert.equal(s.locations.size,0);assert.equal(s.local.privacyPreferences.locationOrigins.length,1);
 await s.p.location('https://shop.example.com',false,c);await s.p.syncLocation(await s.p.preferences(),{enabled:true});assert.equal(s.locations.size,0);
});
test('cookie and location read failures do not disable unrelated privacy controls',async()=>{
 const s=setup();s.permissions.add('privacy');s.permissions.add('contentSettings');
 s.api.privacy.websites.thirdPartyCookiesAllowed.get=async()=>{throw Error('cookie unavailable');};
 s.api.contentSettings.location.get=async()=>{throw Error('location unavailable');};
 await s.p.links({cleanLinks:true},protection);const status=await s.p.status(1,protection);
 assert.equal(status.linksInstalled,true);assert.equal(status.preferences.cleanLinks,true);
 assert.match(status.cookies.error,/cookie unavailable/);assert.match(status.location.error,/location unavailable/);
});
test('revoked optional location permission does not block a full protection pause',async()=>{
 const s=setup();s.local.privacyPreferences={locationOrigins:['https://shop.example.com']};
 await s.p.syncLocation(await s.p.preferences(),{enabled:false});assert.equal(s.calls.length,0);
 await assert.rejects(s.p.location('https://shop.example.com',true),/permission/);
});
test('owned cookie preference migrates before pause, is released without force-allow, then restored',async()=>{
 const s=setup();s.permissions.add('privacy');s.setCookie({value:false,levelOfControl:'controlled_by_this_extension'});
 const saved=await s.p.migrateCookies();assert.equal(saved.blockCookies,true);
 await s.p.syncCookies(saved,{pauses:{'example.com':Date.now()+600000}});assert.equal((await s.p.cookieState()).owned,false);assert.equal(s.local.privacyPreferences.blockCookies,true);
 await s.p.syncCookies(saved,{pauses:{}});assert.equal((await s.p.cookieState()).owned,true);
 assert.ok(s.calls.filter(c=>c[0]==='cookie-set').every(c=>c[1].value===false));
});
test('migration never adopts another controller cookie restriction',async()=>{
 const s=setup();s.permissions.add('privacy');s.setCookie({value:false,levelOfControl:'controlled_by_other_extensions'});
 assert.equal((await s.p.migrateCookies()).blockCookies,false);assert.equal(s.calls.length,0);
});
test('cookie edits while suspended persist and off does not reactivate on resume',async()=>{
 const s=setup();s.permissions.add('privacy');const c={pauses:{'example.com':Date.now()+600000}};
 await s.p.cookies(true,c);assert.equal(s.local.privacyPreferences.blockCookies,true);assert.equal((await s.p.cookieState()).owned,false);
 await s.p.cookies(false,c);await s.p.syncCookies(await s.p.preferences(),{});assert.equal((await s.p.cookieState()).owned,false);
 assert.ok(!s.calls.some(c=>c[0]==='cookie-set'));
});
test('failed cookie preference save restores previous native restriction',async()=>{
 const s=setup();s.permissions.add('privacy');await s.p.cookies(true);s.failStorage();await assert.rejects(s.p.cookies(false),/storage/);
 assert.equal(s.local.privacyPreferences.blockCookies,true);assert.equal((await s.p.cookieState()).owned,true);
});
test('managed cookie restriction does not block resuming unrelated features',async()=>{
 const s=setup();s.permissions.add('privacy');s.local.privacyPreferences={blockCookies:true};s.setCookie({value:false,levelOfControl:'controlled_by_other_extensions'});
 await s.p.syncCookies(await s.p.preferences(),{});assert.equal(s.calls.length,0);assert.equal(s.local.privacyPreferences.blockCookies,true);
});
test('a revoked cookie permission can clear saved opt-in without requesting access',async()=>{
 const s=setup();s.local.privacyPreferences={blockCookies:true};await s.p.cookies(false,{});assert.equal(s.local.privacyPreferences.blockCookies,false);assert.equal(s.calls.length,0);
});
test('native regex rejection leaves rules and preference untouched before installation',async()=>{
 const s=setup();s.rules.push({id:100,action:{type:'block'}});const before=structuredClone(s.rules);
 s.api.declarativeNetRequest.isRegexSupported=async({regex})=>({isSupported:!regex.includes('signature'),reason:'memoryLimitExceeded'});
 await assert.rejects(s.p.links({cleanLinks:true},protection),/memoryLimitExceeded/);
 assert.deepEqual(s.rules,before);assert.equal(s.local.privacyPreferences,undefined);assert.equal(s.calls.length,0);
});
test('each installed signed guard protects its parameter including mixed case',()=>{
 const rules=P.linkRules({cleanLinks:true},protection),guards=rules.filter(r=>P.GUARD_IDS.includes(r.id));
 for(const key of ['sig','SIGNATURE','token','Access_Token','ID_TOKEN','code','STATE','redirect_uri','SAMLRequest','SAMLResponse','RelayState','X-Amz-Signature','X-Goog-Credential']){
  assert.ok(guards.some(r=>new RegExp(r.condition.regexFilter,'i').test('https://a.test/?utm_source=x&'+key+'=secret')),key);
 }
 assert.equal(new Set(rules.map(r=>r.id)).size,rules.length);
 assert.ok(!guards.some(r=>new RegExp(r.condition.regexFilter,'i').test('https://a.test/?utm_source=x&mytoken=abc')));
});
test('silently skipped native safeguard rolls back without saving or touching ad filters',async()=>{
 for(const legacy of [false,true]){
  const s=setup();s.rules.push({id:100,action:{type:'block'}});
  if(legacy)s.rules.push(P.linkRules({cleanLinks:true},protection)[0]);
  const update=s.api.declarativeNetRequest.updateDynamicRules;
  s.api.declarativeNetRequest.updateDynamicRules=async v=>update({...v,addRules:v.addRules.filter(r=>r.id!==24)});
  await assert.rejects(s.p.links({cleanLinks:true},protection),/did not install all/);
  assert.deepEqual(s.rules,[{id:100,action:{type:'block'}}]);assert.equal(s.local.privacyPreferences,undefined);
 }
});
test('failed link update restores a previously complete configuration',async()=>{
 const s=setup();await s.p.links({cleanLinks:true},protection);const before=structuredClone(s.rules);
 const update=s.api.declarativeNetRequest.updateDynamicRules;let first=true;
 s.api.declarativeNetRequest.updateDynamicRules=async v=>{await update({...v,addRules:first?v.addRules.filter(r=>r.id!==24):v.addRules});first=false;};
 await assert.rejects(s.p.links({linkExceptions:['example.com']},protection),/did not install all/);
 assert.deepEqual(s.rules,before);assert.deepEqual(s.local.privacyPreferences.linkExceptions,[]);
});
test('status does not claim partial cleanup protection is installed',async()=>{
 const s=setup();await s.p.links({cleanLinks:true},protection);s.rules.splice(s.rules.findIndex(r=>r.id===24),1);
 assert.equal((await s.p.status(1,protection)).linksInstalled,false);
});
test('location patterns retain exact scheme hostname and default or custom port',async()=>{
 const s=setup();s.permissions.add('contentSettings');
 for(const [o,pattern] of [['https://a.test','https://a.test:443/*'],['http://a.test','http://a.test:80/*'],['https://a.test:8443','https://a.test:8443/*']]){
  await s.p.location(o,true);const call=s.calls.filter(c=>c[0]==='location-set').at(-1)[1];
  assert.equal(call.primaryPattern,pattern);assert.equal(call.secondaryPattern,pattern);
 }
 assert.equal((await s.api.contentSettings.location.get({primaryUrl:'https://a.test',secondaryUrl:'https://other.test'})).setting,'ask');
});
