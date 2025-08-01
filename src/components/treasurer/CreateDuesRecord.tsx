import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User, DollarSign, Calendar, FileText } from "lucide-react";

interface Member {
  user_id: string;
  full_name: string;
  email: string;
  voice_part?: string;
  class_year?: number;
}

interface CreateDuesRecordProps {
  onSuccess: () => void;
  editingRecord?: any;
  onCancel: () => void;
}

export const CreateDuesRecord = ({ onSuccess, editingRecord, onCancel }: CreateDuesRecordProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const [formData, setFormData] = useState({
    user_id: editingRecord?.user_id || '',
    amount: editingRecord?.amount?.toString() || '',
    due_date: editingRecord?.due_date?.split('T')[0] || '',
    semester: editingRecord?.semester || 'fall',
    academic_year: editingRecord?.academic_year || new Date().getFullYear().toString(),
    notes: editingRecord?.notes || ''
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      console.log('Fetching members for dues record...');
      
      // First try to get all profiles
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, voice_part, class_year')
        .not('user_id', 'is', null)
        .order('full_name');

      if (error) {
        console.error('Error fetching members:', error);
        throw error;
      }
      
      console.log(`Successfully fetched ${data?.length || 0} members`);
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: "Error",
        description: "Failed to load members list",
        variant: "destructive"
      });
    } finally {
      setMembersLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const duesData = {
        user_id: formData.user_id,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        semester: formData.semester,
        academic_year: formData.academic_year,
        notes: formData.notes || null,
        status: 'pending' as const
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('gw_dues_records')
          .update(duesData)
          .eq('id', editingRecord.id);

        if (error) throw error;
        toast({ title: "Success", description: "Dues record updated successfully" });
      } else {
        const { error } = await supabase
          .from('gw_dues_records')
          .insert([duesData]);

        if (error) throw error;
        toast({ title: "Success", description: "Dues record created successfully" });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving dues record:', error);
      toast({
        title: "Error",
        description: "Failed to save dues record",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedMember = members.find(m => m.user_id === formData.user_id);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          {editingRecord ? 'Edit Dues Record' : 'Create New Dues Record'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Member Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Select Member
            </label>
            <Select 
              value={formData.user_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
              disabled={membersLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={membersLoading ? "Loading members..." : "Choose a member"}>
                  {selectedMember && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{selectedMember.full_name}</span>
                      {selectedMember.voice_part && (
                        <span className="text-xs text-muted-foreground">({selectedMember.voice_part})</span>
                      )}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{member.full_name}</span>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{member.email}</span>
                        {member.voice_part && <span>• {member.voice_part}</span>}
                        {member.class_year && <span>• Class of {member.class_year}</span>}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="50.00"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Date
              </label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Semester and Academic Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Semester</label>
              <Select value={formData.semester} onValueChange={(value) => setFormData(prev => ({ ...prev, semester: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fall">Fall</SelectItem>
                  <SelectItem value="spring">Spring</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Academic Year</label>
              <Input
                value={formData.academic_year}
                onChange={(e) => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
                placeholder="2024"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes (optional)
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this dues record..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.user_id}>
              {loading ? "Saving..." : editingRecord ? "Update Record" : "Create Record"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};