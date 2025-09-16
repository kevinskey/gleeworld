import React, { useState } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  FileText,
  Filter,
  Search,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameWeek,
  parseISO,
  isAfter,
  isBefore,
  startOfDay
} from 'date-fns';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  service: string;
  date: Date;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  calendarId?: string;
}

interface EnhancedAppointmentCalendarProps {
  appointments?: Appointment[];
  onDateSelect?: (date: Date) => void;
  onAppointmentSelect?: (appointment: Appointment) => void;
}

type ViewMode = 'month' | 'week' | 'day';

export const EnhancedAppointmentCalendar: React.FC<EnhancedAppointmentCalendarProps> = ({
  appointments = [],
  onDateSelect,
  onAppointmentSelect
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter appointments based on search and status
  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = !searchQuery || 
      apt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.service.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getAppointmentsForDate = (date: Date) => {
    return filteredAppointments.filter(apt => isSameDay(new Date(apt.date), date));
  };

  const getTodaysAppointments = () => {
    return getAppointmentsForDate(new Date()).sort((a, b) => a.time.localeCompare(b.time));
  };

  const getWeekAppointments = () => {
    const weekStart = startOfWeek(selectedDate);
    const weekEnd = endOfWeek(selectedDate);
    
    return filteredAppointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate >= weekStart && aptDate <= weekEnd;
    }).sort((a, b) => {
      const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      return a.time.localeCompare(b.time);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500 border-green-600 text-white';
      case 'pending': return 'bg-yellow-500 border-yellow-600 text-white';
      case 'completed': return 'bg-blue-500 border-blue-600 text-white';
      case 'cancelled': return 'bg-red-500 border-red-600 text-white';
      default: return 'bg-gray-500 border-gray-600 text-white';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    } else if (viewMode === 'week') {
      setSelectedDate(prev => direction === 'prev' ? addDays(prev, -7) : addDays(prev, 7));
    } else {
      setSelectedDate(prev => direction === 'prev' ? addDays(prev, -1) : addDays(prev, 1));
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
      <div className="space-y-4">
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-muted-foreground">
              <span className="hidden md:inline">{day}</span>
              <span className="md:hidden">{day.slice(0, 3)}</span>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map(date => {
            const dayAppointments = getAppointmentsForDate(date);
            const isSelected = isSameDay(date, selectedDate);
            const isCurrentDay = isToday(date);
            
            return (
              <div
                key={date.toISOString()}
                className={cn(
                  'min-h-[120px] p-2 border rounded-lg cursor-pointer transition-all hover:bg-accent/50',
                  isSelected && 'bg-primary/10 border-primary',
                  isCurrentDay && 'ring-2 ring-primary/50',
                  dayAppointments.length > 0 && 'bg-secondary/30'
                )}
                onClick={() => handleDateClick(date)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    'text-sm font-medium',
                    isCurrentDay && 'text-primary font-bold',
                    isSelected && 'text-primary'
                  )}>
                    {format(date, 'd')}
                  </span>
                  {dayAppointments.length > 0 && (
                    <Badge variant="secondary" className="text-xs h-5">
                      {dayAppointments.length}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map(apt => (
                    <div
                      key={apt.id}
                      className={cn(
                        'text-xs p-1 rounded border truncate cursor-pointer',
                        getStatusColor(apt.status)
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentSelect?.(apt);
                      }}
                    >
                      {apt.time} - {apt.clientName}
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayAppointments.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(date => {
            const dayAppointments = getAppointmentsForDate(date);
            const isCurrentDay = isToday(date);
            const isSelected = isSameDay(date, selectedDate);
            
            return (
              <div key={date.toISOString()} className="space-y-2">
                <div 
                  className={cn(
                    'p-3 text-center border rounded-lg cursor-pointer transition-all',
                    isCurrentDay && 'bg-primary text-primary-foreground',
                    isSelected && !isCurrentDay && 'bg-secondary',
                    'hover:bg-accent'
                  )}
                  onClick={() => handleDateClick(date)}
                >
                  <div className="text-sm font-medium">
                    {format(date, 'EEE')}
                  </div>
                  <div className="text-lg font-bold">
                    {format(date, 'd')}
                  </div>
                </div>
                
                <div className="space-y-1 min-h-[300px]">
                  {dayAppointments.map(apt => (
                    <div
                      key={apt.id}
                      className={cn(
                        'p-2 rounded border cursor-pointer hover:shadow-md transition-all',
                        getStatusColor(apt.status)
                      )}
                      onClick={() => onAppointmentSelect?.(apt)}
                    >
                      <div className="font-medium text-sm">{apt.time}</div>
                      <div className="text-xs truncate">{apt.clientName}</div>
                      <div className="text-xs truncate">{apt.service}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(selectedDate);
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          <p className="text-muted-foreground">
            {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>
        
        <div className="space-y-3">
          {dayAppointments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No appointments scheduled for this day</p>
            </div>
          ) : (
            dayAppointments.map(apt => (
              <Card 
                key={apt.id}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => onAppointmentSelect?.(apt)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{apt.time}</span>
                      </div>
                      <Badge className={cn('border', getStatusBadgeColor(apt.status))}>
                        {apt.status}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {apt.duration} min
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{apt.clientName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{apt.clientEmail}</span>
                    </div>
                    
                    {apt.clientPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{apt.clientPhone}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{apt.service}</span>
                    </div>
                    
                    {apt.notes && (
                      <div className="mt-3 p-3 bg-secondary/50 rounded">
                        <p className="text-sm">{apt.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  const getViewTitle = () => {
    switch (viewMode) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'week':
        const weekStart = startOfWeek(selectedDate);
        const weekEnd = endOfWeek(selectedDate);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'day':
        return format(selectedDate, 'EEEE, MMMM d, yyyy');
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* View Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">{getViewTitle()}</h2>
      </div>

      {/* Calendar Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Calendar View */}
        <div className="xl:col-span-3">
          <Card>
            <CardContent className="p-6">
              {viewMode === 'month' && renderMonthView()}
              {viewMode === 'week' && renderWeekView()}
              {viewMode === 'day' && renderDayView()}
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {getTodaysAppointments().length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No appointments today
                </p>
              ) : (
                getTodaysAppointments().map(apt => (
                  <div
                    key={apt.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-all"
                    onClick={() => onAppointmentSelect?.(apt)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{apt.time}</span>
                      <Badge className={cn('text-xs', getStatusBadgeColor(apt.status))}>
                        {apt.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{apt.clientName}</p>
                    <p className="text-xs text-muted-foreground">{apt.service}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-secondary/50 rounded">
                  <div className="text-lg font-bold text-green-600">
                    {filteredAppointments.filter(a => a.status === 'confirmed').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Confirmed</div>
                </div>
                <div className="text-center p-2 bg-secondary/50 rounded">
                  <div className="text-lg font-bold text-yellow-600">
                    {filteredAppointments.filter(a => a.status === 'pending').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};