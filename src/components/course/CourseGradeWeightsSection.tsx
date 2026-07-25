import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Scale, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

// Fallback catalog — used only if the DB seed didn't run for this
// course yet (e.g. course predates the migration and the backfill
// hasn't reached it). Keys match the migration's seed.
const DEFAULT_CATEGORIES = [
  { key: 'assignments',        label: 'Assignments',        weight_pct: 20, sort_order: 10 },
  { key: 'quizzes',            label: 'Quizzes',            weight_pct: 10, sort_order: 20 },
  { key: 'tests',              label: 'Tests',              weight_pct: 15, sort_order: 30 },
  { key: 'discussions',        label: 'Discussions',        weight_pct:  5, sort_order: 40 },
  { key: 'midterm',            label: 'Midterm',            weight_pct: 15, sort_order: 50 },
  { key: 'final_exam',         label: 'Final Exam',         weight_pct: 20, sort_order: 60 },
  { key: 'group_assignment',   label: 'Group Assignment',   weight_pct: 10, sort_order: 70 },
  { key: 'special_assignment', label: 'Special Assignment', weight_pct:  5, sort_order: 80 },
];

interface GradeCategoryRow {
  id: string;
  course_id: string;
  key: string;
  label: string;
  weight_pct: number;
  sort_order: number;
  drop_lowest: number;
}

interface CourseGradeWeightsSectionProps {
  courseId: string;
  /** Passed through so tenant super-admins can edit even without instructor RLS. */
  readOnly?: boolean;
}

