
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle, Clock, XCircle, AlertTriangle, Users } from "lucide-react";

interface W9SummaryStatsProps {
  w9Forms: any[];
  loading: boolean;
}

export const W9SummaryStats = ({ w9Forms, loading }: W9SummaryStatsProps) => {
  const totalForms = w9Forms.length;
  const submittedForms = w9Forms.filter(f => f.status === "submitted").length;
  const underReviewForms = w9Forms.filter(f => f.status === "under_review").length;
  const approvedForms = w9Forms.filter(f => f.status === "approved").length;
  const rejectedForms = w9Forms.filter(f => f.status === "rejected").length;
  const requiresRevisionForms = w9Forms.filter(f => f.status === "requires_revision").length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-gray-900">
            <FileText className="h-4 w-4 mr-2 text-blue-600" />
            Total Forms
          </CardTitle>
          <div className="text-xl font-bold text-blue-600">
            {loading ? "..." : totalForms}
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-gray-900">
            <Users className="h-4 w-4 mr-2 text-gray-600" />
            Submitted
          </CardTitle>
          <div className="text-xl font-bold text-gray-600">
            {loading ? "..." : submittedForms}
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-gray-900">
            <Clock className="h-4 w-4 mr-2 text-yellow-600" />
            Under Review
          </CardTitle>
          <div className="text-xl font-bold text-yellow-600">
            {loading ? "..." : underReviewForms}
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-gray-900">
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Approved
          </CardTitle>
          <div className="text-xl font-bold text-green-600">
            {loading ? "..." : approvedForms}
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-gray-900">
            <XCircle className="h-4 w-4 mr-2 text-red-600" />
            Rejected
          </CardTitle>
          <div className="text-xl font-bold text-red-600">
            {loading ? "..." : rejectedForms}
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-gray-900">
            <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
            Needs Revision
          </CardTitle>
          <div className="text-xl font-bold text-orange-600">
            {loading ? "..." : requiresRevisionForms}
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};
