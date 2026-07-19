import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

interface OfficeHoursBookingProps {
  selectedDate?: Date;
}

export const OfficeHoursBooking = ({ selectedDate }: OfficeHoursBookingProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/dashboard/office-hours');
  };

  return (
    <button 
      onClick={handleClick}
      className="w-full py-2 rounded-lg text-sm font-semibold bg-muted text-foreground border border-border hover:bg-accent hover:text-accent-foreground active:scale-[0.98] transition-all duration-150 text-center"
    >
      Book Studio Hours
    </button>
  );
};
