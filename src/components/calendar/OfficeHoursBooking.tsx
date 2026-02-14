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
    navigate('/book-appointment');
  };

  return (
    <button 
      onClick={handleClick}
      className="w-full py-2 rounded-lg text-sm font-semibold bg-white/10 text-white hover:bg-white/20 active:scale-[0.98] active:bg-white/30 transition-all duration-150 text-center"
    >
      Book Office Hours
    </button>
  );
};
