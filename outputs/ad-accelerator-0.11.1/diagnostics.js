document.getElementById('version').textContent=chrome.runtime.getManifest().version;
document.getElementById('run').addEventListener('click',async()=>{
 const out=document.getElementById('result');out.textContent='Checking…';
 try{
   const rules=await chrome.declarativeNetRequest.getDynamicRules();
   const block=rules.find(r=>r.action.type==='block'),policy=rules.find(r=>r.id===1);
   if(!block)throw Error('No blocking rules installed. Open popup and update lists.');
   const installed=rules.filter(r=>r.action.type==='block').length+' blocking rules installed.';
   const fallback=installed+'\n\nChrome only offers simulated rule matching in unpacked developer builds. This installed-rule readback does not verify live blocking. Site pauses and exceptions may apply.';
   if(typeof chrome.declarativeNetRequest.testMatchOutcome!=='function'){out.textContent=fallback;return;}
   try{await chrome.declarativeNetRequest.testMatchOutcome({url:'https://extension-check.invalid/ordinary',type:'main_frame'});}
   catch(e){out.textContent=fallback+'\nMatching unavailable: '+e.message;return;}
   const url='https://'+block.condition.requestDomains[0]+'/extension-test';
   const lines=[];
   for(const type of ['main_frame','script','sub_frame','xmlhttprequest']){
     const r=await chrome.declarativeNetRequest.testMatchOutcome({url,type,topUrl:'https://extension-check.invalid/'});
     const paused=policy&&!policy.condition.topDomains;
     const expected=paused?1:block.id;
     const passed=r.matchedRules.some(x=>x.ruleId===expected);
     lines.push((passed?'PASS':'FAIL')+' '+type+' '+(paused?'global pause':'listed domain blocking'));
   }
   if(policy?.condition.topDomains){
     const r=await chrome.declarativeNetRequest.testMatchOutcome({url,type:'script',topUrl:'https://'+policy.condition.topDomains[0]+'/'});
     lines.push((r.matchedRules.some(x=>x.ruleId===1)?'PASS':'FAIL')+' site exception');
   }
   const clear=await chrome.declarativeNetRequest.testMatchOutcome({url:'https://extension-check.invalid/ordinary',type:'main_frame',topUrl:'https://extension-check.invalid/'});
   lines.push((clear.matchedRules.some(x=>x.ruleId>=100)?'FAIL':'PASS')+' unlisted destination');
   const sessions=await chrome.declarativeNetRequest.getSessionRules();
   const state=(await chrome.storage.session.get('strictTabs')).strictTabs||{};
   for(const [tabId,entry] of Object.entries(state).filter(([,e])=>sessions.some(r=>r.id===e.id)).slice(0,5)){
     const foreign=await chrome.declarativeNetRequest.testMatchOutcome({url:'https://strict-check.invalid/test',type:'main_frame',tabId:Number(tabId),initiator:'https://'+entry.host,topUrl:'https://'+entry.host+'/'});
     lines.push((foreign.matchedRules.some(r=>r.ruleId===entry.id)?'PASS':'FAIL')+' strict external navigation · '+entry.host);
     const own=await chrome.declarativeNetRequest.testMatchOutcome({url:'https://'+entry.host+'/test',type:'main_frame',tabId:Number(tabId),initiator:'https://'+entry.host,topUrl:'https://'+entry.host+'/'});
     lines.push((own.matchedRules.some(r=>r.ruleId===entry.id+1)?'PASS':'FAIL')+' strict same-host exception · '+entry.host);
     const typed=await chrome.declarativeNetRequest.testMatchOutcome({url:'https://strict-check.invalid/search?q=test',type:'main_frame',tabId:Number(tabId),topUrl:'https://'+entry.host+'/'});
     lines.push((typed.matchedRules.some(r=>r.ruleId===entry.id||r.ruleId===entry.id+1)?'FAIL':'PASS')+' address-bar navigation exempt from strict rules · '+entry.host);
   }
   lines.push(sessions.length+' strict session rules installed.');
   if(rules.some(r=>r.id===20)){
     for(const [label,testUrl,method,expected] of [
       ['tracking link cleanup','https://privacy-check.invalid/?utm_source=test&item=1','get',20],
       ['signed link preserved','https://privacy-check.invalid/?utm_source=test&signature=example','get',21],
       ['POST request preserved','https://privacy-check.invalid/?utm_source=test','post',null]
     ]){
       const match=await chrome.declarativeNetRequest.testMatchOutcome({url:testUrl,type:'main_frame',method,topUrl:'https://extension-check.invalid/'});
       const passed=expected?match.matchedRules.some(r=>r.ruleId===expected):!match.matchedRules.some(r=>r.ruleId===20);
       lines.push((passed?'PASS':'FAIL')+' '+label);
     }
   }else lines.push('INFO tracking-link cleanup is off or network filtering is paused.');
   out.textContent=lines.join('\n')+'\n\n'+rules.filter(r=>r.id>=100).length+' blocking rules installed. These checks do not prove all ads or threats are blocked.';
 }catch(e){out.textContent='Check unavailable: '+e.message;}
});
