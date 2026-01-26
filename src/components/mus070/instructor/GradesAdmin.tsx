import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mus070GradeSpreadsheet } from './Mus070GradeSpreadsheet';
import { Mus070AttendanceGrid } from '../attendance/Mus070AttendanceGrid';

export const Mus070GradesAdmin = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="spreadsheet" className="w-full">
        <TabsList>
          <TabsTrigger value="spreadsheet">Grade Spreadsheet</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Grid</TabsTrigger>
        </TabsList>
        <TabsContent value="spreadsheet">
          <Mus070GradeSpreadsheet />
        </TabsContent>
        <TabsContent value="attendance">
          <Mus070AttendanceGrid isInstructor={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
