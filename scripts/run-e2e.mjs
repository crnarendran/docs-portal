#!/usr/bin/env node
// `npm run test:e2e`: run the Playwright suite inside the Firebase emulators.
// A wrapper (not an inline npm script) so the Functions emulator's code-load
// timeout can be raised portably: on a cold start right after a build it can
// exceed the 10 s default and the whole run aborts before a test starts.
import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'firebase emulators:exec --project demo-docs-portal --only auth,firestore,functions "playwright test"',
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT || '60' },
  }
);
process.exit(result.status ?? 1);
