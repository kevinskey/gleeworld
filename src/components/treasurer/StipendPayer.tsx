import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  DollarSign, 
  User, 
  Calendar, 
  CheckCircle,
  Edit3,
  Clock,
  AlertCircle
} from "lucide-react";

interface StipendPayment {
  id: string;
  recipient_id: string;
  amount: number;
  payment_type: string;
  description: string;
  payment_date: string;
  payment_method: string;
  status: string;
  reference_number: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Join data
  gw_profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export const StipendPayer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<StipendPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<StipendPayment | null>(null);
  const [formData, setFormData] = useState({
    recipient_id: '',
    amount: '',
    payment_type: 'performance' as string,
    description: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'check',
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_stipend_payments')
        .select(`
          *,
          gw_profiles (
            full_name,
            email
          )
        `)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments((data as any) || []);
    } catch (error) {
      console.error('Error fetching stipend payments:', error);
      toast({
        title: "Error",
        description: "Failed to load stipend payments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const paymentData = {
        recipient_id: formData.recipient_id,
        amount: parseFloat(formData.amount),
        payment_type: formData.payment_type,
        description: formData.description,
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number || null,
        notes: formData.notes || null,
        status: 'pending' as const,
        created_by: user.id
      };

      if (editingPayment) {
        const { error } = await supabase
          .from('gw_stipend_payments')
          .update(paymentData)
          .eq('id', editingPayment.id);

        if (error) throw error;
        toast({ title: "Success", description: "Stipend payment updated successfully" });
      } else {
        const { error } = await supabase
          .from('gw_stipend_payments')
          .insert([paymentData]);

        if (error) throw error;
        toast({ title: "Success", description: "Stipend payment created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchPayments();
    } catch (error) {
      console.error('Error saving stipend payment:', error);
      toast({
        title: "Error",
        description: "Failed to save stipend payment",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      recipient_id: '',
      amount: '',
      payment_type: 'performance',
      description: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'check',
      reference_number: '',
      notes: ''
    });
    setEditingPayment(null);
  };

  const handleEdit = (payment: StipendPayment) => {
    setEditingPayment(payment);
    setFormData({
      recipient_id: payment.recipient_id,
      amount: payment.amount.toString(),
      payment_type: payment.payment_type,
      description: payment.description,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      reference_number: payment.reference_number || '',
      notes: payment.notes || ''
    });
    setDialogOpen(true);
  };

  const handleMarkPaid = async (id: string, referenceNumber?: string) => {
    try {
      const { error } = await supabase
        .from('gw_stipend_payments')
        .update({ 
          status: 'paid',
          reference_number: referenceNumber || null
        })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Payment marked as paid" });
      fetchPayments();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPaymentStats = () => {
    const total = payments.length;
    const paid = payments.filter(p => p.status === 'paid').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const paidAmount = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

    return { total, paid, pending, totalAmount, paidAmount };
  };

  const stats = getPaymentStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse text-center">Loading stipend payments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bebas tracking-wide">Stipend Payer</h2>
          <p className="text-muted-foreground">Manage performance and member stipend payments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPayment ? 'Edit Stipend Payment' : 'Create Stipend Payment'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recipient</label>
                  <Input
                    value={formData.recipient_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipient_id: e.target.value }))}
                    placeholder="Recipient ID or email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="250.00"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Fall concert performance stipend"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Type</label>
                  <Select value={formData.payment_type} onValueChange={(value: string) => setFormData(prev => ({ ...prev, payment_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Date</label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <Select value={formData.payment_method} onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reference Number (optional)</label>
                  <Input
                    value={formData.reference_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                    placeholder="Check number or transaction ID"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional payment details"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPayment ? 'Update' : 'Create'} Payment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <p className="text-sm text-muted-foreground">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">${stats.paidAmount.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">Total Paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      <div className="grid gap-4">
        {payments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Stipend Payments</h3>
              <p className="text-muted-foreground mb-4">
                Start managing stipend payments by creating your first payment record.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Payment
              </Button>
            </CardContent>
          </Card>
        ) : (
          payments.map((payment) => (
            <Card key={payment.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {payment.gw_profiles?.full_name || 'Unknown Recipient'}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <Badge variant={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                      <span className="font-semibold text-green-600">${payment.amount.toFixed(2)}</span>
                      <span>{payment.payment_type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {payment.status === 'pending' && (
                      <Button variant="outline" size="sm" onClick={() => handleMarkPaid(payment.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Paid
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(payment)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{payment.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </div>
                  <Badge variant="outline">{payment.payment_method.replace('_', ' ')}</Badge>
                  {payment.reference_number && (
                    <span className="text-muted-foreground">Ref: {payment.reference_number}</span>
                  )}
                </div>
                {payment.notes && (
                  <p className="text-sm text-muted-foreground">{payment.notes}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};