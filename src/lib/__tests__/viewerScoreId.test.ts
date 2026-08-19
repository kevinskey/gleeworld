import { describe, expect, it } from 'vitest';
import { toViewerScoreId, isPersonalScoreId, toTableId } from '../viewerScoreId';

const UUID = '278c6de5-89fd-48bc-ba39-597af180d7cd';

describe('viewer score ids', () => {
  it('leaves a library score id untouched', () => {
    expect(toViewerScoreId(UUID, false)).toBe(UUID);
    expect(isPersonalScoreId(UUID)).toBe(false);
    expect(toTableId(UUID)).toBe(UUID);
  });

  it('round-trips a personal score id', () => {
    const viewerId = toViewerScoreId(UUID, true);
    expect(viewerId).not.toBe(UUID);
    expect(isPersonalScoreId(viewerId)).toBe(true);
    expect(toTableId(viewerId)).toBe(UUID);
  });

  it('treats a missing id as not personal', () => {
    // The reader renders a landing state with no scoreId at all.
    expect(isPersonalScoreId(undefined)).toBe(false);
  });

  it('does not mistake a library uuid that merely contains the word personal', () => {
    // Guards against switching to `includes` — the marker is a prefix.
    const id = `abc-personal-${UUID}`;
    expect(isPersonalScoreId(id)).toBe(false);
    expect(toTableId(id)).toBe(id);
  });
});
