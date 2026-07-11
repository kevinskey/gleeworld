import { useEffect, useState } from 'react';
import { band } from './ResultCard';
import { type StudentProgress, fetchClassProgress } from '@/lib/sightReading/takesApi';

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-6 text-center shadow-sm">{children}</div>;
}

// Admin/teacher view: every student in the tenant with their sight-reading
// roll-up (takes / best / average / last practiced), most-recently-active first.
// Backed by the srt_admin_read RLS policy; gated to admins by the caller.
export function ClassProgressTab({
  load = fetchClassProgress,
}: {
  load?: () => Promise<StudentProgress[] | null>;
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [rows, setRows] = useState<StudentProgress[]>([]);

  useEffect(() => {
    let cancelled = false;
    load().then((r) => {
      if (cancelled) return;
      if (!r) {
        setStatus('error');
        return;
      }
      setRows(r);
      setStatus('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (status === 'loading') return <Card><p className="text-sm text-slate-600">Loading…</p></Card>;
  if (status === 'error') return <Card><p className="text-sm text-slate-600">Couldn’t load class progress.</p></Card>;
  if (rows.length === 0)
    return <Card><p className="text-sm text-slate-600">No student takes yet. They’ll appear here as your students practice.</p></Card>;

  return (
    <ul className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm">
      {rows.map((s) => (
        <li key={s.userId} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{s.name}</p>
            <p className="text-xs text-slate-500">
              {s.takes} {s.takes === 1 ? 'take' : 'takes'} · last {fmtDate(s.lastTs)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4 text-right">
            <div>
              <p className={`text-lg font-bold ${band(s.best)}`}>{s.best}</p>
              <p className="text-[11px] text-slate-500">Best</p>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-700">{s.avg}</p>
              <p className="text-[11px] text-slate-500">Avg</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
