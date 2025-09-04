import React from 'react';
import { Shirt } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { WardrobeManagementHub } from '@/components/wardrobe/WardrobeManagementHub';
import { HairNailSubmission } from '@/components/wardrobe/HairNailSubmission';
import { ModuleProps } from '@/types/unified-modules';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';

export const WardrobeModule = ({ user, isFullPage = false }: ModuleProps) => {
  const { user: authUser } = useAuth();
  const { userProfile } = useUserProfile(authUser);
  
  // Check URL for member view - only show member interface on /member/ routes
  const currentPath = window.location.pathname;
  const isInMemberView = currentPath.includes('/member/');
  
  console.log('🔥 WARDROBE MODULE LOADED - Current URL:', window.location.href);
  console.log('🔍 URL DEBUG:', {
    currentPath,
    isInMemberView,
    includes_member: currentPath.includes('/member/'),
    full_location: window.location.href
  });
  
  // Check if user is wardrobe staff (admin, super admin, or executive board)
  // But if we're in member view, always show member interface
  const isWardrobeStaff = !isInMemberView && (userProfile?.is_admin || userProfile?.is_super_admin || userProfile?.role === 'executive');
  
  console.log('WardrobeModule Debug:', {
    userProfile: userProfile,
    isWardrobeStaff,
    isInMemberView,
    currentPath: window.location.pathname,
    role: userProfile?.role,
    isAdmin: userProfile?.is_admin,
    isSuperAdmin: userProfile?.is_super_admin
  });

  console.log('RENDERING DECISION:', { isWardrobeStaff, isInMemberView });

  return (
    <ModuleWrapper
      id="wardrobe-management"
      title="Wardrobe Management"
      description="Manage costumes, fittings, inventory, and garment distribution"
      icon={Shirt}
      iconColor="purple"
      fullPage={isFullPage}
    >
      {isWardrobeStaff ? (
        <>
          {console.log('RENDERING: WardrobeManagementHub')}
          <WardrobeManagementHub />
        </>
      ) : (
        <>
          {console.log('RENDERING: Member View with HairNailSubmission')}
          <div className="space-y-6">
            <div className="bg-red-500 text-white p-4 rounded-lg border">
              <p className="text-sm font-bold mb-2">🚨 MEMBER VIEW ACTIVE 🚨</p>
              <p className="text-xs">This should show Hair & Nail Submission only</p>
              <p className="text-xs">isWardrobeStaff: {String(isWardrobeStaff)}</p>
              <p className="text-xs">isInMemberView: {String(isInMemberView)}</p>
            </div>
            <HairNailSubmission />
          </div>
        </>
      )}
    </ModuleWrapper>
  );
};