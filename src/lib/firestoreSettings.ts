// Firestore settings for the browser SDK. Kept apart from firebase.ts so the
// rule below has a unit test (src/lib/firestoreSettings.test.mjs) that imports
// no Firebase code.
//
// Only the local emulator run (NEXT_PUBLIC_USE_EMULATORS === 'true', as set by
// `npm run test:e2e`) forces long-polling. In WebKit, the Web SDK's streaming
// WebChannel to the Firestore emulator fails first ("WebChannelConnection RPC
// 'Listen' stream ... transport errored", "Could not reach Cloud Firestore
// backend") and then reads/writes take seconds, which timed out six e2e tests
// (found 2026-10-26 from Playwright traces; with long-polling forced WebKit
// went from 18 to 24 passing). Every other path - including production and a
// plain `next dev` - keeps the SDK's default transport, so this is NOT a claim
// about Safari against real Firestore.
export function firestoreSettings(useEmulators: boolean): { experimentalForceLongPolling: true } | undefined {
  return useEmulators ? { experimentalForceLongPolling: true } : undefined;
}
