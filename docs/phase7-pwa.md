# Phase 7 PWA

UniLife Hub is configured as a root-hosted, standalone PWA with the short name UniLife. Its manifest starts at `/` and includes 192px, 512px, maskable 512px and Apple 180px PNG icons. The dependency-free icon generator uses the existing blue-purple palette and a geometric UH mark; regenerate with `node scripts/generate-pwa-icons.mjs`.

## Integration

- `src/main.tsx`: import `initializePwa` from `./features/pwa/pwaRuntime` and call it once before `createRoot`. Initialization is idempotent. Native service-worker registration runs only when Vite's production flag is true.
- `src/layouts/Layout.tsx`: import default `PwaStatus` and render it after the header. It shows offline status, recoverable errors and a waiting update action. It does not interrupt navigation or edit dialogs.
- `src/pages/Settings.tsx`: import default `PwaSettings` and render it with the existing settings cards. It offers the browser installation prompt when available, menu installation instructions otherwise, and an update check.
- The feature components import their own `pwa.css`; no global stylesheet edit is required.

## Offline and update behavior

The Vite build plugin runs after output is written. It recursively hashes and precaches every built file, including all route chunks, CSS, HTML, manifest, theme bootstrap and icons. Source maps, hidden output directories and `sw.js` itself are excluded. A content change in an unhashed public file changes the shell cache revision. The build fails if its app shell is missing.

Installation awaits `cache.addAll`: a missing asset rejects installation rather than activating a partial offline application. The worker never calls `skipWaiting` during installation. Same-origin GET navigations use the current cached HTML shell, which keeps HTML and chunks in the same version. Cached assets resolve without a network connection. Requests for remote favicons, external sites, APIs and non-GET submissions bypass the worker's app cache. The already existing app storage continues to save and read local edits without a server.

Static asset cache lookup ignores search strings and `Vary` matching within the explicit own-asset list. This fixes production-preview responses with `Vary: Origin`: precaching uses classic fetch requests while browser module/CSS requests have different request headers. A native failing regression and real offline route checks verified the fix; remote requests still bypass the worker.

A new worker stays waiting until the user selects **刷新更新**, or browser lifecycle activation occurs after all old tabs are closed. The refresh action tells the waiting worker to activate, then reloads only the consenting tab on `controllerchange`. The banner asks users to save their open draft first. The PWA runtime does not read, write or clear localStorage or IndexedDB. Previously saved data is therefore preserved through PWA updates; unsaved component state ends with a refresh.

Activation retains the current and one prior UniLife shell cache, removes older caches with the UniLife prefix, and leaves other app caches untouched. Prior hashed chunks can still load in another open tab using the previous app. Tabs older than two builds should be refreshed. Cache fallback reads only UniLife caches.

Registration, update-check, installation-prompt and activation errors become visible UI feedback. Unsupported or restricted browser API access leaves the main application usable. Update activation has a 15-second timeout so a stalled worker does not leave its button disabled indefinitely.

## Installation and boundaries

Service workers require HTTPS or a browser-supported localhost secure context. PWA install UI varies by browser and device. Chromium can emit `beforeinstallprompt`; Safari on iPhone/iPad uses Share → Add to Home Screen. The app explains the available path without requesting notification, filesystem or other unrelated permissions.

The first successful online visit must finish preparing offline resources before offline reopening works. Browser storage quotas, eviction, private modes and clearing website data can remove caches or stored app data. The PWA does not make external bookmarked websites or their favicons available offline; existing fallback icons continue to work. Background synchronization and push notifications are outside this local PWA layer.

`npm run dev` never registers this worker. For a realistic local check, run `npm run build`, then `npm run preview` and use its localhost URL. `vite preview` is only local verification, and does not apply Netlify response headers. Do not alternate development and production preview on the same origin; a prior production worker remains associated with its origin until it is unregistered.

## Netlify configuration

`netlify.toml` specifies `npm run build` and `dist`. A non-forced status-200 SPA rewrite serves deep links while existing static files, the manifest and service worker retain their proper responses. Hashed `/assets/*` files receive an immutable cache header; HTML and unhashed public resources revalidate; `sw.js` uses no-store/no-cache. No deployment was performed.

The CSP permits only local scripts, workers and connections. The initial theme runs in a synchronous external script before application CSS and mounting, so dark preference and theme-color apply without inline script permission. Inline styles remain permitted for the existing chart width styles. External HTTP/HTTPS images remain permitted because saved bookmark favicons/custom icons can use arbitrary web origins. Permissions-Policy disables the unused camera, microphone, geolocation, payment and USB capabilities while leaving the app's requested reminder capabilities available.

## Verification

`node --test tests/pwa.test.mjs` executes the generated worker against real Request/Response objects with controlled browser/cache boundaries. It covers all built route chunk precaching, public-file revision changes, offline deep links, old-tab chunk fallback, excluded requests, atomic installation failure, cache cleanup boundaries, production-only registration, explicit update consent, install and connectivity events, update errors, browser API access denial, icon dimensions/opacity and initial theme under denied storage.

The final generated production worker passed 12 native tests and 8 real Edge browser groups: cache preparation, all seven offline routes/deep refreshes, offline task CRUD, actual persistent-profile browser restart, restrictive production CSP, waiting updates, one consenting tab refreshing with all stored data preserved, and old-tab lazy chunk access after activation. Installation metadata and runtime prompt handling were checked; native phone installation and standalone launch require real-device acceptance. See `phase7-verification.md`.

Browser acceptance checks for the integrated build:

1. Load a production preview online, wait for settings to report offline resources ready, then disconnect.
2. Open every route, including a route never opened online, refresh a deep link, and save a local record. Reconnect and verify the saved record remains.
3. Serve a changed second build at the same origin. Confirm the update notice appears and no automatic reload occurs while editing. Save, select refresh, and confirm data persists.
4. Keep a second tab open during the update and confirm it continues to work; its own reload is manual.
5. Check installation metadata and standalone launch on a supported browser/device, plus manual Safari instructions. Real-device installation was not verified by the Node tests.

Current documentation used: [Vite plugin API](https://vite.dev/guide/api-plugin), [Vite public assets](https://vite.dev/guide/assets#the-public-directory), [MDN service-worker lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API), [MDN skipWaiting](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting), [Netlify SPA rewrites](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/), and [Netlify file configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/), fetched with Context7.
