import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UserCheck, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface AttendanceSectionProps {
  courseId: string;
}

export const AttendanceSection: React.FC<AttendanceSectionProps> = ({ courseId }) => {
  const { user } = useAuth();

  // Mock data - in real implementation, fetch from database
  const attendanceRecords = [
    { date: new Date(2025, 0, 15), status: 'present' },
    { date: new Date(2025, 0, 13), status: 'present' },
    { date: new Date(2025, 0, 8), status: 'present' },
    { date: new Date(2025, 0, 6), status: 'absent' },
    { date: new Date(2024, 11, 18), status: 'present' },
    { date: new Date(2024, 11, 16), status: 'present' },
    { date: new Date(2024, 11, 11), status: 'excused' },
    { date: new Date(2024, 11, 9), status: 'present' },
  ];

  const totalClasses = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
  const excusedCount = attendanceRecords.filter(r => r.status === 'excused').length;
  const attendanceRate = Math.round((presentCount / totalClasses) * 100);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'excused':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge variant="default" className="bg-green-500">Present</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'excused':
        return <Badge variant="secondary" className="bg-yellow-500">Excused</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Attendance</h2>
        <Badge variant="outline" className="text-lg">
          {attendanceRate}%
        </Badge>
      </div>

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Attendance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Attendance Rate</span>
              <span className="font-semibold">{attendanceRate}%</span>
            </div>
            <Progress value={attendanceRate} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{presentCount}</p>
              <p className="text-sm text-muted-foreground">Present</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-2xl font-bold">{absentCount}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold">{excusedCount}</p>
              <p className="text-sm text-muted-foreground">Excused</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Policy Reminder:</strong> Students may miss 2 classes without penalty. 
              Each additional absence lowers the final grade by one letter.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {attendanceRecords.map((record, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(record.status)}
                  <div>
                    <p className="font-medium">
                      {format(record.date, 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(record.date, 'h:mm a')}
                    </p>
                  </div>
                </div>
                {getStatusBadge(record.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
