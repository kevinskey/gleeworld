import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Users, Send, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EmailRecipient {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface EmailGroup {
  id: string;
  name: string;
  description: string;
  member_count: number;
}

export const MassEmailManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [emailGroups, setEmailGroups] = useState<EmailGroup[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [customEmails, setCustomEmails] = useState<string>('');
  
  const [emailData, setEmailData] = useState({
    subject: '',
    message: '',
    sendMethod: 'groups', // 'groups', 'individual', 'custom'
    priority: 'normal',
    scheduleFor: '',
  });

  useEffect(() => {
    loadRecipients();
    loadEmailGroups();
  }, []);

  const loadRecipients = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .order('full_name');

      if (error) throw error;
      setRecipients(data || []);
    } catch (error) {
      console.error('Error loading recipients:', error);
      toast({
        title: "Error",
        description: "Failed to load recipients",
        variant: "destructive",
      });
    }
  };

  const loadEmailGroups = async () => {
    // Create predefined groups based on user roles
    const groups = [
      { id: 'all-members', name: 'All Members', description: 'Every registered member', member_count: recipients.length },
      { id: 'admins', name: 'Administrators', description: 'Admin and super-admin users', member_count: recipients.filter(r => ['admin', 'super-admin'].includes(r.role)).length },
      { id: 'users', name: 'Regular Members', description: 'Standard member accounts', member_count: recipients.filter(r => r.role === 'user').length },
    ];
    setEmailGroups(groups);
  };

  const getRecipientsForGroups = (groupIds: string[]) => {
    let groupRecipients: EmailRecipient[] = [];
    
    groupIds.forEach(groupId => {
      switch (groupId) {
        case 'all-members':
          groupRecipients = [...groupRecipients, ...recipients];
          break;
        case 'admins':
          groupRecipients = [...groupRecipients, ...recipients.filter(r => ['admin', 'super-admin'].includes(r.role))];
          break;
        case 'users':
          groupRecipients = [...groupRecipients, ...recipients.filter(r => r.role === 'user')];
          break;
      }
    });

    // Remove duplicates
    return groupRecipients.filter((recipient, index, self) => 
      index === self.findIndex(r => r.id === recipient.id)
    );
  };

  const getAllSelectedRecipients = () => {
    let allRecipients: EmailRecipient[] = [];

    // Add group recipients
    if (selectedGroups.length > 0) {
      allRecipients = [...allRecipients, ...getRecipientsForGroups(selectedGroups)];
    }

    // Add individual recipients
    if (selectedRecipients.length > 0) {
      const individualRecipients = recipients.filter(r => selectedRecipients.includes(r.id));
      allRecipients = [...allRecipients, ...individualRecipients];
    }

    // Add custom emails
    if (customEmails.trim()) {
      const customEmailList = customEmails.split(',').map(email => email.trim()).filter(email => email);
      customEmailList.forEach(email => {
        allRecipients.push({
          id: `custom-${email}`,
          email,
          full_name: email,
          role: 'external'
        });
      });
    }

    // Remove duplicates
    return allRecipients.filter((recipient, index, self) => 
      index === self.findIndex(r => r.email === recipient.email)
    );
  };

  const handleSendEmail = async () => {
    if (!emailData.subject.trim() || !emailData.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both subject and message",
        variant: "destructive",
      });
      return;
    }

    const finalRecipients = getAllSelectedRecipients();
    if (finalRecipients.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please select recipients for your email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Call edge function to send mass email
      const { data, error } = await supabase.functions.invoke('send-mass-email', {
        body: {
          subject: emailData.subject,
          message: emailData.message,
          recipients: finalRecipients.map(r => ({ email: r.email, name: r.full_name })),
          priority: emailData.priority,
          scheduleFor: emailData.scheduleFor || null,
          sentBy: user?.id,
        }
      });

      if (error) throw error;

      toast({
        title: "Email Sent Successfully",
        description: `Mass email sent to ${finalRecipients.length} recipients`,
      });

      // Reset form
      setEmailData({
        subject: '',
        message: '',
        sendMethod: 'groups',
        priority: 'normal',
        scheduleFor: '',
      });
      setSelectedRecipients([]);
      setSelectedGroups([]);
      setCustomEmails('');

    } catch (error) {
      console.error('Error sending mass email:', error);
      toast({
        title: "Error",
        description: "Failed to send mass email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = getAllSelectedRecipients().length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Mass Email Manager
          </CardTitle>
          <CardDescription>
            Send emails to individual members, groups, or custom email lists
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Content */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Enter email subject"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your email message"
                className="min-h-[200px]"
                value={emailData.message}
                onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={emailData.priority} onValueChange={(value) => setEmailData(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="normal">Normal Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="schedule">Schedule for Later (Optional)</Label>
                <Input
                  id="schedule"
                  type="datetime-local"
                  value={emailData.scheduleFor}
                  onChange={(e) => setEmailData(prev => ({ ...prev, scheduleFor: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Recipients Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recipients</h3>
              <Badge variant="secondary">
                {selectedCount} recipient{selectedCount !== 1 ? 's' : ''} selected
              </Badge>
            </div>

            {/* Group Selection */}
            <div>
              <Label className="text-base font-medium">Email Groups</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                {emailGroups.map((group) => (
                  <Card key={group.id} className="p-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={selectedGroups.includes(group.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedGroups(prev => [...prev, group.id]);
                          } else {
                            setSelectedGroups(prev => prev.filter(id => id !== group.id));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <Label htmlFor={`group-${group.id}`} className="font-medium cursor-pointer">
                          {group.name}
                        </Label>
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                        <Badge variant="outline" className="mt-1">
                          {group.member_count} members
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Individual Selection */}
            <div>
              <Label className="text-base font-medium">Individual Members</Label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 mt-2">
                {recipients.map((recipient) => (
                  <div key={recipient.id} className="flex items-center space-x-2 py-1">
                    <Checkbox
                      id={`recipient-${recipient.id}`}
                      checked={selectedRecipients.includes(recipient.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRecipients(prev => [...prev, recipient.id]);
                        } else {
                          setSelectedRecipients(prev => prev.filter(id => id !== recipient.id));
                        }
                      }}
                    />
                    <Label htmlFor={`recipient-${recipient.id}`} className="cursor-pointer flex-1">
                      {recipient.full_name} ({recipient.email})
                      <Badge variant="outline" className="ml-2">{recipient.role}</Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Emails */}
            <div>
              <Label htmlFor="custom-emails" className="text-base font-medium">Custom Email Addresses</Label>
              <Textarea
                id="custom-emails"
                placeholder="Enter custom email addresses separated by commas"
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Add external email addresses not in the member list
              </p>
            </div>
          </div>

          <Separator />

          {/* Send Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSendEmail} 
              disabled={loading || selectedCount === 0}
              size="lg"
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {loading ? 'Sending...' : `Send to ${selectedCount} recipient${selectedCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};