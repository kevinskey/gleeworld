import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

export const UserHero = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);

  const getDisplayName = () => {
    return userProfile?.full_name || user?.email?.split('@')[0] || 'User';
  };

  const getRole = () => {
    if (userProfile?.is_super_admin) return 'Super Admin';
    if (userProfile?.is_admin) return 'Admin';
    return userProfile?.role || 'Member';
  };

  const getExecBoardRole = () => {
    if (!userProfile?.exec_board_role) return null;
    
    // Convert role to display format
    const roleMap: { [key: string]: string } = {
      'president': 'President',
      'vice_president': 'Vice President',
      'secretary': 'Secretary',
      'treasurer': 'Treasurer',
      'tour_manager': 'Tour Manager',
      'pr_coordinator': 'PR Coordinator',
      'music_director': 'Music Director',
      'librarian': 'Librarian',
      'wardrobe_manager': 'Wardrobe Manager',
      'chaplain': 'Chaplain',
      'social_chair': 'Social Chair'
    };
    
    return roleMap[userProfile.exec_board_role] || userProfile.exec_board_role;
  };

  const getVocalSection = () => {
    return userProfile?.voice_part || 'S1';
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isDashboardView = () => {
    return getRole() === 'Super Admin' || getRole() === 'Admin';
  };

  return (
    <div className="bg-gradient-to-r from-background to-muted/30 border-b border-border py-8 px-6 h-[400px] relative">
      <div className="container mx-auto h-full">
        <div className="grid items-start h-full pt-4" style={{ gridTemplateColumns: '20% 60% 20%' }}>
          {/* Left Column - Avatar */}
          <div className="flex justify-start">
            <div className="relative">
              <Avatar className="w-48 h-48 border-4 border-primary/20">
                <AvatarImage 
                  src={userProfile?.avatar_url || undefined} 
                  alt={getDisplayName()}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Center Column - User Info */}
          <div className="flex flex-col space-y-2 pl-8">
            <h1 className="text-6xl font-semibold text-foreground normal-case tracking-tight leading-tight">
              {getDisplayName()}
            </h1>
            <div className="flex items-center gap-2 text-2xl text-muted-foreground">
              <span>{getRole()}</span>
              {getExecBoardRole() && (
                <>
                  <span>-</span>
                  <span className="text-primary font-medium">{getExecBoardRole()}</span>
                </>
              )}
            </div>
          </div>

          {/* Right Column - Vocal Section */}
          <div className="flex items-center justify-center h-48 font-dancing" style={{ fontSize: '12rem', fontWeight: 'bold', color: 'hsl(var(--muted-foreground) / 0.15)' }}>
            {getVocalSection()}
          </div>
        </div>
      </div>
    </div>
  );
};