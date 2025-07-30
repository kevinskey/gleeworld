import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useNavigate } from "react-router-dom";
import { useSectionalPlans } from "@/hooks/useSectionalPlans";
import { 
  UserCheck,
  Home,
  Eye,
  CheckCircle,
  MessageSquare
} from "lucide-react";

export const SectionalManagement = () => {
  const navigate = useNavigate();
  const { plans: sectionalPlans, loading, updatePlanStatus } = useSectionalPlans();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending Review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Needs Revision': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Sectional Management</h1>
              <p className="text-muted-foreground">Review and manage section leader plans and activities</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Section Leader Oversight
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading sectional plans...</p>
            ) : (
              <div className="space-y-4">
                {sectionalPlans.map((plan) => (
                  <Card key={plan.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{plan.sectionLeader} - {plan.section}</h4>
                          <p className="text-sm text-muted-foreground">{plan.week} • Uploaded {plan.uploadDate}</p>
                        </div>
                        <Badge className={`border ${getStatusColor(plan.status)}`}>
                          {plan.status}
                        </Badge>
                      </div>
                      <p className="text-sm mb-3">Focus: {plan.focus}</p>
                      <div className="flex gap-2">
                        <Button size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Review Plan
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updatePlanStatus(plan.id, 'Approved')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Add Comment
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UniversalLayout>
  );
};