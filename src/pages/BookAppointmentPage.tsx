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
import { Calendar as CalendarIcon, CalendarDays, Clock, User, MessageSquare, Mail, Phone, Video, Loader2, MapPin, History, CheckCircle2, XCircle, AlertCircle, Send, BookOpen, GraduationCap, Music, Check, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useServices } from '@/hooks/useServices';
import { useAvailableTimeSlots } from '@/hooks/useAppointments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { PageContainer } from '@/components/layout/PageContainer';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import drJohnsonOffice from '@/assets/dr-johnson-office.jpg';

// Appointment types students can book
const appointmentTypes = [{
  id: 'office-hours',
  name: 'Office Hours',
  duration: 15
}, {
  id: 'voice-lesson',
  name: 'Voice Lesson',
  duration: 30
}, {
  id: 'tutoring',
  name: 'Tutoring',
  duration: 30
}, {
  id: 'solo-audition',
  name: 'Solo Audition',
  duration: 15
}, {
  id: 'general-meeting-15',
  name: 'General Meeting (15 min)',
  duration: 15
}, {
  id: 'general-meeting-30',
  name: 'General Meeting (30 min)',
  duration: 30
}];
export default function BookAppointmentPage() {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    profile
  } = useProfile();
  const {
    data: services
  } = useServices();

  // Form state
  const [selectedType, setSelectedType] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  // Communication state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const selectedTypeData = appointmentTypes.find(t => t.id === selectedType);

  // Map selected appointment type to a real service
  const getServiceIdForType = (typeId: string): string | null => {
    if (!typeId) return null;
    const matchingService = services?.find(s => typeId === 'office-hours' && s.name?.toLowerCase().includes('office') || typeId === 'lesson' && (s.category?.toLowerCase().includes('coaching') || s.name?.toLowerCase().includes('lesson') || s.name?.toLowerCase().includes('teaching')) || typeId === 'general-meeting' && s.category?.toLowerCase().includes('general'));
    return matchingService?.id || services?.[0]?.id || null;
  };
  const resolvedServiceId = getServiceIdForType(selectedType) || '';

  // Fetch available time slots
  const {
    data: timeSlots,
    isLoading: slotsLoading
  } = useAvailableTimeSlots(resolvedServiceId, selectedDateStr);

  // Fetch user's appointment history
  const {
    data: appointmentHistory = [],
    isLoading: historyLoading
  } = useQuery({
    queryKey: ['user-appointment-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const {
        data,
        error
      } = await supabase.from('gw_appointments').select('*').or(`customer_email.eq.${user.email},user_id.eq.${user.id}`).order('appointment_date', {
        ascending: false
      }).limit(20);
      if (error) {
        console.error('Error fetching appointment history:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id
  });

  // Generate next 14 weekdays
  const availableDates = Array.from({
    length: 21
  }, (_, i) => {
    const date = addDays(new Date(), i + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return null;
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEEE, MMMM do')
    };
  }).filter(Boolean) as {
    value: string;
    label: string;
  }[];
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
      const {
        data,
        error
      } = await supabase.rpc('book_appointment', {
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
      const result = data as {
        success: boolean;
        message?: string;
        error?: string;
      };
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
      const {
        error
      } = await supabase.functions.invoke('gw-send-email', {
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
        return <Badge className="bg-green-500 text-white border-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500 text-white border-amber-600"><AlertCircle className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'completed':
        return <Badge className="bg-blue-600 text-white border-blue-700"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  const completedCount = appointmentHistory.filter(a => a.status === 'completed').length;
  const upcomingCount = appointmentHistory.filter(a => a.status === 'confirmed').length;
  const pendingCount = appointmentHistory.filter(a => a.status === 'pending').length;
  return <UniversalLayout>
      {/* Header Banner */}
      <div className="w-full py-6" style={{
      backgroundColor: '#003666'
    }}>
        <h1 className="text-2xl md:text-3xl font-bold text-white text-center tracking-wide">
          OFFICE HOURS
        </h1>
      </div>
      
      <div className="w-full px-4 md:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Office Card */}
          <Card className="lg:col-span-1 overflow-hidden">
            <div className="relative aspect-[4/3] bg-muted">
              <img src={drJohnsonOffice} alt="Dr. Johnson's Office" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <h2 className="text-xl font-bold">Dr. Kevin Johnson</h2>
                <p className="text-base opacity-90 flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4" /> Fine Arts Building, Room 204
                </p>
              </div>
            </div>
            <CardContent className="p-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-white" style={{
                  color: '#003666'
                }}>{completedCount}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Completed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">{upcomingCount}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Upcoming</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="book">
              <TabsList className="grid w-full grid-cols-3 h-20 bg-gradient-to-b from-[#004080] to-[#003666] p-0 pb-0 rounded-t-xl rounded-b-none relative z-10 shadow-lg">
                <TabsTrigger value="book" className="gap-2 text-2xl font-['Bebas_Neue'] tracking-wide text-white rounded-none rounded-tl-xl data-[state=active]:bg-white data-[state=active]:text-[#003666] data-[state=active]:shadow-[0_4px_12px_rgba(0,0,0,0.15)] h-full hover:bg-white/20 transition-all duration-200 border-r border-white/20">
                  <CalendarDays className="h-6 w-6" /> Book
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2 text-2xl font-['Bebas_Neue'] tracking-wide text-white rounded-none data-[state=active]:bg-white data-[state=active]:text-[#003666] data-[state=active]:shadow-[0_4px_12px_rgba(0,0,0,0.15)] h-full hover:bg-white/20 transition-all duration-200 border-r border-white/20">
                  <History className="h-6 w-6" /> History
                </TabsTrigger>
                <TabsTrigger value="contact" className="gap-2 text-2xl font-['Bebas_Neue'] tracking-wide text-white rounded-none rounded-tr-xl data-[state=active]:bg-white data-[state=active]:text-[#003666] data-[state=active]:shadow-[0_4px_12px_rgba(0,0,0,0.15)] h-full hover:bg-white/20 transition-all duration-200">
                  <Mail className="h-6 w-6" /> Contact
                </TabsTrigger>
              </TabsList>

              {/* Book Appointment Tab */}
              <TabsContent value="book" className="mt-0 space-y-4 bg-gradient-to-b from-white to-gray-50 border border-t-0 border-border rounded-b-xl p-6 relative shadow-xl">
                {/* Booking Form */}
                <Card>
                  <CardContent className="p-5 space-y-5 bg-primary-foreground">
                    {/* Service Selection */}
                    <div className="space-y-3 bg-primary-foreground">
                      <Label className="text-xl font-semibold">Service Type *</Label>
                      <Select value={selectedType} onValueChange={val => {
                      setSelectedType(val);
                      setSelectedTime('');
                    }}>
                        <SelectTrigger className="h-14 text-xl">
                          <SelectValue placeholder="Select a service..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border shadow-xl z-[100] max-h-[300px]">
                          {appointmentTypes.map(type => <SelectItem key={type.id} value={type.id} className="py-4 text-xl">
                              <div className="flex items-center justify-between w-full gap-4">
                                <span>{type.name}</span>
                                <Badge variant="secondary" className="ml-2 text-base">{type.duration} min</Badge>
                              </div>
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date & Time Row - Zoom-style pill design */}
                    <div className="space-y-3">
                      <Label className="text-lg">Date & Time *</Label>
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Date Picker */}
                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen} modal={true}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={!selectedType}
                              className={cn(
                                "w-[160px] justify-start text-left font-normal h-12 rounded-lg text-base border-2 hover:border-primary transition-all",
                                !selectedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-5 w-5" />
                              {selectedDate ? format(selectedDate, "MMM d") : "Date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-auto p-0 bg-popover border-2 shadow-2xl z-[9999]" 
                            align="start"
                            side="bottom"
                            sideOffset={8}
                            avoidCollisions={true}
                          >
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                setSelectedDate(date);
                                if (date) {
                                  setSelectedDateStr(format(date, 'yyyy-MM-dd'));
                                }
                                setSelectedTime('');
                                setDatePickerOpen(false);
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className="p-3 pointer-events-auto bg-popover"
                            />
                          </PopoverContent>
                        </Popover>

                        <ArrowRight className="h-5 w-5 text-muted-foreground" />

                        {/* Time Picker */}
                        <Popover open={timePickerOpen} onOpenChange={setTimePickerOpen} modal={true}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={!selectedType || !selectedDateStr}
                              className={cn(
                                "w-[140px] justify-start text-left font-normal h-12 rounded-lg text-base border-2 hover:border-primary transition-all",
                                !selectedTime && "text-muted-foreground"
                              )}
                            >
                              <Clock className="mr-2 h-5 w-5" />
                              {selectedTime || "Time"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-[200px] p-2 bg-popover border-2 shadow-2xl z-[9999]" 
                            align="start" 
                            side="bottom"
                            sideOffset={8}
                            avoidCollisions={true}
                          >
                            <div
                              className="max-h-[280px] overflow-y-auto overscroll-contain pointer-events-auto"
                              onWheelCapture={(e) => e.stopPropagation()}
                              onTouchMove={(e) => e.stopPropagation()}
                            >
                              {slotsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                              ) : timeSlots && timeSlots.length > 0 ? (
                                <div className="p-2">
                                  {timeSlots.map((slot: any) => (
                                    <button
                                      key={slot.start_time}
                                      type="button"
                                      className={cn(
                                        "w-full flex items-center justify-between h-11 px-4 text-base font-normal rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors",
                                        slot.start_time === selectedTime && "bg-primary/10 text-primary font-medium"
                                      )}
                                      onClick={() => {
                                        setSelectedTime(slot.start_time);
                                        setTimePickerOpen(false);
                                      }}
                                    >
                                      <span>{slot.start_time} - {slot.end_time}</span>
                                      {slot.start_time === selectedTime && <Check className="h-5 w-5" />}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                  No available times
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-lg">Topic/Purpose *</Label>
                      <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="What would you like to discuss?" className="h-14 text-lg" />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-lg">Additional Notes</Label>
                      <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional context..." rows={4} className="text-lg" />
                    </div>

                    <Button onClick={handleBookAppointment} disabled={loading || !selectedType || !selectedDateStr || !selectedTime || !topic} className="w-full h-16 text-2xl font-semibold text-white shadow-lg hover:shadow-xl transition-all" style={{
                    backgroundColor: '#003666'
                  }}>
                      {loading ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Booking...</> : <><CalendarDays className="h-5 w-5 mr-2" /> Book Appointment</>}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="mt-0 bg-gradient-to-b from-white to-gray-50 border border-t-0 border-border rounded-b-xl p-6 relative shadow-xl">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4" /> Meeting History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {historyLoading ? <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div> : appointmentHistory.length === 0 ? <div className="text-center py-12">
                        <History className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-muted-foreground text-sm">No appointment history yet.</p>
                        <p className="text-xs text-muted-foreground mt-1">Book your first session to get started!</p>
                      </div> : <ScrollArea className="h-[400px]">
                        <div className="space-y-3 pr-4">
                          {appointmentHistory.map((apt: any) => <div key={apt.id} className="p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {getStatusBadge(apt.status)}
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(apt.appointment_date), 'MMM d, yyyy')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs mt-2 text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {apt.start_time}
                                    </span>
                                    <span>{apt.duration_minutes} min</span>
                                  </div>
                                  {apt.special_requests && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                                      {apt.special_requests}
                                    </p>}
                                  {apt.notes && <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                                      <strong className="text-muted-foreground">Notes:</strong>
                                      <p className="mt-0.5">{apt.notes}</p>
                                    </div>}
                                </div>
                              </div>
                            </div>)}
                        </div>
                      </ScrollArea>}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Contact Tab */}
              <TabsContent value="contact" className="mt-0 space-y-4 bg-gradient-to-b from-white to-gray-50 border border-t-0 border-border rounded-b-xl p-6 relative shadow-xl">
                {/* Quick Contact Links */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <a href="mailto:docjohnson@spelman.edu" className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-accent transition-colors text-center">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium">Email</span>
                  </a>

                  <a href="tel:+14706221392" className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-accent transition-colors text-center">
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium">Call</span>
                  </a>

                  <a href="https://zoom.us/j/drjohnson" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-accent transition-colors text-center">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Video className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium">Zoom</span>
                  </a>

                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-muted/30 text-center">
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-amber-600" />
                    </div>
                    <span className="text-xs font-medium">Room 204</span>
                  </div>
                </div>

                {/* Send Message */}
                <Card>
                  <CardHeader className="pb-3 bg-zinc-200">
                    <CardTitle className="text-base">Send a Message</CardTitle>
                    <CardDescription className="text-xs">
                      Send Dr. Johnson a direct message
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 bg-muted">
                    <div className="space-y-2">
                      <Label className="text-sm">Subject</Label>
                      <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="What is this about?" className="h-10" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Message</Label>
                      <Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Type your message here..." rows={4} />
                    </div>

                    <div className="bg-muted/50 rounded-lg p-2.5 text-xs flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        From: <strong className="text-foreground">{profile?.full_name || user?.email}</strong>
                      </span>
                    </div>

                    <Button onClick={handleSendEmail} disabled={sendingEmail || !emailSubject || !emailBody} className="w-full h-12 text-lg font-semibold text-white shadow-lg hover:shadow-xl transition-all" style={{
                    backgroundColor: '#003666'
                  }}>
                      {sendingEmail ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : <><Send className="h-4 w-4 mr-2" /> Send Message</>}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </UniversalLayout>;
}