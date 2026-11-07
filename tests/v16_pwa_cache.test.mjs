/** V16 PWA: simulation of service worker events; no public/student data transmitted. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,Script} from 'node:vm';

const ORIGIN='https://vyzo-studio.github.io';
const SCOPE=ORIGIN+'/Vyzo_Academy/';
const handlers={},saved=[],deleted=[],prefetched=[];
let offline=false,fetched=[];
const cachedIndex=new Response('OFFLINE-CLASSIC',{status:200});
const cache={
 addAll:async paths=>{prefetched.push(...paths);},
 put:async (key,response)=>{saved.push({key,text:await response.text()});}
};
const caches={
 open:async name=>{assert(name.includes('vyzo-academy-shell-v16'));return cache;},
 match:async key=>key==='./index.html'?cachedIndex:null,
 keys:async()=>['vyzo-academy-shell-v14-20261106','vyzo-academy-shell-v16-20261107','other-app-cache'],
 delete:async name=>{deleted.push(name);return true;}
};
const fakeFetch=async request=>{
 fetched.push(request.url);
 if(offline)throw new Error('offline');
 return new Response('LIVE:'+request.url,{status:200});
};
const self={
 location:{origin:ORIGIN},
 registration:{scope:SCOPE},
 addEventListener:(name,cb)=>handlers[name]=cb
};
const context=createContext({self,caches,fetch:fakeFetch,URL,Response,Promise});
new Script(readFileSync(new URL('../sw.js',import.meta.url),'utf8')).runInContext(context);
assert.equal(Object.keys(handlers).length,3);
const sleep=()=>new Promise(resolve=>setImmediate(resolve));
async function dispatch(url,mode='navigate',method='GET'){
 let answer=null;
 handlers.fetch({
  request:{url,method,mode},
  respondWith:promise=>{answer=Promise.resolve(promise);}
 });
 if(!answer)return null;
 const out=await answer;
 await sleep();
 return out;
}
let wait=null;
handlers.install({waitUntil:p=>wait=p});await wait;
assert(prefetched.includes('./index.html'));
assert(!prefetched.some(x=>x.includes('/academy')));
handlers.activate({waitUntil:p=>wait=p});await wait;
assert.deepEqual(deleted,['vyzo-academy-shell-v14-20261106']);

const privacy=await dispatch(SCOPE+'privacidade.html');
assert.equal(await privacy.text(),'LIVE:'+SCOPE+'privacidade.html');
assert.equal(saved.length,0,'A política de privacidade não pode sobrescrever o shell clássico.');
const terms=await dispatch(SCOPE+'termos.html');
assert.equal(await terms.text(),'LIVE:'+SCOPE+'termos.html');
assert.equal(saved.length,0,'Termos não devem substituir o shell.');
const entry=await dispatch(SCOPE+'index.html?classic=1');
assert.equal(await entry.text(),'LIVE:'+SCOPE+'index.html?classic=1');
assert.equal(saved.length,1);assert.equal(saved[0].key,'./index.html');
assert.equal(saved[0].text,'LIVE:'+SCOPE+'index.html?classic=1');
const dir=await dispatch(SCOPE);
assert.equal(dir.status,200);assert.equal(saved.length,2);
const before=fetched.length;
assert.equal(await dispatch(SCOPE+'academy/index.html'),null,'Cloud auth routes must bypass SW.');
assert.equal(await dispatch(SCOPE+'academy/v9.html'),null,'Local portal must bypass SW.');
assert.equal(await dispatch(ORIGIN+'/otherproject/index.html'),null,'Outside scope should not be intercepted.');

assert.equal(await dispatch('https://api.openai.com/v1/responses'),null);
assert.equal(await dispatch(SCOPE+'index.html','navigate','POST'),null);
assert.equal(fetched.length,before,'Unintercepted requests should be handled by the browser.');
offline=true;
const offlineClassic=await dispatch(SCOPE+'index.html');
assert.equal(await offlineClassic.text(),'OFFLINE-CLASSIC');
const offlinePrivacy=await dispatch(SCOPE+'privacidade.html');
assert.equal(offlinePrivacy.type,'error','Offline privacy route must fail closed, never mimic index.html.');
const offlineTerms=await dispatch(SCOPE+'termos.html');
assert.equal(offlineTerms.type,'error');
console.log('PASS V16 PWA: scope-aware classic caching, private/auth bypass, no unrelated HTML corruption, safe offline fallback.');
