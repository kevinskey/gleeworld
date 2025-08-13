import { DashboardLayout } from "@/components/layout/DashboardLayout";

const EventPlannerPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Event Planner</h1>
          <p className="text-muted-foreground">
            Plan and manage Glee Club events
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border border-border rounded-lg bg-card">
            <h3 className="text-lg font-semibold text-foreground mb-2">Upcoming Events</h3>
            <p className="text-muted-foreground">View and manage scheduled events</p>
          </div>
          
          <div className="p-6 border border-border rounded-lg bg-card">
            <h3 className="text-lg font-semibold text-foreground mb-2">Create Event</h3>
            <p className="text-muted-foreground">Schedule new events and performances</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EventPlannerPage;