import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  QrCode, 
  Users, 
  Plus, 
  Play, 
  Square, 
  Calendar, 
  Clock,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useAttendanceSessions, useAttendanceRecords, AttendanceSession } from '@/hooks/useAttendanceSessions';
import { AttendanceQRDisplay } from './AttendanceQRDisplay';
import { AttendanceLiveRoster } from './AttendanceLiveRoster';
import { format } from 'date-fns';

interface AttendanceConsoleProps {
  courseId: string;
}

export const AttendanceConsole: React.FC<AttendanceConsoleProps> = ({ courseId }) => {
  const { sessions, loading, createSession, updateSessionStatus, generateQRToken, fetchSessions } = useAttendanceSessions(courseId);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    mode: 'qr' as 'qr' | 'manual' | 'hybrid',
    roster_scope: 'enrolled_students' as 'enrolled_students' | 'tour_roster' | 'custom_group',
    allow_late_checkin: true,
    late_threshold_minutes: 15,
    requires_grading: false,
  });

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const handleCreateSession = async () => {
    const now = new Date();
    const closesAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    
    await createSession({
      title: newSession.title || `Attendance - ${format(now, 'MMM d, yyyy h:mm a')}`,
      opens_at: now.toISOString(),
      closes_at: closesAt.toISOString(),
      status: 'scheduled',
      mode: newSession.mode,
      roster_scope: newSession.roster_scope,
      allow_late_checkin: newSession.allow_late_checkin,
      late_threshold_minutes: newSession.late_threshold_minutes,
      requires_grading: newSession.requires_grading,
    });
    
    setCreateDialogOpen(false);
    setNewSession({
      title: '',
      mode: 'qr',
      roster_scope: 'enrolled_students',
      allow_late_checkin: true,
      late_threshold_minutes: 15,
      requires_grading: false,
    });
  };

  const handleOpenSession = async (sessionId: string) => {
    await updateSessionStatus(sessionId, 'open');
    setSelectedSessionId(sessionId);
  };

  const handleCloseSession = async (sessionId: string) => {
    await updateSessionStatus(sessionId, 'closed');
  };

  const getStatusBadge = (status: AttendanceSession['status']) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-500">Open</Badge>;
      case 'closed':
        return <Badge variant="secondary">Closed</Badge>;
      case 'scheduled':
        return <Badge variant="outline">Scheduled</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-6 w-6 text-primary" />
            Attendance Console
          </h2>
          <p className="text-muted-foreground">Manage attendance sessions with QR check-in</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSessions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Attendance Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Session Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Class Meeting - Week 3"
                    value={newSession.title}
                    onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Check-in Mode</Label>
                  <Select
                    value={newSession.mode}
                    onValueChange={(value: 'qr' | 'manual' | 'hybrid') => 
                      setNewSession({ ...newSession, mode: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qr">QR Code Only</SelectItem>
                      <SelectItem value="manual">Manual Only</SelectItem>
                      <SelectItem value="hybrid">Hybrid (QR + Manual)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Roster Scope</Label>
                  <Select
                    value={newSession.roster_scope}
                    onValueChange={(value: 'enrolled_students' | 'tour_roster' | 'custom_group') => 
                      setNewSession({ ...newSession, roster_scope: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enrolled_students">Enrolled Students</SelectItem>
                      <SelectItem value="tour_roster">Tour Roster</SelectItem>
                      <SelectItem value="custom_group">Custom Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="allow_late">Allow Late Check-in</Label>
                  <Switch
                    id="allow_late"
                    checked={newSession.allow_late_checkin}
                    onCheckedChange={(checked) => 
                      setNewSession({ ...newSession, allow_late_checkin: checked })
                    }
                  />
                </div>

                {newSession.allow_late_checkin && (
                  <div className="space-y-2">
                    <Label>Late Threshold (minutes)</Label>
                    <Input
                      type="number"
                      value={newSession.late_threshold_minutes}
                      onChange={(e) => 
                        setNewSession({ ...newSession, late_threshold_minutes: parseInt(e.target.value) || 15 })
                      }
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requires_grading">Counts Toward Grade</Label>
                    <p className="text-xs text-muted-foreground">Records attendance in gradebook</p>
                  </div>
                  <Switch
                    id="requires_grading"
                    checked={newSession.requires_grading}
                    onCheckedChange={(checked) => 
                      setNewSession({ ...newSession, requires_grading: checked })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSession}>
                  Create Session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList>
          <TabsTrigger value="sessions" className="gap-2">
            <Calendar className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="live" className="gap-2" disabled={!selectedSession || selectedSession.status !== 'open'}>
            <Users className="h-4 w-4" />
            Live Roster
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Sessions List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Attendance Sessions</CardTitle>
                <CardDescription>Click on a session to manage it</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="divide-y">
                    {loading ? (
                      <div className="p-8 text-center text-muted-foreground">
                        Loading sessions...
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No attendance sessions yet</p>
                        <p className="text-sm">Create one to get started</p>
                      </div>
                    ) : (
                      sessions.map(session => (
                        <div
                          key={session.id}
                          className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                            selectedSessionId === session.id ? 'bg-primary/5 border-l-2 border-primary' : ''
                          }`}
                          onClick={() => setSelectedSessionId(session.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{session.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(session.opens_at), 'MMM d, yyyy h:mm a')}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {session.mode.toUpperCase()}
                                </Badge>
                                {session.requires_grading && (
                                  <Badge variant="outline" className="text-xs">
                                    Graded
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {getStatusBadge(session.status)}
                          </div>
                          
                          {/* Quick Actions */}
                          <div className="flex gap-2 mt-3">
                            {session.status === 'scheduled' && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenSession(session.id);
                                }}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Open
                              </Button>
                            )}
                            {session.status === 'open' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCloseSession(session.id);
                                }}
                              >
                                <Square className="h-3 w-3 mr-1" />
                                Close
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* QR Display or Session Details */}
            {selectedSession ? (
              selectedSession.status === 'open' && (selectedSession.mode === 'qr' || selectedSession.mode === 'hybrid') ? (
                <AttendanceQRDisplay
                  sessionId={selectedSession.id}
                  generateToken={generateQRToken}
                  isSessionOpen={selectedSession.status === 'open'}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{selectedSession.title}</CardTitle>
                    <CardDescription>
                      {format(new Date(selectedSession.opens_at), 'EEEE, MMMM d, yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Opens</p>
                        <p className="font-medium">
                          {format(new Date(selectedSession.opens_at), 'h:mm a')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Closes</p>
                        <p className="font-medium">
                          {format(new Date(selectedSession.closes_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mode</p>
                      <p className="font-medium capitalize">{selectedSession.mode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Roster Scope</p>
                      <p className="font-medium capitalize">
                        {selectedSession.roster_scope.replace('_', ' ')}
                      </p>
                    </div>
                    {selectedSession.requires_grading && (
                      <Badge>Counts toward grade</Badge>
                    )}
                  </CardContent>
                </Card>
              )
            ) : (
              <Card className="flex items-center justify-center h-[400px]">
                <div className="text-center text-muted-foreground">
                  <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a session to view details</p>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="live" className="mt-4">
          {selectedSession && selectedSession.status === 'open' && (
            <LiveRosterWrapper
              sessionId={selectedSession.id}
              courseId={courseId}
            />
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Analytics</CardTitle>
              <CardDescription>View attendance trends and statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Analytics dashboard coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Wrapper to use the records hook
const LiveRosterWrapper: React.FC<{ sessionId: string; courseId: string }> = ({ sessionId, courseId }) => {
  const { records, loading, markAttendance } = useAttendanceRecords(sessionId);
  
  return (
    <AttendanceLiveRoster
      sessionId={sessionId}
      courseId={courseId}
      records={records}
      markAttendance={markAttendance}
      loading={loading}
    />
  );
};
