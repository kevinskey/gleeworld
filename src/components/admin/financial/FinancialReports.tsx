
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

// Financial report generation is not built yet — there is no backing report
// store or export pipeline. This tab previously rendered fabricated
// statistics (e.g. "147 reports generated", "2 hours ago") and Download
// buttons that did nothing. Rather than imply working functionality, show an
// honest empty state until real reporting is wired up.
export const FinancialReports = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Financial Reports
          </CardTitle>
          <CardDescription>
            Generate comprehensive financial reports and analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 mb-4 text-muted-foreground" />
            <p className="font-medium">Reporting is coming soon</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Downloadable financial reports aren&apos;t available yet. In the
              meantime, use the Overview, Statements, and Budget tabs for live
              financial data.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
