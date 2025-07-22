import React from 'react';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';

export const TourStipends = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Manage tour performance stipends and payments
        </p>
        <Button size="sm" onClick={() => window.location.href = '/treasurer'}>
          <DollarSign className="h-4 w-4 mr-2" />
          Go to Treasurer Dashboard
        </Button>
      </div>
      <div className="text-center py-8 text-muted-foreground">
        Tour stipend management coming soon...
      </div>
    </div>
  );
};