# Phase 7 security and data safety review

Review date: 2026-10-04. Scope: application source, public assets, local storage parsing and persistence, bookmark links/icons, theme preferences, backup integration, and installed npm dependencies. This is a source and regression review, not an external penetration test.

## Findings and fixes

| Boundary | Finding | Resolution |
| --- | --- | --- |
| Bookmark storage | Stored objects carried arbitrary unknown fields into application state; persisted fields and list sizes had incomplete limits. | `parseBookmarkData` constructs only known fields, validates both reads and writes, normalizes web/icon URLs, and bounds storage and lists. Invalid data remains untouched and a visible error blocks saving. |
| Bookmark navigation and icons | Links already allowed HTTP(S) and excluded credentials/executable schemes, but control characters and backslash ambiguity were accepted. The icon helper trusted its caller. | URL validation rejects controls, direction overrides and backslashes. Icon lookup validates again and returns the default icon on unsafe input. External links retain `noopener noreferrer`; icon requests retain `no-referrer`. |
| Restore versus bookmark writes | CRUD and sample initialization wrote synchronously outside the shared hub lock. A queued action could overwrite a restore. | Both operations acquire `unilife-hub:write`, reread the latest snapshot, and reject stale bases. Open edit/delete dialogs also compare the original bookmark before modifying a restored item with the same ID. Forms await persistence and keep input on failure. |
| Recovery journal | A failed multi-key rollback may leave protected prior values in the journal. | Bookmark and theme writes check the shared pending-recovery guard and show an error instead of modifying protected values. Startup recovery runs before providers mount. |
| Theme preferences | Write failures were silently ignored; restored settings did not refresh the active tab's theme. | Safe reads expose an explicit error result. Theme writes share the hub lock, reject stale preferences, and report persistence errors. Native storage and `unilife:data-restored` events resync state. |
| Backup data | Arbitrary imported properties must not enter exported user data. | Bookmark parsing is shared with backup validation. The hub parsers also project known fields for courses, tasks, exams, studies and timer data. Runtime timer/cue state is excluded from portable backups. |
| Unused component | `PlaceholderPage.tsx` had no imports or route usage. | Removed the unused component. The 404 page still uses its own layout classes. |

Bookmark limits are 1,000 websites and 100 combined default/custom categories. Fields are bounded to ID 128, name 80, category 24, note 500, URL/icon 2,048 and timestamp 40 characters. Raw bookmark storage is bounded to 8 MiB. Custom category names are preserved, except the two reserved selector values `__all__` and `__new__`. Notes permit normal multiline text; React renders user content as text.

## Source audit observations

- No `dangerouslySetInnerHTML`, HTML assignment, `document.write`, `eval`, or dynamic `Function` sink was found in application source or public assets.
- User-controlled external navigation is confined to validated bookmark HTTP(S) links. Local form-error anchors and route links do not navigate to imported destinations.
- No matching embedded private-key, npm/GitHub/cloud credential, or API-secret assignment was found in the reviewed source/config paths. Scanning reported filenames only and did not print possible secret values.
- No application telemetry or arbitrary network client was found. Browser integration uses optional PWA, notification and audio APIs; bookmark icons load from the chosen website/image origin.
- Local user data and portable JSON backups are not encrypted. Anyone with access to the browser profile or exported file can read them. Unknown fields are omitted rather than carrying unrelated properties into a backup.

## Dependency checks

`npm.cmd audit --json --cache .npm-cache` completed against the npm registry with exit code 0: **0 known vulnerabilities** (0 info, low, moderate, high or critical). The report covered 125 dependencies as counted by npm. `npm.cmd ls --all --json` completed with exit code 0 and no dependency problems; its tree is saved under `.verification/phase7-npm-ls.json`. No package or lockfile changes or forced upgrades were made for this audit.

Command semantics were checked against current [npm audit documentation](https://github.com/npm/cli/blob/latest/docs/lib/content/commands/npm-audit.md) using Context7. These results describe the installed dependency snapshot and the registry advisories available at review time.

## Verification

Regression tests were run red before the fixes, then green. They cover unsafe URLs/icons, unknown-field projection, field/list limits, failed writes, a restore queued ahead of bookmark save/initialization, theme restore races, and pending-recovery write protection.

At this review checkpoint, `npm.cmd test` passed all **116 tests**, and `npm.cmd run typecheck` passed. The Phase 7 integration verification report records the final production build and browser checks separately.
