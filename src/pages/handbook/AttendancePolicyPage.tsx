import React from 'react';
import { BackNavigation } from '@/components/shared/BackNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertTriangle, BookOpen, Users, Calendar } from 'lucide-react';

const AttendancePolicyPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Navigation */}
        <BackNavigation />
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-lg p-3 bg-purple-100 text-purple-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Attendance Policy</h1>
            <p className="text-muted-foreground">Official attendance requirements and guidelines for Glee Club members</p>
          </div>
        </div>

        {/* Policy Content */}
        <div className="space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Attendance Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-green-50 rounded-lg border-green-200 border">
                  <div className="text-2xl font-bold text-green-600">90%</div>
                  <div className="text-sm text-muted-foreground">Minimum Attendance Rate</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border-blue-200 border">
                  <div className="text-2xl font-bold text-blue-600">3</div>
                  <div className="text-sm text-muted-foreground">Maximum Excused Absences</div>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg border-amber-200 border">
                  <div className="text-2xl font-bold text-amber-600">24hr</div>
                  <div className="text-sm text-muted-foreground">Excuse Notice Period</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* General Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                General Attendance Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p>
                  Regular attendance at all Glee Club activities is mandatory for all members. This includes:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Weekly Rehearsals:</strong> Tuesday and Thursday evenings, 6:00-8:00 PM</li>
                  <li><strong>Sectional Rehearsals:</strong> As scheduled by section leaders</li>
                  <li><strong>Performances:</strong> All concerts and public appearances</li>
                  <li><strong>Special Events:</strong> Master classes, workshops, and community service</li>
                  <li><strong>Tours:</strong> All tour-related activities and performances</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Excuse Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                Excuse Request Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold text-green-600 mb-2">Acceptable Excuses</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Academic conflicts (exams, presentations)</li>
                    <li>• Medical appointments or illness</li>
                    <li>• Family emergencies</li>
                    <li>• Pre-approved academic travel</li>
                    <li>• Religious observances</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">Unacceptable Excuses</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Work schedules (except emergencies)</li>
                    <li>• Social events or parties</li>
                    <li>• General fatigue or "not feeling like it"</li>
                    <li>• Transportation issues (plan ahead)</li>
                    <li>• Non-essential appointments</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800">Important Notice</h4>
                    <p className="text-sm text-amber-700">
                      All excuse requests must be submitted at least 24 hours in advance when possible. 
                      Emergency situations should be reported as soon as possible.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consequences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Attendance Violations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div>
                    <div className="font-medium">First Violation</div>
                    <div className="text-sm text-muted-foreground">Below 90% attendance rate</div>
                  </div>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    Warning
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <div className="font-medium">Second Violation</div>
                    <div className="text-sm text-muted-foreground">Continued poor attendance</div>
                  </div>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800">
                    Probation
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <div className="font-medium">Third Violation</div>
                    <div className="text-sm text-muted-foreground">No improvement during probation</div>
                  </div>
                  <Badge variant="outline" className="bg-red-100 text-red-800">
                    Removal
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Performance Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2">Special Requirements</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• All performances are <strong>mandatory</strong> - no exceptions</li>
                  <li>• Members must attend dress rehearsals prior to performances</li>
                  <li>• Concert attire must be worn as specified</li>
                  <li>• Arrive 30 minutes before call time for warm-ups</li>
                  <li>• Absence from a performance may result in immediate probation</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Questions or Concerns?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                If you have questions about the attendance policy or need to discuss special circumstances, 
                please contact the Glee Club Secretary or Director as soon as possible. We're here to help 
                you succeed while maintaining the high standards of our ensemble.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AttendancePolicyPage;