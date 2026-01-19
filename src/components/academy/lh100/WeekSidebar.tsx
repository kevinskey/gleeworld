import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Lock, Unlock, Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { LH100Module } from './WeeklyModuleEditor';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface WeekSidebarProps {
  modules: LH100Module[];
  selectedModuleId: string | null;
  onSelectModule: (module: LH100Module) => void;
  onAddModule?: () => void;
  loading?: boolean;
  canAdd?: boolean;
}

// Reusable week list component
const WeekList: React.FC<{
  modules: LH100Module[];
  selectedModuleId: string | null;
  onSelectModule: (module: LH100Module) => void;
  onAddModule?: () => void;
  canAdd?: boolean;
  compact?: boolean;
}> = ({ modules, selectedModuleId, onSelectModule, onAddModule, canAdd, compact = false }) => {
  return (
    <div className={`space-y-1 ${compact ? 'p-1' : 'p-2'}`}>
      {modules.map((module) => {
        const startDate = module.start_date ? parseISO(module.start_date) : null;
        const isSelected = selectedModuleId === module.id;

        return (
          <button
            key={module.id}
            onClick={() => onSelectModule(module)}
            className={`w-full text-left ${compact ? 'p-2' : 'p-3'} rounded-lg transition-all ${
              isSelected
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'hover:bg-muted/50 border border-transparent hover:border-border'
            }`}
          >
            <div className="flex items-start gap-2 sm:gap-3">
              {/* Week Number Circle */}
              <div className={`flex items-center justify-center ${compact ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm'} rounded-full font-bold shrink-0 ${
                isSelected 
                  ? 'bg-primary-foreground/20 text-primary-foreground' 
                  : 'bg-primary/10 text-primary'
              }`}>
                {module.week_number}
              </div>

              <div className="flex-1 min-w-0">
                {/* Title */}
                <div className="flex items-center gap-1.5">
                  <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'} truncate ${
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
                <div className="flex items-center gap-1.5 mt-1">
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
                    {module.completion_percentage || 0}%
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
  );
};

export const WeekSidebar: React.FC<WeekSidebarProps> = ({
  modules,
  selectedModuleId,
  onSelectModule,
  onAddModule,
  loading = false,
  canAdd = false
}) => {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const selectedModule = modules.find(m => m.id === selectedModuleId);

  const handleSelectModule = (module: LH100Module) => {
    onSelectModule(module);
    setMobileOpen(false);
  };

  if (loading) {
    return (
      <Card className="w-full lg:w-72 xl:w-80 shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Course Weeks
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Mobile: Show as a collapsible button that opens a sheet
  if (isMobile) {
    return (
      <div className="w-full">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between h-auto py-3 px-4"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {selectedModule?.week_number || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {selectedModule?.title || 'Select a Week'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {modules.length} weeks available
                  </p>
                </div>
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
            <SheetHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  Course Weeks
                </SheetTitle>
                {canAdd && onAddModule && (
                  <Button size="sm" variant="ghost" onClick={onAddModule} className="h-8 w-8 p-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {modules.length} weeks • Tap to select
              </p>
            </SheetHeader>
            <ScrollArea className="h-[calc(70vh-100px)] mt-2">
              <WeekList 
                modules={modules}
                selectedModuleId={selectedModuleId}
                onSelectModule={handleSelectModule}
                onAddModule={onAddModule}
                canAdd={canAdd}
                compact
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop: Show as sidebar card
  return (
    <Card className="hidden lg:block lg:w-72 xl:w-80 shrink-0">
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
          <WeekList 
            modules={modules}
            selectedModuleId={selectedModuleId}
            onSelectModule={onSelectModule}
            onAddModule={onAddModule}
            canAdd={canAdd}
          />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
