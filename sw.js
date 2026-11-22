/* でんしゃはかせ：iOSホーム画面からのオフライン起動を優先 */
const APP='densha-hakase-light-20261123-app';
const PHOTOS='densha-hakase-light-20261122-photos'; // 保存済み150枚は再利用する
const base=self.registration.scope;
const rootURL=new URL('./',base).href;
const indexURL=new URL('index.html',base).href;
const shellURLs=['index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png']
  .map(path=>new URL(path,base).href);

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(APP);
  // 一番大切なのは、起動ページを必ず先に保存すること。
  await cache.add(new Request(indexURL,{cache:'reload'}));
  // アイコンが一時的に取得できなくても、オフライン起動を妨げない。
  await Promise.allSettled(shellURLs.slice(1).map(url=>cache.add(new Request(url,{cache:'reload'}))));
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('densha-hakase-light-')&&key!==APP&&key!==PHOTOS)
    .map(key=>caches.delete(key)));
  await self.clients.claim();
})()));

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin||!url.href.startsWith(base))return;

  // iOSのホーム画面アプリでは / と /index.html で起動先が異なることがある。
  // いずれもネットワークを使わず、保存済みの index.html を最優先する。
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(APP);
      const hit=await cache.match(indexURL);
      if(hit)return hit;
      try{
        const response=await fetch(req);
        if(response.ok){await cache.put(indexURL,response.clone());}
        return response;
      }catch{return Response.error();}
    })());
    return;
  }
  if(url.pathname.startsWith(new URL('images/',base).pathname)){
    event.respondWith((async()=>{
      const cache=await caches.open(PHOTOS);
      const hit=await cache.match(req);
      if(hit)return hit;
      const response=await fetch(req);
      if(response.ok&&/^image\//i.test(response.headers.get('content-type')||'')){
        try{await cache.put(req,response.clone());}catch{}
      }
      return response;
    })());
    return;
  }
  if(shellURLs.includes(url.href)||url.href===rootURL){
    event.respondWith((async()=>{
      const cache=await caches.open(APP);
      const key=url.href===rootURL?indexURL:url.href;
      return await cache.match(key)||fetch(req);
    })());
  }
});
