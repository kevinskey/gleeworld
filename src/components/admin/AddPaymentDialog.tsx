
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdminPayments } from "@/hooks/useAdminPayments";
import { useUsers } from "@/hooks/useUsers";
import { supabase } from "@/integrations/supabase/client";

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface AllContracts {
  id: string;
  title: string;
  type: 'contract_v2' | 'generated_contract';
}

export const AddPaymentDialog = ({ open, onOpenChange, onSuccess }: AddPaymentDialogProps) => {
  const { createPayment } = useAdminPayments();
  const { users } = useUsers();
  const [allContracts, setAllContracts] = useState<AllContracts[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    contract_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'check',
    notes: '',
  });

  // Fetch all contracts from both tables
  useEffect(() => {
    const fetchAllContracts = async () => {
      try {
        // Fetch from contracts_v2
        const { data: contractsV2 } = await supabase
          .from('contracts_v2')
          .select('id, title')
          .order('title');

        // Fetch from generated_contracts
        const { data: generatedContracts } = await supabase
          .from('generated_contracts')
          .select('id, event_name')
          .order('event_name');

        const combined: AllContracts[] = [
          ...(contractsV2?.map(c => ({ id: c.id, title: c.title, type: 'contract_v2' as const })) || []),
          ...(generatedContracts?.map(c => ({ id: c.id, title: c.event_name, type: 'generated_contract' as const })) || [])
        ];

        setAllContracts(combined);
      } catch (error) {
        console.error('Error fetching contracts:', error);
      }
    };

    if (open) {
      fetchAllContracts();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id || !formData.amount) return;

    try {
      setLoading(true);
      await createPayment({
        user_id: formData.user_id,
        contract_id: formData.contract_id || undefined,
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        notes: formData.notes || undefined,
      });

      setFormData({
        user_id: '',
        contract_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'check',
        notes: '',
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating payment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment made to a user for their services.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user_id">User *</Label>
            <Select
              value={formData.user_id}
              onValueChange={(value) => setFormData({ ...formData, user_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract_id">Related Contract (Optional)</Label>
            <Select
              value={formData.contract_id}
              onValueChange={(value) => setFormData({ ...formData, contract_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a contract (optional)" />
              </SelectTrigger>
              <SelectContent>
                {allContracts.map((contract) => (
                  <SelectItem key={contract.id} value={contract.id}>
                    {contract.title} ({contract.type === 'contract_v2' ? 'Contract' : 'Event'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">Payment Date</Label>
            <Input
              id="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 shadow-lg">
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="venmo">Venmo</SelectItem>
                <SelectItem value="zelle">Zelle</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this payment..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
