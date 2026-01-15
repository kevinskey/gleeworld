import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UserCheck, Calendar, CheckCircle, XCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AttendanceData {
  rehearsalAbsences: number;
  performanceAbsences: number;
  tardies: number;
}

export const AttendanceSection: React.FC<AttendanceSectionProps> = ({ courseId }) => {
  const { user } = useAuth();
  const [userAttendance, setUserAttendance] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDropped, setIsDropped] = useState(false);

  const userName = user?.user_metadata?.full_name || '';
  const isMus070 = courseId === 'mus-070';
  const mus070CourseId = 'a0000000-0000-0000-0000-000000000070';

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user || !isMus070) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('gw_course_attendance_summary')
          .select('*')
          .eq('course_id', mus070CourseId)
          .or(`student_id.eq.${user.id},student_name.ilike.${userName}`)
          .single();

        if (data) {
          setUserAttendance({
            rehearsalAbsences: data.unexcused_rehearsal_absences || 0,
            performanceAbsences: data.unexcused_performance_absences || 0,
            tardies: data.tardies || 0,
          });
          setIsDropped(data.is_dropped || false);
        }
      } catch (err) {
        console.error('Error fetching attendance:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [user, isMus070, userName]);

  const calculateEffectiveAbsences = (data: AttendanceData) => {
    const performancePenalty = data.performanceAbsences * 2;
    const tardyPenalty = Math.max(0, Math.floor((data.tardies - 3) / 2));
    return data.rehearsalAbsences + performancePenalty + tardyPenalty;
  };

  const effectiveAbsences = userAttendance ? calculateEffectiveAbsences(userAttendance) : 0;
  const totalRehearsals = 30;
  const attendedRehearsals = userAttendance ? totalRehearsals - userAttendance.rehearsalAbsences : totalRehearsals;
  const attendanceRate = Math.round((attendedRehearsals / totalRehearsals) * 100);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Attendance</h2>
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
            <p className="text-muted-foreground">Loading attendance...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isMus070 || !userAttendance) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Attendance</h2>
        <Card>
          <CardContent className="py-8 text-center">
            <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No attendance records available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Attendance</h2>
        {isDropped ? (
          <Badge variant="destructive" className="text-lg">DROPPED</Badge>
        ) : (
          <Badge variant="outline" className="text-lg">{attendanceRate}%</Badge>
        )}
      </div>

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Your Attendance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDropped && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded-md mb-4">
              <p className="text-destructive font-semibold">
                Status: DROPPED - You have exceeded the maximum allowed absences (6+)
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">Attendance Rate</span>
              <span className="font-semibold text-foreground">{attendanceRate}%</span>
            </div>
            <Progress value={attendanceRate} className="h-2" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center mb-2">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{userAttendance.rehearsalAbsences}</p>
              <p className="text-sm text-muted-foreground">Rehearsal Absences</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center mb-2">
                <AlertCircle className="h-6 w-6 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{userAttendance.performanceAbsences}</p>
              <p className="text-sm text-muted-foreground">Performance Absences</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{userAttendance.tardies}</p>
              <p className="text-sm text-muted-foreground">Tardies</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{effectiveAbsences}</p>
              <p className="text-sm text-muted-foreground">Effective Absences</p>
            </div>
          </div>

          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-semibold text-foreground">Attendance Policy:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>3 unexcused absences allowed without penalty</li>
              <li>Each additional absence: -7% from final grade</li>
              <li>Missing a performance = 2 absences</li>
              <li>Every 2 tardies beyond 3 = 1 absence</li>
              <li>6+ effective absences = DROPPED from course</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
