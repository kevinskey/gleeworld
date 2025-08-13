import { PublicLayout } from "@/components/layout/PublicLayout";

const CalendarPage = () => {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Events Calendar</h1>
            <p className="text-muted-foreground">
              View upcoming Glee Club events and performances
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-muted-foreground">Calendar component will be implemented here</p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default CalendarPage;