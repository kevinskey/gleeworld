
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Menu, X, CheckCircle, Clock, MessageSquare, Info, AlertCircle, Eye, Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { format } from "date-fns";
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
  isRadioPlaying?: boolean;
  onRadioToggle?: () => void;
  onToggleMessages?: () => void;
  showMessages?: boolean;
}

const PersistentHeader = ({ activeTab, onTabChange, onToggleMessages, showMessages }: HeaderProps) => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewCount, setViewCount] = useState(1247);
  const navigate = useNavigate();

  const [hideForAnnotation, setHideForAnnotation] = useState(false);
  useEffect(() => {
    const handler = (e: any) => setHideForAnnotation(!!e.detail?.active);
    window.addEventListener('annotationModeChange', handler as any);
    setHideForAnnotation(document.body.classList.contains('annotation-mode'));
    return () => window.removeEventListener('annotationModeChange', handler as any);
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className={`sticky top-0 z-50 w-full border-b border-border bg-gradient-to-r from-primary/10 via-background to-secondary/10 backdrop-blur-sm shadow-sm ${hideForAnnotation ? 'hidden' : ''}`}>
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left Section - Logo & Branding */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            {/* GleeWorld Logo */}
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">GW</span>
            </div>
            
            {/* Branding Text */}
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-primary">GleeWorld</h1>
              <p className="text-xs text-muted-foreground">Spelman College Glee Club</p>
            </div>
          </div>
        </div>

        {/* Center Section - Clock & Views */}
        <div className="flex items-center space-x-6">
          {/* Live Clock */}
          <div className="flex items-center space-x-2 bg-background/50 px-3 py-1 rounded-lg border">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono">
              {format(currentTime, 'h:mm:ss a')}
            </span>
          </div>
          
          {/* Views Counter */}
          <div className="flex items-center space-x-2 bg-background/50 px-3 py-1 rounded-lg border">
            <Eye className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium">{viewCount.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">views</span>
          </div>
        </div>

        {/* Right Section - User Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            <Badge className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs">
              3
            </Badge>
          </Button>

          {/* Messages Toggle */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleMessages}
            className={showMessages ? "bg-primary/10" : ""}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={userProfile?.headshot_url || ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userProfile?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium">{userProfile?.display_name || userProfile?.first_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{userProfile?.role || 'Member'}</p>
                </div>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export const Header = ({ activeTab, onTabChange, isRadioPlaying = false, onRadioToggle, onToggleMessages, showMessages = false }: HeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userProfile, displayName } = useUserProfile(user);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [hideForAnnotation, setHideForAnnotation] = useState(false);
  useEffect(() => {
    const handler = (e: any) => setHideForAnnotation(!!e.detail?.active);
    window.addEventListener('annotationModeChange', handler as any);
    setHideForAnnotation(document.body.classList.contains('annotation-mode'));
    return () => window.removeEventListener('annotationModeChange', handler as any);
  }, []);
  
  // Notifications hook
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // Helper function to get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'sms_notification':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

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
  const isOnUserDashboard = location.pathname.startsWith('/dashboard/member-view/');

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
    if (location.pathname.startsWith('/dashboard/member-view/')) {
      // Get the user profile to determine the correct dashboard type
      if (userProfile?.is_exec_board) return 'Executive Board Dashboard';
      if (userProfile?.role === 'alumnae') return 'Alumnae Dashboard'; 
      if (userProfile?.role === 'auditioner') return 'Auditioner Dashboard';
      return 'Member Dashboard';
    }
    if (location.pathname === '/admin/alumnae') return 'Alumnae Portal Admin';
    if (location.pathname === '/dashboard') return 'Admin Panel';
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
    <header className={`glass-nav sticky top-0 z-50 ${hideForAnnotation ? 'hidden' : ''}`}>
      <div className="container mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-18">
          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary truncate">
              GleeWorld
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
                {!isOnUserDashboard && <div className="h-6 w-px bg-border mx-2" />}
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
            {/* Messages Toggle */}
            {onToggleMessages && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleMessages}
                className={`relative text-primary hover:bg-primary/10 ${showMessages ? 'bg-primary/20' : ''}`}
              >
                <MessageSquare className="w-4 h-4" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            )}

            {/* Dashboard Views Dropdown - Only for admins */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="text-primary hover:bg-primary/20 bg-background/90 backdrop-blur-sm border border-primary/50 shadow-lg hidden lg:flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">{getCurrentDashboardView()}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-56 bg-background shadow-lg border border-border z-50" 
                  align="end"
                >
                  {dashboardViews.map((view) => (
                    <DropdownMenuItem 
                      key={view.id}
                      onClick={() => navigate(view.route)}
                      className="cursor-pointer hover:bg-muted"
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
                <SheetContent side="right" className="w-80 bg-gradient-to-br from-primary via-primary to-primary/90 border-l border-border">
                  <SheetHeader>
                    <SheetTitle className="text-primary-foreground text-left">Navigation</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-2">
                    {/* Dashboard Views in Mobile Menu */}
                    {isAdmin && (
                      <>
                        <div className="text-primary-foreground/80 text-sm font-medium px-3 mb-2">Dashboard Views</div>
                        {dashboardViews.map((view) => (
                          <Button
                            key={view.id}
                            variant="ghost"
                            onClick={() => handleMobileNavClick('', view.route)}
                            className={`w-full justify-start text-primary-foreground hover:bg-primary-foreground/20 h-12 ${
                              location.pathname === view.route ? 'bg-primary-foreground/20' : ''
                            }`}
                          >
                            <view.icon className="h-5 w-5 mr-3" />
                            <span className="text-base">{view.label}</span>
                          </Button>
                        ))}
                        <div className="h-px bg-primary-foreground/20 my-3" />
                      </>
                    )}
                    
                    {/* Regular navigation items when on user dashboard */}
                    {isOnUserDashboard && navigationItems.map((item) => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        onClick={() => handleMobileNavClick(item.id)}
                        className={`w-full justify-start text-primary-foreground hover:bg-primary-foreground/20 h-12 ${
                          activeTab === item.id ? 'bg-primary-foreground/20' : ''
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
                          <div className="h-px bg-primary-foreground/20 my-3" />
                        )}
                        {isOnUserDashboard ? (
                          <Button
                            variant="ghost"
                            onClick={() => handleMobileNavClick('', '/dashboard')}
                            className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/20 bg-accent/30 h-12"
                          >
                            <UserCog className="h-5 w-5 mr-3" />
                            <span className="text-base">Admin Panel</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            onClick={() => handleMobileNavClick('', '/dashboard')}
                            className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/20 bg-secondary/30 h-12"
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
                            className={`w-full justify-start text-primary-foreground hover:bg-primary-foreground/20 h-12 ${
                              location.pathname === item.route ? 'bg-primary-foreground/20' : ''
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
                    <AvatarFallback className="bg-primary text-primary-foreground">
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
