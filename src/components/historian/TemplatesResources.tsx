import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FolderOpen, 
  Download, 
  FileText, 
  Upload, 
  Edit, 
  BookOpen,
  ExternalLink,
  Users,
  Camera,
  CheckSquare
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  type: "form" | "document" | "checklist" | "guide";
  category: "interview" | "media" | "event" | "legal" | "general";
  lastUpdated: string;
  downloadUrl?: string;
}

export const TemplatesResources = () => {
  const templates: Template[] = [
    {
      id: "1",
      name: "Interview Consent Form",
      description: "Standard consent form for recording interviews with alumni and current members",
      type: "form",
      category: "interview",
      lastUpdated: "2024-11-01",
      downloadUrl: "/templates/interview-consent-form.pdf"
    },
    {
      id: "2",
      name: "Photo/Video Release Form",
      description: "Release form for use of photos and videos in Glee Club publications and media",
      type: "form",
      category: "legal",
      lastUpdated: "2024-10-15",
      downloadUrl: "/templates/photo-video-release.pdf"
    },
    {
      id: "3",
      name: "Blog Post Template",
      description: "Template for writing consistent blog posts about events and activities",
      type: "document",
      category: "media",
      lastUpdated: "2024-11-10",
      downloadUrl: "/templates/blog-post-template.docx"
    },
    {
      id: "4",
      name: "Event Documentation Checklist",
      description: "Comprehensive checklist for documenting events and performances",
      type: "checklist",
      category: "event",
      lastUpdated: "2024-11-05",
      downloadUrl: "/templates/event-documentation-checklist.pdf"
    },
    {
      id: "5",
      name: "Interview Question Bank",
      description: "Collection of suggested questions for different types of interviews",
      type: "guide",
      category: "interview",
      lastUpdated: "2024-10-20",
      downloadUrl: "/templates/interview-questions.pdf"
    },
    {
      id: "6",
      name: "Media Tagging Guidelines",
      description: "Guidelines for consistent tagging and organization of media files",
      type: "guide",
      category: "media",
      lastUpdated: "2024-11-08",
      downloadUrl: "/templates/media-tagging-guide.pdf"
    }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "form": return <FileText className="h-4 w-4" />;
      case "document": return <FileText className="h-4 w-4" />;
      case "checklist": return <CheckSquare className="h-4 w-4" />;
      case "guide": return <BookOpen className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "interview": return "default";
      case "media": return "secondary";
      case "event": return "outline";
      case "legal": return "destructive";
      case "general": return "secondary";
      default: return "outline";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "form": return "default";
      case "document": return "secondary";
      case "checklist": return "outline";
      case "guide": return "secondary";
      default: return "outline";
    }
  };

  const resourceLinks = [
    {
      name: "Historian Handbook",
      description: "Complete guide to historian duties and best practices",
      url: "#",
      type: "handbook"
    },
    {
      name: "Glee Club Style Guide",
      description: "Official style guide for all written content and media",
      url: "#",
      type: "guide"
    },
    {
      name: "Archive Standards",
      description: "Standards for file naming, organization, and metadata",
      url: "#",
      type: "standards"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Templates & Forms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="border-2">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(template.type)}
                      <h3 className="font-semibold">{template.name}</h3>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant={getTypeColor(template.type)} className="text-xs">
                        {template.type}
                      </Badge>
                      <Badge variant={getCategoryColor(template.category)} className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {template.description}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      Updated: {new Date(template.lastUpdated).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload New Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload New Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="mb-2">Drag and drop a template file here, or click to browse</p>
            <p className="text-sm text-muted-foreground mb-4">
              Supports: PDF, DOC, DOCX, TXT files
            </p>
            <Button variant="outline">
              Browse Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resources & Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Resources & Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {resourceLinks.map((resource, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">{resource.name}</h4>
                    <p className="text-sm text-muted-foreground">{resource.description}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <Users className="h-6 w-6" />
              <span>Create Interview</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <Camera className="h-6 w-6" />
              <span>Upload Media</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <FileText className="h-6 w-6" />
              <span>New Blog Post</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};