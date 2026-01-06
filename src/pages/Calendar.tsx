import { CalendarViews } from "@/components/calendar/CalendarViews";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Calendar as CalendarIcon, Settings } from "lucide-react";
import { BackNavigation } from "@/components/shared/BackNavigation";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Calendar = () => {
  const navigate = useNavigate();
  
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="min-h-screen w-full">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
          {/* Back Navigation */}
          <BackNavigation className="mb-4" />
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 sm:p-3 bg-primary/10">
                <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Calendar</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">View and manage events</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/calendar/settings')}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
          
          {/* Main Content */}
          <CalendarViews />
        </div>
      </div>
    </UniversalLayout>
  );
};

export default Calendar;
