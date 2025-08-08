import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import historicImage from '@/assets/spelman-glee-historic.jpg';

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
    <div className="bg-gradient-to-r from-background to-muted/30 border-b border-border py-6 px-6 h-[200px] relative overflow-hidden">
      <div className="container mx-auto h-full">
        <div className="grid grid-cols-12 items-center h-full gap-8">
          {/* Left Content - Avatar and Info */}
          <div className="col-span-12 md:col-span-8 lg:col-span-9 flex items-center gap-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Avatar className="w-24 h-24 border-2 border-primary/20">
                <AvatarImage 
                  src={userProfile?.avatar_url || undefined} 
                  alt={getDisplayName()}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Name and Description */}
            <div className="flex-grow flex flex-col justify-center space-y-1">
              <h1 className="text-4xl font-semibold text-foreground normal-case tracking-tight leading-tight">
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
            </div>

            {/* Section */}
            <div className="flex-shrink-0 text-6xl font-bold text-muted-foreground/20 font-dancing">
              {getVocalSection()}
            </div>
          </div>

          {/* Right Content - Historic Image */}
          <div className="col-span-12 md:col-span-4 lg:col-span-3 flex justify-end">
            <div className="relative w-32 h-40 md:w-40 md:h-48 lg:w-48 lg:h-56 rounded-lg overflow-hidden shadow-lg border-2 border-primary/20">
              <img 
                src={historicImage} 
                alt="Historic Spelman College Glee Club" 
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-white text-xs font-medium text-center">
                  Historic Spelman Glee Club
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};