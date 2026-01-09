import React, { useState, useEffect } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { MessageSquare, UserPlus, Phone, Search, Send, Check } from 'lucide-react';
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
  const [manualPhone, setManualPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      fetchUsers();
      setSentTo(new Set());
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, first_name, last_name, phone_number, email')
        .not('phone_number', 'is', null)
        .order('last_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const phone = user.phone_number || '';
    return (
      fullName.includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery)
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

  const sendSMSInvites = async () => {
    const phoneNumbers: string[] = [];

    // Collect selected users' phone numbers
    selectedUsers.forEach((userId) => {
      const user = users.find((u) => u.user_id === userId);
      if (user?.phone_number) {
        phoneNumbers.push(user.phone_number);
      }
    });

    // Add manual phone number if provided
    if (manualPhone.trim()) {
      phoneNumbers.push(manualPhone.trim());
    }

    if (phoneNumbers.length === 0) {
      toast({
        title: 'No Recipients',
        description: 'Please select users or enter a phone number',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const message = customMessage.trim() || getDefaultMessage();

      const { data, error } = await supabase.functions.invoke('send-sms-notification', {
        body: {
          message,
          senderName: 'GleeWorld Meetings',
          phoneNumbers,
        },
      });

      if (error) throw error;

      const successCount = data?.totalSent || 0;
      const failedCount = data?.totalFailed || 0;

      // Track sent invites
      const newSentTo = new Set(sentTo);
      selectedUsers.forEach((id) => newSentTo.add(id));
      setSentTo(newSentTo);

      toast({
        title: 'Invites Sent',
        description: `Successfully sent ${successCount} SMS invite${successCount !== 1 ? 's' : ''}${failedCount > 0 ? `. ${failedCount} failed.` : ''}`,
      });

      // Clear manual phone after sending
      setManualPhone('');
      setSelectedUsers(new Set());
    } catch (error: any) {
      console.error('Error sending SMS invites:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send SMS invites',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
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
            Send SMS invites for "{meeting.title}"
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Select Users</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
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
                  No users with phone numbers found
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                      onClick={() => toggleUser(user.user_id)}
                    >
                      <Checkbox
                        checked={selectedUsers.has(user.user_id)}
                        onCheckedChange={() => toggleUser(user.user_id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {user.phone_number}
                        </p>
                      </div>
                      {sentTo.has(user.user_id) && (
                        <Badge variant="secondary" className="gap-1">
                          <Check className="h-3 w-3" />
                          Sent
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-phone">Phone Number</Label>
              <Input
                id="manual-phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a phone number to send an invite directly
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
            onClick={sendSMSInvites}
            disabled={sending || (selectedUsers.size === 0 && !manualPhone.trim())}
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : 'Send SMS Invites'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
