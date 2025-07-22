import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

export const TourContracts = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Create and manage tour performance contracts
        </p>
        <Button size="sm" onClick={() => window.location.href = '/system?tab=contracts'}>
          <FileText className="h-4 w-4 mr-2" />
          Go to Contract Creator
        </Button>
      </div>
      <div className="text-center py-8 text-muted-foreground">
        Tour-specific contract management coming soon...
      </div>
    </div>
  );
};