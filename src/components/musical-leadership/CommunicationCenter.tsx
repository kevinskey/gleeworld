import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageCircle, 
  Send, 
  Users, 
  Calendar, 
  Clock,
  Plus,
  Search,
  Filter,
  Music,
  Phone,
  Mail,
  Video,
  AlertCircle,
  CheckCircle,
  Star,
  Archive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CommunicationCenterProps {
  user?: any;
}

interface Message {
  id: string;
  subject: string;
  content: string;
  recipient_type: string;
  recipients: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'draft' | 'sent' | 'read';
  created_at: string;
  sender_name: string;
  reply_count?: number;
}

interface SectionLeader {
  id: string;
  name: string;
  section: string;
  email: string;
  phone?: string;
  status: 'active' | 'busy' | 'offline';
  last_activity: string;
  sectional_count: number;
}

export const CommunicationCenter = ({ user }: CommunicationCenterProps) => {
  const [activeTab, setActiveTab] = useState('messages');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sectionLeaders, setSectionLeaders] = useState<SectionLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newMessage, setNewMessage] = useState({
    subject: '',
    content: '',
    recipient_type: 'all_section_leaders',
    priority: 'normal' as const,
    recipients: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchMessages(),
      fetchSectionLeaders()
    ]);
    setLoading(false);
  };

  const fetchMessages = async () => {
    try {
      // Mock data for demonstration - replace with actual Supabase queries
      const mockMessages: Message[] = [
        {
          id: '1',
          subject: 'Sectional Schedule Updates',
          content: 'Please review the updated sectional schedule for this week.',
          recipient_type: 'section_leaders',
          recipients: ['soprano-leader', 'alto-leader'],
          priority: 'high',
          status: 'sent',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          sender_name: 'Student Conductor',
          reply_count: 2
        },
        {
          id: '2',
          subject: 'Sight Singing Practice Reminder',
          content: 'Reminder: All sections need to complete sight singing exercises by Friday.',
          recipient_type: 'all_section_leaders',
          recipients: [],
          priority: 'normal',
          status: 'sent',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          sender_name: 'Student Conductor',
          reply_count: 5
        },
        {
          id: '3',
          subject: 'New Sheet Music Distribution',
          content: 'Draft for upcoming concert repertoire distribution.',
          recipient_type: 'section_leaders',
          recipients: ['bass-leader'],
          priority: 'normal',
          status: 'draft',
          created_at: new Date().toISOString(),
          sender_name: 'Student Conductor'
        }
      ];
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const fetchSectionLeaders = async () => {
    try {
      // Mock data for demonstration - replace with actual Supabase queries
      const mockLeaders: SectionLeader[] = [
        {
          id: '1',
          name: 'Sarah Johnson',
          section: 'Soprano',
          email: 'sarah.johnson@spelman.edu',
          phone: '(404) 555-0123',
          status: 'active',
          last_activity: '2 hours ago',
          sectional_count: 3
        },
        {
          id: '2',
          name: 'Maya Thompson',
          section: 'Alto',
          email: 'maya.thompson@spelman.edu',
          phone: '(404) 555-0156',
          status: 'busy',
          last_activity: '4 hours ago',
          sectional_count: 2
        },
        {
          id: '3',
          name: 'Jasmine Williams',
          section: 'Tenor',
          email: 'jasmine.williams@spelman.edu',
          status: 'active',
          last_activity: '1 hour ago',
          sectional_count: 4
        },
        {
          id: '4',
          name: 'Aisha Davis',
          section: 'Bass',
          email: 'aisha.davis@spelman.edu',
          phone: '(404) 555-0198',
          status: 'offline',
          last_activity: '1 day ago',
          sectional_count: 1
        }
      ];
      setSectionLeaders(mockLeaders);
    } catch (error) {
      console.error('Error fetching section leaders:', error);
      toast.error('Failed to load section leaders');
    }
  };

  const sendMessage = async () => {
    try {
      // TODO: Implement actual message sending via Supabase
      console.log('Sending message:', newMessage);
      
      const messageToAdd: Message = {
        id: Date.now().toString(),
        subject: newMessage.subject,
        content: newMessage.content,
        recipient_type: newMessage.recipient_type,
        recipients: newMessage.recipients,
        priority: newMessage.priority,
        status: 'sent',
        created_at: new Date().toISOString(),
        sender_name: user?.full_name || 'Student Conductor'
      };

      setMessages(prev => [messageToAdd, ...prev]);
      setNewMessageOpen(false);
      setNewMessage({
        subject: '',
        content: '',
        recipient_type: 'all_section_leaders',
        priority: 'normal',
        recipients: []
      });
      
      toast.success('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-800';
      case 'busy': return 'bg-amber-100 text-amber-800';
      case 'offline': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Send className="h-4 w-4" />;
      case 'read': return <CheckCircle className="h-4 w-4" />;
      case 'draft': return <Archive className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || message.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Communication Center</h3>
          <p className="text-muted-foreground">
            Manage section leaders, coordinate sectionals, and oversee musical development
          </p>
        </div>
        <Dialog open={newMessageOpen} onOpenChange={setNewMessageOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send New Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Recipients</label>
                <Select 
                  value={newMessage.recipient_type} 
                  onValueChange={(value) => setNewMessage(prev => ({ ...prev, recipient_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_section_leaders">All Section Leaders</SelectItem>
                    <SelectItem value="soprano_leader">Soprano Leader</SelectItem>
                    <SelectItem value="alto_leader">Alto Leader</SelectItem>
                    <SelectItem value="tenor_leader">Tenor Leader</SelectItem>
                    <SelectItem value="bass_leader">Bass Leader</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select 
                  value={newMessage.priority} 
                  onValueChange={(value: any) => setNewMessage(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter message subject"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={newMessage.content}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter your message content"
                  rows={6}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setNewMessageOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={sendMessage} disabled={!newMessage.subject || !newMessage.content}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="section-leaders">Section Leaders</TabsTrigger>
          <TabsTrigger value="sectionals">Sectionals</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {filteredMessages.map((message) => (
              <Card key={message.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(message.status)}
                        <h4 className="font-medium">{message.subject}</h4>
                        <Badge className={getPriorityColor(message.priority)}>
                          {message.priority}
                        </Badge>
                        {message.reply_count && (
                          <Badge variant="outline">
                            {message.reply_count} replies
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {message.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>To: {message.recipient_type.replace('_', ' ')}</span>
                        <span>{new Date(message.created_at).toLocaleDateString()}</span>
                        <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="section-leaders" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sectionLeaders.map((leader) => (
              <Card key={leader.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Music className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{leader.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{leader.section}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(leader.status)}>
                      {leader.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{leader.email}</span>
                    </div>
                    {leader.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{leader.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Last active: {leader.last_activity}</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sectionals:</span>
                      <Badge variant="outline">{leader.sectional_count}</Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Video className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sectionals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Sectional Coordination
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['Soprano', 'Alto', 'Tenor', 'Bass'].map((section) => (
                  <Card key={section} className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h4 className="font-medium mb-2">{section}</h4>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            Next Sectional: Tomorrow 3PM
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Progress: 85%
                          </div>
                          <Button variant="outline" size="sm" className="w-full">
                            Schedule
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Upcoming Sectionals</h4>
                <div className="space-y-2">
                  {[
                    { section: 'Soprano', time: 'Today 2:00 PM', location: 'Room 205' },
                    { section: 'Alto', time: 'Today 4:00 PM', location: 'Room 203' },
                    { section: 'Tenor', time: 'Tomorrow 1:00 PM', location: 'Room 205' },
                    { section: 'Bass', time: 'Tomorrow 3:00 PM', location: 'Room 203' }
                  ].map((sectional, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{sectional.section} Sectional</div>
                        <div className="text-sm text-muted-foreground">
                          {sectional.time} • {sectional.location}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          Notify
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};