import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Calculator, CreditCard, FileText, Coins, FileCheck } from 'lucide-react';
import { GleeLedgerModule } from '@/components/admin/financial/GleeLedgerModule';
import { BudgetsModule } from './BudgetsModule';
import { DuesCollectionModule } from './DuesCollectionModule';
import { InvoiceMakerModule } from './InvoiceMakerModule';
import StipendPaymentModule from './StipendPaymentModule';
import { ContractsModule } from './ContractsModule';

/**
 * Finance Hub — single entry point for admin financial operations.
 *
 * Tabs:
 *   - Ledger     — comprehensive financial ledger and accounting
 *   - Budgets    — budget planning and tracking
 *   - Dues       — dues collection and payment tracking
 *   - Invoices   — invoice generation (nonprofit donation invoices, etc.)
 *   - Stipends   — stipend payment management
 *
 * Replaces 5 separate module entries (budgets, dues-collection,
 * invoice-maker, glee-ledger, stipend-payments).
 *
 * Donations, merch-store, and contracts remain as standalone modules:
 *   - donations is member-facing (alumni / fan giving flow)
 *   - merch-store is retail/POS-driven
 *   - contracts is legal-document workflow, not core finance ops
 */
export const FinanceHub = () => {
  const [tab, setTab] = useState('ledger');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Finance</h2>
        <p className="text-sm text-muted-foreground">
          Ledger, budgets, dues, invoices, stipends, and contracts — all in one place.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="ledger" className="gap-1.5">
            <Database className="h-4 w-4" />
            Ledger
          </TabsTrigger>
          <TabsTrigger value="budgets" className="gap-1.5">
            <Calculator className="h-4 w-4" />
            Budgets
          </TabsTrigger>
          <TabsTrigger value="dues" className="gap-1.5">
            <CreditCard className="h-4 w-4" />
            Dues
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="stipends" className="gap-1.5">
            <Coins className="h-4 w-4" />
            Stipends
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-1.5">
            <FileCheck className="h-4 w-4" />
            Contracts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="m-0">
          <GleeLedgerModule />
        </TabsContent>
        <TabsContent value="budgets" className="m-0">
          <BudgetsModule />
        </TabsContent>
        <TabsContent value="dues" className="m-0">
          <DuesCollectionModule />
        </TabsContent>
        <TabsContent value="invoices" className="m-0">
          <InvoiceMakerModule />
        </TabsContent>
        <TabsContent value="stipends" className="m-0">
          <StipendPaymentModule />
        </TabsContent>
        <TabsContent value="contracts" className="m-0">
          <ContractsModule />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinanceHub;
