import React from 'react';
import { Radio } from 'lucide-react';

export const RadioModule = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <Radio className="w-16 h-16 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Radio Module</h3>
        <p>Glee World Radio will appear here</p>
      </div>
    </div>
  );
};