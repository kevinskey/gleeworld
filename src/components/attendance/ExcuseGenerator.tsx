import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UpcomingEvent {
  id: string;
  title: string;
  start_date: string;
  location: string;
}

interface AttendanceRecord {
  id: string;
  event: {
    id: string;
    title: string;
    start_date: string;
  };
}

export const ExcuseGenerator = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [excuseType, setExcuseType] = useState<'pre-event' | 'post-event'>('pre-event');
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [excuseFile, setExcuseFile] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const reasonOptions = [
    'Medical appointment',
    'Family emergency',
    'Academic conflict',
    'Work commitment',
    'Transportation issues',
    'Illness',
    'Other'
  ];

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, excuseType]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (excuseType === 'pre-event') {
        // Load upcoming events
        const { data: events, error } = await supabase
          .from('gw_events')
          .select('id, title, start_date, venue_name')
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true });

        if (error) throw error;
        
        const formattedEvents = events?.map(event => ({
          id: event.id,
          title: event.title,
          start_date: event.start_date,
          location: event.venue_name || ''
        })) || [];
        
        setUpcomingEvents(formattedEvents);
      } else {
        // Load attendance records for events user missed
        const { data: records, error } = await supabase
          .from('gw_event_attendance')
          .select(`
            id,
            gw_events!inner (
              id,
              title,
              start_date
            )
          `)
          .eq('user_id', user?.id)
          .eq('attendance_status', 'absent')
          .order('gw_events.start_date', { ascending: false });

        if (error) throw error;
        
        const formattedRecords = records?.map(record => ({
          id: record.id,
          event: {
            id: record.gw_events.id,
            title: record.gw_events.title,
            start_date: record.gw_events.start_date
          }
        })) || [];
        
        setAttendanceRecords(formattedRecords);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setExcuseFile(file);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}_${Date.now()}.${fileExt}`;
      const filePath = `excuse-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const sendNotification = async (title: string, message: string, userIds: string[]) => {
    try {
      for (const userId of userIds) {
        await supabase.rpc('create_notification_with_delivery', {
          p_user_id: userId,
          p_title: title,
          p_message: message,
          p_type: 'excuse_request',
          p_category: 'attendance',
          p_send_email: true
        });
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  const submitExcuse = async () => {
    if (!selectedEvent || !selectedReason) {
      toast({
        title: "Missing Information",
        description: "Please select an event and reason",
        variant: "destructive",
      });
      return;
    }

    if (selectedReason === 'Other' && !customReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a custom reason",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let documentationUrl = null;
      if (excuseFile) {
        documentationUrl = await uploadFile(excuseFile);
      }

      const reason = selectedReason === 'Other' ? customReason : selectedReason;

      if (excuseType === 'pre-event') {
        // Submit pre-event excuse
        const { error } = await supabase
          .from('gw_pre_event_excuses')
          .insert({
            user_id: user?.id,
            event_id: selectedEvent,
            reason,
            documentation_url: documentationUrl,
            status: 'pending'
          });

        if (error) throw error;
      } else {
        // Submit post-event excuse
        const { error } = await supabase
          .from('gw_attendance_excuses')
          .insert({
            attendance_id: selectedEvent,
            reason,
            documentation_url: documentationUrl,
            status: 'pending'
          });

        if (error) throw error;
      }

      // Get secretary and section leaders for notifications
      const { data: notificationUsers } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .or('exec_board_role.eq.secretary,section_leader.eq.true,is_admin.eq.true,is_super_admin.eq.true');

      const userIds = notificationUsers?.map(u => u.user_id) || [];
      
      await sendNotification(
        `New ${excuseType} Excuse Request`,
        `A new ${excuseType} excuse has been submitted for review.`,
        userIds
      );

      toast({
        title: "Excuse Submitted",
        description: "Your excuse has been submitted for review",
      });

      // Reset form
      setSelectedEvent('');
      setSelectedReason('');
      setCustomReason('');
      setExcuseFile(null);
      setIsDialogOpen(false);
      
      // Reload data
      loadData();
    } catch (error) {
      console.error('Error submitting excuse:', error);
      toast({
        title: "Error",
        description: "Failed to submit excuse",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Excuse Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <div>Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const eventOptions = excuseType === 'pre-event' 
    ? upcomingEvents.map(event => ({
        value: event.id,
        label: `${event.title} - ${new Date(event.start_date).toLocaleDateString()}`
      }))
    : attendanceRecords.map(record => ({
        value: record.id,
        label: `${record.event.title} - ${new Date(record.event.start_date).toLocaleDateString()}`
      }));

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Excuse Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Excuse Type Selector */}
          <div>
            <Label htmlFor="excuse-type">Excuse Type</Label>
            <Select value={excuseType} onValueChange={(value: 'pre-event' | 'post-event') => setExcuseType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select excuse type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pre-event">Pre-Event</SelectItem>
                <SelectItem value="post-event">Post-Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Event Selector */}
          <div>
            <Label htmlFor="event-select">
              {excuseType === 'pre-event' ? 'Upcoming Event' : 'Missed Event'}
            </Label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger>
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                {eventOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason Selector */}
          <div>
            <Label htmlFor="reason-select">Reason</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <div className="flex items-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  disabled={!selectedEvent || !selectedReason}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Excuse
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Excuse Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {selectedReason === 'Other' && (
                    <div>
                      <Label htmlFor="custom-reason">Custom Reason</Label>
                      <Textarea
                        id="custom-reason"
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="Please provide details..."
                        rows={3}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="excuse-file">Upload Documentation (Optional)</Label>
                    <Input
                      id="excuse-file"
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    {excuseFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Selected: {excuseFile.name}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={submitExcuse}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Excuse'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};