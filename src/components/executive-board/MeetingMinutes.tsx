import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  FileText, 
  Calendar, 
  User, 
  Clock,
  Edit3,
  Trash2,
  Download
} from "lucide-react";

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  meeting_type: string;
  attendees: string[];
  agenda_items: string[];
  discussion_points: string;
  action_items: string[];
  next_meeting_date: string | null;
  status: 'draft' | 'approved' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const MeetingMinutes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMinute, setEditingMinute] = useState<MeetingMinute | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    meeting_date: '',
    meeting_type: 'executive_board',
    attendees: '',
    agenda_items: '',
    discussion_points: '',
    action_items: '',
    next_meeting_date: '',
    status: 'draft' as const
  });

  useEffect(() => {
    fetchMeetingMinutes();
  }, []);

  const fetchMeetingMinutes = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_meeting_minutes')
        .select('*')
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMinutes(data || []);
    } catch (error) {
      console.error('Error fetching meeting minutes:', error);
      toast({
        title: "Error",
        description: "Failed to load meeting minutes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const minuteData = {
        title: formData.title,
        meeting_date: formData.meeting_date,
        meeting_type: formData.meeting_type,
        attendees: formData.attendees.split(',').map(a => a.trim()).filter(a => a),
        agenda_items: formData.agenda_items.split('\n').filter(item => item.trim()),
        discussion_points: formData.discussion_points,
        action_items: formData.action_items.split('\n').filter(item => item.trim()),
        next_meeting_date: formData.next_meeting_date || null,
        status: formData.status,
        created_by: user.id
      };

      if (editingMinute) {
        const { error } = await supabase
          .from('gw_meeting_minutes')
          .update(minuteData)
          .eq('id', editingMinute.id);

        if (error) throw error;
        toast({ title: "Success", description: "Meeting minutes updated successfully" });
      } else {
        const { error } = await supabase
          .from('gw_meeting_minutes')
          .insert([minuteData]);

        if (error) throw error;
        toast({ title: "Success", description: "Meeting minutes created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchMeetingMinutes();
    } catch (error) {
      console.error('Error saving meeting minutes:', error);
      toast({
        title: "Error",
        description: "Failed to save meeting minutes",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      meeting_date: '',
      meeting_type: 'executive_board',
      attendees: '',
      agenda_items: '',
      discussion_points: '',
      action_items: '',
      next_meeting_date: '',
      status: 'draft'
    });
    setEditingMinute(null);
  };

  const handleEdit = (minute: MeetingMinute) => {
    setEditingMinute(minute);
    setFormData({
      title: minute.title,
      meeting_date: minute.meeting_date.split('T')[0],
      meeting_type: minute.meeting_type,
      attendees: minute.attendees.join(', '),
      agenda_items: minute.agenda_items.join('\n'),
      discussion_points: minute.discussion_points,
      action_items: minute.action_items.join('\n'),
      next_meeting_date: minute.next_meeting_date?.split('T')[0] || '',
      status: minute.status
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gw_meeting_minutes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Meeting minutes deleted" });
      fetchMeetingMinutes();
    } catch (error) {
      console.error('Error deleting meeting minutes:', error);
      toast({
        title: "Error",
        description: "Failed to delete meeting minutes",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'draft': return 'secondary';
      case 'archived': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse text-center">Loading meeting minutes...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bebas tracking-wide">Meeting Minutes</h2>
          <p className="text-muted-foreground">Executive board meeting records and minutes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Meeting Minutes
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMinute ? 'Edit Meeting Minutes' : 'Create Meeting Minutes'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Meeting Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Executive Board Meeting"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Meeting Date</label>
                  <Input
                    type="date"
                    value={formData.meeting_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, meeting_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Meeting Type</label>
                  <Select value={formData.meeting_type} onValueChange={(value) => setFormData(prev => ({ ...prev, meeting_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executive_board">Executive Board</SelectItem>
                      <SelectItem value="general_meeting">General Meeting</SelectItem>
                      <SelectItem value="committee">Committee Meeting</SelectItem>
                      <SelectItem value="emergency">Emergency Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={formData.status} onValueChange={(value: 'draft' | 'approved' | 'archived') => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Attendees (comma-separated)</label>
                <Input
                  value={formData.attendees}
                  onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
                  placeholder="President, Secretary, Treasurer, ..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Agenda Items (one per line)</label>
                <Textarea
                  value={formData.agenda_items}
                  onChange={(e) => setFormData(prev => ({ ...prev, agenda_items: e.target.value }))}
                  placeholder="Review budget&#10;Plan upcoming events&#10;Discuss new initiatives"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Discussion Points</label>
                <Textarea
                  value={formData.discussion_points}
                  onChange={(e) => setFormData(prev => ({ ...prev, discussion_points: e.target.value }))}
                  placeholder="Detailed discussion notes and key points covered..."
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Action Items (one per line)</label>
                <Textarea
                  value={formData.action_items}
                  onChange={(e) => setFormData(prev => ({ ...prev, action_items: e.target.value }))}
                  placeholder="Secretary to send follow-up email&#10;Treasurer to prepare budget report&#10;President to schedule next meeting"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Next Meeting Date (optional)</label>
                <Input
                  type="date"
                  value={formData.next_meeting_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, next_meeting_date: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMinute ? 'Update' : 'Create'} Minutes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {minutes.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Meeting Minutes</h3>
              <p className="text-muted-foreground mb-4">
                Start documenting your executive board meetings by creating your first meeting minutes.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Minutes
              </Button>
            </CardContent>
          </Card>
        ) : (
          minutes.map((minute) => (
            <Card key={minute.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {minute.title}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(minute.meeting_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {minute.attendees.length} attendees
                      </div>
                      <Badge variant={getStatusColor(minute.status)}>
                        {minute.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(minute)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(minute.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {minute.agenda_items.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Agenda Items</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {minute.agenda_items.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {minute.discussion_points && (
                  <div>
                    <h4 className="font-medium mb-2">Discussion Points</h4>
                    <p className="text-sm text-muted-foreground">{minute.discussion_points}</p>
                  </div>
                )}

                {minute.action_items.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Action Items</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {minute.action_items.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {minute.next_meeting_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Next meeting: {new Date(minute.next_meeting_date).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};