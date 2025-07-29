import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Edit3,
  Trash2,
  BookOpen
} from "lucide-react";

interface LedgerEntry {
  id: string;
  entry_date: string;
  description: string;
  transaction_type: 'debit' | 'credit' | 'beginning_balance';
  amount: number;
  running_balance: number;
  reference_number?: string;
  category?: string;
  notes?: string;
  created_at: string;
}

export const RunningLedger = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [hasBeginningBalance, setHasBeginningBalance] = useState(false);
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    transaction_type: 'credit' as 'debit' | 'credit' | 'beginning_balance',
    amount: '',
    reference_number: '',
    category: '',
    notes: ''
  });

  useEffect(() => {
    fetchLedgerEntries();
  }, []);

  const fetchLedgerEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_running_ledger')
        .select('*')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedData = (data as LedgerEntry[]) || [];
      setEntries(typedData);
      
      // Get current balance (most recent entry)
      if (typedData.length > 0) {
        setCurrentBalance(typedData[0].running_balance);
      }

      // Check if beginning balance exists
      const beginningBalanceExists = typedData.some(entry => entry.transaction_type === 'beginning_balance');
      setHasBeginningBalance(beginningBalanceExists);
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      toast({
        title: "Error",
        description: "Failed to load ledger entries",
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
      const entryData = {
        entry_date: formData.entry_date,
        description: formData.description,
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        reference_number: formData.reference_number || null,
        category: formData.category || null,
        notes: formData.notes || null,
        created_by: user.id,
        running_balance: 0 // Will be calculated by the trigger
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('gw_running_ledger')
          .update(entryData)
          .eq('id', editingEntry.id);

        if (error) throw error;
        toast({ title: "Success", description: "Ledger entry updated successfully" });
      } else {
        const { error } = await supabase
          .from('gw_running_ledger')
          .insert([entryData]);

        if (error) throw error;
        toast({ title: "Success", description: "Ledger entry created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchLedgerEntries();
    } catch (error) {
      console.error('Error saving ledger entry:', error);
      toast({
        title: "Error",
        description: "Failed to save ledger entry",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      entry_date: new Date().toISOString().split('T')[0],
      description: '',
      transaction_type: 'credit',
      amount: '',
      reference_number: '',
      category: '',
      notes: ''
    });
    setEditingEntry(null);
  };

  const handleEdit = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setFormData({
      entry_date: entry.entry_date,
      description: entry.description,
      transaction_type: entry.transaction_type,
      amount: entry.amount.toString(),
      reference_number: entry.reference_number || '',
      category: entry.category || '',
      notes: entry.notes || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gw_running_ledger')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Ledger entry deleted" });
      fetchLedgerEntries();
    } catch (error) {
      console.error('Error deleting ledger entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete ledger entry",
        variant: "destructive"
      });
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'debit': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'beginning_balance': return <BookOpen className="h-4 w-4 text-blue-500" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit': return 'text-green-600';
      case 'debit': return 'text-red-600';
      case 'beginning_balance': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse text-center">Loading ledger...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bebas tracking-wide">Running Ledger</h2>
          <p className="text-muted-foreground">Track all financial transactions with running balance</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className={`text-2xl font-bold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(currentBalance)}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingEntry ? 'Edit Ledger Entry' : 
                   !hasBeginningBalance ? 'Set Beginning Balance' : 'New Ledger Entry'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={!hasBeginningBalance ? "Beginning Balance" : "Transaction description"}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Transaction Type</label>
                  <Select 
                    value={formData.transaction_type} 
                    onValueChange={(value: 'debit' | 'credit' | 'beginning_balance') => 
                      setFormData(prev => ({ ...prev, transaction_type: value }))}
                    disabled={!hasBeginningBalance && !editingEntry}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {!hasBeginningBalance && !editingEntry && (
                        <SelectItem value="beginning_balance">Beginning Balance</SelectItem>
                      )}
                      <SelectItem value="credit">Credit (Money In)</SelectItem>
                      <SelectItem value="debit">Debit (Money Out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Reference Number (Optional)</label>
                  <Input
                    value={formData.reference_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                    placeholder="Check #, receipt #, etc."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category (Optional)</label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dues">Dues</SelectItem>
                      <SelectItem value="fundraising">Fundraising</SelectItem>
                      <SelectItem value="events">Events</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="stipends">Stipends</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (Optional)</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingEntry ? 'Update' : 'Add'} Entry
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {!hasBeginningBalance && entries.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Set Beginning Balance</h3>
              <p className="text-muted-foreground mb-4">
                Start your ledger by setting the beginning balance from your first executive board meeting.
              </p>
              <Button onClick={() => {
                setFormData(prev => ({ 
                  ...prev, 
                  transaction_type: 'beginning_balance',
                  description: 'Beginning Balance' 
                }));
                setDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Set Beginning Balance
              </Button>
            </CardContent>
          </Card>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Transactions</h3>
              <p className="text-muted-foreground mb-4">
                No transactions have been recorded yet. Add your first entry to start tracking.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {entries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      {getTransactionIcon(entry.transaction_type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{entry.description}</h4>
                          {entry.category && (
                            <Badge variant="outline" className="text-xs">
                              {entry.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(entry.entry_date).toLocaleDateString()}
                          </div>
                          {entry.reference_number && (
                            <span>Ref: {entry.reference_number}</span>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-medium ${getTransactionColor(entry.transaction_type)}`}>
                          {entry.transaction_type === 'debit' ? '-' : '+'}{formatCurrency(entry.amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Balance: {formatCurrency(entry.running_balance)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(entry)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(entry.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};