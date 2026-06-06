import React from 'react';
import { MessageCircle, Bell, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AnnouncementsDisplay } from './AnnouncementsDisplay';

interface DashboardHeaderProps {
  user: any;
  onToggleMessages: () => void;
  showMessages: boolean;
}

export const DashboardHeader = ({ user, onToggleMessages, showMessages }: DashboardHeaderProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header 
      className="backdrop-blur-sm border-b border-border px-4 lg:px-6 flex items-center justify-between relative overflow-hidden z-40 bg-gradient-to-r from-[#0066CC] via-[#0077DD] to-[#0088EE]"
      style={{ 
        paddingTop: 'max(env(safe-area-inset-top), 0.25rem)',
        minHeight: 'calc(3.75rem + env(safe-area-inset-top, 0px))'
      }}
    >
      {/* Left side - Logo and branding */}
      <div className="flex items-center gap-4 lg:gap-6 relative z-10">
        <div className="flex items-center gap-2 lg:gap-3">
          <img 
            src="/lovable-uploads/gleeworld-logo.png" 
            alt="GleeWorld" 
            className="w-12 h-12 lg:w-16 lg:h-16 object-contain drop-shadow-md"
          />
          <div>
            <h1 className="text-lg lg:text-2xl xl:text-4xl font-bold font-['Cinzel'] tracking-wide text-white">
              Portal
            </h1>
            <p className="text-[10px] lg:text-xs font-['Dancing_Script'] lg:text-base italic text-white/80">
              Your favorite band or choir
            </p>
          </div>
        </div>
      </div>

      {/* Center - Announcements ticker */}
      <AnnouncementsDisplay />

      {/* Right side - Actions and profile */}
      <div className="flex items-center gap-2 relative z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMessages}
          className={`relative h-10 w-10 p-0 ${showMessages ? 'bg-muted' : ''}`}
        >
          <MessageCircle className="h-5 w-5" />
          <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]">
            3
          </Badge>
        </Button>

        <Button variant="ghost" size="icon" className="h-10 w-10 p-0">
          <Bell className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" className="h-10 w-10 p-0">
          <Settings className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 pl-3 ml-1 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-tight">
              {user?.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              {user?.email}
            </p>
          </div>
          
          <Avatar className="h-9 w-9 ring-2 ring-border/50">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
              {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleSignOut}
            className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
