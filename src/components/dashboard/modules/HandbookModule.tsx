import React from 'react';
import { BookOpen } from 'lucide-react';

export const HandbookModule = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <BookOpen className="w-16 h-16 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Handbook Module</h3>
        <p>Rules and guidelines will appear here</p>
      </div>
    </div>
  );
};