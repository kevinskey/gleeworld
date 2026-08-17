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
// Personal scores persist annotations in gw_personal_score_annotations via
// annotationTarget(); audio and linked tables remain gw_sheet_music-only.

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

/** Which annotation table a viewer musicId writes to. Personal scores keep
 *  their markup in gw_personal_score_annotations (FK gw_personal_scores);
 *  everything else stays on gw_sheet_music_annotations. */
export function annotationTarget(musicId: string): {
  table: 'gw_sheet_music_annotations' | 'gw_personal_score_annotations';
  idColumn: 'sheet_music_id' | 'personal_score_id';
  rowId: string;
} {
  return isPersonalScoreId(musicId)
    ? { table: 'gw_personal_score_annotations', idColumn: 'personal_score_id', rowId: toTableId(musicId) }
    : { table: 'gw_sheet_music_annotations', idColumn: 'sheet_music_id', rowId: musicId };
}
