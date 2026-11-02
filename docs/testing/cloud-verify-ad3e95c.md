# Cloud verification of ad3e95c (DP-9, DP-20, DP-21) on Linux

Run 2026-10-18 by cloud-sa2 (Claude Code cloud session, Linux, Node v22.22.0).
Commit under test: `ad3e95c` ("fix: DP-20 - sign-in keeps the whole link"), the tip of `dev`.

## Result

| Browser | Passed | Failed | Skipped | Wall time |
|---|---|---|---|---|
| chromium | 21 | **1** | 0 | 1m50s (first run, incl. emulator start; Playwright reported 1.4m), 1m22s (second run; 1.1m) |
| firefox | not run | | | browser could not be installed (see below) |
| webkit | not run | | | browser could not be installed (see below) |

**Failing test (both Chromium runs, so deterministic):**

`[chromium] › tests/rbac-admin.spec.ts:234:7 › RBAC and Admin Screen E2E › Invite by Email - Pre-granted access applies on first sign-in`

First error line: `Error: expect(locator).toContainText(expected) failed` - locator
`getByTestId('project-selector')`, expected substring `"keystar"`, received `"sanjeev-ai"`
(timeout 10000ms, line 274 of the spec). The invited user's pre-granted project
(`keystar`) is not shown in the selector after first sign-in; only `sanjeev-ai` is.

All other 21 tests pass, including every DP-20 test (`dp20-sign-in-link.spec.ts`, 3),
every DP-21 test (`dp21-story-links.spec.ts`, 5), DP-7 (4), project-switcher (2),
docs (2) and the other 5 RBAC tests.

## What could not be run, and why

`npx playwright install --with-deps chromium firefox webkit` fails in this
environment: Playwright 1.61.1 wants Chromium build 1228 / Firefox / WebKit
from `cdn.playwright.dev`, and the session's egress policy answers
`403 request blocked: no rule or allowlist entry allows host "cdn.playwright.dev"`.
This is a policy denial and was not worked around. Only an older preinstalled
Chromium (build 1194, `/opt/pw-browsers/chromium-1194`) exists, so Firefox and
WebKit were NOT verified. Re-run them where the CDN is reachable.

## Deviations from "exactly as the repo defines it"

1. **Chromium binary:** a throwaway, untracked `playwright.sandbox.config.ts`
   (deleted afterwards, not in this PR) re-exported the repo config with only the
   `chromium` project and `launchOptions.executablePath` set to the preinstalled
   build 1194 (`--no-sandbox`). Tests, ports, web server and emulator settings are
   the repo's. A 1194-vs-1228 browser difference could in principle affect results.
2. **`firebase` CLI:** `npm run test:e2e` needs `firebase` on PATH and docs-portal
   does not depend on `firebase-tools`; I used v15.28.2 from another checkout
   (`/home/user/sanjeev-ai/node_modules/.bin`).
3. **Node:** v22.22.0 (functions `engines` says 20). The emulators and suite ran fine.

## Commands run

```
git clone --depth 1 https://github.com/crnarendran/docs-portal && git -C docs-portal fetch --depth=1 origin ad3e95c  # ad3e95c is only on dev
git checkout --detach ad3e95c
npm ci                      # root, ~53 s
(cd functions && npm ci)
npx playwright install --with-deps chromium firefox webkit   # FAILED: cdn.playwright.dev 403
export PATH=/home/user/sanjeev-ai/node_modules/.bin:$PATH     # firebase CLI
npm run test:e2e -- --config=playwright.sandbox.config.ts --reporter=list   # x2 (pretest builds functions)
# which runs: firebase emulators:exec --project demo-docs-portal --only auth,firestore,functions "playwright test --config=playwright.sandbox.config.ts --reporter=list"
```
