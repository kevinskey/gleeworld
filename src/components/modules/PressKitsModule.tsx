import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export const PressKitsModule = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Press Kits
        </CardTitle>
        <CardDescription>
          Manage press kits and media materials
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Press kit management system coming soon.</p>
      </CardContent>
    </Card>
  );
};