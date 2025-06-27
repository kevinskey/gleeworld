
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
  Users,
  FileText,
  Menu,
  X,
  UserCog
} from "lucide-react";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  const { user } = useAuth();
  const { userProfile, displayName } = useUserProfile(user);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  const isOnUserDashboard = location.pathname === '/dashboard';
  const isOnAdminPage = ['/system', '/activity-logs', '/accounting', '/admin-signing'].includes(location.pathname);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'finance', label: 'Finance', icon: Calculator },
  ];

  const adminItems = [
    { id: 'system', label: 'System', icon: Settings, route: '/system' },
    { id: 'activity', label: 'Activity', icon: Activity, route: '/activity-logs' },
    { id: 'accounting', label: 'Accounting', icon: FileText, route: '/accounting' },
    { id: 'admin-signing', label: 'Admin Signing', icon: Shield, route: '/admin-signing' },
  ];

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl md:text-2xl font-bold text-white truncate">
              Contract Manager
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {/* Only show regular navigation items when on user dashboard */}
            {isOnUserDashboard && navigationItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => onTabChange(item.id)}
                className={`text-white hover:bg-white/20 ${
                  activeTab === item.id ? 'bg-white/20' : ''
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
                    onClick={() => navigate('/system')}
                    className="text-white hover:bg-white/20 bg-blue-500/30"
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/dashboard')}
                    className="text-white hover:bg-white/20 bg-green-500/30"
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
                    className={`text-white hover:bg-white/20 ${
                      location.pathname === item.route ? 'bg-white/20' : ''
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                ))}
              </>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white hover:bg-white/20 h-10 w-10"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* User Avatar and Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-spelman-500 text-white">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
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
                      <DropdownMenuItem onClick={() => navigate('/system')}>
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/20">
            <div className="px-2 py-4 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
              {/* Only show regular navigation items when on user dashboard */}
              {isOnUserDashboard && navigationItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full justify-start text-white hover:bg-white/20 h-12 ${
                    activeTab === item.id ? 'bg-white/20' : ''
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  <span className="text-base">{item.label}</span>
                </Button>
              ))}

              {/* Mobile Dashboard Toggle */}
              {isAdmin && (
                <>
                  {(isOnUserDashboard || !isOnUserDashboard) && (
                    <div className="h-px bg-white/20 my-3" />
                  )}
                  {isOnUserDashboard ? (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        navigate('/system');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full justify-start text-white hover:bg-white/20 bg-blue-500/30 h-12"
                    >
                      <UserCog className="h-5 w-5 mr-3" />
                      <span className="text-base">Admin Panel</span>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        navigate('/dashboard');
                        setMobileMenuOpen(false);
                      }}
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
                      onClick={() => {
                        navigate(item.route);
                        setMobileMenuOpen(false);
                      }}
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
          </div>
        )}
      </div>
    </header>
  );
};
