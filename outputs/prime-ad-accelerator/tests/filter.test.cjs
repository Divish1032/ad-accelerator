const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const F=require('../filter-core.js'),base=path.join(__dirname,'../filters');
test('invalid stored configuration falls back to the normal default policy',()=>{
 for(const raw of [null,42,'invalid',[],false])assert.deepEqual(F.config(raw),F.config());
});
test('full packaged lists parse and compile within dynamic rule budget',()=>{
 const groups=F.SOURCES.map(s=>F.parse(fs.readFileSync(path.join(base,s.key+'.txt'),'utf8')));
 const r=F.compile(groups);assert.ok(r.length>100&&r.length<5000);assert.equal(new Set(r.map(x=>x.id)).size,r.length);
 assert.ok(r.every(x=>x.condition.requestDomains.length<=500&&x.condition.resourceTypes.includes('main_frame')&&!('excludedResourceTypes' in x.condition)));
 assert.equal(new Set(groups.flat()).size,r.reduce((n,x)=>n+x.condition.requestDomains.length,0));
});
test('reject malformed, empty and remotely injected rule syntax',()=>{
 for(const t of ['', '<html>Error</html>','com','||example.com^','example.com\n@@||allowed.com^'])assert.throws(()=>F.parse(t));
 assert.equal(F.domain('x.example.com'),true);assert.equal(F.domain('com'),false);assert.equal(F.domain('example.com/path'),false);
});
test('exceptions match host boundaries and include subdomains only',()=>{
 const c=F.config({disabledSites:['example.com']});assert.equal(F.enabledFor(c,'video.example.com'),false);assert.equal(F.enabledFor(c,'example.com.attacker.test'),true);assert.equal(F.enabledFor(c,'notexample.com'),true);
 const [rule]=F.policy(c);assert.equal(rule.action.type,'allow');assert.deepEqual(rule.condition.topDomains,['example.com']);assert.equal(rule.priority,100);
});
test('global pause emits allow rule for all resource types; default emits none',()=>{
 assert.deepEqual(F.policy(F.config()),[]);const [r]=F.policy(F.config({enabled:false}));assert.deepEqual(r.condition,{resourceTypes:F.RESOURCE_TYPES});
 assert.equal(F.enabledFor(F.config({enabled:false}),'example.com'),false);
});
test('player compatibility allows only site-scoped ad-stack subresources',()=>{
 const [r,wetv]=F.compatibility();
 assert.equal(r.id,90);assert.equal(r.priority,20);assert.equal(r.action.type,'allow');
 assert.deepEqual(r.condition,{requestDomains:['g.doubleclick.net','pagead2.googlesyndication.com'],topDomains:['watch.plex.tv'],resourceTypes:F.RESOURCE_TYPES.filter(type=>type!=='main_frame')});
 assert.ok(!r.condition.resourceTypes.includes('main_frame'));assert.ok(r.condition.resourceTypes.includes('script'));assert.ok(r.condition.resourceTypes.includes('ping'));
 assert.equal(wetv.id,91);assert.equal(wetv.priority,20);assert.equal(wetv.action.type,'allow');
 assert.deepEqual(wetv.condition,{requestDomains:['g.doubleclick.net','pagead2.googlesyndication.com'],topDomains:['wetv.vip'],resourceTypes:F.RESOURCE_TYPES.filter(type=>type!=='main_frame')});
 assert.ok(F.compatibility().every(rule=>!rule.condition.resourceTypes.includes('main_frame')));
});
test('host parsing excludes internal pages and handles ports',()=>{assert.equal(F.host('chrome://extensions'),null);assert.equal(F.host('https://example.com:8443/a'),'example.com');});
test('cosmetic compilation excludes exceptions and executable or advanced selectors',()=>{
 const selectors=JSON.parse(fs.readFileSync(path.join(base,'cosmetic.json')));assert.ok(selectors.length>1000);
 assert.ok(selectors.every(s=>!/[{};\\\n]/.test(s)&&!s.includes(':')&&!s.includes('url(')));
 const source=fs.readFileSync(path.join(base,'easylist-source.txt'),'utf8');const except=new Set(source.split(/\r?\n/).filter(l=>l.includes('#@#')).map(l=>l.split('#@#')[1]));assert.ok(selectors.every(s=>!except.has(s)));
});
test('truncated downloads with valid domains are rejected against source count',()=>{const source=fs.readFileSync(path.join(base,'ads.txt'),'utf8');assert.throws(()=>F.parse(source.split('\n').slice(0,-100).join('\n')),/Incomplete/);});
