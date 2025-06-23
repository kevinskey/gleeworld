
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface AccountingSummaryProps {
  totalStipends: number;
  contractCount: number;
}

export const AccountingSummary = ({ totalStipends, contractCount }: AccountingSummaryProps) => {
  const averageStipend = contractCount > 0 ? totalStipends / contractCount : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Stipends</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totalStipends)}
          </div>
          <p className="text-xs text-muted-foreground">
            From signed contracts
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Signed Contracts</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{contractCount}</div>
          <p className="text-xs text-muted-foreground">
            With stipend amounts
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Stipend</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(averageStipend)}
          </div>
          <p className="text-xs text-muted-foreground">
            Per contract
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
