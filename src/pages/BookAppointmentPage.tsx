import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, Calendar, Clock, User, MessageSquare, Mail, Phone, 
  Video, Loader2, MapPin, History, CheckCircle2, XCircle, 
  AlertCircle, Send, BookOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useServices } from '@/hooks/useServices';
import { useAvailableTimeSlots } from '@/hooks/useAppointments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

// Appointment types students can book
const appointmentTypes = [
  { 
    id: 'office-hours', 
    name: 'Office Hours', 
    duration: 15, 
    description: 'Quick check-in or question session with Dr. Johnson',
    icon: '📚'
  },
  { 
    id: 'lesson', 
    name: 'Private Lesson', 
    duration: 30, 
    description: 'One-on-one vocal or music instruction',
    icon: '🎵'
  },
  { 
    id: 'general-meeting', 
    name: 'General Meeting', 
    duration: 15, 
    description: 'Discuss academic, personal, or organizational matters',
    icon: '💬'
  },
];

export default function BookAppointmentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: services } = useServices();
  
  // Form state
  const [selectedType, setSelectedType] = useState('');
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Communication state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const selectedTypeData = appointmentTypes.find(t => t.id === selectedType);

  // Map selected appointment type to a real service
  const getServiceIdForType = (typeId: string): string | null => {
    if (!typeId) return null;
    const matchingService = services?.find(s => 
      (typeId === 'office-hours' && s.name?.toLowerCase().includes('office')) ||
      (typeId === 'lesson' && (s.category?.toLowerCase().includes('coaching') || s.name?.toLowerCase().includes('lesson') || s.name?.toLowerCase().includes('teaching'))) ||
      (typeId === 'general-meeting' && s.category?.toLowerCase().includes('general'))
    );
    return matchingService?.id || services?.[0]?.id || null;
  };

  const resolvedServiceId = getServiceIdForType(selectedType) || '';

  // Fetch available time slots
  const { data: timeSlots, isLoading: slotsLoading } = useAvailableTimeSlots(
    resolvedServiceId,
    selectedDateStr
  );

  // Fetch user's appointment history
  const { data: appointmentHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['user-appointment-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('gw_appointments')
        .select('*')
        .or(`customer_email.eq.${user.email},user_id.eq.${user.id}`)
        .order('appointment_date', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error fetching appointment history:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Generate next 14 weekdays
  const availableDates = Array.from({ length: 21 }, (_, i) => {
    const date = addDays(new Date(), i + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return null;
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEEE, MMMM do')
    };
  }).filter(Boolean) as { value: string; label: string }[];

  const handleBookAppointment = async () => {
    if (!selectedType || !selectedDateStr || !selectedTime || !topic) {
      toast.error('Please fill in all required fields');
      return;
    }

    const serviceId = getServiceIdForType(selectedType);
    if (!serviceId) {
      toast.error('Service configuration not available. Please contact support.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('book_appointment', {
        p_service_id: serviceId,
        p_appointment_date: selectedDateStr,
        p_start_time: selectedTime,
        p_customer_name: profile?.full_name || user?.email || 'Student',
        p_customer_email: user?.email || '',
        p_customer_phone: null,
        p_attendee_count: 1,
        p_special_requests: `Type: ${selectedTypeData?.name}\nTopic: ${topic}${notes ? `\n\nNotes: ${notes}` : ''}`
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };
      
      if (result.success) {
        toast.success(result.message || 'Appointment booked successfully!');
        setSelectedType('');
        setSelectedDateStr('');
        setSelectedTime('');
        setTopic('');
        setNotes('');
      } else {
        toast.error(result.error || 'Failed to book appointment');
      }
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      toast.error(error.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject || !emailBody) {
      toast.error('Please enter subject and message');
      return;
    }

    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('gw-send-email', {
        body: {
          to: 'docjohnson@spelman.edu',
          subject: `[Student Message] ${emailSubject}`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <p><strong>From:</strong> ${profile?.full_name || user?.email}</p>
              <p><strong>Email:</strong> ${user?.email}</p>
              <hr />
              <p>${emailBody.replace(/\n/g, '<br>')}</p>
            </div>
          `,
          replyTo: user?.email
        }
      });

      if (error) throw error;
      
      toast.success('Message sent successfully!');
      setEmailSubject('');
      setEmailBody('');
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      case 'pending':
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Office Photo */}
            <div className="w-full lg:w-1/3">
              <div className="relative rounded-xl overflow-hidden shadow-lg aspect-video lg:aspect-square bg-muted">
                <img 
                  src="https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/media/office/dr-johnson-office.jpg"
                  alt="Dr. Johnson's Office"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h2 className="text-xl font-bold">Dr. Kevin Johnson's Office</h2>
                  <p className="text-sm opacity-90 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Fine Arts Building, Room 204
                  </p>
                </div>
              </div>
            </div>

            {/* Welcome Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Schedule Time with Dr. Johnson</h1>
                <p className="text-muted-foreground mt-2">
                  Book office hours, private lessons, or a general meeting. View your appointment history 
                  and track your progress throughout the semester.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card/50">
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-primary">{appointmentHistory.filter(a => a.status === 'completed').length}</div>
                    <div className="text-xs text-muted-foreground">Completed Sessions</div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50">
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-primary">{appointmentHistory.filter(a => a.status === 'confirmed').length}</div>
                    <div className="text-xs text-muted-foreground">Upcoming</div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50">
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-primary">{appointmentHistory.filter(a => a.status === 'pending').length}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50">
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-primary">{appointmentHistory.length}</div>
                    <div className="text-xs text-muted-foreground">Total Meetings</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="book" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="book" className="gap-2">
              <Calendar className="h-4 w-4" /> Book
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" /> History
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-2">
              <Mail className="h-4 w-4" /> Contact
            </TabsTrigger>
          </TabsList>

          {/* Book Appointment Tab */}
          <TabsContent value="book" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Appointment Type Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Select Appointment Type</CardTitle>
                  <CardDescription>Choose the type of meeting you need</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {appointmentTypes.map(type => (
                    <div
                      key={type.id}
                      onClick={() => {
                        setSelectedType(type.id);
                        setSelectedTime('');
                      }}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedType === type.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{type.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{type.name}</h4>
                            <Badge variant="outline">{type.duration} min</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Date & Time Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Select Date & Time</CardTitle>
                  <CardDescription>Choose an available slot</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Select value={selectedDateStr} onValueChange={(val) => {
                      setSelectedDateStr(val);
                      setSelectedTime('');
                    }} disabled={!selectedType}>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedType ? "Select a date" : "Select appointment type first"} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border shadow-xl z-[100]">
                        {availableDates.map(date => (
                          <SelectItem key={date.value} value={date.value}>
                            {date.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Time *</Label>
                    <Select 
                      value={selectedTime} 
                      onValueChange={setSelectedTime}
                      disabled={!selectedType || !selectedDateStr}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !selectedType || !selectedDateStr 
                            ? "Select type and date first" 
                            : slotsLoading 
                              ? "Loading..." 
                              : "Select a time"
                        } />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border shadow-xl z-[100]">
                        {slotsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : timeSlots && timeSlots.length > 0 ? (
                          timeSlots.map((slot: any) => (
                            <SelectItem key={slot.start_time} value={slot.start_time}>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                {slot.start_time} - {slot.end_time}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            No available times
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Topic/Purpose *</Label>
                    <Input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="What would you like to discuss?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional context or preparation needed..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={handleBookAppointment}
                    disabled={loading || !selectedType || !selectedDateStr || !selectedTime || !topic}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Booking...</>
                    ) : (
                      <><Calendar className="h-4 w-4 mr-2" /> Book Appointment</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> Your Meeting History
                </CardTitle>
                <CardDescription>
                  Track your sessions, notes, and progress with Dr. Johnson
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : appointmentHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No appointment history yet.</p>
                    <p className="text-sm text-muted-foreground">Book your first session to get started!</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4 pr-4">
                      {appointmentHistory.map((apt: any) => (
                        <div 
                          key={apt.id} 
                          className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getStatusBadge(apt.status)}
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(apt.appointment_date), 'EEEE, MMMM d, yyyy')}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {apt.start_time} - {apt.end_time}
                                </span>
                                <span className="text-muted-foreground">
                                  {apt.duration_minutes} min
                                </span>
                              </div>
                              {apt.special_requests && (
                                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                                  {apt.special_requests}
                                </p>
                              )}
                              {apt.notes && (
                                <div className="mt-2 p-2 rounded bg-muted/50 text-sm">
                                  <strong className="text-xs text-muted-foreground">Session Notes:</strong>
                                  <p className="mt-1">{apt.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Contact</CardTitle>
                  <CardDescription>Reach Dr. Johnson directly</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <a 
                    href="mailto:docjohnson@spelman.edu"
                    className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Email</div>
                      <div className="text-sm text-muted-foreground">docjohnson@spelman.edu</div>
                    </div>
                  </a>

                  <a 
                    href="tel:+14706221392"
                    className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">Phone</div>
                      <div className="text-sm text-muted-foreground">(470) 622-1392</div>
                    </div>
                  </a>

                  <a 
                    href="https://zoom.us/j/drjohnson"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Video className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">Virtual Office</div>
                      <div className="text-sm text-muted-foreground">Join Zoom Meeting</div>
                    </div>
                  </a>

                  <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/50">
                    <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-medium">In-Person</div>
                      <div className="text-sm text-muted-foreground">Fine Arts Building, Room 204</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Send Message */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Send a Message</CardTitle>
                  <CardDescription>
                    Send Dr. Johnson a message directly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="What is this about?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Type your message here..."
                      rows={6}
                    />
                  </div>

                  <div className="bg-muted rounded-lg p-3 text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Sending as: <strong className="text-foreground">{profile?.full_name || user?.email}</strong>
                    </span>
                  </div>

                  <Button 
                    onClick={handleSendEmail}
                    disabled={sendingEmail || !emailSubject || !emailBody}
                    className="w-full"
                  >
                    {sendingEmail ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" /> Send Message</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
