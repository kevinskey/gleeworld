import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedUserManagement } from "./admin/user-management/EnhancedUserManagement";
import { SystemSettings } from "./admin/SystemSettings";
import { AdminSummaryStats } from "./admin/AdminSummaryStats";
import { ActivityLogs } from "./admin/ActivityLogs";
import { ContractSignatureFixer } from "./admin/ContractSignatureFixer";
import { ReceiptsManagement } from "./admin/ReceiptsManagement";
import { AccountingCardCollapsible } from "./AccountingCardCollapsible";
import { BulkW9EmailDialog } from "./admin/BulkW9EmailDialog";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/useUsers";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useAccountingData } from "@/hooks/useAccountingData";
import { AccountingSummary } from "./accounting/AccountingSummary";
import { AccountingTable } from "./accounting/AccountingTable";
import { AccountingFilters } from "./accounting/AccountingFilters";
import { useAccountingFiltering } from "@/hooks/useAccountingFiltering";
import { Shield, Users, Settings, FileText, Activity, Receipt, Calculator, Mail, Music } from "lucide-react";
import { MusicManagement } from "./admin/MusicManagement";
import { ExecutiveBoardManager } from "./admin/ExecutiveBoardManager";
import { ProductManager } from "./admin/ProductManager";
// Square integration removed - using Stripe instead

interface AdminPanelProps {
  activeTab?: string;
}

export const AdminPanel = ({ activeTab }: AdminPanelProps) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
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

  const [bulkW9EmailOpen, setBulkW9EmailOpen] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass-card p-8">
          <p className="text-white/70">Please sign in to access the admin panel.</p>
        </div>
      </div>
    );
  }

  // Render content based on active tab from URL params, props, or path
  const currentPath = window.location.pathname;
  const urlTab = searchParams.get('tab');
  const currentTab = urlTab || activeTab || 
    (currentPath.includes('users') ? 'users' : 
     currentPath.includes('activity') ? 'activity' : 
     currentPath.includes('receipts') ? 'receipts' : 
     currentPath.includes('accounting') ? 'accounting' : 
     currentPath.includes('music') ? 'music' :
     currentPath.includes('executive-board') ? 'executive-board' :
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
          <>
            <AdminSummaryStats 
              users={users}
              loading={usersLoading}
              activityLogs={activityLogs}
            />
            <div className="mt-6 space-y-6">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">W9 Forms Management</h3>
                    <p className="text-white/70">Send W9 tax forms to users and track completion</p>
                  </div>
                  <Button
                    onClick={() => setBulkW9EmailOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send W9 Forms
                  </Button>
                </div>
              </div>
            </div>
          </>
        );
      case 'products':
        return <ProductManager />;
      case 'users':
        return (
          <EnhancedUserManagement 
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
            <div className="mb-8 glass-card p-6">
              <h2 className="text-3xl font-bold text-gradient mb-2">Accounting</h2>
              <p className="text-lg text-white/70">Contract financial overview and stipend tracking.</p>
            </div>
            
            <div className="glass-card">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <Calculator className="h-6 w-6 text-spelman-400" />
                  <h3 className="text-2xl font-semibold text-white">Contract Accounting</h3>
                </div>
              </div>
              <div className="p-6">
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
              </div>
            </div>
          </div>
        );
      case 'music':
        return <MusicManagement />;
      case 'executive-board':
        return (
          <ExecutiveBoardManager 
            users={users}
            loading={usersLoading}
            onRefetch={refetchUsers}
          />
        );
      case 'settings':
        return <SystemSettings />;
      default:
        return (
          <>
            <AdminSummaryStats 
              users={users}
              loading={usersLoading}
              activityLogs={activityLogs}
            />
            <div className="mt-6">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">W9 Forms Management</h3>
                    <p className="text-white/70">Send W9 tax forms to users and track completion</p>
                  </div>
                  <Button
                    onClick={() => setBulkW9EmailOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send W9 Forms
                  </Button>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
      
      <BulkW9EmailDialog
        open={bulkW9EmailOpen}
        onOpenChange={setBulkW9EmailOpen}
        totalUsers={users.length}
      />
    </div>
  );
};
