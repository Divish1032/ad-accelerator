const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
test('extension has no external messaging or web-accessible privileged pages',()=>{
 assert.equal(manifest.manifest_version,3);
 assert.equal(manifest.externally_connectable,undefined);assert.equal(manifest.web_accessible_resources,undefined);
 assert.deepEqual(manifest.permissions,['storage','alarms','declarativeNetRequest','webNavigation','scripting']);
 assert.deepEqual(manifest.optional_permissions,['privacy','contentSettings','browsingData']);
 const csp=manifest.content_security_policy.extension_pages;
 assert.match(csp,/script-src 'self';/);assert.match(csp,/object-src 'none';/);assert.match(csp,/connect-src 'self' https:\/\/raw\.githubusercontent\.com;/);
 assert.doesNotMatch(csp,/unsafe-eval|unsafe-inline|https:\/\/\*/);
});
test('extension HTML loads packaged scripts without inline handlers or remote scripts',()=>{
 for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){
  const text=fs.readFileSync(path.join(root,file),'utf8');
  assert.doesNotMatch(text,/<[^>]+\son[a-z]+\s*=/i,file);
  for(const match of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
   const src=match[1].match(/src="([^"]+)"/);assert.ok(src,file);assert.doesNotMatch(src[1],/^(?:https?:|data:|\/\/)/,file);assert.equal(match[2].trim(),'');
   assert.ok(fs.existsSync(path.join(root,src[1])),file);
  }
 }
});
test('bundled filter snapshots match the published provenance hashes',()=>{
 const base=path.join(root,'filters'),provenance=JSON.parse(fs.readFileSync(path.join(base,'provenance.json')));
 for(const {file,sha256}of provenance.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(base,file))).digest('hex'),sha256,file);
 assert.equal(JSON.parse(fs.readFileSync(path.join(base,'cosmetic.json'))).length,provenance.cosmeticSelectors);
});
