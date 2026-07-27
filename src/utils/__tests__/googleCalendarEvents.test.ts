import { describe, it, expect } from 'vitest';
import { isGoogleSyncedEvent, isSharedFromGoogle } from '../googleCalendarEvents';

describe('isGoogleSyncedEvent', () => {
  it('flags synthetic rows by source marker', () => {
    expect(isGoogleSyncedEvent({ id: 'abc', source: 'google' } as any)).toBe(true);
  });

  it('flags synthetic rows by gcal- id prefix even without the marker', () => {
    expect(isGoogleSyncedEvent({ id: 'gcal-7b5c3be0-4ee6-4f19-b80f-ce48ba4a0e35' } as any)).toBe(true);
  });

  it('does not flag real gw_events rows', () => {
    expect(isGoogleSyncedEvent({ id: '7d483bc1-4d3a-4ed6-87dd-6d431eaef2fc' } as any)).toBe(false);
    expect(isGoogleSyncedEvent({ id: '7d483bc1-4d3a-4ed6-87dd-6d431eaef2fc', source: 'appointment' } as any)).toBe(false);
  });

  it('handles null/undefined', () => {
    expect(isGoogleSyncedEvent(null)).toBe(false);
    expect(isGoogleSyncedEvent(undefined)).toBe(false);
  });
});

describe('isSharedFromGoogle', () => {
  it('returns true when external_source=google_calendar AND origin_user_id matches', () => {
    expect(isSharedFromGoogle({ external_source: 'google_calendar', origin_user_id: 'u1' } as any, 'u1')).toBe(true);
  });
  it('returns false for a different user_id', () => {
    expect(isSharedFromGoogle({ external_source: 'google_calendar', origin_user_id: 'u2' } as any, 'u1')).toBe(false);
  });
  it('returns false for non-google external_source', () => {
    expect(isSharedFromGoogle({ external_source: 'ical', origin_user_id: 'u1' } as any, 'u1')).toBe(false);
  });
  it('returns false for null/undefined event or user_id', () => {
    expect(isSharedFromGoogle(null, 'u1')).toBe(false);
    expect(isSharedFromGoogle({ external_source: 'google_calendar', origin_user_id: 'u1' } as any, null)).toBe(false);
  });
});
