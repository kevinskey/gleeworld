
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
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Financial System</h2>
          <p className="text-gray-600 mt-1 text-sm md:text-base">Comprehensive financial management and reporting</p>
        </div>
        <div className="flex items-center space-x-2">
          <Calculator className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 h-auto p-1">
          <TabsTrigger value="overview" className="flex items-center gap-1 md:gap-2 p-2 md:p-3 text-xs md:text-sm">
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center gap-1 md:gap-2 p-2 md:p-3 text-xs md:text-sm">
            <FileText className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Records</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1 md:gap-2 p-2 md:p-3 text-xs md:text-sm">
            <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="stipends" className="flex items-center gap-1 md:gap-2 p-2 md:p-3 text-xs md:text-sm">
            <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Stipends</span>
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-1 md:gap-2 p-2 md:p-3 text-xs md:text-sm">
            <Calculator className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Budget</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1 md:gap-2 p-2 md:p-3 text-xs md:text-sm">
            <Users className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          <FinancialOverview />
        </TabsContent>

        <TabsContent value="records" className="space-y-4 md:space-y-6">
          <UserFinancialRecords />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4 md:space-y-6">
          <PaymentTracking />
        </TabsContent>

        <TabsContent value="stipends" className="space-y-4 md:space-y-6">
          <StipendManagement />
        </TabsContent>

        <TabsContent value="budget" className="space-y-4 md:space-y-6">
          <BudgetTracking />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 md:space-y-6">
          <FinancialReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};
