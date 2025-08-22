import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

export const FirstYearConsoleModule = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          First Year Console
        </CardTitle>
        <CardDescription>
          Tools and resources for first-year management
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">First year management console coming soon.</p>
      </CardContent>
    </Card>
  );
};