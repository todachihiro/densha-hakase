const APP='densha-hakase-light-20261122-app';
const PHOTOS='densha-hakase-light-20261122-photos';
const base=self.registration.scope;
const appFiles=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'].map(x=>new URL(x,base).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(APP);await cache.addAll(appFiles.map(url=>new Request(url,{cache:'reload'})));await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys()){if(key.startsWith('densha-hakase-light-')&&key!==APP&&key!==PHOTOS)await caches.delete(key);}await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const req=event.request;const url=new URL(req.url);if(req.method!=='GET'||!req.url.startsWith(base)||url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  event.respondWith((async()=>{const cache=await caches.open(APP);const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),3000);
   try{const r=await fetch(req,{cache:'no-cache',signal:ctrl.signal});if(r.ok){await cache.put(new URL('index.html',base).href,r.clone());return r;}}catch{}finally{clearTimeout(timer);}
   return await cache.match(new URL('index.html',base).href)||Response.error();})());return;
 }
 if(req.url.startsWith(new URL('images/',base).href)){
  event.respondWith((async()=>{const cache=await caches.open(PHOTOS);const hit=await cache.match(req);if(hit)return hit;
   const res=await fetch(req);if(res.ok&&/^image\//i.test(res.headers.get('content-type')||'')){try{await cache.put(req,res.clone());}catch{}}return res;})());return;
 }
 if(appFiles.includes(req.url))event.respondWith((async()=>{const c=await caches.open(APP);return await c.match(req)||fetch(req);})());
});
