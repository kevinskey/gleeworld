
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, DollarSign, TrendingUp, Users, FileText, CreditCard } from "lucide-react";
import { FinancialOverview } from "./financial/FinancialOverview";
import { UserFinancialRecords } from "./financial/UserFinancialRecords";
import { PaymentTracking } from "./financial/PaymentTracking";
import { FinancialReports } from "./financial/FinancialReports";
import { StipendManagement } from "./financial/StipendManagement";
import { BudgetTracking } from "./financial/BudgetTracking";

export const FinancialSystem = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Financial System</h2>
          <p className="text-gray-600 mt-1">Comprehensive financial management and reporting</p>
        </div>
        <div className="flex items-center space-x-2">
          <Calculator className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            User Records
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="stipends" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Stipends
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Budget
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <FinancialOverview />
        </TabsContent>

        <TabsContent value="records" className="space-y-6">
          <UserFinancialRecords />
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <PaymentTracking />
        </TabsContent>

        <TabsContent value="stipends" className="space-y-6">
          <StipendManagement />
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <BudgetTracking />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <FinancialReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};
