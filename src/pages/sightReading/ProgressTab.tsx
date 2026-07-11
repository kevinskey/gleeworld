import { useEffect, useState } from 'react';
import { band } from './ResultCard';
import { type Take, readLocalTakes, fetchServerTakes } from '@/lib/sightReading/takesApi';

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-white p-4 text-center shadow-sm">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}

// Practice history. Shows the device-local log instantly, then swaps in the
// signed-in student's server history once it loads (so progress follows them
// across devices). Falls back to local if the server is unreachable or has no
// rows. Empty until the first take — the empty state is the primary state.
export function ProgressTab({
  activityKey,
  loadRemote = fetchServerTakes,
}: {
  activityKey: string;
  loadRemote?: () => Promise<Take[] | null>;
}) {
  const [takes, setTakes] = useState<Take[]>(() => readLocalTakes(activityKey));
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadRemote().then((remote) => {
      if (cancelled || !remote) return;      // null = couldn't load → keep local
      if (remote.length === 0) return;        // no synced takes yet → keep local (don't blank the stats)
      setTakes(remote);
      setSynced(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loadRemote]);

  if (takes.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-600">
          No takes yet. Sing your first line and your progress shows up here.
        </p>
      </div>
    );
  }

  const best = takes.reduce((m, t) => Math.max(m, t.overall), 0);
  const avg = Math.round(takes.reduce((s, t) => s + t.overall, 0) / takes.length);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Stat label="Takes" value={String(takes.length)} />
        <Stat label="Best" value={String(best)} />
        <Stat label="Average" value={String(avg)} />
      </div>

      <ul className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm">
        {takes.map((t, i) => (
          <li key={`${t.ts}-${i}`} className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-900">
                {t.musicKey ?? 'Practice'}
                {t.level != null ? ` · Level ${t.level}` : ''}
              </p>
              <p className="text-xs text-slate-500">{fmtDate(t.ts)}</p>
            </div>
            <span className={`text-lg font-bold ${band(t.overall)}`}>{t.overall}</span>
          </li>
        ))}
      </ul>

      <p className="px-1 text-xs text-slate-400">
        {synced ? 'Synced to your account.' : 'Saved on this device.'}
      </p>
    </div>
  );
}
