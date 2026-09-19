// DP-19: strip HTML comments before handing content to ReactMarkdown.
//
// react-markdown (without rehype-raw, which this app deliberately does not
// use) treats literal HTML syntax in the source as plain text and escapes it
// for display rather than dropping it — the right default for content this
// app doesn't fully trust. But several synced docs carry
// <!-- BEGIN/END GENERATED: ... --> markers written by tooling
// (scripts/locks.mjs and similar) that are meant purely as machine-readable
// regeneration boundaries, never for a reader — without this, they render as
// literal "<!-- END GENERATED: coordination_locks -->" text on the page.
// Stripping comments here is a narrow fix for that; enabling rehype-raw
// instead would start rendering ANY raw HTML in synced docs as real DOM, a
// much bigger surface change for what is a narrow, well-understood problem.
export function stripHtmlComments(content: string): string {
  return content.replace(/<!--[\s\S]*?-->/g, '');
}
