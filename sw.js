const CACHE='yaniv-v8-rounds-strategy';
const ASSETS=['./','index.html','styles.css','card-rules.js','cpu-strategy.js','turn-engine.js','turn-controller.js','assets/mediterranean-terrace.webp','assets/club-portraits.webp','manifest.json','icon-192.png','icon-180.png','icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>Promise.all(ASSETS.map(a=>c.add(a).catch(()=>{}))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

// Network-first (so updates arrive immediately), falling back to cache when offline.
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  const sameOrigin=url.origin===self.location.origin;
  const cacheable=sameOrigin||/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(url.host);
  if(!cacheable) return; // Supabase etc.: never touch
  e.respondWith(
    fetch(e.request).then(res=>{
      if(res&&(res.ok||res.type==='opaque')){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); }
      return res;
    }).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==='navigate'?caches.match('index.html'):Response.error())))
  );
});
