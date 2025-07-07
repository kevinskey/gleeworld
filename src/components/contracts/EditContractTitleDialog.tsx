import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ContractOrTemplate {
  id: string;
  title?: string;
  name?: string;
  updated_at?: string;
  created_at?: string;
}

interface EditContractTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractOrTemplate | null;
  onContractUpdated: (contract: ContractOrTemplate) => void;
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
      // Handle both contracts (title) and templates (name)
      setTitle(contract.title || contract.name || '');
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
      let data, error;
      
      // Determine if this is a template or contract based on the presence of 'name' field
      const isTemplate = 'name' in contract && !('title' in contract);
      
      if (isTemplate) {
        ({ data, error } = await supabase
          .from('contract_templates')
          .update({ 
            name: title.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', contract.id)
          .select()
          .single());
      } else {
        ({ data, error } = await supabase
          .from('contracts_v2')
          .update({ 
            title: title.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', contract.id)
          .select()
          .single());
      }

      if (error) throw error;
      
      onContractUpdated({
        ...contract,
        ...(isTemplate ? { name: title.trim() } : { title: title.trim() }),
        updated_at: data.updated_at
      });

      toast({
        title: "Success",
        description: `${isTemplate ? 'Template' : 'Contract'} title updated successfully`,
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
      setTitle(contract.title || contract.name || '');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {contract && 'name' in contract ? 'Template' : 'Contract'} Title</DialogTitle>
          <DialogDescription>
            Update the title for this {contract && 'name' in contract ? 'template' : 'contract'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{contract && 'name' in contract ? 'Template' : 'Contract'} Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Enter ${contract && 'name' in contract ? 'template' : 'contract'} title`}
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