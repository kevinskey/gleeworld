import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Calendar, 
  Users, 
  FileMusic, 
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  GraduationCap,
  Award,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useAssignments } from '@/hooks/useAssignments';
import { useSheetMusicLibrary } from '@/hooks/useSheetMusicLibrary';
import { useToast } from '@/hooks/use-toast';
import { AssignmentGradingView } from './AssignmentGradingView';

interface AssignmentManagementProps {
  user: any;
}

export const AssignmentManagement: React.FC<AssignmentManagementProps> = ({ user }) => {
  const { 
    assignments, 
    submissions, 
    loading, 
    createAssignment, 
    getSubmissionForAssignment 
  } = useAssignments();
  const { scores } = useSheetMusicLibrary();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'assignments' | 'create' | 'grading'>('assignments');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // New assignment form state
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    sheet_music_id: '',
    due_date: '',
    max_attempts: 3,
    instructions: ''
  });

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && new Date(assignment.due_date) > new Date()) ||
                         (filterStatus === 'overdue' && new Date(assignment.due_date) < new Date());
    
    return matchesSearch && matchesStatus;
  });

  const getAssignmentStats = (assignmentId: string) => {
    const assignmentSubmissions = submissions.filter(sub => sub.assignment_id === assignmentId);
    const totalSubmissions = assignmentSubmissions.length;
    const gradedSubmissions = assignmentSubmissions.filter(sub => sub.status === 'graded').length;
    const avgGrade = gradedSubmissions > 0 
      ? assignmentSubmissions
          .filter(sub => sub.grade !== null)
          .reduce((sum, sub) => sum + (sub.grade || 0), 0) / gradedSubmissions
      : 0;
    
    return { totalSubmissions, gradedSubmissions, avgGrade };
  };

  const handleCreateAssignment = async () => {
    if (!newAssignment.title || !newAssignment.sheet_music_id || !newAssignment.due_date) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createAssignment({
        title: newAssignment.title,
        description: newAssignment.description,
        sheet_music_id: newAssignment.sheet_music_id,
        due_date: new Date(newAssignment.due_date).toISOString(),
        max_attempts: newAssignment.max_attempts,
        instructions: newAssignment.instructions
      });
      
      toast({
        title: "Assignment Created",
        description: "New assignment has been created successfully.",
      });
      
      setIsCreateDialogOpen(false);
      setNewAssignment({
        title: '',
        description: '',
        sheet_music_id: '',
        due_date: '',
        max_attempts: 3,
        instructions: ''
      });
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create assignment.",
        variant: "destructive",
      });
    }
  };

  const exportAssignmentData = (assignment: any) => {
    const assignmentSubmissions = submissions.filter(sub => sub.assignment_id === assignment.id);
    const csvData = [
      ['Student ID', 'Submitted At', 'Status', 'Grade', 'Feedback'],
      ...assignmentSubmissions.map(sub => [
        sub.student_id,
        new Date(sub.submitted_at).toISOString(),
        sub.status,
        sub.grade || '',
        sub.feedback || ''
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assignment-${assignment.title.replace(/\s+/g, '-')}-data.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading assignments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <FileMusic className="h-4 w-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New
          </TabsTrigger>
          <TabsTrigger value="grading" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Grading
          </TabsTrigger>
        </TabsList>

        {/* Assignments List */}
        <TabsContent value="assignments" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assignments Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredAssignments.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <FileMusic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">No Assignments Found</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm || filterStatus !== 'all' 
                        ? 'Try adjusting your search filters.'
                        : 'Create your first assignment to get started.'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredAssignments.map((assignment) => {
                const stats = getAssignmentStats(assignment.id);
                const isOverdue = new Date(assignment.due_date) < new Date();
                
                return (
                  <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            {assignment.title}
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {assignment.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </span>
                        {assignment.sheet_music?.title && (
                          <span className="flex items-center gap-1">
                            <FileMusic className="h-3 w-3" />
                            {assignment.sheet_music.title}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="space-y-1">
                          <div className="text-lg font-semibold text-blue-600">
                            {stats.totalSubmissions}
                          </div>
                          <div className="text-xs text-muted-foreground">Submissions</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-lg font-semibold text-green-600">
                            {stats.gradedSubmissions}
                          </div>
                          <div className="text-xs text-muted-foreground">Graded</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-lg font-semibold text-purple-600">
                            {stats.avgGrade.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Avg Grade</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setActiveTab('grading');
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => exportAssignmentData(assignment)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedAssignment(assignment);
                            setActiveTab('grading');
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Create Assignment */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Assignment</CardTitle>
              <CardDescription>
                Create a sight-reading assignment for students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Assignment Title *</Label>
                  <Input
                    id="title"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                    placeholder="Week 1 Sight-Reading Exercise"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                    placeholder="Practice sight-reading with focus on rhythm and pitch accuracy..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sheet_music">Sheet Music *</Label>
                    <Select 
                      value={newAssignment.sheet_music_id} 
                      onValueChange={(value) => setNewAssignment({...newAssignment, sheet_music_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a score" />
                      </SelectTrigger>
                      <SelectContent>
                        {scores.map(score => (
                          <SelectItem key={score.id} value={score.id}>
                            {score.title} {score.composer && `- ${score.composer}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date *</Label>
                    <Input
                      id="due_date"
                      type="datetime-local"
                      value={newAssignment.due_date}
                      onChange={(e) => setNewAssignment({...newAssignment, due_date: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max_attempts">Maximum Attempts</Label>
                  <Select 
                    value={newAssignment.max_attempts.toString()} 
                    onValueChange={(value) => setNewAssignment({...newAssignment, max_attempts: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 attempt</SelectItem>
                      <SelectItem value="2">2 attempts</SelectItem>
                      <SelectItem value="3">3 attempts</SelectItem>
                      <SelectItem value="5">5 attempts</SelectItem>
                      <SelectItem value="-1">Unlimited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="instructions">Special Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={newAssignment.instructions}
                    onChange={(e) => setNewAssignment({...newAssignment, instructions: e.target.value})}
                    placeholder="Focus on maintaining steady tempo. Record at a comfortable pace..."
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setNewAssignment({
                  title: '', description: '', sheet_music_id: '', due_date: '', max_attempts: 3, instructions: ''
                })}>
                  Clear
                </Button>
                <Button onClick={handleCreateAssignment}>
                  Create Assignment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grading View */}
        <TabsContent value="grading" className="space-y-4">
          {selectedAssignment ? (
            <AssignmentGradingView 
              assignment={selectedAssignment}
              submissions={submissions.filter(sub => sub.assignment_id === selectedAssignment.id)}
              onBack={() => setActiveTab('assignments')}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">No Assignment Selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Select an assignment from the list to view submissions and grades.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};