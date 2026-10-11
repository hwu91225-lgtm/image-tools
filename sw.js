/* 图片处理工具 Service Worker
   离线缓存核心资源，让工具在断网时也能使用
   策略：核心资源 cache-first，其他 fetch 优先回退缓存
*/
const CACHE = 'img-tools-v3';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './robots.txt',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE).catch(()=>{}))
      .then(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // 只处理同源 GET
  if(req.method !== 'GET' || new URL(req.url).origin !== location.origin){
    return;
  }
  // 导航请求：网络优先，失败回退缓存（保证最新版本）
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put('./index.html', cp));
        return r;
      }).catch(()=> caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }
  // 其他资源：缓存优先
  e.respondWith(
    caches.match(req).then(cached => {
      if(cached) return cached;
      return fetch(req).then(r => {
        if(r && r.status === 200){
          const cp = r.clone();
          caches.open(CACHE).then(c => c.put(req, cp));
        }
        return r;
      }).catch(()=> cached);
    })
  );
});
