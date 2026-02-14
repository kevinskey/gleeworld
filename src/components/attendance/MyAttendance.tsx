import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, subMonths, getDate, getDaysInMonth, startOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { MyExcuseRequests } from './MyExcuseRequests';
import { ExcuseGenerator } from './ExcuseGenerator';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  BarChart3,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AttendanceRecord {
  id: string;
  attendance_status: string;
  check_in_time?: string;
  check_out_time?: string;
  notes?: string;
  created_at: string;
  gw_events: {
    title: string;
    event_type: string;
    start_date: string;
  };
}

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  excused: number;
  late: number;
  percentage: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  present: { bg: 'bg-success-muted', text: 'text-success', dot: 'hsl(142, 76%, 36%)' },
  absent: { bg: 'bg-destructive/10', text: 'text-destructive', dot: 'hsl(0, 84%, 60%)' },
  excused: { bg: 'bg-warning-muted', text: 'text-warning', dot: 'hsl(38, 92%, 50%)' },
  late: { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'hsl(25, 95%, 53%)' },
  left_early: { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'hsl(25, 95%, 53%)' },
};

const DONUT_COLORS = [
  'hsl(142, 76%, 36%)',
  'hsl(0, 84%, 60%)',
  'hsl(38, 92%, 50%)',
  'hsl(25, 95%, 53%)',
];

