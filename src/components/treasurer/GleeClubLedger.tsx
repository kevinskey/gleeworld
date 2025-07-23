import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Filter, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useFinanceRecords } from '@/hooks/useFinanceRecords';
import { FinanceTable } from '@/components/finance/FinanceTable';
import { FinanceSummary } from '@/components/finance/FinanceSummary';

export const GleeClubLedger = () => {
  const { records, loading, error } = useFinanceRecords();
  const [dateFilter, setDateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Filter records based on selected filters
  const filteredRecords = records.filter(record => {
    if (dateFilter && !record.date.includes(dateFilter)) return false;
    if (categoryFilter && categoryFilter !== 'all' && record.category !== categoryFilter) return false;
    if (typeFilter && typeFilter !== 'all' && record.type !== typeFilter) return false;
    return true;
  });

  // Calculate summary statistics
  const totalIncome = filteredRecords
    .filter(r => ['credit', 'stipend'].includes(r.type))
    .reduce((sum, r) => sum + Math.abs(r.amount), 0);

  const totalExpenses = filteredRecords
    .filter(r => ['debit', 'payment', 'receipt'].includes(r.type))
    .reduce((sum, r) => sum + Math.abs(r.amount), 0);

  const netAmount = totalIncome - totalExpenses;
  const currentBalance = filteredRecords.length > 0 ? filteredRecords[0].balance : 0;

  // Get unique categories and types for filters
  const categories = [...new Set(records.map(r => r.category))];
  const types = [...new Set(records.map(r => r.type))];

  const clearFilters = () => {
    setDateFilter('');
    setCategoryFilter('all');
    setTypeFilter('all');
  };

  if (loading) {
    return <div className="text-center py-8">Loading financial records...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">Error loading financial records: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentBalance.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalIncome.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
            <DollarSign className={`h-4 w-4 ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${netAmount.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-auto"
            placeholder="Filter by date"
          />
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {types.map(type => (
                <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(dateFilter || categoryFilter || typeFilter) && (
            <Button variant="outline" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>

        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Ledger
        </Button>
      </div>

      {/* Finance Summary Component */}
      <FinanceSummary records={filteredRecords} loading={false} />

      {/* Finance Table with filtered records */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <FinanceTable records={filteredRecords} loading={false} onUpdate={async () => Promise.resolve(false)} onDelete={async () => Promise.resolve(false)} />
        </CardContent>
      </Card>

      {/* Footer Information */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {filteredRecords.length} of {records.length} transactions
        {(dateFilter || categoryFilter || typeFilter) && (
          <span> (filtered)</span>
        )}
      </div>
    </div>
  );
};