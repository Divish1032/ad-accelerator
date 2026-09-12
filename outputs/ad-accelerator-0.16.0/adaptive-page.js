'use strict';
const $=id=>document.getElementById(id),tabId=Number(new URLSearchParams(location.search).get('tab'));
let busy=false;
function lock(value){busy=value;for(const e of document.querySelectorAll('button,input'))e.disabled=value;}
async function request(type,extra={}){const r=await chrome.runtime.sendMessage({type,tabId,...extra});if(!r?.ok)throw Error(r?.error||'Could not read adaptive protection.');return r;}
function render(s){
 $('host').textContent=s.host;$('enabled').checked=s.enabled;
 $('status').textContent=s.active?'Automatic learning is on. No feedback is required.':s.enabled?'Learning and enforcement are paused on this page by protection settings or sensitive-page exclusions.':'Automatic learning is off.';
 $('counts').textContent=s.rows.length+' observations / rules on this website · '+s.total+' across all websites';
 $('rules').replaceChildren();
 for(const r of s.rows){const box=document.createElement('section'),label=document.createElement('p'),why=document.createElement('p'),button=document.createElement('button');
  label.textContent=r.destination+' — '+(r.count===3?(s.active?'Active rule':'Learned rule · paused'):r.count+'/3 observations');
  why.textContent='Popup chain reached '+r.endpoint+'. Expires '+new Date(r.expires).toLocaleString()+'.';
  button.textContent='Allow for 24 hours';button.className='secondary';button.addEventListener('click',()=>action('adaptive-allow',{destination:r.destination}));box.append(label,why,button);$('rules').append(box);
 }
 if(!s.rows.length)$('rules').textContent='Nothing learned yet. Normal browsing alone does not create rules.';
 $('ignored').textContent=s.ignored.length?s.ignored.length+' destination(s) temporarily excluded from learning.':'';
}
async function action(type='adaptive-status',extra={}){if(busy)return;lock(true);$('error').textContent='';try{render(await request(type,extra));}catch(e){$('error').textContent=e.message;try{render(await request('adaptive-status'));}catch{} }finally{lock(false);}}
$('enabled').addEventListener('change',()=>action('adaptive-toggle',{enabled:$('enabled').checked}));
$('clear').addEventListener('click',()=>action('adaptive-clear'));
$('refresh').addEventListener('click',()=>action());action();
