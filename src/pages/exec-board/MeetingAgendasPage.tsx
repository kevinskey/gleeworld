import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Plus, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MeetingAgendasPage = () => {
  const navigate = useNavigate();

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/exec-board-workshop')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workshop
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Meeting Agendas</h1>
            <p className="text-muted-foreground">Templates and past meeting notes</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Agenda
          </Button>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Agenda Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors cursor-pointer">
                  <h4 className="font-medium">Weekly Meeting Template</h4>
                  <p className="text-sm text-muted-foreground">Standard format for weekly exec board meetings</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors cursor-pointer">
                  <h4 className="font-medium">Emergency Meeting Template</h4>
                  <p className="text-sm text-muted-foreground">Quick format for urgent matters</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors cursor-pointer">
                  <h4 className="font-medium">End of Semester Review Template</h4>
                  <p className="text-sm text-muted-foreground">Comprehensive review format</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Past Meeting Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No meeting notes uploaded yet.</p>
                <p className="text-sm">Meeting notes will appear here once added.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default MeetingAgendasPage;
