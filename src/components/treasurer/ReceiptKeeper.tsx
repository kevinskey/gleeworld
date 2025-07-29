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
  Receipt, 
  Upload, 
  Download,
  Calendar, 
  DollarSign,
  Edit3,
  Trash2,
  Eye,
  FileText,
  Image,
  File
} from "lucide-react";

interface ReceiptRecord {
  id: string;
  transaction_id: string | null;
  vendor_name: string;
  amount: number;
  transaction_date: string;
  category: string;
  description: string;
  receipt_image_url: string | null;
  receipt_pdf_url: string | null;
  payment_method: string;
  tax_deductible: boolean;
  reimbursable: boolean;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const ReceiptKeeper = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<ReceiptRecord | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: '',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    payment_method: 'cash',
    tax_deductible: false,
    reimbursable: false,
    notes: ''
  });

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_receipts')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast({
        title: "Error",
        description: "Failed to load receipts",
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
      const receiptData = {
        vendor_name: formData.vendor_name,
        amount: parseFloat(formData.amount),
        transaction_date: formData.transaction_date,
        category: formData.category,
        description: formData.description,
        payment_method: formData.payment_method,
        tax_deductible: formData.tax_deductible,
        reimbursable: formData.reimbursable,
        notes: formData.notes || null,
        status: 'pending' as const,
        created_by: user.id
      };

      if (editingReceipt) {
        const { error } = await supabase
          .from('gw_receipts')
          .update(receiptData)
          .eq('id', editingReceipt.id);

        if (error) throw error;
        toast({ title: "Success", description: "Receipt updated successfully" });
      } else {
        const { error } = await supabase
          .from('gw_receipts')
          .insert([receiptData]);

        if (error) throw error;
        toast({ title: "Success", description: "Receipt saved successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchReceipts();
    } catch (error) {
      console.error('Error saving receipt:', error);
      toast({
        title: "Error",
        description: "Failed to save receipt",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      amount: '',
      transaction_date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      payment_method: 'cash',
      tax_deductible: false,
      reimbursable: false,
      notes: ''
    });
    setEditingReceipt(null);
  };

  const handleEdit = (receipt: ReceiptRecord) => {
    setEditingReceipt(receipt);
    setFormData({
      vendor_name: receipt.vendor_name,
      amount: receipt.amount.toString(),
      transaction_date: receipt.transaction_date,
      category: receipt.category,
      description: receipt.description,
      payment_method: receipt.payment_method,
      tax_deductible: receipt.tax_deductible,
      reimbursable: receipt.reimbursable,
      notes: receipt.notes || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gw_receipts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Receipt deleted" });
      fetchReceipts();
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast({
        title: "Error",
        description: "Failed to delete receipt",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (file: File, receiptId: string) => {
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${receiptId}-${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      // Update receipt record with file URL
      const updateField = file.type.includes('pdf') ? 'receipt_pdf_url' : 'receipt_image_url';
      const { error: updateError } = await supabase
        .from('gw_receipts')
        .update({ [updateField]: publicUrl })
        .eq('id', receiptId);

      if (updateError) throw updateError;

      toast({ title: "Success", description: "Receipt file uploaded successfully" });
      fetchReceipts();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getReceiptStats = () => {
    const total = receipts.length;
    const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);
    const deductibleAmount = receipts.filter(r => r.tax_deductible).reduce((sum, r) => sum + r.amount, 0);
    const reimbursableAmount = receipts.filter(r => r.reimbursable).reduce((sum, r) => sum + r.amount, 0);

    return { total, totalAmount, deductibleAmount, reimbursableAmount };
  };

  const stats = getReceiptStats();

  const expenseCategories = [
    'Office Supplies',
    'Equipment',
    'Marketing',
    'Travel',
    'Food & Catering',
    'Venue Rental',
    'Professional Services',
    'Insurance',
    'Utilities',
    'Maintenance',
    'Uniforms',
    'Sheet Music',
    'Other'
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse text-center">Loading receipts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bebas tracking-wide">Receipt Keeper</h2>
          <p className="text-muted-foreground">Organize and manage expense receipts and documentation</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Receipt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingReceipt ? 'Edit Receipt' : 'Add New Receipt'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vendor/Store Name</label>
                  <Input
                    value={formData.vendor_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
                    placeholder="Target, Amazon, etc."
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
                    placeholder="25.99"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Office supplies for rehearsal room"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
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
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="debit_card">Debit Card</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="online">Online Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="tax_deductible"
                    checked={formData.tax_deductible}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_deductible: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="tax_deductible" className="text-sm font-medium">Tax Deductible</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="reimbursable"
                    checked={formData.reimbursable}
                    onChange={(e) => setFormData(prev => ({ ...prev, reimbursable: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="reimbursable" className="text-sm font-medium">Reimbursable</label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional details about this expense"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingReceipt ? 'Update' : 'Save'} Receipt
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Receipt Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Receipts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">${stats.totalAmount.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">${stats.deductibleAmount.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">Tax Deductible</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">${stats.reimbursableAmount.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">Reimbursable</p>
          </CardContent>
        </Card>
      </div>

      {/* Receipts List */}
      <div className="grid gap-4">
        {receipts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Receipts</h3>
              <p className="text-muted-foreground mb-4">
                Start organizing your expense documentation by adding your first receipt.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Receipt
              </Button>
            </CardContent>
          </Card>
        ) : (
          receipts.map((receipt) => (
            <Card key={receipt.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      {receipt.vendor_name}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <Badge variant={getStatusColor(receipt.status)}>
                        {receipt.status}
                      </Badge>
                      <span className="font-semibold">${receipt.amount.toFixed(2)}</span>
                      <span>{receipt.category}</span>
                      {receipt.tax_deductible && <Badge variant="outline">Tax Deductible</Badge>}
                      {receipt.reimbursable && <Badge variant="outline">Reimbursable</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(receipt)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(receipt.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{receipt.description}</p>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(receipt.transaction_date).toLocaleDateString()}
                  </div>
                  <Badge variant="outline">{receipt.payment_method.replace('_', ' ')}</Badge>
                </div>

                {/* Receipt attachments */}
                <div className="flex items-center gap-2">
                  {receipt.receipt_image_url && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Image className="h-3 w-3" />
                      Image
                    </Badge>
                  )}
                  {receipt.receipt_pdf_url && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      PDF
                    </Badge>
                  )}
                  {!receipt.receipt_image_url && !receipt.receipt_pdf_url && (
                    <div>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, receipt.id);
                        }}
                        className="hidden"
                        id={`file-${receipt.id}`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`file-${receipt.id}`)?.click()}
                        disabled={uploading}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </Button>
                    </div>
                  )}
                </div>

                {receipt.notes && (
                  <p className="text-sm text-muted-foreground italic">{receipt.notes}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};