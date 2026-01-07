import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, FolderOpen, FileText, Video, ClipboardList, Link as LinkIcon, Calendar, BookOpen, Music, Pencil, Save, X, Plus, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { ModuleCreator } from './ModuleCreator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
interface ModulesSectionProps {
  courseId: string;
}
interface WeekItem {
  week: string;
  topics: string;
  readings?: string;
  assignments?: string;
}
export const ModulesSection: React.FC<ModulesSectionProps> = ({
  courseId
}) => {
  const queryClient = useQueryClient();
  const [editingWeekIndex, setEditingWeekIndex] = useState<number | null>(null);
  const [editedWeek, setEditedWeek] = useState<WeekItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch course modules from database
  const {
    data: modules,
    isLoading: modulesLoading
  } = useQuery({
    queryKey: ['course-modules', courseId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('course_modules').select(`
          *,
          module_items (*)
        `).eq('course_id', courseId).order('display_order', {
        ascending: true
      });
      if (error) throw error;
      return data;
    }
  });

  // Fetch weekly schedule from syllabus template
  const {
    data: syllabusData,
    isLoading: syllabusLoading
  } = useQuery({
    queryKey: ['syllabus-weekly-schedule', courseId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('gw_syllabus_templates').select('weekly_schedule, course_id, name').eq('course_id', courseId).maybeSingle();
      if (error) {
        console.error('Error fetching syllabus:', error);
        return null;
      }
      return data;
    }
  });
  const weeklySchedule: WeekItem[] = Array.isArray(syllabusData?.weekly_schedule) ? syllabusData.weekly_schedule as unknown as WeekItem[] : [];
  const handleEditWeek = (index: number, week: WeekItem) => {
    setEditingWeekIndex(index);
    setEditedWeek({
      ...week
    });
  };
  const handleCancelEdit = () => {
    setEditingWeekIndex(null);
    setEditedWeek(null);
  };
  const handleSaveWeek = async () => {
    if (editingWeekIndex === null || !editedWeek || !syllabusData) return;
    setIsSaving(true);
    try {
      const updatedSchedule = [...weeklySchedule];
      updatedSchedule[editingWeekIndex] = editedWeek;
      const {
        error
      } = await supabase.from('gw_syllabus_templates').update({
        weekly_schedule: updatedSchedule as unknown as Json
      }).eq('course_id', courseId);
      if (error) throw error;
      toast.success('Week updated successfully');
      queryClient.invalidateQueries({
        queryKey: ['syllabus-weekly-schedule', courseId]
      });
      setEditingWeekIndex(null);
      setEditedWeek(null);
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };
  const handleAddWeek = async () => {
    if (!syllabusData) return;
    setIsSaving(true);
    try {
      const newWeek: WeekItem = {
        week: `Week ${weeklySchedule.length + 1}`,
        topics: '',
        readings: '',
        assignments: ''
      };
      const updatedSchedule = [...weeklySchedule, newWeek];
      const {
        error
      } = await supabase.from('gw_syllabus_templates').update({
        weekly_schedule: updatedSchedule as unknown as Json
      }).eq('course_id', courseId);
      if (error) throw error;
      toast.success('Week added successfully');
      queryClient.invalidateQueries({
        queryKey: ['syllabus-weekly-schedule', courseId]
      });
    } catch (error: any) {
      toast.error('Failed to add week: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };
  const handleDeleteWeek = async (index: number) => {
    if (!syllabusData || !confirm('Delete this week?')) return;
    setIsSaving(true);
    try {
      const updatedSchedule = weeklySchedule.filter((_, i) => i !== index);
      const {
        error
      } = await supabase.from('gw_syllabus_templates').update({
        weekly_schedule: updatedSchedule as unknown as Json
      }).eq('course_id', courseId);
      if (error) throw error;
      toast.success('Week deleted');
      queryClient.invalidateQueries({
        queryKey: ['syllabus-weekly-schedule', courseId]
      });
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'video':
        return Video;
      case 'document':
        return FileText;
      case 'assignment':
        return ClipboardList;
      case 'link':
        return LinkIcon;
      default:
        return FileText;
    }
  };
  const parseTopicsContent = (topics: string) => {
    // Parse topics string into structured content
    const lines = topics.split('\n').filter(line => line.trim());
    const readings: string[] = [];
    const assignments: string[] = [];
    const topicItems: string[] = [];
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('read:') || lower.includes('reading:') || lower.includes('readings:')) {
        readings.push(line.replace(/^(read:|reading:|readings:)\s*/i, '').trim());
      } else if (lower.includes('due:') || lower.includes('assignment:') || lower.includes('submit:')) {
        assignments.push(line.replace(/^(due:|assignment:|submit:)\s*/i, '').trim());
      } else {
        topicItems.push(line.trim());
      }
    });
    return {
      readings,
      assignments,
      topicItems
    };
  };
  const isLoading = modulesLoading || syllabusLoading;
  if (isLoading) {
    return <div className="p-6">Loading modules...</div>;
  }
  const hasWeeklySchedule = weeklySchedule.length > 0;
  const hasModules = modules && modules.length > 0;
  return <div className="space-y-4">
      <h2 className="text-2xl font-bold">Course Modules</h2>

      <Tabs defaultValue="outline" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="outline">Course Outline</TabsTrigger>
          <TabsTrigger value="modules">Resources</TabsTrigger>
          <TabsTrigger value="create">Create Module</TabsTrigger>
        </TabsList>

        {/* Course Outline (Weekly Schedule) Tab */}
        <TabsContent value="outline" className="space-y-4 mt-4">
          <div className="flex justify-end mb-2">
            <Button onClick={handleAddWeek} disabled={isSaving} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Week
            </Button>
          </div>
          {hasWeeklySchedule ? <div className="space-y-3">
              {weeklySchedule.map((week, index) => {
            const isEditing = editingWeekIndex === index;
            const {
              readings,
              assignments,
              topicItems
            } = parseTopicsContent(week.topics || '');
            const weekLabel = week.week || `Week ${index + 1}`;
            if (isEditing && editedWeek) {
              return <Card key={index} className="overflow-hidden border-primary">
                      <CardHeader className="py-4">
                        <div className="space-y-4">
                          <Input value={editedWeek.week} onChange={e => setEditedWeek({
                      ...editedWeek,
                      week: e.target.value
                    })} placeholder="Week title (e.g., Week 1: Introduction)" className="font-semibold" />
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Topics (one per line)</label>
                            <Textarea value={editedWeek.topics} onChange={e => setEditedWeek({
                        ...editedWeek,
                        topics: e.target.value
                      })} placeholder="Enter topics, readings (prefix with 'Read:'), assignments (prefix with 'Due:')" rows={6} />
                            <p className="text-xs text-muted-foreground">
                              Tip: Use "Read:" for readings and "Due:" for assignments
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSaveWeek} disabled={isSaving} size="sm">
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                            <Button onClick={handleCancelEdit} variant="outline" size="sm">
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>;
            }
            return <Collapsible key={index} defaultOpen={index < 3} className="group/collapsible">
                    <Card className="overflow-hidden group">
                      <CollapsibleTrigger className="w-full [&[data-state=open]>div>div:last-child>svg:last-child]:rotate-180">
                        <CardHeader className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-semibold">
                                {index + 1}
                              </div>
                              <div className="text-left">
                                <CardTitle className="text-base font-semibold">{weekLabel}</CardTitle>
                                {topicItems.length > 0 && <p className="text-sm mt-0.5 line-clamp-3 text-primary-foreground pt-[10px] pb-[10px]">
                                    {topicItems[0]}
                                  </p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {assignments.length > 0 && <Badge variant="secondary" className="text-xs">
                                  {assignments.length} due
                                </Badge>}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1" onClick={e => e.stopPropagation()}>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => {
                            e.stopPropagation();
                            handleEditWeek(index, week);
                          }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={e => {
                            e.stopPropagation();
                            handleDeleteWeek(index);
                          }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200" />
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
                        <CardContent className="pt-0 pb-4 space-y-4 bg-primary-foreground">
                          {/* Topics */}
                          {topicItems.length > 0 && <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Music className="h-4 w-4" />
                                Topics
                              </div>
                              <ul className="space-y-1.5 ml-6">
                                {topicItems.map((topic, i) => <li key={i} className="text-sm flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                    {topic}
                                  </li>)}
                              </ul>
                            </div>}

                          {/* Readings */}
                          {readings.length > 0 && <div className="space-y-2 bg-primary-foreground">
                              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground pt-[20px] pl-[10px]">
                                <BookOpen className="h-4 w-4" />
                                Readings
                              </div>
                              <ul className="space-y-1.5 ml-6">
                                {readings.map((reading, i) => <li key={i} className="text-sm flex items-start gap-2 bg-primary-foreground pb-[10px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                                    {reading}
                                  </li>)}
                              </ul>
                            </div>}

                          {/* Assignments */}
                          {assignments.length > 0 && <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <ClipboardList className="h-4 w-4" />
                                Assignments Due
                              </div>
                              <ul className="space-y-1.5 ml-6">
                                {assignments.map((assignment, i) => <li key={i} className="text-sm flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                                    {assignment}
                                  </li>)}
                              </ul>
                            </div>}

                          {/* Show raw content if no structured data */}
                          {topicItems.length === 0 && readings.length === 0 && assignments.length === 0 && week.topics && <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {week.topics}
                            </p>}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>;
          })}
            </div> : <Card>
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <Calendar className="h-12 w-12 mb-4 text-muted-foreground/50" />
                <p className="text-primary-foreground">
                  No course outline available yet.
                </p>
                <p className="text-sm mt-1 text-primary-foreground">
                  Click "Add Week" to create your first module.
                </p>
              </CardContent>
            </Card>}
        </TabsContent>

        {/* Resources (Modules) Tab */}
        <TabsContent value="modules" className="space-y-4 mt-4">
          {hasModules ? modules.map(module => <Collapsible key={module.id} defaultOpen>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FolderOpen className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{module.title}</CardTitle>
                              {!module.is_published && <Badge variant="secondary">Draft</Badge>}
                            </div>
                            {module.description && <p className="text-sm text-muted-foreground mt-1">
                                {module.description}
                              </p>}
                          </div>
                        </div>
                        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-2">
                        {module.module_items && module.module_items.length > 0 ? module.module_items.sort((a: any, b: any) => a.display_order - b.display_order).map((item: any) => {
                    const ItemIcon = getItemIcon(item.item_type);
                    return <div key={item.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                                  <div className="flex items-center gap-3">
                                    <ItemIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{item.title}</span>
                                  </div>
                                  {item.points && <Badge variant="outline">{item.points} pts</Badge>}
                                </div>;
                  }) : <p className="text-sm text-muted-foreground text-center py-4">
                            No items in this module
                          </p>}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>) : <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No resource modules created yet. Switch to "Create Module" tab to add one.
              </CardContent>
            </Card>}
        </TabsContent>

        <TabsContent value="create" className="mt-4">
          <ModuleCreator courseId={courseId} />
        </TabsContent>
      </Tabs>
    </div>;
};