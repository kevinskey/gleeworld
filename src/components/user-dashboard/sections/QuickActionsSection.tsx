import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { useNavigate } from "react-router-dom";
import { AttendanceDashboard } from "@/components/attendance/AttendanceDashboard";
import { 
  CheckCircle, 
  Calendar, 
  Music,
  Zap,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface QuickActionsSectionProps {
  isAdmin?: boolean;
  actionFilter?: 'attendance' | 'music' | 'calendar';
}

export const QuickActionsSection = ({ isAdmin, actionFilter }: QuickActionsSectionProps) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const allQuickActions = [
    {
      icon: CheckCircle,
      label: "Attendance",
      description: "View your attendance records and manage attendance",
      route: "/attendance",
      key: "attendance"
    },
    {
      icon: Calendar,
      label: "Calendar",
      description: "View calendar and events",
      route: "/calendar",
      key: "calendar"
    },
    {
      icon: Music,
      label: "Music Library",
      description: "Access music library and sheet music",
      route: "/music-library",
      key: "music"
    }
  ];

  // Filter actions based on actionFilter prop
  const quickActions = actionFilter 
    ? allQuickActions.filter(action => action.key === actionFilter)
    : allQuickActions;

  const getSectionTitle = () => {
    if (actionFilter === 'attendance') return 'Attendance';
    if (actionFilter === 'music') return 'Music Library';
    if (actionFilter === 'calendar') return 'Full Calendar';
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
        /* Original Desktop Layout for other actions */
        <>
          <div className="hidden md:block space-y-3">
            <div className="flex items-center gap-2 text-secondary-foreground">
              <Zap className="h-5 w-5" />
              <h3 className="text-base lg:text-lg font-semibold">{getSectionTitle()}</h3>
            </div>
            <div className={`grid gap-3 lg:gap-4 ${actionFilter ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
              {quickActions.map((action) => {
                const IconComponent = action.icon;
                return (
                  <EnhancedTooltip key={action.route} content={action.description}>
                    <Button 
                      className="h-16 lg:h-20 flex-col space-y-1.5 lg:space-y-2 text-xs lg:text-sm w-full" 
                      variant="outline"
                      onClick={() => navigate(action.route)}
                    >
                      <IconComponent className="h-5 w-5 lg:h-6 lg:w-6" />
                      <span className="text-center leading-tight">
                        {action.label}
                      </span>
                    </Button>
                  </EnhancedTooltip>
                );
              })}
            </div>
          </div>

          {/* Mobile Layout for other actions */}
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
                    <div className="space-y-3">
                      {quickActions.map((action) => {
                        const IconComponent = action.icon;
                        return (
                          <div key={action.route} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4 flex-shrink-0 text-primary" />
                              <span className="text-sm font-medium">{action.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                              {action.description}
                            </p>
                            <Button 
                              className="w-full text-sm py-2 min-h-[44px]" 
                              onClick={() => navigate(action.route)}
                            >
                              Open {action.label}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
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