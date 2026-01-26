import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentGradesRoster } from './StudentGradesRoster';
import { SimpleGradeSpreadsheet } from './SimpleGradeSpreadsheet';
import { Mus240AttendanceGrid } from '../attendance/Mus240AttendanceGrid';

export const GradesAdmin = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="spreadsheet" className="w-full">
        <TabsList>
          <TabsTrigger value="spreadsheet">Grade Spreadsheet</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="roster">Detailed Roster</TabsTrigger>
        </TabsList>
        <TabsContent value="spreadsheet">
          <SimpleGradeSpreadsheet />
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
