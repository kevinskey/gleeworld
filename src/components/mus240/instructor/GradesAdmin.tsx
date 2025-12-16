import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentGradesRoster } from './StudentGradesRoster';
import { SimpleGradeSpreadsheet } from './SimpleGradeSpreadsheet';

export const GradesAdmin = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="spreadsheet" className="w-full">
        <TabsList>
          <TabsTrigger value="spreadsheet">Grade Spreadsheet</TabsTrigger>
          <TabsTrigger value="roster">Detailed Roster</TabsTrigger>
        </TabsList>
        <TabsContent value="spreadsheet">
          <SimpleGradeSpreadsheet />
        </TabsContent>
        <TabsContent value="roster">
          <StudentGradesRoster />
        </TabsContent>
      </Tabs>
    </div>
  );
};
