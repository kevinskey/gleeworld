import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Upload, Send, ChevronDown, ChevronUp, Calendar, Clock, AlertTriangle, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';
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

interface ClassSchedule {
  id: string;
  courseName: string;
  courseCode: string;
  instructor: string;
  days: string[];
  startTime: string;
  endTime: string;
  location: string;
}

interface ConflictAnalysis {
  totalConflictMinutes: number;
  conflictDays: string[];
  exceedsThreshold: boolean;
  conflicts: {
    day: string;
    conflictMinutes: number;
    rehearsalTime: string;
    classTime: string;
  }[];
}

interface ClassConflictRequest {
  id: string;
  user_id: string;
  schedule: ClassSchedule[];
  conflict_analysis: ConflictAnalysis;
  status: 'pending_section_leader' | 'pending_secretary' | 'pending_final' | 'approved' | 'rejected';
  section_leader_approval?: {
    approved_by: string;
    approved_at: string;
    notes?: string;
  };
  secretary_approval?: {
    approved_by: string;
    approved_at: string;
    notes?: string;
  };
  final_approval?: {
    approved_by: string;
    approved_at: string;
    notes?: string;
  };
  created_at: string;
  updated_at: string;
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
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Class Conflict Worksheet states
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [classSchedules, setClassSchedules] = useState<ClassSchedule[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<ClassSchedule>({
    id: '',
    courseName: '',
    courseCode: '',
    instructor: '',
    days: [],
    startTime: '',
    endTime: '',
    location: ''
  });
  const [conflictAnalysis, setConflictAnalysis] = useState<ConflictAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmittingConflict, setIsSubmittingConflict] = useState(false);
  const [isConflictWorksheetCollapsed, setIsConflictWorksheetCollapsed] = useState(true);
  const [isAttendanceStatsCollapsed, setIsAttendanceStatsCollapsed] = useState(true);

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
        // Get event details
        const selectedEventData = upcomingEvents.find(e => e.id === selectedEvent);
        
        // Submit to new excuse requests table
        const { error } = await supabase
          .from('excuse_requests')
          .insert({
            user_id: user?.id,
            event_id: selectedEvent,
            event_date: selectedEventData?.start_date?.split('T')[0],
            event_title: selectedEventData?.title || 'Unknown Event',
            reason,
            status: 'pending'
          });

        if (error) throw error;

        // Also submit to legacy pre-event excuses table for backward compatibility
        const { error: legacyError } = await supabase
          .from('gw_pre_event_excuses')
          .insert({
            user_id: user?.id,
            event_id: selectedEvent,
            reason,
            documentation_url: documentationUrl,
            status: 'pending'
          });

