import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Search, Filter, CheckCircle, XCircle, UserCheck } from "lucide-react";
import { format } from "date-fns";

interface AlumnaeMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  graduation_year?: number;
  voice_part?: string;
  verified: boolean;
  mentor_opt_in: boolean;
  created_at: string;
}

export const AlumnaeMemberList = () => {
  const [members, setMembers] = useState<AlumnaeMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<AlumnaeMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVerified, setFilterVerified] = useState<boolean | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [searchQuery, filterVerified, members]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('*')
        .eq('role', 'alumna')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching alumnae members:', error);
      toast.error('Failed to load alumnae members');
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = members;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(member => 
        member.full_name?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.graduation_year?.toString().includes(query)
      );
    }

    // Verified filter
    if (filterVerified !== null) {
      filtered = filtered.filter(member => member.verified === filterVerified);
    }

    setFilteredMembers(filtered);
  };

  const toggleMemberSelection = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filteredMembers.map(m => m.user_id)));
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error('Please provide both subject and message');
      return;
    }

    if (selectedMembers.size === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    setSending(true);
    try {
      const recipients = filteredMembers
        .filter(m => selectedMembers.has(m.user_id))
        .map(m => ({
          email: m.email,
          name: m.full_name || m.email
        }));

      // Call edge function to send emails
      const { error } = await supabase.functions.invoke('send-alumnae-email', {
        body: {
          recipients,
          subject: emailSubject,
          message: emailMessage
        }
      });

      if (error) throw error;

      toast.success(`Email sent to ${recipients.length} recipients`);
      setEmailDialogOpen(false);
      setEmailSubject('');
      setEmailMessage('');
      setSelectedMembers(new Set());
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Alumnae Members ({filteredMembers.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedMembers.size} selected
            </p>
          </div>
          <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={selectedMembers.size === 0} className="gap-2">
                <Mail className="h-4 w-4" />
                Send Email ({selectedMembers.size})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Send Email to Selected Alumnae</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Recipients</Label>
                  <div className="text-sm text-muted-foreground">
                    {selectedMembers.size} alumnae member(s) selected
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Email subject"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Email message"
                    rows={10}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendEmail} disabled={sending}>
                    {sending ? 'Sending...' : 'Send Email'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or year..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterVerified === true ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterVerified(filterVerified === true ? null : true)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Verified
            </Button>
            <Button
              variant={filterVerified === false ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterVerified(filterVerified === false ? null : false)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Unverified
            </Button>
          </div>
        </div>

        {/* Select All */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <Checkbox
            checked={selectedMembers.size === filteredMembers.length && filteredMembers.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">Select All</span>
        </div>

        {/* Members List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No alumnae members found
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedMembers.has(member.user_id)}
                  onCheckedChange={() => toggleMemberSelection(member.user_id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium truncate">{member.full_name || member.email}</h3>
                    {member.verified && (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {member.mentor_opt_in && (
                      <Badge variant="secondary" className="text-xs">
                        Mentor
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{member.email}</span>
                    {member.graduation_year && (
                      <span>Class of '{member.graduation_year.toString().slice(-2)}</span>
                    )}
                    {member.voice_part && (
                      <span>{member.voice_part}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Joined {format(new Date(member.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
