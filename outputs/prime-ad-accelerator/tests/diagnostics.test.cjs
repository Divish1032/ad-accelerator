const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../diagnostics.js'),'utf8');
async function run(testMatchOutcome,rules=[{id:100,action:{type:'block'},condition:{requestDomains:['ads.invalid']}}]){
 const elements={version:{},result:{},run:{addEventListener(_event,fn){this.run=fn;}}};
 vm.runInNewContext(source,{document:{getElementById:id=>elements[id]},chrome:{runtime:{getManifest:()=>({version:'0.11.0'})},declarativeNetRequest:{getDynamicRules:async()=>rules,...(testMatchOutcome?{testMatchOutcome}:{})}}});
 await elements.run.run();return elements;
}
test('store build reports installed rules without calling unavailable developer API',async()=>{const e=await run();assert.equal(e.version.textContent,'0.11.0');assert.match(e.result.textContent,/1 blocking rules installed/);assert.match(e.result.textContent,/does not verify live blocking/);assert.doesNotMatch(e.result.textContent,/PASS|FAIL/);});
test('developer API rejection preserves installed-rule readback',async()=>{const e=await run(async()=>{throw Error('Only available for unpacked extensions');});assert.match(e.result.textContent,/1 blocking rules installed/);assert.match(e.result.textContent,/Matching unavailable/);});
test('missing installed block rules is actionable and never shown as success',async()=>{const e=await run(null,[]);assert.match(e.result.textContent,/No blocking rules installed/);assert.doesNotMatch(e.result.textContent,/PASS/);});
