// Moved verbatim from the old ConcertPlannerEditorPage.tsx (line ~1648) so
// both the legacy editor and the new document hook/page can share it.
export function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'program';
}
