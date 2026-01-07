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
  FileSignature,
  StickyNote,
  Forward,
  PlusCircle,
  Users,
  Music,
  Utensils,
  Hotel,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface BookingRequest {
  id: string;
  organization_name: string;
  contact_person_name: string;
  contact_email: string;
  contact_phone?: string;
  contact_title?: string;
  event_name: string;
  event_date_start: string;
  event_date_end?: string;
  performance_time?: string;
  performance_duration?: string;
  venue_name: string;
  venue_address: string;
  venue_type?: string;
  expected_attendance?: number;
  event_description?: string;
  honorarium_offered?: boolean;
  honorarium_amount?: number;
  travel_expenses_covered?: string[];
  lodging_provided?: boolean;
  lodging_nights?: number;
  meals_provided?: boolean;
  status: 'pending' | 'reviewed' | 'approved' | 'declined' | 'completed';
  created_at: string;
  updated_at: string;
  notes_for_director?: string;
  notes_for_choir?: string;
  assigned_to?: string;
  piano_available?: boolean;
  piano_type?: string;
  sound_system_available?: boolean;
  lighting_available?: boolean;
  dressing_rooms_available?: boolean;
  stage_dimensions?: string;
  how_heard_about_us?: string;
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
  const [newNote, setNewNote] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const { toast } = useToast();

  // Check if user is superadmin
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const loadBookingRequests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('gw_booking_requests')
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
      const updateData: Record<string, unknown> = { 
        status: newStatus, 
        assigned_to: user?.id,
        updated_at: new Date().toISOString()
      };
      
      if (notes) {
        updateData.notes_for_director = notes;
      }

      const { error } = await supabase
        .from('gw_booking_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, status: newStatus, notes_for_director: notes, assigned_to: user?.id }
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

  const addNoteToRequest = async (requestId: string, note: string) => {
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;
      
      const existingNotes = request.notes_for_director || '';
      const newNoteText = `[${new Date().toLocaleDateString()} - ${user?.full_name || 'Tour Manager'}] ${note}`;
      const updatedNotes = existingNotes ? `${existingNotes}\n\n${newNoteText}` : newNoteText;
      
      const { error } = await supabase
        .from('gw_booking_requests')
        .update({ 
          notes_for_director: updatedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, notes_for_director: updatedNotes }
          : req
      ));

      toast({
        title: "Note added",
        description: "Your note has been added to the request",
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error adding note",
        description: "Could not add note. Please try again.",
        variant: "destructive"
      });
    }
  };

  const forwardToSuperAdmin = async (request: BookingRequest, note: string) => {
    try {
      const forwardNoteText = `[FORWARDED TO SUPERADMIN FOR REVIEW] ${note}`;
      await addNoteToRequest(request.id, forwardNoteText);
      await updateRequestStatus(request.id, 'reviewed');
      
      // Send SMS notification to superadmins
      try {
        const { data: superadmins } = await supabase
          .from('gw_profiles')
          .select('phone_number, full_name')
          .eq('role', 'superadmin');
        
        if (superadmins && superadmins.length > 0) {
          const phoneNumbers = superadmins
            .map(s => s.phone_number)
            .filter(Boolean);
          
          if (phoneNumbers.length > 0) {
            await supabase.functions.invoke('send-sms-notification', {
              body: {
                phoneNumbers,
                message: `Booking request needs approval: "${request.event_name}" from ${request.organization_name} on ${new Date(request.event_date_start).toLocaleDateString()}. Tour Manager note: ${note}`,
                senderName: user?.full_name || 'Tour Manager'
              }
            });
          }
        }
      } catch (smsError) {
        console.error('Error sending SMS notification:', smsError);
        // Don't fail the whole operation if SMS fails
      }
      
      toast({
        title: "Request forwarded",
        description: "The booking request has been forwarded to the superadmin for review. SMS notification sent.",
      });
    } catch (error) {
      console.error('Error forwarding to superadmin:', error);
      toast({
        title: "Error forwarding request",
        description: "Could not forward request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('gw_booking_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setRequests(prev => prev.filter(req => req.id !== requestId));

      toast({
        title: "Request deleted",
        description: "The booking request has been permanently deleted",
      });
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error deleting request",
        description: "Could not delete request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const notifyTourManagers = async (message: string, requestId: string) => {
    try {
      // Get tour managers from executive board
      const { data: tourManagers } = await supabase
        .from('gw_executive_board_members')
        .select('user_id')
        .eq('position', 'tour_manager')
        .eq('is_active', true);
      
      if (tourManagers && tourManagers.length > 0) {
        // Create in-app notifications for each tour manager
        for (const tm of tourManagers) {
          await supabase.from('gw_notifications').insert({
            user_id: tm.user_id,
            title: 'Booking Request Update',
            message: message,
            type: 'info',
            category: 'booking',
            action_url: `/dashboard?module=tour-management&section=booking-requests`,
            metadata: { request_id: requestId }
          });
        }
      }
    } catch (error) {
      console.error('Error notifying tour managers:', error);
    }
  };

  const declineRequest = async (requestId: string, reason?: string) => {
    try {
      const request = requests.find(r => r.id === requestId);
      const declineNote = reason ? `[DECLINED] Reason: ${reason}` : '[DECLINED]';
      await addNoteToRequest(requestId, declineNote);
      await updateRequestStatus(requestId, 'declined');
      
      // Notify tour managers to inform the requestor
      if (request) {
        await notifyTourManagers(
          `Booking request "${request.event_name}" from ${request.organization_name} has been DECLINED. Please contact ${request.contact_person_name} at ${request.contact_email} to inform them of the decision.${reason ? ` Reason: ${reason}` : ''}`,
          requestId
        );
      }
      
      toast({
        title: "Request declined",
        description: "The booking request has been declined. Tour managers have been notified to inform the requestor.",
      });
    } catch (error) {
      console.error('Error declining request:', error);
      toast({
        title: "Error declining request",
        description: "Could not decline request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const approveRequest = async (requestId: string) => {
    try {
      const request = requests.find(r => r.id === requestId);
      await addNoteToRequest(requestId, '[APPROVED BY SUPERADMIN]');
      await updateRequestStatus(requestId, 'approved');
      
      // Notify tour managers to create contract
      if (request) {
        await notifyTourManagers(
          `🎉 Booking request "${request.event_name}" from ${request.organization_name} has been APPROVED! Please create a contract for this event. Event date: ${new Date(request.event_date_start).toLocaleDateString()}`,
          requestId
        );
      }
      
      toast({
        title: "Request approved",
        description: "The booking request has been approved. Tour managers have been notified to create a contract.",
      });
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error approving request",
        description: "Could not approve request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const sendResponse = async (request: BookingRequest) => {
    if (!responseMessage.trim()) return;

    try {
      await updateRequestStatus(request.id, 'reviewed', responseMessage);
      
      setResponseMessage('');
      setSelectedRequest(null);
      
      toast({
        title: "Response sent",
        description: "Your response has been recorded.",
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
      case 'pending':
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
      request.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.contact_person_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.venue_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
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

  const statusCounts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
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
    <div className="space-y-4">
      {/* Compact Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations, contacts, events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-background border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-9">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({statusCounts.all})</SelectItem>
            <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
            <SelectItem value="reviewed">Reviewed ({statusCounts.reviewed})</SelectItem>
            <SelectItem value="approved">Approved ({statusCounts.approved})</SelectItem>
            <SelectItem value="declined">Declined ({statusCounts.declined})</SelectItem>
            <SelectItem value="completed">Completed ({statusCounts.completed})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {filteredRequests.length === 0 && (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Booking Requests</h3>
          <p className="text-muted-foreground">
            {statusFilter === 'all' 
              ? 'No booking requests have been submitted yet.' 
              : `No ${statusFilter} requests found.`}
          </p>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.map((request) => (
          <div 
            key={request.id} 
            className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
          >
            {/* Request Row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{request.event_name}</h3>
                <p className="text-sm text-muted-foreground">{request.organization_name}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(request.event_date_start)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {request.venue_name}
                  </span>
                  {request.expected_attendance && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {request.expected_attendance} attendees
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <Badge 
                  variant="outline" 
                  className={`${getStatusColor(request.status)} text-xs font-medium px-2.5 py-0.5`}
                >
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
                {request.honorarium_offered && request.honorarium_amount && (
                  <span className="text-primary font-semibold text-sm whitespace-nowrap flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    {request.honorarium_amount.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            
            {/* Quick Info Tags */}
            <div className="flex flex-wrap gap-2 mt-3">
              {request.lodging_provided && (
                <Badge variant="secondary" className="text-xs">
                  <Hotel className="h-3 w-3 mr-1" /> Lodging
                </Badge>
              )}
              {request.meals_provided && (
                <Badge variant="secondary" className="text-xs">
                  <Utensils className="h-3 w-3 mr-1" /> Meals
                </Badge>
              )}
              {request.travel_expenses_covered && request.travel_expenses_covered.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Travel Covered
                </Badge>
              )}
              {request.piano_available && (
                <Badge variant="secondary" className="text-xs">
                  Piano Available
                </Badge>
              )}
            </div>
            
            {/* View Details Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-3 h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  View Details
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{request.event_name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {/* Organization & Contact */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Organization:</span>
                      <p className="font-medium">{request.organization_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contact:</span>
                      <p className="font-medium">{request.contact_person_name}</p>
                      {request.contact_title && <p className="text-xs text-muted-foreground">{request.contact_title}</p>}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{request.contact_email}</p>
                    </div>
                    {request.contact_phone && (
                      <div>
                        <span className="text-muted-foreground">Phone:</span>
                        <p className="font-medium">{request.contact_phone}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Event Details */}
                  <div className="space-y-2 border-t pt-4">
                    <h4 className="font-medium text-sm">Event Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(request.event_date_start)}</span>
                      </div>
                      {request.performance_time && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{request.performance_time}</span>
                        </div>
                      )}
                      {request.performance_duration && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Duration: {request.performance_duration}</span>
                        </div>
                      )}
                      {request.expected_attendance && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{request.expected_attendance} expected attendees</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Venue Details */}
                  <div className="space-y-2 border-t pt-4">
                    <h4 className="font-medium text-sm">Venue</h4>
                    <div className="text-sm">
                      <p className="font-medium">{request.venue_name}</p>
                      <p className="text-muted-foreground">{request.venue_address}</p>
                      {request.venue_type && <p className="text-muted-foreground">Type: {request.venue_type}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {request.piano_available && (
                        <Badge variant="outline" className="text-xs">
                          Piano: {request.piano_type || 'Available'}
                        </Badge>
                      )}
                      {request.sound_system_available && (
                        <Badge variant="outline" className="text-xs">Sound System</Badge>
                      )}
                      {request.lighting_available && (
                        <Badge variant="outline" className="text-xs">Lighting</Badge>
                      )}
                      {request.dressing_rooms_available && (
                        <Badge variant="outline" className="text-xs">Dressing Rooms</Badge>
                      )}
                    </div>
                  </div>

                  {/* Compensation & Logistics */}
                  <div className="space-y-2 border-t pt-4">
                    <h4 className="font-medium text-sm">Compensation & Logistics</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {request.honorarium_offered && (
                        <div>
                          <span className="text-muted-foreground">Honorarium:</span>
                          <p className="font-medium text-primary">
                            ${request.honorarium_amount?.toLocaleString() || 'TBD'}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Lodging:</span>
                        <p className="font-medium">
                          {request.lodging_provided ? `Yes (${request.lodging_nights || '?'} nights)` : 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Meals:</span>
                        <p className="font-medium">{request.meals_provided ? 'Provided' : 'Not provided'}</p>
                      </div>
                      {request.travel_expenses_covered && request.travel_expenses_covered.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Travel Covered:</span>
                          <p className="font-medium">{request.travel_expenses_covered.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Description */}
                  {request.event_description && (
                    <div className="space-y-2 border-t pt-4">
                      <h4 className="font-medium text-sm">Event Description</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.event_description}</p>
                    </div>
                  )}

                  {/* Notes */}
                  {request.notes_for_choir && (
                    <div className="space-y-2 border-t pt-4">
                      <h4 className="font-medium text-sm">Notes for Choir</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.notes_for_choir}</p>
                    </div>
                  )}
                  
                  {request.notes_for_director && (
                    <div className="space-y-2 border-t pt-4">
                      <h4 className="font-medium text-sm">Director Notes</h4>
                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md whitespace-pre-wrap">
                        {request.notes_for_director}
                      </div>
                    </div>
                  )}

                  {request.how_heard_about_us && (
                    <div className="space-y-2 border-t pt-4">
                      <h4 className="font-medium text-sm">How They Heard About Us</h4>
                      <p className="text-sm text-muted-foreground">{request.how_heard_about_us}</p>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    {/* Status Select - Superadmins get full control */}
                    {isSuperAdmin ? (
                      <Select 
                        value={request.status} 
                        onValueChange={(value) => updateRequestStatus(request.id, value as BookingRequest['status'])}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="reviewed">Reviewed</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="declined">Declined</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      // Tour managers can only mark as reviewed
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8"
                        onClick={() => updateRequestStatus(request.id, 'reviewed')}
                        disabled={request.status === 'reviewed'}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Mark Reviewed
                      </Button>
                    )}
                    
                    {/* Add Note Dialog - All users */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          <StickyNote className="h-3.5 w-3.5 mr-1" />
                          Add Note
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Note</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <Textarea
                            placeholder="Enter your note..."
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            rows={4}
                          />
                          <Button 
                            onClick={() => {
                              if (newNote.trim()) {
                                addNoteToRequest(request.id, newNote);
                                setNewNote('');
                              }
                            }}
                            className="w-full"
                          >
                            Save Note
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Forward to Superadmin - Tour Managers only */}
                    {!isSuperAdmin && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8">
                            <Forward className="h-3.5 w-3.5 mr-1" />
                            Forward to Admin
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Forward to Superadmin</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <p className="text-sm text-muted-foreground">
                              Forward this request to the superadmin for final approval or decline.
                            </p>
                            <Textarea
                              placeholder="Add a note explaining your recommendation..."
                              value={forwardNote}
                              onChange={(e) => setForwardNote(e.target.value)}
                              rows={4}
                            />
                            <Button 
                              onClick={() => {
                                if (forwardNote.trim()) {
                                  forwardToSuperAdmin(request, forwardNote);
                                  setForwardNote('');
                                }
                              }}
                              className="w-full"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Forward Request
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* Superadmin Only Actions */}
                    {isSuperAdmin && (
                      <>
                        {/* Quick Approve */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-green-600 hover:text-green-700 border-green-200 hover:border-green-300">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve Request</AlertDialogTitle>
                              <AlertDialogDescription>
                                Approve this booking request from {request.organization_name}? Tour managers will be notified to create a contract.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => approveRequest(request.id)}
                                className="bg-green-600 text-white hover:bg-green-700"
                              >
                                Approve & Notify
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {/* Quick Decline */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-destructive hover:text-destructive">
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Decline
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Decline Request</AlertDialogTitle>
                              <AlertDialogDescription>
                                Decline this booking request from {request.organization_name}? Tour managers will be notified to inform the requestor.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => declineRequest(request.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Decline & Notify
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {/* Delete Request */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Request</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the booking request from {request.organization_name}. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteRequest(request.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Permanently
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ))}
      </div>
    </div>
  );
};
