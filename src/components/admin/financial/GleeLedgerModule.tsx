import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Edit3,
  Trash2,
  BookOpen,
  Download,
  Upload,
  RefreshCw,
  AlertCircle
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

export const GleeLedgerModule = () => {
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
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_running_ledger')
        .select('*')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedData = (data as LedgerEntry[]) || [];
      setEntries(typedData);
      
      // Calculate current balance and check for beginning balance
      const beginningBalance = typedData.find(entry => entry.transaction_type === 'beginning_balance');
      setHasBeginningBalance(!!beginningBalance);
      
      if (typedData.length > 0) {
        setCurrentBalance(typedData[0].running_balance);
      }
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
    
    try {
      const entryData = {
        entry_date: formData.entry_date,
        description: formData.description,
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        reference_number: formData.reference_number || null,
        category: formData.category || null,
        notes: formData.notes || null,
        created_by: user?.id || '',
        running_balance: 0 // Will be calculated by database trigger
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
    if (!confirm('Are you sure you want to delete this ledger entry?')) return;
    
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'credit':
        return <Badge variant="default" className="bg-green-100 text-green-800">Credit</Badge>;
      case 'debit':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Debit</Badge>;
      case 'beginning_balance':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Beginning Balance</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading Glee Ledger...
        </CardContent>
      </Card>
    );
  }

  const totalCredits = entries.filter(e => e.transaction_type === 'credit').reduce((sum, e) => sum + e.amount, 0);
  const totalDebits = entries.filter(e => e.transaction_type === 'debit').reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Glee Club Ledger
          </h2>
          <p className="text-muted-foreground">
            Financial transaction ledger and running balance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLedgerEntries}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                {!hasBeginningBalance ? 'Set Beginning Balance' : 'New Entry'}
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
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({...formData, entry_date: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Transaction description"
                    required
                  />
                </div>

                {hasBeginningBalance && (
                  <div>
                    <label className="text-sm font-medium">Transaction Type</label>
                    <Select 
                      value={formData.transaction_type} 
                      onValueChange={(value: 'debit' | 'credit' | 'beginning_balance') => 
                        setFormData({...formData, transaction_type: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit">Credit (Money In)</SelectItem>
                        <SelectItem value="debit">Debit (Money Out)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!hasBeginningBalance && (
                  <input 
                    type="hidden" 
                    value="beginning_balance"
                    onChange={(e) => setFormData({...formData, transaction_type: 'beginning_balance'})}
                  />
                )}

                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Reference Number</label>
                  <Input
                    value={formData.reference_number}
                    onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                    placeholder="Check #, Receipt #, etc."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    placeholder="Event, Operations, etc."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Additional notes"
                    rows={2}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingEntry ? 'Update' : 'Create'} Entry
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(currentBalance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalCredits)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalDebits)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {entries.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {!hasBeginningBalance && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-medium text-orange-800">Set Beginning Balance</p>
              <p className="text-sm text-orange-700">
                Start your ledger by setting the beginning balance from your first executive board meeting.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ledger Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Ledger Entries</h3>
              <p className="text-muted-foreground mb-4">
                {!hasBeginningBalance 
                  ? "Set your beginning balance to start tracking finances"
                  : "Add your first transaction to get started"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.entry_date)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entry.description}</p>
                          {entry.notes && (
                            <p className="text-sm text-muted-foreground">{entry.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getTransactionBadge(entry.transaction_type)}</TableCell>
                      <TableCell>{entry.reference_number || '-'}</TableCell>
                      <TableCell>{entry.category || '-'}</TableCell>
                      <TableCell className="text-right">
                        <span className={entry.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                          {entry.transaction_type === 'credit' ? '+' : entry.transaction_type === 'debit' ? '-' : ''}
                          {formatCurrency(entry.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={entry.running_balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(entry.running_balance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(entry)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};