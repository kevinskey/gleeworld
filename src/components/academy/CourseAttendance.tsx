import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Lock, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface CourseAttendanceProps {
  courseId: string;
  isEnrolled: boolean;
  isAdmin?: boolean;
}

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  status: string;
  notes: string | null;
}

export const CourseAttendance: React.FC<CourseAttendanceProps> = ({ courseId, isEnrolled, isAdmin = false }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0 });

  useEffect(() => {
    if (isEnrolled && user) {
      fetchAttendance();
    } else {
      setLoading(false);
    }
  }, [courseId, isEnrolled, user]);

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_course_attendance')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', user?.id)
        .order('attendance_date', { ascending: false });

      if (error) throw error;

      setRecords(data || []);

      // Calculate stats
      const newStats = { present: 0, absent: 0, late: 0, excused: 0 };
      data?.forEach(record => {
        if (record.status in newStats) {
          newStats[record.status as keyof typeof newStats]++;
        }
      });
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'excused':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      present: 'bg-green-100 text-green-700 border-green-200',
      absent: 'bg-red-100 text-red-700 border-red-200',
      late: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      excused: 'bg-blue-100 text-blue-700 border-blue-200'
    };

    return (
      <Badge variant="outline" className={variants[status] || ''}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!isEnrolled) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Attendance</h3>
          <p className="text-muted-foreground">
            Enroll in this course to view your attendance record.
          </p>
        </CardContent>
      </Card>
    );
  }

  const total = stats.present + stats.absent + stats.late + stats.excused;
  const attendanceRate = total > 0 ? ((stats.present + stats.late) / total * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Attendance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">{attendanceRate}%</div>
            <p className="text-sm text-muted-foreground">Attendance Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.present}</div>
            <p className="text-sm text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.late}</div>
            <p className="text-sm text-muted-foreground">Late</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-red-600">{stats.absent}</div>
            <p className="text-sm text-muted-foreground">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.excused}</div>
            <p className="text-sm text-muted-foreground">Excused</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Loading attendance...</p>
          ) : records.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No attendance records yet.
            </p>
          ) : (
            <div className="space-y-2">
              {records.map(record => (
                <div 
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(record.status)}
                    <span className="font-medium">
                      {format(new Date(record.attendance_date), 'EEEE, MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.notes && (
                      <span className="text-sm text-muted-foreground">{record.notes}</span>
                    )}
                    {getStatusBadge(record.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
