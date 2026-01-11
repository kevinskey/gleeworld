import React from 'react';
import { MessageCircle, Bell, Settings, LogOut, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AnnouncementsDisplay } from './AnnouncementsDisplay';
import { useTheme } from '@/contexts/ThemeContext';

interface DashboardHeaderProps {
  user: any;
  onToggleMessages: () => void;
  showMessages: boolean;
}

export const DashboardHeader = ({ user, onToggleMessages, showMessages }: DashboardHeaderProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { themeName } = useTheme();
  
  const isSpelmanBlue = themeName === 'spelman-blue';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header 
      className={`backdrop-blur-sm border-b border-border px-4 lg:px-6 flex items-center justify-between relative overflow-hidden z-40 ${
        isSpelmanBlue 
          ? 'bg-gradient-to-r from-[#0066CC] via-[#0077DD] to-[#0088EE]' 
          : 'bg-gradient-to-r from-primary/10 via-background to-destructive/10'
      }`}
      style={{ 
        paddingTop: 'max(env(safe-area-inset-top), 0.25rem)',
        minHeight: 'calc(3.75rem + env(safe-area-inset-top, 0px))'
      }}
    >
      {/* Holiday sparkle accents - hide for Spelman Blue */}
      {!isSpelmanBlue && (
        <div className="absolute inset-0 pointer-events-none">
          <Sparkles className="absolute top-2 left-[10%] w-3 h-3 lg:w-4 lg:h-4 text-amber-400/60 animate-pulse" />
          <Sparkles className="absolute top-3 left-[30%] w-2 h-2 lg:w-3 lg:h-3 text-destructive/40 animate-pulse delay-300" />
          <Sparkles className="absolute bottom-2 right-[20%] w-3 h-3 lg:w-4 lg:h-4 text-emerald-500/50 animate-pulse delay-500" />
          <Sparkles className="absolute top-2 right-[40%] w-2 h-2 lg:w-3 lg:h-3 text-amber-400/50 animate-pulse delay-700" />
        </div>
      )}

      {/* Left side - Logo and branding - smaller on tablet */}
      <div className="flex items-center gap-4 lg:gap-6 relative z-10">
        <div className="flex items-center gap-2 lg:gap-3">
          <img 
            src="/lovable-uploads/gleeworld-logo.png" 
            alt="GleeWorld" 
            className="w-12 h-12 lg:w-16 lg:h-16 object-contain drop-shadow-md"
          />
          <div>
            <h1 className="text-lg lg:text-2xl xl:text-4xl font-bold font-['Cinzel'] tracking-wide flex items-center gap-1 lg:gap-2">
              <span className={isSpelmanBlue ? 'text-white' : 'bg-gradient-to-r from-primary via-destructive to-emerald-600 bg-clip-text text-transparent'}>
                {isSpelmanBlue ? 'Portal' : 'GleeWorld'}
              </span>
              {!isSpelmanBlue && <span className="text-amber-500 text-xs lg:text-sm">✨</span>}
            </h1>
            <p className={`text-[10px] lg:text-xs font-['Dancing_Script'] lg:text-base italic ${isSpelmanBlue ? 'text-white/80' : 'text-muted-foreground'}`}>
              {isSpelmanBlue ? 'Spelman College Glee Club' : 'Season of Joy & Song'}
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
          
          <Avatar className="h-9 w-9 ring-2 ring-amber-400/30">
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