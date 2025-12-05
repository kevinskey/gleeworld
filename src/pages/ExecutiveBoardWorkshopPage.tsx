import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Video, FileText, Target, Award, Lightbulb, Calendar, ArrowLeft } from "lucide-react";
import { ExecBoardInterviewForm } from "@/components/executive/ExecBoardInterviewForm";
import { HandbookModule } from "@/components/handbook/HandbookModule";

const ExecutiveBoardWorkshopPage = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const navigate = useNavigate();

  if (activeSection === "handbook") {
    return (
      <UniversalLayout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Button 
            variant="ghost" 
            onClick={() => setActiveSection(null)}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workshop
          </Button>
          <HandbookModule />
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-amber-500 via-amber-500/80 to-orange-500/60 p-8 md:p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
          <div className="relative z-10 text-white">
            <Badge className="bg-white/20 text-white border-white/30 mb-4">Leadership Development</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Executive Board Workshop</h1>
            <p className="text-xl text-white/90 max-w-2xl">
              Empower yourself with the tools, training, and resources needed to lead the Spelman College Glee Club to excellence.
            </p>
          </div>
        </div>

        {/* Training Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            className="border-2 hover:border-amber-500/50 transition-colors cursor-pointer"
            onClick={() => setActiveSection("handbook")}
          >
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
                <BookOpen className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle className="text-lg">Handbook</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Role responsibilities and procedures</p>
            </CardContent>
          </Card>

          <Card 
            className="border-2 hover:border-amber-500/50 transition-colors cursor-pointer"
            onClick={() => navigate('/exec-board-training-videos')}
          >
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
                <Video className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle className="text-lg">Training Videos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Leadership tutorials and guides</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-amber-500/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle className="text-lg">Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Documents and forms library</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-amber-500/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle className="text-lg">Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Workshop dates and meetings</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Workshop Modules
              </CardTitle>
              <CardDescription>Complete training program for executive board members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 border flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <span className="font-bold text-amber-600">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Leadership Foundations</h4>
                    <p className="text-sm text-muted-foreground">Core principles of servant leadership and team management</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <span className="font-bold text-amber-600">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Communication Excellence</h4>
                    <p className="text-sm text-muted-foreground">Effective communication strategies for club operations</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <span className="font-bold text-amber-600">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Event Planning & Logistics</h4>
                    <p className="text-sm text-muted-foreground">Organizing rehearsals, performances, and special events</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <span className="font-bold text-amber-600">4</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Financial Stewardship</h4>
                    <p className="text-sm text-muted-foreground">Budget management and fundraising best practices</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Recognition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-6 text-center">
                <Lightbulb className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                <h3 className="font-semibold mb-2">Leadership Excellence Award</h3>
                <p className="text-sm text-muted-foreground">
                  Complete all workshop modules to earn your leadership certification badge.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resources Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Executive Board Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div 
                onClick={() => navigate('/exec-board/meeting-agendas')}
                className="p-4 rounded-lg bg-muted/30 border hover:border-amber-500/30 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <h4 className="font-medium mb-1">Meeting Agendas</h4>
                <p className="text-sm text-muted-foreground">Templates and past meeting notes</p>
              </div>
              <div 
                onClick={() => setActiveSection('handbook')}
                className="p-4 rounded-lg bg-muted/30 border hover:border-amber-500/30 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <h4 className="font-medium mb-1">Role Guides</h4>
                <p className="text-sm text-muted-foreground">Position-specific responsibilities</p>
              </div>
              <div 
                onClick={() => navigate('/exec-board/transition-documents')}
                className="p-4 rounded-lg bg-muted/30 border hover:border-amber-500/30 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <h4 className="font-medium mb-1">Transition Documents</h4>
                <p className="text-sm text-muted-foreground">Onboarding for new board members</p>
              </div>
              <div 
                onClick={() => navigate('/directory')}
                className="p-4 rounded-lg bg-muted/30 border hover:border-amber-500/30 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <h4 className="font-medium mb-1">Contact Directory</h4>
                <p className="text-sm text-muted-foreground">Key contacts and advisors</p>
              </div>
              <div 
                onClick={() => navigate('/exec-board/policy-manual')}
                className="p-4 rounded-lg bg-muted/30 border hover:border-amber-500/30 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <h4 className="font-medium mb-1">Policy Manual</h4>
                <p className="text-sm text-muted-foreground">Club policies and procedures</p>
              </div>
              <div 
                onClick={() => navigate('/calendar')}
                className="p-4 rounded-lg bg-muted/30 border hover:border-amber-500/30 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <h4 className="font-medium mb-1">Calendar</h4>
                <p className="text-sm text-muted-foreground">Important dates and deadlines</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* End of Semester Interview Section */}
        <div className="mt-8">
          <ExecBoardInterviewForm />
        </div>
      </div>
    </UniversalLayout>
  );
};

export default ExecutiveBoardWorkshopPage;
