
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, User, Settings, Menu, Home, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
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
  const isMobile = useIsMobile();
  const location = useLocation();
  const { profile } = useProfile();
  const { pageName } = usePageTitle();
  
  

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
                  {pageName !== 'GleeWorld' && (
                    <>
                      <span className="text-gray-500 text-sm sm:text-lg md:text-xl hidden sm:inline opacity-60">|</span>
                      <span className="text-white font-medium text-xs sm:text-sm md:text-base truncate max-w-20 sm:max-w-32 md:max-w-48 bg-gradient-to-r from-slate-800 to-slate-900 pl-1 pr-1.5 py-0.5 rounded-md ml-1 sm:ml-2 shadow-md border border-white/10">
                        {pageName}
                      </span>
                    </>
                  )}
                </div>
              </Link>
            </EnhancedTooltip>
            
            {/* Clock - Next to Glee World text - hidden on mobile */}
            <HeaderClock className="hidden sm:block ml-1 sm:ml-2" />
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
            {user && (
              <>
                <EnhancedTooltip content="View notifications and tasks">
                  <TaskNotifications />
                </EnhancedTooltip>
                
                 <DropdownMenu>
                   <EnhancedTooltip content="Profile menu">
                     <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-full p-0">
                          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9">
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
                    <DropdownMenuContent className="w-48 py-1" align="end" forceMount>
                      <div className="flex flex-col space-y-0.5 p-1.5">
                        <p className="text-xs font-medium leading-none truncate">
                          {profile?.full_name || user.email}
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
                <Button asChild variant="secondary" size="sm" className="text-sm px-6 min-w-[80px] whitespace-nowrap">
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
