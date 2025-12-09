
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, User, Settings, Menu, Home, LayoutDashboard, Camera, Shield, Crown, Globe, Heart, GraduationCap, Music, Search, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AppNavigation } from "@/components/navigation/AppNavigation";
import { useTheme } from "@/contexts/ThemeContext";

import { DashboardSwitcher } from "@/components/navigation/DashboardSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { HeaderClock } from "@/components/ui/header-clock";
import { HeaderRadioControls } from "@/components/radio/HeaderRadioControls";
import { CountdownText } from "@/components/ui/countdown-text";

import { MusicalToolkit } from "@/components/musical-toolkit/MusicalToolkit";
import { ExecutiveBoardDropdown } from "@/components/navigation/ExecutiveBoardDropdown";
import { QuickCaptureCategorySelector, QuickCaptureCategory } from "@/components/quick-capture/QuickCaptureCategorySelector";
import { CategorizedQuickCapture } from "@/components/quick-capture/CategorizedQuickCapture";

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
  const { themeName } = useTheme();
  
  // Quick Capture state
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<QuickCaptureCategory | null>(null);
  
  // HBCU Theme - Unified color palette
  const isHbcuTheme = themeName === 'hbcu';
  const hbcuColors = {
    gold: '#FFDF00',        // Primary gold - all text and icons
    red: '#8B0000',         // Dark red accent - borders
    background: '#000000',  // Pure black background
  };
  
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
        <div className="sticky top-0 z-50 w-full">
          <header 
            className={`border-b shadow-lg ${isHbcuTheme ? 'hbcu-header' : ''} relative overflow-hidden max-w-6xl mx-auto rounded-b-lg`}
            style={{ 
              backgroundColor: isHbcuTheme ? hbcuColors.background : '#ffffff',
              borderColor: isHbcuTheme ? hbcuColors.red : undefined,
              background: isHbcuTheme ? hbcuColors.background : 'linear-gradient(90deg, rgba(220,38,38,0.05) 0%, #ffffff 20%, #ffffff 80%, rgba(22,163,74,0.05) 100%)'
            }}
          >
            {/* Holiday sparkle accents */}
            {!isHbcuTheme && (
              <div className="absolute inset-0 pointer-events-none">
                <Sparkles className="absolute top-1.5 left-[8%] w-3 h-3 text-amber-400/50 animate-pulse" />
                <Sparkles className="absolute top-2 left-[25%] w-2 h-2 text-red-500/30 animate-pulse" style={{ animationDelay: '0.3s' }} />
                <Sparkles className="absolute bottom-2 right-[15%] w-3 h-3 text-emerald-500/40 animate-pulse" style={{ animationDelay: '0.5s' }} />
                <Sparkles className="absolute top-1.5 right-[35%] w-2 h-2 text-amber-400/40 animate-pulse" style={{ animationDelay: '0.7s' }} />
              </div>
            )}

            <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
            <div className="flex items-center justify-between w-full min-h-11 sm:min-h-12 md:min-h-14 lg:min-h-16 py-1.5 sm:py-2 md:py-2.5 lg:py-3">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-3 lg:gap-5 min-w-0 flex-1">
            <EnhancedTooltip 
              content="Go to GleeWorld Home" 
              disabled={isMobile || location.pathname === '/admin'}
              className="z-10"
            >
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <Link to="/" className="flex items-center gap-0.5 sm:gap-1 hover:scale-105 transition-transform duration-200 relative">
                  <div className="relative">
                    <img 
                      src="/lovable-uploads/80d39e41-12f3-4266-8d7a-b1d3621bbf58.png" 
                      alt="Spelman College Glee Club" 
                      className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 object-contain flex-shrink-0 drop-shadow-md"
                      style={isHbcuTheme ? { 
                        filter: 'brightness(0) saturate(100%) invert(88%) sepia(44%) saturate(1000%) hue-rotate(357deg) brightness(103%) contrast(106%)'
                      } : undefined}
                    />
                  </div>
                  <span 
                    className="font-bold text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl whitespace-nowrap relative" 
                    style={{ 
                      color: isHbcuTheme ? hbcuColors.gold : '#0f172a',
                      fontFamily: "'Cinzel', serif",
                      letterSpacing: '0.02em'
                    }}
                  >
                    GleeWorld
                    <span className="text-amber-500 ml-1 text-xs sm:text-sm">✨</span>
                  </span>
                </Link>
                <div className="flex items-center">
                  <HeaderClock className="text-xs sm:text-sm ml-0.5 sm:ml-2 md:ml-3 lg:ml-4" />
                </div>
              </div>
            </EnhancedTooltip>
            
          </div>

          {/* Mobile Navigation Menu - Removed */}

          {/* Mobile spacer */}
          <div className="flex-1 md:hidden"></div>

          {/* Right side actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-5">
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
                        className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 p-0 rounded-md hover:bg-white/10"
                        style={{ color: isHbcuTheme ? hbcuColors.gold : '#1e293b' }}
                        type="button"
                      >
                        <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
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

                
                {/* Glee Cam Quick Capture - Available to all authenticated users */}
                <EnhancedTooltip content="Glee Cam - Quick Capture">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Camera button clicked - showing category selector');
                      setShowCategorySelector(true);
                    }}
                    className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 p-0 rounded-full hover:opacity-90 flex items-center justify-center border-2 shadow-lg"
                    style={{ 
                      background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)',
                      borderColor: '#1d4ed8'
                    }}
                    type="button"
                  >
                    <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </Button>
                </EnhancedTooltip>
                
                 <DropdownMenu>
                   <EnhancedTooltip content="Profile menu">
                      <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="relative h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 rounded-full p-0 hover:bg-white/10" style={{ color: isHbcuTheme ? hbcuColors.gold : '#1e293b' }} type="button">
                           <Avatar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 border-2" style={{ borderColor: isHbcuTheme ? hbcuColors.red : undefined }}>
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
        </div>

      {/* Quick Capture Category Selector */}
      <QuickCaptureCategorySelector
        open={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        onSelectCategory={(category) => {
          setShowCategorySelector(false);
          setSelectedCategory(category);
        }}
      />

      {/* Categorized Quick Capture */}
      {selectedCategory && (
        <CategorizedQuickCapture
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
          onBack={() => {
            setSelectedCategory(null);
            setShowCategorySelector(true);
          }}
        />
      )}
    </>
  );
};