export function CourseGradeWeightsSection({ courseId, readOnly = false }: CourseGradeWeightsSectionProps) {
  const qc = useQueryClient();

  const { data: rows, isLoading } = useQuery<GradeCategoryRow[]>({
    queryKey: ['course-grade-categories', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_course_grade_categories' as any)
        .select('id, course_id, key, label, weight_pct, sort_order, drop_lowest')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as unknown as GradeCategoryRow[]) ?? [];
    },
  });

  // Local edit buffer. Rebuilt when the server data changes.
  const [buffer, setBuffer] = useState<GradeCategoryRow[]>([]);
  useEffect(() => {
    if (rows && rows.length > 0) {
      setBuffer(rows);
    } else if (rows && rows.length === 0) {
      // Course has no seeded rows yet — offer the defaults inline so
      // the teacher can save them and trigger the initial insert.
      setBuffer(
        DEFAULT_CATEGORIES.map((d, i) => ({
          id: `pending-${i}`,
          course_id: courseId,
          key: d.key,
          label: d.label,
          weight_pct: d.weight_pct,
          sort_order: d.sort_order,
          drop_lowest: 0,
        })),
      );
    }
  }, [rows, courseId]);

  const total = useMemo(
    () => buffer.reduce((sum, r) => sum + (Number(r.weight_pct) || 0), 0),
    [buffer],
  );
  const totalValid = Math.abs(total - 100) < 0.01;

  const dirty = useMemo(() => {
    if (!rows || rows.length === 0) return buffer.length > 0;
    if (rows.length !== buffer.length) return true;
    const byId = new Map(rows.map((r) => [r.id, r]));
    return buffer.some((b) => {
      const src = byId.get(b.id);
      if (!src) return true; // pending row (unseeded course)
      return src.weight_pct !== b.weight_pct || src.drop_lowest !== b.drop_lowest;
    });
  }, [rows, buffer]);

  const save = useMutation({
    mutationFn: async (next: GradeCategoryRow[]) => {
      const isSeeding = !rows || rows.length === 0;
      // The DB trigger validates sum ≈ 100 at COMMIT (deferred). We
      // still preflight for a friendlier client error.
      const nextTotal = next.reduce((s, r) => s + (Number(r.weight_pct) || 0), 0);
      if (Math.abs(nextTotal - 100) > 0.01) {
        throw new Error(`Category weights must sum to 100 (currently ${nextTotal.toFixed(2)}).`);
      }

      if (isSeeding) {
        // Fresh insert (course had no rows yet). Drop the pending id.
        const rowsToInsert = next.map(({ id: _id, ...rest }) => rest);
        const { error } = await supabase
          .from('gw_course_grade_categories' as any)
          .insert(rowsToInsert as unknown as never[]);
        if (error) throw error;
      } else {
        // Upsert changed rows. Only push weight_pct + drop_lowest — label
        // and sort_order are policy defaults the app owns.
        const changes = next
          .filter((b) => {
            const src = rows!.find((r) => r.id === b.id);
            return !src || src.weight_pct !== b.weight_pct || src.drop_lowest !== b.drop_lowest;
          })
          .map((b) => ({ id: b.id, weight_pct: b.weight_pct, drop_lowest: b.drop_lowest }));
        if (changes.length === 0) return;
        const { error } = await supabase
          .from('gw_course_grade_categories' as any)
          .upsert(changes as unknown as never[]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Grade weights saved');
      qc.invalidateQueries({ queryKey: ['course-grade-categories', courseId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to save grade weights');
    },
  });

  const setWeight = (idx: number, value: number) => {
    setBuffer((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, weight_pct: Number.isFinite(value) ? value : 0 } : r)),
    );
  };
  const setDropLowest = (idx: number, value: number) => {
    setBuffer((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, drop_lowest: Math.max(0, Math.floor(value || 0)) } : r)),
    );
  };
  const reset = () => rows && setBuffer(rows);
  const resetToDefaults = () => {
    setBuffer((prev) =>
      prev.map((r) => {
        const defaults = DEFAULT_CATEGORIES.find((d) => d.key === r.key);
        return defaults ? { ...r, weight_pct: defaults.weight_pct, drop_lowest: 0 } : r;
      }),
    );
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-primary" />
          Grade Weights
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Set how each category contributes to a student's final grade. Weights must sum to 100. Empty
          categories are excluded automatically — a student's running grade only reflects what's been graded.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 px-3 w-32">Weight (%)</th>
                    <th className="py-2 px-3 w-32">Drop Lowest</th>
                  </tr>
                </thead>
                <tbody>
                  {buffer.map((row, idx) => (
                    <tr key={row.id ?? row.key} className="border-b last:border-0">
                      <td className="py-3 pr-3">
                        <Label htmlFor={`w-${row.key}`} className="font-medium cursor-pointer">
                          {row.label}
                        </Label>
                      </td>
                      <td className="py-3 px-3">
                        <Input
                          id={`w-${row.key}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={100}
                          step={0.5}
                          value={row.weight_pct}
                          onChange={(e) => setWeight(idx, parseFloat(e.target.value))}
                          disabled={readOnly}
                          className="h-9"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          value={row.drop_lowest}
                          onChange={(e) => setDropLowest(idx, parseInt(e.target.value, 10))}
                          disabled={readOnly}
                          className="h-9"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2">
                    <td className="py-3 pr-3 font-semibold text-right">Total</td>
                    <td className="py-3 px-3">
                      <div
                        className={`flex items-center gap-1.5 font-semibold ${
                          totalValid ? 'text-emerald-700' : 'text-destructive'
                        }`}
                      >
                        {totalValid ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        {total.toFixed(2)}%
                      </div>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {!totalValid && (
              <p className="text-xs text-destructive">
                Weights must add up to exactly 100. Currently off by{' '}
                <span className="font-semibold">{(total - 100).toFixed(2)}</span>.
              </p>
            )}

            {!readOnly && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button variant="ghost" size="sm" onClick={resetToDefaults} className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset to GleeWorld defaults
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={reset} disabled={!dirty || save.isPending}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={!dirty || !totalValid || save.isPending}
                    onClick={() => save.mutate(buffer)}
                  >
                    {save.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save weights
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
