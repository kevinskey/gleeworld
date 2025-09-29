import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Users, User, Mail, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Message {
  id: string;
  subject: string;
  content: string;
  recipient_type: 'individual' | 'all';
  recipient_id?: string;
  sent_at: string;
  recipient_name?: string;
}

interface Student {
  user_id: string;
  full_name: string;
  email: string;
}

export const StudentCommunications: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Form state
  const [recipientType, setRecipientType] = useState<'individual' | 'all'>('individual');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load enrolled students
      const { data: enrollmentData } = await supabase
        .from('mus240_enrollments')
        .select(`
          student_id,
          gw_profiles!student_id(
            user_id,
            full_name,
            email
          )
        `)
        .eq('semester', 'Fall 2025')
        .eq('enrollment_status', 'enrolled');

      const studentsData = enrollmentData?.map(e => ({
        user_id: e.student_id,
        full_name: e.gw_profiles?.full_name || 'Unknown',
        email: e.gw_profiles?.email || ''
      })) || [];

      setStudents(studentsData);

      // Load recent messages (this would need a messages table)
      // For now, we'll use a placeholder
      setMessages([]);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load communication data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error('Please fill in both subject and message content');
      return;
    }

    if (recipientType === 'individual' && !selectedStudent) {
      toast.error('Please select a student to send the message to');
      return;
    }

    setSending(true);
    try {
      // This would typically insert into a messages table
      // For now, we'll simulate the action
      
      const newMessage: Message = {
        id: Date.now().toString(),
        subject,
        content,
        recipient_type: recipientType,
        recipient_id: recipientType === 'individual' ? selectedStudent : undefined,
        sent_at: new Date().toISOString(),
        recipient_name: recipientType === 'individual' 
          ? students.find(s => s.user_id === selectedStudent)?.full_name 
          : 'All Students'
      };

      setMessages(prev => [newMessage, ...prev]);
      
      // Clear form
      setSubject('');
      setContent('');
      setSelectedStudent('');
      
      toast.success('Message sent successfully!');
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getMessageTypeColor = (type: string) => {
    return type === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p>Loading communications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Send New Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Message to Students
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Recipient</label>
            <Select value={recipientType} onValueChange={(value: 'individual' | 'all') => setRecipientType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Individual Student
                  </div>
                </SelectItem>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    All Students
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recipientType === 'individual' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Select Student</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.user_id} value={student.user_id}>
                      <div className="flex flex-col">
                        <span>{student.full_name}</span>
                        <span className="text-xs text-gray-500">{student.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Subject</label>
            <Input
              placeholder="Message subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Message</label>
            <Textarea
              placeholder="Type your message here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
          </div>

          <Button 
            onClick={handleSendMessage} 
            disabled={sending}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </CardContent>
      </Card>

      {/* Message History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Messages ({messages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Mail className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p>No messages sent yet</p>
                <p className="text-sm">Your communication history will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{message.subject}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getMessageTypeColor(message.recipient_type)}>
                            {message.recipient_type === 'all' ? 'All Students' : 'Individual'}
                          </Badge>
                          {message.recipient_name && (
                            <span className="text-sm text-gray-600">
                              to {message.recipient_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {new Date(message.sent_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {message.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Communication Stats */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Communication Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{students.length}</p>
              <p className="text-sm text-gray-600">Enrolled Students</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <MessageSquare className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{messages.length}</p>
              <p className="text-sm text-gray-600">Messages Sent</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Mail className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">
                {messages.filter(m => m.recipient_type === 'individual').length}
              </p>
              <p className="text-sm text-gray-600">Individual Messages</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Users className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">
                {messages.filter(m => m.recipient_type === 'all').length}
              </p>
              <p className="text-sm text-gray-600">Broadcast Messages</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};