
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle, Clock, Archive, Users } from "lucide-react";
import { Contract } from "@/hooks/useContracts";

interface ContractSummaryStatsProps {
  contracts: Contract[];
  loading: boolean;
}

export const ContractSummaryStats = ({ contracts, loading }: ContractSummaryStatsProps) => {
  const totalContracts = contracts.length;
  const draftContracts = contracts.filter(c => c.status === "draft").length;
  const pendingContracts = contracts.filter(c => 
    c.status === "pending_admin_signature" || c.status === "pending_artist_signature"
  ).length;
  const completedContracts = contracts.filter(c => c.status === "completed").length;
  const archivedContracts = contracts.filter(c => c.status === "archived").length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-gray-900">
            <FileText className="h-4 w-4 mr-2 text-blue-600" />
            Total Contracts
          </CardTitle>
          <div className="text-xl font-bold text-blue-600">
            {loading ? "..." : totalContracts}
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-gray-900">
            <Users className="h-4 w-4 mr-2 text-gray-600" />
            Draft
          </CardTitle>
          <div className="text-xl font-bold text-gray-600">
            {loading ? "..." : draftContracts}
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-gray-900">
            <Clock className="h-4 w-4 mr-2 text-orange-600" />
            Pending
          </CardTitle>
          <div className="text-xl font-bold text-orange-600">
            {loading ? "..." : pendingContracts}
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-gray-900">
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Completed
          </CardTitle>
          <div className="text-xl font-bold text-green-600">
            {loading ? "..." : completedContracts}
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-gray-900">
            <Archive className="h-4 w-4 mr-2 text-purple-600" />
            Archived
          </CardTitle>
          <div className="text-xl font-bold text-purple-600">
            {loading ? "..." : archivedContracts}
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};
