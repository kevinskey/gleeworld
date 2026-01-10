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
      className="h-6 px-3 rounded-full text-[10px] md:text-xs font-medium bg-white/10 text-white hover:bg-white/20 active:scale-95 active:bg-white/30 transition-all duration-150 flex items-center gap-1"
    >
      <MessageSquare className="h-3 w-3" />
      <span className="hidden sm:inline">Book</span>
    </button>
  );
};
