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
  
  // Check if user is wardrobe staff (admin, super admin, or executive board)
  const isWardrobeStaff = userProfile?.is_admin || userProfile?.is_super_admin || userProfile?.role === 'executive';

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
        <WardrobeManagementHub />
      ) : (
        <div className="space-y-6">
          <HairNailSubmission />
        </div>
      )}
    </ModuleWrapper>
  );
};