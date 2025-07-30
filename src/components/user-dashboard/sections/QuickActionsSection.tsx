import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { useNavigate } from "react-router-dom";
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
      {/* Desktop Layout */}
      <div className="hidden md:block space-y-4">
        <div className="flex items-center gap-2 text-secondary-foreground">
          <Zap className="h-5 w-5" />
          <h3 className="text-lg font-semibold">{getSectionTitle()}</h3>
        </div>
        <div className={`grid gap-4 ${actionFilter ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {quickActions.map((action) => {
            const IconComponent = action.icon;
            return (
              <EnhancedTooltip key={action.route} content={action.description}>
                <Button 
                  className="h-20 flex-col space-y-2 text-sm w-full" 
                  variant="outline"
                  onClick={() => navigate(action.route)}
                >
                  <IconComponent className="h-6 w-6" />
                  <span className="text-center leading-tight">
                    {action.label}
                  </span>
                </Button>
              </EnhancedTooltip>
            );
          })}
        </div>
      </div>

      {/* Mobile Layout - Individual Collapsible Cards */}
      <div className="md:hidden space-y-2 px-1">
        {quickActions.map((action) => {
          const IconComponent = action.icon;
          const [isActionCollapsed, setIsActionCollapsed] = useState(actionFilter === 'music' ? false : true);
          
          return (
            <Card key={action.route} className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-primary/20 shadow-sm">
              <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsActionCollapsed(!isActionCollapsed)}>
                <CardTitle className="flex items-center justify-between text-secondary-foreground text-base">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4" />
                    {action.label}
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {isActionCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              
              {!isActionCollapsed && (
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                    <Button 
                      className="w-full" 
                      onClick={() => navigate(action.route)}
                    >
                      Open {action.label}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};