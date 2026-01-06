import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { BackNavigation } from "@/components/shared/BackNavigation";
import { GoogleCalendarSync } from "@/components/calendar/GoogleCalendarSync";
import { CalendarExport } from "@/components/calendar/CalendarExport";
import { AppointmentAvailabilityManager } from "@/components/appointments/AppointmentAvailabilityManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Calendar, Clock, Download } from "lucide-react";

const CalendarSettings = () => {
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="min-h-screen w-full">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
          {/* Back Navigation */}
          <BackNavigation className="mb-4" />
          
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl p-2.5 sm:p-3 bg-primary/10">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Calendar Settings</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Manage availability, sync, and export options</p>
            </div>
          </div>
          
          {/* Settings Tabs */}
          <Tabs defaultValue="availability" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="availability" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Availability</span>
              </TabsTrigger>
              <TabsTrigger value="sync" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Sync</span>
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="availability" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Appointment Availability
                  </CardTitle>
                  <CardDescription>
                    Set your weekly availability for appointments. Others can book time with you during these hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AppointmentAvailabilityManager />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="sync" className="space-y-4">
              <GoogleCalendarSync />
            </TabsContent>
            
            <TabsContent value="export" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-primary" />
                    Export Calendar
                  </CardTitle>
                  <CardDescription>
                    Download your calendar events in various formats.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CalendarExport />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default CalendarSettings;
