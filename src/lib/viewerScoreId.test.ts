import { describe, it, expect } from 'vitest';
import { annotationTarget, toViewerScoreId } from './viewerScoreId';

describe('annotationTarget', () => {
  it('routes tenant ids to gw_sheet_music_annotations', () => {
    expect(annotationTarget('abc-123')).toEqual({
      table: 'gw_sheet_music_annotations',
      idColumn: 'sheet_music_id',
      rowId: 'abc-123',
    });
  });
  it('routes personal viewer ids to gw_personal_score_annotations, stripped', () => {
    expect(annotationTarget(toViewerScoreId('abc-123', true))).toEqual({
      table: 'gw_personal_score_annotations',
      idColumn: 'personal_score_id',
      rowId: 'abc-123',
    });
  });
});
