import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  CreditCard, Search, RefreshCw, ExternalLink, 
  DollarSign, RotateCcw, AlertTriangle, TrendingUp,
  Loader2, Eye
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
    total_amount: number;
    payment_status: string;
  };
}

interface Refund {
  id: string;
  order_id: string;
  stripe_refund_id: string | null;
  amount: number;
  reason: string | null;
  status: string;
  created_at: string;
  gw_orders?: {
    order_number: string;
    customer_name: string;
  };
}

interface Dispute {
  id: string;
  stripe_dispute_id: string | null;
  order_id: string | null;
  amount: number;
  reason: string | null;
  status: string;
  evidence_due_by: string | null;
  created_at: string;
  gw_orders?: {
    order_number: string;
    customer_name: string;
  };
}

export const PaymentsManager = () => {
  const [activeTab, setActiveTab] = useState('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  // Refund dialog state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    paidToday: 0,
    refunds30d: 0,
    disputesOpen: 0,
    net30d: 0
  });

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'payments') {
        const { data, error } = await supabase
          .from('gw_payments')
          .select(`
            *,
            gw_orders (order_number, customer_name, customer_email, total_amount, payment_status)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPayments(data || []);
      } else if (activeTab === 'refunds') {
        const { data, error } = await supabase
          .from('gw_refunds')
          .select(`
            *,
            gw_orders (order_number, customer_name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRefunds(data || []);
      } else if (activeTab === 'disputes') {
        const { data, error } = await supabase
          .from('gw_disputes')
          .select(`
            *,
            gw_orders (order_number, customer_name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDisputes(data || []);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch ${activeTab}`,
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

      const { data: todayPayments } = await supabase
        .from('gw_payments')
        .select('amount')
        .eq('status', 'succeeded')
        .gte('created_at', today.toISOString());

      const paidToday = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const { data: refundsData } = await supabase
        .from('gw_refunds')
        .select('amount')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const refunds30d = refundsData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

      const { count: disputesOpen } = await supabase
        .from('gw_disputes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'needs_response');

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

  const openRefundDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setRefundAmount(payment.amount.toString());
    setRefundDialogOpen(true);
  };

  const handleIssueRefund = async () => {
    if (!selectedPayment?.gw_orders) return;
    
    setProcessingRefund(true);
    try {
      // Find order ID from the payment
      const { data: order } = await supabase
        .from('gw_orders')
        .select('id')
        .eq('order_number', selectedPayment.gw_orders.order_number)
        .single();

      if (!order) throw new Error('Order not found');

      const refundAmountCents = Math.round(parseFloat(refundAmount) * 100);

      const { data, error } = await supabase.functions.invoke('create-refund', {
        body: { 
          order_id: order.id,
          amount: refundAmountCents,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Refund Issued",
        description: `$${data.amount.toFixed(2)} refunded successfully`,
      });

      setRefundDialogOpen(false);
      setSelectedPayment(null);
      setRefundAmount('');
      fetchData();
      fetchStats();
    } catch (error: any) {
      toast({
        title: "Refund Failed",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    } finally {
      setProcessingRefund(false);
    }
  };

  const getStatusBadge = (status: string, type: 'payment' | 'refund' | 'dispute' = 'payment') => {
    const configs: Record<string, Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }>> = {
      payment: {
        requires_payment: { variant: 'outline', label: 'Pending' },
        processing: { variant: 'secondary', label: 'Processing' },
        succeeded: { variant: 'default', label: 'Succeeded' },
        canceled: { variant: 'outline', label: 'Canceled' },
        failed: { variant: 'destructive', label: 'Failed' }
      },
      refund: {
        pending: { variant: 'secondary', label: 'Pending' },
        succeeded: { variant: 'default', label: 'Succeeded' },
        failed: { variant: 'destructive', label: 'Failed' },
        canceled: { variant: 'outline', label: 'Canceled' }
      },
      dispute: {
        needs_response: { variant: 'destructive', label: 'Needs Response' },
        under_review: { variant: 'secondary', label: 'Under Review' },
        won: { variant: 'default', label: 'Won' },
        lost: { variant: 'destructive', label: 'Lost' },
        warning_needs_response: { variant: 'destructive', label: 'Warning' }
      }
    };
    const config = configs[type]?.[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.gw_orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.gw_orders?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.stripe_payment_intent_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
            <div className="text-2xl font-bold text-destructive">{stats.disputesOpen}</div>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="refunds" className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Refunds
          </TabsTrigger>
          <TabsTrigger value="disputes" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Disputes
            {stats.disputesOpen > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                {stats.disputesOpen}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
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
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Payments Table */}
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
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
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
                        <TableCell>{getStatusBadge(payment.status, 'payment')}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.stripe_payment_intent_id 
                            ? `${payment.stripe_payment_intent_id.slice(0, 20)}...`
                            : '-'}
                        </TableCell>
                        <TableCell className="capitalize">{payment.payment_method || '-'}</TableCell>
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
                                title="View Receipt"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                            {payment.status === 'succeeded' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openRefundDialog(payment)}
                                title="Issue Refund"
                              >
                                <RotateCcw className="w-4 h-4" />
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
        </TabsContent>

        <TabsContent value="refunds" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stripe Ref</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : refunds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No refunds found
                      </TableCell>
                    </TableRow>
                  ) : (
                    refunds.map((refund) => (
                      <TableRow key={refund.id}>
                        <TableCell className="font-medium">
                          {refund.gw_orders?.order_number || '-'}
                        </TableCell>
                        <TableCell>{refund.gw_orders?.customer_name || '-'}</TableCell>
                        <TableCell className="font-medium text-destructive">
                          -{formatCurrency(refund.amount)}
                        </TableCell>
                        <TableCell className="capitalize">{refund.reason || '-'}</TableCell>
                        <TableCell>{getStatusBadge(refund.status, 'refund')}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {refund.stripe_refund_id 
                            ? `${refund.stripe_refund_id.slice(0, 20)}...`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(refund.created_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Evidence Due</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : disputes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No disputes found
                      </TableCell>
                    </TableRow>
                  ) : (
                    disputes.map((dispute) => (
                      <TableRow key={dispute.id}>
                        <TableCell className="font-medium">
                          {dispute.gw_orders?.order_number || '-'}
                        </TableCell>
                        <TableCell>{dispute.gw_orders?.customer_name || '-'}</TableCell>
                        <TableCell className="font-medium text-destructive">
                          {formatCurrency(dispute.amount)}
                        </TableCell>
                        <TableCell className="capitalize">{dispute.reason?.replace(/_/g, ' ') || '-'}</TableCell>
                        <TableCell>{getStatusBadge(dispute.status, 'dispute')}</TableCell>
                        <TableCell>
                          {dispute.evidence_due_by 
                            ? format(new Date(dispute.evidence_due_by), 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(dispute.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {dispute.stripe_dispute_id && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(`https://dashboard.stripe.com/disputes/${dispute.stripe_dispute_id}`, '_blank')}
                              title="View in Stripe"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>
              Refund payment for order {selectedPayment?.gw_orders?.order_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer</span>
                <span>{selectedPayment?.gw_orders?.customer_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Original Amount</span>
                <span className="font-medium">
                  {formatCurrency(selectedPayment?.amount || 0, selectedPayment?.currency || 'usd')}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refundAmount">Refund Amount ($)</Label>
              <Input
                id="refundAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={selectedPayment?.amount || 0}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Enter refund amount"
              />
              <p className="text-xs text-muted-foreground">
                Leave as full amount for complete refund, or enter partial amount
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleIssueRefund}
              disabled={processingRefund || !refundAmount || parseFloat(refundAmount) <= 0}
            >
              {processingRefund && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Issue Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
