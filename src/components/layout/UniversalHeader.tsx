
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, User, Settings, Menu, Home, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { AppNavigation } from "@/components/navigation/AppNavigation";
import { SystemNavigation } from "@/components/navigation/SystemNavigation";
import { DashboardSwitcher } from "@/components/navigation/DashboardSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { TaskNotifications } from "@/components/shared/TaskNotifications";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";

interface UniversalHeaderProps {
  systemActiveTab?: string;
  onSystemTabChange?: (tab: string) => void;
}

export const UniversalHeader = ({ systemActiveTab, onSystemTabChange }: UniversalHeaderProps) => {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const { profile } = useProfile();
  
  const isSystemPage = location.pathname.startsWith('/system');

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-16 sm:h-16 md:h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-1 sm:gap-4 md:gap-6 min-w-0 flex-1">
            <EnhancedTooltip content="Go to GleeWorld Home">
              <Link to="/landing" className="flex items-center gap-2 flex-shrink-0">
                <img 
                  src="/lovable-uploads/80d39e41-12f3-4266-8d7a-b1d3621bbf58.png" 
                  alt="Spelman College Glee Club" 
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 object-contain filter brightness-0 invert brightness-125 flex-shrink-0"
                />
                <span className="text-primary font-bold text-base sm:text-lg md:text-xl whitespace-nowrap">
                  GleeWorld
                </span>
              </Link>
            </EnhancedTooltip>
            
            {/* Home Icon - Takes users to public GleeWorld.org landing page */}
            <EnhancedTooltip content="Go to GleeWorld public landing page">
              <Link
                to="/landing"
                className="text-gray-700 hover:text-gray-900 transition-colors flex items-center p-2 rounded-lg hover:bg-gray-100"
              >
                <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </EnhancedTooltip>

            {/* Dashboard Icon - Shows appropriate dashboard based on user role */}
            {user && profile?.role && (
              <EnhancedTooltip content={`Go to ${profile.role === 'admin' || profile.role === 'super-admin' ? 'Admin' : 'User'} Dashboard`}>
                <Link
                  to={profile.role === 'admin' || profile.role === 'super-admin' ? '/system' : '/dashboard'}
                  className="text-gray-700 hover:text-gray-900 transition-colors flex items-center p-2 rounded-lg hover:bg-gray-100"
                >
                  <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </EnhancedTooltip>
            )}
            
            {/* Desktop Navigation */}
            {user && !isMobile && (
              isSystemPage && systemActiveTab && onSystemTabChange ? (
                <SystemNavigation 
                  activeTab={systemActiveTab} 
                  onTabChange={onSystemTabChange} 
                />
              ) : (
                <AppNavigation />
              )
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
            {user && (
              <>
                {/* Mobile Navigation - Handled by AppNavigation component */}
                {isMobile && (
                  isSystemPage && systemActiveTab && onSystemTabChange ? (
                    <SystemNavigation 
                      activeTab={systemActiveTab} 
                      onTabChange={onSystemTabChange}
                      isMobile={true}
                    />
                  ) : (
                    <AppNavigation />
                  )
                )}
                
                <EnhancedTooltip content="Switch between dashboards">
                  <DashboardSwitcher />
                </EnhancedTooltip>
                
                <EnhancedTooltip content="View notifications and tasks">
                  <TaskNotifications />
                </EnhancedTooltip>
                
                 <DropdownMenu>
                   <EnhancedTooltip content="Profile menu">
                     <DropdownMenuTrigger asChild>
                       <Button variant="ghost" className="relative h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-full p-0">
                         <Avatar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8">
                           <AvatarImage 
                             src={profile?.avatar_url || undefined} 
                             alt={profile?.full_name || user.email || "Profile"} 
                             className="object-cover"
                           />
                           <AvatarFallback className="bg-gray-200 text-gray-700">
                             {profile?.full_name ? 
                               profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() :
                               <User className="h-3 w-3 sm:h-4 sm:w-4" />
                             }
                           </AvatarFallback>
                         </Avatar>
                       </Button>
                     </DropdownMenuTrigger>
                   </EnhancedTooltip>
                   <DropdownMenuContent className="w-56" align="end" forceMount>
                     <div className="flex flex-col space-y-1 p-2">
                       <p className="text-sm font-medium leading-none truncate">
                         {profile?.full_name || user.email}
                       </p>
                       <p className="text-xs leading-none text-muted-foreground">
                         {user.email}
                       </p>
                     </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/system" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {!user && (
              <EnhancedTooltip content="Sign in to access your dashboard">
                <Button asChild variant="secondary" size="sm">
                  <Link to="/auth">Sign In</Link>
                </Button>
              </EnhancedTooltip>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
