import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [users, setUsers] = useState<Array<{ id: string; label: string; value: string }>>([]);
  const [contracts, setContracts] = useState<Array<{ id: string; title: string; value: string }>>([]);
  const { toast } = useToast();

  // Fetch users and contracts when dialog opens
  useEffect(() => {
    if (open) {
      fetchUsersAndContracts();
    }
  }, [open]);

  const fetchUsersAndContracts = async () => {
    try {
      // Fetch users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (profiles) {
        const userOptions = profiles.map(profile => ({
          id: profile.id,
          label: profile.full_name || profile.email || 'Unknown',
          value: profile.full_name || profile.email || profile.id
        }));
        setUsers(userOptions);
      }

      // Fetch contracts from both sources
      const [contractsV2Response, generatedContractsResponse] = await Promise.all([
        supabase.from('contracts_v2').select('id, title').order('title'),
        supabase.from('generated_contracts').select('id, event_name').order('event_name')
      ]);

      const contractOptions = [];
      
      if (contractsV2Response.data) {
        contractOptions.push(...contractsV2Response.data.map(contract => ({
          id: contract.id,
          title: contract.title,
          value: contract.title
        })));
      }

      if (generatedContractsResponse.data) {
        contractOptions.push(...generatedContractsResponse.data.map(contract => ({
          id: contract.id,
          title: contract.event_name,
          value: contract.event_name
        })));
      }

      setContracts(contractOptions);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load users and contracts",
        variant: "destructive",
      });
    }
  };

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
      console.log('Starting batch process with entries:', entries);
      
      const recordsToInsert = [];
      
      for (const entry of entries) {
        console.log('Processing entry:', entry);
        
        if (!entry.username || !entry.amount || !entry.description) {
          console.log('Skipping entry due to missing fields:', { username: entry.username, amount: entry.amount, description: entry.description });
          continue;
        }
        
        // Find user by the selected value
        const selectedUser = users.find(user => user.value === entry.username);
        console.log('Found user:', selectedUser);
        
        if (!selectedUser) {
          toast({
            title: "User Not Found",
            description: `Could not find user: ${entry.username}`,
            variant: "destructive",
          });
          continue;
        }

        const recordToInsert = {
          user_id: selectedUser.id,
          date: new Date().toISOString().split('T')[0],
          type: 'stipend',
          category: 'Performance',
          description: entry.description,
          amount: entry.amount,
          balance: 0,
          reference: `Manual Entry: ${entry.contractTitle || 'Batch Process'}`,
          notes: `Batch entry - Contract: ${entry.contractTitle || 'N/A'}`
        };
        
        console.log('Adding record to insert:', recordToInsert);
        recordsToInsert.push(recordToInsert);
      }

      console.log('Records to insert:', recordsToInsert);

      if (recordsToInsert.length === 0) {
        toast({
          title: "No Valid Entries",
          description: "Please fill in username, amount, and description for each entry",
          variant: "destructive",
        });
        return;
      }

      console.log('Inserting records into finance_records table...');
      const { error, data } = await supabase
        .from('finance_records')
        .insert(recordsToInsert)
        .select();

      console.log('Insert result:', { error, data });

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

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
        description: error.message || "Failed to process stipend entries",
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
                <Select
                  value={entry.username}
                  onValueChange={(value) => updateEntry(index, 'username', value)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.value}>
                        {user.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-3">
                <Label htmlFor={`contract-${index}`}>Contract Title</Label>
                <Select
                  value={entry.contractTitle}
                  onValueChange={(value) => updateEntry(index, 'contractTitle', value)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select contract (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {contracts.map((contract) => (
                      <SelectItem key={contract.id} value={contract.value}>
                        {contract.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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