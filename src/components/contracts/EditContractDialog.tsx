import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  stipend_amount?: number;
  created_at: string;
  updated_at: string;
}

interface EditContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  onContractUpdated: (contract: Contract) => void;
}

export const EditContractDialog = ({
  open,
  onOpenChange,
  contract,
  onContractUpdated,
}: EditContractDialogProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("draft");
  const [stipendAmount, setStipendAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (contract) {
      setTitle(contract.title || "");
      setContent(contract.content || "");
      setStatus(contract.status || "draft");
      setStipendAmount(contract.stipend_amount?.toString() || "");
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
      const updates: Record<string, any> = {
        title: title.trim(),
        content: content,
        status: status,
        updated_at: new Date().toISOString(),
      };

      if (stipendAmount) {
        updates.stipend_amount = parseFloat(stipendAmount);
      } else {
        updates.stipend_amount = null;
      }

      const { data, error } = await supabase
        .from("contracts_v2")
        .update(updates)
        .eq("id", contract.id)
        .select()
        .single();

      if (error) throw error;

      onContractUpdated(data);

      toast({
        title: "Success",
        description: "Contract updated successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error updating contract:", error);
      toast({
        title: "Error",
        description: "Failed to update contract",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (contract) {
      setTitle(contract.title || "");
      setContent(contract.content || "");
      setStatus(contract.status || "draft");
      setStipendAmount(contract.stipend_amount?.toString() || "");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contract</DialogTitle>
          <DialogDescription>
            Update the contract details below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter contract title"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={saving}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stipend">Stipend Amount ($)</Label>
              <Input
                id="stipend"
                type="number"
                value={stipendAmount}
                onChange={(e) => setStipendAmount(e.target.value)}
                placeholder="0.00"
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter contract content"
              disabled={saving}
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
