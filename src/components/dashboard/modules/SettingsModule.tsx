import React from 'react';
import { Settings } from 'lucide-react';

export const SettingsModule = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <Settings className="w-16 h-16 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Settings Module</h3>
        <p>Account preferences will appear here</p>
      </div>
    </div>
  );
};