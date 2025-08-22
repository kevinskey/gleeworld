import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export const SettingsModule = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          System Settings
        </CardTitle>
        <CardDescription>
          Platform configuration and settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">System settings and configuration coming soon.</p>
      </CardContent>
    </Card>
  );
};