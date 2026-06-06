import React from 'react';
import { SimpleHeroManager } from '@/components/admin/SimpleHeroManager';

export const HeroManagerModule = () => {
  return (
    <div className="space-y-6">
      <SimpleHeroManager placementKey="homepage_hero" title="Homepage Hero" />
      <SimpleHeroManager placementKey="dashboard_hero" title="Dashboard Hero" />
    </div>
  );
};
