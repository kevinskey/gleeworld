import React from 'react';
import { Camera } from 'lucide-react';

export const MediaModule = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <Camera className="w-16 h-16 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Media Module</h3>
        <p>Photos and videos will appear here</p>
      </div>
    </div>
  );
};