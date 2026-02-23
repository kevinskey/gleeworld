import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, FolderOpen, FileText, Video, ClipboardList, Link as LinkIcon, Calendar, BookOpen, Music, Pencil, Save, X, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ModuleCreator } from './ModuleCreator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { ModuleResourceManager } from './ModuleResourceManager';

interface ModulesSectionProps {
  courseId: string;
}

export const ModulesSection: React.FC<ModulesSectionProps> = ({ courseId }) => {
  const queryClient = useQueryClient();
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Fetch modules from gw_course_modules
  const { data: modules, isLoading } = useQuery({
    queryKey: ['gw-course-modules', courseId],
    queryFn: async () => {
      const { data, error } = await supabase.
      from('gw_course_modules').
      select('*').
      eq('course_id', courseId).
      order('week_number', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // Fetch resources from mus240_module_resources (keyed by week-N)
  const { data: mus240Resources } = useQuery({
    queryKey: ['mus240-module-resources', courseId],
    queryFn: async () => {
      const { data, error } = await supabase.
      from('mus240_module_resources').
      select('*').
      order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch resources from gw_course_module_resources
  const { data: gwResources } = useQuery({
    queryKey: ['gw-course-module-resources', courseId],
    queryFn: async () => {
      const { data, error } = await supabase.
      from('gw_course_module_resources').
      select('*').
      eq('course_id', courseId).
      order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const updateModule = useMutation({
    mutationFn: async ({ id, title, description }: {id: string;title: string;description: string;}) => {
      const { error } = await supabase.
      from('gw_course_modules').
      update({ title, description }).
      eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Module updated');
      queryClient.invalidateQueries({ queryKey: ['gw-course-modules', courseId] });
      setEditingModuleId(null);
    },
    onError: (e: any) => toast.error(e.message)
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, is_published }: {id: string;is_published: boolean;}) => {
      const { error } = await supabase.
      from('gw_course_modules').
      update({ is_published }).
      eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gw-course-modules', courseId] });
    }
  });

  // Build a map of resources per week
  const resourcesByWeek = React.useMemo(() => {
    const map: Record<string, any[]> = {};
    // mus240 resources use module_id like "week-1"
    (mus240Resources || []).forEach((r) => {
      const key = r.module_id;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    // gw resources use module_id (UUID) – map them to week number via modules
    (gwResources || []).forEach((r) => {
      const mod = modules?.find((m) => m.id === r.module_id);
      if (mod) {
        const key = `week-${mod.week_number}`;
        if (!map[key]) map[key] = [];
        map[key].push(r);
      }
    });
    return map;
  }, [mus240Resources, gwResources, modules]);

  const today = new Date();

  const isCurrentWeek = (mod: any) => {
    if (!mod.start_date || !mod.end_date) return false;
    try {
      return isWithinInterval(today, { start: parseISO(mod.start_date), end: parseISO(mod.end_date) });
    } catch {return false;}
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video':return Video;
      case 'reading':return BookOpen;
      case 'listening':return Music;
      default:return FileText;
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading modules...</div>;
  }

  const hasModules = modules && modules.length > 0;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Course Modules</h2>

      <Tabs defaultValue="outline" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="outline">Course Outline</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="create">Create Module</TabsTrigger>
        </TabsList>

        {/* Course Outline Tab */}
        <TabsContent value="outline" className="space-y-3 mt-4">
          {hasModules ? modules.map((mod) => {
            const isCurrent = isCurrentWeek(mod);
            const isEditing = editingModuleId === mod.id;
            const weekKey = `week-${mod.week_number}`;
            const resources = resourcesByWeek[weekKey] || [];
            const videoCount = resources.filter((r) => r.resource_type === 'video').length;
            const readingCount = resources.filter((r) => r.resource_type === 'reading').length;

            if (isEditing) {
              return (
                <Card key={mod.id} className="border-primary">
                  <CardContent className="pt-4 space-y-3">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Module title" />

                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description (optional)"
                      rows={3} />

                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateModule.mutate({ id: mod.id, title: editTitle, description: editDescription })}>
                        <Save className="h-4 w-4 mr-2" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingModuleId(null)}>
                        <X className="h-4 w-4 mr-2" /> Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>);

            }

            return (
              <Collapsible key={mod.id} defaultOpen={isCurrent}>
                <Card className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isCurrent ? 'border-primary ring-2 ring-primary/20' : 'border-border/60'}`}>
                  <CollapsibleTrigger className="w-full [&[data-state=open]>div>div:last-child>svg:last-child]:rotate-180">
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-lg font-semibold ${isCurrent ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                            {mod.week_number}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="font-semibold text-4xl">{mod.title}</CardTitle>
                              {isCurrent && <Badge className="bg-primary text-primary-foreground text-xs">Current Week</Badge>}
                              {!mod.is_published && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                            </div>
                            {mod.start_date && mod.end_date &&
                            <span className="text-xs flex items-center gap-1 text-muted-foreground mt-1">
                                <Calendar className="h-3 w-3" />
                                {format(parseISO(mod.start_date), 'MMM d')} – {format(parseISO(mod.end_date), 'MMM d')}
                              </span>
                            }
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {videoCount > 0 && <Badge variant="outline" className="text-xs gap-1"><Video className="h-3 w-3" />{videoCount}</Badge>}
                          {readingCount > 0 && <Badge variant="outline" className="text-xs gap-1"><BookOpen className="h-3 w-3" />{readingCount}</Badge>}
                          <ChevronDown className="h-5 w-5 transition-transform duration-200 text-muted-foreground" />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 space-y-3">
                      {mod.description &&
                      <p className="text-sm text-muted-foreground">{mod.description}</p>
                      }

                      {/* Resources for this week */}
                      {resources.length > 0 ?
                      <div className="space-y-2">
                          {resources.map((r) => {
                          const Icon = getResourceIcon(r.resource_type);
                          return (
                            <div key={r.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium text-foreground truncate block">{r.title}</span>
                                    {r.description && <span className="text-xs text-muted-foreground truncate block">{r.description}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge variant="outline" className="text-xs capitalize">{r.resource_type}</Badge>
                                  {r.url &&
                                <a href={r.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                                    </a>
                                }
                                </div>
                              </div>);

                        })}
                        </div> :

                      <p className="text-sm text-muted-foreground text-center py-2">No resources added yet</p>
                      }

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2 border-t border-border/50">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingModuleId(mod.id);
                            setEditTitle(mod.title);
                            setEditDescription(mod.description || '');
                          }}>

                          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedModuleId(selectedModuleId === mod.id ? null : mod.id);
                          }}>

                          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Resources
                        </Button>
                        <Button
                          size="sm"
                          variant={mod.is_published ? "secondary" : "default"}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePublish.mutate({ id: mod.id, is_published: !mod.is_published });
                          }}>

                          {mod.is_published ? 'Unpublish' : 'Publish'}
                        </Button>
                      </div>

                      {/* Inline resource manager */}
                      {selectedModuleId === mod.id &&
                      <div className="mt-3 pt-3 border-t border-border">
                          <ModuleResourceManager
                          courseId={courseId}
                          moduleId={mod.id}
                          weekNumber={mod.week_number}
                          onClose={() => setSelectedModuleId(null)} />

                        </div>
                      }
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>);

          }) :
          <Card>
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <Calendar className="h-12 w-12 mb-4 text-muted-foreground" />
                <p className="text-foreground">No modules available yet.</p>
                <p className="text-sm mt-1 text-muted-foreground">Switch to "Create Module" to add weeks.</p>
              </CardContent>
            </Card>
          }
        </TabsContent>

        {/* Resources Overview Tab */}
        <TabsContent value="resources" className="space-y-4 mt-4">
          {hasModules ? modules.map((mod) => {
            const weekKey = `week-${mod.week_number}`;
            const resources = resourcesByWeek[weekKey] || [];
            if (resources.length === 0) return null;
            return (
              <Card key={mod.id} className="border-border/60 shadow-sm">
                <CardHeader className="py-3">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{mod.title}</CardTitle>
                    <Badge variant="outline" className="text-xs">{resources.length} items</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  <div className="space-y-1.5">
                    {resources.map((r) => {
                      const Icon = getResourceIcon(r.resource_type);
                      return (
                        <div key={r.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                          <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="text-sm">{r.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize">{r.resource_type}</Badge>
                            {r.url &&
                            <a href={r.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                              </a>
                            }
                          </div>
                        </div>);

                    })}
                  </div>
                </CardContent>
              </Card>);

          }) :
          <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No resources added yet.
              </CardContent>
            </Card>
          }
        </TabsContent>

        <TabsContent value="create" className="mt-4">
          <ModuleCreator courseId={courseId} />
        </TabsContent>
      </Tabs>
    </div>);

};