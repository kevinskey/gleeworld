// Canvas-backed course analytics dashboard. Teacher view: per-student
// summary, per-assignment distribution, simple activity histogram.

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, AlertCircle, BarChart3, Users, FileText } from 'lucide-react';
import { useCanvasCourse, useCanvasCourseAnalytics } from '@/hooks/useCanvasAcademy';

export default function CanvasCourseAnalytics() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId ? Number(params.courseId) : null;
  const { data: courseData } = useCanvasCourse(courseId);
  const { data, isLoading, error } = useCanvasCourseAnalytics(courseId);

  const courseName = courseData && 'ok' in courseData ? courseData.course.name : '';

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-5">
      <div>
        <Link to={`/academy/canvas/courses/${courseId}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to course
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{courseName}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading analytics…
        </div>
      ) : error || !data || 'error' in data ? (
        <div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>Could not load analytics.</div>
        </div>
      ) : data.analytics_disabled ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-2">
            <BarChart3 className="w-6 h-6 mx-auto opacity-40" />
            <p>Analytics not available for this course (plugin may be disabled).</p>
          </CardContent>
        </Card>
      ) : (
        <AnalyticsView data={data} />
      )}
    </div>
  );
}

function AnalyticsView({ data }: { data: import('@/hooks/useCanvasAcademy').CanvasCourseAnalytics }) {
  const [tab, setTab] = useState('students');
  const totals = useMemo(() => {
    const totalViews = data.student_summaries.reduce((s, x) => s + x.page_views, 0);
    const totalPart = data.student_summaries.reduce((s, x) => s + x.participations, 0);
    const totalLate = data.student_summaries.reduce((s, x) => s + x.late, 0);
    const totalMissing = data.student_summaries.reduce((s, x) => s + x.missing, 0);
    return { totalViews, totalPart, totalLate, totalMissing };
  }, [data]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Students" value={data.total_students} icon={Users} />
        <StatCard label="Page views" value={totals.totalViews.toLocaleString()} icon={BarChart3} />
        <StatCard label="Late subs" value={totals.totalLate} icon={FileText} accent="amber" />
        <StatCard label="Missing subs" value={totals.totalMissing} icon={FileText} accent="rose" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="students">By student</TabsTrigger>
          <TabsTrigger value="assignments">By assignment</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="text-left p-3 font-semibold">Student</th>
                    <th className="text-right p-3 font-semibold">Page views</th>
                    <th className="text-right p-3 font-semibold">Participations</th>
                    <th className="text-right p-3 font-semibold">On time</th>
                    <th className="text-right p-3 font-semibold">Late</th>
                    <th className="text-right p-3 font-semibold">Missing</th>
                  </tr>
                </thead>
                <tbody>
                  {data.student_summaries
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((s) => (
                      <tr key={s.user_id} className="border-b border-border last:border-0">
                        <td className="p-3">{s.name}</td>
                        <td className="p-3 text-right tabular-nums">{s.page_views.toLocaleString()}</td>
                        <td className="p-3 text-right tabular-nums">{s.participations}</td>
                        <td className="p-3 text-right tabular-nums text-emerald-700">{s.on_time}</td>
                        <td className="p-3 text-right tabular-nums text-amber-700">{s.late}</td>
                        <td className="p-3 text-right tabular-nums text-rose-700">{s.missing}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="text-left p-3 font-semibold">Assignment</th>
                    <th className="text-right p-3 font-semibold">Median</th>
                    <th className="text-right p-3 font-semibold">Min</th>
                    <th className="text-right p-3 font-semibold">Max</th>
                    <th className="text-right p-3 font-semibold">On time</th>
                    <th className="text-right p-3 font-semibold">Late</th>
                    <th className="text-right p-3 font-semibold">Missing</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assignments.map((a) => (
                    <tr key={a.assignment_id} className="border-b border-border last:border-0">
                      <td className="p-3">{a.title}{a.points_possible !== null && <span className="text-xs text-muted-foreground ml-1">/ {a.points_possible}</span>}</td>
                      <td className="p-3 text-right tabular-nums">{a.median ?? '—'}</td>
                      <td className="p-3 text-right tabular-nums">{a.min_score ?? '—'}</td>
                      <td className="p-3 text-right tabular-nums">{a.max_score ?? '—'}</td>
                      <td className="p-3 text-right tabular-nums text-emerald-700">{a.on_time}</td>
                      <td className="p-3 text-right tabular-nums text-amber-700">{a.late}</td>
                      <td className="p-3 text-right tabular-nums text-rose-700">{a.missing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Daily activity</h3>
              {data.activity.by_date.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">No activity data yet.</div>
              ) : (
                <ActivityBars data={data.activity.by_date} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function ActivityBars({ data }: { data: Array<{ date: string; views: number; participations: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.views + d.participations));
  return (
    <div className="space-y-1.5">
      {data.slice(-30).map((d) => (
        <div key={d.date} className="flex items-center gap-2 text-xs">
          <div className="w-20 shrink-0 text-muted-foreground tabular-nums">{d.date.slice(5)}</div>
          <div className="flex-1 h-4 bg-muted rounded relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary/60 rounded"
              style={{ width: `${((d.views + d.participations) / max) * 100}%` }}
            />
          </div>
          <div className="w-16 shrink-0 text-right tabular-nums">{d.views} v</div>
          <div className="w-12 shrink-0 text-right tabular-nums">{d.participations} p</div>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, accent,
}: { label: string; value: string | number; icon: typeof Users; accent?: 'amber' | 'rose' }) {
  const cls = accent === 'amber' ? 'text-amber-700' : accent === 'rose' ? 'text-rose-700' : '';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
          <Icon className="w-3.5 h-3.5" /> {label}
        </div>
        <div className={`text-2xl font-bold mt-1 ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
