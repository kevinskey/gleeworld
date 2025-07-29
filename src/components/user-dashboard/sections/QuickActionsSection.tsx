import { Button } from "@/components/ui/button";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle, 
  Calendar, 
  Music,
  Zap
} from "lucide-react";

interface QuickActionsSectionProps {
  isAdmin?: boolean;
}

export const QuickActionsSection = ({ isAdmin }: QuickActionsSectionProps) => {
  const navigate = useNavigate();

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
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2 text-secondary-foreground">
        <Zap className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Quick Actions</h3>
      </div>
      
      {/* Desktop Layout */}
      <div className="hidden md:block">
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

      {/* Mobile Layout */}
      <div className="md:hidden">
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
      </div>
    </div>
  );
};