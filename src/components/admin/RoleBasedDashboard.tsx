import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  Award, 
  Shield, 
  Music, 
  Calendar, 
  DollarSign,
  Users,
  Mail,
  FileText,
  Settings,
  Zap
} from "lucide-react";
import { 
  ROLE_DISPLAY_NAMES, 
  ROLE_RESPONSIBILITIES,
  ROLE_QUICK_ACTIONS,
  ExecutiveBoardRole,
  EXEC_BOARD_MODULE_PERMISSIONS
} from "@/constants/executiveBoardRoles";

interface RoleBasedDashboardProps {
  execBoardRole: ExecutiveBoardRole;
  onQuickAction: (action: string) => void;
}

export const RoleBasedDashboard = ({ execBoardRole, onQuickAction }: RoleBasedDashboardProps) => {
  const getRoleIcon = (role: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'president': <Crown className="h-6 w-6 text-purple-600" />,
      'vice-president': <Shield className="h-6 w-6 text-blue-600" />,
      'treasurer': <DollarSign className="h-6 w-6 text-green-600" />,
      'secretary': <FileText className="h-6 w-6 text-orange-600" />,
      'music-director': <Music className="h-6 w-6 text-pink-600" />,
      'assistant-music-director': <Music className="h-6 w-6 text-indigo-600" />,
      'social-chair': <Users className="h-6 w-6 text-yellow-600" />,
      'publicity-chair': <Zap className="h-6 w-6 text-red-600" />,
      'events-coordinator': <Calendar className="h-6 w-6 text-teal-600" />,
      'historian': <FileText className="h-6 w-6 text-brown-600" />,
      'librarian': <Music className="h-6 w-6 text-purple-600" />,
      'technical-director': <Settings className="h-6 w-6 text-gray-600" />,
      'fundraising-chair': <DollarSign className="h-6 w-6 text-emerald-600" />,
      'alumni-relations': <Mail className="h-6 w-6 text-blue-500" />,
      'membership-chair': <Users className="h-6 w-6 text-cyan-600" />,
    };
    return iconMap[role] || <Shield className="h-6 w-6 text-gray-600" />;
  };

  const getRoleColor = (role: string): string => {
    const colorMap: Record<string, string> = {
      'president': 'bg-purple-100 text-purple-800 border-purple-200',
      'vice-president': 'bg-blue-100 text-blue-800 border-blue-200',
      'treasurer': 'bg-green-100 text-green-800 border-green-200',
      'secretary': 'bg-orange-100 text-orange-800 border-orange-200',
      'music-director': 'bg-pink-100 text-pink-800 border-pink-200',
      'assistant-music-director': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
    return colorMap[role] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const quickActions = ROLE_QUICK_ACTIONS[execBoardRole] || [];
  const modulePermissions = EXEC_BOARD_MODULE_PERMISSIONS[execBoardRole] || [];

  return (
    <div className="space-y-6">
      {/* Role Header */}
      <Card className="bg-gradient-to-r from-slate-50 to-blue-50">
        <CardHeader>
          <div className="flex items-center gap-4">
            {getRoleIcon(execBoardRole)}
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                Welcome, {ROLE_DISPLAY_NAMES[execBoardRole]}
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                {ROLE_RESPONSIBILITIES[execBoardRole]}
              </CardDescription>
            </div>
            <Badge className={getRoleColor(execBoardRole)}>
              Executive Board
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Your Quick Actions
          </CardTitle>
          <CardDescription>
            Common tasks for your role - click to navigate directly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2 text-left"
                onClick={() => onQuickAction(action.action)}
              >
                <div className="font-medium">{action.label}</div>
                <div className="text-sm text-gray-500">{action.description}</div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Module Access
          </CardTitle>
          <CardDescription>
            Dashboard modules you have access to based on your executive board role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {modulePermissions.map((permission, index) => {
              const moduleKey = permission.replace('access_', '').replace('_', ' ');
              return (
                <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium capitalize">
                    {moduleKey.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
          </div>
          {modulePermissions.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No specific module permissions defined for this role
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Responsibilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Your Responsibilities
          </CardTitle>
          <CardDescription>
            Key areas of focus for your executive board position
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700">{ROLE_RESPONSIBILITIES[execBoardRole]}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};