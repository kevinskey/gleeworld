import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isAfter, isBefore, addHours } from 'date-fns';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileText,
  Plus,
  Eye,
  User,
  MapPin
} from 'lucide-react';

interface UpcomingEvent {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  start_date: string;
  end_date?: string;
  location?: string;
  venue_name?: string;
}

interface PreEventExcuse {
  id: string;
  reason: string;
  documentation_url?: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  gw_events: {
    title: string;
    start_date: string;
    event_type: string;
  };
}

export const PreEventExcuses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [myExcuses, setMyExcuses] = useState<PreEventExcuse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [reason, setReason] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [showExcuseDialog, setShowExcuseDialog] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const futureDate = addHours(now, 2); // Allow excuses up to 2 hours before event

      // Load upcoming events
      const { data: eventsData, error: eventsError } = await supabase
        .from('gw_events')
        .select('id, title, description, event_type, start_date, end_date, location, venue_name')
        .gte('start_date', futureDate.toISOString())
        .eq('status', 'scheduled')
        .order('start_date', { ascending: true })
        .limit(20);

      if (eventsError) throw eventsError;

      // Load user's pre-event excuses
      const { data: excusesData, error: excusesError } = await supabase
        .from('gw_pre_event_excuses')
        .select(`
          id,
          reason,
          documentation_url,
          status,
          created_at,
          reviewed_at,
          gw_events!gw_pre_event_excuses_event_id_fkey(
            title,
            start_date,
            event_type
          )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (excusesError) throw excusesError;

      // Filter out events that already have excuse requests
      const excusedEventIds = new Set(
        excusesData?.map(excuse => {
          // Get event_id from the relationship
          const eventData = excuse.gw_events;
          // Since we can't get the id directly, we'll filter by matching title and date
          return `${eventData?.title}-${eventData?.start_date}`;
        }) || []
      );
      
      const availableEvents = eventsData?.filter(event => {
        const eventKey = `${event.title}-${event.start_date}`;
        return !excusedEventIds.has(eventKey);
      }) || [];

      setUpcomingEvents(availableEvents);
      setMyExcuses(excusesData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load upcoming events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitPreEventExcuse = async () => {
    if (!selectedEvent || !reason.trim()) {
      toast({
        title: "Error",
        description: "Please select an event and provide a reason",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      let documentUrl = null;

      // Upload document if provided
      if (documentFile) {
        const fileExt = documentFile.name.split('.').pop();
        const fileName = `pre-event-excuses/${user!.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('user-files')
          .upload(fileName, documentFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('user-files')
          .getPublicUrl(fileName);

        documentUrl = publicUrl;
      }

      // Create pre-event excuse
      const { error } = await supabase
        .from('gw_pre_event_excuses')
        .insert([{
          user_id: user!.id,
          event_id: selectedEvent,
          reason: reason.trim(),
          documentation_url: documentUrl
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pre-event excuse submitted successfully",
      });

      // Reset form
      setSelectedEvent('');
      setReason('');
      setDocumentFile(null);
      setShowExcuseDialog(false);

      // Reload data
      loadData();

    } catch (error: any) {
      console.error('Error submitting pre-event excuse:', error);
      toast({
        title: "Error",
        description: error.message?.includes('duplicate') 
          ? "You've already submitted an excuse for this event"
          : "Failed to submit excuse request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const canSubmitExcuse = (eventDate: string) => {
    const eventStart = new Date(eventDate);
    const now = new Date();
    const cutoffTime = addHours(now, 2); // Must submit at least 2 hours before event
    
    return isBefore(cutoffTime, eventStart);
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-gray-600">Please sign in to submit pre-event excuses.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </CardTitle>
          <Dialog open={showExcuseDialog} onOpenChange={setShowExcuseDialog}>
            <DialogTrigger asChild>
              <Button disabled={upcomingEvents.length === 0}>
                <Plus className="h-4 w-4 mr-1" />
                Submit Excuse
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Pre-Event Excuse</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Event</Label>
                  <select 
                    value={selectedEvent} 
                    onChange={(e) => setSelectedEvent(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Choose an upcoming event...</option>
                    {upcomingEvents.map(event => (
                      <option key={event.id} value={event.id}>
                        {event.title} - {format(new Date(event.start_date), 'MMM dd, yyyy h:mm a')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Reason for Future Absence</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please explain why you will be unable to attend..."
                    className="min-h-24"
                  />
                </div>

                <div>
                  <Label>Supporting Documentation (Optional)</Label>
                  <Input
                    type="file"
                    onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload appointment confirmation, travel documents, etc.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={submitPreEventExcuse}
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? 'Submitting...' : 'Submit Excuse'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowExcuseDialog(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Upcoming Events</h3>
              <p className="text-gray-600">No events available for pre-excuse submission.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map(event => (
                <div key={event.id} className="flex items-center gap-4 p-4 border rounded-lg hover-scale transition-all duration-200">
                  <div className="flex-1">
                    <div className="font-medium">{event.title}</div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.start_date), 'MMM dd, yyyy h:mm a')}
                      </span>
                      {(event.location || event.venue_name) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location || event.venue_name}
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {event.event_type}
                      </Badge>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    {canSubmitExcuse(event.start_date) ? (
                      <Badge className="bg-green-100 text-green-800">
                        Can excuse
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600">
                        Too late
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Pre-Event Excuses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Pre-Event Excuses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : myExcuses.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pre-Event Excuses</h3>
              <p className="text-gray-600">You haven't submitted any pre-event excuses yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myExcuses.map(excuse => (
                <div key={excuse.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(excuse.status)}
                    <Badge className={getStatusColor(excuse.status)}>
                      {excuse.status}
                    </Badge>
                  </div>

                  <div className="flex-1">
                    <div className="font-medium">{excuse.gw_events.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {format(new Date(excuse.gw_events.start_date), 'MMM dd, yyyy h:mm a')}
                    </div>
                    <p className="text-sm mt-2 italic">"{excuse.reason}"</p>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      Submitted {format(new Date(excuse.created_at), 'MMM dd')}
                    </div>
                    {excuse.documentation_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => window.open(excuse.documentation_url, '_blank')}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Doc
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};