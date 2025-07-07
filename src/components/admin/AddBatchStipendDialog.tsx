import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StipendEntry {
  username: string;
  contractTitle: string;
  amount: number;
  description: string;
}

interface AddBatchStipendDialogProps {
  onSuccess: () => void;
}

export const AddBatchStipendDialog = ({ onSuccess }: AddBatchStipendDialogProps) => {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<StipendEntry[]>([{ username: "", contractTitle: "", amount: 0, description: "" }]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addEntry = () => {
    setEntries([...entries, { username: "", contractTitle: "", amount: 0, description: "" }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof StipendEntry, value: string | number) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const processBatch = async () => {
    setLoading(true);
    try {
      // Get all user profiles to match usernames
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      if (!profiles) {
        throw new Error('Failed to fetch user profiles');
      }

      const profileMap = new Map();
      profiles.forEach(profile => {
        if (profile.full_name) profileMap.set(profile.full_name.toLowerCase(), profile);
        if (profile.email) profileMap.set(profile.email.toLowerCase(), profile);
      });

      const recordsToInsert = [];
      
      for (const entry of entries) {
        if (!entry.username || !entry.amount || !entry.description) continue;
        
        const userProfile = profileMap.get(entry.username.toLowerCase());
        if (!userProfile) {
          toast({
            title: "User Not Found",
            description: `Could not find user: ${entry.username}`,
            variant: "destructive",
          });
          continue;
        }

        recordsToInsert.push({
          user_id: userProfile.id,
          date: new Date().toISOString().split('T')[0],
          type: 'stipend',
          category: 'Performance',
          description: entry.description,
          amount: entry.amount,
          balance: 0,
          reference: `Manual Entry: ${entry.contractTitle || 'Batch Process'}`,
          notes: `Batch entry - Contract: ${entry.contractTitle || 'N/A'}`
        });
      }

      if (recordsToInsert.length === 0) {
        toast({
          title: "No Valid Entries",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('finance_records')
        .insert(recordsToInsert);

      if (error) throw error;

      toast({
        title: "Batch Process Complete",
        description: `Successfully added ${recordsToInsert.length} stipend records`,
      });

      setOpen(false);
      setEntries([{ username: "", contractTitle: "", amount: 0, description: "" }]);
      onSuccess();

    } catch (error) {
      console.error('Error processing batch:', error);
      toast({
        title: "Batch Process Failed",
        description: "Failed to process stipend entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Batch Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Stipend Entry</DialogTitle>
          <DialogDescription>
            Enter multiple stipend records by username/email and contract information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 p-4 border rounded-lg">
              <div className="col-span-3">
                <Label htmlFor={`username-${index}`}>Username/Email</Label>
                <Input
                  id={`username-${index}`}
                  placeholder="Enter username or email"
                  value={entry.username}
                  onChange={(e) => updateEntry(index, 'username', e.target.value)}
                />
              </div>
              
              <div className="col-span-3">
                <Label htmlFor={`contract-${index}`}>Contract Title</Label>
                <Input
                  id={`contract-${index}`}
                  placeholder="Contract title (optional)"
                  value={entry.contractTitle}
                  onChange={(e) => updateEntry(index, 'contractTitle', e.target.value)}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor={`amount-${index}`}>Amount</Label>
                <Input
                  id={`amount-${index}`}
                  type="number"
                  placeholder="0.00"
                  value={entry.amount || ''}
                  onChange={(e) => updateEntry(index, 'amount', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="col-span-3">
                <Label htmlFor={`description-${index}`}>Description</Label>
                <Input
                  id={`description-${index}`}
                  placeholder="Stipend description"
                  value={entry.description}
                  onChange={(e) => updateEntry(index, 'description', e.target.value)}
                />
              </div>
              
              <div className="col-span-1 flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeEntry(index)}
                  disabled={entries.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={addEntry}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={processBatch} disabled={loading}>
                {loading ? "Processing..." : "Process Batch"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};