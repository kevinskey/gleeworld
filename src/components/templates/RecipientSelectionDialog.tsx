import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import type { ContractTemplate } from "@/hooks/useContractTemplates";

interface RecipientSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  template: ContractTemplate | null;
  onCreateContract: (template: ContractTemplate, recipient: { full_name: string; email: string; stipend_amount?: string }) => void;
  isCreating?: boolean;
}

export const RecipientSelectionDialog = ({ 
  isOpen, 
  onOpenChange, 
  template, 
  onCreateContract,
  isCreating = false 
}: RecipientSelectionDialogProps) => {
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [stipendAmount, setStipendAmount] = useState("$500.00");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!template || !recipientName.trim() || !recipientEmail.trim()) return;

    onCreateContract(template, {
      full_name: recipientName.trim(),
      email: recipientEmail.trim(),
      stipend_amount: stipendAmount.trim()
    });
  };

  const handleClose = () => {
    if (!isCreating) {
      setRecipientName("");
      setRecipientEmail("");
      setStipendAmount("$500.00");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Contract from Template</DialogTitle>
          <DialogDescription>
            Enter the recipient information for "{template?.name}"
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient-name">Recipient Name</Label>
            <Input
              id="recipient-name"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Enter recipient's full name"
              required
              disabled={isCreating}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="recipient-email">Recipient Email</Label>
            <Input
              id="recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="Enter recipient's email address"
              required
              disabled={isCreating}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="stipend-amount">Stipend Amount</Label>
            <Input
              id="stipend-amount"
              value={stipendAmount}
              onChange={(e) => setStipendAmount(e.target.value)}
              placeholder="Enter stipend amount (e.g., $500.00)"
              disabled={isCreating}
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="button"
              variant="outline" 
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isCreating || !recipientName.trim() || !recipientEmail.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Contract...
                </>
              ) : (
                'Create Contract'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};