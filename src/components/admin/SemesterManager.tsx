import React, { useState } from 'react';
import { useSemesters, Semester, formatSemesterLabel } from '@/hooks/useSemesters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, Archive, CheckCircle, Trash2, Edit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export const SemesterManager: React.FC = () => {
  const { semesters, activeSemester, loading, createSemester, setActiveSemesterById, archiveSemester, deleteSemester, refetch } = useSemesters();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSemester, setNewSemester] = useState({
    term: 'Fall',
    year: new Date().getFullYear(),
    start_date: '',
    end_date: '',
    classes_end_date: '',
    finals_start: '',
    finals_end: ''
  });

  const handleCreate = async () => {
    try {
      setCreating(true);
      await createSemester({
        name: `${newSemester.term} ${newSemester.year}`,
        term: newSemester.term,
        year: newSemester.year,
        start_date: newSemester.start_date,
        end_date: newSemester.end_date,
        classes_end_date: newSemester.classes_end_date || null,
        finals_start: newSemester.finals_start || null,
        finals_end: newSemester.finals_end || null,
        is_active: false
      });
      toast({ title: 'Semester created successfully' });
      setShowCreateDialog(false);
      setNewSemester({
        term: 'Fall',
        year: new Date().getFullYear(),
        start_date: '',
        end_date: '',
        classes_end_date: '',
        finals_start: '',
        finals_end: ''
      });
    } catch (err) {
      toast({ title: 'Failed to create semester', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await setActiveSemesterById(id);
      toast({ title: 'Active semester updated' });
    } catch (err) {
      toast({ title: 'Failed to update active semester', variant: 'destructive' });
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveSemester(id);
      toast({ title: 'Semester archived' });
    } catch (err) {
      toast({ title: 'Failed to archive semester', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this semester? This cannot be undone.')) return;
    try {
      await deleteSemester(id);
      toast({ title: 'Semester deleted' });
    } catch (err) {
      toast({ title: 'Failed to delete semester', variant: 'destructive' });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Semester Management</h2>
          <p className="text-muted-foreground">Manage academic semesters, set active terms, and archive past semesters</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Semester
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Semester</DialogTitle>
              <DialogDescription>Add a new academic semester to the system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Term</Label>
                  <Select value={newSemester.term} onValueChange={(v) => setNewSemester(s => ({ ...s, term: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fall">Fall</SelectItem>
                      <SelectItem value="Spring">Spring</SelectItem>
                      <SelectItem value="Summer">Summer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input 
                    type="number" 
                    value={newSemester.year} 
                    onChange={(e) => setNewSemester(s => ({ ...s, year: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input 
                    type="date" 
                    value={newSemester.start_date} 
                    onChange={(e) => setNewSemester(s => ({ ...s, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input 
                    type="date" 
                    value={newSemester.end_date} 
                    onChange={(e) => setNewSemester(s => ({ ...s, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Classes End Date (optional)</Label>
                <Input 
                  type="date" 
                  value={newSemester.classes_end_date} 
                  onChange={(e) => setNewSemester(s => ({ ...s, classes_end_date: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Finals Start (optional)</Label>
                  <Input 
                    type="date" 
                    value={newSemester.finals_start} 
                    onChange={(e) => setNewSemester(s => ({ ...s, finals_start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Finals End (optional)</Label>
                  <Input 
                    type="date" 
                    value={newSemester.finals_end} 
                    onChange={(e) => setNewSemester(s => ({ ...s, finals_end: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating || !newSemester.start_date || !newSemester.end_date}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Semester
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Semester Highlight */}
      {activeSemester && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Current Active Semester</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{formatSemesterLabel(activeSemester)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(activeSemester.start_date)} - {formatDate(activeSemester.end_date)}
                </p>
              </div>
              <Badge variant="default" className="bg-primary">Active</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Semesters */}
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold">All Semesters</h3>
        {semesters.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No semesters configured yet</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
                Create your first semester
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {semesters.map((semester) => (
              <Card key={semester.id} className={semester.is_active ? 'border-primary/30' : ''}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{formatSemesterLabel(semester)}</p>
                        {semester.is_active && (
                          <Badge variant="default" className="bg-primary text-xs">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(semester.start_date)} - {formatDate(semester.end_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!semester.is_active && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSetActive(semester.id)}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Set Active
                      </Button>
                    )}
                    {semester.is_active && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleArchive(semester.id)}
                        className="flex items-center gap-1"
                      >
                        <Archive className="h-4 w-4" />
                        Archive
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(semester.id)}
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
    </div>
  );
};
