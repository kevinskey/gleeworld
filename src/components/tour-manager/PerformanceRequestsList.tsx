import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const PerformanceRequestsList = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Manage incoming performance email requests
        </p>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>
      <div className="text-center py-8 text-muted-foreground">
        Performance requests functionality coming soon...
      </div>
    </div>
  );
};