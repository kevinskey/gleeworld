import { useState } from 'react';
import { band } from './ResultCard';

// One practiced take, as flattened from the activity log that SingFlow writes
// on every completed attempt. Kept deliberately small: the tab reads this shape
// today from localStorage, and a future server-backed source can produce the
// same shape so nothing downstream changes.
export interface Take {
  ts: number;
  overall: number;
  level?: number;
  musicKey?: string;
}

// Read + normalize the practice log. Tolerant of anything malformed (old
// entries, partial writes, quota-cleared storage) — a bad blob yields an empty
// history, never a throw.
export function readTakes(storageKey: string): Take[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter((e) => e && e.kind === 'practiced' && e.meta && typeof e.meta.overall === 'number')
      .map((e) => ({ ts: e.ts, overall: e.meta.overall, level: e.meta.level, musicKey: e.meta.key }));
  } catch {
    return [];
  }
}

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

// Practice history for the current device. Reads the same log SingFlow writes
// after each scored take. Empty until the first take — the empty state is the
// primary state, exactly as the rest of this page treats scoring data.
export function ProgressTab({ activityKey }: { activityKey: string }) {
  const [takes] = useState<Take[]>(() => readTakes(activityKey));

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

      <p className="px-1 text-xs text-slate-400">Saved on this device.</p>
    </div>
  );
}
