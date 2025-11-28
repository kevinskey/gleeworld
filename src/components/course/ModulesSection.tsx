import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, FolderOpen, FileText, Video, ClipboardList, Link as LinkIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ModulesSectionProps {
  courseId: string;
}

export const ModulesSection: React.FC<ModulesSectionProps> = ({ courseId }) => {
  const { data: modules, isLoading } = useQuery({
    queryKey: ['course-modules', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select(`
          *,
          module_items (*)
        `)
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'document': return FileText;
      case 'assignment': return ClipboardList;
      case 'link': return LinkIcon;
      default: return FileText;
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading modules...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Course Modules</h2>

      <div className="space-y-4">
        {modules && modules.length > 0 ? (
          modules.map((module) => (
            <Collapsible key={module.id} defaultOpen>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <CardTitle className="text-lg">{module.title}</CardTitle>
                          {module.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {module.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-2">
                      {module.module_items && module.module_items.length > 0 ? (
                        module.module_items
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((item) => {
                            const ItemIcon = getItemIcon(item.item_type);
                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <ItemIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{item.title}</span>
                                </div>
                                {item.points && (
                                  <Badge variant="outline">{item.points} pts</Badge>
                                )}
                              </div>
                            );
                          })
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No items in this module
                        </p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No modules published yet
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
