import React from 'react';
import { Users } from 'lucide-react';

export const DirectoryModule = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <Users className="w-16 h-16 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Directory Module</h3>
        <p>Member contacts will appear here</p>
      </div>
    </div>
  );
};