export const MyAttendance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({ total: 0, present: 0, absent: 0, excused: 0, late: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('semester');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    if (user) loadAttendanceData();
  }, [user, selectedPeriod]);

  const getDateRange = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'current':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'semester':
        const currentMonth = now.getMonth();
        const semesterStart = currentMonth >= 7
          ? new Date(now.getFullYear(), 7, 1)
          : new Date(now.getFullYear(), 0, 1);
        return { start: semesterStart, end: now };
      case 'all':
        return { start: new Date(2020, 0, 1), end: now };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const loadAttendanceData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const { data, error } = await supabase
        .from('gw_event_attendance')
        .select(`
          id, attendance_status, check_in_time, check_out_time, notes, created_at,
          gw_events!gw_event_attendance_event_id_fkey(title, event_type, start_date)
        `)
        .eq('user_id', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      const attendanceRecords = data || [];
      setRecords(attendanceRecords);

      const total = attendanceRecords.length;
      const present = attendanceRecords.filter(r => r.attendance_status === 'present').length;
      const absent = attendanceRecords.filter(r => r.attendance_status === 'absent').length;
      const excused = attendanceRecords.filter(r => r.attendance_status === 'excused').length;
      const late = attendanceRecords.filter(r => r.attendance_status === 'late' || r.attendance_status === 'left_early').length;
      const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      setStats({ total, present, absent, excused, late, percentage });
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build calendar heatmap data
  const getCalendarDays = () => {
    const monthStart = startOfMonth(calendarMonth);
    const weekStart = startOfWeek(monthStart);
    const days: Date[] = [];
    let day = weekStart;
    for (let i = 0; i < 42; i++) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const getRecordForDate = (date: Date) => {
    return records.find(r => {
      const eventDate = new Date(r.gw_events.start_date);
      return isSameDay(eventDate, date);
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <User className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">Sign in to view attendance</h3>
        </div>
      </div>
    );
  }

  const donutData = [
    { name: 'Present', value: stats.present },
    { name: 'Absent', value: stats.absent },
    { name: 'Excused', value: stats.excused },
    { name: 'Late', value: stats.late },
  ].filter(d => d.value > 0);

  const calendarDays = getCalendarDays();
  const weekDayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="space-y-5">
      {/* ── Hero Strip ── */}
      <div
        className="rounded-2xl p-5 sm:p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(208, 100%, 20%) 0%, hsl(219, 78%, 31%) 50%, hsl(203, 85%, 40%) 100%)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-white tracking-wide">My Attendance</h2>
            <p className="text-white/80 text-sm mt-0.5">Track your check-ins and attendance history</p>
          </div>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-44 bg-white/15 backdrop-blur-sm border-white/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">This Month</SelectItem>
              <SelectItem value="last">Last Month</SelectItem>
              <SelectItem value="semester">This Semester</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : records.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Records Found</h3>
            <p className="text-muted-foreground text-sm">No attendance records for the selected period.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Stats + Donut Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Donut Chart */}
            <Card className="border-border lg:col-span-1">
              <CardContent className="py-5 flex flex-col items-center">
                <div className="relative w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={40} outerRadius={58} paddingAngle={3} dataKey="value" strokeWidth={0}>
                        {donutData.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold font-cinzel" style={{ color: 'hsl(222, 47%, 11%)' }}>{stats.percentage}%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.present + stats.late} present of {stats.total} events
                </p>
              </CardContent>
            </Card>

            {/* Stat Tiles */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat icon={CheckCircle} label="Present" value={stats.present} color="text-success" bgColor="bg-success-muted" />
              <MiniStat icon={XCircle} label="Absent" value={stats.absent} color="text-destructive" bgColor="bg-destructive/10" />
              <MiniStat icon={AlertTriangle} label="Excused" value={stats.excused} color="text-warning" bgColor="bg-warning-muted" />
              <MiniStat icon={Clock} label="Late" value={stats.late} color="text-orange-600" bgColor="bg-orange-50" />
            </div>
          </div>

          {/* ── Calendar Heatmap ── */}
          <Card className="border-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Attendance Calendar
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(prev => subMonths(prev, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center" style={{ color: 'hsl(222, 47%, 11%)' }}>
                  {format(calendarMonth, 'MMMM yyyy')}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(prev => addDays(startOfMonth(prev), 32))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {weekDayLabels.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
                {calendarDays.map((day, i) => {
                  const isCurrentMonth = isSameMonth(day, calendarMonth);
                  const record = getRecordForDate(day);
                  const isToday = isSameDay(day, new Date());
                  const statusColor = record ? STATUS_COLORS[record.attendance_status] : null;

                  return (
                    <div
                      key={i}
                      className={`relative aspect-square flex items-center justify-center rounded-lg text-xs transition-colors
                        ${!isCurrentMonth ? 'opacity-30' : ''}
                        ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                        ${record ? 'font-semibold' : ''}
                      `}
                      style={record && statusColor ? { backgroundColor: statusColor.dot + '20', color: statusColor.dot } : { color: 'hsl(222, 47%, 11%)' }}
                      title={record ? `${record.gw_events.title}: ${record.attendance_status}` : undefined}
                    >
                      {getDate(day)}
                      {record && (
                        <div
                          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: statusColor?.dot }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border justify-center flex-wrap">
                {Object.entries(STATUS_COLORS).filter(([k]) => k !== 'left_early').map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: val.dot }} />
                    <span className="text-xs capitalize text-muted-foreground">{key}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Recent Records ── */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Recent Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {records.slice(0, 12).map(record => {
                  const sc = STATUS_COLORS[record.attendance_status] || STATUS_COLORS.present;
                  return (
                    <div key={record.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`p-1.5 rounded-lg ${sc.bg}`}>
                          {record.attendance_status === 'present' && <CheckCircle className={`h-4 w-4 ${sc.text}`} />}
                          {record.attendance_status === 'absent' && <XCircle className={`h-4 w-4 ${sc.text}`} />}
                          {record.attendance_status === 'excused' && <AlertTriangle className={`h-4 w-4 ${sc.text}`} />}
                          {(record.attendance_status === 'late' || record.attendance_status === 'left_early') && <Clock className={`h-4 w-4 ${sc.text}`} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: 'hsl(222, 47%, 11%)' }}>{record.gw_events.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(record.gw_events.start_date), 'MMM dd, yyyy')}
                            {record.check_in_time && ` · ${format(new Date(record.check_in_time), 'h:mm a')}`}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${sc.bg} ${sc.text} border-0 capitalize text-xs`}>
                        {record.attendance_status.replace('_', ' ')}
                      </Badge>
                    </div>
                  );
                })}
              </div>
              {records.length > 12 && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Showing 12 of {records.length} records
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Excuse Requests ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MyExcuseRequests onEditRequest={(request) => {
          if ((window as any).editExcuseRequest) {
            (window as any).editExcuseRequest(request);
          }
        }} />
        <ExcuseGenerator onRequestEdited={() => { loadAttendanceData(); }} />
      </div>
    </div>
  );
};

/* ── Mini Stat ── */
const MiniStat = ({ icon: Icon, label, value, color, bgColor }: { icon: React.ElementType; label: string; value: number; color: string; bgColor: string }) => (
  <Card className="border-border">
    <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-2">
      <div className={`p-2 rounded-xl ${bgColor}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="text-xl sm:text-2xl font-bold font-cinzel" style={{ color: 'hsl(222, 47%, 11%)' }}>{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
    </CardContent>
  </Card>
);
