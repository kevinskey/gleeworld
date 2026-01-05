import React, { Suspense, lazy } from 'react';
import { RoleCard } from './RoleCard';
import { GraduationCap } from 'lucide-react';

const GleeAcademyDashboardCard = lazy(() => 
  import('@/components/user-dashboard/GleeAcademyDashboardCard').then(m => ({
    default: m.GleeAcademyDashboardCard
  }))
);

export const StudentCoursesCard = () => {
  return (
    <RoleCard 
      title="Glee Academy" 
      icon={GraduationCap} 
      accentColor="text-blue-500"
    >
      <Suspense fallback={<div className="h-24 bg-muted animate-pulse rounded" />}>
        <GleeAcademyDashboardCard />
      </Suspense>
    </RoleCard>
  );
};
