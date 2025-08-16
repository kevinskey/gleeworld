import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Download,
  FileText,
  Video,
  Music,
  Upload
} from "lucide-react";

export const LibraryTab = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock library resources - replace with real data
  const mockResources = [
    {
      id: 1,
      title: "Music Theory Fundamentals",
      type: "PDF",
      category: "Theory",
      description: "Comprehensive guide to scales, intervals, and basic harmony",
      uploadedBy: "Dr. Johnson",
      uploadDate: "2025-08-10",
      downloads: 45,
      size: "2.3 MB"
    },
    {
      id: 2,
      title: "Sight Reading Exercises - Level 1",
      type: "PDF",
      category: "Sight Reading",
      description: "Progressive sight reading exercises for beginners",
      uploadedBy: "Prof. Williams",
      uploadDate: "2025-08-12",
      downloads: 32,
      size: "1.8 MB"
    },
    {
      id: 3,
      title: "Vocal Warm-up Techniques",
      type: "Video",
      category: "Vocal Health",
      description: "Daily warm-up routines for vocal health and flexibility",
      uploadedBy: "Ms. Davis",
      uploadDate: "2025-08-15",
      downloads: 28,
      size: "125 MB"
    },
    {
      id: 4,
      title: "Practice Log Template",
      type: "Template",
      category: "Forms",
      description: "Weekly practice tracking template for students",
      uploadedBy: "Admin",
      uploadDate: "2025-08-08",
      downloads: 67,
      size: "245 KB"
    }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "PDF": return <FileText className="h-4 w-4" />;
      case "Video": return <Video className="h-4 w-4" />;
      case "Audio": return <Music className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "PDF": return "default";
      case "Video": return "secondary";
      case "Audio": return "outline";
      case "Template": return "destructive";
      default: return "outline";
    }
  };

  const filteredResources = mockResources.filter(resource =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(mockResources.map(r => r.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Resource Library</h2>
          <p className="text-muted-foreground">Manage learning resources, templates, and materials</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Resource
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Resources</p>
                <p className="text-xl font-bold">{mockResources.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Downloads</p>
                <p className="text-xl font-bold">{mockResources.reduce((sum, r) => sum + r.downloads, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-xl font-bold">{categories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-xl font-bold">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search resources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Resources</TabsTrigger>
          {categories.map(category => (
            <TabsTrigger key={category} value={category.toLowerCase()}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredResources.map((resource) => (
                  <div key={resource.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getTypeIcon(resource.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{resource.title}</h3>
                          <Badge variant={getTypeBadge(resource.type)}>
                            {resource.type}
                          </Badge>
                          <Badge variant="outline">
                            {resource.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{resource.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>By {resource.uploadedBy}</span>
                          <span>Uploaded {resource.uploadDate}</span>
                          <span>{resource.downloads} downloads</span>
                          <span>{resource.size}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button size="sm" variant="outline">Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {categories.map(category => (
          <TabsContent key={category} value={category.toLowerCase()}>
            <Card>
              <CardHeader>
                <CardTitle>{category} Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredResources
                    .filter(r => r.category === category)
                    .map((resource) => (
                      <div key={resource.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {getTypeIcon(resource.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{resource.title}</h3>
                              <Badge variant={getTypeBadge(resource.type)}>
                                {resource.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{resource.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>By {resource.uploadedBy}</span>
                              <span>Uploaded {resource.uploadDate}</span>
                              <span>{resource.downloads} downloads</span>
                              <span>{resource.size}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button size="sm" variant="outline">Edit</Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};