import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle, 
  Calendar, 
  Bell, 
  MessageSquare, 
  Users, 
  DollarSign, 
  Music 
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
      icon: Bell,
      label: "Send Notification",
      description: "Send notification to yourself or others",
      route: "/notifications/send"
    },
    {
      icon: MessageSquare,
      label: "Announcements",
      description: "View announcements",
      route: "/announcements"
    },
    {
      icon: DollarSign,
      label: "Manage Budgets",
      description: "Manage budgets and financial planning",
      route: "/budgets"
    },
    {
      icon: Music,
      label: "Music Library",
      description: "Access music library and sheet music",
      route: "/music-library"
    }
  ];

  // Add admin-specific action
  if (isAdmin) {
    quickActions.splice(4, 0, {
      icon: Users,
      label: "Manage Users",
      description: "Manage user accounts and permissions",
      route: "/dashboard?tab=users"
    });
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
        <CardDescription className="hidden sm:block">Access your most-used features</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
          {quickActions.map((action) => {
            const IconComponent = action.icon;
            return (
              <EnhancedTooltip key={action.route} content={action.description}>
                <Button 
                  className="h-14 sm:h-16 md:h-20 flex-col space-y-0.5 sm:space-y-1 md:space-y-2 text-xs sm:text-sm w-full px-1 sm:px-3" 
                  variant="outline"
                  onClick={() => navigate(action.route)}
                >
                  <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">
                    {action.label.includes(' ') ? (
                      <>
                        {action.label.split(' ')[0]}
                        <br className="sm:hidden"/>
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
    </Card>
  );
};