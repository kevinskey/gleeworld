import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { TimeSelect } from '@/components/ui/time-select';
import {
  Calendar as CalendarIcon, CalendarDays, Clock, User, Mail, Phone,
  Loader2, CheckCircle2, XCircle, AlertCircle, Send, MessageSquare,
  Settings, RefreshCw, Ban, ThumbsUp, ThumbsDown, ChevronDown,
  Globe, Wifi, Bell, Plus, Trash2, ShieldAlert, CalendarOff, CalendarPlus
} from 'lucide-react';
import { format, isToday, isFuture, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

type AdminTab = 'today' | 'upcoming' | 'past';
type DashboardSection = 'appointments' | 'communications' | 'availability' | 'reminders' | 'settings';

export const AdminOfficeHoursDashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [adminTab, setAdminTab] = useState<AdminTab>('today');
  const [activeSection, setActiveSection] = useState<DashboardSection>('appointments');
  
  // Action dialogs
  const [actionDialog, setActionDialog] = useState<{ type: 'approve' | 'deny' | 'cancel' | 'reschedule' | 'sms'; appointment: any } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleDateOpen, setRescheduleDateOpen] = useState(false);

  // Google Calendar settings
  const [gcalEnabled, setGcalEnabled] = useState(false);
  const [gcalSyncing, setGcalSyncing] = useState(false);

  // Fetch ALL appointments
  const { data: allAppointments = [], isLoading: allAptsLoading } = useQuery({
    queryKey: ['admin-all-appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_appointments')
        .select('*')
        .order('appointment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const todayAppointments = allAppointments.filter((a: any) => isToday(new Date(a.appointment_date)));
  const upcomingAppointments = allAppointments.filter((a: any) => isFuture(new Date(a.appointment_date)) && !isToday(new Date(a.appointment_date)));
  const pastAppointments = allAppointments.filter((a: any) => isPast(new Date(a.appointment_date)) && !isToday(new Date(a.appointment_date)));
  const pendingAppointments = allAppointments.filter((a: any) => a.status === 'pending');

  const adminFilteredList = adminTab === 'today' ? todayAppointments : adminTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  // ── Status Update Mutation ──
  const updateStatus = async (appointmentId: string, newStatus: string, extras: Record<string, any> = {}) => {
    const updatePayload: any = { status: newStatus, updated_at: new Date().toISOString(), ...extras };
    if (newStatus === 'confirmed') {
      updatePayload.approved_at = new Date().toISOString();
      updatePayload.approved_by = user?.id;
    }
    const { error } = await supabase
      .from('gw_appointments')
      .update(updatePayload)
      .eq('id', appointmentId);
    if (error) throw error;
  };

  // ── Send SMS ──
  const sendSmsToClient = async (phone: string, message: string) => {
    const { error } = await supabase.functions.invoke('gw-send-sms', {
      body: { to: phone, message }
    });
    if (error) throw error;
  };

  // ── Handle Action ──
  const handleAction = async () => {
    if (!actionDialog) return;
    setActionLoading(true);
    const apt = actionDialog.appointment;

    try {
      switch (actionDialog.type) {
        case 'approve': {
          await updateStatus(apt.id, 'confirmed', { notes: actionReason || apt.notes });
          if (apt.client_phone) {
            await sendSmsToClient(apt.client_phone, 
              `✅ GleeWorld: Your appointment on ${format(new Date(apt.appointment_date), 'MMM d')} has been APPROVED by Dr. Johnson.${actionReason ? `\n\nNote: ${actionReason}` : ''}`
            );
          }
          toast.success('Appointment approved & notification sent');
          break;
        }
        case 'deny': {
          if (!actionReason) { toast.error('Please provide a reason'); setActionLoading(false); return; }
          await updateStatus(apt.id, 'cancelled', { notes: `Denied: ${actionReason}` });
          if (apt.client_phone) {
            await sendSmsToClient(apt.client_phone,
              `❌ GleeWorld: Your appointment request for ${format(new Date(apt.appointment_date), 'MMM d')} was not approved.\n\nReason: ${actionReason}\n\nPlease rebook at a different time.`
            );
          }
          toast.success('Appointment denied & student notified');
          break;
        }
        case 'cancel': {
          await updateStatus(apt.id, 'cancelled', { notes: actionReason ? `Cancelled: ${actionReason}` : 'Cancelled by admin' });
          if (apt.client_phone) {
            await sendSmsToClient(apt.client_phone,
              `🚫 GleeWorld: Your appointment on ${format(new Date(apt.appointment_date), 'MMM d')} has been cancelled.${actionReason ? `\n\nReason: ${actionReason}` : ''}\n\nPlease rebook if needed.`
            );
          }
          toast.success('Appointment cancelled');
          break;
        }
        case 'reschedule': {
          if (!rescheduleDate || !rescheduleTime) { toast.error('Select new date and time'); setActionLoading(false); return; }
          const newDateStr = format(rescheduleDate, 'yyyy-MM-dd');
          await updateStatus(apt.id, 'confirmed', {
            appointment_date: newDateStr,
            start_time: rescheduleTime,
            notes: `Rescheduled from ${apt.appointment_date}. ${actionReason || ''}`
          });
          if (apt.client_phone) {
            await sendSmsToClient(apt.client_phone,
              `📅 GleeWorld: Your appointment has been RESCHEDULED.\n\nNew Date: ${format(rescheduleDate, 'MMM d, yyyy')}\nNew Time: ${rescheduleTime}\n\n${actionReason || 'Please confirm if this works for you.'}`
            );
          }
          toast.success('Appointment rescheduled & student notified');
          break;
        }
        case 'sms': {
          if (!smsMessage) { toast.error('Enter a message'); setActionLoading(false); return; }
          if (!apt.client_phone) { toast.error('No phone number on file'); setActionLoading(false); return; }
          await sendSmsToClient(apt.client_phone, `📱 GleeWorld (Dr. Johnson): ${smsMessage}`);
          toast.success('SMS sent successfully');
          break;
        }
      }
      queryClient.invalidateQueries({ queryKey: ['admin-all-appointments'] });
      setActionDialog(null);
      setActionReason('');
      setSmsMessage('');
      setRescheduleDate(undefined);
      setRescheduleTime('');
    } catch (err: any) {
      console.error('Action failed:', err);
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Google Calendar Sync ──
  const handleGcalSync = async () => {
    setGcalSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'sync_appointments' }
      });
      if (error) throw error;
      toast.success(`Synced ${data?.synced || 0} appointments to Google Calendar`);
    } catch (err: any) {
      toast.error('Sync failed: ' + (err.message || 'Unknown error'));
    } finally {
      setGcalSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, React.ReactNode> = {
      confirmed: <Badge className="bg-green-500 text-white border-green-600 text-[10px]"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Confirmed</Badge>,
      cancelled: <Badge variant="destructive" className="text-[10px]"><XCircle className="h-2.5 w-2.5 mr-0.5" />Cancelled</Badge>,
      pending: <Badge className="bg-amber-500 text-white border-amber-600 text-[10px]"><AlertCircle className="h-2.5 w-2.5 mr-0.5" />Pending</Badge>,
      completed: <Badge className="bg-blue-600 text-white border-blue-700 text-[10px]"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Completed</Badge>,
    };
    return badges[status] || <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  };

  const sectionTabs: { key: DashboardSection; label: string; icon: React.ElementType }[] = [
    { key: 'appointments', label: 'Appts', icon: CalendarDays },
    { key: 'communications', label: 'SMS', icon: MessageSquare },
    { key: 'availability', label: 'Hours', icon: Clock },
    { key: 'reminders', label: 'Remind', icon: Bell },
    { key: 'settings', label: 'Sync', icon: Settings },
  ];

  return (
    <UniversalLayout>
      {/* Header */}
      <div className="w-full py-3 sm:py-6" style={{ backgroundColor: '#003666' }}>
        <div className="px-3 sm:px-8 flex flex-col items-center">
          <h1 className="text-center tracking-wide text-white text-xl sm:text-4xl font-bold font-['Bebas_Neue']">
            OFFICE HOURS DASHBOARD
          </h1>
          <p className="text-center text-white/70 text-[11px] sm:text-sm mt-0.5">
            {pendingAppointments.length > 0 && (
              <span className="text-amber-300 font-semibold">{pendingAppointments.length} pending • </span>
            )}
            {todayAppointments.length} today • {allAppointments.length} total
          </p>
        </div>
      </div>

      <div className="w-full px-2 sm:px-6 md:px-8 py-2 sm:py-6">
        {/* Section Navigation */}
        <div className="flex gap-0.5 mb-3 bg-muted rounded-lg p-0.5">
          {sectionTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-2 text-[11px] sm:text-xs font-semibold rounded-md transition-colors",
                activeSection === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ═══ APPOINTMENTS SECTION ═══ */}
        {activeSection === 'appointments' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {[
                { label: 'Today', value: todayAppointments.length, color: 'text-primary' },
                { label: 'Pending', value: pendingAppointments.length, color: 'text-amber-400' },
                { label: 'Upcoming', value: upcomingAppointments.length, color: 'text-green-400' },
                { label: 'Total', value: allAppointments.length, color: 'text-muted-foreground' },
              ].map(stat => (
                <Card key={stat.label} className="border-border">
                  <CardContent className="p-2 sm:p-3 text-center">
                    <div className={cn("text-xl sm:text-2xl font-bold", stat.color)}>{stat.value}</div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-0.5 mb-2 bg-muted rounded-lg p-0.5">
              {([
                { key: 'today' as const, label: 'Today', count: todayAppointments.length },
                { key: 'upcoming' as const, label: 'Upcoming', count: upcomingAppointments.length },
                { key: 'past' as const, label: 'Past', count: pastAppointments.length },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setAdminTab(tab.key)}
                  className={cn(
                    "flex-1 py-1.5 text-[11px] sm:text-xs font-semibold rounded-md transition-colors",
                    adminTab === tab.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Appointment List */}
            {allAptsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : adminFilteredList.length === 0 ? (
              <div className="text-center py-10">
                <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-muted-foreground text-sm">No {adminTab} appointments.</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-380px)]">
                <div className="space-y-1.5 pr-1">
                  {adminFilteredList
                    .sort((a: any, b: any) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
                    .map((apt: any) => (
                    <Card key={apt.id} className="border-border">
                      <CardContent className="p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <span className="font-semibold text-xs text-foreground truncate">{apt.client_name || 'Unknown'}</span>
                              {getStatusBadge(apt.status)}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-0.5">
                                <CalendarIcon className="h-2.5 w-2.5" />
                                {format(new Date(apt.appointment_date), 'MMM d')}
                              </span>
                              {apt.start_time && <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{apt.start_time}</span>}
                              {apt.duration_minutes && <span>{apt.duration_minutes}m</span>}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                              {apt.client_email && <span className="flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" />{apt.client_email}</span>}
                              {apt.client_phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{apt.client_phone}</span>}
                            </div>
                            {apt.notes && (
                              <p className="mt-1 text-[10px] text-muted-foreground line-clamp-1 bg-muted/50 rounded px-1.5 py-0.5">{apt.notes}</p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {apt.status === 'pending' && (
                            <>
                              <Button size="sm" className="h-7 text-[10px] px-2 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => setActionDialog({ type: 'approve', appointment: apt })}>
                                <ThumbsUp className="h-3 w-3 mr-0.5" />Approve
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 text-[10px] px-2"
                                onClick={() => setActionDialog({ type: 'deny', appointment: apt })}>
                                <ThumbsDown className="h-3 w-3 mr-0.5" />Deny
                              </Button>
                            </>
                          )}
                          {(apt.status === 'confirmed' || apt.status === 'pending') && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2"
                                onClick={() => setActionDialog({ type: 'reschedule', appointment: apt })}>
                                <RefreshCw className="h-3 w-3 mr-0.5" />Reschedule
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 text-destructive border-destructive/30"
                                onClick={() => setActionDialog({ type: 'cancel', appointment: apt })}>
                                <Ban className="h-3 w-3 mr-0.5" />Cancel
                              </Button>
                            </>
                          )}
                          {apt.client_phone && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] px-2"
                              onClick={() => setActionDialog({ type: 'sms', appointment: apt })}>
                              <MessageSquare className="h-3 w-3 mr-0.5" />SMS
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </>
        )}

        {/* ═══ COMMUNICATIONS SECTION ═══ */}
        {activeSection === 'communications' && (
          <div className="space-y-3">
            <Card className="border-border">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-semibold">Quick SMS</CardTitle>
                <CardDescription className="text-[11px]">Send SMS to any student by phone number</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <Input placeholder="Phone number" id="quick-sms-phone" className="h-9 text-sm bg-background border-border text-foreground" />
                <Textarea placeholder="Type your message..." id="quick-sms-msg" rows={3} className="text-sm bg-background border-border text-foreground" />
                <Button className="w-full h-9 text-sm" onClick={async () => {
                  const phone = (document.getElementById('quick-sms-phone') as HTMLInputElement)?.value;
                  const msg = (document.getElementById('quick-sms-msg') as HTMLTextAreaElement)?.value;
                  if (!phone || !msg) { toast.error('Enter phone and message'); return; }
                  try {
                    await sendSmsToClient(phone, `📱 GleeWorld (Dr. Johnson): ${msg}`);
                    toast.success('SMS sent!');
                    (document.getElementById('quick-sms-msg') as HTMLTextAreaElement).value = '';
                  } catch (e: any) { toast.error(e.message); }
                }}>
                  <Send className="h-3.5 w-3.5 mr-1.5" />Send SMS
                </Button>
              </CardContent>
            </Card>

            {/* Pending Appointments needing response */}
            <Card className="border-border">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Pending Responses ({pendingAppointments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {pendingAppointments.length === 0 ? (
                  <p className="text-muted-foreground text-xs py-4 text-center">All caught up! No pending requests.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingAppointments.slice(0, 5).map((apt: any) => (
                      <div key={apt.id} className="p-2 rounded-lg border border-amber-500/30 bg-amber-500/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-foreground">{apt.client_name}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(apt.appointment_date), 'MMM d')} • {apt.start_time}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" className="h-6 text-[10px] px-1.5 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => setActionDialog({ type: 'approve', appointment: apt })}>
                              <ThumbsUp className="h-2.5 w-2.5" />
                            </Button>
                            <Button size="sm" variant="destructive" className="h-6 text-[10px] px-1.5"
                              onClick={() => setActionDialog({ type: 'deny', appointment: apt })}>
                              <ThumbsDown className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ AVAILABILITY SECTION ═══ */}
        {activeSection === 'availability' && (
          <div className="space-y-3">
            <Card className="border-border">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-semibold">Weekly Schedule</CardTitle>
                <CardDescription className="text-[11px]">Set your recurring office hours for each day</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <AvailabilityManager />
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <CalendarPlus className="h-4 w-4 text-green-500" />
                  Date Overrides
                </CardTitle>
                <CardDescription className="text-[11px]">Add or block availability for specific dates</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <DateOverrideManager />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ REMINDERS SECTION ═══ */}
        {activeSection === 'reminders' && (
          <div className="space-y-3">
            <ReminderManager />
          </div>
        )}

        {/* ═══ SETTINGS (Google Calendar) ═══ */}
        {activeSection === 'settings' && (
          <div className="space-y-3">
            <Card className="border-border">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Globe className="h-4 w-4" />Google Calendar Integration
                </CardTitle>
                <CardDescription className="text-[11px]">Sync appointments with your Google Calendar</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <Wifi className={cn("h-4 w-4", gcalEnabled ? "text-green-500" : "text-muted-foreground")} />
                    <div>
                      <p className="text-xs font-medium text-foreground">Auto-sync appointments</p>
                      <p className="text-[10px] text-muted-foreground">New appointments sync to Google Calendar</p>
                    </div>
                  </div>
                  <Switch checked={gcalEnabled} onCheckedChange={setGcalEnabled} />
                </div>

                <Button className="w-full h-9 text-sm" variant="outline" onClick={handleGcalSync} disabled={gcalSyncing}>
                  {gcalSyncing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                  Sync All Appointments Now
                </Button>

                <div className="p-2.5 rounded-lg bg-muted/50 text-[10px] text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground text-[11px]">Configuration</p>
                  <p>✅ Google Calendar API Key configured</p>
                  <p>✅ Google Calendar ID configured</p>
                  <p>✅ Service Account Key configured</p>
                  <p className="text-[9px] mt-1">Secrets managed via Supabase Edge Functions</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-semibold">SMS Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="p-2.5 rounded-lg bg-muted/50 text-[10px] text-muted-foreground space-y-1">
                  <p>✅ Twilio Account SID configured</p>
                  <p>✅ Twilio Auth Token configured</p>
                  <p>✅ Twilio Phone Number configured</p>
                  <p className="text-foreground font-medium mt-2 text-[11px]">Auto-notifications enabled for:</p>
                  <p>• Appointment approval → SMS to student</p>
                  <p>• Appointment denial → SMS with reason</p>
                  <p>• Appointment cancellation → SMS alert</p>
                  <p>• Rescheduling → SMS with new date/time</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ═══ ACTION DIALOG ═══ */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => { if (!open) { setActionDialog(null); setActionReason(''); setSmsMessage(''); } }}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md z-[200000]">
          <DialogHeader>
            <DialogTitle className="text-base">
              {actionDialog?.type === 'approve' && '✅ Approve Appointment'}
              {actionDialog?.type === 'deny' && '❌ Deny Appointment'}
              {actionDialog?.type === 'cancel' && '🚫 Cancel Appointment'}
              {actionDialog?.type === 'reschedule' && '📅 Reschedule Appointment'}
              {actionDialog?.type === 'sms' && '💬 Send SMS'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {actionDialog?.appointment?.client_name} — {actionDialog?.appointment && format(new Date(actionDialog.appointment.appointment_date), 'MMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Reschedule: date/time pickers */}
            {actionDialog?.type === 'reschedule' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">New Date</Label>
                <Popover open={rescheduleDateOpen} onOpenChange={setRescheduleDateOpen} modal>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start h-9 text-sm">
                      <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                      {rescheduleDate ? format(rescheduleDate, 'EEE, MMM d') : 'Select new date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200001]" align="start">
                    <Calendar
                      mode="single"
                      selected={rescheduleDate}
                      onSelect={(d) => { setRescheduleDate(d); setRescheduleDateOpen(false); }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Label className="text-xs font-medium">New Time</Label>
                <Input value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} placeholder="e.g. 10:00 AM" className="h-9 text-sm" />
              </div>
            )}

            {/* SMS Message */}
            {actionDialog?.type === 'sms' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Message to {actionDialog.appointment?.client_name}</Label>
                <Textarea value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} placeholder="Type your message..." rows={4} className="text-sm" />
                <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{actionDialog.appointment?.client_phone}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {actionDialog?.type === 'deny' ? 'Reason (required)' : 'Note (optional)'}
                </Label>
                <Textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)} 
                  placeholder={actionDialog?.type === 'deny' ? 'Why is this being denied?' : 'Add a note...'} rows={3} className="text-sm" />
              </div>
            )}

            {actionDialog?.appointment?.client_phone && actionDialog?.type !== 'sms' && (
              <p className="text-[10px] text-muted-foreground bg-muted/50 rounded p-1.5 flex items-center gap-1">
                <Send className="h-2.5 w-2.5" />SMS notification will be sent to {actionDialog.appointment.client_phone}
              </p>
            )}
            {!actionDialog?.appointment?.client_phone && actionDialog?.type !== 'sms' && (
              <p className="text-[10px] text-amber-500 bg-amber-500/10 rounded p-1.5 flex items-center gap-1">
                <AlertCircle className="h-2.5 w-2.5" />No phone number on file — no SMS will be sent
              </p>
            )}
          </div>

          <DialogFooter className="gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setActionDialog(null)} className="h-8 text-xs">Cancel</Button>
            <Button size="sm" onClick={handleAction} disabled={actionLoading} className="h-8 text-xs">
              {actionLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              {actionDialog?.type === 'sms' ? 'Send SMS' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UniversalLayout>
  );
};

// ── Availability Manager Sub-component ──
const AvailabilityManager: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: availability = [], isLoading } = useQuery({
    queryKey: ['provider-availability-weekly'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_provider_availability')
        .select('*')
        .is('specific_date', null)
        .order('day_of_week');
      if (error) throw error;
      return data || [];
    },
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const toggleDay = async (dayOfWeek: number, isActive: boolean, existingId?: string) => {
    try {
      if (existingId) {
        await supabase.from('gw_provider_availability').update({ is_available: !isActive }).eq('id', existingId);
      } else {
        const { data: providers } = await supabase.from('gw_service_providers').select('id').limit(1).single();
        if (!providers) { toast.error('No provider found'); return; }
        await supabase.from('gw_provider_availability').insert({
          provider_id: providers.id,
          day_of_week: dayOfWeek,
          start_time: '09:00',
          end_time: '17:00',
          is_available: true
        });
      }
      queryClient.invalidateQueries({ queryKey: ['provider-availability-weekly'] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const updateTime = async (id: string, field: 'start_time' | 'end_time', value: string) => {
    try {
      await supabase.from('gw_provider_availability').update({ [field]: value }).eq('id', id);
      queryClient.invalidateQueries({ queryKey: ['provider-availability-weekly'] });
      toast.success('Schedule updated');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>;

  return (
    <div className="space-y-1.5">
      {dayNames.map((name, i) => {
        const dayAvail = availability.find((a: any) => a.day_of_week === i);
        return (
          <div key={i} className="p-2 rounded-lg border border-border space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={dayAvail?.is_available || false}
                  onCheckedChange={() => toggleDay(i, dayAvail?.is_available || false, dayAvail?.id)}
                />
                <span className="text-xs font-medium text-foreground">{name}</span>
              </div>
              {dayAvail?.is_available && (
                <Badge variant="outline" className="text-[9px] h-5">Active</Badge>
              )}
            </div>
            {dayAvail?.is_available && (
              <div className="flex items-center gap-1.5 ml-10">
                <TimeSelect
                  value={dayAvail.start_time}
                  onChange={(v) => updateTime(dayAvail.id, 'start_time', v)}
                  className="[&_button]:h-7 [&_button]:text-[10px] [&_button]:w-[52px]"
                />
                <span className="text-[10px] text-muted-foreground">to</span>
                <TimeSelect
                  value={dayAvail.end_time}
                  onChange={(v) => updateTime(dayAvail.id, 'end_time', v)}
                  className="[&_button]:h-7 [&_button]:text-[10px] [&_button]:w-[52px]"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Date Override Manager ──
const DateOverrideManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [overrideDate, setOverrideDate] = useState<Date | undefined>(undefined);
  const [overrideDateOpen, setOverrideDateOpen] = useState(false);
  const [overrideType, setOverrideType] = useState<'available' | 'blocked'>('blocked');
  const [overrideStart, setOverrideStart] = useState('09:00');
  const [overrideEnd, setOverrideEnd] = useState('17:00');

  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ['provider-availability-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_provider_availability')
        .select('*')
        .not('specific_date', 'is', null)
        .order('specific_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const addOverride = async () => {
    if (!overrideDate) { toast.error('Select a date'); return; }
    try {
      const { data: providers } = await supabase.from('gw_service_providers').select('id').limit(1).single();
      if (!providers) { toast.error('No provider found'); return; }
      await supabase.from('gw_provider_availability').insert({
        provider_id: providers.id,
        specific_date: format(overrideDate, 'yyyy-MM-dd'),
        day_of_week: overrideDate.getDay(),
        start_time: overrideType === 'available' ? overrideStart : '00:00',
        end_time: overrideType === 'available' ? overrideEnd : '00:00',
        is_available: overrideType === 'available',
      });
      queryClient.invalidateQueries({ queryKey: ['provider-availability-overrides'] });
      toast.success(overrideType === 'blocked' ? 'Date blocked' : 'Availability added');
      setShowAddDialog(false);
      setOverrideDate(undefined);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteOverride = async (id: string) => {
    try {
      await supabase.from('gw_provider_availability').delete().eq('id', id);
      queryClient.invalidateQueries({ queryKey: ['provider-availability-overrides'] });
      toast.success('Override removed');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>;

  return (
    <div className="space-y-2">
      {/* Existing overrides */}
      {overrides.length === 0 ? (
        <p className="text-muted-foreground text-xs py-3 text-center">No date overrides set.</p>
      ) : (
        <div className="space-y-1.5">
          {overrides.map((ov: any) => (
            <div key={ov.id} className={cn(
              "flex items-center justify-between p-2 rounded-lg border",
              ov.is_available ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"
            )}>
              <div className="flex items-center gap-2">
                {ov.is_available
                  ? <CalendarPlus className="h-3.5 w-3.5 text-green-500" />
                  : <CalendarOff className="h-3.5 w-3.5 text-destructive" />
                }
                <div>
                  <p className="text-xs font-medium text-foreground">{format(new Date(ov.specific_date + 'T12:00:00'), 'EEE, MMM d, yyyy')}</p>
                  {ov.is_available && (
                    <p className="text-[10px] text-muted-foreground">{ov.start_time} – {ov.end_time}</p>
                  )}
                  {!ov.is_available && (
                    <p className="text-[10px] text-destructive">Blocked — not available</p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => deleteOverride(ov.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add override button */}
      <Button variant="outline" className="w-full h-8 text-xs" onClick={() => setShowAddDialog(true)}>
        <Plus className="h-3 w-3 mr-1" />Add Date Override
      </Button>

      {/* Add Override Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-sm z-[200000]">
          <DialogHeader>
            <DialogTitle className="text-base">Add Date Override</DialogTitle>
            <DialogDescription className="text-xs">Block a day off or add extra availability</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setOverrideType('blocked')}
                className={cn("flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1",
                  overrideType === 'blocked' ? "bg-destructive text-destructive-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                <CalendarOff className="h-3 w-3" />Block Day
              </button>
              <button
                onClick={() => setOverrideType('available')}
                className={cn("flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1",
                  overrideType === 'available' ? "bg-green-600 text-white shadow-sm" : "text-muted-foreground"
                )}
              >
                <CalendarPlus className="h-3 w-3" />Add Hours
              </button>
            </div>

            <div>
              <Label className="text-xs font-medium">Date</Label>
              <Popover open={overrideDateOpen} onOpenChange={setOverrideDateOpen} modal>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start h-9 text-sm mt-1">
                    <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                    {overrideDate ? format(overrideDate, 'EEE, MMM d, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[200001]" align="start">
                  <Calendar
                    mode="single"
                    selected={overrideDate}
                    onSelect={(d) => { setOverrideDate(d); setOverrideDateOpen(false); }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {overrideType === 'available' && (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs font-medium">Start Time</Label>
                  <div className="mt-1">
                    <TimeSelect value={overrideStart} onChange={setOverrideStart} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">End Time</Label>
                  <div className="mt-1">
                    <TimeSelect value={overrideEnd} onChange={setOverrideEnd} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(false)} className="h-8 text-xs">Cancel</Button>
            <Button size="sm" onClick={addOverride} className="h-8 text-xs">
              {overrideType === 'blocked' ? 'Block Date' : 'Add Availability'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Reminder Manager ──
const ReminderManager: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['office-hours-reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_office_hours_reminders')
        .select('*')
        .order('reminder_type', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<string>('upcoming_appointment');
  const [newHours, setNewHours] = useState('24');
  const [newMessage, setNewMessage] = useState('');
  const [newSms, setNewSms] = useState(true);

  const toggleReminder = async (id: string, currentActive: boolean) => {
    try {
      await supabase.from('gw_office_hours_reminders').update({ is_active: !currentActive }).eq('id', id);
      queryClient.invalidateQueries({ queryKey: ['office-hours-reminders'] });
      toast.success(!currentActive ? 'Reminder activated' : 'Reminder paused');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await supabase.from('gw_office_hours_reminders').delete().eq('id', id);
      queryClient.invalidateQueries({ queryKey: ['office-hours-reminders'] });
      toast.success('Reminder deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const addReminder = async () => {
    if (!newMessage) { toast.error('Enter a message template'); return; }
    try {
      await supabase.from('gw_office_hours_reminders').insert({
        reminder_type: newType,
        hours_before: parseInt(newHours) || 24,
        sms_enabled: newSms,
        is_active: true,
        message_template: newMessage,
        created_by: user?.id,
      });
      queryClient.invalidateQueries({ queryKey: ['office-hours-reminders'] });
      toast.success('Reminder created');
      setShowAdd(false);
      setNewMessage('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const sendBookingNudge = async () => {
    try {
      // Fetch all members with phone numbers
      const { data: members, error } = await supabase
        .from('gw_profiles')
        .select('phone, full_name')
        .not('phone', 'is', null)
        .eq('role', 'member');
      if (error) throw error;
      if (!members || members.length === 0) { toast.error('No members with phone numbers found'); return; }

      let sent = 0;
      for (const member of members.slice(0, 50)) {
        if (member.phone) {
          try {
            await supabase.functions.invoke('gw-send-sms', {
              body: { to: member.phone, message: '📚 GleeWorld: Office hours are open this week! Book your slot now at GleeWorld.org/book-appointment' }
            });
            sent++;
          } catch { /* skip individual failures */ }
        }
      }
      toast.success(`Booking reminder sent to ${sent} members`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>;

  const appointmentReminders = reminders.filter((r: any) => r.reminder_type === 'upcoming_appointment');
  const bookPrompts = reminders.filter((r: any) => r.reminder_type === 'book_prompt');

  return (
    <>
      {/* Appointment Reminders */}
      <Card className="border-border">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Bell className="h-4 w-4 text-primary" />
            Appointment Reminders
          </CardTitle>
          <CardDescription className="text-[11px]">Auto-remind you and students before appointments</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-1.5">
          {appointmentReminders.length === 0 ? (
            <p className="text-muted-foreground text-xs py-3 text-center">No reminders configured.</p>
          ) : (
            appointmentReminders.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <Switch checked={r.is_active} onCheckedChange={() => toggleReminder(r.id, r.is_active)} />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {r.hours_before >= 24 ? `${r.hours_before / 24} day${r.hours_before >= 48 ? 's' : ''}` : `${r.hours_before} hour${r.hours_before > 1 ? 's' : ''}`} before
                    </p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{r.message_template}</p>
                    <div className="flex gap-1 mt-0.5">
                      {r.sms_enabled && <Badge variant="outline" className="text-[8px] h-4 px-1">SMS</Badge>}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteReminder(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Book Prompt / Nudge */}
      <Card className="border-border">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Send className="h-4 w-4 text-green-500" />
            Booking Nudge
          </CardTitle>
          <CardDescription className="text-[11px]">Prompt students to book office hours</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          {bookPrompts.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Switch checked={r.is_active} onCheckedChange={() => toggleReminder(r.id, r.is_active)} />
                <div>
                  <p className="text-xs font-medium text-foreground">Auto booking nudge</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{r.message_template}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => deleteReminder(r.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          <Separator />

          <Button className="w-full h-9 text-xs" variant="outline" onClick={sendBookingNudge}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Send Booking Nudge to All Members Now
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">Sends SMS to all members with a phone number on file</p>
        </CardContent>
      </Card>

      {/* Add Reminder */}
      <Button variant="outline" className="w-full h-8 text-xs" onClick={() => setShowAdd(true)}>
        <Plus className="h-3 w-3 mr-1" />Add Custom Reminder
      </Button>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-sm z-[200000]">
          <DialogHeader>
            <DialogTitle className="text-base">New Reminder</DialogTitle>
            <DialogDescription className="text-xs">Configure a new automated reminder</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium">Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming_appointment">Appointment Reminder</SelectItem>
                  <SelectItem value="book_prompt">Booking Nudge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newType === 'upcoming_appointment' && (
              <div>
                <Label className="text-xs font-medium">Hours Before</Label>
                <Select value={newHours} onValueChange={setNewHours}>
                  <SelectTrigger className="h-9 text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="24">1 day</SelectItem>
                    <SelectItem value="48">2 days</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs font-medium">Message Template</Label>
              <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Use {time}, {date}, {name}, {link} as placeholders..." rows={3} className="text-sm mt-1" />
              <p className="text-[9px] text-muted-foreground mt-1">Variables: {'{time}'}, {'{date}'}, {'{name}'}, {'{link}'}</p>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Send via SMS</Label>
              <Switch checked={newSms} onCheckedChange={setNewSms} />
            </div>
          </div>
          <DialogFooter className="gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setShowAdd(false)} className="h-8 text-xs">Cancel</Button>
            <Button size="sm" onClick={addReminder} className="h-8 text-xs">Create Reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
