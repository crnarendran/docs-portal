// Whether a doc is public — i.e. safe to bake into the static export where
// anyone can read it without signing in. Deliberately has NO server-only
// imports (no firebase-admin) so both the server (mdx.ts, page.tsx,
// layout.tsx) and client components (Sidebar.tsx) can share one definition.
//
// A doc is public ONLY on an explicit, deliberate opt-in: `public: true` in
// its frontmatter. Nothing is public by default.
//
// A legacy `requiresLogin: false` is NOT treated as an opt-in, even though
// the original design intended it that way: every repo's sync script
// (sanjeev-ai, swarm-ops, shuddhi-moolam, swarmkit) writes
// `requiresLogin: data.requiresLogin === true` into Firestore for every doc,
// which resolves to `false` whenever frontmatter omits the field entirely —
// so `false` cannot be told apart from "never set". Honoring it as an
// opt-in would make ~240 of ~334 docs public again, reproducing the exact
// breach this exists to close (see docs-portal-defects.md DP-10..13).
// Deciding which docs should be public is DP-13 — a human, content-visibility
// decision, not something to infer from that field.
export interface VisibilityMeta {
  public?: boolean;
}

export function isPublicDoc(meta: VisibilityMeta | null | undefined): boolean {
  return meta?.public === true;
}
