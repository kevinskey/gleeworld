import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mus070GradeSpreadsheet } from './Mus070GradeSpreadsheet';
import { CourseAttendanceGrid } from '@/components/course/CourseAttendanceGrid';
import { Mus070StudentRoster } from './Mus070StudentRoster';
import { PerformanceGradeEntry } from './PerformanceGradeEntry';
import { ScheduleConflictAnalysis } from './ScheduleConflictAnalysis';

const MUS_070_COURSE_ID = 'a0000000-0000-0000-0000-000000000070';

export const Mus070GradesAdmin = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="spreadsheet" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="spreadsheet">Grade Spreadsheet</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="performances">Performances</TabsTrigger>
          <TabsTrigger value="conflicts">Schedule Conflicts</TabsTrigger>
          <TabsTrigger value="roster">Detailed Roster</TabsTrigger>
        </TabsList>
        <TabsContent value="spreadsheet" className="mt-4">
          <Mus070GradeSpreadsheet />
        </TabsContent>
        <TabsContent value="attendance" className="mt-4 overflow-visible">
          <CourseAttendanceGrid 
            courseId={MUS_070_COURSE_ID} 
            courseCode="MUS 070"
            isInstructor={true} 
          />
        </TabsContent>
        <TabsContent value="performances" className="mt-4 overflow-visible">
          <PerformanceGradeEntry courseId={MUS_070_COURSE_ID} courseCode="MUS 070" />
        </TabsContent>
        <TabsContent value="conflicts" className="mt-4 overflow-visible">
          <ScheduleConflictAnalysis />
        </TabsContent>
        <TabsContent value="roster" className="mt-4 overflow-visible">
          <Mus070StudentRoster />
        </TabsContent>
      </Tabs>
    </div>
  );
};
