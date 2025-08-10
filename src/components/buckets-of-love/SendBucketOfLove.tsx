import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Users, User, Send, Smile } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
const EmojiPicker = lazy(() => import('@emoji-mart/react'));

interface SendBucketOfLoveProps {
  trigger?: React.ReactNode;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: string;
}

const SendBucketOfLove: React.FC<SendBucketOfLoveProps> = ({ trigger }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [noteColor, setNoteColor] = useState('yellow');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [decorations, setDecorations] = useState('');
  const [sendType, setSendType] = useState<'individual' | 'group'>('individual');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [emojiData, setEmojiData] = useState<any>(null);
  useEffect(() => {
    // Lazy-load emoji data bundle to reduce initial payload
    import('@emoji-mart/data').then((m) => setEmojiData((m as any).default || m));
  }, []);

  const groupOptions = [
    { value: 'all_members', label: 'All Members', description: 'Send to all current members' },
    { value: 'all_alumnae', label: 'All Alumnae', description: 'Send to all alumnae' },
    { value: 'all_fans', label: 'All Fans', description: 'Send to all fans' },
    { value: 'executive_board', label: 'Executive Board', description: 'Send to executive board members' },
    { value: 'soprano_1', label: 'Soprano 1', description: 'Send to all Soprano 1 members' },
    { value: 'soprano_2', label: 'Soprano 2', description: 'Send to all Soprano 2 members' },
    { value: 'alto_1', label: 'Alto 1', description: 'Send to all Alto 1 members' },
    { value: 'alto_2', label: 'Alto 2', description: 'Send to all Alto 2 members' },
  ];

  const noteColors = [
    { value: 'yellow', label: 'Yellow', color: 'bg-yellow-200' },
    { value: 'pink', label: 'Pink', color: 'bg-pink-200' },
    { value: 'blue', label: 'Blue', color: 'bg-blue-200' },
    { value: 'green', label: 'Green', color: 'bg-green-200' },
    { value: 'purple', label: 'Purple', color: 'bg-purple-200' },
    { value: 'orange', label: 'Orange', color: 'bg-orange-200' },
  ];

  useEffect(() => {
    if (isOpen && sendType === 'individual') {
      fetchUsers();
    }
  }, [isOpen, sendType]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, first_name, last_name, role')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    if (sendType === 'individual' && !selectedUser) {
      toast({
        title: "Error", 
        description: "Please select a recipient",
        variant: "destructive",
      });
      return;
    }

    if (sendType === 'group' && !selectedGroup) {
      toast({
        title: "Error",
        description: "Please select a group",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (sendType === 'individual') {
        // Send to individual
        const { data: currentUser } = await supabase.auth.getUser();
        if (!currentUser.user) throw new Error('Not authenticated');

        const { error } = await supabase
          .from('gw_buckets_of_love')
          .insert({
            user_id: currentUser.user.id,
            message: message.trim(),
            note_color: noteColor,
            is_anonymous: isAnonymous,
            decorations: decorations.trim(),
            recipient_user_id: selectedUser
          });

        if (error) throw error;
      } else {
        // Send to group - call edge function to handle group sending
        const { error } = await supabase.functions.invoke('send-bucket-of-love-to-group', {
          body: {
            message: message.trim(),
            note_color: noteColor,
            is_anonymous: isAnonymous,
            decorations: decorations.trim(),
            group_type: selectedGroup
          }
        });

        if (error) throw error;
      }

      toast({
        title: "Success!",
        description: `Bucket of love sent to ${sendType === 'individual' ? 'recipient' : 'group'}! 💙`,
      });

      // Reset form
      setMessage('');
      setNoteColor('yellow');
      setIsAnonymous(false);
      setDecorations('');
      setSelectedUser('');
      setSelectedGroup('');
      setIsOpen(false);

    } catch (error) {
      console.error('Error sending bucket of love:', error);
      toast({
        title: "Error",
        description: "Failed to send bucket of love",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMessage('');
    setNoteColor('yellow');
    setIsAnonymous(false);
    setDecorations('');
    setSelectedUser('');
    setSelectedGroup('');
    setSendType('individual');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Heart className="h-4 w-4" />
            Send Bucket of Love
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Send a Bucket of Love
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Send Type Selection */}
          <Tabs value={sendType} onValueChange={(value) => setSendType(value as 'individual' | 'group')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Individual
              </TabsTrigger>
              <TabsTrigger value="group" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Group
              </TabsTrigger>
            </TabsList>

            <TabsContent value="individual" className="space-y-4">
              <div>
                <Label htmlFor="recipient">Recipient</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder={usersLoading ? "Loading users..." : "Select a recipient"} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="group" className="space-y-4">
              <div>
                <Label htmlFor="group">Group</Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
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
              </div>
            </TabsContent>
          </Tabs>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="message">Message</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-1">
                    <Smile className="h-4 w-4" />
                    Emoji
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="p-0 w-[320px]">
                  {emojiData ? (
                    <Suspense fallback={<div className="p-3 text-sm">Loading emojis…</div>}>
                      <EmojiPicker data={emojiData} onEmojiSelect={(e: any) => setMessage((prev) => prev + (e?.native || ''))} />
                    </Suspense>
                  ) : (
                    <div className="p-3 text-sm">Loading emojis…</div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <Textarea
              id="message"
              placeholder="Share your love and appreciation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          {/* Note Color */}
          <div>
            <Label>Note Color</Label>
            <div className="flex gap-2 mt-2">
              {noteColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setNoteColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 ${color.color} ${
                    noteColor === color.value ? 'border-primary' : 'border-gray-300'
                  }`}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Decorations */}
          <div>
            <Label htmlFor="decorations">Decorations (emojis)</Label>
            <Input
              id="decorations"
              placeholder="💙🎶✨"
              value={decorations}
              onChange={(e) => setDecorations(e.target.value)}
            />
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked === true)}
            />
            <Label htmlFor="anonymous">Send anonymously</Label>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSend}
              disabled={loading}
              className="flex-1 gap-2"
            >
              <Send className="h-4 w-4" />
              {loading ? 'Sending...' : 'Send Bucket of Love'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendBucketOfLove;