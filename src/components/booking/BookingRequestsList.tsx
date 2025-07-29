import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Search, Filter, Eye, Mail, Phone, MapPin, Clock, Users, DollarSign, Music } from 'lucide-react';
import { format } from 'date-fns';
import { BookingRequestDetail } from './BookingRequestDetail';

interface BookingRequest {
  id: string;
  organization_name: string;
  contact_person_name: string;
  contact_title?: string;
  contact_email: string;
  contact_phone: string;
  website?: string;
  event_name: string;
  event_description?: string;
  event_date_start: string;
  event_date_end?: string;
  performance_time?: string;
  performance_duration: string;
  venue_name: string;
  venue_address: string;
  venue_type: string;
  expected_attendance?: number;
  theme_occasion?: string;
  stage_dimensions?: string;
  sound_system_available: boolean;
  sound_system_description?: string;
  lighting_available: boolean;
  lighting_description?: string;
  piano_available: boolean;
  piano_type?: string;
  dressing_rooms_available: boolean;
  rehearsal_time_provided?: string;
  load_in_soundcheck_time?: string;
  av_capabilities?: string;
  honorarium_offered: boolean;
  honorarium_amount?: number;
  travel_expenses_covered?: string[];
  lodging_provided: boolean;
  lodging_nights?: number;
  meals_provided: boolean;
  dietary_restrictions?: string;
  preferred_arrival_point?: string;
  event_recorded_livestreamed: boolean;
  recording_description?: string;
  photo_video_permission: boolean;
  promotional_assets_requested?: string[];
  formal_contract_required: boolean;
  notes_for_director?: string;
  notes_for_choir?: string;
  how_heard_about_us?: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'declined';
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export const BookingRequestsList: React.FC = () => {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookingRequests();
  }, []);

  const fetchBookingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_booking_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as BookingRequest[]);
    } catch (error: any) {
      console.error('Error fetching booking requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load booking requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('gw_booking_requests')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setRequests(prev => 
        prev.map(req => 
          req.id === id ? { ...req, status: status as any } : req
        )
      );

      toast({
        title: 'Status Updated',
        description: `Request marked as ${status}`,
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.contact_person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.venue_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'reviewed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'declined': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusCounts = () => {
    return {
      all: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      reviewed: requests.filter(r => r.status === 'reviewed').length,
      accepted: requests.filter(r => r.status === 'accepted').length,
      declined: requests.filter(r => r.status === 'declined').length,
    };
  };

  const counts = getStatusCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading booking requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Booking Requests</h2>
          <p className="text-muted-foreground">Manage external performance requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {requests.length} Total Requests
          </Badge>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by organization, contact, event, or venue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status ({counts.all})</SelectItem>
            <SelectItem value="pending">Pending ({counts.pending})</SelectItem>
            <SelectItem value="reviewed">Reviewed ({counts.reviewed})</SelectItem>
            <SelectItem value="accepted">Accepted ({counts.accepted})</SelectItem>
            <SelectItem value="declined">Declined ({counts.declined})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed ({counts.reviewed})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({counts.accepted})</TabsTrigger>
          <TabsTrigger value="declined">Declined ({counts.declined})</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  No booking requests found
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'New requests will appear here when submitted'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold mb-1">
                          {request.event_name}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {request.organization_name} • {request.contact_person_name}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(request.event_date_start), 'MMM dd, yyyy')}
                          {request.event_date_end && (
                            <> - {format(new Date(request.event_date_end), 'MMM dd, yyyy')}</>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{request.venue_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{request.performance_duration}</span>
                      </div>
                      {request.expected_attendance && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{request.expected_attendance} attendees</span>
                        </div>
                      )}
                    </div>

                    {request.honorarium_amount && (
                      <div className="flex items-center gap-2 text-sm mb-4">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          ${request.honorarium_amount.toLocaleString()} honorarium offered
                        </span>
                      </div>
                    )}

                    {request.theme_occasion && (
                      <p className="text-sm text-muted-foreground mb-4">
                        <strong>Theme:</strong> {request.theme_occasion}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Booking Request Details</DialogTitle>
                            <DialogDescription>
                              Complete information for {request.event_name}
                            </DialogDescription>
                          </DialogHeader>
                          {selectedRequest && (
                            <BookingRequestDetail 
                              request={selectedRequest} 
                              onStatusUpdate={updateRequestStatus}
                            />
                          )}
                        </DialogContent>
                      </Dialog>

                      <Button variant="outline" size="sm" asChild>
                        <a href={`mailto:${request.contact_email}`}>
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </a>
                      </Button>

                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${request.contact_phone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </a>
                      </Button>

                      {request.status === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => updateRequestStatus(request.id, 'reviewed')}
                          >
                            Mark Reviewed
                          </Button>
                        </>
                      )}

                      {request.status === 'reviewed' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => updateRequestStatus(request.id, 'accepted')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => updateRequestStatus(request.id, 'declined')}
                          >
                            Decline
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};