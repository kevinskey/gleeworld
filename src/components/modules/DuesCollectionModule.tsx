import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Users, DollarSign, Calendar, AlertCircle } from "lucide-react";
import { ModuleProps } from "@/types/modules";

export const DuesCollectionModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  // TODO: Replace with real dues data from Supabase
  const duesData: any[] = [];
  
  const totalDues = 0;
  const paidDues = 0;
  const overdueDues = 0;

  if (isFullPage) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dues Collection</h1>
            <p className="text-muted-foreground">Track and collect member dues and payments</p>
          </div>
          <Button>
            <CreditCard className="h-4 w-4 mr-2" />
            Send Reminders
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">${totalDues}</div>
                  <div className="text-sm text-muted-foreground">Total Expected</div>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">${paidDues}</div>
                  <div className="text-sm text-muted-foreground">Collected</div>
                </div>
                <CreditCard className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">${overdueDues}</div>
                  <div className="text-sm text-muted-foreground">Overdue</div>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">0%</div>
                  <div className="text-sm text-muted-foreground">Collection Rate</div>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Member Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {duesData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No dues records found. Start by creating dues records for members.
                </div>
              ) : (
                duesData.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Users className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="font-medium">{payment.member}</div>
                        <div className="text-sm text-muted-foreground">{payment.section} • Due: {payment.dueDate}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">${payment.amount}</div>
                        <div className="text-sm text-muted-foreground">Semester dues</div>
                      </div>
                      <Badge variant={
                        payment.status === 'paid' ? 'default' : 
                        payment.status === 'overdue' ? 'destructive' : 
                        payment.status === 'partial' ? 'secondary' : 'outline'
                      }>
                        {payment.status}
                      </Badge>
                      <Button variant="ghost" size="sm">Contact</Button>
                    </div>
                  </div>
                ))
              )}
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
          <CreditCard className="h-5 w-5" />
          Dues Collection
        </CardTitle>
        <CardDescription>Track member payments and dues</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm">$0 of $0 collected</div>
          <div className="text-sm">0% collection rate</div>
          <div className="text-sm">0 overdue payments</div>
        </div>
      </CardContent>
    </Card>
  );
};