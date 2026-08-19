import { describe, it, expect } from 'vitest';
import {
  resolvePageSetup, PAGE_DIMENSIONS, DEFAULT_MARGIN_IN, DEFAULT_PAGE_SIZE, PX_PER_IN,
} from './types';

describe('resolvePageSetup', () => {
  it('defaults to US Letter with 1in margins', () => {
    // Every document written before page setup existed has an empty (or
    // absent) paper_meta, and must keep rendering and exporting exactly as
    // it always did.
    expect(resolvePageSetup({})).toEqual({ pageSize: 'letter', marginIn: 1 });
    expect(resolvePageSetup(undefined)).toEqual({ pageSize: 'letter', marginIn: 1 });
    expect(resolvePageSetup(null)).toEqual({ pageSize: 'letter', marginIn: 1 });
  });

  it('keeps the old hardcoded 816px page width as the Letter default', () => {
    // The editor used to hardcode max-w-[816px]; that number was US Letter
    // at 96dpi. If this ever stops being true, existing docs silently reflow.
    expect(PAGE_DIMENSIONS[DEFAULT_PAGE_SIZE].width * PX_PER_IN).toBe(816);
    expect(DEFAULT_MARGIN_IN).toBe(1);
  });

  it('honours a stored size and margin', () => {
    expect(resolvePageSetup({ pageSize: 'a4', marginIn: 0.5 }))
      .toEqual({ pageSize: 'a4', marginIn: 0.5 });
  });

  it('clamps a margin that would leave no content column', () => {
    // paper_meta is free-form jsonb, so a bad value can arrive from an
    // older client or a hand edit. 8in margins on an 8.5in page is a blank
    // document.
    expect(resolvePageSetup({ marginIn: 8 }).marginIn).toBe(2);
    expect(resolvePageSetup({ marginIn: -3 }).marginIn).toBe(0.25);
  });

  it('falls back to Letter for an unknown page size', () => {
    expect(resolvePageSetup({ pageSize: 'legal' as never }).pageSize).toBe('letter');
  });

  it('ignores a non-numeric margin', () => {
    expect(resolvePageSetup({ marginIn: 'wide' as never }).marginIn).toBe(DEFAULT_MARGIN_IN);
  });
});
