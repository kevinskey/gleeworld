import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mus070GradeSpreadsheet } from './Mus070GradeSpreadsheet';

export const Mus070GradesAdmin = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="spreadsheet" className="w-full">
        <TabsList>
          <TabsTrigger value="spreadsheet">Grade Spreadsheet</TabsTrigger>
        </TabsList>
        <TabsContent value="spreadsheet">
          <Mus070GradeSpreadsheet />
        </TabsContent>
      </Tabs>
    </div>
  );
};