        if (legacyError) console.warn('Legacy table insert failed:', legacyError);
      } else {
        // Submit post-event excuse (legacy system)
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
        description: excuseType === 'pre-event' 
          ? "Your excuse request has been submitted to the secretary for review"
          : "Your excuse has been submitted for review",
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

  // Class Conflict Worksheet functions
  const daysOfWeek = ['Monday', 'Wednesday', 'Friday'];
  const rehearsalTimes = {
    Monday: { start: '17:00', end: '18:15' },
    Wednesday: { start: '17:00', end: '18:15' },
    Friday: { start: '17:00', end: '18:15' }
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const calculateOverlap = (start1: string, end1: string, start2: string, end2: string): number => {
    const start1Min = timeToMinutes(start1);
    const end1Min = timeToMinutes(end1);
    const start2Min = timeToMinutes(start2);
    const end2Min = timeToMinutes(end2);
    
    const overlapStart = Math.max(start1Min, start2Min);
    const overlapEnd = Math.min(end1Min, end2Min);
    
    return overlapEnd > overlapStart ? overlapEnd - overlapStart : 0;
  };

  const analyzeScheduleConflicts = (): ConflictAnalysis => {
    const conflicts: ConflictAnalysis['conflicts'] = [];
    let totalConflictMinutes = 0;
    const conflictDays: string[] = [];

    classSchedules.forEach(schedule => {
      schedule.days.forEach(day => {
        if (rehearsalTimes[day as keyof typeof rehearsalTimes]) {
          const rehearsal = rehearsalTimes[day as keyof typeof rehearsalTimes];
          const conflictMinutes = calculateOverlap(
            schedule.startTime,
            schedule.endTime,
            rehearsal.start,
            rehearsal.end
          );

          if (conflictMinutes > 0) {
            conflicts.push({
              day,
              conflictMinutes,
              rehearsalTime: `${rehearsal.start} - ${rehearsal.end}`,
              classTime: `${schedule.startTime} - ${schedule.endTime} (${schedule.courseName})`
            });
            totalConflictMinutes += conflictMinutes;
            if (!conflictDays.includes(day)) {
              conflictDays.push(day);
            }
          }
        }
      });
    });

    return {
      totalConflictMinutes,
      conflictDays,
      exceedsThreshold: totalConflictMinutes > 30,
      conflicts
    };
  };

  const addScheduleEntry = () => {
    if (!currentSchedule.courseName || !currentSchedule.startTime || !currentSchedule.endTime || currentSchedule.days.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const newSchedule = {
      ...currentSchedule,
      id: Date.now().toString()
    };

    setClassSchedules([...classSchedules, newSchedule]);
    setCurrentSchedule({
      id: '',
      courseName: '',
      courseCode: '',
      instructor: '',
      days: [],
      startTime: '',
      endTime: '',
      location: ''
    });
  };

  const removeScheduleEntry = (id: string) => {
    setClassSchedules(classSchedules.filter(schedule => schedule.id !== id));
  };

  const handleDayChange = (day: string, checked: boolean) => {
    if (checked) {
      setCurrentSchedule({
        ...currentSchedule,
        days: [...currentSchedule.days, day]
      });
    } else {
      setCurrentSchedule({
        ...currentSchedule,
        days: currentSchedule.days.filter(d => d !== day)
      });
    }
  };

  const analyzeConflicts = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const analysis = analyzeScheduleConflicts();
      setConflictAnalysis(analysis);
      setIsAnalyzing(false);
    }, 1000);
  };

  const submitClassConflictRequest = async () => {
    if (!conflictAnalysis || classSchedules.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please add your schedule and analyze conflicts first",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingConflict(true);

    try {
      // Create the conflict request
      const { error } = await supabase
        .from('gw_class_conflict_requests')
        .insert({
          user_id: user?.id,
          schedule: classSchedules as any,
          conflict_analysis: conflictAnalysis as any,
          status: 'pending_section_leader'
        } as any);

      if (error) throw error;

      // Get section leaders for notifications
      const { data: sectionLeaders } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('is_section_leader', true);

      const userIds = sectionLeaders?.map(u => u.user_id) || [];
      
      if (userIds.length > 0) {
        await sendNotification(
          'New Class Conflict Request',
          'A new class conflict request has been submitted for review.',
          userIds
        );
      }

      toast({
        title: "Request Submitted",
        description: "Your class conflict request has been submitted for section leader review",
      });

      setIsConflictDialogOpen(false);
      setClassSchedules([]);
      setConflictAnalysis(null);
    } catch (error) {
      console.error('Error submitting conflict request:', error);
      toast({
        title: "Error",
        description: "Failed to submit conflict request",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingConflict(false);
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
    <>
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 border-0">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-white/10 transition-colors p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="truncate">Single Excuse Generator</span>
                </CardTitle>
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 flex-shrink-0" />
                ) : (
                  <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 flex-shrink-0" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="animate-accordion-down">
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Excuse Type Selector */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="excuse-type" className="text-sm text-white/90">Excuse Type</Label>
                  <Select value={excuseType} onValueChange={(value: 'pre-event' | 'post-event') => setExcuseType(value)}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
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
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={!isConflictWorksheetCollapsed} onOpenChange={(open) => setIsConflictWorksheetCollapsed(!open)}>
        <Card className="mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 border-0">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Send className="w-5 h-5" />
                  Class Conflict Worksheet
                </CardTitle>
                {isConflictWorksheetCollapsed ? (
                  <ChevronDown className="w-5 h-5 text-white/70" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-white/70" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="animate-accordion-down">
            <CardContent className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Rehearsal Schedule</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Regular rehearsals are held Monday, Wednesday, and Friday from 5:00 PM to 6:15 PM.
                      If your class schedule conflicts with more than 30 minutes of rehearsal time per week, you'll need approval.
                    </p>
                  </div>
                </div>
              </div>

              {/* Added Schedules Display */}
              {classSchedules.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Your Class Schedule</h4>
                  {classSchedules.map((schedule) => (
                    <div key={schedule.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{schedule.courseName} ({schedule.courseCode})</div>
                        <div className="text-sm text-muted-foreground">
                          {schedule.days.join(', ')} • {schedule.startTime} - {schedule.endTime}
                        </div>
                        <div className="text-sm text-muted-foreground">{schedule.instructor} • {schedule.location}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeScheduleEntry(schedule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Conflict Analysis Display */}
              {conflictAnalysis && (
                <div className="space-y-3">
                  <h4 className="font-medium">Conflict Analysis</h4>
                  <div className={`p-4 rounded-lg border-2 ${
                    conflictAnalysis.exceedsThreshold 
                      ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' 
                      : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      {conflictAnalysis.exceedsThreshold ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      <span className={`font-medium ${
                        conflictAnalysis.exceedsThreshold ? 'text-red-900 dark:text-red-100' : 'text-green-900 dark:text-green-100'
                      }`}>
                        {conflictAnalysis.exceedsThreshold 
                          ? 'Approval Required' 
                          : 'No Approval Needed'
                        }
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>Total conflict time: <strong>{conflictAnalysis.totalConflictMinutes} minutes per week</strong></div>
                      {conflictAnalysis.conflicts.length > 0 && (
                        <div>
                          <div className="font-medium mb-1">Conflicts:</div>
                          {conflictAnalysis.conflicts.map((conflict, index) => (
                            <div key={index} className="pl-4 text-muted-foreground">
                              • {conflict.day}: {conflict.conflictMinutes} min conflict ({conflict.classTime})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Dialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Class Schedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Class to Schedule</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="course-name">Course Name *</Label>
                          <Input
                            id="course-name"
                            value={currentSchedule.courseName}
                            onChange={(e) => setCurrentSchedule({...currentSchedule, courseName: e.target.value})}
                            placeholder="e.g., Calculus I"
                          />
                        </div>
                        <div>
                          <Label htmlFor="course-code">Course Code</Label>
                          <Input
                            id="course-code"
                            value={currentSchedule.courseCode}
                            onChange={(e) => setCurrentSchedule({...currentSchedule, courseCode: e.target.value})}
                            placeholder="e.g., MATH 1501"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="instructor">Instructor</Label>
                        <Input
                          id="instructor"
                          value={currentSchedule.instructor}
                          onChange={(e) => setCurrentSchedule({...currentSchedule, instructor: e.target.value})}
                          placeholder="Professor name"
                        />
                      </div>

                      <div>
                        <Label>Days of Week *</Label>
                        <div className="flex gap-4 mt-2">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                            <div key={day} className="flex items-center space-x-2">
                              <Checkbox
                                id={day}
                                checked={currentSchedule.days.includes(day)}
                                onCheckedChange={(checked) => handleDayChange(day, checked as boolean)}
                              />
                              <Label htmlFor={day} className="text-sm">{day.slice(0, 3)}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start-time">Start Time *</Label>
                          <Input
                            id="start-time"
                            type="time"
                            value={currentSchedule.startTime}
                            onChange={(e) => setCurrentSchedule({...currentSchedule, startTime: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="end-time">End Time *</Label>
                          <Input
                            id="end-time"
                            type="time"
                            value={currentSchedule.endTime}
                            onChange={(e) => setCurrentSchedule({...currentSchedule, endTime: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={currentSchedule.location}
                          onChange={(e) => setCurrentSchedule({...currentSchedule, location: e.target.value})}
                          placeholder="Building and room number"
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsConflictDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={addScheduleEntry}>
                          Add Class
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {classSchedules.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={analyzeConflicts}
                    disabled={isAnalyzing}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Conflicts'}
                  </Button>
                )}

                {conflictAnalysis && conflictAnalysis.exceedsThreshold && (
                  <Button 
                    onClick={submitClassConflictRequest}
                    disabled={isSubmittingConflict}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmittingConflict ? 'Submitting...' : 'Submit for Approval'}
                  </Button>
                )}
              </div>

              {conflictAnalysis && conflictAnalysis.exceedsThreshold && (
                <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-100">Approval Process</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Your schedule conflicts exceed 30 minutes per week. The approval process is:
                      </p>
                      <ol className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 pl-4 list-decimal">
                        <li>Section Leader approval</li>
                        <li>Secretary approval</li>
                        <li>Final approval from director</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={!isAttendanceStatsCollapsed} onOpenChange={(open) => setIsAttendanceStatsCollapsed(!open)}>
        <Card className="mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 border-0">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Calendar className="w-5 h-5" />
                  Attendance Stats
                </CardTitle>
                {isAttendanceStatsCollapsed ? (
                  <ChevronDown className="w-5 h-5 text-white/70" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-white/70" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="animate-accordion-down">
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="stats-type" className="text-sm font-medium">Select Statistics Type</Label>
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose attendance statistics to view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overall-rate">Overall Attendance Rate</SelectItem>
                      <SelectItem value="monthly-trends">Monthly Attendance Trends</SelectItem>
                      <SelectItem value="event-breakdown">Event Attendance Breakdown</SelectItem>
                      <SelectItem value="member-rankings">Member Attendance Rankings</SelectItem>
                      <SelectItem value="excuse-history">Excuse Request History</SelectItem>
                      <SelectItem value="class-conflicts">Class Conflict Reports</SelectItem>
                      <SelectItem value="perfect-attendance">Perfect Attendance Members</SelectItem>
                      <SelectItem value="alerts-warnings">Attendance Alerts & Warnings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="mt-6 p-4 bg-white/10 rounded-lg border border-white/20">
                  <div className="text-center text-white/70">
                    Select a statistics type above to view detailed attendance data and analytics.
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </>
  );
};