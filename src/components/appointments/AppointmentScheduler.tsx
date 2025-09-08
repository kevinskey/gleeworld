import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AppointmentScheduler = () => {
  const navigate = useNavigate();

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="gap-2 w-full h-auto min-h-[4rem] border-primary/30 hover:bg-primary/10 px-4 py-3 flex flex-col sm:flex-row items-center justify-center"
      onClick={() => navigate('/booking')}
    >
      <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
      <span className="text-xs sm:text-sm font-medium">Appointments</span>
    </Button>
  );
};