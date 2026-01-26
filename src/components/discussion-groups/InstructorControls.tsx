import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Users, 
  Shuffle, 
  Lock, 
  Unlock, 
  Calendar,
  AlertTriangle,
  ChevronDown,
  UserMinus,
  UserPlus,
  RefreshCw,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface InstructorControlsProps {
  discussionId: string;
  prompt: any;
  groups: any[];
  enrolledStudents: any[];
  onRefresh: () => void;
}

export const InstructorControls: React.FC<InstructorControlsProps> = ({
  discussionId,
  prompt,
  groups,
  enrolledStudents,
  onRefresh
}) => {
  const { toast } = useToast();
  const [isAutoGrouping, setIsAutoGrouping] = useState(false);
  const [groupSize, setGroupSize] = useState(5);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedTargetGroup, setSelectedTargetGroup] = useState<string>('');
  const [extendDeadline, setExtendDeadline] = useState({
    studentId: '',
    phase: 'individual',
    newDate: ''
  });
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [phaseDate, setPhaseDate] = useState('');

  // Get unassigned students
  const assignedStudentIds = groups.flatMap(g => 
    g.discussion_group_members?.map((m: any) => m.user_id) || []
  );
  const unassignedStudents = enrolledStudents.filter(
    s => !assignedStudentIds.includes(s.user_id)
  );

  const handleAutoGroup = async () => {
    setIsAutoGrouping(true);
    try {
      const shuffled = [...unassignedStudents].sort(() => Math.random() - 0.5);
      const numGroups = Math.ceil(shuffled.length / groupSize);
      
      // Create groups
      for (let i = 0; i < numGroups; i++) {
        const { data: group, error: groupError } = await supabase
          .from('discussion_groups')
          .insert({
            discussion_id: discussionId,
            name: `Group ${String.fromCharCode(65 + groups.length + i)}`,
            capacity: groupSize
          })
          .select()
          .single();

        if (groupError) throw groupError;

        // Assign members
        const members = shuffled.slice(i * groupSize, (i + 1) * groupSize);
        for (const student of members) {
          await supabase.from('discussion_group_members').insert({
            discussion_group_id: group.id,
            user_id: student.user_id,
            role: 'member'
          });
        }
      }

      toast({ title: 'Groups Created', description: `${numGroups} groups created successfully` });
      onRefresh();
    } catch (error) {
      console.error('Auto-grouping error:', error);
      toast({ title: 'Error', description: 'Failed to create groups', variant: 'destructive' });
    } finally {
      setIsAutoGrouping(false);
    }
  };

  const handleMoveStudent = async () => {
    if (!selectedStudent || !selectedTargetGroup) return;
    
    try {
      // Remove from current group
      await supabase
        .from('discussion_group_members')
        .delete()
        .eq('user_id', selectedStudent)
        .eq('discussion_group_id', groups.find(g => 
          g.discussion_group_members?.some((m: any) => m.user_id === selectedStudent)
        )?.id);

      // Add to new group
      await supabase.from('discussion_group_members').insert({
        discussion_group_id: selectedTargetGroup,
        user_id: selectedStudent,
        role: 'member'
      });

      toast({ title: 'Student Moved', description: 'Student reassigned successfully' });
      setSelectedStudent('');
      setSelectedTargetGroup('');
      onRefresh();
    } catch (error) {
      console.error('Move student error:', error);
      toast({ title: 'Error', description: 'Failed to move student', variant: 'destructive' });
    }
  };

  const handleLockPhase = async (phase: string, lock: boolean) => {
    try {
      await supabase
        .from('discussion_prompts')
        .update({ is_locked: lock })
        .eq('id', discussionId);

      toast({ 
        title: lock ? 'Phase Locked' : 'Phase Unlocked', 
        description: `${phase} phase has been ${lock ? 'locked' : 'unlocked'}` 
      });
      onRefresh();
    } catch (error) {
      console.error('Lock phase error:', error);
      toast({ title: 'Error', description: 'Failed to update phase lock', variant: 'destructive' });
    }
  };

  const handleUpdatePhaseDeadline = async (phase: string, newDate: string) => {
    if (!newDate) return;
    
    try {
      const fieldMap: Record<string, string> = {
        'individual': 'individual_due_at',
        'peer': 'peer_due_at',
        'synthesis': 'synthesis_due_at'
      };
      
      const { error } = await supabase
        .from('discussion_prompts')
        .update({ [fieldMap[phase]]: new Date(newDate).toISOString() })
        .eq('id', discussionId);

      if (error) throw error;
      
      toast({ title: 'Deadline Updated', description: `${phase} deadline has been updated` });
      setEditingPhase(null);
      setPhaseDate('');
      onRefresh();
    } catch (error) {
      console.error('Update deadline error:', error);
      toast({ title: 'Error', description: 'Failed to update deadline', variant: 'destructive' });
    }
  };

  const handleExtendDeadline = async () => {
    if (!extendDeadline.studentId || !extendDeadline.newDate) return;
    
    try {
      console.log('Deadline extension:', {
        discussion_id: discussionId,
        student_id: extendDeadline.studentId,
        phase: extendDeadline.phase,
        extended_to: extendDeadline.newDate
      });

      toast({ title: 'Deadline Extended', description: 'Student deadline has been extended' });
      setExtendDeadline({ studentId: '', phase: 'individual', newDate: '' });
    } catch (error) {
      console.error('Extend deadline error:', error);
      toast({ title: 'Error', description: 'Failed to extend deadline', variant: 'destructive' });
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          Instructor Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="groups" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="phases">Phases</TabsTrigger>
            <TabsTrigger value="extensions">Extensions</TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="space-y-4 mt-4">
            {/* Auto-grouping */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Shuffle className="h-4 w-4" />
                Auto-Group Students
              </h4>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Group Size</Label>
                  <Select value={String(groupSize)} onValueChange={(v) => setGroupSize(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5, 6].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} students</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleAutoGroup} 
                  disabled={isAutoGrouping || unassignedStudents.length === 0}
                  className="mt-5"
                >
                  {isAutoGrouping ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Users className="h-4 w-4 mr-2" />
                  )}
                  Create Groups
                </Button>
              </div>
              {unassignedStudents.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {unassignedStudents.length} students not yet assigned
                </p>
              )}
            </div>

            {/* Manual reassignment */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full p-2 hover:bg-muted/50 rounded">
                <ChevronDown className="h-4 w-4" />
                Manual Reassignment
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Select Student</Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose student" />
                      </SelectTrigger>
                      <SelectContent>
                        {enrolledStudents.map(s => (
                          <SelectItem key={s.user_id} value={s.user_id}>
                            {s.gw_profiles?.full_name || s.user_id.slice(0, 8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Move To Group</Label>
                    <Select value={selectedTargetGroup} onValueChange={setSelectedTargetGroup}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map(g => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={handleMoveStudent}
                  disabled={!selectedStudent || !selectedTargetGroup}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Move Student
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Current groups overview */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Groups ({groups.length})</h4>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {groups.map(group => (
                    <div key={group.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                      <span className="font-medium">{group.name}</span>
                      <Badge variant="outline">
                        {group.discussion_group_members?.length || 0} / {group.capacity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="phases" className="space-y-4 mt-4">
            <div className="space-y-3">
              {[
                { id: 'individual', label: 'Individual Post', deadline: prompt?.individual_due_at },
                { id: 'peer', label: 'Peer Responses', deadline: prompt?.peer_due_at },
                { id: 'synthesis', label: 'Group Synthesis', deadline: prompt?.synthesis_due_at }
              ].map(phase => (
                <div key={phase.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{phase.label}</p>
                    {editingPhase === phase.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Input 
                          type="datetime-local"
                          value={phaseDate}
                          onChange={(e) => setPhaseDate(e.target.value)}
                          className="text-sm"
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdatePhaseDeadline(phase.id, phaseDate)}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => { setEditingPhase(null); setPhaseDate(''); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <p 
                        className="text-xs text-muted-foreground cursor-pointer hover:text-primary"
                        onClick={() => {
                          setEditingPhase(phase.id);
                          if (phase.deadline) {
                            setPhaseDate(format(new Date(phase.deadline), "yyyy-MM-dd'T'HH:mm"));
                          }
                        }}
                      >
                        Due: {phase.deadline ? format(new Date(phase.deadline), 'MMM d, h:mm a') : 'Not set'} (click to edit)
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLockPhase(phase.id, true)}
                    >
                      <Lock className="h-4 w-4 mr-1" />
                      Lock
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleLockPhase(phase.id, false)}
                    >
                      <Unlock className="h-4 w-4 mr-1" />
                      Unlock
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {prompt?.is_locked && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Discussion is currently locked</span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="extensions" className="space-y-4 mt-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Extend Deadline for Student
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Student</Label>
                  <Select 
                    value={extendDeadline.studentId} 
                    onValueChange={(v) => setExtendDeadline(prev => ({ ...prev, studentId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {enrolledStudents.map(s => (
                        <SelectItem key={s.user_id} value={s.user_id}>
                          {s.gw_profiles?.full_name || s.user_id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Phase</Label>
                  <Select 
                    value={extendDeadline.phase} 
                    onValueChange={(v) => setExtendDeadline(prev => ({ ...prev, phase: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="peer">Peer</SelectItem>
                      <SelectItem value="synthesis">Synthesis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">New Deadline</Label>
                  <Input 
                    type="datetime-local"
                    value={extendDeadline.newDate}
                    onChange={(e) => setExtendDeadline(prev => ({ ...prev, newDate: e.target.value }))}
                  />
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={handleExtendDeadline}
                disabled={!extendDeadline.studentId || !extendDeadline.newDate}
              >
                Grant Extension
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
