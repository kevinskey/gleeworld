// Client-generated ids for seating-chart rows. These ids are persisted into
// uuid columns, so they MUST be real UUIDs — prefixed strings like "obj_123"
// make Postgres reject the whole insert and the chart silently loses data.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function newDbId(): string {
  return crypto.randomUUID();
}

export function isUuid(value: string | null | undefined): boolean {
  return !!value && UUID_RE.test(value);
}
