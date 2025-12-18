import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Users, Package, Settings, Plus, Trash2, Calendar, Clock, 
  CheckCircle2, AlertCircle, MapPin, Video, UserPlus, ClipboardList
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Member {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface CrewMember {
  id: string;
  user_id: string;
  crew_type: 'merch' | 'setup';
  role?: string;
  notes?: string;
  member?: Member;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  crew_type: 'merch' | 'setup';
  assigned_to?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: Member;
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  crew_type: 'merch' | 'setup' | 'both';
  meeting_date: string;
  location?: string;
  is_virtual: boolean;
  meeting_link?: string;
}

export const CrewAssignmentsSection = () => {
  const [activeTab, setActiveTab] = useState('merch');
  const [members, setMembers] = useState<Member[]>([]);
  const [merchCrew, setMerchCrew] = useState<CrewMember[]>([]);
  const [setupCrew, setSetupCrew] = useState<CrewMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addMeetingOpen, setAddMeetingOpen] = useState(false);
  const [selectedCrewType, setSelectedCrewType] = useState<'merch' | 'setup'>('merch');
  
  // Form states
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium' as Task['priority']
  });
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    crew_type: 'both' as Meeting['crew_type'],
    meeting_date: '',
    location: '',
    is_virtual: false,
    meeting_link: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all members
      const { data: membersData } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, avatar_url')
        .eq('role', 'member')
        .order('full_name');

      setMembers(membersData || []);

      // Fetch crew assignments
      const { data: crewData } = await supabase
        .from('gw_tour_crew')
        .select('*');

      if (crewData) {
        const merchMembers = crewData.filter(c => c.crew_type === 'merch').map(c => ({
          ...c,
          crew_type: c.crew_type as 'merch' | 'setup',
          member: membersData?.find(m => m.user_id === c.user_id)
        }));
        const setupMembers = crewData.filter(c => c.crew_type === 'setup').map(c => ({
          ...c,
          crew_type: c.crew_type as 'merch' | 'setup',
          member: membersData?.find(m => m.user_id === c.user_id)
        }));
        setMerchCrew(merchMembers);
        setSetupCrew(setupMembers);
      }

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('gw_tour_crew_tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (tasksData) {
        setTasks(tasksData.map(t => ({
          ...t,
          crew_type: t.crew_type as 'merch' | 'setup',
          status: t.status as Task['status'],
          priority: t.priority as Task['priority'],
          assignee: membersData?.find(m => m.user_id === t.assigned_to)
        })));
      }

      // Fetch meetings
      const { data: meetingsData } = await supabase
        .from('gw_tour_crew_meetings')
        .select('*')
        .order('meeting_date', { ascending: true });

      setMeetings((meetingsData || []).map(m => ({
        ...m,
        crew_type: m.crew_type as Meeting['crew_type']
      })));
    } catch (error) {
      console.error('Error fetching crew data:', error);
      toast.error('Failed to load crew data');
    } finally {
      setLoading(false);
    }
  };

  const addCrewMember = async () => {
    if (!selectedMemberId) {
      toast.error('Please select a member');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('gw_tour_crew')
        .insert({
          user_id: selectedMemberId,
          crew_type: selectedCrewType,
          role: memberRole || null,
          assigned_by: user?.id
        });

      if (error) throw error;

      toast.success(`Member added to ${selectedCrewType} crew`);
      setAddMemberOpen(false);
      setSelectedMemberId('');
      setMemberRole('');
      fetchData();
    } catch (error: any) {
      console.error('Error adding crew member:', error);
      toast.error(error.message || 'Failed to add member');
    }
  };

  const removeCrewMember = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gw_tour_crew')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Member removed from crew');
      fetchData();
    } catch (error: any) {
      console.error('Error removing crew member:', error);
      toast.error('Failed to remove member');
    }
  };

  const createTask = async () => {
    if (!taskForm.title) {
      toast.error('Please enter a task title');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('gw_tour_crew_tasks')
        .insert({
          title: taskForm.title,
          description: taskForm.description || null,
          crew_type: selectedCrewType,
          assigned_to: taskForm.assigned_to || null,
          due_date: taskForm.due_date || null,
          priority: taskForm.priority,
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Task created');
      setAddTaskOpen(false);
      setTaskForm({ title: '', description: '', assigned_to: '', due_date: '', priority: 'medium' });
      fetchData();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error(error.message || 'Failed to create task');
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      const { error } = await supabase
        .from('gw_tour_crew_tasks')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;
      toast.success('Task updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('gw_tour_crew_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      toast.success('Task deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const createMeeting = async () => {
    if (!meetingForm.title || !meetingForm.meeting_date) {
      toast.error('Please enter title and date');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('gw_tour_crew_meetings')
        .insert({
          title: meetingForm.title,
          description: meetingForm.description || null,
          crew_type: meetingForm.crew_type,
          meeting_date: meetingForm.meeting_date,
          location: meetingForm.location || null,
          is_virtual: meetingForm.is_virtual,
          meeting_link: meetingForm.meeting_link || null,
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Meeting scheduled');
      setAddMeetingOpen(false);
      setMeetingForm({ title: '', description: '', crew_type: 'both', meeting_date: '', location: '', is_virtual: false, meeting_link: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      toast.error(error.message || 'Failed to schedule meeting');
    }
  };

  const deleteMeeting = async (meetingId: string) => {
    try {
      const { error } = await supabase
        .from('gw_tour_crew_meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;
      toast.success('Meeting deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete meeting');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-700 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-700 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      default: return 'bg-green-500/20 text-green-700 border-green-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-700';
      case 'in_progress': return 'bg-blue-500/20 text-blue-700';
      case 'cancelled': return 'bg-gray-500/20 text-gray-700';
      default: return 'bg-amber-500/20 text-amber-700';
    }
  };

  const currentCrew = activeTab === 'merch' ? merchCrew : setupCrew;
  const currentTasks = tasks.filter(t => t.crew_type === activeTab);
  const currentMeetings = meetings.filter(m => m.crew_type === activeTab || m.crew_type === 'both');
  const availableMembers = members.filter(m => 
    !currentCrew.some(c => c.user_id === m.user_id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Crew Type Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedCrewType(v as 'merch' | 'setup'); }}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="merch" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Merch Crew ({merchCrew.length})
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Setup Crew ({setupCrew.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="merch" className="space-y-6">
          <CrewContent />
        </TabsContent>
        <TabsContent value="setup" className="space-y-6">
          <CrewContent />
        </TabsContent>
      </Tabs>
    </div>
  );

  function CrewContent() {
    return (
      <>
        {/* Crew Members Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {activeTab === 'merch' ? 'Merch' : 'Setup'} Crew Members
            </CardTitle>
            <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Crew Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Member</Label>
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a member..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMembers.map(member => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.full_name || member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Role (optional)</Label>
                    <Input 
                      placeholder="e.g., Team Lead, Coordinator..."
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                    />
                  </div>
                  <Button onClick={addCrewMember} className="w-full">
                    Add to {activeTab === 'merch' ? 'Merch' : 'Setup'} Crew
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {currentCrew.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No crew members assigned yet</p>
                <p className="text-sm">Add members using the button above</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {currentCrew.map(crew => (
                  <div key={crew.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={crew.member?.avatar_url} />
                      <AvatarFallback>{getInitials(crew.member?.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{crew.member?.full_name || 'Unknown'}</p>
                      {crew.role && <p className="text-xs text-muted-foreground">{crew.role}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeCrewMember(crew.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Tasks
            </CardTitle>
            <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Task Title *</Label>
                    <Input 
                      placeholder="Enter task title..."
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      placeholder="Task details..."
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assign To</Label>
                    <Select value={taskForm.assigned_to} onValueChange={(v) => setTaskForm({ ...taskForm, assigned_to: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {currentCrew.map(c => (
                          <SelectItem key={c.user_id} value={c.user_id}>
                            {c.member?.full_name || 'Unknown'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input 
                        type="datetime-local"
                        value={taskForm.due_date}
                        onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={taskForm.priority} onValueChange={(v: Task['priority']) => setTaskForm({ ...taskForm, priority: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={createTask} className="w-full">Create Task</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {currentTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tasks yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{task.title}</span>
                        <Badge className={getPriorityColor(task.priority)} variant="outline">
                          {task.priority}
                        </Badge>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {task.description && <p className="text-sm text-muted-foreground mb-2">{task.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {task.assignee && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {task.assignee.full_name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(task.due_date), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {task.status !== 'completed' && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          title="Mark complete"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meetings Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Meetings
            </CardTitle>
            <Dialog open={addMeetingOpen} onOpenChange={setAddMeetingOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Schedule Meeting
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Crew Meeting</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Meeting Title *</Label>
                    <Input 
                      placeholder="Enter meeting title..."
                      value={meetingForm.title}
                      onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      placeholder="Meeting agenda..."
                      value={meetingForm.description}
                      onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Crew</Label>
                    <Select value={meetingForm.crew_type} onValueChange={(v: Meeting['crew_type']) => setMeetingForm({ ...meetingForm, crew_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="merch">Merch Crew Only</SelectItem>
                        <SelectItem value="setup">Setup Crew Only</SelectItem>
                        <SelectItem value="both">Both Crews</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date & Time *</Label>
                    <Input 
                      type="datetime-local"
                      value={meetingForm.meeting_date}
                      onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch 
                      checked={meetingForm.is_virtual}
                      onCheckedChange={(v) => setMeetingForm({ ...meetingForm, is_virtual: v })}
                    />
                    <Label>Virtual Meeting</Label>
                  </div>
                  {meetingForm.is_virtual ? (
                    <div className="space-y-2">
                      <Label>Meeting Link</Label>
                      <Input 
                        placeholder="https://..."
                        value={meetingForm.meeting_link}
                        onChange={(e) => setMeetingForm({ ...meetingForm, meeting_link: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input 
                        placeholder="Meeting location..."
                        value={meetingForm.location}
                        onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                      />
                    </div>
                  )}
                  <Button onClick={createMeeting} className="w-full">Schedule Meeting</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {currentMeetings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No meetings scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentMeetings.map(meeting => (
                  <div key={meeting.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    <div className={`p-2 rounded-lg ${meeting.is_virtual ? 'bg-blue-500/10' : 'bg-green-500/10'}`}>
                      {meeting.is_virtual ? (
                        <Video className="h-5 w-5 text-blue-600" />
                      ) : (
                        <MapPin className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{meeting.title}</span>
                        {meeting.crew_type === 'both' && (
                          <Badge variant="outline">All Crews</Badge>
                        )}
                      </div>
                      {meeting.description && <p className="text-sm text-muted-foreground mb-2">{meeting.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(meeting.meeting_date), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(meeting.meeting_date), 'h:mm a')}
                        </span>
                        {meeting.is_virtual && meeting.meeting_link && (
                          <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Join Meeting
                          </a>
                        )}
                        {!meeting.is_virtual && meeting.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {meeting.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteMeeting(meeting.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  }
};
