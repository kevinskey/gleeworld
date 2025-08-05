import { PublicCalendarViews } from "@/components/calendar/PublicCalendarViews";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon } from "lucide-react";

const PublicCalendar = () => {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-bold">Public Events Calendar</CardTitle>
            </div>
            <p className="text-muted-foreground">
              View all public events and performances from Spelman College Glee Club
            </p>
          </CardHeader>
          <CardContent>
            <PublicCalendarViews />
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default PublicCalendar;