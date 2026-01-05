import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Smartphone, Video, X, Send, Users, Search, Loader2 } from "lucide-react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { BackNavigation } from "@/components/shared/BackNavigation";
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ActiveVideoSessions } from '@/components/glee-lounge/video-sessions/ActiveVideoSessions';
import { CreateVideoSessionDialog } from '@/components/glee-lounge/video-sessions/CreateVideoSessionDialog';
import { VideoSessionViewer } from '@/components/glee-lounge/video-sessions/VideoSessionViewer';

interface RecipientGroup {
  id: string;
  name: string;
  count: number;
}

const Messenger = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { toast } = useToast();

  // Composer state
  const [composerMode, setComposerMode] = useState<'email' | 'sms' | 'video'>('email');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // SMS specific state
  const [smsContent, setSmsContent] = useState('');
  const [sendToAll, setSendToAll] = useState(false);
  const [smsRecipients, setSmsRecipients] = useState<Array<{user_id: string, full_name: string, phone_number: string}>>([]);

  // Groups
  const [recipientGroups, setRecipientGroups] = useState<RecipientGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showGroupsPanel, setShowGroupsPanel] = useState(false);

  // Video state
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [activeVideoSession, setActiveVideoSession] = useState<{id: string; roomName: string; isRecording: boolean} | null>(null);

  // Search for members
  useEffect(() => {
    const searchMembers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, phone_number')
        .ilike('full_name', `%${searchQuery}%`)
        .limit(5);
      
      if (!error && data) {
        setSearchResults(data);
      }
    };
    
    const timer = setTimeout(searchMembers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load groups
  useEffect(() => {
    const loadGroups = async () => {
      setLoadingGroups(true);
      try {
        const { data, error } = await supabase
          .from('messenger_groups')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
        
        if (!error && data) {
          // For now, just set a placeholder count since we don't have member counts readily available
          const groupsWithCounts = data.map(group => ({
            ...group,
            count: 0 // Placeholder - actual count would require more complex queries
          }));
          setRecipientGroups(groupsWithCounts);
        }
      } catch (err) {
        console.error('Failed to load groups:', err);
      }
      setLoadingGroups(false);
    };
    loadGroups();
  }, []);

  const addRecipient = (email: string) => {
    if (email && !recipients.includes(email)) {
      setRecipients([...recipients, email]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const addSmsRecipient = (recipient: {user_id: string; full_name: string; phone_number: string}) => {
    if (!smsRecipients.find(r => r.user_id === recipient.user_id)) {
      setSmsRecipients([...smsRecipients, recipient]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeSmsRecipient = (userId: string) => {
    setSmsRecipients(smsRecipients.filter(r => r.user_id !== userId));
  };

  const handleAddGroup = async (group: RecipientGroup) => {
    // For email groups, we need to fetch emails based on group type
    // This is a simplified version - the full implementation would query based on group criteria
    toast({ 
      title: `Group: ${group.name}`, 
      description: "Group recipient fetching will be implemented based on group type" 
    });
  };

  const handleSendEmail = async () => {
    if (recipients.length === 0 || !subject.trim()) return;
    
    setIsSending(true);
    try {
      const htmlContent = `
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

      const { error } = await supabase.functions.invoke('send-branded-email', {
        body: { to: recipients, subject, html: htmlContent, from_name: userProfile?.full_name }
      });

      if (error) throw error;
      
      toast({ title: "Email sent!", description: `Sent to ${recipients.length} recipient(s)` });
      setRecipients([]);
      setSubject('');
      setContent('');
    } catch (error: any) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSMS = async () => {
    if (!sendToAll && smsRecipients.length === 0) {
      toast({ title: "No recipients", description: "Please add recipients or select Send to All", variant: "destructive" });
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
      setSmsContent('');
      setSmsRecipients([]);
    } catch (error: any) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Header section */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-b border-border bg-background">
          <div className="max-w-5xl mx-auto">
            <BackNavigation className="mb-2" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-primary">
                  <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">GleeWorld Messenger</h1>
                  <p className="text-xs text-muted-foreground">Send branded emails, SMS, and video calls</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGroupsPanel(!showGroupsPanel)}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Groups</span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full flex max-w-5xl mx-auto w-full">
            {/* Composer Area */}
            <div className={`flex-1 flex flex-col overflow-hidden ${showGroupsPanel ? 'hidden sm:flex' : ''}`}>
              {/* Tabs */}
              <Tabs value={composerMode} onValueChange={(v) => setComposerMode(v as 'email' | 'sms' | 'video')} className="flex flex-col flex-1 overflow-hidden">
                <TabsList className="grid w-full grid-cols-3 rounded-none bg-muted/50 h-11 p-0 gap-0">
                  <TabsTrigger 
                    value="email" 
                    className="gap-2 rounded-none h-full border-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="sms" 
                    className="gap-2 rounded-none h-full border-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>SMS</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="video" 
                    className="gap-2 rounded-none h-full border-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground"
                  >
                    <Video className="h-4 w-4" />
                    <span>Video</span>
                  </TabsTrigger>
                </TabsList>

                {/* Email Tab */}
                <TabsContent value="email" className="flex-1 overflow-auto mt-0 data-[state=active]:flex data-[state=active]:flex-col">
                  <div className="flex-1 bg-primary p-4 sm:p-6 space-y-4">
                    {/* Recipients */}
                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-primary-foreground">To:</Label>
                      <div className="flex flex-wrap gap-2 p-3 min-h-[48px] border border-primary-foreground/20 rounded-lg bg-background">
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
                            className="border-0 h-8 p-0 focus-visible:ring-0 bg-transparent"
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
                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-primary-foreground">Subject:</Label>
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Enter subject line..."
                        className="h-12 bg-background border-primary-foreground/20"
                      />
                    </div>

                    {/* Content */}
                    <div className="space-y-1 flex-1 flex flex-col min-h-0">
                      <Label className="text-sm font-medium text-primary-foreground">Message:</Label>
                      <div className="flex-1 min-h-[200px]">
                        <RichTextEditor
                          value={content}
                          onChange={setContent}
                          placeholder="Compose your email with rich formatting..."
                          minHeight="200px"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Send Button - Fixed at bottom */}
                  <div className="p-4 bg-primary/80 border-t border-primary-foreground/10">
                    <Button 
                      onClick={handleSendEmail} 
                      disabled={isSending || recipients.length === 0 || !subject.trim()}
                      variant="ghost"
                      className="w-full text-primary-foreground hover:bg-primary-foreground/10"
                    >
                      {isSending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                      ) : (
                        <><Send className="h-4 w-4 mr-2" /> Send Email</>
                      )}
                    </Button>
                  </div>
                </TabsContent>

                {/* SMS Tab */}
                <TabsContent value="sms" className="flex-1 overflow-auto mt-0 data-[state=active]:flex data-[state=active]:flex-col">
                  <div className="flex-1 bg-primary p-4 sm:p-6 space-y-4">
                    {/* Send to All Toggle */}
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <Label>Send to All Members with Phone</Label>
                      </div>
                      <Switch checked={sendToAll} onCheckedChange={setSendToAll} />
                    </div>

                    {/* Individual Recipients */}
                    {!sendToAll && (
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-primary-foreground">Recipients:</Label>
                        <div className="flex flex-wrap gap-2 p-3 min-h-[48px] border border-primary-foreground/20 rounded-lg bg-background">
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
                              className="border-0 h-8 p-0 focus-visible:ring-0 bg-transparent"
                            />
                            {searchResults.filter(r => r.phone_number).length > 0 && (
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
                    <div className="space-y-1 flex-1 flex flex-col">
                      <Label className="text-sm font-medium text-primary-foreground">Message:</Label>
                      <Textarea
                        value={smsContent}
                        onChange={(e) => setSmsContent(e.target.value)}
                        placeholder="Type your SMS message..."
                        className="flex-1 min-h-[150px] resize-none bg-background border-primary-foreground/20"
                        maxLength={480}
                      />
                      <div className="flex justify-between text-xs text-primary-foreground/70 mt-1">
                        <span>{smsContent.length}/480 characters</span>
                        <span>{Math.ceil(smsContent.length / 160) || 1} SMS segment{smsContent.length > 160 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Send Button */}
                  <div className="p-4 bg-primary/80 border-t border-primary-foreground/10">
                    <Button 
                      onClick={handleSendSMS} 
                      disabled={isSending || (!sendToAll && smsRecipients.length === 0) || !smsContent.trim()}
                      variant="ghost"
                      className="w-full text-primary-foreground hover:bg-primary-foreground/10"
                    >
                      {isSending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                      ) : (
                        <><Send className="h-4 w-4 mr-2" /> Send SMS {sendToAll ? 'to All Members' : ''}</>
                      )}
                    </Button>
                  </div>
                </TabsContent>

                {/* Video Tab */}
                <TabsContent value="video" className="flex-1 overflow-auto mt-0 p-4 sm:p-6 bg-primary data-[state=active]:flex data-[state=active]:flex-col">
                  <div className="bg-background rounded-lg p-4 flex-1">
                    <ActiveVideoSessions
                      onJoinSession={(sessionId, roomName, isRecording) => setActiveVideoSession({
                        id: sessionId,
                        roomName: roomName,
                        isRecording: isRecording
                      })}
                      onCreateSession={() => setShowCreateSession(true)}
                    />
                  </div>
                  
                  <CreateVideoSessionDialog
                    open={showCreateSession}
                    onOpenChange={setShowCreateSession}
                    onSessionCreated={(sessionId, roomName) => {
                      setActiveVideoSession({
                        id: sessionId,
                        roomName: roomName,
                        isRecording: false
                      });
                      setShowCreateSession(false);
                    }}
                  />
                  
                  {activeVideoSession && (
                    <VideoSessionViewer
                      sessionId={activeVideoSession.id}
                      roomName={activeVideoSession.roomName}
                      isRecordingEnabled={activeVideoSession.isRecording}
                      onClose={() => setActiveVideoSession(null)}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Groups Panel */}
            {showGroupsPanel && (
              <div className="w-full sm:w-72 border-l bg-muted/30 p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Quick Add Groups
                  </h3>
                  <button 
                    onClick={() => setShowGroupsPanel(false)}
                    className="p-2 hover:bg-muted rounded-lg sm:hidden"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {loadingGroups ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : recipientGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No groups available
                    </p>
                  ) : (
                    recipientGroups.map((group) => (
                      <Button
                        key={group.id}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left"
                        onClick={() => handleAddGroup(group)}
                      >
                        <span className="flex-1 truncate">{group.name}</span>
                        <Badge variant="secondary" className="ml-2">{group.count}</Badge>
                      </Button>
                    ))
                  )}
                </div>

                {/* Email Preview */}
                {composerMode === 'email' && subject && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3 text-sm">Preview</h3>
                    <div className="bg-gradient-to-br from-primary to-primary/70 rounded-t-lg p-3 text-center">
                      <h4 className="text-primary-foreground font-bold text-sm">✨ GleeWorld</h4>
                      <p className="text-primary-foreground/80 text-xs">Spelman College Glee Club</p>
                    </div>
                    <div className="bg-background border border-t-0 rounded-b-lg p-3">
                      <h5 className="font-semibold text-sm mb-2">{subject}</h5>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {content || 'Your message will appear here...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default Messenger;
