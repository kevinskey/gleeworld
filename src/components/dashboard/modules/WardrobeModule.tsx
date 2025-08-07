import React from 'react';
import { Shirt } from 'lucide-react';

export const WardrobeModule = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <Shirt className="w-16 h-16 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Wardrobe Module</h3>
        <p>Costume management will appear here</p>
      </div>
    </div>
  );
};