import { DashboardLayout } from "@/components/layout/DashboardLayout";

const SightReadingPreviewPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sight Reading Preview</h1>
          <p className="text-muted-foreground">
            Preview and review sight reading exercises
          </p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Exercise Preview</h3>
          <p className="text-muted-foreground">Preview component will be implemented here</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SightReadingPreviewPage;