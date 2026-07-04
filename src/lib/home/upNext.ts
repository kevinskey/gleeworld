export interface FeedRowLike {
  section: string; title: string; detail: string | null; event_at: string;
}

const GRACE_MS = 30 * 60 * 1000;

export function selectUpNext(rows: FeedRowLike[], now: Date): FeedRowLike | null {
  const cutoff = now.getTime() - GRACE_MS;
  const upcoming = rows
    .filter((r) => r.section === 'schedule' && new Date(r.event_at).getTime() >= cutoff)
    .sort((a, b) => new Date(a.event_at).getTime() - new Date(b.event_at).getTime());
  return upcoming[0] ?? null;
}

export function fuseProgress(eventAt: Date, now: Date, windowMinutes = 120): number {
  const total = windowMinutes * 60 * 1000;
  const remaining = eventAt.getTime() - now.getTime();
  if (remaining >= total) return 1;
  if (remaining <= 0) return 0;
  return remaining / total;
}

export function greetingFor(hour: number, firstName: string): string {
  const part = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  return `${part}, ${firstName}`;
}
