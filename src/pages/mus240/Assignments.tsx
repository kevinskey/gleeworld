import { useState, useEffect } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Calendar, Award, Upload, CheckCircle2, Clock, FileText } from 'lucide-react';
import { ASSIGNMENTS, Assignment, WeekAssignments } from '@/data/mus240Assignments';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type SubmissionStatus = {
  [assignmentId: string]: {
    id: string;
    submitted: boolean;
    submissionDate?: string;
    fileName?: string;
    status: 'submitted' | 'graded' | 'returned';
    grade?: number;
    feedback?: string;
  };
};

export default function Assignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<WeekAssignments[]>(ASSIGNMENTS);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionStatus>({});
  const [uploadingFile, setUploadingFile] = useState(false);

  // Load submissions on component mount
  useEffect(() => {
    if (user) {
      loadSubmissions();
    }
  }, [user]);

  const loadSubmissions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', user.id);

      if (error) throw error;

      const submissionMap: SubmissionStatus = {};
      data?.forEach((submission) => {
        submissionMap[submission.assignment_id] = {
          id: submission.id,
          submitted: true,
          submissionDate: submission.submitted_at,
          fileName: submission.file_name,
          status: submission.status,
          grade: submission.grade,
          feedback: submission.feedback,
        };
      });

      setSubmissions(submissionMap);
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load your submissions.",
        variant: "destructive",
      });
    }
  };

  const getAssignmentTypeColor = (type: Assignment['type']) => {
    switch (type) {
      case 'listening_journal': return 'bg-blue-100 text-blue-800';
      case 'reflection_paper': return 'bg-green-100 text-green-800';
      case 'research_project': return 'bg-purple-100 text-purple-800';
      case 'exam': return 'bg-red-100 text-red-800';
      case 'final_reflection': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAssignmentTypeName = (type: Assignment['type']) => {
    switch (type) {
      case 'listening_journal': return 'Listening Journal';
      case 'reflection_paper': return 'Reflection Paper';
      case 'research_project': return 'Research Project';
      case 'exam': return 'Exam';
      case 'final_reflection': return 'Final Reflection';
      default: return 'Assignment';
    }
  };

  const handleSubmitAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionDialogOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedAssignment || !user) return;

    setUploadingFile(true);
    try {
      // Create file path with user ID and assignment ID
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${selectedAssignment.id}_${Date.now()}.${fileExt}`;

      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assignment-submissions')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from('assignment-submissions')
        .getPublicUrl(fileName);

      // Create submission record
      const { data: submissionData, error: submissionError } = await supabase
        .from('assignment_submissions')
        .insert({
          assignment_id: selectedAssignment.id,
          student_id: user.id,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
        })
        .select()
        .single();

      if (submissionError) throw submissionError;

      // Update local state
      setSubmissions(prev => ({
        ...prev,
        [selectedAssignment.id]: {
          id: submissionData.id,
          submitted: true,
          submissionDate: submissionData.submitted_at,
          fileName: file.name,
          status: submissionData.status,
        }
      }));

      toast({
        title: "Assignment Submitted",
        description: `Your ${selectedAssignment.title} has been submitted successfully.`,
      });

      setSubmissionDialogOpen(false);
      setSelectedAssignment(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to submit your assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment({ ...assignment });
    setIsEditDialogOpen(true);
  };

  const handleSaveAssignment = () => {
    if (!editingAssignment) return;

    setAssignments(prev => prev.map(week => ({
      ...week,
      assignments: week.assignments.map(assignment =>
        assignment.id === editingAssignment.id ? editingAssignment : assignment
      )
    })));

    setIsEditDialogOpen(false);
    setEditingAssignment(null);
  };

  const updateEditingAssignment = (field: keyof Assignment, value: any) => {
    if (!editingAssignment) return;
    setEditingAssignment({ ...editingAssignment, [field]: value });
  };

  const getSubmissionStatus = (assignmentId: string) => {
    return submissions[assignmentId];
  };

  const isSubmitted = (assignmentId: string) => {
    return submissions[assignmentId]?.submitted || false;
  };

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <main className="max-w-6xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">MUS 240 Assignments</h1>
          <p className="text-muted-foreground">Week-by-week assignment schedule with detailed instructions</p>
        </header>

        <div className="space-y-8">
          {assignments.map((week) => (
            <section key={week.number} className="space-y-4">
              <div className="border-l-4 border-primary pl-4">
                <h2 className="text-2xl font-semibold">Week {week.number}</h2>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(week.date), 'MMMM d, yyyy')} • {week.title}
                </p>
              </div>

              {week.assignments.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No assignments scheduled for this week
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {week.assignments.map((assignment) => {
                    const submissionStatus = getSubmissionStatus(assignment.id);
                    const submitted = isSubmitted(assignment.id);
                    
                    return (
                      <Card 
                        key={assignment.id} 
                        className={`relative group hover:shadow-md transition-all cursor-pointer ${
                          submitted ? 'border-green-200 bg-green-50' : 'hover:border-primary/50'
                        }`}
                        onClick={() => !submitted && handleSubmitAssignment(assignment)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <Badge className={getAssignmentTypeColor(assignment.type)}>
                                  {getAssignmentTypeName(assignment.type)}
                                </Badge>
                                {submitted && (
                                  <Badge variant="outline" className="border-green-500 text-green-700">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Submitted
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className="text-lg">{assignment.title}</CardTitle>
                            </div>
                            <div className="flex gap-2">
                              {!submitted && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSubmitAssignment(assignment);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Upload className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditAssignment(assignment);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {assignment.description}
                          </p>
                          
                          {assignment.instructions && (
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Instructions:</p>
                              <p className="text-sm">{assignment.instructions}</p>
                            </div>
                          )}

                          {submitted && submissionStatus && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800">
                                  {submissionStatus.fileName}
                                </span>
                              </div>
                              <p className="text-xs text-green-600">
                                Submitted: {format(new Date(submissionStatus.submissionDate!), 'MMM d, yyyy h:mm a')}
                              </p>
                              {submissionStatus.grade && (
                                <p className="text-xs text-green-600 mt-1">
                                  Grade: {submissionStatus.grade}/{assignment.points}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Due: {format(new Date(assignment.dueDate), 'MMM d')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Award className="h-4 w-4" />
                              <span>{assignment.points} pts</span>
                            </div>
                          </div>

                          {!submitted && (
                            <div className="pt-2">
                              <Button 
                                size="sm" 
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSubmitAssignment(assignment);
                                }}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Submit Assignment
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Assignment Submission Dialog */}
        <Dialog open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Assignment</DialogTitle>
            </DialogHeader>
            
            {selectedAssignment && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">{selectedAssignment.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Due: {format(new Date(selectedAssignment.dueDate), 'MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Points: {selectedAssignment.points}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignment-file">Upload your assignment file</Label>
                  <Input
                    id="assignment-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.mp3,.wav,.m4a"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                  />
                  <p className="text-xs text-muted-foreground">
                    Accepted formats: PDF, Word documents, text files, audio files (for listening journals)
                  </p>
                </div>

                {uploadingFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 animate-spin" />
                    Uploading your assignment...
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setSubmissionDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Assignment Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Assignment</DialogTitle>
            </DialogHeader>
            
            {editingAssignment && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={editingAssignment.title}
                      onChange={(e) => updateEditingAssignment('title', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select 
                      value={editingAssignment.type} 
                      onValueChange={(value) => updateEditingAssignment('type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="listening_journal">Listening Journal</SelectItem>
                        <SelectItem value="reflection_paper">Reflection Paper</SelectItem>
                        <SelectItem value="research_project">Research Project</SelectItem>
                        <SelectItem value="exam">Exam</SelectItem>
                        <SelectItem value="final_reflection">Final Reflection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="points">Points</Label>
                    <Input
                      id="points"
                      type="number"
                      value={editingAssignment.points}
                      onChange={(e) => updateEditingAssignment('points', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={editingAssignment.dueDate}
                      onChange={(e) => updateEditingAssignment('dueDate', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editingAssignment.description}
                    onChange={(e) => updateEditingAssignment('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions (Optional)</Label>
                  <Textarea
                    id="instructions"
                    value={editingAssignment.instructions || ''}
                    onChange={(e) => updateEditingAssignment('instructions', e.target.value)}
                    rows={4}
                    placeholder="Detailed instructions for students..."
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveAssignment}>
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </UniversalLayout>
  );
}