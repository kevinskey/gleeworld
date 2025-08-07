import React from 'react';
import { DollarSign } from 'lucide-react';

export const FinancesModule = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <DollarSign className="w-16 h-16 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Finances Module</h3>
        <p>Dues and payments will appear here</p>
      </div>
    </div>
  );
};