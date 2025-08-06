import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ActionGrid } from "@/components/actions/ActionGrid";
import { AttendanceDashboard } from "@/components/attendance/AttendanceDashboard";
import { 
  CheckCircle, 
  Zap,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface QuickActionsSectionProps {
  isAdmin?: boolean;
  userRole?: string;
  execPosition?: string;
  actionFilter?: 'attendance' | 'music' | 'calendar' | 'communication' | 'financial' | 'events' | 'members' | 'media' | 'community';
}

export const QuickActionsSection = ({ 
  isAdmin, 
  userRole, 
  execPosition, 
  actionFilter 
}: QuickActionsSectionProps) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const getSectionTitle = () => {
    if (actionFilter === 'attendance') return 'Attendance';
    if (actionFilter === 'music') return 'Music Library';
    if (actionFilter === 'calendar') return 'Calendar';
    if (actionFilter === 'communication') return 'Communication';
    if (actionFilter === 'financial') return 'Financial';
    if (actionFilter === 'events') return 'Events';
    if (actionFilter === 'members') return 'Members';
    if (actionFilter === 'media') return 'Media';
    if (actionFilter === 'community') return 'Community';
    return 'Quick Actions';
  };


  return (
    <div className="w-full">
      {/* Attendance Module - Always Collapsible */}
      {actionFilter === 'attendance' ? (
        <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
          <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-primary/20 shadow-sm">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer touch-manipulation min-h-[60px] hover:bg-primary/5 transition-colors">
                <CardTitle className="flex items-center justify-between text-secondary-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate text-base lg:text-lg font-semibold">Attendance</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0 min-h-[44px]">
                    {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="transition-all duration-300 ease-out data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <CardContent className="pt-0">
                <AttendanceDashboard />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ) : (
        /* Action-based Layout for other sections */
        <>
          <div className="hidden md:block space-y-3">
            <div className="flex items-center gap-2 text-secondary-foreground">
              <Zap className="h-5 w-5" />
              <h3 className="text-base lg:text-lg font-semibold">{getSectionTitle()}</h3>
            </div>
            <ActionGrid 
              filterOptions={{
                category: actionFilter,
                userRole,
                execPosition,
                isAdmin
              }}
              category={actionFilter}
              gridCols={actionFilter ? 2 : 3}
              showCategoryHeaders={false}
            />
          </div>

          {/* Mobile Layout for actions */}
          <div className="md:hidden">
            <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
              <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-primary/20 shadow-sm">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-1.5 cursor-pointer touch-manipulation min-h-[60px]">
                    <CardTitle className="flex items-center justify-between text-secondary-foreground text-sm">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{getSectionTitle()}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0 min-h-[44px]">
                        {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="transition-all duration-300 ease-out data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <CardContent className="pt-0">
                    <ActionGrid 
                      filterOptions={{
                        category: actionFilter,
                        userRole,
                        execPosition,
                        isAdmin
                      }}
                      category={actionFilter}
                      gridCols={1}
                      showCategoryHeaders={false}
                      className="space-y-2"
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </>
      )}
    </div>
  );
};