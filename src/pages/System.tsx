
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemDashboard } from "@/components/admin/SystemDashboard";
import { UserManagement } from "@/components/admin/UserManagement";
import { W9Management } from "@/components/admin/W9Management";
import { FinancialSystem } from "@/components/admin/FinancialSystem";
import { BudgetTracking } from "@/components/admin/financial/BudgetTracking";
import { ContractManagement } from "@/components/admin/ContractManagement";
import { MusicManagement } from "@/components/admin/MusicManagement";
import { CalendarManagement } from "@/components/admin/CalendarManagement";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useUsers } from "@/hooks/useUsers";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useAuth } from "@/contexts/AuthContext";
import { Shield } from "lucide-react";

const System = () => {
  const { user } = useAuth();
  const { users, loading, error, refetch } = useUsers();
  const { logs: activityLogs } = useActivityLogs();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || "dashboard";
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'create-contract':
        setActiveTab('contracts');
        break;
      case 'add-user':
        setActiveTab('users');
        break;
      case 'add-budget':
        setActiveTab('budget');
        break;
      case 'pay-user':
        setActiveTab('payments');
        break;
      case 'run-report':
        setActiveTab('reports');
        break;
      case 'system':
        console.log('System configuration');
        break;
      default:
        break;
    }
  };

  if (!user) {
    return (
      <UniversalLayout>
        <div className="container mx-auto px-4 py-6">
          <Card className="bg-white shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2 text-gray-900">Authentication Required</h2>
                <p className="text-gray-600">Please sign in to access the system administration panel.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout 
      containerized={false}
      systemActiveTab={activeTab}
      onSystemTabChange={setActiveTab}
    >
      <div className="container mx-auto px-2 sm:px-4 py-3">
        {/* Content based on active tab */}
        <div className="space-y-4">
          {activeTab === "dashboard" && (
            <SystemDashboard 
              users={users}
              loading={loading}
              activityLogs={activityLogs}
              onQuickAction={handleQuickAction}
            />
          )}

          {activeTab === "users" && (
            <UserManagement 
              users={users} 
              loading={loading} 
              error={error} 
              onRefetch={refetch}
            />
          )}

          {activeTab === "contracts" && (
            <ContractManagement />
          )}

          {activeTab === "w9" && (
            <W9Management />
          )}

          {(activeTab === "payments" || activeTab === "financial" || activeTab === "financial-overview" || 
            activeTab === "user-records" || activeTab === "payment-tracking" || activeTab === "stipends" || 
            activeTab === "reports") && (
            <FinancialSystem initialTab={activeTab} />
          )}

          {activeTab === "budget" && (
            <BudgetTracking />
          )}

          {activeTab === "calendar" && (
            <CalendarManagement />
          )}

          {activeTab === "music" && (
            <MusicManagement />
          )}
        </div>
      </div>
    </UniversalLayout>
  );
};

export default System;
