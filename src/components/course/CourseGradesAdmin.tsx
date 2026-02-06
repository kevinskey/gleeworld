import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CourseAttendanceGrid } from './CourseAttendanceGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Trophy } from 'lucide-react';
import { Mus070StudentRoster } from '@/components/mus070/instructor/Mus070StudentRoster';
import { Mus070GradeSpreadsheet } from '@/components/mus070/instructor/Mus070GradeSpreadsheet';
import { Mus240InstructorGradeGrid } from '@/components/mus240/instructor/Mus240InstructorGradeGrid';
import { StudentGradesRoster } from '@/components/mus240/instructor/StudentGradesRoster';
import { PerformanceGradeEntry } from '@/components/mus070/instructor/PerformanceGradeEntry';
import { getCourseGradingConfig } from '@/config/courseGradingConfig';

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
  // Detect specific courses for specialized components
  const isMus070 = courseCode === 'MUS 070' || courseCode === 'MUS070';
  const isMus240 = courseCode === 'MUS 240' || courseCode === 'MUS240';
  
  // Check if this course has performance-based grading components
  const gradingConfig = getCourseGradingConfig(courseId);
  const hasPerformances = gradingConfig.components.some(c => 
    ['Spring Concert', 'Graduation/Commencement', 'Founders Day', 'TBD Performance 1', 'TBD Performance 2'].includes(c.component)
  );
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="spreadsheet" className="w-full">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="flex-wrap h-auto gap-1 w-full sm:w-auto">
            <TabsTrigger value="spreadsheet" className="text-xs sm:text-sm">Grade Spreadsheet</TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs sm:text-sm">Attendance</TabsTrigger>
            {hasPerformances && <TabsTrigger value="performances" className="text-xs sm:text-sm">Performances</TabsTrigger>}
            <TabsTrigger value="roster" className="text-xs sm:text-sm">Detailed Roster</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="spreadsheet" className="mt-4 overflow-visible">
          {isMus070 ? (
            <Mus070GradeSpreadsheet />
          ) : isMus240 ? (
            <Mus240InstructorGradeGrid />
          ) : (
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
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="attendance" className="mt-4 overflow-visible">
          <CourseAttendanceGrid 
            courseId={courseId}
            courseCode={courseCode}
            semester={semester}
            isInstructor={true} 
          />
        </TabsContent>

        {hasPerformances && (
          <TabsContent value="performances" className="mt-4 overflow-visible">
            <PerformanceGradeEntry courseId={courseId} courseCode={courseCode} />
          </TabsContent>
        )}
        
        <TabsContent value="roster" className="mt-4 overflow-visible">
          {isMus070 ? (
            <Mus070StudentRoster />
          ) : isMus240 ? (
            <StudentGradesRoster />
          ) : (
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
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
