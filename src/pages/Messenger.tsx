import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Smartphone, Video, X, Send, Users, Search, Loader2, GraduationCap, ShieldAlert, AlertCircle, ArrowLeft } from "lucide-react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { BackNavigation } from "@/components/shared/BackNavigation";
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useMessengerAccess } from '@/hooks/useMessengerAccess';
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
import { VideoSessionViewer } from '@/components/glee-lounge/video-sessions/VideoSessionViewer';
import { MobileVideoInterface } from '@/components/messenger/MobileVideoInterface';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { syncCourseMessengerGroup } from '@/hooks/useCourseMessengerSync';

interface RecipientGroup {
  id: string;
  name: string;
  count: number;
  type: 'manual' | 'course';
}

const Messenger = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Course context from query params
  const courseId = searchParams.get('courseId');
  const courseName = searchParams.get('courseName');
  
  const { 
    hasAccess, 
    messengerRole, 
    isLoading: accessLoading, 
    contacts, 
    courseGroups,
    canMessageAnyone,
    canSendSMS,
    noAccessReason 
  } = useMessengerAccess();
  const { toast } = useToast();
  
  // Sync course group when coming from a course page
  useEffect(() => {
    if (courseId && courseName) {
      const [code, ...titleParts] = decodeURIComponent(courseName).split(' - ');
      syncCourseMessengerGroup(courseId, code, titleParts.join(' - ')).then(result => {
        if (result.groupId) {
          toast({
            title: `Course Group Ready`,
            description: `${decodeURIComponent(courseName)} messaging synced`
          });
        }
      });
    }
  }, [courseId, courseName]);

  // Composer state
  const [composerMode, setComposerMode] = useState<'email' | 'sms' | 'video'>('email');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<typeof contacts>([]);

  // SMS specific state
  const [smsContent, setSmsContent] = useState('');
  const [sendToAll, setSendToAll] = useState(false);
  const [smsRecipients, setSmsRecipients] = useState<Array<{
    user_id: string;
    full_name: string;
    phone_number: string;
  }>>([]);

  // Groups
  const [recipientGroups, setRecipientGroups] = useState<RecipientGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showGroupsPanel, setShowGroupsPanel] = useState(false);

  // Video state
  const [activeVideoSession, setActiveVideoSession] = useState<{
    id: string;
    roomName: string;
    isRecording: boolean;
  } | null>(null);

  // Filter contacts based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts([]);
      return;
    }
    
    const filtered = contacts.filter(c => 
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 8);
    
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);

  // Build groups from course groups
  useEffect(() => {
    const groups: RecipientGroup[] = courseGroups.map(cg => ({
      id: `course:${cg.id}`,
      name: `📚 ${cg.title}`,
      count: cg.studentCount,
      type: 'course' as const
    }));
    setRecipientGroups(groups);
  }, [courseGroups]);

  const addRecipient = (email: string) => {
    if (email && !recipients.includes(email)) {
      setRecipients([...recipients, email]);
      setSearchQuery('');
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const addSmsRecipient = (recipient: {
    user_id: string;
    full_name: string;
    phone_number: string;
  }) => {
    if (!smsRecipients.find(r => r.user_id === recipient.user_id)) {
      setSmsRecipients([...smsRecipients, recipient]);
      setSearchQuery('');
    }
  };

  const removeSmsRecipient = (userId: string) => {
    setSmsRecipients(smsRecipients.filter(r => r.user_id !== userId));
  };

  const handleAddGroup = async (group: RecipientGroup) => {
    try {
      if (group.type === 'course') {
        // Extract course ID from group id (format: "course:uuid")
        const courseId = group.id.replace('course:', '');
        
        // Fetch all enrolled students' emails
        const { data: enrollments, error } = await supabase
          .from('gw_course_enrollments')
          .select('user_id, gw_profiles!inner(email)')
          .eq('course_id', courseId)
          .eq('role', 'student')
          .eq('enrollment_status', 'enrolled');
        
        if (error) throw error;
        
        if (enrollments && enrollments.length > 0) {
          const emails = enrollments
            .map((e: any) => e.gw_profiles?.email)
            .filter((email: string | null) => email && !recipients.includes(email));
          
          setRecipients([...recipients, ...emails]);
          toast({
            title: `Added ${emails.length} students`,
            description: `From ${group.name.replace('📚 ', '')}`
          });
        } else {
          toast({
            title: "No students found",
            description: "This course has no enrolled students",
            variant: "destructive"
          });
        }
      } else {
        // Handle manual groups (existing logic placeholder)
        toast({
          title: `Group: ${group.name}`,
          description: "Manual group recipient fetching coming soon"
        });
      }
    } catch (err: any) {
      toast({
        title: "Failed to add group",
        description: err.message,
        variant: "destructive"
      });
    }
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
      const {
        error
      } = await supabase.functions.invoke('send-branded-email', {
        body: {
          to: recipients,
          subject,
          html: htmlContent,
          senderName: userProfile?.full_name
        }
      });
      if (error) throw error;
      toast({
        title: "Email sent!",
        description: `Sent to ${recipients.length} recipient(s)`
      });
      setRecipients([]);
      setSubject('');
      setContent('');
    } catch (error: any) {
      toast({
        title: "Failed to send",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };
  const handleSendSMS = async () => {
    if (!sendToAll && smsRecipients.length === 0) {
      toast({
        title: "No recipients",
        description: "Please add recipients or select Send to All",
        variant: "destructive"
      });
      return;
    }
    if (!smsContent.trim()) {
      toast({
        title: "No message",
        description: "Please type a message",
        variant: "destructive"
      });
      return;
    }
    setIsSending(true);
    try {
      // Prepend sender name to message
      const senderName = userProfile?.full_name || user?.email?.split('@')[0] || 'GleeWorld';
      const messageWithSender = `[From: ${senderName}]\n\n${smsContent}`;
      
      const {
        error
      } = await supabase.functions.invoke('send-sms', {
        body: {
          message: messageWithSender,
          sendToAll,
          recipients: sendToAll ? [] : smsRecipients.map(r => r.phone_number)
        }
      });
      if (error) throw error;
      toast({
        title: "SMS sent!",
        description: sendToAll ? "Sent to all members" : `Sent to ${smsRecipients.length} recipient(s)`
      });
      setSmsContent('');
      setSmsRecipients([]);
    } catch (error: any) {
      toast({
        title: "Failed to send",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };
  // Show loading state
  if (accessLoading) {
    return (
      <UniversalLayout showHeader={true} showFooter={false}>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </UniversalLayout>
    );
  }

  // Show no-access message for fans
  if (!hasAccess) {
    return (
      <UniversalLayout showHeader={true} showFooter={false}>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-6">
          <div className="max-w-md text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold">Messenger Access Restricted</h1>
            <p className="text-muted-foreground">{noAccessReason}</p>
            <Button asChild className="mt-4">
              <a href="mailto:admin@gleeworld.org">Contact Admin</a>
            </Button>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="flex flex-col h-[calc(100dvh-var(--gw-header-h,4rem))]">
        {/* Header section */}
        <div className="flex-shrink-0 border-b border-border bg-background">
          <div className="max-w-5xl mx-auto">
            <BackNavigation className="mb-2" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-primary">
                  <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">GleeWorld Messenger</h1>
                    <Badge variant="outline" className="text-xs capitalize">{messengerRole}</Badge>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {canMessageAnyone 
                      ? 'Full access - message anyone' 
                      : messengerRole === 'alumna' 
                        ? 'Message alumnae and mentees'
                        : `Message your ${courseGroups.length} course${courseGroups.length !== 1 ? 's' : ''}`
                    }
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowGroupsPanel(!showGroupsPanel)} className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Groups ({recipientGroups.length})</span>
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
              <Tabs value={composerMode} onValueChange={v => setComposerMode(v as 'email' | 'sms' | 'video')} className="flex flex-col flex-1 overflow-hidden">
                <TabsList className={`grid w-full ${canSendSMS ? 'grid-cols-3' : 'grid-cols-2'} rounded-none bg-muted/50 h-11 p-0 gap-0`}>
                  <TabsTrigger value="email" className="gap-2 rounded-none h-full border-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </TabsTrigger>
                  {canSendSMS && (
                    <TabsTrigger value="sms" className="gap-2 rounded-none h-full border-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground">
                      <Smartphone className="h-4 w-4" />
                      <span>SMS</span>
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="video" className="gap-2 rounded-none h-full border-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground">
                    <Video className="h-4 w-4" />
                    <span>Video</span>
                  </TabsTrigger>
                </TabsList>

                {/* Email Tab */}
                <TabsContent value="email" className="flex-1 overflow-auto mt-0 data-[state=active]:flex data-[state=active]:flex-col">
                  <div className="flex-1 bg-primary p-4 sm:p-6 space-y-4 px-[10px] py-[10px]">
                    {/* Recipients */}
                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-primary-foreground">To:</Label>
                      <div className="flex flex-wrap gap-2 p-3 min-h-[48px] border border-primary-foreground/20 rounded-lg bg-background">
                        {recipients.map((r, i) => <Badge key={i} variant="secondary" className="gap-1 pr-1">
                            {r}
                            <button onClick={() => removeRecipient(r)} className="hover:bg-muted-foreground/20 rounded-full p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>)}
                        <div className="relative flex-1 min-w-[200px]">
                          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => {
                          if (e.key === 'Enter' && searchQuery.includes('@')) {
                            addRecipient(searchQuery);
                          }
                        }} placeholder="Search or type email..." className="border-0 h-8 p-0 focus-visible:ring-0 bg-transparent" />
                          {filteredContacts.length > 0 && <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {filteredContacts.map(result => <button key={result.user_id} onClick={() => addRecipient(result.email)} className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2">
                                  <span className="font-medium">{result.full_name}</span>
                                  <span className="text-sm text-muted-foreground">{result.email}</span>
                                </button>)}
                            </div>}
                        </div>
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-primary-foreground">Subject:</Label>
                      <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Enter subject line..." className="h-12 bg-background border-primary-foreground/20" />
                    </div>

                    {/* Content */}
                    <div className="space-y-1 flex-1 flex flex-col min-h-0">
                      <Label className="text-sm font-medium text-primary-foreground">Message:</Label>
                      <div className="flex-1 min-h-[200px] md:min-h-[400px]">
                        <RichTextEditor value={content} onChange={setContent} placeholder="Compose your email with rich formatting..." minHeight="400px" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Send Button - Fixed at bottom */}
                  <div className="p-4 bg-primary/80 border-t border-primary-foreground/10">
                    <Button 
                      onClick={handleSendEmail} 
                      disabled={isSending || recipients.length === 0 || !subject.trim()} 
                      className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                      ) : recipients.length === 0 ? (
                        <><Send className="h-4 w-4 mr-2" /> Add Recipients to Send</>
                      ) : !subject.trim() ? (
                        <><Send className="h-4 w-4 mr-2" /> Add Subject to Send</>
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
                    {!sendToAll && <div className="space-y-1">
                        <Label className="text-sm font-medium text-primary-foreground">Recipients:</Label>
                        <div className="flex flex-wrap gap-2 p-3 min-h-[48px] border border-primary-foreground/20 rounded-lg bg-background">
                          {smsRecipients.map(r => <Badge key={r.user_id} variant="secondary" className="gap-1 pr-1">
                              {r.full_name}
                              <button onClick={() => removeSmsRecipient(r.user_id)} className="hover:bg-muted-foreground/20 rounded-full p-0.5">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>)}
                          <div className="relative flex-1 min-w-[200px]">
                            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search members..." className="border-0 h-8 p-0 focus-visible:ring-0 bg-transparent" />
                            {filteredContacts.filter(r => r.phone_number).length > 0 && <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {filteredContacts.filter(r => r.phone_number).map(result => <button key={result.user_id} onClick={() => addSmsRecipient({
                            user_id: result.user_id,
                            full_name: result.full_name,
                            phone_number: result.phone_number || ''
                          })} className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2">
                                    <span className="font-medium">{result.full_name}</span>
                                    <span className="text-sm text-muted-foreground">{result.phone_number}</span>
                                  </button>)}
                              </div>}
                          </div>
                        </div>
                      </div>}

                    {/* SMS Content */}
                    <div className="space-y-1 flex-1 flex flex-col">
                      <Label className="text-sm font-medium text-primary-foreground">Message:</Label>
                      <Textarea value={smsContent} onChange={e => setSmsContent(e.target.value)} placeholder="Type your SMS message..." className="flex-1 min-h-[150px] resize-none bg-background border-primary-foreground/20" maxLength={480} />
                      <div className="flex justify-between text-xs text-primary-foreground/70 mt-1">
                        <span>{smsContent.length}/480 characters</span>
                        <span>{Math.ceil(smsContent.length / 160) || 1} SMS segment{smsContent.length > 160 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Send Button */}
                  <div className="p-4 bg-primary/80 border-t border-primary-foreground/10">
                    <Button onClick={handleSendSMS} disabled={isSending || !sendToAll && smsRecipients.length === 0 || !smsContent.trim()} variant="ghost" className="w-full text-primary-foreground hover:bg-primary-foreground/10">
                      {isSending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : <><Send className="h-4 w-4 mr-2" /> Send SMS {sendToAll ? 'to All Members' : ''}</>}
                    </Button>
                  </div>
                </TabsContent>

                {/* Video Tab */}
                <TabsContent value="video" className="flex-1 overflow-hidden mt-0 bg-background data-[state=active]:flex data-[state=active]:flex-col">
                  <MobileVideoInterface 
                    onJoinSession={(sessionId, roomName, isRecording) => setActiveVideoSession({
                      id: sessionId,
                      roomName: roomName,
                      isRecording: isRecording
                    })} 
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
            {showGroupsPanel && <div className="w-full sm:w-72 border-l bg-muted/30 p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Quick Add Groups
                  </h3>
                  <button onClick={() => setShowGroupsPanel(false)} className="p-2 hover:bg-muted rounded-lg sm:hidden">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {loadingGroups ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    {/* Course Groups */}
                    {recipientGroups.filter(g => g.type === 'course').length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          My Courses
                        </h4>
                        <div className="space-y-1">
                          {recipientGroups.filter(g => g.type === 'course').map(group => (
                            <Button 
                              key={group.id} 
                              variant="outline" 
                              size="sm" 
                              className="w-full justify-start text-left h-auto py-2" 
                              onClick={() => handleAddGroup(group)}
                            >
                              <span className="flex-1 truncate text-xs">{group.name}</span>
                              <Badge variant="secondary" className="ml-2 text-xs">{group.count}</Badge>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Manual Groups */}
                    {recipientGroups.filter(g => g.type === 'manual').length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Saved Groups
                        </h4>
                        <div className="space-y-1">
                          {recipientGroups.filter(g => g.type === 'manual').map(group => (
                            <Button 
                              key={group.id} 
                              variant="outline" 
                              size="sm" 
                              className="w-full justify-start text-left h-auto py-2" 
                              onClick={() => handleAddGroup(group)}
                            >
                              <span className="flex-1 truncate text-xs">{group.name}</span>
                              <Badge variant="secondary" className="ml-2 text-xs">{group.count}</Badge>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {recipientGroups.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No groups available
                      </p>
                    )}
                  </ScrollArea>
                )}

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
              </div>}
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};
export default Messenger;