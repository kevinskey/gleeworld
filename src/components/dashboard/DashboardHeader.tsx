import React from 'react';
import { MessageCircle, Bell, Settings, LogOut, Sparkles } from 'lucide-react';
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
    <header className="h-20 bg-gradient-to-r from-primary/10 via-background to-destructive/10 backdrop-blur-sm border-b border-border px-6 flex items-center justify-between relative overflow-hidden">
      {/* Holiday sparkle accents */}
      <div className="absolute inset-0 pointer-events-none">
        <Sparkles className="absolute top-2 left-[10%] w-4 h-4 text-amber-400/60 animate-pulse" />
        <Sparkles className="absolute top-4 left-[30%] w-3 h-3 text-destructive/40 animate-pulse delay-300" />
        <Sparkles className="absolute bottom-3 right-[20%] w-4 h-4 text-emerald-500/50 animate-pulse delay-500" />
        <Sparkles className="absolute top-3 right-[40%] w-3 h-3 text-amber-400/50 animate-pulse delay-700" />
      </div>

      {/* Left side - Logo and branding */}
      <div className="flex items-center gap-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-destructive via-primary to-emerald-600 rounded-xl flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg ring-2 ring-amber-400/30">
            <span className="font-['Cinzel'] text-xl">G</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-['Cinzel'] tracking-wide flex items-center gap-2">
              <span className="bg-gradient-to-r from-primary via-destructive to-emerald-600 bg-clip-text text-transparent">
                GleeWorld
              </span>
              <span className="text-amber-500 text-sm">✨</span>
            </h1>
            <p className="text-xs text-muted-foreground font-['Dancing_Script'] text-base italic">
              Season of Joy & Song
            </p>
          </div>
        </div>
      </div>

      {/* Center - Announcements ticker */}
      <AnnouncementsDisplay />

      {/* Right side - Actions and profile */}
      <div className="flex items-center gap-4 relative z-10">
        <Button
          variant="ghost"
          size="default"
          onClick={onToggleMessages}
          className={`relative h-9 px-6 ${showMessages ? 'bg-muted' : ''}`}
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Messages
          <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs">
            3
          </Badge>
        </Button>

        <Button variant="ghost" size="sm">
          <Bell className="w-5 h-5" />
        </Button>

        <Button variant="ghost" size="sm">
          <Settings className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              {user?.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>
          
          <Avatar className="w-10 h-10 ring-2 ring-amber-400/30">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};