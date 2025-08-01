import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  MessageCircle, 
  Calendar, 
  Crown, 
  Gavel, 
  FileText, 
  Music 
} from "lucide-react";

interface ExecutiveBoardMember {
  position: string;
  name: string;
  email: string;
  icon: any;
}

interface ExecutiveBoardDirectoryProps {
  variant?: 'full' | 'compact';
  showActions?: boolean;
}

export const ExecutiveBoardDirectory: React.FC<ExecutiveBoardDirectoryProps> = ({ 
  variant = 'full',
  showActions = true 
}) => {
  const contactExecutives: ExecutiveBoardMember[] = [
    { position: "President", name: "Maya Johnson", email: "president@spelman.edu", icon: Crown },
    { position: "Vice President", name: "Zara Davis", email: "vicepresident@spelman.edu", icon: Gavel },
    { position: "Secretary", name: "Amara Wilson", email: "secretary@spelman.edu", icon: FileText },
    { position: "Music Director", name: "Dr. Patricia Smith", email: "musicdirector@spelman.edu", icon: Music },
  ];

  const handleSendMessage = (exec: ExecutiveBoardMember) => {
    // Create mailto link
    const subject = encodeURIComponent(`Message from GleeWorld Member`);
    const body = encodeURIComponent(`Dear ${exec.name},\n\nI hope this message finds you well.\n\nBest regards,`);
    window.open(`mailto:${exec.email}?subject=${subject}&body=${body}`);
  };

  const handleScheduleMeeting = (exec: ExecutiveBoardMember) => {
    // For now, we'll open a mailto with meeting request
    const subject = encodeURIComponent(`Meeting Request - ${exec.position}`);
    const body = encodeURIComponent(`Dear ${exec.name},\n\nI would like to schedule a meeting to discuss...\n\nPlease let me know your availability.\n\nBest regards,`);
    window.open(`mailto:${exec.email}?subject=${subject}&body=${body}`);
  };

  if (variant === 'compact') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5" />
            Executive Board
          </CardTitle>
          <CardDescription>
            Quick contact directory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {contactExecutives.map((exec, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <exec.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{exec.position}</h4>
                    <p className="text-xs text-muted-foreground">{exec.name}</p>
                  </div>
                </div>
                {showActions && (
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleSendMessage(exec)}
                    >
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleScheduleMeeting(exec)}
                    >
                      <Calendar className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant (original from ExecutiveServicesDirectory)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Executive Board Directory
        </CardTitle>
        <CardDescription>
          Direct contact information for all executive board members
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {contactExecutives.map((exec, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <exec.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{exec.position}</h4>
                  <p className="text-sm text-muted-foreground">{exec.name}</p>
                </div>
              </div>
              {showActions && (
                <div className="space-y-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full justify-start text-xs"
                    onClick={() => handleSendMessage(exec)}
                  >
                    <MessageCircle className="h-3 w-3 mr-2" />
                    Send Message
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full justify-start text-xs"
                    onClick={() => handleScheduleMeeting(exec)}
                  >
                    <Calendar className="h-3 w-3 mr-2" />
                    Schedule Meeting
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};