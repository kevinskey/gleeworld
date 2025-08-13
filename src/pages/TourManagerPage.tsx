import { DashboardLayout } from "@/components/layout/DashboardLayout";

const TourManagerPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tour Manager</h1>
          <p className="text-muted-foreground">
            Manage tours and travel arrangements
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border border-border rounded-lg bg-card">
            <h3 className="text-lg font-semibold text-foreground mb-2">Current Tours</h3>
            <p className="text-muted-foreground">Active tour schedules</p>
          </div>
          
          <div className="p-6 border border-border rounded-lg bg-card">
            <h3 className="text-lg font-semibold text-foreground mb-2">Planning</h3>
            <p className="text-muted-foreground">Plan new tours and logistics</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TourManagerPage;