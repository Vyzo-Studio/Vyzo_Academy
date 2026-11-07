/* Cache somente de arquivos públicos do simulador clássico.
 * NUNCA intercepta /academy, APIs ou navegações não index; evita servir a página
 * errada offline e substituir o shell pelo conteúdo de privacidade/termos.
 */
const CACHE='vyzo-academy-shell-v16-20261107';
const FILES=['./','./index.html','./manifest.webmanifest','./assets/vyzo-academy.svg'];
const BASE=new URL(self.registration.scope);
const ENTRY=new URL('index.html',BASE);
const isClassicEntry=url=>url.origin===BASE.origin&&
 (url.pathname===BASE.pathname||url.pathname===ENTRY.pathname);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(
 keys.filter(k=>(k.startsWith('enem-intelligence-shell-')||
  k.startsWith('vyzo-academy-shell-'))&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 if(e.request.method!=='GET'||url.origin!==self.location.origin)return;
 // Portal V8/V9, suas contas, arquivos e chamadas privadas não passam pelo cache.
 if(/\/academy(?:\/|$)/.test(url.pathname))return;
 if(e.request.mode==='navigate'){
  const entry=isClassicEntry(url);
  e.respondWith(fetch(e.request).then(response=>{
   if(entry&&response.ok){
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put('./index.html',copy)).catch(()=>{});
   }
   return response;
  }).catch(()=>entry?
   caches.match('./index.html').then(found=>found||Response.error()):
   Response.error()));
  return;
 }
 e.respondWith(caches.match(e.request).then(found=>found||fetch(e.request)));
});
