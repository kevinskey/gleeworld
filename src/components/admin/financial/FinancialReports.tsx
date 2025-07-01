
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Calendar, BarChart } from "lucide-react";

export const FinancialReports = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Financial Reports
              </CardTitle>
              <CardDescription>
                Generate comprehensive financial reports and analytics
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select defaultValue="monthly">
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Available Reports</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <BarChart className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium">Payment Summary</p>
                      <p className="text-sm text-gray-600">Total payments by period</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Download</Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium">Stipend Analysis</p>
                      <p className="text-sm text-gray-600">Stipend distribution and trends</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Download</Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="font-medium">User Balances</p>
                      <p className="text-sm text-gray-600">Current user financial status</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Download</Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <BarChart className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="font-medium">Budget Report</p>
                      <p className="text-sm text-gray-600">Budget vs actual spending</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Download</Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Report Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Total Reports Generated</span>
                  <span className="text-sm">147</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Last Generated</span>
                  <span className="text-sm">2 hours ago</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Most Popular</span>
                  <span className="text-sm">Payment Summary</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Data Range</span>
                  <span className="text-sm">Last 12 months</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
