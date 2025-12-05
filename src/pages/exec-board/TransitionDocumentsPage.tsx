import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Download, BookOpen, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TransitionDocumentsPage = () => {
  const navigate = useNavigate();

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/executive-board-workshop')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workshop
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Transition Documents</h1>
          <p className="text-muted-foreground">Onboarding resources for new board members</p>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Onboarding Guides
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">New Board Member Welcome Packet</h4>
                    <p className="text-sm text-muted-foreground">Everything you need to get started</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Position Handoff Checklist</h4>
                    <p className="text-sm text-muted-foreground">Step-by-step transition guide</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Important Contacts List</h4>
                    <p className="text-sm text-muted-foreground">Key people and how to reach them</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Role-Specific Transitions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {['President', 'Vice President', 'Secretary', 'Treasurer', 'Chaplain', 'Historian'].map((role) => (
                  <div key={role} className="p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors cursor-pointer">
                    <h4 className="font-medium">{role} Transition Guide</h4>
                    <p className="text-sm text-muted-foreground">Specific duties and expectations</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default TransitionDocumentsPage;
