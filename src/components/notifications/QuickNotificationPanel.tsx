import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mail, MessageSquare, Users, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PhoneNumberStatus from './PhoneNumberStatus';

interface QuickNotificationData {
  type: 'email' | 'sms' | 'in-app';
  recipientType: 'individual' | 'group';
  selectedGroup?: string;
  selectedIndividual?: string;
  subject?: string;
  message: string;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  role: string;
  voice_part?: string;
}

export const QuickNotificationPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [formData, setFormData] = useState<QuickNotificationData>({
    type: 'in-app',
    recipientType: 'group',
    selectedGroup: 'all_members',
    message: ''
  });

  const groupOptions = [
    { value: 'all_members', label: 'All Members', description: 'Current active members' },
    { value: 'executive_board', label: 'Executive Board', description: 'Board members only' },
    { value: 'section_leaders', label: 'Section Leaders', description: 'Voice part leaders' },
    { value: 'soprano_1', label: 'Soprano 1', description: 'S1 section' },
    { value: 'soprano_2', label: 'Soprano 2', description: 'S2 section' },
    { value: 'alto_1', label: 'Alto 1', description: 'A1 section' },
    { value: 'alto_2', label: 'Alto 2', description: 'A2 section' },
    { value: 'all_alumnae', label: 'All Alumnae', description: 'Alumni members' },
  ];

  useEffect(() => {
    if (formData.recipientType === 'individual') {
      fetchUsers();
    }
  }, [formData.recipientType]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, phone_number, role, voice_part')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSend = async () => {
    if (!formData.message.trim()) {
      toast({
        title: 'Message Required',
        description: 'Please enter a message to send.',
        variant: 'destructive'
      });
      return;
    }

    if (formData.recipientType === 'individual' && !formData.selectedIndividual) {
      toast({
        title: 'Recipient Required',
        description: 'Please select a recipient for individual messages.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      let response;

      if (formData.type === 'email') {
        response = await supabase.functions.invoke('gw-send-email', {
          body: {
            to: formData.recipientType === 'individual' 
              ? users.find(u => u.user_id === formData.selectedIndividual)?.email 
              : ['admin@gleeworld.com'], // Replace with actual group emails
            subject: formData.subject || 'Notification from Glee Club',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #8B2635, #6B1E29); padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0;">Spelman College Glee Club</h1>
                </div>
                <div style="padding: 30px; background: white;">
                  <h2 style="color: #8B2635; margin-top: 0;">${formData.subject || 'Notification'}</h2>
                  <p style="color: #333; line-height: 1.6; font-size: 16px;">${formData.message}</p>
                </div>
              </div>
            `,
            message: formData.message
          }
        });
      } else if (formData.type === 'sms') {
        // Use send-sms-notification for group/individual SMS
        response = await supabase.functions.invoke('send-sms-notification', {
          body: {
            groupId: formData.recipientType === 'group' ? formData.selectedGroup : null,
            phoneNumbers: formData.recipientType === 'individual' ? [formData.selectedIndividual] : undefined,
            message: formData.message,
            senderName: user?.user_metadata?.full_name || 'Glee Club'
          }
        });
      } else {
        // In-app notification
        response = await supabase.functions.invoke('send-notifications', {
          body: {
            type: formData.recipientType,
            target: formData.recipientType === 'group' ? formData.selectedGroup : formData.selectedIndividual,
            title: formData.subject || 'New Notification',
            message: formData.message,
            sender_id: user?.id
          }
        });
      }

      if (response.error) throw response.error;

      toast({
        title: 'Sent Successfully!',
        description: `${formData.type.toUpperCase()} notification sent to ${formData.recipientType === 'group' ? 'group' : 'individual'}.`
      });

      // Reset form
      setFormData({
        type: 'in-app',
        recipientType: 'group',
        selectedGroup: 'all_members',
        message: '',
        subject: ''
      });

    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Send Failed',
        description: error.message || 'Failed to send notification. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Quick Send Notification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type Selection */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={formData.type === 'in-app' ? 'default' : 'outline'}
            onClick={() => setFormData(prev => ({ ...prev, type: 'in-app' }))}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            In-App
          </Button>
          <Button
            variant={formData.type === 'email' ? 'default' : 'outline'}
            onClick={() => setFormData(prev => ({ ...prev, type: 'email' }))}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button
            variant={formData.type === 'sms' ? 'default' : 'outline'}
            onClick={() => setFormData(prev => ({ ...prev, type: 'sms' }))}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            SMS
          </Button>
        </div>

        {/* SMS Warning */}
        {formData.type === 'sms' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-white mt-0.5" />
              <div className="text-sm text-white">
                <p className="font-medium text-white">SMS requires phone numbers in profiles</p>
                <p className="text-xs mt-1 text-white">
                  Members without phone numbers won't receive SMS messages.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recipient Type */}
        <div className="space-y-2">
          <Label>Send To</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={formData.recipientType === 'group' ? 'default' : 'outline'}
              onClick={() => setFormData(prev => ({ ...prev, recipientType: 'group' }))}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Group
            </Button>
            <Button
              variant={formData.recipientType === 'individual' ? 'default' : 'outline'}
              onClick={() => setFormData(prev => ({ ...prev, recipientType: 'individual' }))}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Individual
            </Button>
          </div>
        </div>

        {/* Group Selection */}
        {formData.recipientType === 'group' && (
          <div className="space-y-2">
            <Label htmlFor="group-select">Select Group</Label>
            <Select
              value={formData.selectedGroup}
              onValueChange={(value) => setFormData(prev => ({ ...prev, selectedGroup: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose group" />
              </SelectTrigger>
              <SelectContent>
                {groupOptions.map((group) => (
                  <SelectItem key={group.value} value={group.value}>
                    <div>
                      <div className="font-medium">{group.label}</div>
                      <div className="text-xs text-muted-foreground">{group.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Show SMS coverage for groups */}
            {formData.type === 'sms' && formData.selectedGroup && (
              <div className="p-2 bg-muted/50 rounded-md">
                <PhoneNumberStatus groupType={formData.selectedGroup} />
              </div>
            )}
          </div>
        )}

        {/* Individual Selection */}
        {formData.recipientType === 'individual' && (
          <div className="space-y-2">
            <Label htmlFor="individual-select">Select Recipient</Label>
            <Select
              value={formData.selectedIndividual}
              onValueChange={(value) => setFormData(prev => ({ ...prev, selectedIndividual: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose recipient" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{user.full_name}</span>
                      <div className="flex items-center gap-1 ml-2">
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                        {formData.type === 'sms' && !user.phone_number && (
                          <Badge variant="destructive" className="text-xs">No phone</Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Subject (for email) */}
        {formData.type === 'email' && (
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Email subject..."
            />
          </div>
        )}

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            placeholder={`Type your ${formData.type} message...`}
            rows={4}
            maxLength={formData.type === 'sms' ? 160 : undefined}
          />
          {formData.type === 'sms' && (
            <p className="text-xs text-muted-foreground text-right">
              {formData.message.length}/160 characters
            </p>
          )}
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={loading || !formData.message.trim()}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {loading ? 'Sending...' : `Send ${formData.type.toUpperCase()}`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuickNotificationPanel;