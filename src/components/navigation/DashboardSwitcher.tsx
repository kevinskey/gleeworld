
import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Shield, User, BarChart3, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { isAdmin } from "@/constants/permissions";

export const DashboardSwitcher = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const location = useLocation();
  
  if (!user || !userProfile || !isAdmin(userProfile.role)) {
    return null;
  }

  const isOnAdminDashboard = location.pathname.startsWith('/system');
  const isOnUserDashboard = location.pathname === '/dashboard';

  const getCurrentContext = () => {
    if (isOnAdminDashboard) return "Admin View";
    if (isOnUserDashboard) return "Personal View";
    return "Dashboard";
  };

  const getCurrentIcon = () => {
    if (isOnAdminDashboard) return <Shield className="h-4 w-4" />;
    if (isOnUserDashboard) return <User className="h-4 w-4" />;
    return <Home className="h-4 w-4" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-white/10">
          {getCurrentIcon()}
          <span className="hidden sm:inline">{getCurrentContext()}</span>
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            {userProfile.role}
          </Badge>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem asChild>
          <Link to="/system" className="flex items-center cursor-pointer">
            <Shield className="mr-2 h-4 w-4" />
            Admin Dashboard
            {isOnAdminDashboard && (
              <Badge variant="secondary" className="ml-auto">
                Current
              </Badge>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard" className="flex items-center cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Personal Dashboard
            {isOnUserDashboard && (
              <Badge variant="secondary" className="ml-auto">
                Current
              </Badge>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/" className="flex items-center cursor-pointer">
            <BarChart3 className="mr-2 h-4 w-4" />
            Main Dashboard
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
