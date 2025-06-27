
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FinanceRecord } from "./FinanceTable";

interface AddFinanceRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (record: Omit<FinanceRecord, 'id' | 'created_at' | 'updated_at' | 'balance'>) => Promise<FinanceRecord | null>;
}

export const AddFinanceRecordDialog = ({ open, onOpenChange, onSubmit }: AddFinanceRecordDialogProps) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'payment' as FinanceRecord['type'],
    category: '',
    description: '',
    amount: '',
    reference: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount || !formData.category) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const record = await onSubmit({
        date: formData.date,
        type: formData.type,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        reference: formData.reference || undefined,
        notes: formData.notes || undefined
      });
      
      if (record) {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          type: 'payment',
          category: '',
          description: '',
          amount: '',
          reference: '',
          notes: ''
        });
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'payment',
      category: '',
      description: '',
      amount: '',
      reference: '',
      notes: ''
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/20 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Add Finance Record</DialogTitle>
          <DialogDescription className="text-white/70">
            Add a new financial transaction record to track stipends, receipts, payments, debits, or credits.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="text-white/80">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="glass border-white/20 text-white bg-white/5"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="type" className="text-white/80">Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value as any})}>
                <SelectTrigger className="glass border-white/20 text-white bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stipend">Stipend</SelectItem>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="category" className="text-white/80">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              placeholder="e.g., Performance, Travel, Equipment"
              className="glass border-white/20 text-white bg-white/5"
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white/80">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description of the transaction"
              className="glass border-white/20 text-white bg-white/5"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount" className="text-white/80">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                placeholder="0.00"
                className="glass border-white/20 text-white bg-white/5"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="reference" className="text-white/80">Reference</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({...formData, reference: e.target.value})}
                placeholder="Invoice #, Check #, etc."
                className="glass border-white/20 text-white bg-white/5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="text-white/80">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes or details"
              className="glass border-white/20 text-white bg-white/5 resize-none"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="glass border-white/20 text-white/80 hover:bg-white/10"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.description || !formData.amount || !formData.category}
              className="glass-button text-white font-medium"
            >
              {isSubmitting ? "Adding..." : "Add Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
