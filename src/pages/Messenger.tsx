import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Smartphone, Video, X, Send, Users, Search, Loader2, GraduationCap, ShieldAlert, AlertCircle, ArrowLeft, Settings, Plus, Pencil, Trash2, History, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { VideoSessionManager } from '@/components/video/VideoSessionManager';
import { ActiveMeetingsSidebar } from '@/components/video/ActiveMeetingsSidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { syncCourseMessengerGroup } from '@/hooks/useCourseMessengerSync';
import { SMSHistoryPanel } from '@/components/messaging/SMSHistoryPanel';
import { CommunicationHistoryPanel } from '@/components/messaging/CommunicationHistoryPanel';
interface RecipientGroup {
  id: string;
  name: string;
  count: number;
  type: 'manual' | 'course';
}

interface MessengerProps {
  embedded?: boolean;
  courseIdProp?: string;
  courseNameProp?: string;
}

const Messenger: React.FC<MessengerProps> = ({ embedded = false, courseIdProp, courseNameProp }) => {
  const {
    user
  } = useAuth();
  const {
    userProfile
  } = useUserProfile(user);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Course context from query params or props (for embedded mode)
  const courseId = courseIdProp || searchParams.get('courseId');
  const courseName = courseNameProp || searchParams.get('courseName');
  const joinRoomName = searchParams.get('join');
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
  const {
    toast
  } = useToast();

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

  // Composer state - default to video tab if joining from link
  const [composerMode, setComposerMode] = useState<'email' | 'sms' | 'video'>(joinRoomName ? 'video' : 'email');
  const [showEmailHistory, setShowEmailHistory] = useState(false);
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
  
  // Group editing for admins/exec-board
  const [showGroupEditor, setShowGroupEditor] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{id: string; name: string; description: string} | null>(null);
  const [groupFormData, setGroupFormData] = useState({ name: '', description: '' });
  const [savingGroup, setSavingGroup] = useState(false);
  
  const [isExecBoard, setIsExecBoard] = useState(false);
  
  // Check for exec-board role from app_roles
  useEffect(() => {
    const checkExecBoard = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('app_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'exec-board')
        .eq('is_active', true)
        .maybeSingle();
      setIsExecBoard(!!data);
    };
    checkExecBoard();
  }, [user]);
  
  const canEditGroups = messengerRole === 'admin' || messengerRole === 'super-admin' || isExecBoard;
  console.log('[Messenger] canEditGroups:', canEditGroups, 'messengerRole:', messengerRole, 'isExecBoard:', isExecBoard);
  // Video state
  const [activeVideoSession, setActiveVideoSession] = useState<{
    id: string;
    roomName: string;
    isRecording: boolean;
  } | null>(null);

  // Filter contacts based on search query
  useEffect(() => {
    console.log('[Messenger Search] searchQuery:', searchQuery, 'contacts count:', contacts.length);
    if (!searchQuery.trim()) {
      setFilteredContacts([]);
      return;
    }
    const filtered = contacts.filter(c => 
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 20);
    console.log('[Messenger Search] filtered count:', filtered.length, 'first few:', filtered.slice(0, 3).map(c => c.full_name));
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);

  // NOTE: recipientGroups are now built in the useEffect that combines courseGroups and manualGroups (see below)
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
      // Validate group has required properties
      if (!group || !group.id || !group.type) {
        toast({
          title: 'Invalid group',
          description: 'Group data is missing or incomplete',
          variant: 'destructive'
        });
        return;
      }

      if (group.type === 'course') {
        // Extract course ID from group id (format: "course:uuid")
        const courseIdFromGroup = group.id.replace('course:', '');
        
        // Validate the extracted ID
        if (!courseIdFromGroup || courseIdFromGroup === 'null' || courseIdFromGroup === 'undefined') {
          toast({
            title: 'Invalid course',
            description: 'Course ID is missing',
            variant: 'destructive'
          });
          return;
        }

        // Step 1: Fetch all enrolled students' user_ids
        const { data: enrollments, error: enrollError } = await supabase
          .from('gw_course_enrollments')
          .select('user_id')
          .eq('course_id', courseIdFromGroup)
          .eq('role', 'student')
          .eq('enrollment_status', 'enrolled');
        
        if (enrollError) throw enrollError;
        
        if (enrollments && enrollments.length > 0) {
          // Step 2: Fetch profiles for those user_ids (filter out null/undefined)
          const userIds = enrollments
            .map(e => e.user_id)
            .filter((id): id is string => !!id && id !== 'null');
          
          if (userIds.length === 0) {
            toast({
              title: 'No valid members',
              description: 'No valid user IDs found in this group',
              variant: 'destructive'
            });
            return;
          }
          
          const { data: profiles, error: profileError } = await supabase
            .from('gw_profiles')
            .select('user_id, full_name, email, phone_number')
            .in('user_id', userIds);
          
          if (profileError) throw profileError;
          
          if (composerMode === 'email') {
            const emails = (profiles || [])
              .map(p => p.email)
              .filter((email): email is string => !!email && !recipients.includes(email));
            
            if (emails.length > 0) {
              setRecipients([...recipients, ...emails]);
              toast({
                title: `Added ${emails.length} students`,
                description: `From ${group.name.replace('📚 ', '')}`
              });
            } else {
              toast({
                title: "No new students to add",
                description: "All students already added or no emails found",
              });
            }
          } else if (composerMode === 'sms') {
            const newRecipients = (profiles || [])
              .filter(p => p.phone_number && !smsRecipients.find(r => r.user_id === p.user_id))
              .map(p => ({
                user_id: p.user_id,
                full_name: p.full_name || 'Unknown',
                phone_number: p.phone_number!
              }));
            
            if (newRecipients.length > 0) {
              setSmsRecipients([...smsRecipients, ...newRecipients]);
              toast({
                title: `Added ${newRecipients.length} members`,
                description: `From ${group.name.replace('📚 ', '')}`
              });
            } else {
              toast({
                title: "No new members to add",
                description: "All members with phone numbers already added",
              });
            }
          }
        } else {
          toast({
            title: "No students found",
            description: "This course has no enrolled students",
            variant: "destructive"
          });
        }
      } else if (group.type === 'manual') {
        // Handle manual groups - fetch from messenger_group_members
        const groupId = group.id.replace('manual:', '');
        
        // Validate the extracted ID
        if (!groupId || groupId === 'null' || groupId === 'undefined') {
          toast({
            title: 'Invalid group',
            description: 'Group ID is missing',
            variant: 'destructive'
          });
          return;
        }
        
        const { data: members, error: membersError } = await supabase
          .from('messenger_group_members')
          .select(`
            user_id,
            gw_profiles!inner(user_id, full_name, email, phone_number)
          `)
          .eq('group_id', groupId);
        
        if (membersError) throw membersError;
        
        if (!members || members.length === 0) {
          toast({
            title: 'No members',
            description: `${group.name} has no members yet`,
            variant: 'destructive'
          });
          return;
        }

        if (composerMode === 'email') {
          const emails = members
            .map((m: any) => m.gw_profiles?.email)
            .filter((email: string) => email && !recipients.includes(email));
          
          if (emails.length > 0) {
            setRecipients([...recipients, ...emails]);
            toast({
              title: `Added ${emails.length} members`,
              description: `From ${group.name}`
            });
          } else {
            toast({
              title: 'Already added',
              description: 'All members from this group are already in recipients'
            });
          }
        } else if (composerMode === 'sms') {
          const newRecipients = members
            .filter((m: any) => m.gw_profiles?.phone_number && !smsRecipients.find(r => r.user_id === m.user_id))
            .map((m: any) => ({
              user_id: m.user_id,
              full_name: m.gw_profiles?.full_name || 'Unknown',
              phone_number: m.gw_profiles?.phone_number
            }));
          
          if (newRecipients.length > 0) {
            setSmsRecipients([...smsRecipients, ...newRecipients]);
            toast({
              title: `Added ${newRecipients.length} members`,
              description: `From ${group.name}`
            });
          } else {
            toast({
              title: 'No new recipients',
              description: 'All members with phone numbers are already added'
            });
          }
        }
      }
    } catch (err: any) {
      toast({
        title: "Failed to add group",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  // Group management functions for admins/exec-board
  const handleCreateGroup = async () => {
    if (!groupFormData.name.trim()) {
      toast({ title: 'Error', description: 'Group name is required', variant: 'destructive' });
      return;
    }
    try {
      setSavingGroup(true);
      const { error } = await supabase
        .from('messenger_groups')
        .insert({
          name: groupFormData.name,
          description: groupFormData.description || null,
          is_active: true,
          member_count: 0
        });
      if (error) throw error;
      toast({ title: 'Success', description: 'Group created successfully' });
      setShowGroupEditor(false);
      setGroupFormData({ name: '', description: '' });
      // Refresh groups
      loadManualGroups();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingGroup(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !groupFormData.name.trim()) return;
    try {
      setSavingGroup(true);
      const { error } = await supabase
        .from('messenger_groups')
        .update({
          name: groupFormData.name,
          description: groupFormData.description || null
        })
        .eq('id', editingGroup.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Group updated successfully' });
      setEditingGroup(null);
      setShowGroupEditor(false);
      setGroupFormData({ name: '', description: '' });
      loadManualGroups();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('messenger_groups')
        .delete()
        .eq('id', groupId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Group deleted' });
      loadManualGroups();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const [manualGroups, setManualGroups] = useState<{id: string; name: string; description: string | null; member_count: number}[]>([]);
  
  const loadManualGroups = useCallback(async () => {
    console.log('[Messenger] Loading manual groups...');
    const { data, error } = await supabase
      .from('messenger_groups')
      .select('id, name, description, member_count')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('[Messenger] Error loading groups:', error);
      return;
    }
    
    console.log('[Messenger] Loaded manual groups:', data?.length);
    if (data) {
      setManualGroups(data);
    }
  }, []);

  // Combine course groups and manual groups into recipientGroups
  useEffect(() => {
    const groups: RecipientGroup[] = [
      ...courseGroups.map(cg => ({
        id: `course:${cg.id}`,
        name: `📚 ${cg.title}`,
        count: cg.studentCount,
        type: 'course' as const
      })),
      ...manualGroups.map(g => ({
        id: `manual:${g.id}`,
        name: g.name,
        count: g.member_count || 0,
        type: 'manual' as const
      }))
    ];
    setRecipientGroups(groups);
  }, [courseGroups, manualGroups]);

  // Load manual groups on mount
  useEffect(() => {
    loadManualGroups();
  }, [loadManualGroups]);

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
          senderName: userProfile?.full_name,
          senderId: user?.id
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
          recipients: sendToAll ? [] : smsRecipients.map(r => r.phone_number),
          senderId: user?.id
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
    const loadingContent = (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
    
    if (embedded) return loadingContent;
    
    return (
      <UniversalLayout showHeader={true} showFooter={false}>
        <div className="h-[calc(100vh-64px)]">{loadingContent}</div>
      </UniversalLayout>
    );
  }

  // Show no-access message for fans
  if (!hasAccess) {
    const noAccessContent = (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-6">
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
    );
    
    if (embedded) return noAccessContent;
    
    return (
      <UniversalLayout showHeader={true} showFooter={false}>
        {noAccessContent}
      </UniversalLayout>
    );
  }
  // Main content component (used in both embedded and full page modes)
  const mainContent = (
    <div
      className={`flex flex-col ${embedded ? 'h-full' : 'h-[calc(100dvh-var(--gw-header-h,4rem)-var(--gw-radio-bar-height,0px))]'}`}
    >
      {/* Persistent Header - hide in embedded mode */}
      {!embedded && (
        <header className="sticky top-0 z-20 flex-shrink-0 border-b border-border/30 px-4 sm:px-6 lg:px-10 py-2 bg-[hsl(208,60%,28%)] text-white shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="hidden sm:block text-white/80 [&_a]:text-white/80 [&_a:hover]:text-white">
                <BackNavigation />
              </div>
              <div className="rounded-md p-1.5 bg-white/15 flex-shrink-0">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex items-center gap-2">
                <h1 className="text-lg font-bold font-cinzel tracking-wide uppercase text-white">Messenger</h1>
                <Badge variant="outline" className="text-xs capitalize px-2 py-0.5 flex-shrink-0 border-white/30 text-white/90">{messengerRole}</Badge>
                <span className="text-xs text-white/60 hidden sm:inline">
                  {canMessageAnyone ? '· Full access' : messengerRole === 'alumna' ? '· Alumnae & mentees' : `· ${courseGroups.length} course${courseGroups.length !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowGroupsPanel(!showGroupsPanel)} className="gap-2 flex-shrink-0 h-8 px-3 border-white/30 text-white hover:bg-white/15 hover:text-white">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Groups ({recipientGroups.length})</span>
              <span className="sm:hidden text-xs">{recipientGroups.length}</span>
            </Button>
          </div>
        </header>
      )}
      
      {/* Main Content with L/R padding */}
      <div className={`flex-1 min-h-0 overflow-hidden`}>
        <div className="h-full flex w-full">
          {/* Composer Area */}
          <div className={`flex-1 flex flex-col overflow-hidden ${showGroupsPanel ? 'hidden sm:flex' : ''}`}>
            {/* Tabs */}
            <Tabs value={composerMode} onValueChange={v => setComposerMode(v as 'email' | 'sms' | 'video')} className="flex flex-col flex-1 overflow-hidden">
                <TabsList className={`grid w-full ${canSendSMS ? 'grid-cols-3' : 'grid-cols-2'} rounded-none bg-background h-11 p-0 gap-0 border-b`}>
                  <TabsTrigger value="email" className="gap-2 rounded-none h-full border-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground font-medium">
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">Email</span>
                  </TabsTrigger>
                  {canSendSMS && <TabsTrigger value="sms" className="gap-2 rounded-none h-full border-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground font-medium">
                      <Smartphone className="h-4 w-4" />
                      <span className="hidden sm:inline">SMS</span>
                    </TabsTrigger>}
                  <TabsTrigger value="video" className="gap-2 rounded-none h-full border-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground font-medium">
                    <Video className="h-4 w-4" />
                    <span className="hidden sm:inline">Video</span>
                  </TabsTrigger>
                </TabsList>

                {/* Email Tab */}
                <TabsContent
                  value="email"
                  className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=active]:flex data-[state=active]:flex-col"
                >
                  <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
                    {/* Email Compose Section */}
                    <div className="flex flex-col min-w-0 lg:border-r border-border lg:w-[65%] lg:flex-shrink-0">
                      {/* Toggle for mobile only */}
                      <div className="flex items-center gap-2 p-3 bg-background border-b border-border lg:hidden">
                        <Button 
                          variant={!showEmailHistory ? "default" : "outline"} 
                          size="sm" 
                          onClick={() => setShowEmailHistory(false)}
                          className="gap-2"
                        >
                          <Send className="h-4 w-4" />
                          Compose
                        </Button>
                        <Button 
                          variant={showEmailHistory ? "default" : "outline"} 
                          size="sm" 
                          onClick={() => setShowEmailHistory(true)}
                          className="gap-2"
                        >
                          <History className="h-4 w-4" />
                          History
                        </Button>
                      </div>

                      {/* Compose form - hide on mobile when viewing history */}
                      <div className={`flex-1 flex flex-col min-h-0 ${showEmailHistory ? 'hidden lg:flex' : 'flex'}`}>
                        <ScrollArea className="flex-1 min-h-0">
                          <div className="bg-card p-4 lg:p-6 space-y-4 pb-24 lg:pb-4">
                            {/* Recipients */}
                            <div className="space-y-1">
                              <Label className="text-base font-semibold text-foreground">To:</Label>
                              <div className="border border-border rounded-lg bg-background">
                                {/* Collapsible recipients when there are many */}
                                {recipients.length > 3 ? (
                                  <Collapsible defaultOpen={false}>
                                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 text-left hover:bg-muted/50 transition-colors">
                                      <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                                      <span className="text-sm font-medium">{recipients.length} recipients selected</span>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <div className="flex flex-wrap gap-2 px-3 pb-3 max-h-[200px] overflow-y-auto">
                                        {recipients.map((r) => (
                                          <Badge key={r} variant="secondary" className="gap-1 pr-1">
                                            {r}
                                            <button onClick={() => removeRecipient(r)} className="hover:bg-muted-foreground/20 rounded-full p-0.5">
                                              <X className="h-3 w-3" />
                                            </button>
                                          </Badge>
                                        ))}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                ) : (
                                  <div className="flex flex-wrap gap-2 p-3 min-h-[48px]">
                                    {recipients.map((r) => (
                                      <Badge key={r} variant="secondary" className="gap-1 pr-1">
                                        {r}
                                        <button onClick={() => removeRecipient(r)} className="hover:bg-muted-foreground/20 rounded-full p-0.5">
                                          <X className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {/* Search input always visible */}
                                <div className="relative p-3 pt-0">
                                  <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => {
                                    if (e.key === 'Enter' && searchQuery.includes('@')) {
                                      addRecipient(searchQuery);
                                    }
                                  }} placeholder="Search or type email..." className="h-8 bg-transparent text-foreground text-base placeholder:text-foreground/50" />
                                  {filteredContacts.length > 0 && <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                      {filteredContacts.map(result => <button key={result.user_id} onClick={() => addRecipient(result.email)} className="w-full px-3 py-2 text-left hover:bg-gray-100 text-gray-900 flex items-center gap-2">
                                          <span className="font-medium text-gray-900">{result.full_name}</span>
                                          <span className="text-sm text-gray-500">{result.email}</span>
                                        </button>)}
                                    </div>}
                                </div>
                              </div>
                            </div>

                            {/* Subject */}
                            <div className="space-y-1">
                              <Label className="text-base font-semibold text-foreground">Subject:</Label>
                              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Enter subject line..." className="h-10 bg-background border-border text-foreground text-base placeholder:text-foreground/50" />
                            </div>

                            {/* Content - Rich text editor with good height */}
                            <div className="space-y-1">
                              <Label className="text-base font-semibold text-foreground">Message:</Label>
                              <div className="border border-border rounded-lg overflow-hidden bg-background">
                                <RichTextEditor value={content} onChange={setContent} placeholder="Compose your email with rich formatting..." minHeight="300px" />
                              </div>
                            </div>

                            {/* Send Button - visible inline on desktop */}
                            <div className="pt-2 pb-4 hidden lg:block">
                              <Button onClick={handleSendEmail} disabled={isSending || recipients.length === 0 || !subject.trim()} className="w-full h-12">
                                {isSending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : recipients.length === 0 ? <><Send className="h-4 w-4 mr-2" /> Add Recipients to Send</> : !subject.trim() ? <><Send className="h-4 w-4 mr-2" /> Add Subject to Send</> : <><Send className="h-4 w-4 mr-2" /> Send Email</>}
                              </Button>
                            </div>
                          </div>
                        </ScrollArea>

                        {/* Send Button - fixed at bottom on mobile */}
                        <div className="flex-shrink-0 p-3 border-t border-border bg-card lg:hidden">
                          <Button onClick={handleSendEmail} disabled={isSending || recipients.length === 0 || !subject.trim()} className="w-full h-14 text-base">
                            {isSending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : recipients.length === 0 ? <><Send className="h-4 w-4 mr-2" /> Add Recipients</> : !subject.trim() ? <><Send className="h-4 w-4 mr-2" /> Add Subject</> : <><Send className="h-4 w-4 mr-2" /> Send Email</>}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Email History Panel - always visible on desktop, toggle on mobile */}
                    <div className={`w-full lg:w-[35%] flex-shrink-0 bg-background overflow-hidden border-t lg:border-t-0 ${showEmailHistory ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'}`}>
                      <CommunicationHistoryPanel channelFilter="email" />
                    </div>
                  </div>
                </TabsContent>

                {/* SMS Tab */}
                <TabsContent
                  value="sms"
                  className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=active]:flex data-[state=active]:flex-col"
                >
                  <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
                    {/* SMS Compose Section */}
                    <div className="flex-1 flex flex-col min-w-0 border-r border-border">
                      <div className="flex-1 bg-muted/50 p-4 space-y-4 overflow-auto">
                        {/* Send to All Toggle */}
                        <div className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-foreground">Send to All Members with Phone</Label>
                          </div>
                          <Switch checked={sendToAll} onCheckedChange={setSendToAll} />
                        </div>

                        {/* Individual Recipients */}
                        {!sendToAll && <div className="space-y-1">
                            <Label className="text-sm font-medium text-foreground">Recipients:</Label>
                            <div className="flex flex-wrap gap-2 p-3 min-h-[48px] border border-border rounded-lg bg-background">
                              {smsRecipients.map(r => <Badge key={r.user_id} variant="secondary" className="gap-1 pr-1">
                                  {r.full_name}
                                  <button onClick={() => removeSmsRecipient(r.user_id)} className="hover:bg-muted-foreground/20 rounded-full p-0.5">
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>)}
                              <div className="relative flex-1 min-w-[200px]">
                                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search members..." className="border-0 h-8 p-0 focus-visible:ring-0 bg-transparent text-foreground placeholder:text-muted-foreground" />
                                {filteredContacts.filter(r => r.phone_number).length > 0 && <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {filteredContacts.filter(r => r.phone_number).map(result => <button key={result.user_id} onClick={() => addSmsRecipient({
                                user_id: result.user_id,
                                full_name: result.full_name,
                                phone_number: result.phone_number || ''
                              })} className="w-full px-3 py-2 text-left hover:bg-gray-100 text-gray-900 flex items-center gap-2">
                                        <span className="font-medium text-gray-900">{result.full_name}</span>
                                        <span className="text-sm text-gray-500">{result.phone_number}</span>
                                      </button>)}
                                  </div>}
                              </div>
                            </div>
                          </div>}

                        {/* SMS Content */}
                        <div className="space-y-1 flex-1 flex flex-col">
                          <Label className="text-sm font-medium text-foreground">Message:</Label>
                          <Textarea value={smsContent} onChange={e => setSmsContent(e.target.value)} placeholder="Type your SMS message..." className="flex-1 min-h-[120px] resize-none bg-background border-border text-foreground placeholder:text-muted-foreground" maxLength={480} />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{smsContent.length}/480 characters</span>
                            <span>{Math.ceil(smsContent.length / 160) || 1} SMS segment{smsContent.length > 160 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Send Button */}
                      <div className="flex-shrink-0 p-4 bg-muted border-t border-border">
                        <Button onClick={handleSendSMS} disabled={isSending || !sendToAll && smsRecipients.length === 0 || !smsContent.trim()} className="w-full">
                          {isSending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : <><Send className="h-4 w-4 mr-2" /> Send SMS {sendToAll ? 'to All Members' : ''}</>}
                        </Button>
                      </div>
                    </div>

                    {/* SMS History Panel */}
                    <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 bg-background overflow-hidden border-t lg:border-t-0">
                      <SMSHistoryPanel />
                    </div>
                  </div>
                </TabsContent>

                {/* Video Tab */}
                <TabsContent value="video" className="flex-1 overflow-auto mt-0 bg-background data-[state=active]:flex data-[state=active]:flex-col">
                  <div className="flex-1 flex gap-0">
                    {/* Main Video Area */}
                    <div className="flex-1 overflow-auto p-4">
                      <VideoSessionManager joinRoomName={joinRoomName} />
                    </div>
                    
                    {/* Right Sidebar - Active Meetings */}
                    <div className="hidden lg:flex w-72 border-l border-border bg-muted/30 flex-col">
                      <ActiveMeetingsSidebar />
                    </div>
                  </div>
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
                  <div className="flex items-center gap-2">
                    {canEditGroups && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          setEditingGroup(null);
                          setGroupFormData({ name: '', description: '' });
                          setShowGroupEditor(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-xs">Add</span>
                      </Button>
                    )}
                    <button onClick={() => setShowGroupsPanel(false)} className="p-2 hover:bg-muted rounded-lg sm:hidden">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                {loadingGroups ? <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div> : <ScrollArea className="h-[300px]">
                    {/* Course Groups */}
                    {recipientGroups.filter(g => g.type === 'course').length > 0 && <div className="mb-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          My Courses
                        </h4>
                        <div className="space-y-1">
                          {recipientGroups.filter(g => g.type === 'course').map(group => <Button key={group.id} variant="outline" size="sm" className="w-full justify-start text-left h-auto py-2" onClick={() => handleAddGroup(group)}>
                              <span className="flex-1 truncate text-xs">{group.name}</span>
                              <Badge variant="secondary" className="ml-2 text-xs">{group.count}</Badge>
                            </Button>)}
                        </div>
                      </div>}
                    
                    {/* Manual Groups */}
                    {recipientGroups.filter(g => g.type === 'manual').length > 0 && <div className="mb-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Saved Groups
                        </h4>
                        <div className="space-y-1">
                          {recipientGroups.filter(g => g.type === 'manual').map(group => (
                            <div key={group.id} className="flex items-center gap-1">
                              <Button variant="outline" size="sm" className="flex-1 justify-start text-left h-auto py-2" onClick={() => handleAddGroup(group)}>
                                <span className="flex-1 truncate text-xs">{group.name}</span>
                                <Badge variant="secondary" className="ml-2 text-xs">{group.count}</Badge>
                              </Button>
                              {canEditGroups && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                                  const g = manualGroups.find(mg => `manual:${mg.id}` === group.id);
                                  if (g) {
                                    setEditingGroup({ id: g.id, name: g.name, description: g.description || '' });
                                    setGroupFormData({ name: g.name, description: g.description || '' });
                                    setShowGroupEditor(true);
                                  }
                                }}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>}
                    
                    {recipientGroups.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">
                        No groups available
                      </p>}
                  </ScrollArea>}

                {/* Email Preview */}
                {composerMode === 'email' && subject && <div className="mt-6">
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
                  </div>}
              </div>}
          </div>
        </div>
      </div>
  );

  // Dialog for group editor (shared between modes)
  const groupEditorDialog = (
    <Dialog open={showGroupEditor} onOpenChange={setShowGroupEditor}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingGroup ? 'Edit Group' : 'Create New Group'}</DialogTitle>
          <DialogDescription>Manage messenger groups for quick recipient selection.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Group Name</Label>
            <Input value={groupFormData.name} onChange={(e) => setGroupFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter group name" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={groupFormData.description} onChange={(e) => setGroupFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Optional description" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {editingGroup && (
            <Button variant="destructive" onClick={() => { handleDeleteGroup(editingGroup.id); setShowGroupEditor(false); }}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          )}
          <Button onClick={editingGroup ? handleUpdateGroup : handleCreateGroup} disabled={savingGroup}>
            {savingGroup ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {editingGroup ? 'Save Changes' : 'Create Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Return embedded mode (no layout wrapper)
  if (embedded) {
    return (
      <>
        {mainContent}
        {groupEditorDialog}
      </>
    );
  }

  // Return full page mode with layout
  return (
    <>
      <UniversalLayout showHeader={true} showFooter={false}>
        {mainContent}
      </UniversalLayout>
      {groupEditorDialog}
    </>
  );
};
export default Messenger;