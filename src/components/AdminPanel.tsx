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
import { Shield, Users, Settings, FileText, Activity, Receipt, Calculator, Mail, Music, Megaphone, Share2, Wrench, Calendar } from "lucide-react";
import { MusicManagement } from "./admin/MusicManagement";
import { SocialPushDashboard } from "./admin/SocialPushDashboard";
import { ProductManager } from "./admin/ProductManager";
import { AnnouncementManagement } from "./admin/AnnouncementManagement";
import { AdminPanelHeader } from "./admin/AdminPanelHeader";
import { PermissionsPanel } from "./admin/PermissionsPanel";
import { MasterCalendar } from "./admin/MasterCalendar";
import { SchedulingDashboard } from "./admin/SchedulingDashboard";
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
     currentPath.includes('announcements') ? 'announcements' :
     currentPath.includes('products') ? 'products' :
     currentPath.includes('social') ? 'social' :
     currentPath.includes('calendar') ? 'calendar' :
     currentPath.includes('scheduling') ? 'scheduling' :
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
          <div className="space-y-6">
            {/* Community Hub */}
            <Card className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border-primary/10 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Users className="h-5 w-5" />
                  Community Hub
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Connect with the Spelman Glee Club community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Placeholder for community features */}
                  <div className="text-center py-8 col-span-full">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Community features will be added here
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Admin Tools Window */}
            <Card className="bg-gradient-to-br from-secondary/5 via-primary/5 to-accent/5 border-secondary/10 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-secondary-foreground">
                  <Wrench className="h-5 w-5" />
                  Admin Tools
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Specialized administrative modules and tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Placeholder for future modules */}
                  <div className="text-center py-8 col-span-full">
                    <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Admin tools modules will be added here
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
      case 'calendar':
        return <MasterCalendar />;
      case 'scheduling':
        return <SchedulingDashboard />;
      case 'accounting':
        return (
          <div className="space-y-4 md:space-y-6">
            <div className="mb-6 md:mb-8 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4 md:p-6 border border-primary/10">
              <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">Accounting</h2>
              <p className="text-base md:text-lg text-muted-foreground">Contract financial overview and stipend tracking.</p>
            </div>
            
            <Card className="bg-card border-border shadow-lg">
              <div className="p-4 md:p-6 border-b border-border">
                <div className="flex items-center space-x-2">
                  <Calculator className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  <h3 className="text-xl md:text-2xl font-semibold text-card-foreground">Contract Accounting</h3>
                </div>
              </div>
              <div className="p-4 md:p-6 overflow-x-auto">
                <AccountingSummary 
                  totalStipends={totalStipends}
                  contractCount={contractCount}
                />
                
                <div className="mt-4 md:mt-6 space-y-4">
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
            </Card>
          </div>
        );
      case 'music':
        return <MusicManagement />;
      case 'announcements':
        return <AnnouncementManagement />;
      case 'social':
        return <SocialPushDashboard />;
      case 'permissions':
        return <PermissionsPanel />;
      case 'settings':
        return <SystemSettings />;
      default:
        return (
          <div className="space-y-6">
            <AdminSummaryStats 
              users={users}
              loading={usersLoading}
              activityLogs={activityLogs}
            />
            <AdminPanelHeader 
              onSendW9Forms={() => setBulkW9EmailOpen(true)}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 min-h-screen w-full bg-background text-foreground">
      <div className="max-w-full overflow-x-hidden">
        {renderContent()}
      </div>
      
      <BulkW9EmailDialog
        open={bulkW9EmailOpen}
        onOpenChange={setBulkW9EmailOpen}
        totalUsers={users.length}
      />
    </div>
  );
};
