import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Mail, 
  Send, 
  Reply, 
  Archive,
  Star,
  Clock,
  User,
  Search,
  Filter,
  Plus,
  Phone,
  Building
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Correspondence {
  id: string;
  subject: string;
  from_name: string;
  from_email: string;
  organization?: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  status: 'unread' | 'read' | 'replied' | 'archived';
  category: 'booking' | 'general' | 'media' | 'collaboration';
  created_at: string;
  last_reply?: string;
  thread_count: number;
}

interface TourCorrespondenceProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

export const TourCorrespondence = ({ user }: TourCorrespondenceProps) => {
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([
    {
      id: '1',
      subject: 'Performance Inquiry - Corporate Event',
      from_name: 'Sarah Mitchell',
      from_email: 'sarah@techcorp.com',
      organization: 'TechCorp Atlanta',
      message: 'We would like to inquire about having the Spelman Glee Club perform at our annual corporate retreat...',
      priority: 'high',
      status: 'unread',
      category: 'booking',
      created_at: '2024-01-20T14:30:00Z',
      thread_count: 1
    },
    {
      id: '2',
      subject: 'Media Interview Request',
      from_name: 'Marcus Johnson',
      from_email: 'marcus@atlantanews.com',
      organization: 'Atlanta News Network',
      message: 'I am a journalist with Atlanta News Network and would love to feature the Glee Club in an upcoming story...',
      priority: 'medium',
      status: 'read',
      category: 'media',
      created_at: '2024-01-19T10:15:00Z',
      last_reply: '2024-01-19T16:30:00Z',
      thread_count: 3
    },
    {
      id: '3',
      subject: 'Collaboration Opportunity - Music Festival',
      from_name: 'Dr. Angela Davis',
      from_email: 'angela@musicfest.org',
      organization: 'Atlanta Music Festival',
      message: 'We would love to discuss a potential collaboration for this year\'s Atlanta Music Festival...',
      priority: 'high',
      status: 'replied',
      category: 'collaboration',
      created_at: '2024-01-18T09:00:00Z',
      last_reply: '2024-01-18T14:45:00Z',
      thread_count: 5
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedCorrespondence, setSelectedCorrespondence] = useState<Correspondence | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [newMessage, setNewMessage] = useState<{
    to_email: string;
    to_name: string;
    organization: string;
    subject: string;
    message: string;
    category: 'booking' | 'general' | 'media' | 'collaboration';
  }>({
    to_email: '',
    to_name: '',
    organization: '',
    subject: '',
    message: '',
    category: 'general'
  });

  const { toast } = useToast();

  const getPriorityColor = (priority: Correspondence['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: Correspondence['status']) => {
    switch (status) {
      case 'unread':
        return 'bg-blue-100 text-blue-800';
      case 'read':
        return 'bg-gray-100 text-gray-800';
      case 'replied':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const updateStatus = (id: string, newStatus: Correspondence['status']) => {
    setCorrespondence(prev => prev.map(item => 
      item.id === id ? { ...item, status: newStatus } : item
    ));
  };

  const sendReply = () => {
    if (!replyMessage.trim() || !selectedCorrespondence) return;

    updateStatus(selectedCorrespondence.id, 'replied');
    setReplyMessage('');
    setSelectedCorrespondence(null);

    toast({
      title: "Reply sent",
      description: "Your reply has been sent successfully.",
    });
  };

  const composeMessage = () => {
    if (!newMessage.to_email || !newMessage.subject || !newMessage.message) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const message: Correspondence = {
      id: Date.now().toString(),
      subject: newMessage.subject,
      from_name: newMessage.to_name,
      from_email: newMessage.to_email,
      organization: newMessage.organization,
      message: newMessage.message,
      priority: 'medium',
      status: 'replied',
      category: newMessage.category,
      created_at: new Date().toISOString(),
      thread_count: 1
    };

    setCorrespondence(prev => [message, ...prev]);
    setIsComposing(false);
    setNewMessage({
      to_email: '',
      to_name: '',
      organization: '',
      subject: '',
      message: '',
      category: 'general'
    });

    toast({
      title: "Message sent",
      description: "Your message has been sent successfully.",
    });
  };

  const filteredCorrespondence = correspondence.filter(item => {
    const matchesSearch = 
      item.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.from_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.organization && item.organization.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const statusCounts = {
    all: correspondence.length,
    unread: correspondence.filter(c => c.status === 'unread').length,
    read: correspondence.filter(c => c.status === 'read').length,
    replied: correspondence.filter(c => c.status === 'replied').length,
    archived: correspondence.filter(c => c.status === 'archived').length
  };

  return (
    <div className="space-y-6">
      {/* Header with Compose Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Public Correspondence</h3>
          <p className="text-sm text-muted-foreground">
            Manage communications with organizations, media, and the public
          </p>
        </div>
        <Dialog open={isComposing} onOpenChange={setIsComposing}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Compose
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Compose New Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recipient Email *</label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={newMessage.to_email}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, to_email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recipient Name</label>
                  <Input
                    placeholder="Full name"
                    value={newMessage.to_name}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, to_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organization</label>
                  <Input
                    placeholder="Organization name"
                    value={newMessage.organization}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, organization: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select 
                    value={newMessage.category} 
                    onValueChange={(value: 'booking' | 'general' | 'media' | 'collaboration') => 
                      setNewMessage(prev => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="booking">Booking</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="collaboration">Collaboration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Subject *</label>
                <Input
                  placeholder="Message subject"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message *</label>
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage.message}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, message: e.target.value }))}
                  rows={6}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsComposing(false)}>
                  Cancel
                </Button>
                <Button onClick={composeMessage}>
                  <Send className="h-4 w-4 mr-1" />
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card key={status} className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-foreground">{count}</div>
              <div className="text-sm text-muted-foreground capitalize">
                {status === 'all' ? 'Total' : status}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search correspondence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="booking">Booking</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="collaboration">Collaboration</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Correspondence List */}
      <div className="grid gap-4">
        {filteredCorrespondence.map((item) => (
          <Card key={item.id} className={`hover:shadow-md transition-shadow ${item.status === 'unread' ? 'border-l-4 border-l-blue-500' : ''}`}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{item.subject}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {item.from_name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {item.from_email}
                    </div>
                    {item.organization && (
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {item.organization}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(item.priority)}>
                    {item.priority}
                  </Badge>
                  <Badge className={getStatusColor(item.status)}>
                    {item.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {item.message}
              </p>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  {item.thread_count > 1 && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {item.thread_count} messages
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {item.status === 'unread' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateStatus(item.id, 'read')}
                    >
                      Mark Read
                    </Button>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedCorrespondence(item)}
                      >
                        <Reply className="h-4 w-4 mr-1" />
                        Reply
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Reply to {item.from_name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2">Original Message:</p>
                          <p className="text-sm text-muted-foreground">{item.message}</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Your Reply</label>
                          <Textarea
                            placeholder="Type your reply..."
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            rows={6}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setSelectedCorrespondence(null)}>
                            Cancel
                          </Button>
                          <Button onClick={sendReply}>
                            <Send className="h-4 w-4 mr-1" />
                            Send Reply
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => updateStatus(item.id, 'archived')}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCorrespondence.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No correspondence found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Correspondence will appear here when you receive messages from the public.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};