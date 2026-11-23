const base = new URL(self.registration.scope)
const shell = 'xv-invitados-v2:' + base.pathname
const resolve = value => new URL(value, base).href
self.addEventListener('install',event => event.waitUntil((async () => {
  const cache = await caches.open(shell)
  await cache.addAll([base.href,resolve('./icon.svg'),resolve('./manifest.webmanifest')])
  const html = await (await cache.match(base.href)).text()
  const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map(match => new URL(match[1],base))
    .filter(url => url.origin === base.origin && url.pathname.startsWith(base.pathname+'assets/'))
  await cache.addAll(assets.map(url => url.href))
  await self.skipWaiting()
})()))
self.addEventListener('activate',event => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch',event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return
  if (event.request.mode === 'navigate' && [base.pathname,base.pathname+'index.html'].includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(shell)
      try {
        const fresh = await fetch(event.request)
        if (fresh.ok) await cache.put(base.href,fresh.clone())
        return fresh
      } catch { return cache.match(base.href) }
    })())
  } else if (url.pathname.startsWith(base.pathname+'assets/') || ['icon.svg','manifest.webmanifest'].some(f => url.pathname===base.pathname+f)) {
    event.respondWith((async () => {
      const cache=await caches.open(shell)
      const hit=await cache.match(event.request)
      if (hit) return hit
      const response=await fetch(event.request)
      if(response.ok) await cache.put(event.request,response.clone())
      return response
    })())
  }
})
