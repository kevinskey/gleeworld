import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, Users, Send, Mail, UserPlus, 
  Bell, ArrowLeft, Loader2, Lock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseMessaging, useInstructorId } from '@/hooks/useCourseMessaging';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { ChatWindow } from '@/components/messaging/ChatWindow';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface CourseMessagingProps {
  courseId: string;
  courseName: string;
  instructorEmail: string;
  isEnrolled: boolean;
  isAdmin?: boolean;
}

export const CourseMessaging: React.FC<CourseMessagingProps> = ({
  courseId,
  courseName,
  instructorEmail,
  isEnrolled,
  isAdmin = false
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('instructor');
  const [showChat, setShowChat] = useState(false);
  
  // Course group messaging
  const { 
    courseGroup, 
    loading: groupLoading, 
    isMember, 
    joinCourseGroup 
  } = useCourseMessaging(courseId, courseName);
  
  // Instructor DM
  const { instructorId, loading: instructorLoading } = useInstructorId(instructorEmail);
  const { 
    conversations, 
    messages, 
    fetchMessages, 
    sendMessage, 
    createConversation,
    loading: dmLoading 
  } = useDirectMessages();

  const [instructorConversationId, setInstructorConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);

  // Find or create conversation with instructor
  useEffect(() => {
    if (instructorId && user && conversations.length > 0) {
      const existingConvo = conversations.find(c => c.other_user_id === instructorId);
      if (existingConvo) {
        setInstructorConversationId(existingConvo.id);
      }
    }
  }, [instructorId, user, conversations]);

  const handleStartConversation = async () => {
    if (!instructorId) {
      toast.error('Instructor not found in the system');
      return;
    }

    const convoId = await createConversation(instructorId);
    if (convoId) {
      setInstructorConversationId(convoId);
      await fetchMessages(convoId);
      toast.success('Conversation started with instructor');
    }
  };

  const handleSendToInstructor = async () => {
    if (!instructorConversationId || !messageInput.trim()) return;

    setSending(true);
    try {
      await sendMessage(instructorConversationId, messageInput);
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleJoinAndOpen = async () => {
    const success = await joinCourseGroup();
    if (success) {
      setShowChat(true);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Please log in to access messaging.</p>
        </CardContent>
      </Card>
    );
  }

  if (!isEnrolled && !isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Enroll in this course to access messaging features.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Mail Center
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="instructor" className="gap-1">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Instructor</span>
              </TabsTrigger>
              <TabsTrigger value="discussion" className="gap-1">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Discussion</span>
              </TabsTrigger>
              <TabsTrigger value="announcements" className="gap-1">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Announcements</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Instructor Tab - Direct Message */}
          <TabsContent value="instructor" className="flex-1 overflow-hidden m-0 px-6 pb-4">
            {instructorLoading || dmLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !instructorConversationId ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Message Your Instructor</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Start a private conversation with your instructor about course content, 
                  assignments, or any questions you may have.
                </p>
                <Button onClick={handleStartConversation}>
                  <Send className="h-4 w-4 mr-2" />
                  Start Conversation
                </Button>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-hidden">
                  <InstructorChat 
                    conversationId={instructorConversationId}
                    messages={messages[instructorConversationId] || []}
                    onFetch={() => fetchMessages(instructorConversationId)}
                  />
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendToInstructor()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button onClick={handleSendToInstructor} disabled={sending || !messageInput.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Class Discussion Tab */}
          <TabsContent value="discussion" className="flex-1 overflow-hidden m-0">
            {groupLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !courseGroup ? (
              <div className="h-full flex items-center justify-center p-6">
                <p className="text-muted-foreground">Course discussion group not available.</p>
              </div>
            ) : !isMember && !showChat ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{courseGroup.name}</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Join the class discussion to collaborate with your classmates, 
                  share resources, and ask questions.
                </p>
                <Button onClick={handleJoinAndOpen}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Join Discussion
                </Button>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {showChat && (
                  <div className="px-4 py-2 border-b flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowChat(false)}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium">{courseGroup.name}</span>
                    <Badge variant="secondary" className="ml-auto">
                      Course Discussion
                    </Badge>
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <ChatWindow groupId={courseGroup.id} />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="flex-1 overflow-hidden m-0 px-6 pb-4">
            <CourseAnnouncements courseId={courseId} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Simple instructor chat component
interface InstructorChatProps {
  conversationId: string;
  messages: any[];
  onFetch: () => void;
}

const InstructorChat: React.FC<InstructorChatProps> = ({ conversationId, messages, onFetch }) => {
  const { user } = useAuth();

  useEffect(() => {
    onFetch();
  }, [conversationId]);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-2">
        {messages.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.sender_id === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className={`text-xs mt-1 ${
                  msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
};

// Course announcements component
interface CourseAnnouncementsProps {
  courseId: string;
  isAdmin: boolean;
}

const CourseAnnouncements: React.FC<CourseAnnouncementsProps> = ({ courseId, isAdmin }) => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [posting, setPosting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchAnnouncements();
  }, [courseId]);

  const fetchAnnouncements = async () => {
    try {
      // Try the main announcements table first, then fallback to course_announcements
      const { data, error } = await supabase
        .from('gw_course_announcements')
        .select(`
          *,
          author:gw_profiles!gw_course_announcements_created_by_fkey(full_name, avatar_url)
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching from gw_course_announcements:', error);
        setAnnouncements([]);
      } else {
        setAnnouncements(data || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const postAnnouncement = async () => {
    if (!newAnnouncement.trim() || !user) return;

    setPosting(true);
    try {
      const { error } = await supabase.from('gw_course_announcements').insert({
        course_id: courseId,
        title: 'Course Announcement',
        content: newAnnouncement.trim(),
        created_by: user.id
      });

      if (error) throw error;
      setNewAnnouncement('');
      toast.success('Announcement posted!');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error posting announcement:', error);
      toast.error('Failed to post announcement');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {isAdmin && (
        <div className="mb-4 space-y-2">
          <textarea
            value={newAnnouncement}
            onChange={(e) => setNewAnnouncement(e.target.value)}
            placeholder="Write an announcement for the class..."
            className="w-full p-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={3}
          />
          <Button onClick={postAnnouncement} disabled={posting || !newAnnouncement.trim()}>
            {posting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Post Announcement
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        {announcements.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No announcements yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => (
              <Card key={ann.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {ann.author?.full_name || 'Instructor'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(ann.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{ann.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default CourseMessaging;
