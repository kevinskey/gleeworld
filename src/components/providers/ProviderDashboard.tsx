import React, { useState, useMemo } from 'react';
import { Calendar, CalendarDays, ChevronLeft, ChevronRight, Settings, Check, Eye, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCurrentProvider } from '@/hooks/useServiceProviders';
import { useRealAppointments, useUpdateRealAppointment } from '@/hooks/useRealAppointments';
import { format, isToday, isTomorrow, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isSameMonth, isAfter, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProviderAvailabilityManager } from './ProviderAvailabilityManager';
import { ProviderSettings } from './ProviderSettings';

export const ProviderDashboard = () => {
  const { data: provider, isLoading } = useCurrentProvider();
  const { data: appointments = [] } = useRealAppointments();
  const updateAppointment = useUpdateRealAppointment();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [showSettings, setShowSettings] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);

  // Stats calculations
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const todayAppts = appointments.filter(apt => isToday(apt.date));
    
    return {
      total: todayAppts.length,
      upcoming: todayAppts.filter(apt => apt.status === 'confirmed' || apt.status === 'pending').length,
      completed: todayAppts.filter(apt => apt.status === 'completed').length,
      cancelled: todayAppts.filter(apt => apt.status === 'cancelled').length
    };
  }, [appointments]);

  // Filter appointments by tab
  const todayAppointments = useMemo(() => {
    const todayAppts = appointments.filter(apt => isToday(apt.date));
    
    switch (activeTab) {
      case 'upcoming':
        return todayAppts.filter(apt => apt.status === 'confirmed' || apt.status === 'pending');
      case 'completed':
        return todayAppts.filter(apt => apt.status === 'completed');
      case 'cancelled':
        return todayAppts.filter(apt => apt.status === 'cancelled');
      default:
        return todayAppts;
    }
  }, [appointments, activeTab]);

  // Future appointments (after today)
  const upcomingAppointments = useMemo(() => {
    const today = startOfDay(new Date());
    return appointments
      .filter(apt => isAfter(apt.date, today) && !isToday(apt.date))
      .filter(apt => apt.status === 'confirmed' || apt.status === 'pending')
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [appointments]);

  // Calendar navigation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get first day of week offset
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => isSameDay(new Date(apt.date), date));
  };

  const handleCheckIn = async (appointmentId: string) => {
    await updateAppointment.mutateAsync({
      id: appointmentId,
      updates: { status: 'completed' }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-2">Provider Access Required</h2>
            <p className="text-muted-foreground">
              You need to be set up as a service provider to access this dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Blue Header */}
      <div className="bg-[#1e3a5f] text-white px-4 py-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Welcome, {provider.provider_name?.split(' ')[0] || 'Provider'}!
              </h1>
              <p className="text-blue-200 text-sm md:text-base">Here's your schedule for today.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={() => setShowAvailability(true)}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Appointments
              </Button>
              <Avatar className="h-10 w-10 border-2 border-white/30">
                <AvatarImage src={provider.profile_image_url || undefined} />
                <AvatarFallback className="bg-blue-700 text-white">
                  {provider.provider_name?.charAt(0) || 'P'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="bg-[#2c4a6e] text-white px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-4 gap-2 md:gap-4">
            <div className="bg-[#1e3a5f] rounded-lg p-3 md:p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold">{stats.total}</div>
              <div className="text-xs md:text-sm text-blue-200">Total Appointments</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 md:p-4 text-center border border-white/20">
              <div className="text-2xl md:text-3xl font-bold text-blue-300">{stats.upcoming}</div>
              <div className="text-xs md:text-sm text-blue-200">Upcoming</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 md:p-4 text-center border border-white/20">
              <div className="text-2xl md:text-3xl font-bold text-green-400">{stats.completed}</div>
              <div className="text-xs md:text-sm text-blue-200">Completed</div>
            </div>
            <div className="bg-red-500/80 rounded-lg p-3 md:p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold">{stats.cancelled}</div>
              <div className="text-xs md:text-sm">Canceled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Calendar (hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-3 space-y-4">
            {/* Mini Calendar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-xs text-muted-foreground font-medium p-1">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {paddingDays.map((_, i) => (
                    <div key={`pad-${i}`} className="p-1" />
                  ))}
                  {monthDays.map(date => {
                    const dayAppts = getAppointmentsForDate(date);
                    const isSelected = isSameDay(date, selectedDate);
                    const isCurrentDay = isToday(date);
                    
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                          "p-1 text-xs rounded-full relative transition-colors",
                          isSelected && "bg-primary text-primary-foreground",
                          isCurrentDay && !isSelected && "bg-blue-100 text-blue-700 font-bold",
                          !isSelected && !isCurrentDay && "hover:bg-muted"
                        )}
                      >
                        {format(date, 'd')}
                        {dayAppts.length > 0 && !isSelected && (
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-sm"
                  onClick={() => setShowAvailability(true)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Manage Availability
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-sm"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9 space-y-6">
            {/* Today's Appointments */}
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Today's Appointments</h2>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                  <TabsList className="w-full sm:w-auto mb-4">
                    <TabsTrigger value="upcoming" className="text-xs sm:text-sm">Upcoming</TabsTrigger>
                    <TabsTrigger value="completed" className="text-xs sm:text-sm">Completed</TabsTrigger>
                    <TabsTrigger value="cancelled" className="text-xs sm:text-sm">Canceled</TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab} className="mt-0">
                    <div className="space-y-3">
                      {todayAppointments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No {activeTab} appointments for today</p>
                        </div>
                      ) : (
                        todayAppointments
                          .sort((a, b) => a.time.localeCompare(b.time))
                          .map(apt => (
                            <div 
                              key={apt.id} 
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="text-sm font-semibold text-primary min-w-[70px]">
                                  {apt.time.slice(0, 5).replace(/^0/, '')} {parseInt(apt.time) >= 12 ? 'PM' : 'AM'}
                                </div>
                                <div>
                                  <div className="font-medium">{apt.clientName}</div>
                                  <div className="text-sm text-muted-foreground">{apt.service}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {apt.status === 'pending' || apt.status === 'confirmed' ? (
                                  <Button 
                                    size="sm" 
                                    className="bg-[#1e88e5] hover:bg-[#1976d2] text-white"
                                    onClick={() => handleCheckIn(apt.id)}
                                    disabled={updateAppointment.isPending}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Check In
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="outline" className="text-[#1e88e5] border-[#1e88e5]">
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Upcoming Appointments (Future) */}
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {upcomingAppointments.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No upcoming appointments scheduled</p>
                    </div>
                  ) : (
                    upcomingAppointments.map(apt => (
                      <div 
                        key={apt.id} 
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-semibold text-primary min-w-[70px]">
                            {apt.time.slice(0, 5).replace(/^0/, '')} {parseInt(apt.time) >= 12 ? 'PM' : 'AM'}
                          </div>
                          <div>
                            <span className="font-medium">{apt.clientName}</span>
                            <span className="text-muted-foreground ml-2">{apt.service}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{format(apt.date, 'MMM d')}</span>
                          <span>{apt.duration}:00</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Provider Settings</DialogTitle>
          </DialogHeader>
          <ProviderSettings provider={provider} />
        </DialogContent>
      </Dialog>

      {/* Availability Dialog */}
      <Dialog open={showAvailability} onOpenChange={setShowAvailability}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Availability</DialogTitle>
          </DialogHeader>
          <ProviderAvailabilityManager provider={provider} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
