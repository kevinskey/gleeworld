import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  BarChart3,
  User
} from 'lucide-react';

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

export const MyAttendance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    present: 0,
    absent: 0,
    excused: 0,
    late: 0,
    percentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  useEffect(() => {
    if (user) {
      loadAttendanceData();
    }
  }, [user, selectedPeriod]);

  const getDateRange = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'current':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'last':
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case 'semester':
        // Approximate semester start (August for fall, January for spring)
        const currentMonth = now.getMonth();
        const semesterStart = currentMonth >= 7 
          ? new Date(now.getFullYear(), 7, 1) // Fall semester
          : new Date(now.getFullYear(), 0, 1); // Spring semester
        return {
          start: semesterStart,
          end: now
        };
      case 'all':
        return {
          start: new Date(2020, 0, 1), // Far back date
          end: now
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
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
          id,
          attendance_status,
          check_in_time,
          check_out_time,
          notes,
          created_at,
          gw_events!gw_event_attendance_event_id_fkey(
            title,
            event_type,
            start_date
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const attendanceRecords = data || [];
      setRecords(attendanceRecords);

      // Calculate statistics
      const total = attendanceRecords.length;
      const present = attendanceRecords.filter(r => r.attendance_status === 'present').length;
      const absent = attendanceRecords.filter(r => r.attendance_status === 'absent').length;
      const excused = attendanceRecords.filter(r => r.attendance_status === 'excused').length;
      const late = attendanceRecords.filter(r => 
        r.attendance_status === 'late' || r.attendance_status === 'left_early'
      ).length;
      
      const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      setStats({
        total,
        present,
        absent,
        excused,
        late,
        percentage
      });

    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'excused':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'late':
      case 'left_early':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'excused':
        return 'bg-yellow-100 text-yellow-800';
      case 'late':
      case 'left_early':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'current':
        return 'This Month';
      case 'last':
        return 'Last Month';
      case 'semester':
        return 'This Semester';
      case 'all':
        return 'All Time';
      default:
        return 'This Month';
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-gray-600">Please sign in to view your attendance.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Period Selection - Mobile optimized */}
      <Card className="glass-dashboard-card border-white/20 shadow-lg">
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <CardTitle className="flex items-center gap-2 text-slate-800 text-base sm:text-lg">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Attendance Overview
            </CardTitle>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-48 bg-white/50 backdrop-blur-sm border-white/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-md border-white/30">
                <SelectItem value="current">This Month</SelectItem>
                <SelectItem value="last">Last Month</SelectItem>
                <SelectItem value="semester">This Semester</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex justify-center py-6 sm:py-8">
              <LoadingSpinner />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No Records Found</h3>
              <p className="text-sm sm:text-base text-gray-600">No attendance records for the selected period.</p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Overall Progress - Mobile optimized */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-medium">Overall Attendance Rate</span>
                  <span className="text-xl sm:text-2xl font-bold text-green-600">{stats.percentage}%</span>
                </div>
                <Progress value={stats.percentage} className="h-2 sm:h-3" />
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.present + stats.late} present out of {stats.total} events
                </p>
              </div>

              {/* Stats Grid - Mobile responsive */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div className="text-center p-2 sm:p-4 bg-white/40 backdrop-blur-sm border border-white/30 rounded-lg shadow-sm">
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.present}</div>
                  <p className="text-xs sm:text-sm text-slate-600">Present</p>
                </div>

                <div className="text-center p-2 sm:p-4 bg-white/40 backdrop-blur-sm border border-white/30 rounded-lg shadow-sm">
                  <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-red-600">{stats.absent}</div>
                  <p className="text-xs sm:text-sm text-slate-600">Absent</p>
                </div>

                <div className="text-center p-2 sm:p-4 bg-white/40 backdrop-blur-sm border border-white/30 rounded-lg shadow-sm">
                  <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.excused}</div>
                  <p className="text-xs sm:text-sm text-slate-600">Excused</p>
                </div>

                <div className="text-center p-2 sm:p-4 bg-white/40 backdrop-blur-sm border border-white/30 rounded-lg shadow-sm">
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-orange-600">{stats.late}</div>
                  <p className="text-xs sm:text-sm text-slate-600">Late</p>
                </div>
              </div>

              {/* Attendance Records */}
              <div className="border-t pt-4 sm:pt-6">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                  Recent Attendance Records
                </h3>
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {records.slice(0, 10).map(record => (
                    <div key={record.id} className="p-4 bg-white/30 backdrop-blur-sm border border-white/20 rounded-lg space-y-3 animate-fade-in shadow-sm">
                      {/* Header with status and date */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.attendance_status)}
                          <Badge className={getStatusColor(record.attendance_status)}>
                            {record.attendance_status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(record.gw_events.start_date), 'MMM dd')}
                        </div>
                      </div>

                      {/* Event title */}
                      <div className="font-medium text-sm text-slate-800">{record.gw_events.title}</div>

                      {/* Bottom row with event type and check-in time */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-xs bg-white/50 border-white/30">
                          {record.gw_events.event_type}
                        </Badge>
                        {record.check_in_time && (
                          <div className="text-xs text-slate-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(record.check_in_time), 'h:mm a')}
                          </div>
                        )}
                      </div>

                      {/* Notes if present */}
                      {record.notes && (
                        <div className="pt-2 border-t border-white/20">
                          <p className="text-xs text-slate-600 italic">
                            "{record.notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {records.length > 10 && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Showing 10 of {records.length} records
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};