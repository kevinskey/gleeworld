import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Calendar, Clock, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAttendance } from '@/hooks/useAttendance';
import { BackNavigation } from '@/components/shared/BackNavigation';
import { UpcomingEventsWidget } from '@/components/attendance/UpcomingEventsWidget';
import { ActionGrid } from '@/components/actions/ActionGrid';

const AttendancePage = () => {
  const { attendance, loading, getAttendanceStats } = useAttendance();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const stats = getAttendanceStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Navigation */}
        <BackNavigation />
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-lg p-3 bg-orange-100 text-orange-600">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Attendance</h1>
            <p className="text-muted-foreground">Track your attendance and submit excuses</p>
          </div>
        </div>

        {/* Attendance Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4 text-center bg-green-50 border-green-200">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <h3 className="font-semibold">Attendance Rate</h3>
            <p className="text-2xl font-bold text-green-600">{stats.attendanceRate}%</p>
          </Card>
          <Card className="p-4 text-center bg-blue-50 border-blue-200">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold">Present</h3>
            <p className="text-sm text-muted-foreground">{stats.present} events</p>
          </Card>
          <Card className="p-4 text-center bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
            <h3 className="font-semibold text-white">Excused</h3>
            <p className="text-sm text-white">{stats.excused} events</p>
          </Card>
          <Card className="p-4 text-center bg-red-50 border-red-200">
            <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <h3 className="font-semibold">Unexcused</h3>
            <p className="text-sm text-muted-foreground">{stats.unexcused} events</p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Attendance */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                {attendance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendance records found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {attendance.map((record) => (
                      <div key={record.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                        <div className="flex-shrink-0">
                          {record.status === 'present' && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {record.status === 'excused' && (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          )}
                          {record.status === 'absent' && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">{record.event?.title || 'Unknown Event'}</h4>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(record.event?.start_date || record.recorded_at).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  All Day
                                </span>
                              </div>
                              {record.notes && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Notes: {record.notes}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge 
                                  variant={
                                    record.status === 'present' ? 'default' :
                                    record.status === 'excused' ? 'secondary' : 'destructive'
                                  }
                                  className="text-xs"
                                >
                                  {record.status}
                                </Badge>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {record.event?.event_type || 'event'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Attendance Goal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Attendance Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Current: {stats.attendanceRate}%</span>
                      <span>Goal: 95%</span>
                    </div>
                    <Progress value={stats.attendanceRate} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {stats.attendanceRate >= 95 
                        ? 'You\'ve reached your attendance goal!' 
                        : `${95 - stats.attendanceRate}% more needed to reach goal`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Semester Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Semester Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Total Events</span>
                    <span className="font-semibold">{stats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Present</span>
                    <span className="font-semibold text-green-600">{stats.present}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Excused Absences</span>
                    <span className="font-semibold text-yellow-600">{stats.excused}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unexcused Absences</span>
                    <span className="font-semibold text-red-600">{stats.unexcused}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Attendance Rate</span>
                    <span className="font-semibold">{stats.attendanceRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionGrid 
                  filterOptions={{
                    userRole: 'member'
                  }}
                  category="members"
                  gridCols={1}
                  showCategoryHeaders={false}
                  className="space-y-2"
                />
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <UpcomingEventsWidget limit={3} compact={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;