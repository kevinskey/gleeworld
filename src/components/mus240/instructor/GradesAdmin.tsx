import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentGradesRoster } from './StudentGradesRoster';
import { Mus240InstructorGradeGrid } from './Mus240InstructorGradeGrid';
import { Mus240AttendanceGrid } from '../attendance/Mus240AttendanceGrid';

export const GradesAdmin = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs defaultValue="spreadsheet" className="w-full">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="spreadsheet" className="text-xs sm:text-sm">Grade Spreadsheet</TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs sm:text-sm">Attendance</TabsTrigger>
            <TabsTrigger value="roster" className="text-xs sm:text-sm">Detailed Roster</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="spreadsheet">
          <Mus240InstructorGradeGrid />
        </TabsContent>
        <TabsContent value="attendance">
          <Mus240AttendanceGrid isInstructor={true} />
        </TabsContent>
        <TabsContent value="roster">
          <StudentGradesRoster />
        </TabsContent>
      </Tabs>
    </div>
  );
};
