import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Shield, Scale, Heart, Users, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PolicyManualPage = () => {
  const navigate = useNavigate();

  const policies = [
    {
      icon: Shield,
      title: "Code of Conduct",
      description: "Expected behavior and professional standards"
    },
    {
      icon: Clock,
      title: "Attendance Policy",
      description: "Requirements for rehearsals, performances, and events"
    },
    {
      icon: Scale,
      title: "Disciplinary Procedures",
      description: "Process for addressing policy violations"
    },
    {
      icon: Heart,
      title: "Wellness & Support",
      description: "Mental health resources and support systems"
    },
    {
      icon: Users,
      title: "Membership Requirements",
      description: "Eligibility, dues, and participation expectations"
    },
    {
      icon: BookOpen,
      title: "Academic Standards",
      description: "GPA requirements and academic support"
    }
  ];

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

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Policy Manual</h1>
          <p className="text-muted-foreground">Club policies and procedures</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Glee Club Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policies.map((policy) => {
                const Icon = policy.icon;
                return (
                  <div 
                    key={policy.title}
                    className="p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{policy.title}</h4>
                        <p className="text-sm text-muted-foreground">{policy.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </UniversalLayout>
  );
};

export default PolicyManualPage;
