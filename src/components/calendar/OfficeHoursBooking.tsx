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
    <Button 
      variant="secondary"
      size="sm"
      className="gap-2 h-9 text-sm font-medium"
      onClick={handleClick}
    >
      <MessageSquare className="h-4 w-4" />
      <span className="hidden sm:inline">Book Appointment</span>
    </Button>
  );
};
