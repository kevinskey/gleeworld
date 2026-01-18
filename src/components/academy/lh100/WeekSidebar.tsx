import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Lock, Unlock, Plus, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { LH100Module } from './WeeklyModuleEditor';

interface WeekSidebarProps {
  modules: LH100Module[];
  selectedModuleId: string | null;
  onSelectModule: (module: LH100Module) => void;
  onAddModule?: () => void;
  loading?: boolean;
  canAdd?: boolean;
}

export const WeekSidebar: React.FC<WeekSidebarProps> = ({
  modules,
  selectedModuleId,
  onSelectModule,
  onAddModule,
  loading = false,
  canAdd = false
}) => {
  if (loading) {
    return (
      <Card className="lg:w-72 xl:w-80 shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Course Weeks
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:w-72 xl:w-80 shrink-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Course Weeks
          </CardTitle>
          {canAdd && onAddModule && (
            <Button size="sm" variant="ghost" onClick={onAddModule} className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {modules.length} weeks • Select to edit
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-280px)] min-h-[400px]">
          <div className="space-y-1 p-2">
            {modules.map((module) => {
              const startDate = module.start_date ? parseISO(module.start_date) : null;
              const isSelected = selectedModuleId === module.id;

              return (
                <button
                  key={module.id}
                  onClick={() => onSelectModule(module)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'hover:bg-muted/50 border border-transparent hover:border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Week Number Circle */}
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${
                      isSelected 
                        ? 'bg-primary-foreground/20 text-primary-foreground' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {module.week_number}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <div className="flex items-center gap-1.5">
                        <span className={`font-medium text-sm truncate ${
                          isSelected ? 'text-primary-foreground' : 'text-foreground'
                        }`}>
                          {module.title}
                        </span>
                        {module.is_locked ? (
                          <Lock className={`h-3 w-3 shrink-0 ${
                            isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`} />
                        ) : (
                          <Unlock className={`h-3 w-3 shrink-0 ${
                            isSelected ? 'text-primary-foreground/70' : 'text-green-600'
                          }`} />
                        )}
                      </div>

                      {/* Date */}
                      <div className={`text-xs mt-0.5 ${
                        isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      }`}>
                        {startDate ? format(startDate, 'MMM d, yyyy') : 'No date'}
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {module.is_active && (
                          <Badge 
                            variant="secondary" 
                            className={`text-[10px] px-1.5 py-0 ${
                              isSelected 
                                ? 'bg-primary-foreground/20 text-primary-foreground' 
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}
                          >
                            Active
                          </Badge>
                        )}
                        <span className={`text-[10px] ${
                          isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {module.completion_percentage || 0}% complete
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {modules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No weeks configured</p>
                {canAdd && onAddModule && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={onAddModule}
                    className="mt-3"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Week
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
