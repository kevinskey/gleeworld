import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send, Inbox, Loader2, Users } from 'lucide-react';
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

interface EnrolledStudent {
  user_id: string;
  full_name: string;
  email: string;
}

// Helper function to fetch enrolled students to avoid TypeScript type depth issues
async function fetchEnrolledStudents(courseId: string): Promise<EnrolledStudent[]> {
  // Use type assertion to avoid deep type instantiation
  const client = supabase as any;
  
  const enrollmentsResponse = await client
    .from('gw_course_enrollments')
    .select('user_id')
    .eq('course_id', courseId)
    .eq('status', 'enrolled');
  
  if (enrollmentsResponse.error) throw enrollmentsResponse.error;
  if (!enrollmentsResponse.data || enrollmentsResponse.data.length === 0) return [];

  const students: EnrolledStudent[] = [];
  
  for (const enrollment of enrollmentsResponse.data) {
    const profileResponse = await client
      .from('gw_profiles')
      .select('user_id, full_name, email')
      .eq('user_id', enrollment.user_id)
      .maybeSingle();
    
    if (profileResponse.data) {
      students.push({
        user_id: String(profileResponse.data.user_id),
        full_name: String(profileResponse.data.full_name || 'Student'),
        email: String(profileResponse.data.email || '')
      });
    }
  }
  
  return students;
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
  const [newMessage, setNewMessage] = useState({ subject: '', content: '', recipientId: '' });

  // Fetch course data including instructor
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

  // Check if current user is the instructor
  const isInstructor = user?.email === courseData?.instructor_email;

  // Fetch enrolled students (for instructor view)
  const { data: enrolledStudents } = useQuery({
    queryKey: ['course-enrolled-students', courseId],
    queryFn: () => fetchEnrolledStudents(courseId),
    enabled: !!courseId && isInstructor
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
    mutationFn: async ({ subject, content, recipientId }: { subject: string; content: string; recipientId?: string }) => {
      if (!user) {
        throw new Error('Cannot send message');
      }

      let recipientEmail: string;
      let recipientUserId: string;
      let recipientName: string;

      if (isInstructor && recipientId) {
        // Instructor sending to student
        const student = enrolledStudents?.find(s => s.user_id === recipientId);
        if (!student) throw new Error('Student not found');
        recipientEmail = student.email;
        recipientUserId = student.user_id;
        recipientName = student.full_name;
      } else if (!isInstructor && courseData?.instructor_email) {
        // Student sending to instructor
        const { data: instructorProfile } = await supabase
          .from('gw_profiles')
          .select('user_id')
          .eq('email', courseData.instructor_email)
          .single();
        
        recipientEmail = courseData.instructor_email;
        recipientUserId = instructorProfile?.user_id || user.id;
        recipientName = courseData.instructor_name || 'Instructor';
      } else {
        throw new Error('Cannot determine recipient');
      }

      // Save message to database
      const { error: dbError } = await supabase
        .from('course_messages')
        .insert({
          course_id: courseId,
          sender_id: user.id,
          recipient_id: recipientUserId,
          subject,
          content,
          is_read: false
        });

      if (dbError) throw dbError;

      // Send actual email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-course-email', {
        body: {
          to: recipientEmail,
          subject: `[${courseName}] ${subject}`,
          content,
          senderName: isInstructor ? (courseData?.instructor_name || 'Instructor') : (user.email?.split('@')[0] || 'Student'),
          courseName
        }
      });

      if (emailError) {
        console.error('Email send error:', emailError);
      }

      return recipientName;
    },
    onSuccess: (recipientName) => {
      queryClient.invalidateQueries({ queryKey: ['course-emails'] });
      setComposeOpen(false);
      setNewMessage({ subject: '', content: '', recipientId: '' });
      toast.success(`Email sent to ${recipientName}`);
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
    if (isInstructor && !newMessage.recipientId) {
      toast.error('Please select a student');
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
          {isInstructor ? 'Email Student' : 'Email Instructor'}
        </Button>
      </div>

      {/* Info Card - Different for instructor vs student */}
      {isInstructor ? (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">
                  {enrolledStudents?.length || 0} Enrolled Students
                </p>
                <p className="text-sm text-muted-foreground">
                  Send emails to individual students in your course.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
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
      )}

      {/* Enrolled Students List (Instructor Only) */}
      {isInstructor && enrolledStudents && enrolledStudents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Enrolled Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {enrolledStudents.map((student) => (
                <div
                  key={student.user_id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{student.full_name}</p>
                    <p className="text-xs text-muted-foreground">{student.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewMessage(prev => ({ ...prev, recipientId: student.user_id }));
                      setComposeOpen(true);
                    }}
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              {isInstructor ? 'Email Student' : 'Email Instructor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>To</Label>
              {isInstructor ? (
                <Select
                  value={newMessage.recipientId}
                  onValueChange={(value) => setNewMessage(prev => ({ ...prev, recipientId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student..." />
                  </SelectTrigger>
                  <SelectContent>
                    {enrolledStudents?.map((student) => (
                      <SelectItem key={student.user_id} value={student.user_id}>
                        {student.full_name} ({student.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input 
                  value={courseData?.instructor_name || courseData?.instructor_email || 'Instructor'} 
                  disabled 
                  className="bg-muted"
                />
              )}
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
