import React from 'react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { ModuleProps } from '@/types/unified-modules';
import { DollarSign, Calculator, TrendingUp, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const TreasurerModule = ({ user, isFullPage }: ModuleProps) => {
  const navigate = useNavigate();

  return (
    <ModuleWrapper
      id="treasurer"
      title="Treasurer Hub"
      description="Financial management & registers"
      icon={DollarSign}
      iconColor="green"
      fullPage={!!isFullPage}
      defaultOpen={!!isFullPage}
      headerActions={
        <Button size="sm" onClick={() => navigate('/treasurer')} aria-label="Open Treasurer Hub">
          Open
        </Button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Button variant="outline" onClick={() => navigate('/budgets')} aria-label="Go to Budgets">
          <Calculator className="h-4 w-4 mr-2" /> Budgets
        </Button>
        <Button variant="outline" onClick={() => navigate('/accounting')} aria-label="Go to Accounting">
          <TrendingUp className="h-4 w-4 mr-2" /> Accounting
        </Button>
        <Button variant="outline" onClick={() => navigate('/payments')} aria-label="Go to Payments">
          <Receipt className="h-4 w-4 mr-2" /> Payments
        </Button>
      </div>
    </ModuleWrapper>
  );
};
