import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCheck, User, Calendar, DollarSign, Clock } from "lucide-react";
import { ModuleProps } from "@/types/modules";

export const ContractsModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const contracts = [
    { id: 1, title: "Spring Concert Performance Agreement", client: "Atlanta Symphony Hall", value: 5000, status: "signed", date: "2024-03-15", type: "performance" },
    { id: 2, title: "Wedding Ceremony Contract", client: "Johnson Family", value: 1200, status: "pending", date: "2024-02-10", type: "private" },
    { id: 3, title: "Corporate Event Entertainment", client: "Tech Solutions Inc", value: 2500, status: "draft", date: "2024-04-20", type: "corporate" },
    { id: 4, title: "Holiday Concert Series", client: "City of Atlanta", value: 8000, status: "review", date: "2024-12-15", type: "performance" }
  ];

  const totalValue = contracts.reduce((sum, c) => sum + c.value, 0);
  const signedValue = contracts.filter(c => c.status === 'signed').reduce((sum, c) => sum + c.value, 0);

  if (isFullPage) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Contracts Management</h1>
            <p className="text-muted-foreground">Create, manage, and track performance contracts</p>
          </div>
          <Button>
            <FileCheck className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{contracts.length}</div>
                  <div className="text-sm text-muted-foreground">Total Contracts</div>
                </div>
                <FileCheck className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Value</div>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">${signedValue.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Secured Revenue</div>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{contracts.filter(c => c.status === 'pending').length}</div>
                  <div className="text-sm text-muted-foreground">Pending Review</div>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contract Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <FileCheck className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-medium">{contract.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {contract.client} • {contract.date} • {contract.type}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">${contract.value.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Contract value</div>
                    </div>
                    <Badge variant={
                      contract.status === 'signed' ? 'default' : 
                      contract.status === 'pending' ? 'secondary' : 
                      contract.status === 'review' ? 'outline' : 'destructive'
                    }>
                      {contract.status}
                    </Badge>
                    <Button variant="ghost" size="sm">View</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Contracts
        </CardTitle>
        <CardDescription>Create and manage contracts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm">{contracts.length} total contracts</div>
          <div className="text-sm">${totalValue.toLocaleString()} total value</div>
          <div className="text-sm">{contracts.filter(c => c.status === 'pending').length} pending review</div>
        </div>
      </CardContent>
    </Card>
  );
};