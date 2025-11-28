import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, FolderOpen, FileText, Video, ClipboardList, Link as LinkIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface PublishedModulesListProps {
  courseId: string;
}

export const PublishedModulesList: React.FC<PublishedModulesListProps> = ({ courseId }) => {
  const { data: modules, isLoading } = useQuery({
    queryKey: ['published-modules', courseId],
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
    return <div className="text-sm text-muted-foreground">Loading modules...</div>;
  }

  if (!modules || modules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No modules published yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {modules.map((module) => (
        <Collapsible key={module.id}>
          <Card className="border-l-4 border-l-primary">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base text-left">{module.title}</CardTitle>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                </div>
                {module.description && (
                  <p className="text-xs text-muted-foreground text-left mt-1">
                    {module.description}
                  </p>
                )}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {module.module_items && module.module_items.length > 0 ? (
                    module.module_items
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((item) => {
                        const ItemIcon = getItemIcon(item.item_type);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <ItemIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{item.title}</span>
                            </div>
                            {item.points && (
                              <Badge variant="outline" className="text-xs">{item.points} pts</Badge>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">
                      No items in this module
                    </p>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
};
