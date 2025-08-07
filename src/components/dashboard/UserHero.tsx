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
    <div className="bg-gradient-to-r from-background to-muted/30 border-b border-border py-8 px-6">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          {/* Left side - Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-primary/20">
                <AvatarImage 
                  src={userProfile?.avatar_url || undefined} 
                  alt={getDisplayName()}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-2 -left-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-bold">
                AVATAR
              </div>
            </div>

            {/* Center - User Info */}
            <div className="flex flex-col space-y-2">
              <h1 className="text-4xl font-bold text-foreground">
                {getDisplayName()}
              </h1>
              <div className="flex items-center gap-2 text-lg text-muted-foreground">
                <span>{getRole()}</span>
                {getExecBoardRole() && (
                  <>
                    <span>-</span>
                    <span className="text-primary font-medium">{getExecBoardRole()}</span>
                  </>
                )}
              </div>
              {isDashboardView() && (
                <div className="mt-4">
                  <h2 className="text-2xl font-bold text-primary">Super Admin Dashboard</h2>
                  <p className="text-muted-foreground">Manage the Spelman College Glee Club platform</p>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Vocal Section */}
          <div className="text-[20rem] font-bold text-muted-foreground/20 pr-12 flex items-center" style={{ height: '85vh' }}>
            {getVocalSection()}
          </div>
        </div>
      </div>
    </div>
  );
};