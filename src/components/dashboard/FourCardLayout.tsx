import React from 'react';
import { AdminToolsCard } from './cards/AdminToolsCard';
import { StudentCoursesCard } from './cards/StudentCoursesCard';
import { AlumniMemoriesCard } from './cards/AlumniMemoriesCard';
import { FanFeaturesCard } from './cards/FanFeaturesCard';

interface FourCardLayoutProps {
  role?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

export const FourCardLayout = ({ role, isAdmin, isSuperAdmin }: FourCardLayoutProps) => {
  // Determine which cards to show based on role
  const showAdminCard = isAdmin || isSuperAdmin;
  const showStudentCard = role === 'student' || isAdmin || isSuperAdmin;
  const showAlumniCard = role === 'alumna' || role === 'alumnae' || isAdmin || isSuperAdmin;
  const showFanCard = role === 'fan' || isAdmin || isSuperAdmin;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {showAdminCard && <AdminToolsCard />}
      {showStudentCard && <StudentCoursesCard />}
      {showAlumniCard && <AlumniMemoriesCard />}
      {showFanCard && <FanFeaturesCard />}
    </div>
  );
};
