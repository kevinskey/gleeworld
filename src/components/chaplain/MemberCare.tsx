import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeartHandshake, Plus, User, AlertTriangle } from "lucide-react";

export const MemberCare = () => {
  const careRecords = [
    {
      id: 1,
      member: "Sarah Johnson",
      careType: "Academic Support",
      status: "Active",
      lastContact: "2024-07-29",
      notes: "Struggling with time management between rehearsals and midterms. Provided study schedule suggestions."
    },
    {
      id: 2,
      member: "Maria Davis",
      careType: "Family Emergency",
      status: "Follow-up Needed",
      lastContact: "2024-07-26",
      notes: "Family member hospitalized. Offered prayer support and flexible rehearsal attendance."
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-blue-100 text-blue-800';
      case 'Follow-up Needed': return 'bg-orange-100 text-orange-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Member Care Records</h3>
          <p className="text-sm text-muted-foreground">Track pastoral care and member support</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Care Record
        </Button>
      </div>

      <div className="grid gap-4">
        {careRecords.map((record) => (
          <Card key={record.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {record.member}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{record.careType}</Badge>
                    <Badge className={getStatusColor(record.status)}>
                      {record.status === 'Follow-up Needed' && (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      )}
                      {record.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-1">Care Notes:</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {record.notes}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last contact: {new Date(record.lastContact).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5" />
            Care Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">2</div>
              <div className="text-sm text-muted-foreground">Active Cases</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">1</div>
              <div className="text-sm text-muted-foreground">Need Follow-up</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">5</div>
              <div className="text-sm text-muted-foreground">Resolved This Month</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};