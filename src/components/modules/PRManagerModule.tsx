import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone } from 'lucide-react';

export const PRManagerModule = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          PR Manager
        </CardTitle>
        <CardDescription>
          Public relations and marketing management
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Public relations management system coming soon.</p>
      </CardContent>
    </Card>
  );
};