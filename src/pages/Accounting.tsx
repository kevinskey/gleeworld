
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";
import { AccountingTable } from "@/components/accounting/AccountingTable";
import { AccountingSummary } from "@/components/accounting/AccountingSummary";
import { AccountingFilters } from "@/components/accounting/AccountingFilters";
import { useAccountingData } from "@/hooks/useAccountingData";
import { useAccountingFiltering } from "@/hooks/useAccountingFiltering";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const Accounting = () => {
  const { accountingData, loading, totalStipends, contractCount } = useAccountingData();

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
      <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Calculator className="h-6 w-6 animate-spin" />
            <span>Loading accounting data...</span>
          </div>
        </div>
      </DashboardShell>
    </UniversalLayout>
    );
  }

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="space-y-4 md:space-y-6">
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
    </DashboardShell>
    </UniversalLayout>
  );
};

export default Accounting;
