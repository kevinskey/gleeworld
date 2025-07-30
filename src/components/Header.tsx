
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Menu, X, Bell } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  Library, 
  Calculator, 
  User, 
  Settings, 
  LogOut, 
  Shield,
  Activity,
  FileText,
  UserCog,
  ChevronDown,
  GraduationCap
} from "lucide-react";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userProfile, displayName } = useUserProfile(user);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPRCapture, setShowPRCapture] = useState(false);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super-admin';
  const isPRCoordinator = userProfile?.exec_board_role === 'pr_coordinator';
  const canAccessPR = isAdmin || isPRCoordinator;
  const isSuperAdmin = userProfile?.role === 'super-admin';
  const isOnUserDashboard = location.pathname === '/dashboard';

  console.log('Header - userProfile:', userProfile);
  console.log('Header - userProfile avatar_url:', userProfile?.avatar_url);
  console.log('Header - isAdmin:', isAdmin);
  console.log('Header - isPRCoordinator:', isPRCoordinator);
  console.log('Header - canAccessPR:', canAccessPR);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
  ];

  const adminItems = [
    
  ];

  // Dashboard views for super-admin dropdown
  const dashboardViews = [
    { id: 'personal', label: 'Personal Dashboard', icon: User, route: '/dashboard' },
    { id: 'admin', label: 'Admin Panel', icon: Shield, route: '/dashboard' },
    ...(isSuperAdmin ? [{ id: 'alumnae', label: 'Alumnae Portal Admin', icon: GraduationCap, route: '/admin/alumnae' }] : [])
  ];

  const getCurrentDashboardView = () => {
    if (location.pathname === '/dashboard') return 'Personal Dashboard';
    
    if (location.pathname === '/admin/alumnae') return 'Alumnae Portal Admin';
    return 'Dashboard';
  };

  const handleMobileNavClick = (itemId: string, route?: string) => {
    if (route) {
      navigate(route);
    } else {
      onTabChange(itemId);
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-18">
          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary truncate">
              Contract Manager
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {/* Regular navigation items when on user dashboard */}
            {isOnUserDashboard && navigationItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => onTabChange(item.id)}
                  className={`text-primary hover:bg-primary/10 border transition-colors ${
                    activeTab === item.id ? 'bg-primary/20 border-primary/30' : 'border-transparent'
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
            ))}

            {/* Dashboard Toggle for Admins */}
            {isAdmin && (
              <>
                {!isOnUserDashboard && <div className="h-6 w-px bg-white/20 mx-2" />}
                {isOnUserDashboard ? (
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/dashboard')}
                    className="text-primary hover:bg-secondary/20 bg-secondary/10 border border-secondary/30"
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/dashboard')}
                    className="text-primary hover:bg-accent/20 bg-accent/10 border border-accent/30"
                  >
                    <User className="h-4 w-4 mr-2" />
                    My Dashboard
                  </Button>
                )}
              </>
            )}

            {/* Admin Items - only show if admin and not on user dashboard */}
            {isAdmin && !isOnUserDashboard && (
              <>
                {adminItems.map((item) => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      onClick={() => navigate(item.route)}
                      className={`text-primary hover:bg-primary/10 border transition-colors ${
                        location.pathname === item.route ? 'bg-primary/20 border-primary/30' : 'border-transparent'
                      }`}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Button>
                ))}
              </>
            )}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3">
            {/* Notification Bell */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative gap-1 sm:gap-2 text-primary hover:bg-primary/10 border border-transparent hover:border-primary/30 h-8 w-8 sm:h-10 sm:w-10 lg:h-auto lg:w-auto lg:px-3"
              title="Notifications"
            >
              <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden lg:inline text-sm">Notifications</span>
              {/* Notification badge - uncomment when you have notification count */}
              {/* <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span> */}
            </Button>

            {/* PR Camera Quick Capture - Responsive sizing */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                console.log('Header camera button clicked - navigating to PR Hub');
                console.log('Current user:', user);
                console.log('Navigation function available:', typeof navigate);
                navigate('/dashboard/pr-hub');
              }}
              className="gap-1 sm:gap-2 text-primary hover:bg-primary/10 border-2 border-primary/50 bg-primary/5 h-8 sm:h-10 px-2 sm:px-3 lg:px-4"
              title="PR Quick Capture - Click to access camera"
            >
              <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">📸 Camera</span>
            </Button>
            
            {/* Dashboard Views Dropdown - Only for admins */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="text-primary hover:bg-primary/10 border border-primary/30 hidden lg:flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">{getCurrentDashboardView()}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-56 bg-white shadow-lg border border-gray-200 z-50" 
                  align="end"
                >
                  {dashboardViews.map((view) => (
                    <DropdownMenuItem 
                      key={view.id}
                      onClick={() => navigate(view.route)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <view.icon className="mr-2 h-4 w-4" />
                      <span>{view.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary hover:bg-primary/10 border border-primary/30 h-8 w-8 sm:h-10 sm:w-10"
                  >
                    <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 bg-gradient-to-br from-brand-700 via-brand-800 to-slate-900 border-l border-white/20">
                  <SheetHeader>
                    <SheetTitle className="text-white text-left">Navigation</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-2">
                    {/* Dashboard Views in Mobile Menu */}
                    {isAdmin && (
                      <>
                        <div className="text-white/80 text-sm font-medium px-3 mb-2">Dashboard Views</div>
                        {dashboardViews.map((view) => (
                          <Button
                            key={view.id}
                            variant="ghost"
                            onClick={() => handleMobileNavClick('', view.route)}
                            className={`w-full justify-start text-white hover:bg-white/20 h-12 ${
                              location.pathname === view.route ? 'bg-white/20' : ''
                            }`}
                          >
                            <view.icon className="h-5 w-5 mr-3" />
                            <span className="text-base">{view.label}</span>
                          </Button>
                        ))}
                        <div className="h-px bg-white/20 my-3" />
                      </>
                    )}
                    
                    {/* Regular navigation items when on user dashboard */}
                    {isOnUserDashboard && navigationItems.map((item) => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        onClick={() => handleMobileNavClick(item.id)}
                        className={`w-full justify-start text-white hover:bg-white/20 h-12 ${
                          activeTab === item.id ? 'bg-white/20' : ''
                        }`}
                      >
                        <item.icon className="h-5 w-5 mr-3" />
                        <span className="text-base">{item.label}</span>
                      </Button>
                    ))}

                    {/* Mobile Dashboard Toggle - Keep for backward compatibility */}
                    {isAdmin && (
                      <>
                        {(isOnUserDashboard || !isOnUserDashboard) && (
                          <div className="h-px bg-white/20 my-3" />
                        )}
                        {isOnUserDashboard ? (
                          <Button
                            variant="ghost"
                            onClick={() => handleMobileNavClick('', '/dashboard')}
                            className="w-full justify-start text-white hover:bg-white/20 bg-blue-500/30 h-12"
                          >
                            <UserCog className="h-5 w-5 mr-3" />
                            <span className="text-base">Admin Panel</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            onClick={() => handleMobileNavClick('', '/dashboard')}
                            className="w-full justify-start text-white hover:bg-white/20 bg-green-500/30 h-12"
                          >
                            <User className="h-5 w-5 mr-3" />
                            <span className="text-base">My Dashboard</span>
                          </Button>
                        )}

                        {/* Mobile Admin Items */}
                        {!isOnUserDashboard && adminItems.map((item) => (
                          <Button
                            key={item.id}
                            variant="ghost"
                            onClick={() => handleMobileNavClick('', item.route)}
                            className={`w-full justify-start text-white hover:bg-white/20 h-12 ${
                              location.pathname === item.route ? 'bg-white/20' : ''
                            }`}
                          >
                            <item.icon className="h-5 w-5 mr-3" />
                            <span className="text-base">{item.label}</span>
                          </Button>
                        ))}
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* User Avatar and Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-6 w-6 sm:h-8 sm:w-8 rounded-full">
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                    <AvatarImage 
                      src={userProfile?.avatar_url || undefined} 
                      alt={displayName}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-spelman-500 text-white">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-background shadow-lg border border-border z-[60]" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    {userProfile?.role && userProfile.role !== 'user' && (
                      <p className="text-xs text-blue-600 font-medium capitalize">{userProfile.role}</p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                
                {/* Dashboard Toggle in Dropdown */}
                {isAdmin && (
                  <>
                    {isOnUserDashboard ? (
                      <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                        <UserCog className="mr-2 h-4 w-4" />
                        <span>Admin Panel</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                        <User className="mr-2 h-4 w-4" />
                        <span>My Dashboard</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};
