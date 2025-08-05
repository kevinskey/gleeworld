import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateDuesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateDuesDialog = ({ open, onOpenChange, onSuccess }: CreateDuesDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    amount: '',
    due_date: '',
    semester: '',
    academic_year: new Date().getFullYear().toString(),
    notes: ''
  });

  // Fetch users when dialog opens
  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, role')
        .not('user_id', 'is', null)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('gw_dues_records')
        .insert([{
          user_id: formData.user_id,
          amount: parseFloat(formData.amount),
          due_date: formData.due_date,
          semester: formData.semester,
          academic_year: formData.academic_year,
          status: 'pending',
          notes: formData.notes
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Dues record created successfully"
      });

      setFormData({
        user_id: '',
        amount: '',
        due_date: '',
        semester: '',
        academic_year: new Date().getFullYear().toString(),
        notes: ''
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating dues record:', error);
      toast({
        title: "Error",
        description: "Failed to create dues record",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Dues Record</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="user_id">Select Member</Label>
            <Select 
              value={formData.user_id} 
              onValueChange={(value) => setFormData({...formData, user_id: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select a member"} />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] bg-background">
                <ScrollArea className="h-[200px]">
                  {users.map((member) => (
                    <SelectItem 
                      key={member.user_id} 
                      value={member.user_id}
                      className="cursor-pointer hover:bg-accent"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {member.full_name || member.email}
                        </span>
                        {member.full_name && (
                          <span className="text-xs text-muted-foreground">
                            {member.email} • {member.role}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({...formData, due_date: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="semester">Semester</Label>
            <Select value={formData.semester} onValueChange={(value) => setFormData({...formData, semester: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="Fall 2025">Fall 2025</SelectItem>
                <SelectItem value="Spring 2025">Spring 2025</SelectItem>
                <SelectItem value="Summer 2025">Summer 2025</SelectItem>
                <SelectItem value="Fall 2024">Fall 2024</SelectItem>
                <SelectItem value="Spring 2024">Spring 2024</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="academic_year">Academic Year</Label>
            <Input
              id="academic_year"
              value={formData.academic_year}
              onChange={(e) => setFormData({...formData, academic_year: e.target.value})}
              placeholder="2025"
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90"
            >
              {loading ? "Creating..." : "Create Dues Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};