import { useState } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Calendar, Clock, Award } from 'lucide-react';
import { ASSIGNMENTS, Assignment, WeekAssignments } from '@/data/mus240Assignments';
import { format } from 'date-fns';

export default function Assignments() {
  const [assignments, setAssignments] = useState<WeekAssignments[]>(ASSIGNMENTS);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
                  {week.assignments.map((assignment) => (
                    <Card key={assignment.id} className="relative group hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <Badge className={getAssignmentTypeColor(assignment.type)}>
                              {getAssignmentTypeName(assignment.type)}
                            </Badge>
                            <CardTitle className="text-lg">{assignment.title}</CardTitle>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditAssignment(assignment)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

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