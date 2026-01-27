import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CourseAttendanceGrid } from './CourseAttendanceGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Trophy, Calendar } from 'lucide-react';

interface CourseGradesAdminProps {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  semester?: string;
}

export const CourseGradesAdmin: React.FC<CourseGradesAdminProps> = ({ 
  courseId,
  courseCode,
  courseTitle,
  semester = 'Spring 2026'
}) => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList>
          <TabsTrigger value="spreadsheet">Grade Spreadsheet</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="roster">Detailed Roster</TabsTrigger>
        </TabsList>
        
        <TabsContent value="spreadsheet" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Grade Spreadsheet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Grade spreadsheet for {courseCode} - {courseTitle} coming soon.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This will show a comprehensive grade breakdown including assignments, tests, participation, and attendance.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="attendance" className="mt-4 overflow-visible">
          <CourseAttendanceGrid 
            courseId={courseId}
            courseCode={courseCode}
            semester={semester}
            isInstructor={true} 
          />
        </TabsContent>
        
        <TabsContent value="roster" className="mt-4 overflow-visible">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Detailed Roster
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Detailed student roster for {courseCode} - {courseTitle} coming soon.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This will show complete student information including contact details, voice part, and enrollment status.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
