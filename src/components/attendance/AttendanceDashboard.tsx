import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventAttendanceDialog } from '@/components/calendar/command-center/EventAttendanceDialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  ClipboardCheck,
  Calendar,
  Users,
  BarChart3,
  QrCode,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Shield,
  FileText,
  BookOpen,
  Download,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TakeAttendance } from './TakeAttendance';
import { AttendanceReports } from './AttendanceReports';
import { QRAttendanceGenerator } from './QRAttendanceGenerator';
import { ExcuseRequestApproval } from './ExcuseRequestApproval';
import { ExcuseRequestManager } from './ExcuseRequestManager';
import ClassScheduleManager from './ClassScheduleManager';
import ScheduleAnalytics from './ScheduleAnalytics';
import { CSVUploadDialog } from './CSVUploadDialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const CHART_COLORS = {
  present: 'hsl(142, 76%, 36%)',
  absent: 'hsl(0, 84%, 60%)',
  excused: 'hsl(38, 92%, 50%)',
  late: 'hsl(25, 95%, 53%)',
};

export const AttendanceDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [canTakeAttendance, setCanTakeAttendance] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [selectedAttendanceEvent, setSelectedAttendanceEvent] = useState<any | null>(null);
  const [gwProfile, setGwProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    myAttendance: 0,
    totalEvents: 0,
    averageAttendance: 0,
    totalMembers: 0,
    present: 0,
    absent: 0,
    excused: 0,
    late: 0,
    totalRecords: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const isAdmin = gwProfile?.is_admin || gwProfile?.is_super_admin || gwProfile?.is_exec_board || gwProfile?.role === 'admin' || gwProfile?.role === 'super-admin';

  const checkAttendancePermissions = useCallback(async () => {
    if (!user) {
      setCanTakeAttendance(false);
      return;
    }
    try {
      const { data: fetchedGwProfile, error } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, is_exec_board, exec_board_role, special_roles, role')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setGwProfile(fetchedGwProfile);

      const isSuperAdmin = fetchedGwProfile?.is_super_admin;
      const isExecBoard = fetchedGwProfile?.is_exec_board;
      const isSecretary = fetchedGwProfile?.exec_board_role?.toLowerCase() === 'secretary';
      const hasSecretaryRole = fetchedGwProfile?.special_roles?.includes('secretary');
      setCanTakeAttendance(isSuperAdmin || isExecBoard || isSecretary || hasSecretaryRole);
    } catch (error) {
      console.error('Error checking attendance permissions:', error);
      setCanTakeAttendance(false);
    }
  }, [user]);

  const loadDashboardStats = async () => {
    if (!user) return;
    try {
      setStatsLoading(true);

      const [legacyResult, gwResult] = await Promise.all([
        supabase.from('attendance').select('status, user_id, event_id').eq('user_id', user.id),
        supabase.from('gw_event_attendance').select('attendance_status, user_id, event_id').eq('user_id', user.id),
      ]);

      const legacyData = legacyResult.data || [];
      const gwData = gwResult.data || [];
      const combinedUserData = [
        ...legacyData.map(a => ({ status: a.status, user_id: a.user_id, event_id: a.event_id })),
        ...gwData.map(a => ({ status: a.attendance_status, user_id: a.user_id, event_id: a.event_id })),
      ];

      const myPresentCount = combinedUserData.filter(a => a.status === 'present').length;
      const totalUserEvents = combinedUserData.length;
      const myAttendanceRate = totalUserEvents > 0 ? Math.round((myPresentCount / totalUserEvents) * 100) : 0;

      if (isAdmin) {
        const [allLegacy, allGw] = await Promise.all([
          supabase.from('attendance').select('status, user_id, event_id'),
          supabase.from('gw_event_attendance').select('attendance_status, user_id, event_id'),
        ]);

        const allCombined = [
          ...(allLegacy.data || []).map(a => ({ status: a.status, user_id: a.user_id, event_id: a.event_id })),
          ...(allGw.data || []).map(a => ({ status: a.attendance_status, user_id: a.user_id, event_id: a.event_id })),
        ];

        const totalEvents = [...new Set(allCombined.map(a => a.event_id))].length;
        const totalMembers = [...new Set(allCombined.map(a => a.user_id))].length;
        const present = allCombined.filter(a => a.status === 'present').length;
        const absent = allCombined.filter(a => a.status === 'absent').length;
        const excused = allCombined.filter(a => a.status === 'excused').length;
        const late = allCombined.filter(a => a.status === 'late' || a.status === 'left_early').length;
        const averageAttendance = allCombined.length > 0 ? Math.round((present / allCombined.length) * 100) : 0;

        setStats({
          myAttendance: myAttendanceRate,
          totalEvents,
          averageAttendance,
          totalMembers,
          present,
          absent,
          excused,
          late,
          totalRecords: allCombined.length,
        });
      } else {
        setStats(prev => ({
          ...prev,
          myAttendance: myAttendanceRate,
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadUpcomingEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_events')
        .select('id, title, start_date')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(20);
      if (error) throw error;
      setUpcomingEvents(data || []);
    } catch (error) {
      console.error('Error loading upcoming events:', error);
    }
  };

  const loadRecentEvents = async () => {
    try {
      const now = new Date().toISOString();
      const [pastResult, futureResult] = await Promise.all([
        supabase
          .from('gw_events')
          .select('id, title, start_date, end_date, location')
          .lte('start_date', now)
          .order('start_date', { ascending: false })
          .limit(15),
        supabase
          .from('gw_events')
          .select('id, title, start_date, end_date, location')
          .gt('start_date', now)
          .order('start_date', { ascending: true })
          .limit(5),
      ]);
      const combined = [
        ...(futureResult.data || []).reverse(),
        ...(pastResult.data || []),
      ];
      setRecentEvents(combined);
    } catch (error) {
      console.error('Error loading recent events:', error);
    }
  };

  useEffect(() => {
    checkAttendancePermissions();
    if (user) {
      loadDashboardStats();
      loadUpcomingEvents();
      loadRecentEvents();
    }
  }, [checkAttendancePermissions, user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">Authentication Required</h3>
          <p className="text-muted-foreground">Please sign in to access attendance features.</p>
        </div>
      </div>
    );
  }

  const donutData = [
    { name: 'Present', value: stats.present, color: CHART_COLORS.present },
    { name: 'Absent', value: stats.absent, color: CHART_COLORS.absent },
    { name: 'Excused', value: stats.excused, color: CHART_COLORS.excused },
    { name: 'Late', value: stats.late, color: CHART_COLORS.late },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
      {/* ── Hero Header ── */}
      <div
        className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(208, 100%, 20%) 0%, hsl(219, 78%, 31%) 50%, hsl(203, 85%, 40%) 100%)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-white tracking-wide">
              Attendance Command Center
            </h1>
            <p className="text-white/80 mt-1 text-sm sm:text-base">
              {isAdmin ? 'Track, manage, and analyze attendance across the Glee Club' : 'Your attendance overview and check-in tools'}
            </p>
          </div>
          {isAdmin && !statsLoading && (
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white font-cinzel">{stats.averageAttendance}%</div>
                <div className="text-white/70 text-xs uppercase tracking-wider">Avg Rate</div>
              </div>
              <div className="h-10 w-px bg-white/30" />
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white font-cinzel">{stats.totalMembers}</div>
                <div className="text-white/70 text-xs uppercase tracking-wider">Members</div>
              </div>
              <div className="h-10 w-px bg-white/30" />
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white font-cinzel">{stats.totalEvents}</div>
                <div className="text-white/70 text-xs uppercase tracking-wider">Events</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabbed Navigation ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="w-full justify-start bg-card border border-border rounded-xl p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-sm">
            <BarChart3 className="h-4 w-4" /> Overview
          </TabsTrigger>
          {canTakeAttendance && (
            <TabsTrigger value="check-in" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-sm">
              <QrCode className="h-4 w-4" /> Check-In
            </TabsTrigger>
          )}
          {canTakeAttendance && (
            <TabsTrigger value="manual" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-sm">
              <ClipboardCheck className="h-4 w-4" /> Manual
            </TabsTrigger>
          )}
          <TabsTrigger value="schedule" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-sm">
            <Calendar className="h-4 w-4" /> Schedule
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="reports" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-sm">
              <FileText className="h-4 w-4" /> Reports
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="excuses" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-sm">
              <AlertTriangle className="h-4 w-4" /> Excuses
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          {isAdmin && stats.totalRecords > 0 ? (
            <>
              {/* Stats Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard icon={CheckCircle} label="Present" value={stats.present} color="text-success" bgColor="bg-success-muted" />
                <StatCard icon={XCircle} label="Absent" value={stats.absent} color="text-destructive" bgColor="bg-destructive/10" />
                <StatCard icon={AlertTriangle} label="Excused" value={stats.excused} color="text-warning" bgColor="bg-warning-muted" />
                <StatCard icon={Clock} label="Late" value={stats.late} color="text-orange-600" bgColor="bg-orange-50" />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Donut Chart */}
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Status Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <div className="w-40 h-40 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              paddingAngle={3}
                              dataKey="value"
                              strokeWidth={0}
                            >
                              {donutData.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3 flex-1">
                        {donutData.map((entry) => (
                          <div key={entry.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="text-sm font-medium" style={{ color: 'hsl(222, 47%, 11%)' }}>{entry.name}</span>
                            </div>
                            <span className="text-sm font-semibold" style={{ color: 'hsl(222, 47%, 11%)' }}>{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Attendance Rate Card */}
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Attendance Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <div className="relative w-36 h-36">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                        <circle
                          cx="50" cy="50" r="42" fill="none"
                          stroke="hsl(208, 100%, 20%)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${(stats.averageAttendance / 100) * 264} 264`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold font-cinzel" style={{ color: 'hsl(222, 47%, 11%)' }}>{stats.averageAttendance}%</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Overall</span>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        {stats.present} present out of {stats.totalRecords} total records
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Attendance Data Yet</h3>
                <p className="text-muted-foreground text-sm">Start recording attendance to see stats and visualizations here.</p>
              </CardContent>
            </Card>
          )}

          {/* ── Event Attendance Viewer ── */}
          {isAdmin && recentEvents.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  Event Attendance Viewer
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {recentEvents.map((evt) => {
                    const evtDate = new Date(evt.start_date);
                    const isPast = evtDate < new Date();
                    return (
                      <div key={evt.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'hsl(222, 47%, 11%)' }}>
                            {evt.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {evtDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {evt.location && (
                              <>
                                <span>·</span>
                                <span className="truncate">{evt.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isPast ? "default" : "outline"}
                          className="flex-shrink-0 gap-1.5 text-xs"
                          style={isPast ? { backgroundColor: '#003366' } : {}}
                          onClick={() => setSelectedAttendanceEvent(evt)}
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── QR Check-In Tab ── */}
        {canTakeAttendance && (
          <TabsContent value="check-in" className="mt-0">
            <Card className="border-border overflow-hidden">
              <CardHeader
                className="border-b border-border"
                style={{ background: 'linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(142, 60%, 28%) 100%)' }}
              >
                <CardTitle className="flex items-center gap-2 text-white">
                  <QrCode className="h-5 w-5" />
                  QR Attendance Generator
                  <Badge className="ml-2 bg-white/20 text-white border-white/30 hover:bg-white/30">
                    {isAdmin ? 'Admin' : 'Secretary'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <QRAttendanceGenerator />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Manual Attendance Tab ── */}
        {canTakeAttendance && (
          <TabsContent value="manual" className="mt-0 space-y-4">
            <Card className="border-border overflow-hidden">
              <CardHeader className="border-b border-border bg-primary">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-primary-foreground">
                    <ClipboardCheck className="h-5 w-5" />
                    Manual Attendance
                    <Badge className="ml-2 bg-white/20 text-primary-foreground border-white/30 hover:bg-white/30">
                      {isAdmin ? 'Admin' : 'Secretary'}
                    </Badge>
                  </CardTitle>
                  <CSVUploadDialog
                    events={upcomingEvents}
                    onUploadComplete={() => {
                      loadDashboardStats();
                      loadUpcomingEvents();
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <TakeAttendance />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Schedule Tab ── */}
        <TabsContent value="schedule" className="mt-0">
          <Card className="border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Class Schedule Manager
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <ClassScheduleManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reports Tab ── */}
        {isAdmin && (
          <TabsContent value="reports" className="mt-0 space-y-4">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Attendance Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <AttendanceReports />
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 sm:p-6">
                <ScheduleAnalytics />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Excuses Tab ── */}
        {isAdmin && (
          <TabsContent value="excuses" className="mt-0">
            <ExcuseRequestApproval />
          </TabsContent>
        )}
        {canTakeAttendance && !isAdmin && (
          <TabsContent value="excuses" className="mt-0">
            <ExcuseRequestManager />
          </TabsContent>
        )}
      </Tabs>

      {/* Event Attendance Dialog */}
      <EventAttendanceDialog
        event={selectedAttendanceEvent}
        open={!!selectedAttendanceEvent}
        onOpenChange={(open) => { if (!open) setSelectedAttendanceEvent(null); }}
      />
    </div>
  );
};

/* ── Stat Card ── */
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

const StatCard = ({ icon: Icon, label, value, color, bgColor }: StatCardProps) => (
  <Card className="border-border hover:shadow-md transition-shadow">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${bgColor}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <div className="text-2xl font-bold font-cinzel" style={{ color: 'hsl(222, 47%, 11%)' }}>{value}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      </div>
    </CardContent>
  </Card>
);
