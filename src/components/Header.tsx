
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
import { useNavigate } from "react-router-dom";
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
  X
} from "lucide-react";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  const { user } = useAuth();
  const { userProfile, displayName } = useUserProfile(user);
  const navigate = useNavigate();
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

  const userItems = [
    { id: 'user-dashboard', label: 'My Dashboard', icon: User, route: '/dashboard' },
  ];

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">Contract Manager</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
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

            {/* User Dashboard Link */}
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="text-white hover:bg-white/20"
            >
              <User className="h-4 w-4 mr-2" />
              My Dashboard
            </Button>

            {/* Admin Items */}
            {isAdmin && (
              <>
                <div className="h-6 w-px bg-white/20 mx-2" />
                {adminItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    onClick={() => navigate(item.route)}
                    className="text-white hover:bg-white/20"
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                ))}
              </>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white hover:bg-white/20"
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
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>My Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
          <div className="md:hidden py-4 border-t border-white/20">
            <nav className="flex flex-col space-y-2">
              {navigationItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`justify-start text-white hover:bg-white/20 ${
                    activeTab === item.id ? 'bg-white/20' : ''
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              ))}

              <Button
                variant="ghost"
                onClick={() => {
                  navigate('/dashboard');
                  setMobileMenuOpen(false);
                }}
                className="justify-start text-white hover:bg-white/20"
              >
                <User className="h-4 w-4 mr-2" />
                My Dashboard
              </Button>

              {isAdmin && (
                <>
                  <div className="h-px bg-white/20 my-2" />
                  {adminItems.map((item) => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      onClick={() => {
                        navigate(item.route);
                        setMobileMenuOpen(false);
                      }}
                      className="justify-start text-white hover:bg-white/20"
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Button>
                  ))}
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
