# Phase 7 design

Extend the existing local React/Vite application without rebuilding it or deploying. Preserve all six previous stages. Add safe portable backups, native PWA, optional completion feedback, settings, production hardening and regression evidence.

## Data management

Backup envelope: appName `UniLife Hub`, backupVersion 1, schemaVersion 5, exportedAt ISO timestamp and explicitly whitelisted data: hub (semesters, courses including weeks, tasks, exams, study records, pomodoro settings), bookmarks/categories, theme preference and reminder settings. Derived statistics are reconstructed. Running timers, notices, caches, recovery journals and notification claims are excluded. Old hub versions 1–4 use existing migration; unknown future versions are rejected without writing.

Import validates JSON/size/envelope/each module and relationships, previews counts, then requires explicit overwrite confirmation. All writes share `unilife-hub:write`. Before writing, store a recovery journal containing only owned prior keys; restore on partial failure or interrupted transaction. Reset replaces owned data with clean empty valid snapshots, defaults and system theme, preserves unrelated localStorage, and requires a second dialog plus literal 清空. Import/reset stop an active timer with explicit warning. Providers resynchronize on `unilife:data-restored`.

Corrupt hub submodules show readable valid modules plus error, and prevent writing the damaged snapshot, preserving its raw contents. No silent destructive recovery. Global error boundary covers unexpected component crashes without exposing stack traces in production.

## PWA and reminders

Native generated production service worker precaches the full app shell including lazy routes, local icons and startup resources. Same-origin app assets only. Waiting worker activates only on explicit update action; caches may change but localStorage never does. Manifest standalone and icons conform to the current blue/purple branding. Install capability is detected with platform-specific instructions where native prompt is unavailable.

Completion persists study record/state first, then one completing writer produces feedback once per cycle. Web Audio initialized from user gesture, two short distinct cues, optional vibration capability detection and permission-gated notifications. Default sound/vibration on, system notification off. A global completion notice remains available independently of audio/permission/background restrictions. Imported notification choice never grants browser permission.

## UI, security and performance

Keep current visual tokens/layout; settings sections for semester, reminders, installation and data management. 44px touch targets, native scrollable dialogs, labeled inputs, Esc/focus behavior, reduced motion and safe bottom padding. Page-level lazy imports keep global timer/providers mounted. Strict HTTP(S) bookmark URLs, safe external rel, pure text rendering, no secrets. Netlify config only: build/publish/SPA fallback/CSP/security headers; no login, site creation or deploy.

## Verification

Native tests for validators/migrations/rollback/unknown versions/owned reset/feedback dedup/PWA output. Browser tests for export→reset→import including every module and settings, corrupt input/failed writes, audio/vibration/permission paths and two-tab dedup, actual production offline/restart/update, all routes at 360/375/390/430/768/1024/1280/1440/1920 with light/dark modes. Run existing regression suites, TypeScript, build and dependency audit. Record real-device limitations clearly.
