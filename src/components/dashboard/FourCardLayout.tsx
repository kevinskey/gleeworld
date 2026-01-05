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
  const isAlumna = role === 'alumna' || role === 'alumnae';
  const isFan = role === 'fan';
  const isMember = role === 'member';
  const isExecutive = role === 'executive';

  // Admin/SuperAdmin see all cards
  const showAlumniCard = isAlumna || isAdmin || isSuperAdmin;
  const showFanCard = isFan || isAdmin || isSuperAdmin;
  const showMemberCard = isMember || isExecutive || isAdmin || isSuperAdmin;

  const cards = [];
  
  if (showAlumniCard) cards.push(<AlumniMemoriesCard key="alumni" />);
  if (showFanCard) cards.push(<FanFeaturesCard key="fan" />);
  // Add more role-specific cards here as needed

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards}
    </div>
  );
};
