/**
 * Universalis publishes only a rolling window of dates on its free site —
 * roughly a week back to a week ahead — as a licensing compromise with the
 * copyright holders. Requests outside that window 302-redirect to
 * `/n-otherdates.htm` ("Other dates").
 *
 * `fetch` follows redirects, so an out-of-range request arrives as a perfectly
 * healthy 200 whose body happens to hold no readings. The parser then finds
 * nothing and the UI reported "Couldn't parse readings from the page" —
 * blaming the parser for what is really an upstream availability limit, and
 * leaving the user with no idea the readings simply aren't posted yet.
 *
 * So: confirm the page we ended up on is the one we asked for.
 */

export const READINGS_OUT_OF_RANGE =
  "Universalis publishes readings from about a week back to a week ahead. " +
  "This date isn't posted yet — check again closer to the day.";

/**
 * True when `finalUrl` (the URL after any redirects) is the readings page for
 * `yyyymmdd`. Compares path segments so a date is never matched by a mere
 * substring — /202608061/ must not satisfy a request for 20260806.
 */
export function isReadingsPageForDate(finalUrl: string, yyyymmdd: string): boolean {
  let pathname: string;
  try {
    pathname = new URL(finalUrl).pathname;
  } catch {
    // An unparseable URL is not the page we asked for. Callers treat this the
    // same as a redirect: report unavailability rather than parse garbage.
    return false;
  }
  return pathname.split('/').filter(Boolean)[0] === yyyymmdd;
}
