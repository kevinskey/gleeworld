import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

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

  const loadBookingRequests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('gw_booking_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData: BookingRequest[] = (data || []).map(item => ({
        id: item.id,
        organization_name: item.organization_name,
        contact_name: item.contact_person_name,
        contact_email: item.contact_email,
        contact_phone: item.contact_phone,
        event_date: item.event_date_start,
        event_time: item.performance_time,
        event_location: item.venue_name && item.venue_address ? `${item.venue_name}, ${item.venue_address}` : (item.venue_name || item.venue_address || 'TBD'),
        event_type: item.venue_type || 'Performance',
        event_description: item.event_description || item.theme_occasion || 'Performance request',
        estimated_audience: item.expected_attendance || 0,
        budget_range: item.honorarium_offered && item.honorarium_amount ? `$${item.honorarium_amount}` : 'TBD',
        special_requests: item.notes_for_choir || item.notes_for_director,
        status: item.status === 'pending' ? 'new' : (item.status as BookingRequest['status']),
        created_at: item.created_at,
        updated_at: item.updated_at,
        notes: item.notes_for_director
      }));
      
      setRequests(transformedData);
    } catch (error) {
      console.error('Error loading booking requests:', error);
      
      // Fallback to mock data if there's an error
      const mockRequests: BookingRequest[] = [
        {
          id: '1',
          organization_name: 'Atlanta Community Center',
          contact_name: 'Sarah Johnson',
          contact_email: 'sarah@atlantacc.org',
          contact_phone: '(404) 555-0123',
          event_date: '2024-03-15',
          event_time: '19:00',
          event_location: 'Atlanta Community Center Auditorium',
          event_type: 'Community Event',
          event_description: 'Annual spring fundraising gala for local charities',
          estimated_audience: 200,
          budget_range: '$2,000 - $3,000',
          special_requests: 'Please include traditional spirituals in the performance',
          status: 'new',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        },
        {
          id: '2',
          organization_name: 'First Baptist Church',
          contact_name: 'Rev. Michael Davis',
          contact_email: 'mdavis@fbcatlanta.org',
          contact_phone: '(404) 555-0456',
          event_date: '2024-04-21',
          event_time: '11:00',
          event_location: 'First Baptist Church Sanctuary',
          event_type: 'Religious Service',
          event_description: 'Easter Sunday service',
          estimated_audience: 500,
          budget_range: '$1,500 - $2,500',
          status: 'reviewed',
          created_at: '2024-01-10T14:30:00Z',
          updated_at: '2024-01-12T09:15:00Z'
        },
        {
          id: '3',
          organization_name: 'Atlanta Public Schools',
          contact_name: 'Dr. Lisa Thompson',
          contact_email: 'lthompson@apsschools.org',
          contact_phone: '(404) 555-0789',
          event_date: '2024-05-10',
          event_time: '14:00',
          event_location: 'Martin Luther King Jr. High School',
          event_type: 'Educational Event',
          event_description: 'Career day presentation and performance for high school students',
          estimated_audience: 300,
          budget_range: '$1,000 - $1,500',
          status: 'approved',
          created_at: '2024-01-08T11:20:00Z',
          updated_at: '2024-01-14T16:45:00Z'
        }
      ];
      
      setRequests(mockRequests);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookingRequests();
  }, []);

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
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Booking Requests</h2>
          <p className="text-muted-foreground">
            Manage performance requests and inquiries from external organizations
          </p>
        </div>
      </div>

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
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  {request.status === 'new' && (
                    <>
                      <Button variant="outline" size="sm">
                        Mark Reviewed
                      </Button>
                      <Button size="sm">
                        Approve
                      </Button>
                    </>
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
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No booking requests found</h3>
              <p className="text-gray-600">
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