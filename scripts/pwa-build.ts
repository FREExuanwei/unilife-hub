import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'

export type Precache = { revision: string; urls: string[] }

export async function createPrecache(directory: string): Promise<Precache> {
  async function walk(relative = ''): Promise<string[]> {
    const entries = await readdir(resolve(directory, relative), { withFileTypes: true })
    const files = await Promise.all(entries.map(async entry => {
      const path = relative ? `${relative}/${entry.name}` : entry.name
      if (entry.isDirectory()) return entry.name.startsWith('.') ? [] : walk(path)
      return entry.isFile() && path !== 'sw.js' && !path.endsWith('.map') ? [path] : []
    }))
    return files.flat()
  }
  const files = (await walk()).sort()
  if (!files.includes('index.html')) throw new Error('PWA build requires index.html in the output directory.')
  const hash = createHash('sha256')
  for (const file of files) {
    hash.update(file)
    hash.update(await readFile(resolve(directory, file)))
  }
  return { revision: hash.digest('hex').slice(0, 20), urls: files.map(file => `/${file}`) }
}

export function generateWorker(precache: Precache): string {
  return `/* UniLife Hub: generated from every file in the production build. */
const CACHE_PREFIX = 'unilife-hub-shell-';
const CACHE_NAME = CACHE_PREFIX + ${JSON.stringify(precache.revision)};
const PRECACHE = ${JSON.stringify(precache.urls)};
const ASSETS = new Set(PRECACHE);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)));
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const previous = names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).pop();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME && name !== previous).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match('/index.html')) || fetch(request);
    })());
    return;
  }

  // Remote favicons, APIs, uploads and non-app files stay outside the app cache.
  // Retained hashed chunks support tabs still running the previous app version.
  if (!ASSETS.has(url.pathname) && !url.pathname.startsWith('/assets/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // These files are a fixed build, independent of transport Origin headers.
    // Vite preview adds Vary: Origin to module/CSS responses.
    const current = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
    if (current) return current;
    for (const name of await caches.keys()) {
      if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) {
        const prior = await (await caches.open(name)).match(request, { ignoreSearch: true, ignoreVary: true });
        if (prior) return prior;
      }
    }
    return fetch(request);
  })());
});
`
}

export function pwaBuildPlugin(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'unilife-offline-build',
    apply: 'build',
    enforce: 'post',
    configResolved(resolved) { config = resolved },
    async closeBundle() {
      const directory = resolve(config.root, config.build.outDir)
      const precache = await createPrecache(directory)
      await writeFile(resolve(directory, 'sw.js'), generateWorker(precache))
    },
  }
}
