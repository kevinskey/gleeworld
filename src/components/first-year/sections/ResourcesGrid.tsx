import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Video, 
  Music, 
  Headphones, 
  FileText, 
  ExternalLink,
  Download,
  Play
} from "lucide-react";

const resources = [
  {
    title: "Vocal Technique Videos",
    description: "Essential breathing and posture exercises",
    type: "video",
    icon: Video,
    action: "Watch",
    color: "bg-red-500",
  },
  {
    title: "Practice Tracks",
    description: "Rehearsal accompaniments and vocal parts",
    type: "audio",
    icon: Headphones,
    action: "Listen",
    color: "bg-blue-500",
  },
  {
    title: "Music Theory Basics",
    description: "Interactive lessons on scales, intervals, and rhythm",
    type: "course",
    icon: BookOpen,
    action: "Study",
    color: "bg-green-500",
  },
  {
    title: "Repertoire Scores",
    description: "Digital sheet music and learning materials",
    type: "document",
    icon: Music,
    action: "Download",
    color: "bg-purple-500",
  },
  {
    title: "Glee Club Handbook",
    description: "Policies, procedures, and expectations",
    type: "document",
    icon: FileText,
    action: "Read",
    color: "bg-orange-500",
  },
  {
    title: "Voice Care Guide",
    description: "Tips for maintaining vocal health",
    type: "guide",
    icon: BookOpen,
    action: "Learn",
    color: "bg-pink-500",
  },
];

export const ResourcesGrid = () => {
  const getActionIcon = (action: string) => {
    switch (action) {
      case "Watch": return <Play className="h-4 w-4" />;
      case "Listen": return <Headphones className="h-4 w-4" />;
      case "Download": return <Download className="h-4 w-4" />;
      default: return <ExternalLink className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Learning Resources
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource, index) => {
            const IconComponent = resource.icon;
            
            return (
              <div 
                key={index}
                className="group p-4 rounded-lg border hover:border-primary/50 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${resource.color} text-white`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                      {resource.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {resource.description}
                    </p>
                    <Button size="sm" variant="outline" className="w-full text-xs">
                      {getActionIcon(resource.action)}
                      {resource.action}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Quick Links */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-semibold text-sm mb-3">Quick Links</h4>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" className="text-xs">
              📚 Music Library
            </Button>
            <Button size="sm" variant="ghost" className="text-xs">
              🎵 Sight Reading Factory
            </Button>
            <Button size="sm" variant="ghost" className="text-xs">
              📅 Rehearsal Calendar
            </Button>
            <Button size="sm" variant="ghost" className="text-xs">
              👥 Directory
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};