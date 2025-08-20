import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Calendar, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const AttendancePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
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
            <p className="text-2xl font-bold text-green-600">92%</p>
          </Card>
          <Card className="p-4 text-center bg-blue-50 border-blue-200">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold">Present</h3>
            <p className="text-sm text-muted-foreground">23 events</p>
          </Card>
          <Card className="p-4 text-center bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
            <h3 className="font-semibold">Excused</h3>
            <p className="text-sm text-muted-foreground">2 events</p>
          </Card>
          <Card className="p-4 text-center bg-red-50 border-red-200">
            <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <h3 className="font-semibold">Unexcused</h3>
            <p className="text-sm text-muted-foreground">0 events</p>
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
                <div className="space-y-4">
                  {[
                    {
                      event: "Tuesday Rehearsal",
                      date: "March 5, 2024",
                      time: "6:00 PM - 8:00 PM",
                      status: "present",
                      type: "rehearsal"
                    },
                    {
                      event: "Section Rehearsal - Soprano",
                      date: "March 4, 2024",
                      time: "4:00 PM - 5:30 PM",
                      status: "present",
                      type: "sectional"
                    },
                    {
                      event: "Community Concert",
                      date: "March 1, 2024",
                      time: "7:00 PM - 9:00 PM",
                      status: "present",
                      type: "performance"
                    },
                    {
                      event: "Thursday Rehearsal",
                      date: "February 29, 2024",
                      time: "6:00 PM - 8:00 PM",
                      status: "excused",
                      type: "rehearsal",
                      excuse: "Doctor's appointment"
                    },
                    {
                      event: "Tuesday Rehearsal",
                      date: "February 27, 2024",
                      time: "6:00 PM - 8:00 PM",
                      status: "present",
                      type: "rehearsal"
                    },
                    {
                      event: "Uniform Fitting",
                      date: "February 26, 2024",
                      time: "3:00 PM - 5:00 PM",
                      status: "excused",
                      type: "fitting",
                      excuse: "Class conflict"
                    }
                  ].map((record, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
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
                            <h4 className="font-semibold">{record.event}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {record.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {record.time}
                              </span>
                            </div>
                            {record.excuse && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Excuse: {record.excuse}
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
                                {record.type}
                              </Badge>
                            </div>
                          </div>
                          {record.status === 'absent' && (
                            <Button size="sm" variant="outline">
                              Submit Excuse
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                      <span>Current: 92%</span>
                      <span>Goal: 95%</span>
                    </div>
                    <Progress value={92} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-2">
                      You need to attend the next 3 events to reach your goal
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
                    <span className="font-semibold">25</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Present</span>
                    <span className="font-semibold text-green-600">23</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Excused Absences</span>
                    <span className="font-semibold text-yellow-600">2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unexcused Absences</span>
                    <span className="font-semibold text-red-600">0</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Attendance Rate</span>
                    <span className="font-semibold">92%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Submit Excuse
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Full Record
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Attendance Policy
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Rehearsal - Tonight 6 PM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Sectional - Tomorrow 4 PM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Spring Concert - March 15</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;