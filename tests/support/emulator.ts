// One project id for everything that talks to the local emulators: the
// emulator run (`--project`), the Admin SDK in the specs and seed, and the
// app under test (NEXT_PUBLIC_FIREBASE_PROJECT_ID / FIREBASE_PROJECT_ID, set
// in playwright.config.ts). Emulator data and auth users are namespaced per
// project, so they must all agree. The `demo-` prefix tells the Firebase CLI
// this never touches a real project.
export const EMULATOR_PROJECT = 'demo-docs-portal';

export function useEmulatorsForAdminSdk() {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
}
