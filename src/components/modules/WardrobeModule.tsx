import React from 'react';
import { Shirt } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { WardrobeManagementHub } from '@/components/wardrobe/WardrobeManagementHub';
import { ModuleProps } from '@/types/unified-modules';

export const WardrobeModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="wardrobe-management"
      title="Wardrobe Management"
      description="Manage costumes, fittings, inventory, and garment distribution"
      icon={Shirt}
      iconColor="purple"
      fullPage={isFullPage}
    >
      <WardrobeManagementHub />
    </ModuleWrapper>
  );
};