// Stub components for missing imports

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const SightSingingRecords: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sight Singing Records</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Sight singing records will be displayed here.
        </p>
      </CardContent>
    </Card>
  );
};