
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, User, Settings, Menu, Home, LayoutDashboard, Camera } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AppNavigation } from "@/components/navigation/AppNavigation";

import { DashboardSwitcher } from "@/components/navigation/DashboardSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { TaskNotifications } from "@/components/shared/TaskNotifications";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { HeaderClock } from "@/components/ui/header-clock";

interface UniversalHeaderProps {
}

export const UniversalHeader = ({}: UniversalHeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const location = useLocation();
  const { userProfile } = useUserProfile(user);
  const { pageName } = usePageTitle();
  
  // Check if user has PR access (PR coordinator or admin)
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super-admin';
  const isPRCoordinator = userProfile?.exec_board_role === 'pr_coordinator';
  const canAccessPR = isAdmin || isPRCoordinator;

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
    <header className="bg-gradient-to-r from-white/10 via-white/5 to-white/10 backdrop-blur-lg border-b border-white/30 sticky top-0 z-[100] shadow-xl">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between min-h-10 sm:min-h-14 py-1 sm:py-2">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 min-w-0 flex-1">
            <EnhancedTooltip content="Go to GleeWorld Home">
              <Link to="/landing" className="flex items-center gap-1 flex-shrink-0 hover:scale-105 transition-transform duration-200 relative z-[110]">
                <div className="relative z-[111]">
                  <img 
                    src="/lovable-uploads/80d39e41-12f3-4266-8d7a-b1d3621bbf58.png" 
                    alt="Spelman College Glee Club" 
                    className="w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain flex-shrink-0 drop-shadow-md relative z-[112]"
                  />
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur opacity-50 z-[111]"></div>
                </div>
                <div className="flex items-center gap-1 relative z-[111]">
                  <span className="text-gray-900 font-bold text-lg sm:text-xl md:text-2xl whitespace-nowrap drop-shadow-sm relative z-[112]">
                    GleeWorld
                  </span>
                </div>
              </Link>
            </EnhancedTooltip>
          </div>

          {/* Center area with clock and dashboard indicator - Always visible */}
          <div className="flex items-center justify-center flex-1 gap-3">
            <HeaderClock className="text-sm" />
            {pageName !== 'GleeWorld' && (
              <span className="text-slate-700 font-bold text-[10px] px-2 py-1 rounded-md bg-blue-100 border border-blue-200 shadow-sm truncate max-w-32">
                {pageName}
              </span>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
            {user && (
              <>
                <EnhancedTooltip content="View notifications and tasks">
                  <TaskNotifications />
                </EnhancedTooltip>
                
                {/* PR Camera Quick Capture */}
                {canAccessPR && (
                  <EnhancedTooltip content="PR Quick Capture">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => navigate('/dashboard/pr-hub')}
                      className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 rounded-full hover:bg-white/20"
                    >
                      <img 
                        src="/lovable-uploads/a9348c2b-145b-4530-a755-80ee32c5bf6f.png" 
                        alt="Camera" 
                        className="h-8 w-8 filter brightness-0 saturate-100"
                        style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)' }}
                      />
                    </Button>
                  </EnhancedTooltip>
                )}
                
                 <DropdownMenu>
                   <EnhancedTooltip content="Profile menu">
                     <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-full p-0">
                          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9">
                            <AvatarImage 
                              src={userProfile?.avatar_url || undefined} 
                              alt={userProfile?.full_name || user.email || "Profile"}
                             className="object-cover"
                           />
                            <AvatarFallback className="bg-gray-200 text-gray-700">
                              {userProfile?.full_name ? 
                                userProfile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() :
                               <User className="h-3 w-3 sm:h-4 sm:w-4" />
                             }
                           </AvatarFallback>
                         </Avatar>
                       </Button>
                     </DropdownMenuTrigger>
                   </EnhancedTooltip>
                    <DropdownMenuContent className="w-48 py-1 bg-white shadow-lg border border-gray-200 z-[200]" align="end" forceMount>
                      <div className="flex flex-col space-y-0.5 p-1.5">
                         <p className="text-xs font-medium leading-none truncate">
                           {userProfile?.full_name || user.email}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                     <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="py-1.5 text-xs">
                        <Link to="/dashboard" className="flex items-center">
                          <LayoutDashboard className="mr-1.5 h-3 w-3" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="py-1.5 text-xs">
                        <Link to="/profile" className="flex items-center">
                          <User className="mr-1.5 h-3 w-3" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="py-1.5 text-xs">
                        <Link to="/dashboard" className="flex items-center">
                          <Settings className="mr-1.5 h-3 w-3" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={handleSignOut} className="py-1.5 text-xs">
                       <LogOut className="mr-1.5 h-3 w-3" />
                       Sign out
                     </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {!user && (
              <EnhancedTooltip content="Sing in to access your dashboard">
                <Button asChild variant="default" size="sm" className="text-sm px-6 min-w-[80px] whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white">
                  <Link to="/auth">Sing In</Link>
                </Button>
              </EnhancedTooltip>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
