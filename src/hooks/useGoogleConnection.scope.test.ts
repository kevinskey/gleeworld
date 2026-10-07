import { describe, it, expect } from 'vitest';
import { hasCalendarScope, hasWriteScope } from './useGoogleConnection';

const YT = 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/youtube.readonly';
const CAL = 'openid https://www.googleapis.com/auth/calendar.events';

describe('Google connection scope checks', () => {
  it('a YouTube-only connection is not a calendar connection', () => {
    expect(hasCalendarScope(YT)).toBe(false);
    expect(hasWriteScope({ scope: YT } as never)).toBe(false);
  });

  it('calendar.events and legacy calendar.readonly both count as calendar', () => {
    expect(hasCalendarScope(CAL)).toBe(true);
    expect(hasCalendarScope('https://www.googleapis.com/auth/calendar.readonly')).toBe(true);
    expect(hasCalendarScope(`${YT} https://www.googleapis.com/auth/calendar.events`)).toBe(true);
  });

  it('handles a missing scope', () => {
    expect(hasCalendarScope(null)).toBe(false);
    expect(hasCalendarScope(undefined)).toBe(false);
  });
});
