import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useNavigate } from "react-router-dom";
import { useSRFAssignments } from "@/hooks/useSRFAssignments";
import { 
  BookOpen,
  Home,
  Play,
  ClipboardList,
  Settings,
  Eye,
  Send
} from "lucide-react";

export const SRFManagement = () => {
  const navigate = useNavigate();
  const { assignments: srfAssignments, loading, createAssignment, sendReminder } = useSRFAssignments();

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
            <BookOpen className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">SRF Management</h1>
              <p className="text-muted-foreground">Manage sight-reading assignments and student progress</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Sight Reading Manager (SRF Integration)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3 mb-4">
                <Button onClick={() => createAssignment({})}>
                  <Play className="h-4 w-4 mr-2" />
                  Create Assignment
                </Button>
                <Button variant="outline">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Placement Test
                </Button>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Template Builder
                </Button>
              </div>
              
              {loading ? (
                <p>Loading SRF assignments...</p>
              ) : (
                srfAssignments.map((assignment) => (
                  <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{assignment.title}</h4>
                          <p className="text-sm text-muted-foreground">Due: {assignment.dueDate}</p>
                        </div>
                        <Badge variant="outline">{assignment.difficulty}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Assigned</p>
                          <p className="font-medium">{assignment.assigned}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Completed</p>
                          <p className="font-medium">{assignment.completed}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Results
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => sendReminder(assignment.id)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Reminder
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </UniversalLayout>
  );
};