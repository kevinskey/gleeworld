// The score file a director edits externally (MuseScore/Finale) and round-trips.
import type { PartTrackScore } from './types';

export type ReplaceSourceType = 'musicxml' | 'mxl';

export function replaceSourceTypeFromName(name: string): ReplaceSourceType | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.mxl')) return 'mxl';
  if (lower.endsWith('.xml') || lower.endsWith('.musicxml')) return 'musicxml';
  return null;
}

// OMR scores carry their recognized notation in normalized_mxl_path; direct
// MusicXML uploads only have the source. Either way this is the editable file.
export function editableScorePath(
  score: Pick<PartTrackScore, 'normalized_mxl_path' | 'source_path'>,
): string {
  return score.normalized_mxl_path ?? score.source_path;
}
