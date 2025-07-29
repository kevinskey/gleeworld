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
}

export const QuickActionsSection = ({ isAdmin }: QuickActionsSectionProps) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const quickActions = [
    {
      icon: CheckCircle,
      label: "Attendance",
      description: "View your attendance records and manage attendance",
      route: "/attendance"
    },
    {
      icon: Calendar,
      label: "Calendar",
      description: "View calendar and events",
      route: "/calendar"
    },
    {
      icon: Music,
      label: "Music Library",
      description: "Access music library and sheet music",
      route: "/music-library"
    }
  ];


  return (
    <div className="w-full">
      {/* Desktop Layout */}
      <div className="hidden md:block space-y-4">
        <div className="flex items-center gap-2 text-secondary-foreground">
          <Zap className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
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
      <div className="md:hidden space-y-3">
        {quickActions.map((action) => {
          const IconComponent = action.icon;
          const [isActionCollapsed, setIsActionCollapsed] = useState(true);
          
          return (
            <Card key={action.route} className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-primary/20 shadow-lg">
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