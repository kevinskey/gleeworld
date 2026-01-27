import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Filter, Search, FileCheck, Clock, CheckCircle, BookOpen, Eye, EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isFuture, isPast } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUnifiedAssignments } from '@/hooks/useUnifiedAssignments';
interface Assignment {
  id: string;
  title: string;
  description: string | null;
  assignment_type: string | null;
  points: number | null;
  due_date: string | null;
  is_published: boolean;
  created_at: string;
  display_order: number | null;
  rubric_id: string | null;
}

interface Rubric {
  id: string;
  name: string;
  description: string | null;
  total_points: number;
}
interface CourseAssignmentManagerProps {
  courseId: string;
  courseName?: string;
}
const ASSIGNMENT_TYPES = [{
  value: 'writing',
  label: 'Writing'
}, {
  value: 'exercise',
  label: 'Exercise'
}, {
  value: 'quiz',
  label: 'Quiz'
}, {
  value: 'journal',
  label: 'Journal'
}, {
  value: 'presentation',
  label: 'Presentation'
}, {
  value: 'practical',
  label: 'Practical'
}, {
  value: 'worksheet',
  label: 'Worksheet'
}, {
  value: 'exam',
  label: 'Exam'
}, {
  value: 'project',
  label: 'Project'
}, {
  value: 'discussion',
  label: 'Discussion'
}, {
  value: 'portfolio',
  label: 'Portfolio'
}];
export const CourseAssignmentManager: React.FC<CourseAssignmentManagerProps> = ({
  courseId,
  courseName
}) => {
  const NO_RUBRIC_VALUE = '__no_rubric__';
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignment_type: 'exercise',
    points: 100,
    due_at: '',
    rubric_id: ''
  });
  
  // Sort & filter state
  const [sortBy, setSortBy] = useState<'due_date' | 'title' | 'points' | 'type'>('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch available rubrics
  const { data: rubrics = [] } = useQuery({
    queryKey: ['universal-rubrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_universal_rubrics')
        .select('id, name, description, total_points')
        .order('name');
      if (error) throw error;
      return (data || []) as Rubric[];
    }
  });

  // Fetch assignments with submission stats
  const { data: unifiedAssignments = [] } = useUnifiedAssignments(courseId);

  // Fetch assignments
  const {
    data: assignments = [],
    isLoading
  } = useQuery({
    queryKey: ['course-assignments', courseId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('gw_course_assignments').select('*').eq('course_id', courseId).order('due_date', {
        ascending: true
      });
      if (error) throw error;
      return (data || []) as unknown as Assignment[];
    },
    enabled: !!courseId
  });

  // Calculate stats from unified assignments
  const stats = useMemo(() => {
    const totalSubmissions = unifiedAssignments.reduce((acc, a) => acc + (a.submission_count || 0), 0);
    const totalGraded = unifiedAssignments.reduce((acc, a) => acc + (a.graded_count || 0), 0);
    const pendingGrading = totalSubmissions - totalGraded;
    const activeAssignments = assignments.filter(a => a.due_date && isFuture(new Date(a.due_date))).length;
    const pastDueAssignments = assignments.filter(a => a.due_date && isPast(new Date(a.due_date))).length;
    
    return {
      totalAssignments: assignments.length,
      totalSubmissions,
      pendingGrading,
      activeAssignments,
      pastDueAssignments,
      totalGraded
    };
  }, [unifiedAssignments, assignments]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const {
        error
      } = await supabase.from('gw_course_assignments').insert({
        course_id: courseId,
        title: data.title,
        description: data.description || null,
        assignment_type: data.assignment_type,
        points: data.points,
        due_date: data.due_at || null,
        rubric_id: data.rubric_id || null,
        is_published: true
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['course-assignments', courseId]
      });
      toast.success('Assignment created');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: error => {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string;
      data: typeof formData;
    }) => {
      const {
        error
      } = await supabase.from('gw_course_assignments').update({
        title: data.title,
        description: data.description || null,
        assignment_type: data.assignment_type,
        points: data.points,
        due_date: data.due_at || null,
        rubric_id: data.rubric_id || null
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['course-assignments', courseId]
      });
      toast.success('Assignment updated');
      setEditingAssignment(null);
      resetForm();
    },
    onError: error => {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const {
        error
      } = await supabase.from('gw_course_assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['course-assignments', courseId]
      });
      toast.success('Assignment deleted');
    },
    onError: error => {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    }
  });

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const { error } = await supabase
        .from('gw_course_assignments')
        .update({ is_published: isPublished })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { isPublished }) => {
      queryClient.invalidateQueries({ queryKey: ['course-assignments', courseId] });
      toast.success(isPublished ? 'Assignment visible to students' : 'Assignment hidden from students');
    },
    onError: (error) => {
      console.error('Error toggling visibility:', error);
      toast.error('Failed to update visibility');
    }
  });
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      assignment_type: 'exercise',
      points: 100,
      due_at: '',
      rubric_id: ''
    });
  };
  const handleEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      assignment_type: assignment.assignment_type || 'exercise',
      points: assignment.points || 100,
      due_at: assignment.due_date ? format(new Date(assignment.due_date), "yyyy-MM-dd'T'HH:mm") : '',
      rubric_id: assignment.rubric_id || ''
    });
  };
  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (editingAssignment) {
      updateMutation.mutate({
        id: editingAssignment.id,
        data: formData
      });
    } else {
      createMutation.mutate(formData);
    }
  };
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this assignment?')) {
      deleteMutation.mutate(id);
    }
  };
  // Filtered and sorted assignments
  const filteredAndSortedAssignments = useMemo(() => {
    let result = [...assignments];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => 
        a.title.toLowerCase().includes(query) ||
        (a.description?.toLowerCase().includes(query))
      );
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      result = result.filter(a => a.assignment_type === filterType);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'due_date':
          if (!a.due_date && !b.due_date) comparison = 0;
          else if (!a.due_date) comparison = 1;
          else if (!b.due_date) comparison = -1;
          else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'points':
          comparison = (a.points || 0) - (b.points || 0);
          break;
        case 'type':
          comparison = (a.assignment_type || '').localeCompare(b.assignment_type || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [assignments, searchQuery, filterType, sortBy, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const getTypeBadgeColor = (type: string | null) => {
    switch (type) {
      case 'exam':
        return 'destructive';
      case 'project':
        return 'default';
      case 'presentation':
        return 'secondary';
      case 'quiz':
        return 'outline';
      default:
        return 'secondary';
    }
  };
  if (isLoading) {
    return <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading assignments...
        </CardContent>
      </Card>;
  }
  return <div className="space-y-3 sm:space-y-4 w-full min-w-0">
      {/* Stats Cards - 2x2 grid */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:gap-3">
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
              <div className="p-1 sm:p-1.5 md:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stats.totalAssignments}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
              <div className="p-1 sm:p-1.5 md:p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
                <FileCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stats.totalSubmissions}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Submitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
              <div className="p-1 sm:p-1.5 md:p-2 rounded-lg bg-amber-500/10 flex-shrink-0">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stats.pendingGrading}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
              <div className="p-1 sm:p-1.5 md:p-2 rounded-lg bg-green-500/10 flex-shrink-0">
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stats.totalGraded}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Graded</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Add button */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <h2 className="text-sm sm:text-base md:text-lg font-semibold text-foreground truncate">Assignments</h2>
          <span className="text-xs sm:text-sm md:text-base text-muted-foreground flex-shrink-0">({filteredAndSortedAssignments.length})</span>
        </div>
        <Dialog open={isCreateOpen || !!editingAssignment} onOpenChange={open => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingAssignment(null);
          resetForm();
        }
      }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 flex-shrink-0">
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden xs:inline">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-3xl lg:max-w-4xl bg-white text-slate-900">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="text-xl lg:text-2xl font-semibold text-slate-900">
                {editingAssignment ? 'Edit Assignment' : 'Create Assignment'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-6 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-base font-medium text-slate-800">Title *</Label>
                <Input 
                  value={formData.title} 
                  onChange={e => setFormData({ ...formData, title: e.target.value })} 
                  placeholder="Assignment title" 
                  className="h-12 text-base bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-base font-medium text-slate-800">Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })} 
                  placeholder="Assignment description and instructions..." 
                  rows={5}
                  className="text-base bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 resize-y min-h-[120px]"
                />
              </div>

              {/* Type & Points Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-base font-medium text-slate-800">Assignment Type</Label>
                  <Select 
                    value={formData.assignment_type} 
                    onValueChange={value => setFormData({ ...formData, assignment_type: value })}
                  >
                    <SelectTrigger className="h-12 text-base bg-white text-slate-900 border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {ASSIGNMENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value} className="text-slate-900">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium text-slate-800">Points</Label>
                  <Input 
                    type="number" 
                    value={formData.points} 
                    onChange={e => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })} 
                    className="h-12 text-base bg-white text-slate-900 border-slate-300"
                  />
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label className="text-base font-medium text-slate-800">Due Date</Label>
                <Input 
                  type="datetime-local" 
                  value={formData.due_at} 
                  onChange={e => setFormData({ ...formData, due_at: e.target.value })} 
                  className="h-12 text-base bg-white text-slate-900 border-slate-300"
                />
              </div>

              {/* Rubric */}
              <div className="space-y-2">
                <Label className="text-base font-medium text-slate-800">Grading Rubric</Label>
                <Select
                  value={formData.rubric_id || NO_RUBRIC_VALUE}
                  onValueChange={(value) =>
                    setFormData({ ...formData, rubric_id: value === NO_RUBRIC_VALUE ? '' : value })
                  }
                >
                  <SelectTrigger className="h-12 text-base bg-white text-slate-900 border-slate-300">
                    <SelectValue placeholder="No rubric" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value={NO_RUBRIC_VALUE} className="text-slate-900">No rubric</SelectItem>
                    {rubrics.map(rubric => (
                      <SelectItem key={rubric.id} value={rubric.id} className="text-slate-900">
                        {rubric.name} ({rubric.total_points} pts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-slate-500">
                  Rubric will be used for AI-assisted grading
                </p>
              </div>
            </div>
            <DialogFooter className="pt-4 border-t gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingAssignment(null);
                  resetForm();
                }}
                className="h-11 px-6 text-base"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="h-11 px-6 text-base"
              >
                {editingAssignment ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sort & Filter Toolbar - Mobile optimized */}
      <div className="flex flex-col gap-2 p-2 sm:p-3 bg-muted/30 rounded-lg border">
        {/* Search - full width */}
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 sm:pl-9 h-9 sm:h-10 text-sm"
          />
        </div>
        
        {/* Filters row - compact on mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full">
          {/* Filter by type */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="flex-1 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ASSIGNMENT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort by */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="flex-1 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
              <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date">Due</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="points">Pts</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort order toggle */}
          <Button variant="outline" size="sm" className="h-8 sm:h-9 w-8 sm:w-9 p-0 flex-shrink-0" onClick={toggleSortOrder}>
            {sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ArrowDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          </Button>
        </div>
      </div>

      {/* Assignment List - responsive height */}
      <ScrollArea className="h-[calc(100vh-380px)] sm:h-[calc(100vh-340px)] md:h-[calc(100vh-280px)]">
        <div className="space-y-1.5 sm:space-y-2 pr-1 sm:pr-2">
          {filteredAndSortedAssignments.map(assignment => (
            <div 
              key={assignment.id} 
              className={`flex items-start sm:items-center justify-between p-2 sm:p-3 md:p-4 rounded-lg border transition-colors gap-2 ${
                assignment.is_published 
                  ? 'bg-card hover:bg-muted/50' 
                  : 'bg-muted/30 border-dashed opacity-75'
              }`}
            >
              <div className="flex flex-col gap-0.5 sm:gap-1 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <span className={`text-sm sm:text-base md:text-lg font-medium line-clamp-1 ${
                    assignment.is_published ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {assignment.title}
                  </span>
                  <Badge variant={getTypeBadgeColor(assignment.assignment_type)} className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 sm:py-0.5 flex-shrink-0">
                    {assignment.assignment_type || 'task'}
                  </Badge>
                  {!assignment.is_published && (
                    <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 sm:py-0.5 flex-shrink-0 border-amber-500/50 text-amber-600">
                      Hidden
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base text-muted-foreground">
                  <span>{assignment.points} pts</span>
                  {assignment.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9" 
                        onClick={() => toggleVisibilityMutation.mutate({ 
                          id: assignment.id, 
                          isPublished: !assignment.is_published 
                        })}
                        disabled={toggleVisibilityMutation.isPending}
                      >
                        {assignment.is_published ? (
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {assignment.is_published ? 'Hide from students' : 'Show to students'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9" onClick={() => handleEdit(assignment)}>
                  <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9" onClick={() => handleDelete(assignment.id)}>
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {filteredAndSortedAssignments.length === 0 && (
            <div className="border rounded-lg p-4 sm:p-6 md:p-8 text-center">
              <p className="text-muted-foreground text-sm sm:text-base mb-2 sm:mb-3">
                {assignments.length === 0 ? 'No assignments yet' : 'No assignments match your filters'}
              </p>
              {assignments.length === 0 && (
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  Create First Assignment
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>;
};