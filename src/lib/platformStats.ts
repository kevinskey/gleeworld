// The superadmin API's GET /stats returns a flat object whose shape is
// server-defined and may grow; render only scalar entries, like the
// static /superadmin/ console did.
export interface PlatformStat {
  label: string;
  value: string;
}

export function formatPlatformStats(raw: unknown): PlatformStat[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>)
    .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
    .map(([k, v]) => ({ label: k.replace(/_/g, ' '), value: String(v) }));
}
