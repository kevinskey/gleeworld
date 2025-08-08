import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare, Eye, Bell, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { format } from "date-fns";
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

interface PersistentHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onToggleMessages?: () => void;
  showMessages?: boolean;
}

export const PersistentHeader = ({ activeTab, onTabChange, onToggleMessages, showMessages }: PersistentHeaderProps) => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewCount, setViewCount] = useState(1247);
  const navigate = useNavigate();

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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-gradient-to-r from-primary/10 via-background to-secondary/10 backdrop-blur-sm shadow-sm">
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
          {onToggleMessages && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggleMessages}
              className={showMessages ? "bg-primary/10" : ""}
            >
              <MessageSquare className="w-5 h-5" />
            </Button>
          )}

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