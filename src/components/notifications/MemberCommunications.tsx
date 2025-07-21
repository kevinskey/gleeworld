import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Users, Send, Download, Eye, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Communication {
  id: string;
  title: string;
  content: string;
  communication_type: string;
  recipient_id?: string;
  recipient_name?: string;
  created_at: string;
  status: string;
  file_url?: string;
}

const COMMUNICATION_TYPES = [
  { value: 'excuse_letter', label: 'Excuse Letter' },
  { value: 'warning_letter', label: 'Warning Letter' },
  { value: 'commendation', label: 'Commendation Letter' },
  { value: 'general_notice', label: 'General Notice' },
  { value: 'attendance_notice', label: 'Attendance Notice' },
  { value: 'event_invitation', label: 'Event Invitation' },
  { value: 'other', label: 'Other Communication' },
];

export const MemberCommunications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    communication_type: '',
    recipient_id: '',
    send_notification: true,
  });

  useEffect(() => {
    loadCommunications();
    loadMembers();
  }, []);

  const loadCommunications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_member_communications')
        .select(`
          *,
          recipient:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommunications(data || []);
    } catch (error) {
      console.error('Error loading communications:', error);
      toast({
        title: "Error",
        description: "Failed to load member communications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleCreateCommunication = async () => {
    if (!formData.title.trim() || !formData.content.trim() || !formData.communication_type) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_member_communications')
        .insert([{
          title: formData.title,
          content: formData.content,
          communication_type: formData.communication_type,
          recipient_id: formData.recipient_id || null,
          created_by: user?.id,
          status: 'active',
        }])
        .select()
        .single();

      if (error) throw error;

      // Send notification if requested and recipient is specified
      if (formData.send_notification && formData.recipient_id) {
        const recipient = members.find(m => m.id === formData.recipient_id);
        if (recipient) {
          const { error: notifyError } = await supabase.functions.invoke('gw-send-email', {
            body: {
              to: recipient.email,
              subject: `New Communication: ${formData.title}`,
              message: `Dear ${recipient.full_name},\n\nYou have received a new communication from the Glee Club.\n\nTitle: ${formData.title}\nType: ${COMMUNICATION_TYPES.find(t => t.value === formData.communication_type)?.label}\n\nPlease log in to your dashboard to view the full details.\n\nBest regards,\nSpelman Glee Club Administration`,
              notificationId: data.id
            }
          });

          if (notifyError) {
            console.error('Error sending notification:', notifyError);
          }
        }
      }

      toast({
        title: "Communication Created",
        description: "Member communication has been created successfully",
      });

      setFormData({
        title: '',
        content: '',
        communication_type: '',
        recipient_id: '',
        send_notification: true,
      });
      setShowCreateForm(false);
      loadCommunications();

    } catch (error) {
      console.error('Error creating communication:', error);
      toast({
        title: "Error",
        description: "Failed to create member communication",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'excuse_letter':
        return 'bg-blue-100 text-blue-800';
      case 'warning_letter':
        return 'bg-red-100 text-red-800';
      case 'commendation':
        return 'bg-green-100 text-green-800';
      case 'attendance_notice':
        return 'bg-yellow-100 text-yellow-800';
      case 'event_invitation':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Member Communications</h2>
          <p className="text-muted-foreground">
            Manage letters, notices, and other member communications
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Communication
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Communication</CardTitle>
            <CardDescription>
              Send letters, notices, or other communications to members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Communication title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="type">Communication Type</Label>
                <Select value={formData.communication_type} onValueChange={(value) => setFormData(prev => ({ ...prev, communication_type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMUNICATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="recipient">Recipient (Optional)</Label>
              <Select value={formData.recipient_id} onValueChange={(value) => setFormData(prev => ({ ...prev, recipient_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient or leave blank for general notice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">General Notice (No specific recipient)</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name} ({member.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Enter the communication content"
                className="min-h-[200px]"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="send-notification"
                  checked={formData.send_notification}
                  onChange={(e) => setFormData(prev => ({ ...prev, send_notification: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="send-notification">Send email notification to recipient</Label>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateCommunication}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {loading ? 'Creating...' : 'Create Communication'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Communications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Communications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && communications.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading communications...</p>
            </div>
          ) : communications.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No communications created yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {communications.map((comm) => (
                <div key={comm.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{comm.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className={getTypeColor(comm.communication_type)}>
                          {COMMUNICATION_TYPES.find(t => t.value === comm.communication_type)?.label}
                        </Badge>
                        {comm.recipient_name && (
                          <Badge variant="outline">
                            To: {comm.recipient_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(comm.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {comm.content}
                  </p>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};