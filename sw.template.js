// 빌드 때 vite.config.ts의 serviceWorker()가 아래 두 값을 채워 sw.js로 내보낸다
self.__PRECACHE = []
self.__VERSION = ''

const CACHE = `cheotgeoreum-${self.__VERSION}`

// 대기 건너뛰기 없음: 새 SW는 열린 탭이 모두 닫힌 다음 열기에 적용된다
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(self.__PRECACHE)))
})

// 열린 탭을 가져오지 않음: 열린 탭이 옛 셸과 새 청크를 섞지 않게 한다
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('cheotgeoreum-') && k !== CACHE).map((k) => caches.delete(k))),
      ),
  )
})

// ponytail: 다른 origin(구글 폰트)은 캐시하지 않는다. 오프라인이면 sans-serif
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/_serverFn/')) return

  // SSR이 꺼져 있어 모든 경로의 셸이 같다. 오프라인이면 캐시된 '/'를 준다
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')))
    return
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return res
        }),
    ),
  )
})
