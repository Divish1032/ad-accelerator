// Rebuild packaged cosmetic rules from the complete, unmodified EasyList source.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.join(__dirname,'../filters');
const text=fs.readFileSync(path.join(dir,'easylist-source.txt'),'utf8');
const exceptions=new Set(text.split(/\r?\n/).filter(l=>l.includes('#@#')).map(l=>l.split('#@#')[1]));
const selectors=[...new Set(text.split(/\r?\n/).filter(l=>l.startsWith('##')).map(l=>l.slice(2)).filter(s=>
 !exceptions.has(s)&&s.length<400&&!/[{};\\\n]/.test(s)&&!s.includes(':')&&!s.includes('/*')&&!s.includes('url(')))];
fs.writeFileSync(path.join(dir,'cosmetic.json'),JSON.stringify(selectors));
const files=['ads.txt','threats.txt','popups.txt','easylist-source.txt'];
fs.writeFileSync(path.join(dir,'provenance.json'),JSON.stringify({builtAt:new Date().toISOString(),cosmeticSelectors:selectors.length,files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,file))).digest('hex')}))},null,2));
console.log({cosmeticSelectors:selectors.length});
