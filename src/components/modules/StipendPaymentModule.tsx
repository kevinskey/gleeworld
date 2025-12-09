import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  DollarSign, 
  Download, 
  Plus, 
  Check, 
  Clock, 
  XCircle, 
  FileText, 
  Users,
  Upload,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';

interface StipendPayment {
  id: string;
  user_id: string | null;
  student_name: string;
  student_email: string | null;
  student_phone: string | null;
  student_cashtag: string | null;
  event_name: string;
  event_date: string | null;
  source_type: string;
  source_id: string | null;
  amount: number;
  payment_method: string;
  budget_source: string | null;
  notes: string | null;
  status: string;
  approved_at: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  created_at: string;
}

interface SurveyResponse {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  attended: boolean;
}

const StipendPaymentModule = () => {
  const [payments, setPayments] = useState<StipendPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [importAmount, setImportAmount] = useState('');
  const [importBudgetSource, setImportBudgetSource] = useState('');
  const { toast } = useToast();

  // New payment form state
  const [newPayment, setNewPayment] = useState({
    student_name: '',
    student_email: '',
    student_phone: '',
    student_cashtag: '',
    event_name: '',
    event_date: '',
    amount: '',
    payment_method: 'cash_app',
    budget_source: '',
    notes: ''
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stipend_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load stipend payments',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSurveyResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('tree_lighting_survey_responses')
        .select('id, user_id, attended')
        .eq('attended', true);

      if (error) throw error;

      // Get profile info for each response
      const enrichedData: SurveyResponse[] = [];
      for (const response of data || []) {
        const { data: profile } = await supabase
          .from('gw_profiles')
          .select('full_name, email, phone_number')
          .eq('user_id', response.user_id)
          .single();

        if (profile) {
          enrichedData.push({
            ...response,
            full_name: profile.full_name || 'Unknown',
            email: profile.email || '',
            phone_number: profile.phone_number
          });
        }
      }
      setSurveyResponses(enrichedData);
    } catch (error) {
      console.error('Error fetching survey responses:', error);
    }
  };

  const handleCreatePayment = async () => {
    if (!newPayment.student_name || !newPayment.event_name || !newPayment.amount) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in student name, event name, and amount',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('stipend_payments').insert({
        student_name: newPayment.student_name,
        student_email: newPayment.student_email || null,
        student_phone: newPayment.student_phone || null,
        student_cashtag: newPayment.student_cashtag || null,
        event_name: newPayment.event_name,
        event_date: newPayment.event_date || null,
        amount: parseFloat(newPayment.amount),
        payment_method: newPayment.payment_method,
        budget_source: newPayment.budget_source || null,
        notes: newPayment.notes || null,
        source_type: 'manual',
        created_by: user?.id
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Payment record created' });
      setShowAddDialog(false);
      setNewPayment({
        student_name: '',
        student_email: '',
        student_phone: '',
        student_cashtag: '',
        event_name: '',
        event_date: '',
        amount: '',
        payment_method: 'cash_app',
        budget_source: '',
        notes: ''
      });
      fetchPayments();
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create payment record',
        variant: 'destructive'
      });
    }
  };

  const handleImportFromSurvey = async () => {
    if (!importAmount || surveyResponses.length === 0) {
      toast({
        title: 'Missing information',
        description: 'Please set an amount and ensure there are survey responses',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const amount = parseFloat(importAmount);

      const paymentsToInsert = surveyResponses.map(response => ({
        user_id: response.user_id,
        student_name: response.full_name,
        student_email: response.email,
        student_phone: response.phone_number,
        event_name: 'Christmas Tree Lighting 2024',
        event_date: '2024-12-08',
        amount: amount,
        payment_method: 'cash_app',
        budget_source: importBudgetSource || null,
        source_type: 'survey',
        source_id: response.id,
        created_by: user?.id
      }));

      const { error } = await supabase.from('stipend_payments').insert(paymentsToInsert);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Created ${paymentsToInsert.length} payment records`
      });
      setShowImportDialog(false);
      setImportAmount('');
      setImportBudgetSource('');
      fetchPayments();
    } catch (error) {
      console.error('Error importing:', error);
      toast({
        title: 'Error',
        description: 'Failed to import survey responses',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateStatus = async (paymentId: string, newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updates: any = { status: newStatus };

      if (newStatus === 'approved') {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
      } else if (newStatus === 'paid') {
        updates.paid_by = user?.id;
        updates.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('stipend_payments')
        .update(updates)
        .eq('id', paymentId);

      if (error) throw error;

      toast({ title: 'Success', description: `Status updated to ${newStatus}` });
      fetchPayments();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const handleBulkMarkPaid = async () => {
    if (selectedPayments.size === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('stipend_payments')
        .update({
          status: 'paid',
          paid_by: user?.id,
          paid_at: new Date().toISOString()
        })
        .in('id', Array.from(selectedPayments));

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Marked ${selectedPayments.size} payments as paid`
      });
      setSelectedPayments(new Set());
      fetchPayments();
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payments',
        variant: 'destructive'
      });
    }
  };

  const exportToCSV = () => {
    const filteredPayments = getFilteredPayments();
    const headers = ['Student Name', 'Email', 'Phone', 'Cash Tag', 'Event', 'Amount', 'Status', 'Budget Source'];
    const rows = filteredPayments.map(p => [
      p.student_name,
      p.student_email || '',
      p.student_phone || '',
      p.student_cashtag || '',
      p.event_name,
      p.amount.toString(),
      p.status,
      p.budget_source || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stipend-payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Exported', description: 'CSV file downloaded' });
  };

  const getFilteredPayments = () => {
    let filtered = payments;

    if (activeTab !== 'all') {
      filtered = filtered.filter(p => p.status === activeTab);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.student_name.toLowerCase().includes(query) ||
        p.event_name.toLowerCase().includes(query) ||
        (p.student_email && p.student_email.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Check className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><DollarSign className="h-3 w-3 mr-1" /> Paid</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'pending').length,
    approved: payments.filter(p => p.status === 'approved').length,
    paid: payments.filter(p => p.status === 'paid').length,
    totalAmount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    paidAmount: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0)
  };

  const filteredPayments = getFilteredPayments();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading stipend payments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">${stats.paidAmount.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Paid Out</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">${stats.totalAmount.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Total Budget</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Stipend Payments
              </CardTitle>
              <CardDescription>Track and manage student stipends for performances</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={showImportDialog} onOpenChange={(open) => {
                setShowImportDialog(open);
                if (open) fetchSurveyResponses();
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-1" />
                    Import from Survey
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import from Tree Lighting Survey</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Found <strong>{surveyResponses.length}</strong> students who attended the tree lighting.
                    </p>
                    <div className="space-y-2">
                      <Label>Amount per student ($)</Label>
                      <Input
                        type="number"
                        placeholder="50.00"
                        value={importAmount}
                        onChange={(e) => setImportAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Budget Source (optional)</Label>
                      <Input
                        placeholder="e.g., Concert Fund"
                        value={importBudgetSource}
                        onChange={(e) => setImportBudgetSource(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleImportFromSurvey} className="w-full">
                      Create {surveyResponses.length} Payment Records
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Stipend Payment</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh]">
                    <div className="space-y-4 pr-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-2">
                          <Label>Student Name *</Label>
                          <Input
                            value={newPayment.student_name}
                            onChange={(e) => setNewPayment(p => ({ ...p, student_name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={newPayment.student_email}
                            onChange={(e) => setNewPayment(p => ({ ...p, student_email: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            value={newPayment.student_phone}
                            onChange={(e) => setNewPayment(p => ({ ...p, student_phone: e.target.value }))}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Cash Tag</Label>
                          <Input
                            placeholder="$username"
                            value={newPayment.student_cashtag}
                            onChange={(e) => setNewPayment(p => ({ ...p, student_cashtag: e.target.value }))}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Event Name *</Label>
                          <Input
                            value={newPayment.event_name}
                            onChange={(e) => setNewPayment(p => ({ ...p, event_name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Event Date</Label>
                          <Input
                            type="date"
                            value={newPayment.event_date}
                            onChange={(e) => setNewPayment(p => ({ ...p, event_date: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Amount ($) *</Label>
                          <Input
                            type="number"
                            value={newPayment.amount}
                            onChange={(e) => setNewPayment(p => ({ ...p, amount: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Payment Method</Label>
                          <Select
                            value={newPayment.payment_method}
                            onValueChange={(v) => setNewPayment(p => ({ ...p, payment_method: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash_app">Cash App</SelectItem>
                              <SelectItem value="venmo">Venmo</SelectItem>
                              <SelectItem value="check">Check</SelectItem>
                              <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Budget Source</Label>
                          <Input
                            value={newPayment.budget_source}
                            onChange={(e) => setNewPayment(p => ({ ...p, budget_source: e.target.value }))}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={newPayment.notes}
                            onChange={(e) => setNewPayment(p => ({ ...p, notes: e.target.value }))}
                          />
                        </div>
                      </div>
                      <Button onClick={handleCreatePayment} className="w-full">
                        Create Payment Record
                      </Button>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Search and Tabs */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or event..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Bulk Actions */}
          {selectedPayments.size > 0 && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg mb-4">
              <span className="text-sm font-medium">{selectedPayments.size} selected</span>
              <Button size="sm" variant="default" onClick={handleBulkMarkPaid}>
                <Check className="h-4 w-4 mr-1" />
                Mark as Paid
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedPayments(new Set())}>
                Clear
              </Button>
            </div>
          )}

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filteredPayments.length > 0 && filteredPayments.every(p => selectedPayments.has(p.id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPayments(new Set(filteredPayments.map(p => p.id)));
                        } else {
                          setSelectedPayments(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No payment records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPayments.has(payment.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedPayments);
                            if (checked) {
                              newSelected.add(payment.id);
                            } else {
                              newSelected.delete(payment.id);
                            }
                            setSelectedPayments(newSelected);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{payment.student_name}</p>
                          <p className="text-xs text-muted-foreground">{payment.student_email}</p>
                          {payment.student_phone && (
                            <p className="text-xs text-muted-foreground">{payment.student_phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{payment.event_name}</p>
                          {payment.event_date && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(payment.event_date), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600">${Number(payment.amount).toFixed(2)}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {payment.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(payment.id, 'approved')}
                            >
                              Approve
                            </Button>
                          )}
                          {payment.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleUpdateStatus(payment.id, 'paid')}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StipendPaymentModule;
