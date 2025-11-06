import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Send, Loader2, Users, CheckCircle2, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AlumnaeUser {
  user_id: string;
  email: string;
  full_name: string | null;
}

export const AlumnaeEmailManager = () => {
  const [alumnae, setAlumnae] = useState<AlumnaeUser[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlumnae();
  }, []);

  const fetchAlumnae = async () => {
    try {
      setLoading(true);
      
      // Fetch from both user_roles and gw_profiles to get all alumnae
      const [{ data: roleData }, { data: profileData }] = await Promise.all([
        supabase.from('user_roles').select('user_id').eq('role', 'alumna'),
        supabase.from('gw_profiles').select('user_id, email, full_name').eq('role', 'alumna')
      ]);

      const roleIds = (roleData || []).map(r => r.user_id);
      const profileMap = new Map(
        (profileData || []).map(p => [p.user_id, p])
      );

      // Combine and get unique alumnae with email addresses
      const uniqueIds = new Set([...roleIds, ...Array.from(profileMap.keys())]);
      const alumnaeList: AlumnaeUser[] = [];

      for (const id of uniqueIds) {
        const profile = profileMap.get(id);
        if (profile?.email) {
          alumnaeList.push({
            user_id: id,
            email: profile.email,
            full_name: profile.full_name
          });
        }
      }

      setAlumnae(alumnaeList);
    } catch (error) {
      console.error('Error fetching alumnae:', error);
      toast.error('Failed to load alumnae list');
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipient = (userId: string) => {
    const newSelection = new Set(selectedRecipients);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedRecipients(newSelection);
  };

  const selectAll = () => {
    const filtered = filteredAlumnae;
    const filteredIds = new Set(filtered.map(a => a.user_id));
    
    if (filtered.every(a => selectedRecipients.has(a.user_id))) {
      // Deselect all filtered
      const newSelection = new Set(selectedRecipients);
      filteredIds.forEach(id => newSelection.delete(id));
      setSelectedRecipients(newSelection);
    } else {
      // Select all filtered
      setSelectedRecipients(new Set([...selectedRecipients, ...filteredIds]));
    }
  };

  const filteredAlumnae = alumnae.filter(alumna => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      alumna.full_name?.toLowerCase().includes(query) ||
      alumna.email.toLowerCase().includes(query)
    );
  });

  const sendEmail = async () => {
    if (selectedRecipients.size === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast.error('Please provide both subject and message');
      return;
    }

    setSending(true);
    try {
      const recipients = alumnae
        .filter(a => selectedRecipients.has(a.user_id))
        .map(a => ({
          email: a.email,
          name: a.full_name || a.email
        }));

      console.log('📧 Sending email to', recipients.length, 'alumnae');

      const { data, error } = await supabase.functions.invoke('send-alumnae-email', {
        body: {
          recipients,
          subject,
          message
        }
      });

      if (error) throw error;

      toast.success(`Email sent to ${recipients.length} alumnae!`);
      
      // Clear form
      setSubject('');
      setMessage('');
      setSelectedRecipients(new Set());
      
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email to Alumnae
          </CardTitle>
          <CardDescription>
            Compose and send emails to selected alumnae members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recipient Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Recipients</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                {filteredAlumnae.every(a => selectedRecipients.has(a.user_id)) && filteredAlumnae.length > 0 ? 'Deselect All' : 'Select All'}
                {selectedRecipients.size > 0 && ` (${selectedRecipients.size})`}
              </Button>
            </div>

            {/* Search Field */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Card>
              <ScrollArea className="h-[200px] p-4">
                <div className="space-y-3">
                  {filteredAlumnae.map((alumna) => (
                    <div key={alumna.user_id} className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedRecipients.has(alumna.user_id)}
                        onCheckedChange={() => toggleRecipient(alumna.user_id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {alumna.full_name || 'No Name'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {alumna.email}
                        </p>
                      </div>
                      {selectedRecipients.has(alumna.user_id) && (
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  ))}
                  
                  {filteredAlumnae.length === 0 && searchQuery && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No alumnae found matching "{searchQuery}"
                    </p>
                  )}

                  {alumnae.length === 0 && !searchQuery && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No alumnae found with email addresses
                    </p>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Email Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Enter email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This will be sent as a professionally formatted email with the Glee Club branding
              </p>
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <Button
              onClick={sendEmail}
              disabled={sending || selectedRecipients.size === 0 || !subject.trim() || !message.trim()}
              className="gap-2"
              size="lg"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send to {selectedRecipients.size} {selectedRecipients.size === 1 ? 'Recipient' : 'Recipients'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
