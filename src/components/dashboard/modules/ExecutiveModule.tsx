import React from 'react';
import { Briefcase } from 'lucide-react';

export const ExecutiveModule = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <Briefcase className="w-16 h-16 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Executive Module</h3>
        <p>Leadership tools will appear here</p>
      </div>
    </div>
  );
};