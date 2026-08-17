// The Viewer lists two different tables side by side:
//
//   gw_sheet_music      — the group library. Shared; everyone in the tenant
//                         sees it. Annotation and audio tables FK to this.
//   gw_personal_scores  — My Music. Private to its owner by RLS
//                         (uid() = user_id), and NOT tenant-scoped.
//
// Both have uuid primary keys, and the reader is reached by a single route
// (/dashboard/viewer/:scoreId), so an id alone cannot say which table to read.
// Personal ids are therefore prefixed on the way into the URL and unwrapped on
// the way out. Keeping that in one place stops the landing and the reader from
// disagreeing about what a bare uuid means.
//
// Annotations now route to gw_personal_score_annotations for personal ids
// (see useSheetMusicAnnotations), so drawing/saving works everywhere a score
// opens. Audio, bookmarks, jumps, page-order and layers stay tenant-only —
// those tables FK gw_sheet_music, so there is no row for a personal score to
// point at. Callers use isPersonalScoreId() to hide those affordances rather
// than offering markup that silently fails to save. Sharing a score to the
// library creates a real gw_sheet_music row and gets full support for all of
// the above.

const PERSONAL_PREFIX = 'personal:';

export function toViewerScoreId(id: string, isPersonal: boolean): string {
  return isPersonal ? `${PERSONAL_PREFIX}${id}` : id;
}

export function isPersonalScoreId(viewerId: string | undefined): boolean {
  return !!viewerId?.startsWith(PERSONAL_PREFIX);
}

/** The underlying table row id, with any prefix removed. */
export function toTableId(viewerId: string): string {
  return viewerId.startsWith(PERSONAL_PREFIX)
    ? viewerId.slice(PERSONAL_PREFIX.length)
    : viewerId;
}
