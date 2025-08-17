import { useState, useEffect } from 'react';
import { useSetupCrews, SetupCrewMember } from '@/hooks/useSetupCrews';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, UserPlus, UserMinus, Crown, User, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SetupCrewDetailsProps {
  crewId: string;
  onBack: () => void;
}

interface FirstYearStudent {
  user_id: string;
  full_name: string;
  email: string;
  voice_part?: string;
  graduation_year?: number;
}

export function SetupCrewDetails({ crewId, onBack }: SetupCrewDetailsProps) {
  const { crews, members, fetchCrewMembers, addMemberToCrew, removeMemberFromCrew, updateCrewMemberRole, getFirstYearStudents } = useSetupCrews();
  const { toast } = useToast();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [firstYears, setFirstYears] = useState<FirstYearStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedRole, setSelectedRole] = useState<'member' | 'leader'>('member');
  const [searchTerm, setSearchTerm] = useState('');

  const crew = crews.find(c => c.id === crewId);

  useEffect(() => {
    if (crewId) {
      fetchCrewMembers(crewId);
    }
  }, [crewId, fetchCrewMembers]);

  useEffect(() => {
    if (showAddDialog) {
      loadFirstYearStudents();
    }
  }, [showAddDialog]);

  const loadFirstYearStudents = async () => {
    const students = await getFirstYearStudents();
    // Filter out students already in this crew
    const availableStudents = students.filter(student => 
      !members.some(member => member.user_id === student.user_id)
    );
    setFirstYears(availableStudents);
  };

  const handleAddMember = async () => {
    if (!selectedStudent) {
      toast({
        title: "Error",
        description: "Please select a student",
        variant: "destructive",
      });
      return;
    }

    const success = await addMemberToCrew(crewId, selectedStudent, selectedRole);
    if (success) {
      setShowAddDialog(false);
      setSelectedStudent('');
      setSelectedRole('member');
      loadFirstYearStudents(); // Refresh available students
    }
  };

  const handleRemoveMember = async (member: SetupCrewMember) => {
    const confirmed = window.confirm(`Remove ${member.user_name} from this crew?`);
    if (confirmed) {
      await removeMemberFromCrew(member.id, crewId);
    }
  };

  const handleToggleRole = async (member: SetupCrewMember) => {
    const newRole = member.role === 'leader' ? 'member' : 'leader';
    await updateCrewMemberRole(member.id, newRole, crewId);
  };

  const filteredStudents = firstYears.filter(student =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.voice_part && student.voice_part.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!crew) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Crew not found</h2>
          <Button onClick={onBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  const leaders = members.filter(m => m.role === 'leader');
  const regularMembers = members.filter(m => m.role === 'member');

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Crews
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{crew.crew_name}</h1>
                <p className="text-muted-foreground">{crew.event_title}</p>
              </div>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2" disabled={members.length >= crew.max_members}>
                  <Plus className="h-4 w-4" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Crew Member</DialogTitle>
                  <DialogDescription>
                    Select a first-year student to add to this setup crew
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="search">Search Students</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Search by name, email, or voice part..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="student">Student</Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredStudents.map(student => (
                          <SelectItem key={student.user_id} value={student.user_id}>
                            <div className="flex flex-col">
                              <span>{student.full_name}</span>
                              <span className="text-sm text-muted-foreground">
                                {student.voice_part} • {student.email}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={selectedRole} onValueChange={(value: 'member' | 'leader') => setSelectedRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="leader">Leader</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddMember}>
                    Add Member
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Crew Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Crew Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Members</span>
                <Badge variant="secondary">
                  {members.length} / {crew.max_members}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Leaders</span>
                <Badge variant="outline">
                  {leaders.length}
                </Badge>
              </div>

              {crew.event_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Event Date</span>
                  <span className="text-sm">{new Date(crew.event_date).toLocaleDateString()}</span>
                </div>
              )}

              {crew.notes && (
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  <strong>Notes:</strong> {crew.notes}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Crew Leaders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Crew Leaders ({leaders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No leaders assigned yet
                </p>
              ) : (
                <div className="space-y-3">
                  {leaders.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{member.user_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.voice_part} • Class of {member.graduation_year}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleRole(member)}
                          title="Demote to member"
                        >
                          <User className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveMember(member)}
                          title="Remove from crew"
                        >
                          <UserMinus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Regular Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Members ({regularMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {regularMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No members assigned yet
                </p>
              ) : (
                <div className="space-y-3">
                  {regularMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{member.user_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.voice_part} • Class of {member.graduation_year}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleRole(member)}
                          title="Promote to leader"
                        >
                          <Crown className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveMember(member)}
                          title="Remove from crew"
                        >
                          <UserMinus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}