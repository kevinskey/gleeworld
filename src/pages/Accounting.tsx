
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, DollarSign, FileText, ArrowLeft, Home, Users, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AccountingTable } from "@/components/accounting/AccountingTable";
import { AccountingSummary } from "@/components/accounting/AccountingSummary";
import { AccountingFilters } from "@/components/accounting/AccountingFilters";
import { useAccountingData } from "@/hooks/useAccountingData";
import { useAccountingFiltering } from "@/hooks/useAccountingFiltering";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";

const Accounting = () => {
  const { accountingData, loading, totalStipends, contractCount } = useAccountingData();
  const { user, signOut } = useAuth();
  const { userProfile } = useUserProfile(user);
  const navigate = useNavigate();

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

  const handleSort = (column: string) => {
    if (sortBy === column) {
      handleSortChange(column, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      handleSortChange(column, 'desc');
    }
  };

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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Accounting</h1>
                <p className="text-sm text-gray-500">Contract financial overview</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <nav className="hidden md:flex items-center space-x-1">
                <Button variant="ghost" size="sm" asChild className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                  <Link to="/dashboard" className="flex items-center space-x-2">
                    <Home className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                  <Link to="/activity-logs" className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Activity Logs</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                  <Link to="/admin-signing" className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Admin Signing</span>
                  </Link>
                </Button>
              </nav>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Welcome, {userProfile?.display_name || user?.email}</span>
              </div>
              
              <Button 
                onClick={signOut} 
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="py-4 md:py-8">
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
      </div>
    </div>
  );
};

export default Accounting;
