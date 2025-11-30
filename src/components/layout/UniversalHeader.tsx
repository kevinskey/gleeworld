
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, User, Settings, Menu, Home, LayoutDashboard, Camera, Shield, Crown, Globe, Heart, GraduationCap, Music, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AppNavigation } from "@/components/navigation/AppNavigation";

import { DashboardSwitcher } from "@/components/navigation/DashboardSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { HeaderClock } from "@/components/ui/header-clock";
import { HeaderRadioControls } from "@/components/radio/HeaderRadioControls";
import { CountdownText } from "@/components/ui/countdown-text";

import { MusicalToolkit } from "@/components/musical-toolkit/MusicalToolkit";
import { ExecutiveBoardDropdown } from "@/components/navigation/ExecutiveBoardDropdown";

// import GlobalCommandPalette from "@/components/navigation/GlobalCommandPalette";


interface UniversalHeaderProps {
  viewMode?: 'admin' | 'member';
  onViewModeChange?: (mode: 'admin' | 'member') => void;
}

export const UniversalHeader = ({ viewMode, onViewModeChange }: UniversalHeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const location = useLocation();
  const { userProfile } = useUserProfile(user);
  const { pageName } = usePageTitle();
  
  
  // Check if user has PR access (PR coordinator or admin)
  const isAdmin = userProfile?.is_admin === true || userProfile?.is_super_admin === true || userProfile?.is_exec_board === true;
  const isPRCoordinator = userProfile?.exec_board_role === 'pr_coordinator';
  const canAccessPR = isAdmin || isPRCoordinator;
  const isExecBoardMember = userProfile?.exec_board_role && userProfile.exec_board_role.trim() !== '';
  const hasExecBoardPerms = isAdmin || isExecBoardMember;
  
  console.log('UniversalHeader: PR Access Debug', { 
    userProfile: userProfile, 
    isAdmin: isAdmin, 
    isPRCoordinator: isPRCoordinator, 
    canAccessPR: canAccessPR,
    userRole: userProfile?.role,
    execBoardRole: userProfile?.exec_board_role
  });

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
    <>
      <header className="bg-background/95 backdrop-blur-xl border-b border-border sticky top-0 z-50 shadow-lg supports-[backdrop-filter]:bg-background/90">
          <div className="container mx-auto px-2 sm:px-4 lg:px-6 flex justify-center">
            <div className="flex items-center justify-between w-full max-w-7xl min-h-12 sm:min-h-14 md:min-h-16 py-2 sm:py-2.5 md:py-3">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-5 min-w-0 flex-1">
            <EnhancedTooltip 
              content="Go to GleeWorld Home" 
              disabled={isMobile || location.pathname === '/admin'}
              className="z-10"
            >
              <div className="flex items-center gap-1 flex-shrink-0">
                <Link to="/" className="flex items-center gap-1 hover:scale-105 transition-transform duration-200 relative">
                  <div className="relative">
                    <img 
                      src="/lovable-uploads/80d39e41-12f3-4266-8d7a-b1d3621bbf58.png" 
                      alt="Spelman College Glee Club" 
                      className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain flex-shrink-0 drop-shadow-md relative"
                    />
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur opacity-50 pointer-events-none"></div>
                  </div>
                  <span className="text-foreground font-bold text-base sm:text-lg md:text-xl lg:text-2xl whitespace-nowrap drop-shadow-sm relative">
                    GleeWorld
                  </span>
                </Link>
                <div className="flex items-center gap-2">
                  <HeaderClock className="text-sm ml-2 md:ml-4" />
                </div>
              </div>
            </EnhancedTooltip>
            
          </div>

          {/* Mobile Navigation Menu - Removed */}

          {/* Mobile spacer */}
          <div className="flex-1 md:hidden"></div>

          {/* Right side actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-5">
            <HeaderRadioControls />
            <MusicalToolkit />
            
            {user && (
              <>
                {/* Keep dashboard switcher as secondary navigation */}
                  <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 p-0 rounded-md hover:bg-accent/20"
                        type="button"
                      >
                        <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                      </Button>
                   </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-background border border-border shadow-2xl z-[1100]" align="end">
                    <DropdownMenuLabel>Quick Access</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {/* Main Dashboard Views */}
                    {isAdmin && (
                      <DropdownMenuItem 
                        onClick={() => navigate('/dashboard')}
                        className="cursor-pointer"
                      >
                        <User className="mr-2 h-4 w-4" />
                        My Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => navigate('/dashboard/member')}
                      className="cursor-pointer"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Member
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate('/dashboard/student')}
                      className="cursor-pointer"
                    >
                      <GraduationCap className="mr-2 h-4 w-4" />
                      Student
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate('/dashboard/fan')}
                      className="cursor-pointer"
                    >
                      <Heart className="mr-2 h-4 w-4" />
                      Fan
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate('/alumnae')}
                      className="cursor-pointer"
                    >
                      <GraduationCap className="mr-2 h-4 w-4" />
                      Alumnae
                    </DropdownMenuItem>
                    {hasExecBoardPerms && (
                      <DropdownMenuItem 
                        onClick={() => navigate('/admin')}
                        className="cursor-pointer"
                      >
                        <Crown className="mr-2 h-4 w-4" />
                        Admin
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                    {/* Public Pages */}
                    <DropdownMenuItem 
                      onClick={() => navigate('/')}
                      className="cursor-pointer"
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      Landing Page
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        navigate('/glee-academy');
                        window.scrollTo(0, 0);
                      }}
                      className="cursor-pointer"
                    >
                      <GraduationCap className="mr-2 h-4 w-4" />
                      Glee Academy
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate('/dashboard/public')}
                      className="cursor-pointer"
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      Public View
                    </DropdownMenuItem>
                    
                    {/* Executive Board Dropdown */}
                    {hasExecBoardPerms && <ExecutiveBoardDropdown />}
                  </DropdownMenuContent>
                </DropdownMenu>

                
                {/* PR Camera Quick Capture */}
                {canAccessPR && (
                  <EnhancedTooltip content="PR Quick Capture - Take photo instantly">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Camera button clicked - navigating to PR Hub');
                        // Set flag in sessionStorage for backup trigger method
                        sessionStorage.setItem('trigger-pr-quick-capture', 'true');
                        navigate('/pr-hub');
                        // Trigger quick capture after navigation with longer delay to ensure component is mounted
                        setTimeout(() => {
                          console.log('Dispatching trigger-pr-quick-capture event');
                          window.dispatchEvent(new CustomEvent('trigger-pr-quick-capture'));
                        }, 500);
                      }}
                      className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 p-0 rounded-full hover:bg-accent/20"
                      type="button"
                    >
                      <img 
                        src="/lovable-uploads/a9348c2b-145b-4530-a755-80ee32c5bf6f.png" 
                        alt="Camera" 
                        className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 filter"
                        style={{ filter: 'brightness(0) saturate(100%) invert(21%) sepia(100%) saturate(4274%) hue-rotate(220deg) brightness(91%) contrast(91%)' }}
                      />
                    </Button>
                  </EnhancedTooltip>
                )}
                
                 <DropdownMenu>
                   <EnhancedTooltip content="Profile menu">
                      <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-full p-0" type="button">
                           <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 border-2 border-border/30">
                             <AvatarImage 
                               src={userProfile?.avatar_url || undefined} 
                               alt={userProfile?.full_name || user?.email || "Your Profile"}
                               className="object-cover"
                               onError={(e) => {
                                 console.log('Avatar image failed to load:', userProfile?.avatar_url);
                                 e.currentTarget.style.display = 'none';
                               }}
                               onLoad={() => {
                                 console.log('Avatar image loaded successfully:', userProfile?.avatar_url);
                               }}
                             />
                             <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold relative">
                               {userProfile?.full_name ? 
                                 userProfile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() :
                                 user?.email?.charAt(0).toUpperCase() || 'U'
                               }
                             </AvatarFallback>
                           </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                   </EnhancedTooltip>
                    <DropdownMenuContent className="w-48 py-1 bg-background shadow-2xl border border-border z-[1100]" align="end" forceMount>
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
                        <Link 
                          to="/profile" 
                          className="flex items-center"
                          onClick={(e) => {
                            console.log('🔗 Profile link clicked in header');
                            console.log('🔗 Event details:', e);
                            console.log('🔗 Current location:', location.pathname);
                            console.log('🔗 User:', user);
                            console.log('🔗 UserProfile:', userProfile);
                          }}
                        >
                          <User className="mr-1.5 h-3 w-3" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                       <DropdownMenuItem asChild className="py-1.5 text-xs">
                         <Link to="/settings" className="flex items-center">
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
              <EnhancedTooltip content="Sign in to access your dashboard">
                <Button asChild variant="default" size="sm" className="text-xs sm:text-sm px-3 sm:px-6 min-w-[70px] sm:min-w-[80px] whitespace-nowrap">
                  <Link to="/auth">Sign In</Link>
                </Button>
              </EnhancedTooltip>
            )}
          </div>
            </div>
          </div>
        </header>
    </>
  );
};
