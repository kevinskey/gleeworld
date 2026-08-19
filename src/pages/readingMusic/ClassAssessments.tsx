import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { listAssessmentAttempts, overrideAttempt } from '@/lib/readingMusic/attemptsApi';
import type { AssessmentRow } from '@/lib/readingMusic/attemptsApi';

// Minimal Phase 2 teacher surface: tenant-wide assessment attempts with a
// one-click override. Roster heatmap / assign flow arrive in Phase 3.
export function ClassAssessments() {
  const [rows, setRows] = useState<AssessmentRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [newScore, setNewScore] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listAssessmentAttempts();
    setRows(data);
    const ids = Array.from(new Set(data.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name')
        .in('user_id', ids);
      const map: Record<string, string> = {};
      for (const p of (profiles ?? []) as Array<{ user_id: string; full_name: string | null }>) {
        map[p.user_id] = p.full_name ?? '';
      }
      setNames(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submitOverride = async (id: string) => {
    const score = Number(newScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) return;
    if (await overrideAttempt(id, score)) {
      setEditing(null);
      setNewScore('');
      void load();
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Assessment attempts</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">No assessment attempts yet. Students record them from the Rhythm tab.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-3 font-medium">Student</th>
                  <th className="py-2 pr-3 font-medium">Drill</th>
                  <th className="py-2 pr-3 font-medium">Level</th>
                  <th className="py-2 pr-3 font-medium">Score</th>
                  <th className="py-2 pr-3 font-medium">Input</th>
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3">{names[r.user_id] || r.user_id.slice(0, 8)}</td>
                    <td className="py-2 pr-3 capitalize">{r.drill.replace('_', ' ')}</td>
                    <td className="py-2 pr-3">{r.level}</td>
                    <td className="py-2 pr-3">
                      {r.override_score !== null ? (
                        <>
                          <span className="text-slate-400 line-through">{r.score}</span>{' '}
                          <span className="font-medium">{r.override_score}</span>
                        </>
                      ) : (
                        <span className="font-medium">{r.score}</span>
                      )}
                      {r.payload?.no_input && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">no input detected</span>}
                    </td>
                    <td className="py-2 pr-3">{r.payload?.input ?? '—'}</td>
                    <td className="py-2 pr-3">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="py-2">
                      {editing === r.id ? (
                        <span className="flex items-center gap-2">
                          <input
                            type="number" min={0} max={100}
                            className="w-16 rounded border border-slate-300 px-2 py-1 text-sm"
                            value={newScore}
                            onChange={(e) => setNewScore(e.target.value)}
                            aria-label="Corrected score"
                          />
                          <Button size="sm" onClick={() => void submitOverride(r.id)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                        </span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => { setEditing(r.id); setNewScore(String(r.override_score ?? r.score)); }}>
                          Override
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
