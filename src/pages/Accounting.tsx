
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, DollarSign, FileText } from "lucide-react";
import { AccountingTable } from "@/components/accounting/AccountingTable";
import { AccountingSummary } from "@/components/accounting/AccountingSummary";
import { useAccountingData } from "@/hooks/useAccountingData";

const Accounting = () => {
  const { accountingData, loading, totalStipends, contractCount } = useAccountingData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="flex items-center space-x-2">
          <Calculator className="h-6 w-6 animate-spin" />
          <span>Loading accounting data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 md:py-8">
      <div className="max-w-7xl mx-auto px-2 md:px-4 space-y-4 md:space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-6 w-6" />
              <span>Contract Accounting</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AccountingSummary 
              totalStipends={totalStipends}
              contractCount={contractCount}
            />
            
            <div className="mt-6">
              <AccountingTable data={accountingData} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Accounting;
