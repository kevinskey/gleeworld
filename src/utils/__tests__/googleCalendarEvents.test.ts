import { describe, it, expect } from 'vitest';
import { isGoogleSyncedEvent } from '../googleCalendarEvents';

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
