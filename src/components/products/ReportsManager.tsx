import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart3, TrendingUp, DollarSign, ShoppingCart,
  Package, Download, RefreshCw, Calendar
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface ReportStats {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  refundTotal: number;
}

interface TopProduct {
  product_title: string;
  total_sold: number;
  total_revenue: number;
}

export const ReportsManager = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [stats, setStats] = useState<ReportStats>({
    totalRevenue: 0,
    orderCount: 0,
    averageOrderValue: 0,
    refundTotal: 0
  });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
      const endDate = endOfDay(new Date());

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('gw_orders')
        .select('id, total_amount, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('payment_status', 'paid');

      if (ordersError) throw ordersError;

      // Fetch refunds
      const { data: refunds } = await supabase
        .from('gw_refunds')
        .select('amount')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'succeeded');

      const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      const orderCount = orders?.length || 0;
      const refundTotal = refunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

      setStats({
        totalRevenue,
        orderCount,
        averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
        refundTotal
      });

      // Fetch top products
      const { data: orderItems } = await supabase
        .from('gw_order_items')
        .select(`
          product_title,
          quantity,
          unit_price,
          gw_orders!inner(created_at, payment_status)
        `)
        .gte('gw_orders.created_at', startDate.toISOString())
        .eq('gw_orders.payment_status', 'paid');

      // Aggregate top products
      const productMap = new Map<string, { sold: number; revenue: number }>();
      orderItems?.forEach(item => {
        const existing = productMap.get(item.product_title) || { sold: 0, revenue: 0 };
        productMap.set(item.product_title, {
          sold: existing.sold + item.quantity,
          revenue: existing.revenue + (item.quantity * Number(item.unit_price))
        });
      });

      const topProductsList = Array.from(productMap.entries())
        .map(([product_title, data]) => ({
          product_title,
          total_sold: data.sold,
          total_revenue: data.revenue
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 10);

      setTopProducts(topProductsList);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch report data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const exportToCSV = () => {
    // Create CSV content
    const headers = ['Product', 'Quantity Sold', 'Revenue'];
    const rows = topProducts.map(p => [
      p.product_title,
      p.total_sold.toString(),
      p.total_revenue.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({ title: "Success", description: "Report exported" });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReportData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatCurrency(stats.totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.orderCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatCurrency(stats.averageOrderValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Refunds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {loading ? '...' : formatCurrency(stats.refundTotal)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Top Products
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Loading report data...
                  </TableCell>
                </TableRow>
              ) : topProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No sales data for this period
                  </TableCell>
                </TableRow>
              ) : (
                topProducts.map((product, index) => (
                  <TableRow key={product.product_title}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{product.product_title}</TableCell>
                    <TableCell className="text-right">{product.total_sold}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(product.total_revenue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
