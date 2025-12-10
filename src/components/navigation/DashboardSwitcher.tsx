
import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, User, BarChart3, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { isAdmin } from "@/constants/permissions";
import { useIsMobile } from "@/hooks/use-mobile";

export const DashboardSwitcher = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const location = useLocation();
  const isMobile = useIsMobile();
  
  if (!user || !userProfile) {
    return null;
  }

  // Only super admins get the dashboard switcher
  if (!userProfile.is_super_admin) {
    return null;
  }

  const hasAdminAccess = userProfile.is_super_admin;

  const isOnMemberDashboard = location.pathname.startsWith('/dashboard/member-view/');
  const isOnAdminDashboard = location.pathname === '/dashboard';

  const getCurrentContext = () => {
    if (isOnMemberDashboard) return "Personal View";
    if (isOnAdminDashboard) return "Admin View";
    return "Dashboard";
  };

  const getCurrentIcon = () => {
    if (isOnMemberDashboard) return <User className="h-5 w-5 sm:h-6 sm:w-6" />;
    if (isOnAdminDashboard) return <Shield className="h-5 w-5 sm:h-6 sm:w-6" />;
    return <Home className="h-5 w-5 sm:h-6 sm:w-6" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 sm:gap-4 text-white hover:bg-white/10 text-sm sm:text-base px-3 sm:px-6 md:px-8 h-10 sm:h-12 min-w-0 flex-1 max-w-xs">
          {getCurrentIcon()}
          <span className="truncate flex-1">{getCurrentContext()}</span>
          <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs sm:text-sm px-2 sm:px-3">
            {userProfile.role}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 sm:w-56 bg-background shadow-lg border border-border z-50">
        <DropdownMenuItem asChild>
          <Link to="/dashboard" className="flex items-center cursor-pointer">
            <Shield className="mr-2 h-4 w-4" />
            {hasAdminAccess ? 'Admin Dashboard' : 'My Dashboard'}
            {isOnAdminDashboard && (
              <Badge variant="secondary" className="ml-auto text-xs">
                Current
              </Badge>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/dashboard/member-view/${user.id}`} className="flex items-center cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Personal View
            {isOnMemberDashboard && (
              <Badge variant="secondary" className="ml-auto text-xs">
                Current
              </Badge>
            )}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
