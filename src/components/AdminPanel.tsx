
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserManagement } from "./admin/UserManagement";
import { SystemSettings } from "./admin/SystemSettings";
import { AdminSummaryStats } from "./admin/AdminSummaryStats";
import { ActivityLogs } from "./admin/ActivityLogs";
import { ContractSignatureFixer } from "./admin/ContractSignatureFixer";
import { ReceiptsManagement } from "./admin/ReceiptsManagement";
import { AccountingCardCollapsible } from "./AccountingCardCollapsible";
import { useUsers } from "@/hooks/useUsers";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useAccountingData } from "@/hooks/useAccountingData";
import { AccountingSummary } from "./accounting/AccountingSummary";
import { AccountingTable } from "./accounting/AccountingTable";
import { AccountingFilters } from "./accounting/AccountingFilters";
import { useAccountingFiltering } from "@/hooks/useAccountingFiltering";
import { Shield, Users, Settings, FileText, Activity, Receipt, Calculator } from "lucide-react";

interface AdminPanelProps {
  activeTab?: string;
}

export const AdminPanel = ({ activeTab }: AdminPanelProps) => {
  const { user } = useAuth();
  
  // Fetch users data
  const { users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers();
  
  // Only fetch activity logs when the activity tab is active
  const { logs: activityLogs, loading: logsLoading } = useActivityLogs();

  // Fetch accounting data when accounting tab is active
  const { accountingData, loading: accountingLoading, totalStipends, contractCount } = useAccountingData();
  
  const {
    filteredAndSortedData,
    sortBy,
    sortOrder,
    filterByStatus,
    filterByDateRange,
    filterByTemplate,
    searchTerm,
    availableStatuses,
    availableTemplates,
    handleSortChange,
    handleFilterChange
  } = useAccountingFiltering(accountingData);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">Please sign in to access the admin panel.</p>
      </div>
    );
  }

  // Render content based on active tab from URL or parent
  const currentPath = window.location.pathname;
  const currentTab = activeTab || 
    (currentPath.includes('users') ? 'users' : 
     currentPath.includes('activity') ? 'activity' : 
     currentPath.includes('receipts') ? 'receipts' : 
     currentPath.includes('accounting') ? 'accounting' : 
     currentPath.includes('settings') ? 'settings' : 'overview');

  const handleSort = (column: string) => {
    if (sortBy === column) {
      handleSortChange(column, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      handleSortChange(column, 'desc');
    }
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <AdminSummaryStats 
            users={users}
            loading={usersLoading}
            activityLogs={activityLogs}
          />
        );
      case 'users':
        return (
          <UserManagement 
            users={users}
            loading={usersLoading}
            error={usersError}
            onRefetch={refetchUsers}
          />
        );
      case 'activity':
        return <ActivityLogs />;
      case 'contracts':
        return <ContractSignatureFixer />;
      case 'receipts':
        return <ReceiptsManagement />;
      case 'accounting':
        return (
          <div className="space-y-6">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Accounting</h2>
              <p className="text-lg text-gray-600">Contract financial overview and stipend tracking.</p>
            </div>
            
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
                
                <div className="mt-6 space-y-4">
                  <AccountingFilters
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    filterByStatus={filterByStatus}
                    filterByDateRange={filterByDateRange}
                    filterByTemplate={filterByTemplate}
                    searchTerm={searchTerm}
                    onSortChange={handleSortChange}
                    onFilterChange={handleFilterChange}
                    availableStatuses={availableStatuses}
                    availableTemplates={availableTemplates}
                  />
                  
                  <AccountingTable 
                    data={filteredAndSortedData}
                    totalCount={accountingData.length}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'settings':
        return <SystemSettings />;
      default:
        return (
          <AdminSummaryStats 
            users={users}
            loading={usersLoading}
            activityLogs={activityLogs}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
};
