import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, Trash2, UserPlus, Edit, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUsers } from "@/hooks/useUsers";

interface EventClassListManagerProps {
  eventId: string;
  eventTitle: string;
}

interface ClassList {
  id: string;
  name: string;
  description: string;
  attendance_required: boolean;
  created_at: string;
}

interface ClassListMember {
  id: string;
  user_id: string;
  voice_part: string;
  section: string;
  role: string;
  required_attendance: boolean;
  notes: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export const EventClassListManager = ({ eventId, eventTitle }: EventClassListManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { users } = useUsers();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [classLists, setClassLists] = useState<ClassList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [members, setMembers] = useState<ClassListMember[]>([]);
  const [editingMember, setEditingMember] = useState<string | null>(null);

  // New class list form
  const [newListData, setNewListData] = useState({
    name: '',
    description: '',
    attendance_required: true
  });

  // New member form
  const [newMemberData, setNewMemberData] = useState({
    user_id: '',
    voice_part: '',
    section: '',
    role: 'member',
    required_attendance: true,
    notes: ''
  });

  const voiceParts = ['Soprano I', 'Soprano II', 'Alto I', 'Alto II', 'Tenor', 'Bass', 'Other'];
  const sections = ['Section A', 'Section B', 'Section C', 'All Sections'];
  const roles = ['member', 'section_leader', 'assistant_leader', 'soloist', 'pianist', 'other'];

  useEffect(() => {
    if (open) {
      loadClassLists();
    }
  }, [open]);

  useEffect(() => {
    if (selectedListId) {
      loadClassListMembers(selectedListId);
    }
  }, [selectedListId]);

  const loadClassLists = async () => {
    try {
      const { data, error } = await supabase
        .from('event_class_lists')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setClassLists(data || []);
      
      if (data && data.length > 0 && !selectedListId) {
        setSelectedListId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading class lists:', error);
      toast({
        title: "Error",
        description: "Failed to load class lists",
        variant: "destructive",
      });
    }
  };

  const loadClassListMembers = async (listId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_class_list_members')
        .select(`
          *
        `)
        .eq('class_list_id', listId)
        .order('added_at', { ascending: true });

      if (error) throw error;

      // Get user details separately to avoid FK issues
      const membersWithUsers = await Promise.all(
        (data || []).map(async (member) => {
          const { data: userData } = await supabase
            .from('gw_profiles')
            .select('full_name, email')
            .eq('user_id', member.user_id)
            .single();

          return {
            ...member,
            user: userData || { full_name: '', email: '' }
          };
        })
      );

      setMembers(membersWithUsers);
    } catch (error) {
      console.error('Error loading class list members:', error);
      toast({
        title: "Error",
        description: "Failed to load class list members",
        variant: "destructive",
      });
    }
  };

  const createClassList = async () => {
    if (!newListData.name.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_class_lists')
        .insert([{
          event_id: eventId,
          name: newListData.name,
          description: newListData.description,
          attendance_required: newListData.attendance_required,
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      setClassLists(prev => [...prev, data]);
      setNewListData({ name: '', description: '', attendance_required: true });
      
      toast({
        title: "Success",
        description: "Class list created successfully",
      });
    } catch (error) {
      console.error('Error creating class list:', error);
      toast({
        title: "Error",
        description: "Failed to create class list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addMember = async () => {
    if (!newMemberData.user_id || !selectedListId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_class_list_members')
        .insert([{
          class_list_id: selectedListId,
          user_id: newMemberData.user_id,
          voice_part: newMemberData.voice_part,
          section: newMemberData.section,
          role: newMemberData.role,
          required_attendance: newMemberData.required_attendance,
          notes: newMemberData.notes,
          added_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      await loadClassListMembers(selectedListId);
      setNewMemberData({
        user_id: '',
        voice_part: '',
        section: '',
        role: 'member',
        required_attendance: true,
        notes: ''
      });

      toast({
        title: "Success",
        description: "Member added successfully",
      });
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: "Error",
        description: "Failed to add member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMember = async (memberId: string, updates: Partial<ClassListMember>) => {
    try {
      const { error } = await supabase
        .from('event_class_list_members')
        .update(updates)
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, ...updates } : member
      ));
      setEditingMember(null);

      toast({
        title: "Success",
        description: "Member updated successfully",
      });
    } catch (error) {
      console.error('Error updating member:', error);
      toast({
        title: "Error",
        description: "Failed to update member",
        variant: "destructive",
      });
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('event_class_list_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.filter(member => member.id !== memberId));

      toast({
        title: "Success",
        description: "Member removed successfully",
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const deleteClassList = async (listId: string) => {
    try {
      // First delete all members
      await supabase
        .from('event_class_list_members')
        .delete()
        .eq('class_list_id', listId);

      // Then delete the list
      const { error } = await supabase
        .from('event_class_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;

      setClassLists(prev => prev.filter(list => list.id !== listId));
      if (selectedListId === listId) {
        setSelectedListId('');
        setMembers([]);
      }

      toast({
        title: "Success",
        description: "Class list deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting class list:', error);
      toast({
        title: "Error",
        description: "Failed to delete class list",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          Manage Class Lists
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Class Lists - {eventTitle}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="lists" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lists">Class Lists</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="lists" className="space-y-4">
            {/* Create New Class List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Class List
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="listName">List Name *</Label>
                    <Input
                      id="listName"
                      value={newListData.name}
                      onChange={(e) => setNewListData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Soprano Section, Alto Section"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Attendance Required</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newListData.attendance_required}
                        onCheckedChange={(checked) => setNewListData(prev => ({ ...prev, attendance_required: checked }))}
                      />
                      <span className="text-sm text-muted-foreground">
                        {newListData.attendance_required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="listDescription">Description</Label>
                  <Textarea
                    id="listDescription"
                    value={newListData.description}
                    onChange={(e) => setNewListData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description for this class list"
                    rows={2}
                  />
                </div>
                <Button onClick={createClassList} disabled={loading || !newListData.name.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Class List
                </Button>
              </CardContent>
            </Card>

            {/* Existing Class Lists */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Existing Class Lists</h3>
              {classLists.length === 0 ? (
                <p className="text-muted-foreground">No class lists created yet.</p>
              ) : (
                <div className="grid gap-2">
                  {classLists.map((list) => (
                    <Card key={list.id} className={`cursor-pointer transition-colors ${selectedListId === list.id ? 'ring-2 ring-primary' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1" onClick={() => setSelectedListId(list.id)}>
                            <h4 className="font-medium">{list.name}</h4>
                            {list.description && (
                              <p className="text-sm text-muted-foreground">{list.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={list.attendance_required ? "default" : "secondary"}>
                                {list.attendance_required ? 'Attendance Required' : 'Attendance Optional'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteClassList(list.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            {!selectedListId ? (
              <p className="text-muted-foreground">Select a class list first to manage members.</p>
            ) : (
              <>
                {/* Add New Member */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Add Member to {classLists.find(l => l.id === selectedListId)?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>User *</Label>
                        <Select
                          value={newMemberData.user_id}
                          onValueChange={(value) => setNewMemberData(prev => ({ ...prev, user_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select user..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-40 overflow-y-auto">
                            {users
                              .filter(u => !members.find(m => m.user_id === u.id))
                              .map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.full_name || user.email}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Voice Part</Label>
                        <Select
                          value={newMemberData.voice_part}
                          onValueChange={(value) => setNewMemberData(prev => ({ ...prev, voice_part: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select voice part..." />
                          </SelectTrigger>
                          <SelectContent>
                            {voiceParts.map((part) => (
                              <SelectItem key={part} value={part}>
                                {part}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Section</Label>
                        <Select
                          value={newMemberData.section}
                          onValueChange={(value) => setNewMemberData(prev => ({ ...prev, section: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select section..." />
                          </SelectTrigger>
                          <SelectContent>
                            {sections.map((section) => (
                              <SelectItem key={section} value={section}>
                                {section}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select
                          value={newMemberData.role}
                          onValueChange={(value) => setNewMemberData(prev => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Attendance Required</Label>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={newMemberData.required_attendance}
                            onCheckedChange={(checked) => setNewMemberData(prev => ({ ...prev, required_attendance: checked }))}
                          />
                          <span className="text-sm text-muted-foreground">
                            {newMemberData.required_attendance ? 'Required' : 'Optional'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={newMemberData.notes}
                        onChange={(e) => setNewMemberData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Optional notes about this member's role"
                        rows={2}
                      />
                    </div>
                    <Button onClick={addMember} disabled={loading || !newMemberData.user_id}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </CardContent>
                </Card>

                {/* Current Members */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Current Members ({members.length})</h3>
                  {members.length === 0 ? (
                    <p className="text-muted-foreground">No members added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {members.map((member) => (
                        <Card key={member.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">
                                    {member.user?.full_name || member.user?.email || 'Unknown User'}
                                  </h4>
                                  <Badge variant="outline">{member.role.replace('_', ' ')}</Badge>
                                  {member.required_attendance && (
                                    <Badge variant="default">Required</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                  {member.voice_part && <span>Voice: {member.voice_part}</span>}
                                  {member.section && <span>Section: {member.section}</span>}
                                </div>
                                {member.notes && (
                                  <p className="text-sm text-muted-foreground mt-1">{member.notes}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingMember(editingMember === member.id ? null : member.id)}
                                >
                                  {editingMember === member.id ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMember(member.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {editingMember === member.id && (
                              <div className="mt-4 p-4 border rounded-lg bg-muted/20 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label>Voice Part</Label>
                                    <Select
                                      value={member.voice_part || ''}
                                      onValueChange={(value) => updateMember(member.id, { voice_part: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select voice part..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {voiceParts.map((part) => (
                                          <SelectItem key={part} value={part}>
                                            {part}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Section</Label>
                                    <Select
                                      value={member.section || ''}
                                      onValueChange={(value) => updateMember(member.id, { section: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select section..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {sections.map((section) => (
                                          <SelectItem key={section} value={section}>
                                            {section}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={member.required_attendance}
                                    onCheckedChange={(checked) => updateMember(member.id, { required_attendance: checked })}
                                  />
                                  <Label>Attendance Required</Label>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
