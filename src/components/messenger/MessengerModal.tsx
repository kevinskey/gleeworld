import React, { useState, useEffect } from 'react';
import { useMessenger } from '@/contexts/MessengerContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Smartphone, X, Send, Users, Search, Loader2, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { ActivityFeed } from '@/components/community/ActivityFeed';
import { QuickActions } from '@/components/community/QuickActions';
import { BucketsOfLoveWidget } from '@/components/shared/BucketsOfLoveWidget';
import { useIsMobile } from '@/hooks/use-mobile';

interface RecipientGroup {
  id: string;
  name: string;
  count: number;
}

export const MessengerModal: React.FC = () => {
  const { 
    isOpen, 
    requestClose, 
    showCloseWarning, 
    setShowCloseWarning, 
    confirmClose,
    setHasUnsavedChanges 
  } = useMessenger();
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Composer state
  const [composerMode, setComposerMode] = useState<'email' | 'sms' | 'community'>('email');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // SMS specific state
  const [smsContent, setSmsContent] = useState('');
  const [sendToAll, setSendToAll] = useState(false);
  const [smsRecipients, setSmsRecipients] = useState<Array<{user_id: string, full_name: string, phone_number: string}>>([]);

  // Groups from database
  const [recipientGroups, setRecipientGroups] = useState<RecipientGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [addingGroup, setAddingGroup] = useState<string | null>(null);
  const [showGroupsPanel, setShowGroupsPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch messenger groups from database
  useEffect(() => {
    const fetchGroups = async () => {
      setLoadingGroups(true);
      try {
        const { data, error } = await supabase
          .from('messenger_groups' as any)
          .select('id, name, member_count')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        
        setRecipientGroups((data || []).map((g: any) => ({
          id: g.id,
          name: g.name,
          count: g.member_count || 0
        })));
      } catch (err) {
        console.error('Error fetching groups:', err);
      } finally {
        setLoadingGroups(false);
      }
    };
    
    if (isOpen) {
      fetchGroups();
    }
  }, [isOpen]);

  // Add group members to recipients
  const handleAddGroup = async (group: RecipientGroup) => {
    setAddingGroup(group.id);
    try {
      // Fetch group members with their profiles
      const { data: members, error } = await supabase
        .from('messenger_group_members' as any)
        .select(`
          user_id,
          gw_profiles!inner(full_name, email, phone_number)
        `)
        .eq('group_id', group.id);
      
      if (error) throw error;
      
      if (!members || members.length === 0) {
        toast({ title: 'No members', description: `${group.name} has no members yet`, variant: 'destructive' });
        return;
      }

      if (composerMode === 'email') {
        // Add emails to recipients
        const emails = members
          .map((m: any) => m.gw_profiles?.email)
          .filter((e: string) => e && !recipients.includes(e));
        
        if (emails.length > 0) {
          setRecipients([...recipients, ...emails]);
          toast({ title: 'Added!', description: `Added ${emails.length} email(s) from ${group.name}` });
        } else {
          toast({ title: 'Already added', description: 'All members from this group are already in recipients' });
        }
      } else {
        // Add phone numbers to SMS recipients
        const newRecipients = members
          .filter((m: any) => m.gw_profiles?.phone_number && !smsRecipients.find(r => r.user_id === m.user_id))
          .map((m: any) => ({
            user_id: m.user_id,
            full_name: m.gw_profiles?.full_name || 'Unknown',
            phone_number: m.gw_profiles?.phone_number
          }));
        
        if (newRecipients.length > 0) {
          setSmsRecipients([...smsRecipients, ...newRecipients]);
          toast({ title: 'Added!', description: `Added ${newRecipients.length} recipient(s) from ${group.name}` });
        } else {
          toast({ title: 'No new recipients', description: 'All members with phone numbers are already added' });
        }
      }
    } catch (err: any) {
      console.error('Error adding group:', err);
      toast({ title: 'Error', description: 'Failed to load group members', variant: 'destructive' });
    } finally {
      setAddingGroup(null);
    }
  };

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = 
      subject.trim() !== '' || 
      content.trim() !== '' || 
      recipients.length > 0 ||
      smsContent.trim() !== '' ||
      smsRecipients.length > 0;
    setHasUnsavedChanges(hasChanges);
  }, [subject, content, recipients, smsContent, smsRecipients, setHasUnsavedChanges]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSubject('');
      setContent('');
      setRecipients([]);
      setRecipientInput('');
      setSmsContent('');
      setSmsRecipients([]);
      setSendToAll(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  // Search for recipients
  useEffect(() => {
    const searchRecipients = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email, phone_number')
          .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(10);
        
        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchRecipients, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const addRecipient = (email: string) => {
    if (email && !recipients.includes(email)) {
      setRecipients([...recipients, email]);
      setRecipientInput('');
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const addSmsRecipient = (recipient: {user_id: string, full_name: string, phone_number: string}) => {
    if (!smsRecipients.find(r => r.user_id === recipient.user_id)) {
      setSmsRecipients([...smsRecipients, recipient]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeSmsRecipient = (userId: string) => {
    setSmsRecipients(smsRecipients.filter(r => r.user_id !== userId));
  };

  const handleSendEmail = async () => {
    if (recipients.length === 0) {
      toast({ title: "No recipients", description: "Please add at least one recipient", variant: "destructive" });
      return;
    }
    if (!subject.trim()) {
      toast({ title: "No subject", description: "Please add a subject line", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const htmlContent = generateEmailHtml();
      
      const { error } = await supabase.functions.invoke('send-branded-email', {
        body: {
          to: recipients,
          subject,
          html: htmlContent,
          senderName: userProfile?.full_name || 'GleeWorld'
        }
      });

      if (error) throw error;

      toast({ title: "Email sent!", description: `Sent to ${recipients.length} recipient(s)` });
      confirmClose();
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSMS = async () => {
    if (!sendToAll && smsRecipients.length === 0) {
      toast({ title: "No recipients", description: "Please add at least one recipient", variant: "destructive" });
      return;
    }
    if (!smsContent.trim()) {
      toast({ title: "No message", description: "Please type a message", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          message: smsContent,
          sendToAll,
          recipients: sendToAll ? [] : smsRecipients.map(r => r.phone_number)
        }
      });

      if (error) throw error;

      toast({ title: "SMS sent!", description: sendToAll ? "Sent to all members" : `Sent to ${smsRecipients.length} recipient(s)` });
      confirmClose();
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const generateEmailHtml = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #0056a6 50%, #2563eb 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">✨ GleeWorld</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Spelman College Glee Club</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px 0; color: #1e293b; font-size: 22px; font-weight: 600;">${subject}</h2>
              <div style="color: #475569; font-size: 16px; line-height: 1.7;">${content.replace(/\n/g, '<br>')}</div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 13px;">Sent from GleeWorld by ${userProfile?.full_name || user?.email}</p>
              <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} Spelman College Glee Club</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && requestClose()}>
        <DialogContent className={`p-0 gap-0 bg-background transition-all duration-300 ${
          isMobile 
            ? 'max-w-[100vw] w-[100vw] h-[calc(100dvh-56px)] max-h-[calc(100dvh-56px)] rounded-none m-0 border-0 !top-14 !left-0 !translate-x-0 !translate-y-0' 
            : isFullscreen
              ? 'max-w-[100vw] w-[100vw] h-[100dvh] max-h-[100dvh] rounded-none m-0 border-0 !top-0 !left-0 !translate-x-0 !translate-y-0'
              : 'max-w-4xl max-h-[90vh] rounded-lg'
        }`}>
          <DialogHeader className={`border-b bg-gradient-to-r from-primary/10 via-background to-primary/5 ${isMobile ? 'px-3 py-3' : 'px-6 py-4'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center ${isMobile ? 'h-8 w-8' : 'h-10 w-10'}`}>
                  <Mail className={isMobile ? 'h-4 w-4 text-primary-foreground' : 'h-5 w-5 text-primary-foreground'} />
                </div>
                <div>
                  <DialogTitle className={isMobile ? 'text-base font-bold' : 'text-xl font-bold'}>GleeWorld Messenger</DialogTitle>
                  <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>Send branded emails and SMS to members or anyone</p>
                </div>
              </div>
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen mode"}
                  className="mr-8"
                >
                  {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className={`relative overflow-hidden ${isMobile ? 'h-[calc(100dvh-126px)]' : isFullscreen ? 'h-[calc(100dvh-70px)]' : 'max-h-[calc(90vh-100px)]'}`}>
            {/* Edge-attached Toggle Tab - Hidden on mobile */}
            {!showGroupsPanel && !isMobile && (
              <button
                onClick={() => setShowGroupsPanel(true)}
                className="absolute top-1/2 -translate-y-1/2 right-0 z-30 bg-primary text-primary-foreground px-1.5 py-6 rounded-l-lg shadow-lg hover:bg-primary/90 transition-colors flex flex-col items-center gap-1 writing-mode-vertical"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                <Users className="h-4 w-4 rotate-90" />
                <span className="text-xs font-medium tracking-wide">Groups</span>
              </button>
            )}

            {/* Main Composer - Full Width */}
            <div className={`overflow-y-auto ${isMobile ? 'p-3 h-[calc(100dvh-126px)]' : `p-6 pr-10 ${isFullscreen ? 'h-[calc(100vh-80px)]' : 'max-h-[calc(90vh-100px)]'}`}`}>
              <Tabs value={composerMode} onValueChange={(v) => setComposerMode(v as 'email' | 'sms' | 'community')} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="email" className="gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">Email</span>
                  </TabsTrigger>
                  <TabsTrigger value="sms" className="gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span className="hidden sm:inline">SMS</span>
                  </TabsTrigger>
                  <TabsTrigger value="community" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">Community</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-3 sm:space-y-4 mt-0">
                  <Card className="border-0 sm:border shadow-none sm:shadow-sm">
                    <CardContent className="p-0 sm:p-4 space-y-3 sm:space-y-4">
                      {/* Recipients */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">To:</Label>
                          {isMobile && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowGroupsPanel(true)}
                              className="h-7 text-xs gap-1"
                            >
                              <Users className="h-3 w-3" />
                              Groups
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 p-2 min-h-[44px] border rounded-lg bg-background">
                          {recipients.map((r, i) => (
                            <Badge key={i} variant="secondary" className="gap-1 pr-1">
                              {r}
                              <button onClick={() => removeRecipient(r)} className="hover:bg-muted-foreground/20 rounded-full p-0.5">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          <div className="relative flex-1 min-w-[200px]">
                            <Input
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchQuery.includes('@')) {
                                  addRecipient(searchQuery);
                                }
                              }}
                              placeholder="Search or type email..."
                              className="border-0 h-8 p-0 focus-visible:ring-0"
                            />
                            {searchResults.length > 0 && (
                              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {searchResults.map((result) => (
                                  <button
                                    key={result.user_id}
                                    onClick={() => addRecipient(result.email)}
                                    className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                                  >
                                    <span className="font-medium">{result.full_name}</span>
                                    <span className="text-sm text-muted-foreground">{result.email}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Subject */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Subject:</Label>
                        <Input
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Enter subject line..."
                        />
                      </div>

                      {/* Content */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Message:</Label>
                        <RichTextEditor
                          value={content}
                          onChange={setContent}
                          placeholder="Compose your email with rich formatting..."
                          minHeight={isFullscreen ? "calc(100vh - 450px)" : "250px"}
                        />
                      </div>

                      {/* Send Button */}
                      <Button 
                        onClick={handleSendEmail} 
                        disabled={isSending || recipients.length === 0 || !subject.trim()}
                        className="w-full"
                      >
                        {isSending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                        ) : (
                          <><Send className="h-4 w-4 mr-2" /> Send Email</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="sms" className="space-y-3 sm:space-y-4 mt-0">
                  <Card className="border-0 sm:border shadow-none sm:shadow-sm">
                    <CardContent className="p-0 sm:p-4 space-y-3 sm:space-y-4">
                      {/* Send to All Toggle */}
                      <div className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Switch checked={sendToAll} onCheckedChange={setSendToAll} />
                          <Label className="font-medium text-sm sm:text-base">Send to All Members</Label>
                        </div>
                        {sendToAll && (
                          <Badge variant="secondary" className="hidden sm:inline-flex">Broadcasts to all</Badge>
                        )}
                      </div>

                      {/* Individual Recipients (when not sending to all) */}
                      {!sendToAll && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Recipients:</Label>
                            {isMobile && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowGroupsPanel(true)}
                                className="h-7 text-xs gap-1"
                              >
                                <Users className="h-3 w-3" />
                                Groups
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 p-2 min-h-[44px] border rounded-lg bg-background">
                            {smsRecipients.map((r) => (
                              <Badge key={r.user_id} variant="secondary" className="gap-1 pr-1">
                                {r.full_name}
                                <button onClick={() => removeSmsRecipient(r.user_id)} className="hover:bg-muted-foreground/20 rounded-full p-0.5">
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                            <div className="relative flex-1 min-w-[200px]">
                              <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search members..."
                                className="border-0 h-8 p-0 focus-visible:ring-0"
                              />
                              {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                  {searchResults.filter(r => r.phone_number).map((result) => (
                                    <button
                                      key={result.user_id}
                                      onClick={() => addSmsRecipient({
                                        user_id: result.user_id,
                                        full_name: result.full_name,
                                        phone_number: result.phone_number
                                      })}
                                      className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                                    >
                                      <span className="font-medium">{result.full_name}</span>
                                      <span className="text-sm text-muted-foreground">{result.phone_number}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SMS Content */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Message:</Label>
                        <Textarea
                          value={smsContent}
                          onChange={(e) => setSmsContent(e.target.value)}
                          placeholder="Type your SMS message..."
                          className="min-h-[150px] resize-none"
                          maxLength={480}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{smsContent.length}/480 characters</span>
                          <span>{Math.ceil(smsContent.length / 160) || 1} SMS segment{smsContent.length > 160 ? 's' : ''}</span>
                        </div>
                      </div>

                      {/* Send Button */}
                      <Button 
                        onClick={handleSendSMS} 
                        disabled={isSending || (!sendToAll && smsRecipients.length === 0) || !smsContent.trim()}
                        className="w-full"
                      >
                        {isSending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                        ) : (
                          <><Send className="h-4 w-4 mr-2" /> Send SMS {sendToAll ? 'to All Members' : ''}</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Community Hub Tab */}
                <TabsContent value="community" className="space-y-4 mt-0">
                  <div className="space-y-4">
                    {/* Quick Actions */}
                    <QuickActions />
                    
                    {/* Activity Feed */}
                    <div className="max-h-[400px] overflow-y-auto">
                      <ActivityFeed />
                    </div>
                    
                    {/* Buckets of Love Widget */}
                    <BucketsOfLoveWidget />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Flyout Groups Panel - Full screen on mobile */}
            <div 
              className={`absolute top-0 right-0 h-full bg-background border-l shadow-xl transform transition-transform duration-300 ease-in-out z-20 ${
                isMobile ? 'w-full' : 'w-72'
              } ${
                showGroupsPanel ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="p-4 overflow-y-auto h-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Quick Add Groups
                  </h3>
                  <button 
                    onClick={() => setShowGroupsPanel(false)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="space-y-2">
                  {loadingGroups ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : recipientGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No groups available. Create groups in Messenger Admin.
                    </p>
                  ) : (
                    recipientGroups.map((group) => (
                      <Button
                        key={group.id}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left"
                        disabled={addingGroup === group.id}
                        onClick={() => handleAddGroup(group)}
                      >
                        {addingGroup === group.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        <span className="flex-1 truncate">{group.name}</span>
                        <Badge variant="secondary" className="ml-2 shrink-0">{group.count}</Badge>
                      </Button>
                    ))
                  )}
                </div>

                {/* Preview Section */}
                {composerMode === 'email' && subject && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3">Preview</h3>
                    <div className="bg-gradient-to-br from-primary to-primary/70 rounded-t-lg p-4 text-center">
                      <h4 className="text-primary-foreground font-bold">✨ GleeWorld</h4>
                      <p className="text-primary-foreground/80 text-xs">Spelman College Glee Club</p>
                    </div>
                    <div className="bg-background border border-t-0 rounded-b-lg p-4">
                      <h5 className="font-semibold text-sm mb-2">{subject || 'Your Subject'}</h5>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {content || 'Your message will appear here with beautiful branding...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Warning */}
      <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved content in the messenger. Are you sure you want to close without sending?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
