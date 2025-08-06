import { BarChart3, TrendingUp, Users } from "lucide-react";

interface ExecutiveReportsProps {
  preview?: boolean;
  execRole?: string;
}

export const ExecutiveReports = ({ preview = false }: ExecutiveReportsProps) => {
  if (preview) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 border rounded text-sm">
          <BarChart3 className="h-4 w-4 text-green-600" />
          <span>Monthly Metrics</span>
        </div>
        <div className="flex items-center gap-2 p-2 border rounded text-sm">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <span>Performance Report</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">Executive Reports module coming soon...</p>
    </div>
  );
};