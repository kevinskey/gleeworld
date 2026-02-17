import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { AlertTriangle, Clock, CalendarDays, Users, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ConflictRecord {
  id: string;
  user_id: string;
  course_name: string;
  course_code: string | null;
  days: string[];
  start_time: string;
  end_time: string;
  conflict_details: string | null;
  full_name: string;
  email: string | null;
  voice_part: string | null;
}

export const ScheduleConflictAnalysis: React.FC = () => {
  const { data: conflicts, isLoading } = useQuery({
    queryKey: ['mus070-schedule-conflicts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_schedules_with_profiles' as any)
        .select('*')
        .eq('has_conflict', true)
        .order('full_name');

      if (error) throw error;
      return data as unknown as ConflictRecord[];
    },
  });

  const { data: totalEnrolled } = useQuery({
    queryKey: ['mus070-total-enrolled'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('gw_enrollments' as any)
        .select('*', { count: 'exact', head: true })
        .eq('course_id', 'a0000000-0000-0000-0000-000000000070')
        .eq('status', 'active');
      if (error) throw error;
      return count || 0;
    },
  });

  // Analyze conflict patterns
  const analysis = useMemo(() => {
    if (!conflicts) return null;

    const uniqueStudents = new Set(conflicts.map(c => c.user_id)).size;
    const dayBreakdown: Record<string, number> = {};
    const courseBreakdown: Record<string, { count: number; days: Set<string> }> = {};

    conflicts.forEach(c => {
      // Count by day
      c.days?.forEach(day => {
        if (['Monday', 'Wednesday', 'Friday'].includes(day)) {
          dayBreakdown[day] = (dayBreakdown[day] || 0) + 1;
        }
      });

      // Count by conflicting course
      const key = c.course_name || 'Unknown';
      if (!courseBreakdown[key]) {
        courseBreakdown[key] = { count: 0, days: new Set() };
      }
      courseBreakdown[key].count++;
      c.days?.forEach(d => courseBreakdown[key].days.add(d));
    });

    // Sort courses by frequency
    const topCourses = Object.entries(courseBreakdown)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 8);

    return { uniqueStudents, dayBreakdown, topCourses };
  }, [conflicts]);

  const formatTime = (t: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const exportConflicts = () => {
    if (!conflicts) return;
    const headers = ['Student', 'Email', 'Voice Part', 'Conflicting Course', 'Days', 'Time', 'Details'];
    const rows = conflicts.map(c => [
      c.full_name,
      c.email || '',
      c.voice_part || '',
      `${c.course_code || ''} ${c.course_name}`.trim(),
      c.days?.join('/') || '',
      `${formatTime(c.start_time)}–${formatTime(c.end_time)}`,
      c.conflict_details || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mus070-schedule-conflicts.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Conflict report exported');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading conflict data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {analysis?.uniqueStudents || 0}
            </div>
            <div className="text-xs text-muted-foreground">Students w/ Conflicts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{totalEnrolled || '—'}</div>
            <div className="text-xs text-muted-foreground">Total Enrolled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {totalEnrolled ? `${Math.round(((analysis?.uniqueStudents || 0) / totalEnrolled) * 100)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground">Conflict Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <CalendarDays className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{conflicts?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Conflicting Classes</div>
          </CardContent>
        </Card>
      </div>

      {/* Day Breakdown + Top Conflicting Courses */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Conflicts by Rehearsal Day</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {['Monday', 'Wednesday', 'Friday'].map(day => {
              const count = analysis?.dayBreakdown[day] || 0;
              const max = Math.max(...Object.values(analysis?.dayBreakdown || { x: 1 }));
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-sm w-24 font-medium">{day}</span>
                  <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all flex items-center justify-end pr-2",
                        count > 0 ? "bg-amber-500/80" : "bg-transparent"
                      )}
                      style={{ width: max > 0 ? `${Math.max((count / max) * 100, count > 0 ? 15 : 0)}%` : '0%' }}
                    >
                      {count > 0 && <span className="text-[10px] font-bold text-white">{count}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Top Conflicting Courses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {analysis?.topCourses.map(([name, info]) => (
              <div key={name} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                <span className="truncate flex-1 mr-2">{name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {Array.from(info.days).map(d => d.slice(0, 3)).join('/')}
                  </span>
                  <Badge variant="secondary" className="text-xs">{info.count}</Badge>
                </div>
              </div>
            ))}
            {(!analysis?.topCourses || analysis.topCourses.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No conflicts found</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">All Schedule Conflicts</CardTitle>
            <Button variant="outline" size="sm" onClick={exportConflicts}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[50vh]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Student</TableHead>
                  <TableHead>Voice Part</TableHead>
                  <TableHead>Conflicting Class</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conflicts?.map((c, idx) => (
                  <TableRow key={c.id} className={idx % 2 === 0 ? '' : 'bg-muted/10'}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{c.full_name}</div>
                        {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{c.voice_part || '—'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {c.course_code && <span className="font-medium mr-1">{c.course_code}</span>}
                        {c.course_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.days?.map(d => d.slice(0, 3)).join(', ')}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {formatTime(c.start_time)}–{formatTime(c.end_time)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
