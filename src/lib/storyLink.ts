// DP-2: deterministic ?story=<id> deep links into a spec's table rows.
//
// A "story" is conventionally the first cell of a markdown table row in
// these specs — usually a bolded id like **DP-2**, sometimes a
// comma-separated list like "TE-5, TE-6, CB-4" (see
// docs-portal-defects.md, active_locks.md). Matching is whole-word so a
// link to "DP-2" doesn't also match "DP-20" or a sentence mentioning it in
// passing prose elsewhere in the row.
export function rowMatchesStoryId(rowText: string, storyId: string): boolean {
  if (!storyId) return false;
  const escaped = storyId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^A-Za-z0-9_-])${escaped}([^A-Za-z0-9_-]|$)`);
  return re.test(rowText);
}

// The DOM id given to a matched row, so the viewer can find and scroll to it
// without re-walking the render tree.
export function storyRowId(storyId: string): string {
  return `story-${encodeURIComponent(storyId)}`;
}

// Scrolls to and briefly highlights the ?story=<id> row, if a matching one
// was rendered. Does nothing — no scroll, no error — if the id doesn't
// match any row, per the deep link's "say nothing" requirement.
//
// Deliberately `behavior: 'instant'`, not 'smooth': this is the one place
// the feature has to be dependable rather than polished — "the anchor IS
// the feature" — and an animated scroll is one more thing that can be
// skipped, throttled, or interrupted (backgrounded tabs, reduced-motion
// settings, browser differences) for no visible benefit here. The CSS
// highlight below is what tells the reader something happened.
//
// Scrolls twice, once immediately and once again after a short delay: a
// single scrollIntoView computes its target against whatever height the
// document has at that instant, and content can still reflow shortly after
// mount (web fonts swapping in, embedded diagrams settling their size),
// which leaves that first call short of the real position. Re-affirming
// once corrects for that without needing to track every reflow source.
//
// Call from a useEffect gated on the content actually being rendered (not
// on mount alone); returns a cleanup function to cancel both timers.
export function scrollToAndHighlightStory(storyId: string): () => void {
  const el = document.getElementById(storyRowId(storyId));
  if (!el) return () => {};

  const scroll = () => el.scrollIntoView({ behavior: 'instant', block: 'center' });
  scroll();
  const settle = setTimeout(scroll, 400);

  el.classList.add('story-row-highlight');
  const unhighlight = setTimeout(() => el.classList.remove('story-row-highlight'), 2500);

  return () => {
    clearTimeout(settle);
    clearTimeout(unhighlight);
  };
}
