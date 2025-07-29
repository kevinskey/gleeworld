import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { 
  Crown, 
  Plus, 
  Settings, 
  FileText, 
  Users, 
  ChevronDown,
  Shield,
  DollarSign,
  ShoppingBag,
  BookOpen,
  Star,
  Calendar,
  UserCheck,
  Music2
} from "lucide-react";

interface ExecutiveBoardSectionProps {
  isExecBoardMember: boolean;
}

export const ExecutiveBoardSection = ({ isExecBoardMember }: ExecutiveBoardSectionProps) => {
  const navigate = useNavigate();

  if (!isExecBoardMember) return null;

  const execActions = [
    {
      icon: Plus,
      label: "Create",
      description: "Create events, budgets, and other executive board items",
      route: "/exec-board/create"
    },
    {
      icon: Settings,
      label: "Manage",
      description: "Manage ongoing events, budgets, and executive board activities",
      route: "/exec-board/manage"
    },
    {
      icon: FileText,
      label: "Assess",
      description: "Assess performance, review reports, and analyze executive board metrics",
      route: "/exec-board/assess"
    }
  ];

  const execPositions = [
    { name: "President", icon: Crown, route: "/exec-board/president" },
    { name: "Vice President", icon: Shield, route: "/exec-board/vice-president" },
    { name: "Secretary", icon: FileText, route: "/exec-board/secretary" },
    { name: "Treasurer", icon: DollarSign, route: "/exec-board/treasurer" },
    { name: "Business Manager", icon: ShoppingBag, route: "/exec-board/business-manager" },
    { name: "Librarian", icon: BookOpen, route: "/exec-board/librarian" },
    { name: "Chaplain", icon: Star, route: "/exec-board/chaplain" },
    { name: "Historian", icon: Calendar, route: "/exec-board/historian" },
    { name: "Social Chair", icon: Users, route: "/exec-board/social-chair" },
    { name: "Section Leader", icon: UserCheck, route: "/dashboard/section-leader" },
    { name: "Student Conductor", icon: Music2, route: "/dashboard/student-conductor" }
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Crown className="h-5 w-5 mr-2 text-amber-600" />
          Executive Board
          <Badge variant="outline" className="ml-2 text-xs border-amber-200 text-amber-700">
            Leadership
          </Badge>
        </CardTitle>
        <CardDescription>
          Executive board functions and event management
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {execActions.map((action) => {
            const IconComponent = action.icon;
            return (
              <EnhancedTooltip key={action.route} content={action.description}>
                <Button 
                  className="h-16 sm:h-18 md:h-20 flex-col space-y-1 sm:space-y-2 text-xs sm:text-sm w-full px-1 sm:px-3" 
                  variant="outline"
                  onClick={() => navigate(action.route)}
                >
                  <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">
                    {action.label}
                  </span>
                </Button>
              </EnhancedTooltip>
            );
          })}

          {/* Members Dropdown */}
          <EnhancedTooltip content="View executive board members and access position pages">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  className="h-16 sm:h-18 md:h-20 flex-col space-y-1 sm:space-y-2 text-xs sm:text-sm w-full px-1 sm:px-3" 
                  variant="outline"
                >
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  <div className="flex items-center gap-1">
                    <span className="text-center leading-tight text-[10px] sm:text-xs md:text-sm">Members</span>
                    <ChevronDown className="h-2 w-2 sm:h-3 sm:w-3" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-48 bg-white border shadow-lg z-50"
              >
                {execPositions.map((position) => {
                  const IconComponent = position.icon;
                  return (
                    <DropdownMenuItem 
                      key={position.route}
                      onClick={() => navigate(position.route)}
                    >
                      <IconComponent className="h-4 w-4 mr-2" />
                      {position.name}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </EnhancedTooltip>
        </div>
      </CardContent>
    </Card>
  );
};