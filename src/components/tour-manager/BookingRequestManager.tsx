import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Calendar, 
  MapPin, 
  Phone,
  Mail,
  Building,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Search,
  MessageSquare,
  Send,
  FileSignature
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface BookingRequest {
  id: string;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  event_date: string;
  event_time?: string;
  event_location: string;
  event_type: string;
  event_description: string;
  estimated_audience: number;
  budget_range?: string;
  special_requests?: string;
  status: 'new' | 'reviewed' | 'approved' | 'declined' | 'completed';
  created_at: string;
  updated_at: string;
  notes?: string;
  assigned_to?: string;
}

interface BookingRequestManagerProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

export const BookingRequestManager = ({ user }: BookingRequestManagerProps) => {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const { toast } = useToast();

  const loadBookingRequests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('booking_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRequests((data || []) as BookingRequest[]);
    } catch (error) {
      console.error('Error loading booking requests:', error);
      toast({
        title: "Error loading requests",
        description: "Could not load booking requests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookingRequests();
  }, []);

  const updateRequestStatus = async (requestId: string, newStatus: BookingRequest['status'], notes?: string) => {
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({ 
          status: newStatus, 
          notes: notes,
          assigned_to: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, status: newStatus, notes, assigned_to: user?.id }
          : req
      ));

      toast({
        title: "Status updated",
        description: `Request status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error updating status",
        description: "Could not update request status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const sendResponse = async (request: BookingRequest) => {
    if (!responseMessage.trim()) return;

    try {
      // Here you would integrate with your email system
      // For now, we'll just update the status and add notes
      await updateRequestStatus(request.id, 'reviewed', responseMessage);
      
      setResponseMessage('');
      setSelectedRequest(null);
      
      toast({
        title: "Response sent",
        description: "Your response has been sent to the organization.",
      });
    } catch (error) {
      console.error('Error sending response:', error);
      toast({
        title: "Error sending response",
        description: "Could not send response. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: BookingRequest['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'reviewed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: BookingRequest['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'declined':
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.event_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Time TBD';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const statusCounts = {
    all: requests.length,
    new: requests.filter(r => r.status === 'new').length,
    reviewed: requests.filter(r => r.status === 'reviewed').length,
    approved: requests.filter(r => r.status === 'approved').length,
    declined: requests.filter(r => r.status === 'declined').length,
    completed: requests.filter(r => r.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading booking requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
            placeholder="Search organizations, contacts, or event types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      <div className="grid gap-6">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{request.organization_name}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      {request.contact_name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {request.contact_email}
                    </div>
                    {request.contact_phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {request.contact_phone}
                      </div>
                    )}
                  </div>
                </div>
                <Badge className={`${getStatusColor(request.status)} gap-1`}>
                  {getStatusIcon(request.status)}
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatDate(request.event_date)}</span>
                    <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                    <span>{formatTime(request.event_time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{request.event_location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{request.event_type}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span>{request.estimated_audience} expected attendees</span>
                  </div>
                  {request.budget_range && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{request.budget_range}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Event Description</h4>
                <p className="text-sm text-muted-foreground">{request.event_description}</p>
              </div>

              {request.special_requests && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Special Requests</h4>
                  <p className="text-sm text-muted-foreground">{request.special_requests}</p>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-xs text-muted-foreground">
                  Submitted {formatDate(request.created_at)}
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Respond
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Respond to {request.organization_name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Response Message</label>
                          <Textarea
                            placeholder="Type your response to the organization..."
                            value={responseMessage}
                            onChange={(e) => setResponseMessage(e.target.value)}
                            rows={6}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                            Cancel
                          </Button>
                          <Button onClick={() => selectedRequest && sendResponse(selectedRequest)}>
                            <Send className="h-4 w-4 mr-1" />
                            Send Response
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {request.status === 'new' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateRequestStatus(request.id, 'reviewed')}
                      >
                        Mark Reviewed
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => updateRequestStatus(request.id, 'approved')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </>
                  )}
                  
                  {request.status === 'approved' && (
                    <Button size="sm" variant="outline">
                      <FileSignature className="h-4 w-4 mr-1" />
                      Create Contract
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No booking requests found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Booking requests will appear here when organizations submit performance inquiries.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};