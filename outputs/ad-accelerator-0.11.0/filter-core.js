(function(root){
  'use strict';
  const SOURCES = [
    {key:'ads',name:'HaGeZi Multi Light',file:'light-onlydomains.txt'},
    {key:'threats',name:'HaGeZi Threat Intelligence Mini',file:'tif.mini-onlydomains.txt'},
    {key:'popups',name:'HaGeZi Popup Ads',file:'popupads-onlydomains.txt'}
  ].map(s=>({...s,url:'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/'+s.file}));
  const RESOURCE_TYPES=['main_frame','sub_frame','stylesheet','script','image','font','object','xmlhttprequest','ping','csp_report','media','websocket','webtransport','webbundle','other'];
  const DEFAULTS={enabled:true,cosmetics:true,autoUpdate:true,network:true,popups:true,disabledSites:[],pauses:{}};
  function host(value){try{const u=new URL(value);return /^(http|https):$/.test(u.protocol)?u.hostname.toLowerCase().replace(/\.$/,''):null;}catch{return null;}}
  function domain(s){return typeof s==='string' && s.length<=253 && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/.test(s);}
  function siteHost(s){return domain(s)||s==='localhost'||typeof s==='string'&&/^\d+\.\d+\.\d+\.\d+$/.test(s)&&s.split('.').every(n=>Number(n)<=255);}
  function recovery(saved={}){return Object.fromEntries(Object.entries(saved||{}).filter(([h])=>siteHost(h)).slice(0,100).map(([h,v])=>[h,Object.fromEntries(Object.entries(v||{}).filter(([k,t])=>["network","cosmetics","popups","video","custom","strict"].includes(k)&&Number.isFinite(t)&&t>Date.now()))]).filter(([,v])=>Object.keys(v).length));}
  function recovering(c,h,feature){return !!h&&Object.entries(c.recovery||{}).some(([d,v])=>(h===d||h.endsWith("."+d))&&v[feature]>Date.now());}
 function strictSites(raw){return Object.fromEntries(Object.entries(raw||{}).filter(([h,v])=>domain(h)&&Array.isArray(v)).slice(0,50).map(([h,v])=>[h,[...new Set(v.filter(d=>domain(d)))].slice(0,20)]));}
  function config(saved={}){return {strict:strictSites(saved.strict),recovery:recovery(saved.recovery),enabled:saved.enabled!==false,cosmetics:saved.cosmetics!==false,autoUpdate:saved.autoUpdate!==false,network:saved.network!==false,popups:saved.popups!==false,pauses:Object.fromEntries(Object.entries(saved.pauses||{}).filter(([h,t])=>siteHost(h)&&Number.isFinite(t)&&t>Date.now()).slice(0,100)),disabledSites:[...new Set((Array.isArray(saved.disabledSites)?saved.disabledSites:[]).filter(siteHost))].slice(0,100)};}
  function enabledFor(c,h){return !!h&&c.enabled&&![...c.disabledSites,...Object.keys(c.pauses||{})].some(d=>h===d||h.endsWith('.'+d));}
  function parse(text){
    if(typeof text!=='string'||text.length>25000000)throw Error('Filter download too large');
    const list=[];
    for(const line of text.split(/\r?\n/)){const d=line.trim().toLowerCase();if(!d||d.startsWith('#'))continue;if(!domain(d))throw Error('Unexpected filter format');list.push(d);}
    const domains=[...new Set(list)].sort();
    const declared=text.match(/^# Number of entries: (\d+)$/m);
    if(declared&&Number(declared[1])!==domains.length)throw Error('Incomplete filter download');
    if(domains.length<1000||domains.length>600000)throw Error('Unexpected filter size');
    return domains;
  }
  function compile(groups){
    const all=[...new Set(groups.flat())].sort();const rules=[];
    for(let i=0;i<all.length;i+=500)rules.push({id:100+i/500,priority:10,action:{type:'block'},condition:{requestDomains:all.slice(i,i+500),resourceTypes:[...RESOURCE_TYPES]}});
    if(rules.length>5000)throw Error('Filter rule budget exceeded');
    return rules;
  }
  function policy(c){
    const exceptions=[...new Set([...c.disabledSites,...Object.keys(c.pauses||{}),...Object.keys(c.recovery||{}).filter(h=>recovering(c,h,"network"))])];
    if(c.enabled&&c.network!==false&&!exceptions.length)return [];
    return [{id:1,priority:100,action:{type:'allow'},condition:{resourceTypes:[...RESOURCE_TYPES],...(c.enabled&&c.network!==false?{topDomains:exceptions}:{})}}];
  }
  const api={RESOURCE_TYPES,SOURCES,DEFAULTS,host,domain,config,recovering,enabledFor,parse,compile,policy};
  if(typeof module!=='undefined')module.exports=api;else root.FilterCore=api;
})(typeof globalThis==='undefined'?this:globalThis);
