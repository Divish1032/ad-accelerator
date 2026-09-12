(function(root){
 'use strict';
 const TTL=86400000,MAX=100,MIN_GAP=30000,REQUIRED=3;
 const domain=h=>typeof h==='string'&&h.length<=253&&/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(h);
 function host(url){try{const u=new URL(url);return /^https?:$/.test(u.protocol)&&domain(u.hostname)?u.hostname:null;}catch{return null;}}
 function eligible(url){try{const u=new URL(url);return !!host(url)&&!u.username&&!u.password&&!/(?:login|signin|sign-in|oauth|authorize|saml|checkout|payment|billing|account|download)/i.test(u.hostname+u.pathname)&&![...u.searchParams.keys()].some(k=>/^(?:code|state|token|access_token|id_token|signature|sig|samlrequest|samlresponse|redirect_uri|x-amz-signature)$/i.test(k));}catch{return false;}}
 function state(raw={},now=Date.now()){
  raw=raw&&typeof raw==='object'?raw:{};
  const rows=Array.isArray(raw.rows)?raw.rows:[];
  return {enabled:raw.enabled!==false,rows:rows.filter(r=>r&&domain(r.source)&&domain(r.destination)&&r.source!==r.destination&&domain(r.endpoint)&&Number.isFinite(r.expires)&&r.expires>now&&r.expires<=now+TTL&&Number.isFinite(r.last)&&Number.isInteger(r.count)&&r.count>=1&&r.count<=REQUIRED).slice(-MAX).map(r=>({source:r.source,destination:r.destination,endpoint:r.endpoint,count:r.count,last:r.last,expires:r.expires})),ignored:(Array.isArray(raw.ignored)?raw.ignored:[]).filter(r=>r&&domain(r.source)&&domain(r.destination)&&r.expires>now&&r.expires<=now+TTL).slice(-MAX).map(r=>({source:r.source,destination:r.destination,expires:r.expires}))};
 }
 function observe(raw,source,destination,endpoint,now=Date.now()){
  const s=state(raw,now);
  if(!s.enabled||![source,destination,endpoint].every(domain)||source===destination||destination===endpoint||s.ignored.some(r=>r.source===source&&r.destination===destination))return s;
  let r=s.rows.find(r=>r.source===source&&r.destination===destination);
  if(r&&now-r.last<MIN_GAP)return s;
  if(!r){r={source,destination,endpoint,count:0,last:now,expires:now+TTL};s.rows.push(r);}
  r.count=Math.min(REQUIRED,r.count+1);r.last=now;r.endpoint=endpoint;
  // Expiry is fixed from first evidence: blocks cannot perpetuate themselves.
  s.rows=s.rows.slice(-MAX);return s;
 }
 function rules(raw,source,now=Date.now()){const s=state(raw,now);return s.enabled?s.rows.filter(r=>r.source===source&&r.count===REQUIRED):[];}
 function allow(raw,source,destination,now=Date.now()){const s=state(raw,now);s.rows=s.rows.filter(r=>r.source!==source||r.destination!==destination);s.ignored=[...s.ignored.filter(r=>r.source!==source||r.destination!==destination),{source,destination,expires:now+TTL}].slice(-MAX);return s;}
 function active(c,h,core){return c.enabled&&c.network&&c.popups&&core.enabledFor(c,h)&&!core.recovering(c,h,'network')&&!core.recovering(c,h,'popups');}
 const api={TTL,MAX,MIN_GAP,REQUIRED,host,eligible,state,observe,rules,allow,active};
 if(typeof module!=='undefined')module.exports=api;else root.AdaptiveCore=api;
})(typeof globalThis==='undefined'?this:globalThis);
