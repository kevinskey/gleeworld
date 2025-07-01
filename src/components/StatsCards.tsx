
import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle, Clock } from "lucide-react";

interface StatsCardsProps {
  totalContracts: number;
  completedCount: number;
  pendingCount: number;
}

export const StatsCards = ({ totalContracts, completedCount, pendingCount }: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="border-brand-300/40 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center bg-brand-100/60 rounded-lg p-3">
            <FileText className="h-6 w-6 text-brand-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-brand-600/80">Total Contracts</p>
              <p className="text-xl font-bold text-brand-700">{totalContracts}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-green-300/40 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center bg-green-100/60 rounded-lg p-3">
            <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-700/80">Completed</p>
              <p className="text-xl font-bold text-green-800">{completedCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-orange-300/40 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center bg-orange-100/60 rounded-lg p-3">
            <Clock className="h-6 w-6 text-orange-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-orange-700/80">Pending</p>
              <p className="text-xl font-bold text-orange-800">{pendingCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
