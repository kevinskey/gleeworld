import React from 'react';
import { Heart } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { FanEngagementHub } from '@/components/fan-engagement/FanEngagementHub';
import { ModuleProps } from '@/types/unified-modules';

export const FanEngagementModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="fan-engagement"
      title="Fan Engagement"
      description="Manage fan community, bulletin posts, and exclusive content"
      icon={Heart}
      iconColor="pink"
      fullPage={isFullPage}
      defaultOpen={!!isFullPage}
    >
      <FanEngagementHub />
    </ModuleWrapper>
  );
};