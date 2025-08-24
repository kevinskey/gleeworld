import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { User, Calendar, Settings } from "lucide-react";
import { ReactNode } from "react";

interface DashboardTemplateProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at: string;
  };
  title: string;
  subtitle: string;
  children: ReactNode;
  headerActions?: ReactNode;
  backgroundImage?: string;
  loading?: boolean;
}

export const DashboardTemplate = ({
  user,
  title,
  subtitle,
  children,
  headerActions,
  backgroundImage,
  loading = false
}: DashboardTemplateProps) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super-admin': return 'bg-purple-500/20 text-purple-600';
      case 'admin': return 'bg-red-500/20 text-red-600';
      case 'alumnae': return 'bg-blue-500/20 text-blue-600';
      case 'user': return 'bg-green-500/20 text-green-600';
      default: return 'bg-gray-500/20 text-gray-600';
    }
  };

  if (loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[600px]">
          <LoadingSpinner />
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout containerized={true} maxWidth="full">
      <div className="page-container">
        {/* Header Card */}
        <Card className="mb-1 md:mb-2 relative overflow-hidden border-0 bg-gradient-to-r from-primary/10 to-secondary/10">
          {backgroundImage && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{ backgroundImage: `url(${backgroundImage})` }}
            />
          )}
          <CardHeader className="card-header-compact relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between card-spacing">
              <div className="flex items-center gap-2 md:gap-4">
                <Avatar className="touch-target h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 flex-shrink-0">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}`} />
                  <AvatarFallback className="mobile-text-lg font-semibold">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <CardTitle className="page-title-large line-clamp-1">{title}</CardTitle>
                  <CardDescription className="mobile-text-lg mt-0.5 line-clamp-1">
                    {subtitle}
                  </CardDescription>
                  <div className="flex items-center gap-1 md:gap-2 mt-1 flex-wrap">
                    <Badge className={`${getRoleBadgeColor(user.role)} text-xs px-1.5 py-0.5`}>
                      <span className="sm:hidden">{user.role.split('-')[0].toUpperCase()}</span>
                      <span className="hidden sm:inline">{user.role.replace('-', ' ').toUpperCase()}</span>
                    </Badge>
                    {user.is_exec_board && user.exec_board_role && (
                      <Badge variant="outline" className="border-primary/20 text-xs px-1.5 py-0.5 max-w-[100px] sm:max-w-none">
                        <span className="truncate">{user.exec_board_role}</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {headerActions && (
                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 mt-2 sm:mt-0">
                  {headerActions}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Dashboard Content */}
        <div className="section-spacing">
          {children}
        </div>
      </div>
    </UniversalLayout>
  );
};