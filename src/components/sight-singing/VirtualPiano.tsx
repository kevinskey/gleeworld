// Virtual piano component

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const VirtualPiano: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Virtual Piano</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((note) => (
            <div
              key={note}
              className="bg-white border border-gray-300 h-20 flex items-end justify-center pb-2 cursor-pointer hover:bg-gray-50"
            >
              <span className="text-sm text-gray-600">{note}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};