import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare, Eye, Bell, User, Settings, LogOut, ChevronDown, GraduationCap, Landmark } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";

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

  // Fetch courses for Glee Academy dropdown
  const { data: courses = [] } = useQuery({
    queryKey: ['glee-academy-courses-header'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_courses')
        .select('id, title, course_code')
        .eq('is_active', true)
        .order('title', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  // Update clock every second
  useEffect(() => {
    // Initialize with current time
    setCurrentTime(new Date());
    
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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white shadow-sm">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Left Section - Logo & Branding */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            {/* GleeWorld Logo */}
            <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-base md:text-lg">GW</span>
            </div>
            
            {/* Branding Text */}
            <div className="flex flex-col">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">GleeWorld</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Spelman College Glee Club</p>
            </div>
          </div>
        </div>

        {/* Center Section - Clock & Views */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Live Clock */}
          <div className="flex items-center gap-1.5 md:gap-2 bg-muted px-2 md:px-3 py-1 rounded-lg border">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-foreground" />
            <span className="text-xs md:text-sm font-mono text-foreground">
              {format(currentTime, 'h:mm:ss a')}
            </span>
          </div>
          
          {/* Views Counter */}
          <div className="hidden md:flex items-center gap-2 bg-muted px-3 py-1 rounded-lg border">
            <Eye className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium text-foreground">{viewCount.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">views</span>
          </div>
        </div>

        {/* Right Section - User Actions */}
        <div className="flex items-center gap-2 md:gap-3 lg:gap-5">
          {/* Institute Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="shrink-0"
            onClick={() => navigate('/institute')}
          >
            <Landmark className="w-7 h-7 stroke-[1.5]" />
          </Button>

          {/* Glee Academy Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0">
                <GraduationCap className="w-7 h-7 stroke-[1.5]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background">
              <DropdownMenuItem 
                onClick={() => navigate('/glee-academy')} 
                className="cursor-pointer font-medium"
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                Glee Academy Home
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {courses.map((course) => (
                <DropdownMenuItem 
                  key={course.id}
                  onClick={() => navigate(`/academy/${course.course_code?.toLowerCase().replace(' ', '-')}`)}
                  className="cursor-pointer"
                >
                  <span className="text-xs text-muted-foreground mr-2">{course.course_code}</span>
                  {course.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative shrink-0">
            <Bell className="w-7 h-7 stroke-[1.5]" />
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
              className={`shrink-0 ${showMessages ? "bg-primary/10" : ""}`}
            >
              <MessageSquare className="w-7 h-7 stroke-[1.5]" />
            </Button>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2 shrink-0">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={userProfile?.headshot_url || ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userProfile?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{userProfile?.display_name || userProfile?.first_name || 'User'}</p>
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