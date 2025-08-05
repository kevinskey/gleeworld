import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Download, FileText, TrendingUp, DollarSign, Filter, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MonthlyData {
  month: string;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  transactionCount: number;
  categories: { [key: string]: number };
}

interface FinancialTransaction {
  id: string;
  date: string;
  description: string;
  type: string;
  category: string;
  amount: number;
  balance: number;
  reference?: string;
  notes?: string;
}

export const MonthlyStatements = () => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');
  const { toast } = useToast();

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy')
    };
  });

  const fetchMonthlyData = async () => {
    if (!selectedMonth) return;
    
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-31`;

      // Fetch transactions from both tables
      const [financeRecordsResponse, runningLedgerResponse] = await Promise.all([
        supabase
          .from('finance_records')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true }),
        
        supabase
          .from('gw_running_ledger')
          .select('*')
          .gte('entry_date', startDate)
          .lte('entry_date', endDate)
          .order('entry_date', { ascending: true })
      ]);

      if (financeRecordsResponse.error) throw financeRecordsResponse.error;
      if (runningLedgerResponse.error) throw runningLedgerResponse.error;

      // Combine and normalize data
      const financeRecords = (financeRecordsResponse.data || []).map(record => ({
        id: record.id,
        date: record.date,
        description: record.description,
        type: record.type,
        category: record.category,
        amount: parseFloat(record.amount.toString()),
        balance: parseFloat(record.balance.toString()),
        reference: record.reference,
        notes: record.notes
      }));

      const ledgerRecords = (runningLedgerResponse.data || []).map(record => ({
        id: record.id,
        date: record.entry_date,
        description: record.description,
        type: record.transaction_type,
        category: record.category || 'General',
        amount: parseFloat(record.amount.toString()),
        balance: parseFloat(record.running_balance.toString()),
        reference: record.reference_number,
        notes: record.notes
      }));

      const allTransactions = [...financeRecords, ...ledgerRecords]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setTransactions(allTransactions);

      // Calculate monthly summary
        const income = allTransactions
          .filter(t => t.type === 'credit' || t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const expenses = allTransactions
          .filter(t => t.type === 'debit' || t.type === 'expense')
          .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

      // Group by categories
      const categories: { [key: string]: number } = {};
        allTransactions.forEach(t => {
          if (!categories[t.category]) categories[t.category] = 0;
          categories[t.category] += Math.abs(Number(t.amount));
        });

      setMonthlyData({
        month: format(new Date(`${year}-${month}-01`), 'MMMM'),
        year: parseInt(year),
        totalIncome: income,
        totalExpenses: expenses,
        netIncome: income - expenses,
        transactionCount: allTransactions.length,
        categories
      });

    } catch (error) {
      console.error('Error fetching monthly data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch monthly financial data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedMonth]);

  const downloadStatement = async () => {
    if (!monthlyData || !transactions.length) {
      toast({
        title: "No Data",
        description: "No financial data available for the selected month",
        variant: "destructive"
      });
      return;
    }

    try {
      let csvContent = '';
      
      if (reportType === 'summary') {
        // Generate summary report
        csvContent = `Monthly Financial Statement - ${monthlyData.month} ${monthlyData.year}\n\n`;
        csvContent += `SUMMARY\n`;
        csvContent += `Total Income,$${monthlyData.totalIncome.toFixed(2)}\n`;
        csvContent += `Total Expenses,$${monthlyData.totalExpenses.toFixed(2)}\n`;
        csvContent += `Net Income,$${monthlyData.netIncome.toFixed(2)}\n`;
        csvContent += `Total Transactions,${monthlyData.transactionCount}\n\n`;
        
        csvContent += `CATEGORIES\n`;
        Object.entries(monthlyData.categories).forEach(([category, amount]) => {
          csvContent += `${category},$${amount.toFixed(2)}\n`;
        });
      } else {
        // Generate detailed report
        csvContent = `Date,Description,Type,Category,Amount,Balance,Reference,Notes\n`;
        transactions.forEach(t => {
          csvContent += `${t.date},"${t.description}",${t.type},${t.category},$${t.amount.toFixed(2)},$${t.balance.toFixed(2)},"${t.reference || ''}","${t.notes || ''}"\n`;
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `monthly-statement-${selectedMonth}-${reportType}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Complete",
        description: `Monthly statement downloaded successfully`,
      });
    } catch (error) {
      console.error('Error downloading statement:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download monthly statement",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Monthly Financial Statements
              </CardTitle>
              <CardDescription>
                Generate comprehensive monthly financial reports and statements
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={reportType} onValueChange={(value: 'summary' | 'detailed') => setReportType(value)}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={downloadStatement} disabled={loading || !monthlyData}>
                <Download className="h-4 w-4 mr-2" />
                Download Statement
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading financial data...</p>
            </div>
          </CardContent>
        </Card>
      ) : monthlyData ? (
        <>
          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">${monthlyData.totalIncome.toFixed(2)}</div>
                <Badge variant="secondary" className="mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Revenue
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">${monthlyData.totalExpenses.toFixed(2)}</div>
                <Badge variant="secondary" className="mt-1">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Expenses
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Net Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${monthlyData.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ${monthlyData.netIncome.toFixed(2)}
                </div>
                <Badge variant={monthlyData.netIncome >= 0 ? "default" : "destructive"} className="mt-1">
                  {monthlyData.netIncome >= 0 ? "Profit" : "Loss"}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthlyData.transactionCount}</div>
                <Badge variant="outline" className="mt-1">
                  {monthlyData.month} {monthlyData.year}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>Spending by category for {monthlyData.month} {monthlyData.year}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(monthlyData.categories).map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">{category}</span>
                    <span className="font-bold">${amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          {reportType === 'detailed' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Transaction Details
                </CardTitle>
                <CardDescription>All transactions for {monthlyData.month} {monthlyData.year}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{transaction.description}</span>
                          <Badge variant={transaction.type === 'credit' || transaction.type === 'income' ? 'default' : 'destructive'}>
                            {transaction.type}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {format(new Date(transaction.date), 'MMM dd, yyyy')} • {transaction.category}
                          {transaction.reference && <span> • Ref: {transaction.reference}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${transaction.type === 'credit' || transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'credit' || transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Balance: ${transaction.balance.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-gray-600">No financial records found for the selected month.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};