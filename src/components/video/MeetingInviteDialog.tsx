import React, { useState, useEffect } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { UserPlus, Phone, Search, Send, Check, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MeetingInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: {
    id: string;
    title: string;
    room_name: string;
    scheduled_at: string;
    description?: string;
  };
}

interface User {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  email: string | null;
}

type InviteMethod = 'sms' | 'email' | 'both';

export const MeetingInviteDialog: React.FC<MeetingInviteDialogProps> = ({
  open,
  onOpenChange,
  meeting,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [manualContact, setManualContact] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [inviteMethod, setInviteMethod] = useState<InviteMethod>('email');

  useEffect(() => {
    if (open) {
      fetchUsers();
      setSentTo(new Set());
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all users with either phone or email
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, first_name, last_name, phone_number, email')
        .order('last_name');

      if (error) throw error;
      // Filter to users who have at least one contact method
      const usersWithContact = (data || []).filter(
        u => u.phone_number || u.email
      );
      setUsers(usersWithContact);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const phone = user.phone_number || '';
    const email = user.email || '';
    return (
      fullName.includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery) ||
      email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set(filteredUsers.map((u) => u.user_id));
    setSelectedUsers(allIds);
  };

  const deselectAll = () => {
    setSelectedUsers(new Set());
  };

  const getMeetingLink = () => {
    return `https://gleeworld.org/messenger?join=${meeting.room_name}`;
  };

  const getDefaultMessage = () => {
    const timezone = 'America/New_York';
    const meetingTime = formatInTimeZone(new Date(meeting.scheduled_at), timezone, "PPP 'at' p zzz");
    return `You're invited to "${meeting.title}" on ${meetingTime}. Join here: ${getMeetingLink()}`;
  };

  const getEmailHtml = (message: string) => {
    const timezone = 'America/New_York';
    const meetingTime = formatInTimeZone(new Date(meeting.scheduled_at), timezone, "EEEE, MMMM d, yyyy 'at' h:mm a zzz");
    const link = getMeetingLink();
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8B2635, #6B1E29); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Your favorite band or choir</h1>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2 style="color: #8B2635; margin-top: 0;">📹 Meeting Invitation</h2>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">${meeting.title}</h3>
            <p style="color: #666; margin: 8px 0;">
              <strong>When:</strong> ${meetingTime}
            </p>
            ${meeting.description ? `<p style="color: #666; margin: 8px 0;">${meeting.description}</p>` : ''}
          </div>
          
          ${message !== getDefaultMessage() ? `<p style="color: #333; line-height: 1.6; font-size: 16px;">${message}</p>` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" 
               style="background: #8B2635; color: white; padding: 14px 40px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;
                      font-size: 16px; font-weight: bold;">
              Join Meeting
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center;">
            Or copy this link: <a href="${link}" style="color: #8B2635;">${link}</a>
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Sent from GleeWorld Meetings
            </p>
          </div>
        </div>
      </div>
    `;
  };

  const sendInvites = async () => {
    const selectedUsersList = Array.from(selectedUsers).map(userId => 
      users.find(u => u.user_id === userId)
    ).filter((u): u is User => !!u);

    // Collect contacts based on invite method
    const phoneNumbers: string[] = [];
    const emailAddresses: string[] = [];

    selectedUsersList.forEach((user) => {
      if ((inviteMethod === 'sms' || inviteMethod === 'both') && user.phone_number) {
        phoneNumbers.push(user.phone_number);
      }
      if ((inviteMethod === 'email' || inviteMethod === 'both') && user.email) {
        emailAddresses.push(user.email);
      }
    });

    // Add manual contact
    if (manualContact.trim()) {
      const contact = manualContact.trim();
      // Check if it's an email or phone
      if (contact.includes('@')) {
        emailAddresses.push(contact);
      } else {
        phoneNumbers.push(contact);
      }
    }

    if (phoneNumbers.length === 0 && emailAddresses.length === 0) {
      toast({
        title: 'No Recipients',
        description: 'Please select users or enter a contact',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    const message = customMessage.trim() || getDefaultMessage();
    let smsSuccess = 0;
    let smsFailed = 0;
    let emailSuccess = 0;
    let emailFailed = 0;

    try {
      // Send SMS if needed
      if (phoneNumbers.length > 0) {
        const { data, error } = await supabase.functions.invoke('send-sms-notification', {
          body: {
            message,
            senderName: 'GleeWorld Meetings',
            phoneNumbers,
          },
        });

        if (error) {
          console.error('SMS error:', error);
          smsFailed = phoneNumbers.length;
        } else {
          smsSuccess = data?.totalSent || 0;
          smsFailed = data?.totalFailed || 0;
        }
      }

      // Send emails if needed
      if (emailAddresses.length > 0) {
        const emailHtml = getEmailHtml(message);
        
        for (const email of emailAddresses) {
          try {
            const { error } = await supabase.functions.invoke('gw-send-email', {
              body: {
                to: email,
                subject: `Meeting Invitation: ${meeting.title}`,
                html: emailHtml,
              },
            });

            if (error) {
              console.error(`Email error for ${email}:`, error);
              emailFailed++;
            } else {
              emailSuccess++;
            }
          } catch (err) {
            console.error(`Email error for ${email}:`, err);
            emailFailed++;
          }
        }
      }

      // Track sent invites
      const newSentTo = new Set(sentTo);
      selectedUsers.forEach((id) => newSentTo.add(id));
      setSentTo(newSentTo);

      // Build success message
      const parts: string[] = [];
      if (smsSuccess > 0) parts.push(`${smsSuccess} SMS`);
      if (emailSuccess > 0) parts.push(`${emailSuccess} email${emailSuccess !== 1 ? 's' : ''}`);
      
      const failedParts: string[] = [];
      if (smsFailed > 0) failedParts.push(`${smsFailed} SMS`);
      if (emailFailed > 0) failedParts.push(`${emailFailed} email${emailFailed !== 1 ? 's' : ''}`);

      toast({
        title: 'Invites Sent',
        description: `Successfully sent ${parts.join(' and ')}${failedParts.length > 0 ? `. Failed: ${failedParts.join(', ')}` : ''}`,
      });

      // Clear after sending
      setManualContact('');
      setSelectedUsers(new Set());
    } catch (error: any) {
      console.error('Error sending invites:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invites',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const getContactInfo = (user: User) => {
    const hasPhone = !!user.phone_number;
    const hasEmail = !!user.email;
    
    if (inviteMethod === 'sms' && !hasPhone) return { available: false, reason: 'No phone' };
    if (inviteMethod === 'email' && !hasEmail) return { available: false, reason: 'No email' };
    if (inviteMethod === 'both' && !hasPhone && !hasEmail) return { available: false, reason: 'No contact' };
    
    return { available: true };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite to Meeting
          </DialogTitle>
          <DialogDescription>
            Send invites for "{meeting.title}"
          </DialogDescription>
        </DialogHeader>

        {/* Invite Method Selection */}
        <div className="space-y-2">
          <Label>Send via</Label>
          <RadioGroup
            value={inviteMethod}
            onValueChange={(v) => setInviteMethod(v as InviteMethod)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="email" id="email" />
              <Label htmlFor="email" className="flex items-center gap-1 cursor-pointer">
                <Mail className="h-4 w-4" />
                Email
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sms" id="sms" />
              <Label htmlFor="sms" className="flex items-center gap-1 cursor-pointer">
                <MessageSquare className="h-4 w-4" />
                SMS
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="both" id="both" />
              <Label htmlFor="both" className="cursor-pointer">Both</Label>
            </div>
          </RadioGroup>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Select Users</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {selectedUsers.size} selected
              </span>
              <div className="space-x-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Clear
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[200px] border rounded-md p-2">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map((user) => {
                    const contactInfo = getContactInfo(user);
                    return (
                      <div
                        key={user.user_id}
                        className={`flex items-center space-x-3 p-2 rounded-md hover:bg-accent cursor-pointer ${
                          !contactInfo.available ? 'opacity-50' : ''
                        }`}
                        onClick={() => contactInfo.available && toggleUser(user.user_id)}
                      >
                        <Checkbox
                          checked={selectedUsers.has(user.user_id)}
                          onCheckedChange={() => contactInfo.available && toggleUser(user.user_id)}
                          disabled={!contactInfo.available}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.first_name} {user.last_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {user.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{user.email}</span>
                              </span>
                            )}
                            {user.phone_number && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 shrink-0" />
                                {user.phone_number}
                              </span>
                            )}
                          </div>
                        </div>
                        {!contactInfo.available && (
                          <Badge variant="outline" className="text-xs">
                            {contactInfo.reason}
                          </Badge>
                        )}
                        {sentTo.has(user.user_id) && (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="h-3 w-3" />
                            Sent
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-contact">Email or Phone Number</Label>
              <Input
                id="manual-contact"
                placeholder="email@example.com or +1 (555) 123-4567"
                value={manualContact}
                onChange={(e) => setManualContact(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter an email address or phone number to send an invite directly
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="custom-message">Custom Message (optional)</Label>
          <Textarea
            id="custom-message"
            placeholder={getDefaultMessage()}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use the default invite message
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={sendInvites}
            disabled={sending || (selectedUsers.size === 0 && !manualContact.trim())}
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : 'Send Invites'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
