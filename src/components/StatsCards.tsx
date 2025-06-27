
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
      <Card className="w-full">
        <CardContent className="p-3">
          <div className="flex items-center bg-brand-400/20 rounded-lg p-2">
            <FileText className="h-6 w-6 text-brand-400 mr-2" />
            <div>
              <p className="text-xs font-medium text-white/80">Total Contracts</p>
              <p className="text-lg font-bold text-white">{totalContracts}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="w-full">
        <CardContent className="p-3">
          <div className="flex items-center bg-green-400/20 rounded-lg p-2">
            <CheckCircle className="h-6 w-6 text-green-400 mr-2" />
            <div>
              <p className="text-xs font-medium text-white/80">Completed</p>
              <p className="text-lg font-bold text-white">{completedCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="w-full">
        <CardContent className="p-3">
          <div className="flex items-center bg-yellow-400/20 rounded-lg p-2">
            <Clock className="h-6 w-6 text-yellow-400 mr-2" />
            <div>
              <p className="text-xs font-medium text-white/80">Pending</p>
              <p className="text-lg font-bold text-white">{pendingCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
