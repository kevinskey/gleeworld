import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  User,
  Phone,
  Mail
} from "lucide-react";
import { format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
  getHours,
  getMinutes
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  type: 'appointment' | 'audition';
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
  created_at: string;
}

export const AppointmentCalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchCalendarData = async () => {
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      
      // Fetch appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('gw_appointments')
        .select('*')
        .gte('appointment_date', monthStart.toISOString())
        .lte('appointment_date', monthEnd.toISOString())
        .order('appointment_date', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Fetch auditions
      const { data: auditionsData, error: auditionsError } = await supabase
        .from('gw_auditions')
        .select('*')
        .gte('audition_date', monthStart.toISOString())
        .lte('audition_date', monthEnd.toISOString())
        .order('audition_date', { ascending: true });

      if (auditionsError) throw auditionsError;

      // Transform appointments to calendar events
      const appointmentEvents: CalendarEvent[] = (appointmentsData || []).map(apt => ({
        id: apt.id,
        title: apt.title || 'Appointment',
        description: apt.description,
        appointment_date: apt.appointment_date,
        duration_minutes: apt.duration_minutes || 60,
        status: apt.status,
        type: 'appointment' as const,
        client_name: apt.client_name,
        client_email: apt.client_email,
        client_phone: apt.client_phone,
        notes: apt.notes,
        created_at: apt.created_at
      }));

      // Transform auditions to calendar events
      const auditionEvents: CalendarEvent[] = (auditionsData || []).map(audition => ({
        id: audition.id,
        title: 'Audition',
        description: `${audition.first_name} ${audition.last_name} - Audition`,
        appointment_date: audition.audition_date,
        duration_minutes: 30, // Default audition duration
        status: audition.status || 'scheduled',
        type: 'audition' as const,
        client_name: `${audition.first_name} ${audition.last_name}`,
        client_email: audition.email,
        client_phone: audition.phone,
        notes: audition.additional_info,
        created_at: audition.created_at
      }));

      // Combine and sort all events
      const allEvents = [...appointmentEvents, ...auditionEvents].sort(
        (a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
      );

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate]);

  const getStatusColor = (status: string, type: 'appointment' | 'audition') => {
    if (type === 'audition') {
      switch (status) {
        case 'pending': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'scheduled': return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
        case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
        case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
        default: return 'bg-purple-100 text-purple-800 border-purple-200';
      }
    } else {
      switch (status) {
        case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
        case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
        case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
        default: return 'bg-blue-100 text-blue-800 border-blue-200';
      }
    }
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(event => 
      isSameDay(parseISO(event.appointment_date), day)
    ).sort((a, b) => 
      new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const renderCalendarGrid = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const dayEvents = getEventsForDay(day);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[120px] border border-border p-2 ${
              isCurrentMonth ? 'bg-card' : 'bg-muted/30'
            } ${isToday ? 'bg-primary/5 border-primary' : ''}`}
          >
            <div className={`text-sm font-medium mb-2 ${
              isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {format(day, 'd')}
            </div>
            
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 ${getStatusColor(event.status, event.type)}`}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="font-medium truncate">
                    {event.type === 'audition' ? '🎵' : '📅'} {event.client_name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(parseISO(event.appointment_date), 'HH:mm')}
                  </div>
                </div>
              ))}
              
              {dayEvents.length > 3 && (
                <div className="text-xs text-muted-foreground p-1">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-0">
          {days}
        </div>
      );
      days = [];
    }

    return rows;
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="flex">
        {/* Time column */}
        <div className="w-20 border-r">
          <div className="h-12 border-b"></div>
          {hours.map(hour => (
            <div key={hour} className="h-16 border-b p-2 text-sm text-muted-foreground">
              {format(new Date().setHours(hour, 0), 'HH:mm')}
            </div>
          ))}
        </div>
        
        {/* Days columns */}
        {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
          const day = addDays(weekStart, dayOffset);
          const dayEvents = getEventsForDay(day);
          
          return (
            <div key={dayOffset} className="flex-1 border-r">
              <div className="h-12 border-b p-2 text-center font-medium">
                {format(day, 'EEE d')}
              </div>
              
              <div className="relative">
                {hours.map(hour => (
                  <div key={hour} className="h-16 border-b"></div>
                ))}
                
                {dayEvents.map(event => {
                  const eventDate = parseISO(event.appointment_date);
                  const startHour = getHours(eventDate);
                  const startMinute = getMinutes(eventDate);
                  const top = (startHour * 64) + (startMinute * 64 / 60);
                  const height = (event.duration_minutes * 64) / 60;
                  
                  return (
                    <div
                      key={event.id}
                      className={`absolute left-1 right-1 p-1 rounded text-xs cursor-pointer ${getStatusColor(event.status, event.type)}`}
                      style={{ top: `${top}px`, height: `${height}px`, minHeight: '20px' }}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="font-medium truncate">
                        {event.type === 'audition' ? '🎵' : '📅'} {event.client_name}
                      </div>
                      <div className="truncate">{event.title}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendar View
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                >
                  Month
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                >
                  Week
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-lg font-medium min-w-[200px] text-center">
                {format(currentDate, 'MMMM yyyy')}
              </div>
              
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
              {loading ? (
            <div className="text-center py-8">Loading calendar data...</div>
          ) : (
            <>
              {viewMode === 'month' && (
                <div className="space-y-0">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-0 border-b">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="p-2 text-center text-sm font-medium border-r last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar grid */}
                  {renderCalendarGrid()}
                </div>
              )}
              
              {viewMode === 'week' && (
                <div className="overflow-x-auto">
                  {renderWeekView()}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent?.type === 'audition' ? 'Audition Details' : 'Appointment Details'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  {selectedEvent.type === 'audition' ? '🎵' : '📅'} 
                  {selectedEvent.title}
                </h3>
                <Badge className={getStatusColor(selectedEvent.status, selectedEvent.type)}>
                  {selectedEvent.status}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedEvent.client_name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(parseISO(selectedEvent.appointment_date), 'PPP p')} 
                    ({selectedEvent.duration_minutes} min)
                  </span>
                </div>
                
                {selectedEvent.client_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.client_phone}</span>
                  </div>
                )}
                
                {selectedEvent.client_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.client_email}</span>
                  </div>
                )}
                
                {selectedEvent.description && (
                  <div>
                    <p className="text-sm font-medium mb-1">
                      {selectedEvent.type === 'audition' ? 'Notes' : 'Description'}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};