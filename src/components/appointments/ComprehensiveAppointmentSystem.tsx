import React, { useState, useMemo } from 'react';
import { Calendar, CalendarDays, Clock, Users, ChevronLeft, ChevronRight, Settings, Check, Eye, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EnhancedAppointmentCalendar } from './EnhancedAppointmentCalendar';
import { AppointmentManager } from './AppointmentManager';
import { AppointmentServiceManager } from './AppointmentServiceManager';
import { ProviderProfileSelector } from './ProviderProfileSelector';
import { ProviderManagement } from '@/components/admin/ProviderManagement';
import { ProviderAvailabilityManager } from '@/components/providers/ProviderAvailabilityManager';
import { ProviderSettings } from '@/components/providers/ProviderSettings';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isAfter, startOfDay, startOfWeek, addWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useRealAppointments, 
  useCreateRealAppointment, 
  useUpdateRealAppointment, 
  useDeleteRealAppointment,
  type Appointment 
} from '@/hooks/useRealAppointments';
import { useCalendars } from '@/hooks/useCalendars';
import { useServiceProviders, useCurrentProvider } from '@/hooks/useServiceProviders';

export const ComprehensiveAppointmentSystem = () => {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [mainView, setMainView] = useState<'dashboard' | 'calendar' | 'management' | 'services' | 'providers' | 'admin' | 'availability' | 'settings'>('dashboard');
  const navigate = useNavigate();
  
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { isSuperAdmin, isWardrobeManager } = useUserRole();
  const hasAdminAccess = isSuperAdmin() || isWardrobeManager();
  
  const { data: appointments = [], isLoading, error } = useRealAppointments();
  const { data: calendars = [] } = useCalendars();
  const { data: providers = [] } = useServiceProviders();
  const { data: currentProvider } = useCurrentProvider();
  const createMutation = useCreateRealAppointment();
  const updateMutation = useUpdateRealAppointment();
  const deleteMutation = useDeleteRealAppointment();

  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const selectedProvider = providers.find(p => p.id === selectedProviderId);

  const visibleAppointments = selectedProvider
    ? appointments.filter(apt => selectedProvider.services_offered?.includes(apt.service))
    : appointments;

  // Stats calculations
  const stats = useMemo(() => {
    const todayAppts = visibleAppointments.filter(apt => isToday(apt.date));
    
    return {
      total: todayAppts.length,
      upcoming: todayAppts.filter(apt => apt.status === 'confirmed' || apt.status === 'pending').length,
      completed: todayAppts.filter(apt => apt.status === 'completed').length,
      cancelled: todayAppts.filter(apt => apt.status === 'cancelled').length
    };
  }, [visibleAppointments]);

  // Filter appointments by tab
  const todayAppointments = useMemo(() => {
    const todayAppts = visibleAppointments.filter(apt => isToday(apt.date));
    
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
  }, [visibleAppointments, activeTab]);

  // Future appointments
  const upcomingAppointments = useMemo(() => {
    const today = startOfDay(new Date());
    return visibleAppointments
      .filter(apt => isAfter(apt.date, today) && !isToday(apt.date))
      .filter(apt => apt.status === 'confirmed' || apt.status === 'pending')
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [visibleAppointments]);

  // Calendar
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const getAppointmentsForDate = (date: Date) => {
    return visibleAppointments.filter(apt => isSameDay(new Date(apt.date), date));
  };

  // Calendars with appointment counts for sidebar
  const calendarsWithCounts = useMemo(() => {
    return calendars.slice(0, 5).map(cal => ({
      ...cal,
      todayCount: visibleAppointments.filter(apt => 
        isToday(apt.date) && apt.calendarId === cal.id
      ).length
    }));
  }, [calendars, visibleAppointments]);

  const handleCheckIn = async (appointmentId: string) => {
    await updateMutation.mutateAsync({
      id: appointmentId,
      updates: { status: 'completed' }
    });
  };

  const handleAppointmentCreate = (newAppointment: Omit<Appointment, 'id'>) => {
    createMutation.mutate(newAppointment);
  };

  const handleAppointmentUpdate = (id: string, updates: Partial<Appointment>) => {
    updateMutation.mutate({ id, updates });
  };

  const handleAppointmentDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'OPEN_APPOINTMENT_EDIT') {
        setEditingAppointmentId(event.data.appointmentId);
        setMainView('management');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Error loading appointments: {error.message}</p>
        <button onClick={() => window.location.reload()} className="text-primary hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const userName = userProfile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  // Render sub-views
  if (mainView !== 'dashboard') {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-[#1e3a5f] text-white px-4 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setMainView('dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold capitalize">{mainView}</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          {mainView === 'calendar' && (
            <EnhancedAppointmentCalendar appointments={visibleAppointments} onAppointmentSelect={setSelectedAppointment} />
          )}
          {mainView === 'management' && (
            <AppointmentManager
              appointments={visibleAppointments}
              onAppointmentCreate={handleAppointmentCreate}
              onAppointmentUpdate={handleAppointmentUpdate}
              onAppointmentDelete={handleAppointmentDelete}
              editingAppointmentId={editingAppointmentId}
              onEditingAppointmentIdChange={setEditingAppointmentId}
            />
          )}
          {mainView === 'services' && <AppointmentServiceManager />}
          {mainView === 'availability' && currentProvider && <ProviderAvailabilityManager provider={currentProvider} />}
          {mainView === 'settings' && currentProvider && <ProviderSettings provider={currentProvider} />}
          {mainView === 'providers' && hasAdminAccess && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map(provider => (
                <Card key={provider.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-4">
                      {provider.profile_image_url ? (
                        <img src={provider.profile_image_url} alt={provider.provider_name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium">{provider.title} {provider.provider_name}</h3>
                        <p className="text-sm text-muted-foreground">{provider.department}</p>
                      </div>
                    </div>
                    <p className="text-sm"><span className="font-medium">Email:</span> {provider.email}</p>
                    <p className={`text-xs mt-2 px-2 py-1 rounded-full inline-block ${provider.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {provider.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {mainView === 'admin' && hasAdminAccess && <ProviderManagement />}
        </div>
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
              <h1 className="text-2xl md:text-3xl font-bold">Welcome, {userName}!</h1>
              <p className="text-blue-200 text-sm md:text-base">Here's your schedule for today.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button className="bg-white/20 hover:bg-white/30 text-white border-0" onClick={() => setMainView('calendar')}>
                <CalendarDays className="h-4 w-4 mr-2" />
                Appointments
              </Button>
              <Avatar className="h-10 w-10 border-2 border-white/30">
                <AvatarImage src={userProfile?.avatar_url || undefined} />
                <AvatarFallback className="bg-blue-700 text-white">{userName.charAt(0)}</AvatarFallback>
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
          {/* Left Sidebar */}
          <div className="hidden lg:block lg:col-span-3 space-y-4">
            {/* Mini Calendar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm">{format(currentMonth, 'MMMM yyyy')}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-xs text-muted-foreground font-medium p-1">{day}</div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {paddingDays.map((_, i) => <div key={`pad-${i}`} className="p-1" />)}
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

            {/* Calendars List */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Calendars</h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  {calendarsWithCounts.length > 0 ? calendarsWithCounts.map(cal => (
                    <div key={cal.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color || '#3b82f6' }} />
                        <span className="truncate">{cal.name}</span>
                      </div>
                      <span className="text-muted-foreground">{cal.todayCount > 0 ? format(new Date(), 'HH:mm') : ''}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">No calendars</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
                <Button variant="outline" className="w-full justify-start text-sm" onClick={() => setMainView('calendar')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Full Calendar
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm" onClick={() => setMainView('management')}>
                  <Users className="h-4 w-4 mr-2" />
                  Manage Appointments
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm" onClick={() => setMainView('services')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Services
                </Button>
                {hasAdminAccess && (
                  <Button variant="outline" className="w-full justify-start text-sm" onClick={() => setMainView('admin')}>
                    <Users className="h-4 w-4 mr-2" />
                    Provider Admin
                  </Button>
                )}
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMainView('management')}>
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

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
                        todayAppointments.sort((a, b) => a.time.localeCompare(b.time)).map(apt => (
                          <div key={apt.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
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
                                <Button size="sm" className="bg-[#1e88e5] hover:bg-[#1976d2] text-white" onClick={() => handleCheckIn(apt.id)} disabled={updateMutation.isPending}>
                                  <Check className="h-4 w-4 mr-1" />
                                  Check In
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="text-[#1e88e5] border-[#1e88e5]">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedAppointment(apt); }}>
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

            {/* Upcoming Appointments */}
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMainView('calendar')}>
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
                      <div key={apt.id} className="flex items-center justify-between py-2 border-b last:border-0">
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
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedAppointment(apt)}>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mobile Quick Actions */}
            <div className="lg:hidden grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => setMainView('calendar')}>
                <Calendar className="h-6 w-6 mb-2" />
                <span className="text-xs">Full Calendar</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => setMainView('management')}>
                <Users className="h-6 w-6 mb-2" />
                <span className="text-xs">Manage</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => setMainView('services')}>
                <Settings className="h-6 w-6 mb-2" />
                <span className="text-xs">Services</span>
              </Button>
              {hasAdminAccess && (
                <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => setMainView('admin')}>
                  <Users className="h-6 w-6 mb-2" />
                  <span className="text-xs">Admin</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Detail Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{selectedAppointment.clientName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service</p>
                  <p className="font-medium">{selectedAppointment.service}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(selectedAppointment.date, 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">{selectedAppointment.time}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{selectedAppointment.duration} min</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className={cn("font-medium capitalize", 
                    selectedAppointment.status === 'completed' && "text-green-600",
                    selectedAppointment.status === 'cancelled' && "text-red-600",
                    selectedAppointment.status === 'pending' && "text-yellow-600"
                  )}>{selectedAppointment.status}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{selectedAppointment.clientEmail}</p>
              </div>
              {selectedAppointment.clientPhone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedAppointment.clientPhone}</p>
                </div>
              )}
              {selectedAppointment.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm bg-muted p-2 rounded">{selectedAppointment.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                {(selectedAppointment.status === 'pending' || selectedAppointment.status === 'confirmed') && (
                  <Button className="flex-1 bg-[#1e88e5] hover:bg-[#1976d2]" onClick={() => { handleCheckIn(selectedAppointment.id); setSelectedAppointment(null); }}>
                    <Check className="h-4 w-4 mr-2" />
                    Check In
                  </Button>
                )}
                <Button variant="outline" className="flex-1" onClick={() => { setEditingAppointmentId(selectedAppointment.id); setMainView('management'); setSelectedAppointment(null); }}>
                  Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
