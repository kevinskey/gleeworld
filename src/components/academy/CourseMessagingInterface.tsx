import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, Inbox, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CourseMessagingInterfaceProps {
  courseId: string;
  courseName: string;
  isEnrolled: boolean;
}

interface CourseMessage {
  id: string;
  subject: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  course_id: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
}

export const CourseMessagingInterface: React.FC<CourseMessagingInterfaceProps> = ({
  courseId,
  courseName,
  isEnrolled
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<CourseMessage | null>(null);
  const [newMessage, setNewMessage] = useState({ subject: '', content: '' });

  // Fetch course instructor
  const { data: courseData } = useQuery({
    queryKey: ['course-instructor', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_courses')
        .select('instructor_email, instructor_name')
        .eq('id', courseId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!courseId
  });

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ['course-emails', courseId, user?.id, activeTab],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('course_messages')
        .select('*')
        .eq('course_id', courseId)
        .eq(activeTab === 'inbox' ? 'recipient_id' : 'sender_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CourseMessage[];
    },
    enabled: !!user && isEnrolled
  });

  // Send email mutation
  const sendEmail = useMutation({
    mutationFn: async ({ subject, content }: { subject: string; content: string }) => {
      if (!user || !courseData?.instructor_email) {
        throw new Error('Cannot send message');
      }

      // Get instructor's user ID from their email
      const { data: instructorProfile } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('email', courseData.instructor_email)
        .single();

      // Save message to database
      const { error: dbError } = await supabase
        .from('course_messages')
        .insert({
          course_id: courseId,
          sender_id: user.id,
          recipient_id: instructorProfile?.user_id || user.id,
          subject,
          content,
          is_read: false
        });

      if (dbError) throw dbError;

      // Send actual email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-course-email', {
        body: {
          to: courseData.instructor_email,
          subject: `[${courseName}] ${subject}`,
          content,
          senderName: user.email?.split('@')[0] || 'Student',
          courseName
        }
      });

      if (emailError) {
        console.error('Email send error:', emailError);
        // Don't throw - message is saved even if email fails
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-emails'] });
      setComposeOpen(false);
      setNewMessage({ subject: '', content: '' });
      toast.success('Email sent to instructor');
    },
    onError: (error) => {
      console.error('Send email error:', error);
      toast.error('Failed to send email');
    }
  });

  const handleSend = () => {
    if (!newMessage.subject.trim() || !newMessage.content.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }
    sendEmail.mutate(newMessage);
  };

  if (!isEnrolled) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Course Email</h3>
          <p className="text-muted-foreground">
            Enroll in this course to email your instructor.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Course Email</h2>
        </div>
        <Button onClick={() => setComposeOpen(true)}>
          <Send className="h-4 w-4 mr-2" />
          Email Instructor
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Instructor: {courseData?.instructor_name || 'Course Instructor'}</p>
              <p className="text-sm text-muted-foreground">
                Send emails directly to your instructor for course-related questions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'inbox' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('inbox')}
        >
          <Inbox className="h-4 w-4 mr-2" />
          Inbox
        </Button>
        <Button
          variant={activeTab === 'sent' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('sent')}
        >
          <Send className="h-4 w-4 mr-2" />
          Sent
        </Button>
      </div>

      {/* Messages List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((message) => (
            <Card
              key={message.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                !message.is_read && activeTab === 'inbox' ? 'border-l-4 border-l-primary' : ''
              }`}
              onClick={() => setSelectedMessage(message)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-primary" />
                    <div>
                      <CardTitle className="text-sm">{message.subject}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  {!message.is_read && activeTab === 'inbox' && (
                    <Badge variant="secondary" className="text-xs">New</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2">{message.content}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No emails in {activeTab}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Instructor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>To</Label>
              <Input 
                value={courseData?.instructor_name || courseData?.instructor_email || 'Instructor'} 
                disabled 
                className="bg-muted"
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                placeholder="Enter subject..."
                value={newMessage.subject}
                onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                placeholder="Type your message..."
                value={newMessage.content}
                onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                rows={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setComposeOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sendEmail.isPending}>
                {sendEmail.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Message Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedMessage?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {selectedMessage && format(new Date(selectedMessage.created_at), 'MMMM d, yyyy h:mm a')}
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{selectedMessage?.content}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
