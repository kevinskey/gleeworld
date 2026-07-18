// date-fns v4's format() throws RangeError on an unparseable date rather
// than rendering "Invalid Date" (the v3 behavior). The up_next/today cards
// call format(new Date(row.event_at)) on rows drawn straight from
// v_command_center_feed, so one malformed row must not crash the whole
// dashboard. HouseHome filters with this before building DateCardContext.
export function hasParsableEventAt(eventAt: string): boolean {
  return !Number.isNaN(new Date(eventAt).getTime());
}
