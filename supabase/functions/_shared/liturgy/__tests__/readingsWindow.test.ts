import { describe, it, expect } from 'vitest';
import { isReadingsPageForDate, READINGS_OUT_OF_RANGE } from '../readingsWindow';

// Universalis only publishes a rolling window of dates on the free site.
// Outside it, /{yyyymmdd}/mass.htm 302s to /n-otherdates.htm. fetch follows
// redirects, so the response is a 200 holding an unparseable page — which
// used to surface as "Couldn't parse readings", blaming the parser for what
// is actually a licensing limit.
describe('isReadingsPageForDate', () => {
  it('accepts the readings page for the requested date', () => {
    expect(
      isReadingsPageForDate('https://universalis.com/20260806/mass.htm', '20260806'),
    ).toBe(true);
  });

  it('rejects the "Other dates" page Universalis redirects to', () => {
    expect(
      isReadingsPageForDate('https://universalis.com/n-otherdates.htm', '20260816'),
    ).toBe(false);
  });

  it('rejects a redirect to the undated mass page', () => {
    expect(
      isReadingsPageForDate('https://universalis.com/mass.htm', '20260816'),
    ).toBe(false);
  });

  it('does not accept a different date that merely shares a prefix', () => {
    expect(
      isReadingsPageForDate('https://universalis.com/202608061/mass.htm', '20260806'),
    ).toBe(false);
  });

  it('does not accept a neighbouring date', () => {
    expect(
      isReadingsPageForDate('https://universalis.com/20260807/mass.htm', '20260806'),
    ).toBe(false);
  });

  it('tolerates a query string', () => {
    expect(
      isReadingsPageForDate('https://universalis.com/20260806/mass.htm?utm=x', '20260806'),
    ).toBe(true);
  });

  it('treats an unparseable URL as not-our-page rather than throwing', () => {
    expect(isReadingsPageForDate('not a url', '20260806')).toBe(false);
  });

  it('explains the limit without blaming the parser', () => {
    expect(READINGS_OUT_OF_RANGE).toMatch(/Universalis/);
    expect(READINGS_OUT_OF_RANGE).not.toMatch(/pars/i);
  });
});
