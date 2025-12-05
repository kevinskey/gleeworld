import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, BookOpen, Video, FileText, Target, Award, Lightbulb, Calendar, 
  ArrowLeft, Crown, ChevronRight, GraduationCap, Briefcase, MessageSquare,
  ClipboardList, Bus
} from "lucide-react";
import { ExecBoardInterviewForm } from "@/components/executive/ExecBoardInterviewForm";
import { HandbookModule } from "@/components/handbook/HandbookModule";

const ExecutiveBoardWorkshopPage = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const navigate = useNavigate();

  if (activeSection === "handbook") {
    return (
      <UniversalLayout>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
          <Button 
            variant="ghost" 
            onClick={() => setActiveSection(null)}
            className="mb-4 gap-2 hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workshop
          </Button>
          <HandbookModule />
        </div>
      </UniversalLayout>
    );
  }

  const trainingModules = [
    {
      icon: BookOpen,
      title: "Handbook",
      description: "Role responsibilities and procedures",
      onClick: () => setActiveSection("handbook"),
    },
    {
      icon: Video,
      title: "Training Videos",
      description: "Leadership tutorials and guides",
      onClick: () => navigate('/exec-board-training-videos'),
    },
    {
      icon: FileText,
      title: "Templates",
      description: "Documents and forms library",
      onClick: () => {},
    },
    {
      icon: Calendar,
      title: "Schedule",
      description: "Workshop dates and meetings",
      onClick: () => navigate('/calendar'),
    },
  ];

  const workshopModules = [
    { number: 1, title: "Leadership Foundations", description: "Core principles of servant leadership and team management" },
    { number: 2, title: "Communication Excellence", description: "Effective communication strategies for club operations" },
    { number: 3, title: "Event Planning & Logistics", description: "Organizing rehearsals, performances, and special events" },
    { number: 4, title: "Financial Stewardship", description: "Budget management and fundraising best practices" },
  ];

  const resources = [
    { title: "Meeting Agendas", description: "Templates and past meeting notes", icon: ClipboardList, path: '/exec-board/meeting-agendas' },
    { title: "Role Guides", description: "Position-specific responsibilities", icon: Users, onClick: () => setActiveSection('handbook') },
    { title: "Transition Documents", description: "Onboarding for new board members", icon: FileText, path: '/exec-board/transition-documents' },
    { title: "Contact Directory", description: "Key contacts and advisors", icon: MessageSquare, path: '/directory' },
    { title: "Policy Manual", description: "Club policies and procedures", icon: Briefcase, path: '/exec-board/policy-manual' },
    { title: "Tour Information", description: "Tour logistics and details", icon: Bus, path: '/tour-information-center' },
  ];

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="relative rounded-2xl md:rounded-3xl overflow-hidden mb-6 md:mb-8 bg-gradient-to-br from-primary via-primary/90 to-secondary p-6 md:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="absolute top-4 right-4 md:top-6 md:right-6">
            <Crown className="h-12 w-12 md:h-16 md:w-16 text-white/20" />
          </div>
          <div className="relative z-10 text-primary-foreground">
            <Badge className="bg-white/20 text-white border-white/30 mb-3 md:mb-4 text-xs md:text-sm">
              <GraduationCap className="h-3 w-3 mr-1" />
              Leadership Development
            </Badge>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
              Executive Board Workshop
            </h1>
            <p className="text-sm md:text-lg lg:text-xl text-white/90 max-w-2xl leading-relaxed">
              Empower yourself with the tools, training, and resources needed to lead the Spelman College Glee Club to excellence.
            </p>
          </div>
        </div>

        {/* Training Modules Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-6 md:mb-8">
          {trainingModules.map((module) => {
            const Icon = module.icon;
            return (
              <Card 
                key={module.title}
                className="group border border-border/50 hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer bg-card"
                onClick={module.onClick}
              >
                <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2 md:mb-3 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <CardTitle className="text-base md:text-lg">{module.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <p className="text-xs md:text-sm text-muted-foreground">{module.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Workshop Modules */}
          <Card className="lg:col-span-2 border border-border/50">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Target className="h-5 w-5 text-primary" />
                Workshop Modules
              </CardTitle>
              <CardDescription className="text-sm">Complete training program for executive board members</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="space-y-3 md:space-y-4">
                {workshopModules.map((module) => (
                  <div 
                    key={module.number}
                    className="p-3 md:p-4 rounded-xl bg-muted/30 border border-border/50 flex items-start gap-3 md:gap-4 hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer group"
                  >
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <span className="font-bold text-primary text-sm md:text-base">{module.number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm md:text-base">{module.title}</h4>
                      <p className="text-xs md:text-sm text-muted-foreground">{module.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recognition Card */}
          <Card className="border border-border/50">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Award className="h-5 w-5 text-primary" />
                Recognition
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/5 rounded-xl p-4 md:p-6 text-center border border-primary/10">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <Lightbulb className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-sm md:text-base">Leadership Excellence Award</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  Complete all workshop modules to earn your leadership certification badge.
                </p>
                <Button variant="outline" size="sm" className="mt-4 text-xs md:text-sm">
                  View Progress
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resources Section */}
        <Card className="border border-border/50 mb-6 md:mb-8">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Users className="h-5 w-5 text-primary" />
              Executive Board Resources
            </CardTitle>
            <CardDescription className="text-sm">Quick access to essential tools and documentation</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {resources.map((resource) => {
                const Icon = resource.icon;
                return (
                  <div 
                    key={resource.title}
                    onClick={() => resource.path ? navigate(resource.path) : resource.onClick?.()}
                    className="p-3 md:p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm md:text-base mb-0.5">{resource.title}</h4>
                        <p className="text-xs md:text-sm text-muted-foreground">{resource.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* End of Semester Interview Section */}
        <ExecBoardInterviewForm />
      </div>
    </UniversalLayout>
  );
};

export default ExecutiveBoardWorkshopPage;
