import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Contract } from "@/hooks/useContracts";

interface EditContractTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  onContractUpdated: (contract: Contract) => void;
}

export const EditContractTitleDialog = ({
  open,
  onOpenChange,
  contract,
  onContractUpdated
}: EditContractTitleDialogProps) => {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Update local title when contract changes
  useEffect(() => {
    if (contract) {
      setTitle(contract.title);
    }
  }, [contract]);

  const handleSave = async () => {
    if (!contract || !title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid title",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('contracts_v2')
        .update({ 
          title: title.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id)
        .select()
        .single();

      if (error) throw error;

      onContractUpdated({
        ...contract,
        title: title.trim(),
        updated_at: data.updated_at
      });

      toast({
        title: "Success",
        description: "Contract title updated successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating contract title:', error);
      toast({
        title: "Error",
        description: "Failed to update contract title",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (contract) {
      setTitle(contract.title);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Contract Title</DialogTitle>
          <DialogDescription>
            Update the title for this contract
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Contract Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter contract title"
              disabled={saving}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};