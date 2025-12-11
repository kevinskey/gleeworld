import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { TreePine, CheckCircle2, XCircle, Mail, MessageSquare, Send, Loader2, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface SurveyResponse {
  id: string;
  user_id: string;
  attended: boolean;
  enjoyed_most: string | null;
  song_order: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
    phone_number?: string;
  };
}

const TreeLightingSurveyModule = () => {
  const { user } = useAuth();
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, attended: 0, notAttended: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageTab, setMessageTab] = useState<'email' | 'sms'>('email');
  const [emailSubject, setEmailSubject] = useState("Stipend Payment - CashApp Information Needed");
  const [messageBody, setMessageBody] = useState(
    `Hello!\n\nThank you for participating in the Tree Lighting event. We hope you enjoyed it!\n\nTo process your stipend payment, please reply with your CashApp username (e.g., $YourCashApp).\n\nBest regards,\nGlee Club`
  );
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    setIsLoading(true);
    try {
      const { data: basicData, error: basicError } = await supabase
        .from("tree_lighting_survey_responses")
        .select("*")
        .order("created_at", { ascending: false });

      if (basicError) throw basicError;

      // Fetch profiles separately with phone numbers
      const userIds = basicData?.map(r => r.user_id) || [];
      const { data: profiles } = await supabase
        .from("gw_profiles")
        .select("user_id, full_name, email, phone_number")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const enrichedData = basicData?.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id)
      })) || [];

      setResponses(enrichedData);
      calculateStats(enrichedData);
    } catch (error) {
      console.error("Error fetching survey responses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: SurveyResponse[]) => {
    const total = data.length;
    const attended = data.filter(r => r.attended).length;
    const notAttended = total - attended;
    setStats({ total, attended, notAttended });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === responses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(responses.map(r => r.id)));
    }
  };

  const toggleSelectAttended = () => {
    const attendedIds = responses.filter(r => r.attended).map(r => r.id);
    setSelectedIds(new Set(attendedIds));
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const getSelectedRecipients = () => {
    return responses.filter(r => selectedIds.has(r.id));
  };

  const sendEmails = async () => {
    const recipients = getSelectedRecipients();
    const emails = recipients.map(r => r.profile?.email).filter(Boolean) as string[];
    
    if (emails.length === 0) {
      toast.error("No valid email addresses found");
      return;
    }

    setIsSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const email of emails) {
      try {
        const { data, error } = await supabase.functions.invoke('gw-send-email', {
          body: {
            to: email,
            subject: emailSubject,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e40af;">GleeWorld - Stipend Information Request</h2>
              <div style="white-space: pre-line; line-height: 1.6;">${messageBody}</div>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
              <p style="color: #6b7280; font-size: 12px;">This is an automated message from GleeWorld.</p>
            </div>`
          }
        });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
        failCount++;
      }
    }

    setIsSending(false);
    
    if (successCount > 0) {
      toast.success(`Successfully sent ${successCount} email${successCount > 1 ? 's' : ''}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to send ${failCount} email${failCount > 1 ? 's' : ''}`);
    }
    
    if (successCount > 0) {
      setIsMessageDialogOpen(false);
    }
  };

  const sendSMS = async () => {
    const recipients = getSelectedRecipients();
    const phones = recipients.map(r => r.profile?.phone_number).filter(Boolean) as string[];
    
    if (phones.length === 0) {
      toast.error("No valid phone numbers found for selected recipients");
      return;
    }

    setIsSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const phone of phones) {
      try {
        const { data, error } = await supabase.functions.invoke('gw-send-sms', {
          body: {
            to: phone,
            message: messageBody
          }
        });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Failed to send SMS to ${phone}:`, error);
        failCount++;
      }
    }

    setIsSending(false);
    
    if (successCount > 0) {
      toast.success(`Successfully sent ${successCount} SMS message${successCount > 1 ? 's' : ''}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to send ${failCount} SMS message${failCount > 1 ? 's' : ''}`);
    }
    
    if (successCount > 0) {
      setIsMessageDialogOpen(false);
    }
  };

  const handleSend = () => {
    if (messageTab === 'email') {
      sendEmails();
    } else {
      sendSMS();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading survey responses...</p>
        </CardContent>
      </Card>
    );
  }

  const selectedRecipients = getSelectedRecipients();
  const hasEmailRecipients = selectedRecipients.some(r => r.profile?.email);
  const hasSmsRecipients = selectedRecipients.some(r => r.profile?.phone_number);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TreePine className="h-5 w-5 text-green-600" />
              <CardTitle>Survey Module</CardTitle>
            </div>
            {selectedIds.size > 0 && (
              <Button 
                onClick={() => setIsMessageDialogOpen(true)}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Message Selected ({selectedIds.size})
              </Button>
            )}
          </div>
          <CardDescription>
            Manage and view survey responses. Select respondents to send them messages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Responses</p>
              </CardContent>
            </Card>
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.attended}</p>
                <p className="text-xs text-muted-foreground">Attended</p>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{stats.notAttended}</p>
                <p className="text-xs text-muted-foreground">Did Not Attend</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button variant="outline" size="sm" onClick={toggleSelectAll}>
              <Users className="h-4 w-4 mr-1" />
              {selectedIds.size === responses.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button variant="outline" size="sm" onClick={toggleSelectAttended}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Select Attended Only
            </Button>
            {selectedIds.size > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear Selection
              </Button>
            )}
          </div>

          {/* Table */}
          {responses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No responses yet</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedIds.size === responses.length && responses.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Attended</TableHead>
                    <TableHead>What They Enjoyed</TableHead>
                    <TableHead>Song Order</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => (
                    <TableRow key={response.id} className={selectedIds.has(response.id) ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.has(response.id)}
                          onCheckedChange={() => toggleSelect(response.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{response.profile?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{response.profile?.email}</p>
                          {response.profile?.phone_number && (
                            <p className="text-xs text-muted-foreground">{response.profile.phone_number}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {response.attended ? (
                          <Badge className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm truncate" title={response.enjoyed_most || ""}>
                          {response.enjoyed_most || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm truncate whitespace-pre-line" title={response.song_order || ""}>
                          {response.song_order || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(response.created_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Message to {selectedIds.size} Recipient{selectedIds.size > 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Send an email or SMS to selected survey respondents to request their CashApp information for stipend payment.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={messageTab} onValueChange={(v) => setMessageTab(v as 'email' | 'sms')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                Email ({selectedRecipients.filter(r => r.profile?.email).length})
              </TabsTrigger>
              <TabsTrigger value="sms" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS ({selectedRecipients.filter(r => r.profile?.phone_number).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-body">Message</Label>
                <Textarea
                  id="email-body"
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Your message..."
                  rows={8}
                />
              </div>
              {!hasEmailRecipients && (
                <p className="text-sm text-destructive">No selected recipients have email addresses.</p>
              )}
            </TabsContent>

            <TabsContent value="sms" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="sms-body">Message (SMS)</Label>
                <Textarea
                  id="sms-body"
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Your message..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  {messageBody.length}/160 characters (longer messages may be split)
                </p>
              </div>
              {!hasSmsRecipients && (
                <p className="text-sm text-destructive">No selected recipients have phone numbers.</p>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={isSending || (messageTab === 'email' ? !hasEmailRecipients : !hasSmsRecipients)}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send {messageTab === 'email' ? 'Emails' : 'SMS'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TreeLightingSurveyModule;
