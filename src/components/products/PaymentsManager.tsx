import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, Search, RefreshCw, ExternalLink, 
  DollarSign, RotateCcw, AlertTriangle, TrendingUp
} from 'lucide-react';
import { format, subDays } from 'date-fns';

interface Payment {
  id: string;
  order_id: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  status: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  receipt_url: string | null;
  created_at: string;
  gw_orders?: {
    order_number: string;
    customer_name: string;
    customer_email: string;
  };
}

export const PaymentsManager = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  // Stats
  const [stats, setStats] = useState({
    paidToday: 0,
    refunds30d: 0,
    disputesOpen: 0,
    net30d: 0
  });

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_payments')
        .select(`
          *,
          gw_orders (order_number, customer_name, customer_email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thirtyDaysAgo = subDays(new Date(), 30);

      // Paid today
      const { data: todayPayments } = await supabase
        .from('gw_payments')
        .select('amount')
        .eq('status', 'succeeded')
        .gte('created_at', today.toISOString());

      const paidToday = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Refunds in last 30 days
      const { data: refunds } = await supabase
        .from('gw_refunds')
        .select('amount')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const refunds30d = refunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

      // Open disputes
      const { count: disputesOpen } = await supabase
        .from('gw_disputes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'needs_response');

      // Net 30 days
      const { data: net30Payments } = await supabase
        .from('gw_payments')
        .select('amount')
        .eq('status', 'succeeded')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const net30d = (net30Payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0) - refunds30d;

      setStats({
        paidToday,
        refunds30d,
        disputesOpen: disputesOpen || 0,
        net30d
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      requires_payment: { variant: 'outline', label: 'Pending' },
      processing: { variant: 'secondary', label: 'Processing' },
      succeeded: { variant: 'default', label: 'Succeeded' },
      canceled: { variant: 'outline', label: 'Canceled' },
      failed: { variant: 'destructive', label: 'Failed' }
    };
    const config = statusConfig[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.gw_orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.gw_orders?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.stripe_payment_intent_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Paid Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.paidToday)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Refunds (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.refunds30d)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Disputes Open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.disputesOpen}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Net (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.net30d)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by order #, customer, or payment intent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="requires_payment">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="succeeded">Succeeded</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchPayments}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stripe Ref</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading payments...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No payments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.gw_orders?.order_number || '-'}
                    </TableCell>
                    <TableCell>{payment.gw_orders?.customer_name || '-'}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount, payment.currency)}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {payment.stripe_payment_intent_id 
                        ? `${payment.stripe_payment_intent_id.slice(0, 20)}...`
                        : '-'}
                    </TableCell>
                    <TableCell>{payment.payment_method || '-'}</TableCell>
                    <TableCell>
                      {format(new Date(payment.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {payment.receipt_url && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(payment.receipt_url!, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
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
