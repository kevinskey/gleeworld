import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download, Eye } from 'lucide-react';
import { useFinanceRecords } from '@/hooks/useFinanceRecords';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface StipendRecord {
  id: string;
  performerName: string;
  eventName: string;
  amount: number;
  performanceDate: string;
  paymentDate?: string;
  status: 'pending' | 'paid' | 'processing';
  contractId?: string;
  notes?: string;
}

interface UserPayment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string;
  contract_id: string;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
  generated_contracts: {
    event_name: string;
    event_dates: string;
  };
}

export const PerformanceStipendsRegister = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stipendRecords, setStipendRecords] = useState<StipendRecord[]>([]);
  const [userPayments, setUserPayments] = useState<UserPayment[]>([]);
  const { createRecord } = useFinanceRecords();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    performerName: '',
    eventName: '',
    amount: '',
    performanceDate: '',
    notes: ''
  });

  // Fetch existing user payments for stipends
  useEffect(() => {
    fetchUserPayments();
  }, []);

  const fetchUserPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('user_payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          notes,
          contract_id,
          user_id
        `)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      
      // Get additional data separately to avoid complex joins
      const paymentsWithDetails = await Promise.all(
        (data || []).map(async (payment) => {
          const [profileData, contractData] = await Promise.all([
            supabase.from('gw_profiles').select('full_name, email').eq('user_id', payment.user_id).single(),
            payment.contract_id ? supabase.from('generated_contracts').select('event_name, event_dates').eq('id', payment.contract_id).single() : Promise.resolve({ data: null })
          ]);
          
          return {
            ...payment,
            profiles: profileData.data || { full_name: 'Unknown', email: 'Unknown' },
            generated_contracts: contractData.data || { event_name: 'Unknown Event', event_dates: 'Unknown Date' }
          };
        })
      );
      
      setUserPayments(paymentsWithDetails);
    } catch (error) {
      console.error('Error fetching user payments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create finance record for the stipend
      await createRecord({
        user_id: 'system', // Treasurer transactions
        date: formData.performanceDate,
        type: 'debit',
        category: 'Performance Stipends',
        description: `Stipend payment - ${formData.performerName} for ${formData.eventName}`,
        amount: -Math.abs(parseFloat(formData.amount)), // Negative because it's an outgoing payment
        reference: `STIPEND-${Date.now()}`,
        notes: formData.notes
      });

      // Add to local stipend records
      const newRecord: StipendRecord = {
        id: `stipend-${Date.now()}`,
        performerName: formData.performerName,
        eventName: formData.eventName,
        amount: parseFloat(formData.amount),
        performanceDate: formData.performanceDate,
        status: 'pending',
        notes: formData.notes
      };

      setStipendRecords([...stipendRecords, newRecord]);
      setIsDialogOpen(false);
      setFormData({ performerName: '', eventName: '', amount: '', performanceDate: '', notes: '' });
      
      toast({
        title: "Success",
        description: "Stipend record added successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add stipend record",
        variant: "destructive"
      });
    }
  };

  const markAsPaid = (recordId: string) => {
    setStipendRecords(records => 
      records.map(record => 
        record.id === recordId 
          ? { ...record, status: 'paid' as const, paymentDate: format(new Date(), 'yyyy-MM-dd') }
          : record
      )
    );
  };

  const getStatusColor = (status: StipendRecord['status']) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const totalStipends = [...stipendRecords, ...userPayments].reduce((sum, record) => {
    if ('amount' in record && typeof record.amount === 'number') {
      return sum + record.amount;
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">Track performance stipend payments</p>
          <p className="text-lg font-semibold text-primary">Total Stipends: ${totalStipends.toFixed(2)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Stipend
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Stipend Record</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="performerName">Performer Name</Label>
                  <Input
                    id="performerName"
                    value={formData.performerName}
                    onChange={(e) => setFormData({...formData, performerName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="eventName">Event Name</Label>
                  <Input
                    id="eventName"
                    value={formData.eventName}
                    onChange={(e) => setFormData({...formData, eventName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Stipend Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="performanceDate">Performance Date</Label>
                  <Input
                    id="performanceDate"
                    type="date"
                    value={formData.performanceDate}
                    onChange={(e) => setFormData({...formData, performanceDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full">Add Stipend Record</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Manual Stipend Records */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Manual Stipend Records</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Performer</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Performance Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stipendRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No manual stipend records found.
                </TableCell>
              </TableRow>
            ) : (
              stipendRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.performerName}</TableCell>
                  <TableCell>{record.eventName}</TableCell>
                  <TableCell>${record.amount.toFixed(2)}</TableCell>
                  <TableCell>{format(new Date(record.performanceDate), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {record.paymentDate ? format(new Date(record.paymentDate), 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    {record.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => markAsPaid(record.id)}>
                        Mark Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* System Payments */}
      <div>
        <h3 className="text-lg font-semibold mb-4">System Payment Records</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Performer</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Contract</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No system payment records found.
                </TableCell>
              </TableRow>
            ) : (
              userPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.profiles.full_name}</TableCell>
                  <TableCell>{payment.generated_contracts?.event_name || 'Unknown Event'}</TableCell>
                  <TableCell>${payment.amount.toFixed(2)}</TableCell>
                  <TableCell>{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="capitalize">{payment.payment_method}</TableCell>
                  <TableCell>
                    {payment.contract_id && (
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};