import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Book, ExternalLink, Lightbulb, Download } from "lucide-react";

export const ChaplainToolkit = () => {
  const resources = [
    {
      id: 1,
      title: "Crisis Intervention Guide",
      type: "Document",
      description: "Step-by-step guide for supporting members in crisis situations",
      category: "Emergency"
    },
    {
      id: 2,
      title: "Prayer Templates",
      type: "Template",
      description: "Collection of prayers for different occasions and needs",
      category: "Prayer"
    },
    {
      id: 3,
      title: "Mental Health Resources",
      type: "External Link",
      description: "Curated list of mental health support services for students",
      category: "Wellness"
    },
    {
      id: 4,
      title: "Devotional Planning Worksheet",
      type: "Template",
      description: "Template for planning meaningful devotional sessions",
      category: "Planning"
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Emergency': return 'bg-red-100 text-red-800';
      case 'Prayer': return 'bg-blue-100 text-blue-800';
      case 'Wellness': return 'bg-green-100 text-green-800';
      case 'Planning': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'Document': return <Book className="h-4 w-4" />;
      case 'Template': return <Lightbulb className="h-4 w-4" />;
      case 'External Link': return <ExternalLink className="h-4 w-4" />;
      default: return <Book className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Chaplain Toolkit</h3>
          <p className="text-sm text-muted-foreground">Resources for spiritual leadership and member support</p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Download All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources.map((resource) => (
          <Card key={resource.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {getResourceIcon(resource.type)}
                    {resource.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{resource.type}</Badge>
                    <Badge className={getCategoryColor(resource.category)}>
                      {resource.category}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {resource.description}
              </p>
              <Button variant="outline" size="sm" className="mt-3">
                {resource.type === 'External Link' ? 'Open Link' : 'View Resource'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" size="sm" className="flex flex-col gap-2 h-auto py-4">
              <Book className="h-6 w-6" />
              <span className="text-xs">Create Prayer</span>
            </Button>
            <Button variant="outline" size="sm" className="flex flex-col gap-2 h-auto py-4">
              <Lightbulb className="h-6 w-6" />
              <span className="text-xs">Plan Devotional</span>
            </Button>
            <Button variant="outline" size="sm" className="flex flex-col gap-2 h-auto py-4">
              <ExternalLink className="h-6 w-6" />
              <span className="text-xs">Find Resources</span>
            </Button>
            <Button variant="outline" size="sm" className="flex flex-col gap-2 h-auto py-4">
              <Download className="h-6 w-6" />
              <span className="text-xs">Download Forms</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};