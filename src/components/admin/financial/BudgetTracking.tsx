
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export const BudgetTracking = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Budget</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$250,000</div>
            <p className="text-xs text-muted-foreground">
              2024 allocated budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$87,450</div>
            <p className="text-xs text-muted-foreground">
              35% of budget used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$162,550</div>
            <p className="text-xs text-muted-foreground">
              Available for rest of year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$248,900</div>
            <p className="text-xs text-muted-foreground">
              Estimated year-end total
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget Categories</CardTitle>
          <CardDescription>Breakdown by expense category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Performance Stipends</p>
                <p className="text-sm text-gray-600">Individual artist payments</p>
              </div>
              <div className="text-right">
                <p className="font-medium">$65,200</p>
                <p className="text-sm text-gray-500">74.6% of spent</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Administrative</p>
                <p className="text-sm text-gray-600">System and operational costs</p>
              </div>
              <div className="text-right">
                <p className="font-medium">$12,850</p>
                <p className="text-sm text-gray-500">14.7% of spent</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Travel & Lodging</p>
                <p className="text-sm text-gray-600">Artist accommodation expenses</p>
              </div>
              <div className="text-right">
                <p className="font-medium">$9,400</p>
                <p className="text-sm text-gray-500">10.7% of spent</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
