import { describe, expect, it } from 'vitest';
import { editableScorePath, replaceSourceTypeFromName } from '../scoreFile';

describe('replaceSourceTypeFromName', () => {
  it('maps MusicXML extensions', () => {
    expect(replaceSourceTypeFromName('fixed.mxl')).toBe('mxl');
    expect(replaceSourceTypeFromName('Fixed Score.XML')).toBe('musicxml');
    expect(replaceSourceTypeFromName('hip-hop-mass.musicxml')).toBe('musicxml');
  });

  it('rejects everything that is not an engraved MusicXML file', () => {
    expect(replaceSourceTypeFromName('scan.pdf')).toBeNull();
    expect(replaceSourceTypeFromName('take.mid')).toBeNull();
    expect(replaceSourceTypeFromName('notes.txt')).toBeNull();
    expect(replaceSourceTypeFromName('mxl')).toBeNull();
  });
});

describe('editableScorePath', () => {
  it('prefers the OMR-normalized mxl', () => {
    expect(editableScorePath({ normalized_mxl_path: 't/s/normalized.mxl', source_path: 'uploads/s/source.pdf' }))
      .toBe('t/s/normalized.mxl');
  });

  it('falls back to the uploaded source', () => {
    expect(editableScorePath({ normalized_mxl_path: null, source_path: 'uploads/s/source.mxl' }))
      .toBe('uploads/s/source.mxl');
  });
});
