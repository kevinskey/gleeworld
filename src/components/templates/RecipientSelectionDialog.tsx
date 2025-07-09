import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User } from "lucide-react";
import { useState } from "react";
import type { ContractTemplate } from "@/hooks/useContractTemplates";
import { useUsers } from "@/hooks/useUsers";

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
  const { users, loading: usersLoading } = useUsers();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [stipendAmount, setStipendAmount] = useState("$500.00");

  const selectedUser = users.find(user => user.id === selectedUserId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!template || !selectedUser) return;

    onCreateContract(template, {
      full_name: selectedUser.full_name || selectedUser.email || '',
      email: selectedUser.email || '',
      stipend_amount: stipendAmount.trim()
    });
  };

  const handleClose = () => {
    if (!isCreating) {
      setSelectedUserId("");
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
            <Label htmlFor="user-select">Select Recipient</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={usersLoading || isCreating}>
              <SelectTrigger>
                <SelectValue placeholder={usersLoading ? "Loading users..." : "Select a recipient"} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{user.full_name || user.email}</span>
                      <span className="text-muted-foreground text-sm">({user.email})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              disabled={isCreating || !selectedUser}
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