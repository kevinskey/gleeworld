import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle, 
  Calendar, 
  Music,
  ChevronDown,
  ChevronUp,
  Zap
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
      <div className="hidden md:block">
        <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-primary/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-secondary-foreground text-base">
              <Zap className="h-4 w-4" />
              Quick Actions
            </CardTitle>
            <CardDescription className="text-sm">Access your most-used features</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Mobile Layout - Collapsible */}
      <div className="md:hidden">
        <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-primary/20 shadow-lg">
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
            <CardTitle className="flex items-center justify-between text-secondary-foreground text-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Quick Actions
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          
          {!isCollapsed && (
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => {
                  const IconComponent = action.icon;
                  return (
                    <EnhancedTooltip key={action.route} content={action.description}>
                      <Button 
                        className="h-16 flex-col space-y-1 text-xs w-full" 
                        variant="outline"
                        onClick={() => navigate(action.route)}
                      >
                        <IconComponent className="h-5 w-5" />
                        <span className="text-center leading-tight">
                          {action.label.includes(' ') ? (
                            <>
                              {action.label.split(' ')[0]}
                              <br />
                              {action.label.split(' ').slice(1).join(' ')}
                            </>
                          ) : (
                            action.label
                          )}
                        </span>
                      </Button>
                    </EnhancedTooltip>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};