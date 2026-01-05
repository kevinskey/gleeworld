import React from 'react';
import { AlumniMemoriesCard } from './cards/AlumniMemoriesCard';
import { FanFeaturesCard } from './cards/FanFeaturesCard';

interface FourCardLayoutProps {
  role?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

export const FourCardLayout = ({ role, isAdmin, isSuperAdmin }: FourCardLayoutProps) => {
  // Determine which cards to show based on role
  const showAlumniCard = role === 'alumna' || role === 'alumnae' || isAdmin || isSuperAdmin;
  const showFanCard = role === 'fan' || isAdmin || isSuperAdmin;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {showAlumniCard && <AlumniMemoriesCard />}
      {showFanCard && <FanFeaturesCard />}
    </div>
  );
};
